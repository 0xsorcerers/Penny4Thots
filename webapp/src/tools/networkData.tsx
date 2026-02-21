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

const perplexity = new OpenAI({
  baseURL: 'https://api.perplexity.ai',
  apiKey: process.env.PERPLEXITY_API_KEY
});

const xai = new OpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY
});

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

Each market includes:
- startTime (UNIX timestamp when the market was created)
- endTime (UNIX timestamp when the market expired)

Interpret relative time expressions such as "tomorrow", "next week", or "this month"
relative to the market's startTime.

Use startTime as the reference point for temporal context,
NOT the current date.

Return STRICT JSON:

[
  { "indexer": 1, "decision": "A" },
  { "indexer": 2, "decision": "B" }
]

No explanation.
No commentary.
Strict JSON only.
`;

// ================= JUDGE REGISTRY =================

const AI_JUDGES = {
  openai: {
    label: "OpenAI(gpt-4o)",
    fn: async (payload) => {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      return safeParseArray(res.choices[0].message.content.trim());
    }
  },

  deepseek: {
    label: "DeepSeek(deepseek-chat)",
    fn: async (payload) => {
      const res = await deepseekai.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      return safeParseArray(res.choices[0].message.content.trim());
    }
  },

  anthropic: {
    label: "Anthropic(claude-haiku-3-5)",
    fn: async (payload) => {
      const res = await anthropic.messages.create({
        model: "claude-haiku-3-5",
        max_tokens: 2000,
        system: resolutionInstruction,
        messages: [{ role: "user", content: payload }]
      });
      return safeParseArray(res.content[0].text.trim());
    }
  },

   perplexity: {
    label: "Perplexity(sonar-pro)",
    fn: async (payload) => {
      const res = await perplexity.chat.completions.create({
        model: "sonar-pro",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      return safeParseArray(res.choices[0].message.content.trim());
    }
   },

   xai: {
    label: "Grok(4.1)",
    fn: async (payload) => {
      const res = await xai.chat.completions.create({
        model: "grok-4-1-fast-reasoning",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      return safeParseArray(res.choices[0].message.content.trim());
    }
   }
};


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

// ================= DETERMINISTIC SHUFFLE =================

function deterministicShuffle(array, seedHex) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const hash = crypto
      .createHash("sha256")
      .update(seedHex + "-" + i)
      .digest("hex");

    const j = parseInt(hash.slice(0, 8), 16) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function pickSittingJudges(latestBlockHash, indexer, count = 3) {
  const judgeKeys = Object.keys(AI_JUDGES);

  const seed = crypto
    .createHash("sha256")
    .update(`${latestBlockHash}-${indexer}`)
    .digest("hex");

  const shuffled = deterministicShuffle(judgeKeys, seed);

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ================= CONSENSUS ENGINE =================
async function batchDetermineWinners(expiredMarkets, latestBlockHash) {
    if (!expiredMarkets.length) {
    return { resolved: [], voteMap: {} };
  }

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
        model: "claude-haiku-3-5",
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

  const perMarketResults = {};
  const voteMap = {};
    
    for (const market of expiredMarkets) {
      const payloadSingle = JSON.stringify([market]);
    
      // 🔥 deterministic judge selection
      const sittingJudges = pickSittingJudges(
        latestBlockHash,
        market.indexer,
        3
      );
    
      log(`Market ${market.indexer} sitting judges → ${sittingJudges.join(", ")}`);
    
      const judgePromises = sittingJudges.map(async (judgeName) => {
        try {
          const result = await AI_JUDGES[judgeName].fn(payloadSingle);
          return { judgeName, result };
        } catch (err) {
          log(`${judgeName} error: ${err.message}`);
          return null;
        }
      });
    
      const responses = (await Promise.all(judgePromises)).filter(Boolean);
    
      for (const resp of responses) {
        const { judgeName, result } = resp;
        if (!Array.isArray(result)) continue;
    
        for (const item of result) {
          const decision = String(item?.decision || "").toUpperCase();
          if (!item?.indexer || !["A", "B"].includes(decision)) continue;
    
          if (!voteMap[item.indexer]) {
            voteMap[item.indexer] = { votes: { A: 0, B: 0 }, models: {} };
          }
    
          voteMap[item.indexer].votes[decision]++;
          voteMap[item.indexer].models[judgeName] = decision;
        }
      }
    }

  const finalResults = [];
  for (const [indexer, data] of Object.entries(voteMap)) {
    const { votes, models } = data;
    log(`Market ${indexer} votes → A:${votes.A} B:${votes.B}`);

    if (votes.A >= 2 || votes.B >= 2) {
      const winner = votes.A >= 2 ? "A" : "B";
      finalResults.push({ indexer: Number(indexer), decision: winner, models, deadlockBrokenBy: null });
    } else {
      log(`No consensus for market ${indexer}. Skipping.`);
    }
  }

  return { resolved: finalResults, voteMap };
}

async function finalArbiterResolve(market, luckyJudge) {
  log(`Deadlock detected for market ${market.indexer}. Random arbiter selected: ${luckyJudge}`);
  const payload = JSON.stringify([market]);

  try {
    if (luckyJudge === "openai") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      const parsed = safeParseArray(res.choices[0].message.content.trim());
      if (parsed?.[0]) return { ...parsed[0], deadlockBrokenBy: luckyJudge };
      return null;
    }

    if (luckyJudge === "deepseek") {
      const res = await deepseekai.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      const parsed = safeParseArray(res.choices[0].message.content.trim());
      if (parsed?.[0]) return { ...parsed[0], deadlockBrokenBy: luckyJudge };
      return null;
    }

    if (luckyJudge === "anthropic") {
      const res = await anthropic.messages.create({
        model: "claude-haiku-3-5",
        max_tokens: 2000,
        system: resolutionInstruction,
        messages: [{ role: "user", content: payload }]
      });
      const parsed = safeParseArray(res.content[0].text.trim());
      if (parsed?.[0]) return { ...parsed[0], deadlockBrokenBy: luckyJudge };
      return null;
    }
    
    if (luckyJudge === "perplexity") {
      const res = await perplexity.chat.completions.create({
        model: "sonar-pro",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      const parsed = safeParseArray(res.choices[0].message.content.trim());
      if (parsed?.[0]) return { ...parsed[0], deadlockBrokenBy: luckyJudge };
      return null;
    }
    
    if (luckyJudge === "xai") {
      const res = await xai.chat.completions.create({
        model: "grok-4-1-fast-reasoning",
        temperature: 0,
        messages: [
          { role: "system", content: resolutionInstruction },
          { role: "user", content: payload }
        ]
      });
      const parsed = safeParseArray(res.choices[0].message.content.trim());
      if (parsed?.[0]) return { ...parsed[0], deadlockBrokenBy: luckyJudge };
      return null;
    }
    
  } catch (err) {
    log(`Final arbiter error: ${err.message}`);
    return null;
  }

  return null;
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
    contract: '0x7DeA875A4D644aB78e0914FFF8b760bE5e8F54cb'
  },
  {
    name: 'bnb',
    rpc: 'https://bsc-dataseed.binance.org',
    contract: '0x13B9CD2340E8224D4c1CC86d3481c217d9078AAe'
  },
  {
    name: 'base',
    rpc: 'https://gateway.tenderly.co/public/base',
    contract: '0xe8f5b91e8e4c49f499002745bA49dc9fEE7670C6'
  },
  {
    name: 'scroll',
    rpc: 'https://rpc.scroll.io',
    contract: '0x06F94c107808bC4d9c27fA8476C3E2f5F83A9c3C'
  },
  {
    name: 'manta',
    rpc: 'https://pacific-rpc.manta.network/http',
    contract: '0x83D8EeeB23539CEB139DDbD00dc26eE57Bb3F2Bd'
  },
  {
    name: 'opbnb',
    rpc: 'https://opbnb-mainnet-rpc.bnbchain.org',
    contract: '0x8d4a1A116Fd092D21b47Aa29a1882995af234353'
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
      log(`All new markets data read.`);
      const marketInfoArray = await readContract.readMarket(batch);
      log(`All new markets read.`);
      await AntiAbuseBlacklister(marketInfoArray, writeContract);

      for (let j = 0; j < batch.length; j++) {
          const id = batch[j];
          const data = marketDataArray[j];
          const info = marketInfoArray[j];
        
          state.markets[id] = {
            startTime: Number(data.startTime),
            endTime: Number(data.endTime),
            closed: data.closed,
            finalized: false,
            finalizedUpTo: 0,
            finalizeRetries: 0,
            consensusAttempts: 0,
            lastVoteModels: {},
        
            // ✅ NEW — FULL CACHE (critical for efficiency)
            optionA: info.optionA,
            optionB: info.optionB
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

  for (const [marketId, market] of Object.entries(state.markets)) {
    if (!market.closed && market.endTime <= now) {
      expiredIds.push(Number(marketId));
    }
  }

  if (expiredIds.length === 0) {
    log(`[${name}] No expired markets to resolve.`);
    return;
  }

  log(`[${name}] Found ${expiredIds.length} expired markets.`);

  const chunkSize = 200;
  const expiredMarkets = [];

  for (let i = 0; i < expiredIds.length; i += chunkSize) {
    const chunkIds = expiredIds.slice(i, i + chunkSize);
    log(`[${name}] Reading chunk ${i / chunkSize + 1} (${chunkIds.length} markets)`);
    const marketInfos = await readContract.readMarket(chunkIds);

    for (let j = 0; j < chunkIds.length; j++) {
      const id = chunkIds[j];
      const info = marketInfos[j];
    
      // 🔒 refresh cache safely if missing
      if (!state.markets[id].optionA) {
        state.markets[id].optionA = info.optionA;
        state.markets[id].optionB = info.optionB;
      }
    
      expiredMarkets.push({
        indexer: id,
        title: info.title,
        subtitle: info.subtitle,
        description: info.description,
        optionA: state.markets[id].optionA,
        optionB: state.markets[id].optionB,
        startTime: state.markets[id].startTime,
        endTime: state.markets[id].endTime
      });
    }


    await sleep(300);
  }

  log(`[${name}] Sending ${expiredMarkets.length} markets to AI consensus`);

  const aiChunkSize = 50;
  const decisions = [];

  for (let i = 0; i < expiredMarkets.length; i += aiChunkSize) {
    const aiChunk = expiredMarkets.slice(i, i + aiChunkSize);
    log(`[${name}] AI consensus batch ${Math.floor(i / aiChunkSize) + 1} (${aiChunk.length} markets)`);
    
    const latestBlockForConsensus = await provider.getBlock("latest");
    const consensusResult = await batchDetermineWinners(
      aiChunk,
      latestBlockForConsensus.hash
    );

    if (consensusResult?.resolved?.length > 0) {
      decisions.push(...consensusResult.resolved);
    }

    if (consensusResult?.voteMap) {
      for (const [id, data] of Object.entries(consensusResult.voteMap)) {
        if (!state.markets[id]) continue;
        state.markets[id].lastVoteModels = data.models;
      }
    }

    const hash = crypto.createHash('sha256').update(JSON.stringify(aiChunk)).digest('hex');
    log(`AI batch hash: ${hash}`);
    await sleep(500);
  }

  log(`[${name}] AI consensus complete. ${decisions.length} markets resolved.`);

  // ================= DEADLOCK HANDLING =================

  const latestBlock = await provider.getBlock("latest");

  const resolvedIds = new Set(decisions.map(d => d.indexer));

    for (const market of expiredMarkets) {
        
        const seed = crypto
          .createHash("sha256")
          .update(`${latestBlock.hash}-${market.indexer}`)
          .digest("hex");
          
        const judges = Object.keys(AI_JUDGES);
        
        const index = parseInt(seed.slice(0, 8), 16) % judges.length;
        const luckyJudge = judges[index];
    
        const id = market.indexer;
        const resolvedIds = new Set(decisions.map(d => d.indexer));
    
        if (resolvedIds.has(id)) {
          continue;
        }
    
        state.markets[id].consensusAttempts = (state.markets[id].consensusAttempts || 0) + 1;
        log(`[${name}] Market ${id} deadlock attempt ${state.markets[id].consensusAttempts}`);
    
        if (state.markets[id].consensusAttempts >= 3) {
          const arbiterDecision = await finalArbiterResolve(market, luckyJudge);
    
          if (arbiterDecision && ["A", "B"].includes(arbiterDecision.decision)) {
            log(`[${name}] Final arbiter resolved market ${id} → ${arbiterDecision.decision}`);
            decisions.push({
              indexer: id,
              decision: arbiterDecision.decision,
              models: state.markets[id].lastVoteModels || {},
              deadlockBrokenBy: arbiterDecision.deadlockBrokenBy
            });
            state.markets[id].consensusAttempts = 0;
          } else {
            log(`[${name}] Final arbiter failed for market ${id}. Will retry next run.`);
          }
        }
      }
    
      saveState(name, state);

  // ================= SEQUENTIAL CLOSURE =================
  for (const result of decisions) {
    const resolvedToOptionA = result.decision === "A";
    
    const marketState = state.markets[result.indexer];
    if (marketState.closed) {
       log(`[${name}] Market ${result.indexer} already closed (cached). Syncing state.`);
       continue;
    }

    try {

      // ================= BUILD ADJUDICATOR STRING =================
      const minedBlock = await provider.getBlock("latest"); // fallback for timestamp
      const dateObj = new Date(minedBlock.timestamp * 1000);
      const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2,'0')}/` +
                            `${String(dateObj.getDate()).padStart(2,'0')}/` +
                            `${dateObj.getFullYear()}`;

      const decisionHash = crypto.createHash('sha256')
        .update(`${result.indexer}-${result.decision}-${JSON.stringify(result.models || {})}`)
        .digest('hex');

      const judgeEntries = Object.entries(result.models || {}).map(
          ([model, vote]) => {
            const judgeLabel = AI_JUDGES[model]?.label || model;
        
            const optionText =
              vote === "A"
                ? marketState.optionA
                : marketState.optionB;
        
            return `${judgeLabel} voted "${optionText}"`;
          }
      );

      let adjudicatorString =
        `At ${formattedDate}, decision ${decisionHash} to close market ${result.indexer} ` +
        `was reached by ${judgeEntries.length} judges: ${judgeEntries.join(", ")}.`;

      if (result.deadlockBrokenBy) {
        adjudicatorString += ` The deadlock was broken by ${modelLabelMap[result.deadlockBrokenBy]}.`;
      }

      // 🔐 Static call
      await writeContract.closeMarket.staticCall(
        result.indexer,
        resolvedToOptionA,
        adjudicatorString
      );

      // ✅ Send TX
      const tx = await writeContract.closeMarket(
        result.indexer,
        resolvedToOptionA,
        adjudicatorString,
        { gasLimit: 500000 }
      );

      const receipt = await tx.wait();
      const minedBlockFinal = await provider.getBlock(receipt.blockNumber);

      state.markets[result.indexer].closed = true;
      state.markets[result.indexer].consensusAttempts = 0; 
      saveState(name, state);

      log(`[${name}] Market ${result.indexer} closed → ${result.decision}`);
    } catch (err) {
      log(`[${name}] Close failed for ${result.indexer}: ${err.message}`);
    }

    await sleep(1000);
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
      // Check on-chain lock status
      const lock = await readContract.allMarketLocks(marketId);

      if (lock.sharesFinalized) {
        state.markets[marketId].finalized = true;
        log(`[${networkName}] Market ${marketId} already finalized on-chain.`);
        saveState(networkName, state);
        break;
      }

      // Preview finalizeShares call
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
      state.markets[marketId].finalizeRetries++;
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
      ]
    });

    const raw = completion.choices[0].message.content.trim();
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      log(`AI returned invalid JSON: ${raw}`);
      return;
    }

    if (!Array.isArray(parsed)) {
      log(`AI output was not an array: ${parsed}`);
      return;
    }

    if (parsed.length === 0) {
      log(`Batch clean. No abusive markets detected.`);
      return;
    }

    // Filter valid IDs only
    const validIds = parsed.filter(id =>
      Number.isInteger(id) &&
      payload.some(m => m.indexer === id)
    );

    if (validIds.length === 0) {
      log(`AI returned invalid marketIds.`);
      return;
    }

    log(`Blacklisting markets: ${validIds}`);

    const tx = await writeContract.AddToBlacklist(validIds, { gasLimit: 500000 });
    await tx.wait();

    log(`Blacklist confirmed.`);
  } catch (error) {
    log(`OpenAI API Error: ${error.message}`);
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
