require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// const nodeCron = require('node-cron');
// const fetch = require('node-fetch');

// const bodyParser = require('body-parser');
// const JSONStream = require('jsonstream');
// const mysql = require('mysql');
const crypto = require('crypto');
const OpenAI = require('openai');  
require('@anthropic-ai/sdk/shims/node');
const Anthropic = require('@anthropic-ai/sdk');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ================= AI CONFIG =================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID
});

const deepseekai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
});

// const perplexity = new OpenAI({
//   baseURL: 'https://api.perplexity.ai',
//   apiKey: process.env.PERPLEXITY_API_KEY
// });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const AI_LOCK = process.env.DECENTRALIZED_AI_LOCK;

const blacklistInstructionManual = `You are a content moderation engine.

  You receive an array of market objects in JSON.

  Return a JSON array containing ONLY the indexer values that are spam,
  random characters, gibberish, or not written in a known human language.

  Valid languages include natural human languages (English, Spanish, Chinese, Russian, etc.).

  If all markets are valid, return:
  []

  Rules:
  - Output STRICT JSON.
  - No explanation.
  - No commentary.`;

const resolutionInstruction = `
You are a deterministic prediction market judge.

You receive an array of EXPIRED markets.

For each market:
- Choose "A" if optionA is correct.
- Choose "B" if optionB is correct.

Return STRICT JSON:

[
  { "indexer": 1, "decision": "A" },
  { "indexer": 2, "decision": "B" }
]

No explanation.
No commentary.
Strict JSON only.
`;

// ================= UTILS =================
function safeParseArray(raw) {
  try {
    const cleaned = raw
      .replace(/```json|```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
// ================= CONSENSUS ENGINE =================
async function batchDetermineWinners(expiredMarkets) {

  if (!expiredMarkets.length) return [];

  log(`Sending ${expiredMarkets.length} expired markets to AI consensus.`);

  const payload = JSON.stringify(expiredMarkets);

  async function queryOpenAI() {
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });

      log(`OpenAI responded (${expiredMarkets.length} markets).`);
      return safeParseArray(res.choices[0].message.content.trim());
    } catch (err) {
      log(`OpenAI error: ${err.message}`);
      return null;
    }
  }

  async function queryDeepSeek() {
    try {
      const res = await deepseekai.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });

      log(`DeepSeek responded (${expiredMarkets.length} markets).`);
      return safeParseArray(res.choices[0].message.content.trim());
    } catch (err) {
      log(`DeepSeek error: ${err.message}`);
      return null;
    }
  }

  async function queryAnthropic() {
    try {
      const res = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 2000,
        system: resolutionInstruction,
        messages: [{ role: "user", content: payload }]
      });

      log(`Anthropic responded (${expiredMarkets.length} markets).`);
      return safeParseArray(res.content[0].text.trim());
    } catch (err) {
      log(`Anthropic error: ${err.message}`);
      return null;
    }
  }

  const [openaiRes, deepseekRes, anthropicRes] =
    await Promise.all([
      queryOpenAI(),
      queryDeepSeek(),
      queryAnthropic()
    ]);

  const modelOutputs = [openaiRes, deepseekRes, anthropicRes]
    .filter(r => Array.isArray(r));

  if (modelOutputs.length < 2) {
    log(`Not enough AI responses for consensus.`);
    return [];
  }

  const voteMap = {};

  for (const output of modelOutputs) {
    for (const item of output) {

      if (!item?.indexer || !["A", "B"].includes(item.decision))
        continue;

      if (!voteMap[item.indexer])
        voteMap[item.indexer] = { A: 0, B: 0 };

      voteMap[item.indexer][item.decision]++;
    }
  }

  const finalResults = [];

  for (const [indexer, votes] of Object.entries(voteMap)) {

    log(`Market ${indexer} votes → A:${votes.A} B:${votes.B}`);

    if (votes.A >= 2)
      finalResults.push({ indexer: Number(indexer), decision: "A" });
    else if (votes.B >= 2)
      finalResults.push({ indexer: Number(indexer), decision: "B" });
    else
      log(`No consensus for market ${indexer}. Skipping.`);
  }

  return finalResults;
}


function prepareMarketPayload(marketInfoArray) {
  return marketInfoArray.map((m) => ({
    indexer: Number(m.indexer),
    title: m.title,
    subtitle: m.subtitle,
    description: m.description,
    optionA: m.optionA,
    optionB: m.optionB
  }));
}

// ================= CONFIG =================

const readLimit = 200;
const batchDelayMs = 5000;
const maxRetryAttempts = 3;

const ABI_PATH = path.join(__dirname, 'penny4thot_abi.json');
const contractAbi = require(ABI_PATH);

