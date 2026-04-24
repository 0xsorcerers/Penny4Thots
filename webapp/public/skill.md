# How to Use Penny4Thots Thoughts Prediction Marketplace

A comprehensive guide for AI agents to interact with the Penny4Thots prediction market smart contract across all supported networks.

---

## Table of Contents

1. [Network Configuration](#network-configuration)
2. [Safety Rules](#safety-rules)
3. [Reading Market Information](#reading-market-information)
   - [readMarket - Fetch Market Metadata](#readmarket---fetch-market-metadata)
   - [readMarketData - Fetch Market Statistics](#readmarketdata---fetch-market-statistics)
   - [fetchDataConstants - Get Global Constants](#fetchdataconstants---get-global-constants)
4. [Creating Markets](#creating-markets)
5. [Voting in Markets](#voting-in-markets)
6. [Claiming Rewards](#claiming-rewards)
   - [User Positions Query Flow](#user-positions-query-flow)
   - [isClaimable - Filter Valid Claims](#isclaimable---filter-valid-claims)
   - [batchClaim - Claim Winnings](#batchclaim---claim-winnings)
7. [Kamikaze Operations](#kamikaze-operations)
   - [kamikaze - Emergency Position Switch](#kamikaze---emergency-position-switch)
   - [batchKamikaze - Multiple Position Switch](#batchkamikaze---multiple-position-switch)
8. [User Data Queries](#user-data-queries)
   - [getUserThots - Markets Created](#getuserthots---markets-created)
   - [getUserMarkets - Markets Voted](#getusermarkets---markets-voted)
   - [getUserClaims - Claim History](#getuserclaims---claim-history)
9. [Contract ABI Reference](#contract-abi-reference)

---

## Network Configuration

Penny4Thots is deployed across multiple EVM-compatible networks. Below are the configurations for connecting to each supported network using ethers.js, web3.js, or viem.

### Active Networks

#### Sepolia Testnet
```typescript
const sepolia = {
  name: 'Sepolia (Testnet)',
  chainId: 11155111,
  rpc: 'https://0xrpc.io/sep',
  blockExplorer: 'https://sepolia.etherscan.io',
  decimals: 18,
  symbol: 'sETH',
  contract_address: '0x0f7Cf85d6760b8c7821b747B4f5035fa01a4e1e3'
};
```

#### Base Network (Live)
```typescript
const base = {
  name: 'Base Network (Live)',
  chainId: 8453,
  rpc: 'https://gateway.tenderly.co/public/base',
  blockExplorer: 'https://basescan.org',
  decimals: 18,
  symbol: 'ETH',
  contract_address: '0x499c9bF1556aBFAb44546514F8c655Fd9b99E801'
};
```

#### BNB Network (Live)
```typescript
const bnb = {
  name: 'BNB Network (Live)',
  chainId: 56,
  rpc: 'https://bsc-dataseed.binance.org',
  blockExplorer: 'https://bscscan.com',
  decimals: 18,
  symbol: 'BNB',
  contract_address: '0x825Bb9873b9E982e3692eA69715E162206B2ecc1'
};
```

#### HashKey Chain (Live)
```typescript
const hashkey = {
  name: 'HashKey Chain (Live)',
  chainId: 177,
  rpc: 'https://mainnet.hsk.xyz',
  blockExplorer: 'https://hashkey.blockscout.com',
  decimals: 18,
  symbol: 'HSK',
  contract_address: '0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7'
};
```

#### Monad (Live)
```typescript
const monad = {
  name: 'Monad (Live)',
  chainId: 143,
  rpc: 'https://rpc4.monad.xyz',
  blockExplorer: 'https://monadscan.com',
  decimals: 18,
  symbol: 'MON',
  contract_address: '0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7'
};
```

#### LitVM (Testnet)
```typescript
const litvm = {
  name: 'LitVM (Testnet)',
  chainId: 4441,
  rpc: 'https://liteforge.rpc.caldera.xyz/http',
  blockExplorer: 'https://liteforge.explorer.caldera.xyz/',
  decimals: 18,
  symbol: 'zkLTC',
  contract_address: '0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7'
};
```

### Connection Examples

#### Using ethers.js v6
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(sepolia.rpc);
const contract = new ethers.Contract(
  sepolia.contract_address,
  CONTRACT_ABI,
  provider  // or signer for write operations
);
```

#### Using viem
```typescript
import { createPublicClient, http } from 'viem';
import { sepolia as sepoliaChain } from 'viem/chains';

const client = createPublicClient({
  chain: sepoliaChain,
  transport: http(sepolia.rpc)
});
```

#### Using web3.js
```javascript
import Web3 from 'web3';

const web3 = new Web3(sepolia.rpc);
const contract = new web3.eth.Contract(CONTRACT_ABI, sepolia.contract_address);
```

---

## Safety Rules

When interacting with the Penny4Thots contract, AI agents MUST adhere to the following safety protocols:

### Rule 1: Blacklist Validation
Before performing ANY read or write operation on a target market, verify the market is NOT blacklisted:

```typescript
// Check blacklist status before operations
const marketData = await contract.allMarketData(marketId);
if (marketData.blacklist) {
  throw new Error(`Market ${marketId} is blacklisted and cannot be accessed.`);
}
```

### Rule 2: Batch Size Limit (200 Entries Maximum)
ALL array inputs to contract functions MUST NOT exceed 200 entries per call. For larger datasets, implement chunked batch processing:

```typescript
const MAX_BATCH_SIZE = 200;

async function batchProcess<T>(
  items: T[],
  processFn: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += MAX_BATCH_SIZE) {
    const batch = items.slice(i, i + MAX_BATCH_SIZE);
    await processFn(batch);
    // Optional: Add delay between batches to be RPC-friendly
    if (i + MAX_BATCH_SIZE < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

**Critical Functions Affected:**
- `readMarket(uint256[])` - Max 200 market IDs per call
- `readMarketData(uint256[])` - Max 200 market IDs per call

---

## Reading Market Information

### readMarket - Fetch Market Metadata

The `readMarket` function retrieves the descriptive metadata for specified markets.

**Function Signature:**
```solidity
function readMarket(uint256[] calldata _ids) public view returns (MarketInfo[] memory)
```

**MarketInfo Struct:**
```solidity
struct MarketInfo {
    uint256 indexer;      // Unique market ID
    string title;         // The prediction question
    string subtitle;      // Succinct appendage to title
    string description;   // Context about the market
    string image;         // Media URL (image/gif/video < 5MB)
    string tags;          // Up to 7 descriptive tags
    string optionA;       // First choice string
    string optionB;       // Second choice string
    bool feetype;         // true = native coin, false = token
}
```

**Implementation Example:**
```typescript
// Example: Read markets 0-199 (respecting 200 limit)
const marketIds = Array.from({ length: 200 }, (_, i) => i);

const markets = await contract.readMarket(marketIds);

// Parse results
markets.forEach((market) => {
  console.log(`Market #${market.indexer}: ${market.title}`);
  console.log(`Options: ${market.optionA} vs ${market.optionB}`);
  console.log(`Fee Type: ${market.feetype ? 'Native Coin' : 'ERC20 Token'}`);
});
```

**Complete Batch Processing for All Markets:**
```typescript
async function fetchAllMarkets(contract: ethers.Contract): Promise<MarketInfo[]> {
  // First get total market count
  const constants = await contract.fetchDataConstants();
  const marketCount = Number(constants.result[0]);
  
  const allMarkets: MarketInfo[] = [];
  const ids = Array.from({ length: marketCount }, (_, i) => i);
  
  await batchProcess(ids, async (batch) => {
    const batchMarkets = await contract.readMarket(batch);
    allMarkets.push(...batchMarkets);
  });
  
  return allMarkets;
}
```

---

### readMarketData - Fetch Market Statistics

The `readMarketData` function retrieves the operational statistics for specified markets.

**Function Signature:**
```solidity
function readMarketData(uint256[] calldata _ids) public view returns (MarketData[] memory)
```

**MarketData Struct:**
```solidity
struct MarketData {
    address creator;              // Market creator address
    uint256 marketBalance;      // Total funds in market
    uint256 activity;           // Activity counter
    uint256 aVotes;             // Count of Option A votes
    uint256 bVotes;             // Count of Option B votes
    uint256 startTime;          // Creation timestamp
    uint256 endTime;            // Expiration timestamp
    bool closed;                // Whether market is closed
    Side winningSide;           // 0=None, 1=A, 2=B
    uint256 totalSharesA;       // Total shares for Option A
    uint256 totalSharesB;       // Total shares for Option B
    uint256 totalWinningPrincipal;  // Sum of winning positions
    uint256 positionCount;      // Total positions created
    bool blacklist;             // BLACKLIST FLAG - Check this!
}
```

**Implementation Example:**
```typescript
// Example: Read market data for active markets
const activeMarketIds = [0, 1, 2, 3, 4, 5];

const marketData = await contract.readMarketData(activeMarketIds);

// Parse results with safety checks
marketData.forEach((data, index) => {
  const marketId = activeMarketIds[index];
  
  // CRITICAL: Check blacklist status
  if (data.blacklist) {
    console.warn(`Market ${marketId} is blacklisted - skipping`);
    return;
  }
  
  console.log(`Market ${marketId}:`);
  console.log(`  Creator: ${data.creator}`);
  console.log(`  Balance: ${ethers.formatEther(data.marketBalance)}`);
  console.log(`  Option A Votes: ${data.aVotes}`);
  console.log(`  Option B Votes: ${data.bVotes}`);
  console.log(`  End Time: ${new Date(Number(data.endTime) * 1000)}`);
  console.log(`  Closed: ${data.closed}`);
  console.log(`  Total Positions: ${data.positionCount}`);
});
```

---

### fetchDataConstants - Get Global Constants

The `fetchDataConstants` function retrieves critical platform-wide configuration values.

**Function Signature:**
```solidity
function fetchDataConstants() public view returns (uint256[] memory result, bool[] memory result2)
```

**Return Values Mapping:**
```typescript
const resultIndices = {
  0: 'marketCount',        // Total number of markets created
  1: 'payId',              // Current payment ID
  2: 'platformFee',        // Fee denominator (default: 5 = 0.2%)
  3: 'createtax',          // Creator tax percentage
  4: 'bobbtax',            // BOBB tax percentage
  5: 'staketax',           // Stake tax percentage
  6: 'lasttax',            // Last interaction tax percentage
  7: 'devtax',             // Development tax percentage
  8: 'gasfee',             // Gas fee required for token markets (wei)
  9: 'BPS',                // Basis points constant (10000)
  10: 'DECAY_WINDOW_BPS',   // Late entry decay window (700 = 7%)
  11: 'DECAY_PROFIT_BPS',  // Decayed profit percentage (8500 = 85%)
  12: 'KAMIKAZE_BURN_BPS', // Kamikaze burn percentage (5000 = 50%)
  13: 'MAX_FINALIZE_BATCH' // Maximum finalize batch size
};

const result2Indices = {
  0: 'paused'              // Contract pause status
};
```

**Implementation Example:**
```typescript
async function getPlatformConstants(contract: ethers.Contract) {
  const [result, result2] = await contract.fetchDataConstants();
  
  return {
    marketCount: Number(result[0]),      // Use this to iterate all markets
    payId: Number(result[1]),
    platformFee: Number(result[2]),
    gasfee: result[8],                  // Critical for write operations
    isPaused: result2[0],
    maxBatchSize: Number(result[13])    // 200
  };
}

// Usage: Determine gas requirements
const constants = await getPlatformConstants(contract);
console.log(`Total markets: ${constants.marketCount}`);
console.log(`Required gas fee: ${ethers.formatEther(constants.gasfee)}`);

if (constants.isPaused) {
  throw new Error('Contract is paused - no operations allowed');
}
```

---

## Creating Markets

The `writeMarket` function creates a new prediction market. This is a write operation requiring a signer.

**Function Signature:**
```solidity
function writeMarket(
    string[] calldata _info,      // [title, subtitle, description, image, tags, optionA, optionB]
    uint256 _marketBalance,       // Amount in wei
    bool _signal,                 // true = Option A, false = Option B
    bool _feetype,                // true = native coin, false = ERC20 token
    address _paymentToken,        // 0x0 for native, token address for ERC20
    uint256 _endTime              // Unix timestamp for market expiration
) external payable nonReentrant
```

### Parameter Details

| Parameter | Index | Description | Requirements |
|-----------|-------|-------------|--------------|
| `_info[0]` | Title | The prediction question | Required |
| `_info[1]` | Subtitle | Succinct appendage to title | Required |
| `_info[2]` | Description | Context about the market | Required |
| `_info[3]` | Image | URL (image/gif/video < 5MB) | Required |
| `_info[4]` | Tags | Up to 7 descriptive tags | Required |
| `_info[5]` | optionA | First choice label | Required |
| `_info[6]` | optionB | Second choice label | Required |
| `_marketBalance` | - | Amount in wei | Must be > 0 |
| `_signal` | - | Creator's initial vote | true=A, false=B |
| `_feetype` | - | Market type | true=ERC20 token, false=native coin |
| `_paymentToken` | - | Token address | 0x0 if native, else valid ERC20 |
| `_endTime` | - | Expiration timestamp | Must be > now + 1 hour |

### Fee Type Logic

**⚠️ CRITICAL: `feetype` interpretation is inverted from intuition:**

```typescript
// TOKEN MARKET (feetype = true)
// - Payment is in ERC20 tokens (requires token approval)
// - Must send msg.value = gasfee for transaction processing
// - _paymentToken must be a valid token address

// NATIVE COIN MARKET (feetype = false)
// - Payment is in native coin (ETH, BNB, MON, etc.)
// - msg.value must be >= _marketBalance (full payment in native coin)
// - No token approval needed
```

**Payment Summary:**
| Market Type | feetype | msg.value | Token Approval |
|-------------|---------|-----------|----------------|
| Native Coin | `false` | Full payment amount | Not needed |
| ERC20 Token | `true` | gasfee only | Required |

**CRITICAL: Token Validation for ERC20 Markets**
```typescript
async function validateToken(
  provider: ethers.Provider,
  tokenAddress: string
): Promise<boolean> {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function symbol() view returns (string)'],
      provider
    );
    const symbol = await tokenContract.symbol();
    return symbol.length > 0; // Valid if returns non-empty string
  } catch {
    return false;
  }
}

// Usage before creating token market
if (!feetype) {
  const isValid = await validateToken(provider, paymentToken);
  if (!isValid) {
    throw new Error('Invalid token address - market creation would fail');
  }
}
```

**Implementation Example - Native Coin Market:**
```typescript
async function createNativeMarket(
  contract: ethers.Contract,
  signer: ethers.Signer
) {
  const marketBalance = ethers.parseEther('0.1'); // 0.1 ETH
  
  const info = [
    "Will ETH reach $10,000 by 2025?",     // title
    "Ethereum Price Prediction",           // subtitle
    "This market predicts whether Ethereum will reach $10,000 USD by end of 2025.", // description
    "https://example.com/image.png",       // image
    "crypto,ethereum,price,prediction,2025", // tags
    "Yes, it will",                       // optionA
    "No, it won't"                        // optionB
  ];
  
  const tx = await contract.writeMarket(
    info,
    marketBalance,
    true,                    // signal: vote for Option A
    false,                   // feetype: false = NATIVE COIN market
    '0x0000000000000000000000000000000000000000', // paymentToken (ignored for native)
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
    { value: marketBalance } // Full payment in native coin
  );
  
  await tx.wait();
  console.log('Native coin market created!');
}
```

**Implementation Example - ERC20 Token Market:**
```typescript
async function createTokenMarket(
  contract: ethers.Contract,
  signer: ethers.Signer,
  tokenAddress: string
) {
  // Validate token first
  const isValid = await validateToken(contract.runner?.provider!, tokenAddress);
  if (!isValid) throw new Error('Invalid token address');
  
  // Get required gas fee
  const [constants] = await contract.fetchDataConstants();
  const gasfee = constants[8];
  
  const marketBalance = ethers.parseUnits('100', 18); // 100 tokens
  
  // Approve token spending first
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ['function approve(address,uint256) returns (bool)'],
    signer
  );
  await (await tokenContract.approve(await contract.getAddress(), marketBalance)).wait();
  
  const info = [
    "Will DAI maintain its peg in 2025?",
    "Stablecoin Stability Prediction",
    "This market predicts whether DAI will maintain its $1.00 peg throughout 2025.",
    "https://example.com/dai.png",
    "defi,stablecoin,dai,prediction,2025",
    "Yes, maintains peg",
    "No, loses peg"
  ];
  
  const tx = await contract.writeMarket(
    info,
    marketBalance,
    false,                   // signal: vote for Option B
    true,                    // feetype: true = TOKEN market
    tokenAddress,            // paymentToken: actual token address
    Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60, // 60 days
    { value: gasfee }        // Only gas fee in native coin
  );
  
  await tx.wait();
  console.log('Token market created!');
}
```

---

## Voting in Markets

The `vote` function allows users to participate in an existing market by voting for either Option A or Option B.

**Function Signature:**
```solidity
function vote(
    bool _signal,         // true = Option A, false = Option B
    uint256 _market,      // Market ID from marketInfo.indexer
    uint256 _marketBalance // Amount in wei
) external payable nonReentrant
```

### Pre-Vote Safety Checks

```typescript
async function validateVote(
  contract: ethers.Contract,
  marketId: number,
  provider: ethers.Provider
): Promise<{ isValid: boolean; isNative: boolean; gasfee: bigint }> {
  // 1. Check market exists (marketId < marketCount)
  const [constants] = await contract.fetchDataConstants();
  const marketCount = constants[0];
  if (marketId >= marketCount) {
    return { isValid: false, isNative: false, gasfee: 0n };
  }
  
  // 2. Check not blacklisted
  const marketData = await contract.allMarketData(marketId);
  if (marketData.blacklist) {
    return { isValid: false, isNative: false, gasfee: 0n };
  }
  
  // 3. Check market not closed
  if (marketData.closed) {
    return { isValid: false, isNative: false, gasfee: 0n };
  }
  
  // 4. Determine payment type via paymentTokens mapping
  const paymentToken = await contract.paymentTokens(marketId);
  const isNative = paymentToken === '0x0000000000000000000000000000000000000000';
  
  // 5. Get required gas fee
  const gasfee = constants[8];
  
  return { isValid: true, isNative, gasfee };
}
```

### Payment Logic

```typescript
// NATIVE COIN MARKET (paymentTokens[market] == 0x0)
// - Payment is in native coin via msg.value
// - msg.value must be >= _marketBalance

// ERC20 TOKEN MARKET (paymentTokens[market] != 0x0)
// - Payment is in the specified ERC20 token
// - Must also send msg.value >= gasfee for transaction processing
// - Token must be approved before calling vote
```

**Implementation Example:**
```typescript
async function castVote(
  contract: ethers.Contract,
  signer: ethers.Signer,
  marketId: number,
  voteForOptionA: boolean,
  amount: bigint
) {
  // Validate market first
  const validation = await validateVote(
    contract,
    marketId,
    contract.runner?.provider!
  );
  
  if (!validation.isValid) {
    throw new Error('Market validation failed - cannot vote');
  }
  
  if (validation.isNative) {
    // NATIVE COIN VOTE (feetype = false)
    const tx = await contract.vote(
      voteForOptionA,    // true = Option A, false = Option B
      marketId,
      amount,
      { value: amount }  // Full amount in native coin
    );
    await tx.wait();
    
  } else {
    // ERC20 TOKEN VOTE (feetype = true)
    const paymentToken = await contract.paymentTokens(marketId);
    
    // Approve token spending first
    const tokenContract = new ethers.Contract(
      paymentToken,
      ['function approve(address,uint256) returns (bool)'],
      signer
    );
    await (await tokenContract.approve(await contract.getAddress(), amount)).wait();
    
    // Cast vote with gas fee in native coin
    const tx = await contract.vote(
      voteForOptionA,
      marketId,
      amount,
      { value: validation.gasfee }  // Only gas fee in native coin
    );
    await tx.wait();
  }
  
  console.log(`Vote cast for Option ${voteForOptionA ? 'A' : 'B'} in market ${marketId}`);
}
```

---

## Claiming Rewards

When a market closes and the winning side is determined, users who voted for the winning side can claim their rewards. The claim process involves querying user positions, filtering for claimable ones, and executing the claim.

### User Positions Query Flow

Before claiming, you must retrieve the user's position IDs for a specific market and determine how many positions exist.

**Step 1: Get User Position Count**
```solidity
mapping(uint256 => mapping(address => uint256)) public userPositionCount;
```

This mapping returns the total number of positions a user has in a specific market.

```typescript
async function getUserPositionCount(
  contract: ethers.Contract,
  marketId: number,
  userAddress: string
): Promise<number> {
  const count = await contract.userPositionCount(marketId, userAddress);
  return Number(count);
}
```

**Step 2: Get User Positions**
```solidity
function getUserPositions(
    uint256 _market,      // Market ID
    address _user,        // User address
    uint256 _start,       // Start index (0-based)
    uint256 _finish       // Number of items to return (count/size)
) external view returns (uint256[] memory)
```

**Important:** `_finish` is the **COUNT of items to return**, NOT an end index. The contract returns `_finish` items starting from `_start`. Query in batches respecting the 200-entry limit.

```typescript
async function getAllUserPositions(
  contract: ethers.Contract,
  marketId: number,
  userAddress: string
): Promise<number[]> {
  // First get total count
  const totalPositions = await getUserPositionCount(contract, marketId, userAddress);
  
  if (totalPositions === 0) return [];
  
  // Query all positions (respecting 200 limit per batch)
  const MAX_BATCH = 200;
  const allPositions: number[] = [];
  
  for (let start = 0; start < totalPositions; start += MAX_BATCH) {
    const finish = Math.min(start + MAX_BATCH, totalPositions);
    // Note: _finish is the absolute index boundary (count up to this number)
    // The contract returns items from _start to _finish (inclusive concept)
    
    const positions = await contract.getUserPositions(
      marketId,
      userAddress,
      start,
      finish  // This is _finish - the boundary index (returns items up to this)
    );
    
    allPositions.push(...positions.map(p => Number(p)));
  }
  
  return allPositions;
}
```

**App Pattern Note:** The app often uses `getUserPositionsInRange()` as an alias or helper that mirrors this pattern.

### isClaimable - Filter Valid Claims

The `isClaimable` function filters a user's positions to return only those that are eligible for claiming rewards (winning side, not already claimed, user-owned).

**Function Signature:**
```solidity
function isClaimable(
    address _user,              // User address
    uint256 _market,            // Market ID
    uint256[] calldata _posIds  // Position IDs to check
) public view returns (uint256[] memory)
```

**Claim Requirements (enforced by function):**
- Position belongs to the user (`p.user == _user`)
- Position has not been claimed (`!p.claimed`)
- Position is on the winning side (`p.side == m.winningSide`)
- Market is closed and shares are finalized (checked by batchClaim)
- Market is not blacklisted

```typescript
async function getClaimablePositions(
  contract: ethers.Contract,
  marketId: number,
  userAddress: string
): Promise<number[]> {
  // First get all user positions
  const allPositions = await getAllUserPositions(contract, marketId, userAddress);
  
  if (allPositions.length === 0) return [];
  
  // Filter in batches of 200
  const claimablePositions: number[] = [];
  
  await batchProcess(allPositions, async (batch) => {
    const claimable = await contract.isClaimable(userAddress, marketId, batch);
    claimablePositions.push(...claimable.map(p => Number(p)));
  });
  
  return claimablePositions;
}
```

**App Pattern Note:** The app often wraps this in a `getClaimablePositions()` helper function for cleaner UX integration.

### batchClaim - Claim Winnings

The `batchClaim` function processes claims for multiple positions in a single transaction. It calculates shares-based rewards and transfers the payout (principal + profit share) to the user.

**Function Signature:**
```solidity
function batchClaim(
    uint256 _market,            // Market ID
    uint256[] calldata _posIds  // Valid position IDs to claim
) external nonReentrant
```

**Prerequisites:**
- Market must be closed (`m.closed == true`)
- Market shares must be finalized (`k.sharesFinalized == true`)
- Market must not be blacklisted
- Positions must be valid (checked internally - skips invalid ones gracefully)

**Reward Calculation:**
```
payout = principal_amount + profitShare
profitShare = (loserPool * userShares) / totalWinningShares
loserPool = marketBalance - totalWinningPrincipal
```

**Complete Claim Workflow:**
```typescript
async function claimRewards(
  contract: ethers.Contract,
  signer: ethers.Signer,
  marketId: number
) {
  const userAddress = await signer.getAddress();
  
  // Step 1: Verify market is claimable
  const marketData = await contract.allMarketData(marketId);
  
  if (marketData.blacklist) {
    throw new Error('Market is blacklisted');
  }
  
  if (!marketData.closed) {
    throw new Error('Market is not yet closed');
  }
  
  // Step 2: Check market lock for finalization status
  const marketLock = await contract.allMarketLocks(marketId);
  if (!marketLock.sharesFinalized) {
    throw new Error('Market shares not yet finalized');
  }
  
  // Step 3: Get claimable positions via isClaimable helper
  const claimablePositions = await getClaimablePositions(contract, marketId, userAddress);
  
  if (claimablePositions.length === 0) {
    console.log('No claimable positions found');
    return;
  }
  
  console.log(`Found ${claimablePositions.length} claimable positions`);
  
  // Step 4: Execute batch claim (respect 200 limit)
  await batchProcess(claimablePositions, async (batch) => {
    const tx = await contract.connect(signer).batchClaim(marketId, batch);
    await tx.wait();
    console.log(`Claimed batch of ${batch.length} positions`);
  });
  
  console.log('All rewards claimed successfully!');
}
```

**Key Mappings for Claims:**
```solidity
// Check if market shares are finalized
mapping(uint256 => MarketLock) public allMarketLocks;
// Returns: { uint256 finalizedUpTo; bool sharesFinalized; }

// Read individual position details
mapping(uint256 => mapping(uint256 => Position)) public positions;
// Returns: { address user; Side side; uint256 amount; uint256 timestamp; bool claimed; bool kamikazed; }
```

---

## Kamikaze Operations

Kamikaze is an emergency mechanism allowing users to switch their position to the opposite side at a 50% capital penalty. This is a last resort for users who believe they voted for the losing side.

### kamikaze - Emergency Position Switch

**Function Signature:**
```solidity
function kamikaze(
    uint256 _market,    // Market ID
    uint256 _posId      // Position ID to kamikaze
) public nonReentrant
```

**What Happens:**
1. **50% Capital Burn**: `burned = position.amount * 5000 / 10000` (50%)
2. **Remaining Capital**: 50% stays in the position
3. **Side Switch**: Position flips from A→B or B→A
4. **Timestamp Reset**: Position gets new timestamp (affects share calculation)
5. **Kamikaze Flag**: Position marked as `kamikazed = true`

**Requirements:**
- Market not blacklisted
- Market not closed
- Caller owns the position
- Position not already claimed

```typescript
async function executeKamikaze(
  contract: ethers.Contract,
  signer: ethers.Signer,
  marketId: number,
  positionId: number
) {
  // Safety checks
  const marketData = await contract.allMarketData(marketId);
  
  if (marketData.blacklist) {
    throw new Error('Market is blacklisted');
  }
  
  if (marketData.closed) {
    throw new Error('Market is already closed');
  }
  
  // Verify position ownership
  const position = await contract.positions(marketId, positionId);
  const userAddress = await signer.getAddress();
  
  if (position.user.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error('Not your position');
  }
  
  if (position.claimed) {
    throw new Error('Position already claimed');
  }
  
  // Execute kamikaze
  const tx = await contract.connect(signer).kamikaze(marketId, positionId);
  await tx.wait();
  
  console.log(`Position ${positionId} kamikazed! 50% penalty applied, side switched.`);
}
```

### batchKamikaze - Multiple Position Switch

**Function Signature:**
```solidity
function batchKamikaze(
    uint256 _market,              // Market ID
    uint256[] calldata _posIds    // Array of position IDs
) external
```

**Batch Processing:** Iterates through positions and calls `kamikaze()` on each. Each position incurs a 50% penalty independently.

```typescript
async function batchExecuteKamikaze(
  contract: ethers.Contract,
  signer: ethers.Signer,
  marketId: number,
  positionIds: number[]
) {
  if (positionIds.length === 0) return;
  
  // Respect 200 entry limit
  await batchProcess(positionIds, async (batch) => {
    const tx = await contract.connect(signer).batchKamikaze(marketId, batch);
    await tx.wait();
    console.log(`Kamikazed batch of ${batch.length} positions`);
  });
}
```

**⚠️ Warning:** Kamikaze permanently burns 50% of the position's capital. Use only when confident the current side will lose.

---

## User Data Queries

These functions allow querying a user's historical activity across the platform.

### getUserThots - Markets Created

Returns the list of market IDs created by a user.

**Mapping:**
```solidity
mapping(address => uint256) public userTotalThots;
function getUserThots(
    address _user,        // User address
    uint256 _start,       // Start index
    uint256 _finish       // Count to return
) external view returns (uint256[] memory)
```

```typescript
async function getMarketsCreatedByUser(
  contract: ethers.Contract,
  userAddress: string
): Promise<number[]> {
  // Get total count
  const totalThots = await contract.userTotalThots(userAddress);
  
  if (totalThots === 0n) return [];
  
  // Query all (respecting 200 limit per batch)
  const allThots: number[] = [];
  const total = Number(totalThots);
  
  for (let start = 0; start < total; start += 200) {
    const batchSize = Math.min(200, total - start);
    const thots = await contract.getUserThots(userAddress, start, batchSize);
    allThots.push(...thots.map(t => Number(t)));
  }
  
  return allThots.filter(id => id !== 0); // Filter out invalid entries
}
```

### getUserMarkets - Markets Voted

Returns the list of market IDs where the user has voted (participated).

**Mapping:**
```solidity
mapping(address => uint256) public userTotalMarkets;
function getUserMarkets(
    address _user,        // User address
    uint256 _start,       // Start index
    uint256 _finish       // Count to return
) external view returns (uint256[] memory)
```

```typescript
async function getMarketsVotedByUser(
  contract: ethers.Contract,
  userAddress: string
): Promise<number[]> {
  const totalMarkets = await contract.userTotalMarkets(userAddress);
  
  if (totalMarkets === 0n) return [];
  
  const allMarkets: number[] = [];
  const total = Number(totalMarkets);
  
  for (let start = 0; start < total; start += 200) {
    const batchSize = Math.min(200, total - start);
    const markets = await contract.getUserMarkets(userAddress, start, batchSize);
    allMarkets.push(...markets.map(m => Number(m)));
  }
  
  return allMarkets.filter(id => id !== 0);
}
```

### getUserClaims - Claim History

Returns detailed claim history for a user.

**Structs and Mappings:**
```solidity
struct ClaimRecord {
    uint256 marketId;
    address token;
    uint256 amount;
    uint256 timestamp;
    uint256 positionId;
}

mapping(address => uint256) public userTotalClaimHistory;
function getUserClaims(
    address _user,        // User address
    uint256 _start,       // Start index
    uint256 _finish       // Count to return
) external view returns (ClaimRecord[] memory)
```

```typescript
interface ClaimRecord {
  marketId: number;
  token: string;
  amount: bigint;
  timestamp: number;
  positionId: number;
}

async function getUserClaimHistory(
  contract: ethers.Contract,
  userAddress: string
): Promise<ClaimRecord[]> {
  const totalClaims = await contract.userTotalClaimHistory(userAddress);
  
  if (totalClaims === 0n) return [];
  
  const allClaims: ClaimRecord[] = [];
  const total = Number(totalClaims);
  
  for (let start = 0; start < total; start += 200) {
    const batchSize = Math.min(200, total - start);
    const claims = await contract.getUserClaims(userAddress, start, batchSize);
    
    allClaims.push(...claims.map(c => ({
      marketId: Number(c.marketId),
      token: c.token,
      amount: c.amount,
      timestamp: Number(c.timestamp),
      positionId: Number(c.positionId)
    })));
  }
  
  return allClaims;
}
```

---

## Contract ABI Reference

```json
[
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_dAI",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_pennyDAO",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "target",
				"type": "address"
			}
		],
		"name": "AddressEmptyCode",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "AddressInsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "FailedInnerCall",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "SafeERC20FailedOperation",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "marketId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "CapitalRescued",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "marketId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "positionId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Claimed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "marketId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "paymentToken",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "ProofOfMarket",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "AllowedAmounts",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "AllowedCrypto",
		"outputs": [
			{
				"internalType": "contract IERC20",
				"name": "paytoken",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "AllowedFarms",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "Author",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "BPS",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "DECAY_PROFIT_BPS",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "DECAY_WINDOW_BPS",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "KAMIKAZE_BURN_BPS",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_FINALIZE_BATCH",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "TotalClaimsDistributed",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "TotalKamikazeBurns",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "TotalPromoBurns",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "TotalPromoPaid",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "TotalPromoReserved",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "TotalPromoStaked",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "contract IERC20",
				"name": "_paytoken",
				"type": "address"
			}
		],
		"name": "addCurrency",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "_ids",
				"type": "uint256[]"
			}
		],
		"name": "addToBlacklist",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "adjudicators",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "allMarketData",
		"outputs": [
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "marketBalance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "activity",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "aVotes",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "bVotes",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "startTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "closed",
				"type": "bool"
			},
			{
				"internalType": "enum Penny4Thots.Side",
				"name": "winningSide",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "totalSharesA",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalSharesB",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalWinningPrincipal",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "positionCount",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "blacklist",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "allMarketLocks",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "finalizedUpTo",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "sharesFinalized",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "allMarketVolume",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "uint256[]",
				"name": "_posIds",
				"type": "uint256[]"
			}
		],
		"name": "batchClaim",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "uint256[]",
				"name": "_posIds",
				"type": "uint256[]"
			}
		],
		"name": "batchKamikaze",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "bobbAddress",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "bobbtax",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_posId",
				"type": "uint256"
			}
		],
		"name": "claim",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "_signalWinner",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "_presidingJudges",
				"type": "string"
			}
		],
		"name": "closeMarket",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "createtax",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "devtax",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "farmTokensDistributed",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "fetchDataConstants",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "result",
				"type": "uint256[]"
			},
			{
				"internalType": "bool[]",
				"name": "result2",
				"type": "bool[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			}
		],
		"name": "finalizeShares",
		"outputs": [
			{
				"internalType": "bool",
				"name": "done",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "remaining",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "nextBatchSize",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "gasfee",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_finish",
				"type": "uint256"
			}
		],
		"name": "getUserClaims",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "marketId",
						"type": "uint256"
					},
					{
						"internalType": "address",
						"name": "token",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "positionId",
						"type": "uint256"
					}
				],
				"internalType": "struct Penny4Thots.ClaimRecord[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_finish",
				"type": "uint256"
			}
		],
		"name": "getUserMarkets",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_finish",
				"type": "uint256"
			}
		],
		"name": "getUserPositions",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_finish",
				"type": "uint256"
			}
		],
		"name": "getUserThots",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "uint256[]",
				"name": "_posIds",
				"type": "uint256[]"
			}
		],
		"name": "isClaimable",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_posId",
				"type": "uint256"
			}
		],
		"name": "kamikaze",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lasttax",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "marketCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "marketTokenClaims",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "paused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "payId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "paymentTokens",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pennyDAO",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "permittedFarms",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "platformFee",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "positions",
		"outputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "enum Penny4Thots.Side",
				"name": "side",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "claimed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "kamikazed",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "_ids",
				"type": "uint256[]"
			}
		],
		"name": "readMarket",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "indexer",
						"type": "uint256"
					},
					{
						"internalType": "string",
						"name": "title",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "subtitle",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "description",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "image",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "tags",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "optionA",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "optionB",
						"type": "string"
					},
					{
						"internalType": "bool",
						"name": "feetype",
						"type": "bool"
					}
				],
				"internalType": "struct Penny4Thots.MarketInfo[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "_ids",
				"type": "uint256[]"
			}
		],
		"name": "readMarketData",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "creator",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "marketBalance",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "activity",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "aVotes",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "bVotes",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "startTime",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "endTime",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "closed",
						"type": "bool"
					},
					{
						"internalType": "enum Penny4Thots.Side",
						"name": "winningSide",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "totalSharesA",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "totalSharesB",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "totalWinningPrincipal",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "positionCount",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "blacklist",
						"type": "bool"
					}
				],
				"internalType": "struct Penny4Thots.MarketData[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "_ids",
				"type": "uint256[]"
			}
		],
		"name": "removeFromBlacklist",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			}
		],
		"name": "rescueLostCapital",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_bobbAddress",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_stakeAddress",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_devAddress",
				"type": "address"
			}
		],
		"name": "setAddresses",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_dAI",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_pennyDAO",
				"type": "address"
			}
		],
		"name": "setDAOs",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "_allowedFarms",
				"type": "address[]"
			},
			{
				"internalType": "uint256[]",
				"name": "_farmingAmounts",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "_permittedFarms",
				"type": "uint256[]"
			}
		],
		"name": "setFarmYield",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_feeInWei",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_payId",
				"type": "uint256"
			},
			{
				"internalType": "uint256[]",
				"name": "_taxes",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "_decay",
				"type": "uint256[]"
			}
		],
		"name": "setValues",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "stakeAddress",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "staketax",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "totalClaimedSoFar",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "totalProfit",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userClaimHistory",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "marketId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "positionId",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userMarketTokenClaims",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userMarkets",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userPositionCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userPositions",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userThots",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userTokenClaims",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userTotalClaimHistory",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userTotalMarkets",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userTotalThots",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bool",
				"name": "_signal",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "_market",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_marketBalance",
				"type": "uint256"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string[]",
				"name": "_info",
				"type": "string[]"
			},
			{
				"internalType": "uint256",
				"name": "_marketBalance",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "_signal",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "_feetype",
				"type": "bool"
			},
			{
				"internalType": "address",
				"name": "_paymentToken",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_endTime",
				"type": "uint256"
			}
		],
		"name": "writeMarket",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	}
  ]
```

---

## Quick Reference Checklist

Before any operation:
- [ ] Verify network RPC is accessible
- [ ] Confirm contract address for target network
- [ ] Check if contract is paused via `fetchDataConstants()`
- [ ] For market-specific operations: verify `!blacklist` via `allMarketData(marketId)`
- [ ] Respect 200 entry limit for all array inputs
- [ ] For native markets: ensure sufficient native coin balance
- [ ] For token markets: ensure token approval + gas fee in native coin

---

*Contract: Penny4Thots Shares System*
*Co-Developed with OpenAI GPT-5.0/GPT-4.0, Re-Designed by Grok*
*License: MIT*
