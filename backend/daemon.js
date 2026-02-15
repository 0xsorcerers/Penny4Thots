require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ================= CONFIG =================

const AI_LOCK = process.env.DECENTRALIZED_AI_LOCK;
const readLimit = 200;
const batchDelayMs = 5000;
const maxRetryAttempts = 3;

const ABI_PATH = path.join(__dirname, 'penny4thot_abi.json');
const contractAbi = require(ABI_PATH);

const networks = [
  {
    name: 'sepolia',
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    contract: '0xdFece4CFBFc01e511dc1015422EC3cdE96A27188'
  }
];

// ================= LOG STREAM =================

const logStream = fs.createWriteStream(
  path.join(__dirname, 'monitor.log'),
  { flags: 'a' }
);

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  logStream.write(line + '\n');
  console.log(line);
}

// ================= STATE =================

function getStateFile(networkName) {
  return path.join(__dirname, `market_state_${networkName}.json`);
}

function loadState(networkName) {
  const file = getStateFile(networkName);
  if (!fs.existsSync(file)) return { lastProcessedMarketId: -1, markets: {} };
  return JSON.parse(fs.readFileSync(file));
}

function saveState(networkName, state) {
  fs.writeFileSync(getStateFile(networkName), JSON.stringify(state, null, 2));
}

// ================= CORE MONITOR =================

async function monitorNetwork(networkConfig) {
  const { name, rpc, contract } = networkConfig;

  log(`\n========= Starting ${name.toUpperCase()} =========`);

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(AI_LOCK, provider);

  const readContract = new ethers.Contract(contract, contractAbi, provider);
  const writeContract = readContract.connect(wallet);

  const state = loadState(name);
  const lastProcessed = state.lastProcessedMarketId;

  const totalMarkets = Number(await readContract.marketCount());
  log(`[${name}] Total markets on chain: ${totalMarkets}`);

  // ================= NEW MARKET DETECTION =================
  if (totalMarkets > lastProcessed) {
    const newIds = [];
    for (let i = lastProcessed + 1; i < totalMarkets; i++) newIds.push(i);
    log(`[${name}] ${newIds.length} new markets detected`);

    for (let i = 0; i < newIds.length; i += readLimit) {
      const batch = newIds.slice(i, i + readLimit);
      log(`[${name}] Reading batch ${i} → ${i + batch.length - 1}`);

      const marketDataArray = await readContract.readMarketData(batch);

      for (let j = 0; j < batch.length; j++) {
        const id = batch[j];
        const data = marketDataArray[j];

        state.markets[id] = {
          endTime: Number(data.endTime),
          closed: data.closed,
          finalized: false,
          finalizedUpTo: 0,
          finalizeRetries: 0
        };

        log(`[${name}] Market ${id} tracked | EndTime: ${data.endTime}`);
      }

      saveState(name, state);
      if (i + readLimit < newIds.length) await sleep(batchDelayMs);
    }

    state.lastProcessedMarketId = totalMarkets;
    saveState(name, state);
  } else {
    log(`[${name}] No new markets.`);
  }

  // ================= MARKET CLOSURE & FINALIZATION =================
  const now = Math.floor(Date.now() / 1000);

  for (const [marketId, market] of Object.entries(state.markets)) {

    // ===== CLOSE MARKET =====
    if (!market.closed && market.endTime <= now) {
      log(`[${name}] Market ${marketId} expired. Attempting closure...`);
      await attemptCloseMarket(name, Number(marketId), readContract, writeContract, state);
      await sleep(1000);
    }

    // ===== FINALIZE MARKET =====
    if (market.closed && !market.finalized && market.finalizeRetries < maxRetryAttempts) {
      log(`[${name}] Market ${marketId} closed. Starting finalization...`);
      await finalizeMarket(name, Number(marketId), readContract, writeContract, state);
    }
  }

  saveState(name, state);
  log(`========= Finished ${name.toUpperCase()} =========`);
}

// ================= CLOSE FUNCTION =================

async function attemptCloseMarket(networkName, marketId, readContract, writeContract, state) {
  try {
    const [data] = await readContract.readMarketData([marketId]);

    if (data.closed) {
      state.markets[marketId].closed = true;
      log(`[${networkName}] Market ${marketId} already closed.`);
      return;
    }

    const winnerSignal = await determineWinner(marketId);

    await writeContract.closeMarket.staticCall(marketId, winnerSignal);
    const tx = await writeContract.closeMarket(marketId, winnerSignal, { gasLimit: 500000 });

    log(`[${networkName}] Closing TX sent: ${tx.hash}`);
    await tx.wait();

    state.markets[marketId].closed = true;
    log(`[${networkName}] Market ${marketId} closed successfully.`);

  } catch (err) {
    log(`[${networkName}] Close failed for ${marketId}: ${err.message}`);
  }
}

// ================= FINALIZE FUNCTION =================

async function finalizeMarket(networkName, marketId, readContract, writeContract, state) {
  const batchDelay = batchDelayMs / 2;

  while (state.markets[marketId].finalizeRetries < maxRetryAttempts) {
    try {
      // Read the market lock to check progress
      const lock = await readContract.allMarketLocks(marketId);

      if (lock.sharesFinalized) {
        state.markets[marketId].finalized = true;
        log(`[${networkName}] Market ${marketId} already finalized on-chain.`);
        saveState(networkName, state);
        break;
      }

      // Call finalizeShares
      const result = await writeContract.finalizeShares(marketId, { gasLimit: 500000 });
      let done = result[0], remaining = result[1], nextBatchSize = result[2];

      log(`[${networkName}] Market ${marketId} finalizeShares called | done: ${done}, remaining: ${remaining}, nextBatch: ${nextBatchSize}`);

      state.markets[marketId].finalized = done;
      state.markets[marketId].finalizedUpTo = (state.markets[marketId].finalizedUpTo || 0) + nextBatchSize;
      state.markets[marketId].finalizeRetries = 0;
      saveState(networkName, state);

      if (done) break;

      log(`[${networkName}] Market ${marketId} not fully finalized. Retrying in ${batchDelay / 1000}s...`);
      await sleep(batchDelay);

    } catch (err) {
      state.markets[marketId].finalizeRetries += 1;
      log(`[${networkName}] Finalization attempt ${state.markets[marketId].finalizeRetries} failed for market ${marketId}: ${err.message}`);
      await sleep(batchDelay);

      if (state.markets[marketId].finalizeRetries >= maxRetryAttempts) {
        log(`[${networkName}] Market ${marketId} reached max retry attempts. Will retry in next cron run.`);
        saveState(networkName, state);
        break;
      }
    }
  }

  if (state.markets[marketId].finalized) {
    log(`[${networkName}] Market ${marketId} finalized successfully!`);
  }
}

// ================= AI PLACEHOLDER =================

async function determineWinner(marketId) {
  return Math.random() < 0.5;
}

// ================= MAIN =================

async function run() {
  log("Cron monitor execution started.");

  for (const network of networks) {
    await monitorNetwork(network);
    await sleep(3000);
  }

  log("All networks processed.\n");
  logStream.end();
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    log(`Fatal Error: ${err.message}`);
    logStream.end();
    process.exit(1);
  });