const networks = [
  {
    name: 'sepolia',
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    contract: '0x929A04E8d5d8aFBCA5C6cE0e9Fe05f506081cc27' // 0xdFece4CFBFc01e511dc1015422EC3cdE96A27188
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
      log(`All new markets Data read.`);
      const marketInfoArray = await readContract.readMarket(batch);
      log(`All new markets read.`);
      await AntiAbuseBlacklister(marketInfoArray, writeContract);

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
  

  // ================= MARKET CLOSURE =================

  const now = Math.floor(Date.now() / 1000);
  const expiredIds = [];

  // Step 1: Collect expired market IDs
  for (const [marketId, market] of Object.entries(state.markets)) {
    if (!market.closed && market.endTime <= now) {
      expiredIds.push(Number(marketId));
    }
  }

  if (expiredIds.length === 0) {
    log(`[${name}] No expired markets to resolve.`);
  } else {

    log(`[${name}] Found ${expiredIds.length} expired markets.`);

    const chunkSize = 200; // contract-safe batch limit
    const expiredMarkets = [];

    // Step 2: Chunked batch reading
    for (let i = 0; i < expiredIds.length; i += chunkSize) {

      const chunkIds = expiredIds.slice(i, i + chunkSize);

      log(`[${name}] Reading chunk ${i / chunkSize + 1} (${chunkIds.length} markets)`);

      const marketInfos = await readContract.readMarket(chunkIds);

      // Step 3: Map returned data deterministically
      for (let j = 0; j < chunkIds.length; j++) {

        const id = chunkIds[j];
        const info = marketInfos[j];

        expiredMarkets.push({
          indexer: id,
          title: info.title,
          subtitle: info.subtitle,
          description: info.description,
          optionA: info.optionA,
          optionB: info.optionB,
          endTime: state.markets[id].endTime
        });
      }

    // Optional minor delay to reduce RPC pressure
    await sleep(300);
  }

  log(`[${name}] Sending ${expiredMarkets.length} markets to AI consensus`);

  const aiChunkSize = 50; // Defensive AI batch limit
  const decisions = [];

  for (let i = 0; i < expiredMarkets.length; i += aiChunkSize) {

    const aiChunk = expiredMarkets.slice(i, i + aiChunkSize);

    log(`[${name}] AI consensus batch ${Math.floor(i / aiChunkSize) + 1} (${aiChunk.length} markets)`);

    const chunkResults = await batchDetermineWinners(aiChunk);

    if (Array.isArray(chunkResults) && chunkResults.length > 0) {
      decisions.push(...chunkResults);
    }

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(aiChunk))
    .digest('hex');

  log(`AI batch hash: ${hash}`);

    // Slight delay to avoid rate-limit bursts
    await sleep(500);
  }

  log(`[${name}] AI consensus complete. ${decisions.length} markets resolved.`);


  // Step 5: Sequential closure (safe nonce handling)
  for (const result of decisions) {

    const resolvedToOptionA = result.decision === "A";

    try {

      // 🔎 --- ON-CHAIN STATE RESYNC ---
      const data = await readContract.readMarketData([result.indexer]);

      if (data[0].closed) {
        state.markets[result.indexer].closed = true;
        log(`[${name}] Market ${result.indexer} already closed on-chain. Syncing state.`);
        saveState(name, state);
        continue;
      }

      // 🔐 Safety static call
      await writeContract.closeMarket.staticCall(
        result.indexer,
        resolvedToOptionA
      );

      const tx = await writeContract.closeMarket(
        result.indexer,
        resolvedToOptionA,
        { gasLimit: 500000 }
      );

      log(`[${name}] Closing TX sent: ${tx.hash}`);
      await tx.wait();

      state.markets[result.indexer].closed = true;
      saveState(name, state);

      log(`[${name}] Market ${result.indexer} closed → ${result.decision}`);

    } catch (err) {
      log(`[${name}] Close failed for ${result.indexer}: ${err.message}`);
    }

    await sleep(1000);
  }
}

  // ================= FINALIZATION =================

  for (const [marketId, market] of Object.entries(state.markets)) {

    if (market.closed && !market.finalized && market.finalizeRetries < maxRetryAttempts) {
      log(`[${name}] Market ${marketId} closed. Starting finalization...`);
      await finalizeMarket(name, Number(marketId), readContract, writeContract, state);
    }
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
      const preview = await writeContract.finalizeShares.staticCall(marketId);
      let done = preview[0], remaining = Number(preview[1]), nextBatchSize = Number(preview[2]);
      const tx = await writeContract.finalizeShares(marketId, { gasLimit: 500000 });
      await tx.wait();


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

// ================= AI BLACKLISTER =================
async function AntiAbuseBlacklister(marketInfoArray, writeContract) {
      log(`Running anti-abuse for new markets.`);

  if (!marketInfoArray || marketInfoArray.length === 0) return;

  const payload = prepareMarketPayload(marketInfoArray);

  const instruction = blacklistInstructionManual;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: JSON.stringify(payload) }
      ],
    });

    const raw = completion.choices[0].message.content.trim();

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("AI returned invalid JSON:", raw);
      log(`AI returned invalid JSON.`);
      return;
    }

    if (!Array.isArray(parsed)) {
      console.error("AI output was not array:", parsed);
      log(`AI output was not array.`);
      return;
    }

    if (parsed.length === 0) {
      console.log("Batch clean. No abusive markets detected.");
      log(`Batch clean. No abusive markets detected.`);
      return;
    }

    // Sanitize IDs
    const validIds = parsed.filter(id =>
      Number.isInteger(id) &&
      payload.some(m => m.indexer === id)
    );

    if (validIds.length === 0) {
      console.log("AI returned invalid marketIds.");
      log(`AI returned invalid marketIds.`);
      return;
    }

    console.log("Blacklisting markets:", validIds);
      log(`Blacklisting markets: ${validIds}`);

    const tx = await writeContract.AddToBlacklist(validIds, {
      gasLimit: 500000
    });

    await tx.wait();

    console.log("Blacklist confirmed.");
      log(`Blacklist confirmed.`);

  } catch (error) {
    console.error("OpenAI API Error:", error);
      log(`OpenAI API Error.`);
  }
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
