import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient, getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { ConnectButton, darkTheme, useSendTransaction } from "thirdweb/react";
import { defineChain, sepolia } from "thirdweb/chains";
import { createPublicClient, http, formatEther, parseEther, type Address, type Abi } from "viem";
import { sepolia as viemSepolia } from "viem/chains";
import { ReactElement } from "react";
import penny4thots from "../abi/penny4thots.json";
import erc20 from "../abi/ERC20.json";

const contractABI = penny4thots.abi as Abi;
const erc20ABI = erc20.abi as Abi;

// ============================================================================
// ERC20 Token Functions (for token-based voting)
// ============================================================================

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

// ============================================================================
// Types
// ============================================================================

export enum Side {
  None = 0,
  A = 1,
  B = 2,
}

export interface MarketInfo {
  indexer: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string;
  optionA: string;
  optionB: string;
  feetype: boolean;
}

export interface MarketData {
  creator: Address;
  status: boolean;
  marketBalance: bigint;
  activity: bigint;
  aVotes: bigint;
  bVotes: bigint;
  // === Shares system ===
  startTime: bigint;
  endTime: bigint;
  closed: boolean;
  winningSide: Side;
  totalSharesA: bigint;
  totalSharesB: bigint;
  positionCount: bigint;
}

export interface MarketInfoFormatted {
  indexer: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string[];
  optionA: string;
  optionB: string;
  feetype: boolean;
}

export interface MarketDataFormatted {
  indexer: number;
  creator: string;
  status: boolean;
  marketBalance: string;
  activity: string;
  aVotes: number;
  bVotes: number;
  // === Shares system ===
  startTime: number;
  endTime: number;
  closed: boolean;
  winningSide: Side;
  totalSharesA: string;
  totalSharesB: string;
  positionCount: number;
}

export interface MarketCombined extends MarketInfoFormatted, MarketDataFormatted {}

export interface WriteMarketParams {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string;
  optionA?: string;
  optionB?: string;
  marketBalance: bigint;
  feetype?: boolean;
  paymentToken?: Address;
  fee: bigint;
  signal?: boolean;
  endTime?: number; // Unix timestamp in seconds, 0 for no timer
}

// ============================================================================
// Thirdweb wallet connect
// ============================================================================

export const client = createThirdwebClient({
  clientId: 'ddddd23bccaca244c84bd1a746e4c1b2',
});

export const wallets = [
  createWallet("com.binance.wallet"),
  createWallet("com.coinbase.wallet"),
  walletConnect(),
  inAppWallet({
    auth: {
      options: [
        "google",
        "x",
        "telegram",
        "facebook",
        "discord",
        "apple",
        "farcaster",
        "phone",
        "email",
      ],
      mode: "popup",
    },
  }),
];

// ============================================================================
// Blockchain Configuration
// ============================================================================

export const blockchain = {
  chainId: 11155111,
  rpc: 'https://0xrpc.io/sep',
  blockExplorer: 'https://sepolia.etherscan.io',
  decimals: 18,
  contract_address: '0x642021aF461DbEa43b7BD5dEa4423ECC608ef27E' as Address,
  symbol: 'sETH',
};

export const network = defineChain({ id: blockchain.chainId, rpc: blockchain.rpc });

// Viem public client for read operations
export const publicClient = createPublicClient({
  chain: viemSepolia,
  transport: http(blockchain.rpc),
});

// Thirdweb contract for write operations (no ABI needed when using method signature strings)
export const penny4thotsContract = getContract({
  client,
  chain: sepolia,
  address: blockchain.contract_address,
});

// ============================================================================
// Connector Component
// ============================================================================

export function Connector(): ReactElement {
  return (
    <ConnectButton
      client={client}
      chain={network}
      wallets={wallets}
      theme={darkTheme({
        colors: {
          primaryText: "#7FFF00",
          secondaryText: "#FFF8DC",
          connectedButtonBg: "#252525",
          connectedButtonBgHover: "#161616",
          separatorLine: "#262830",
          primaryButtonBg: "#7FFF00",
        },
      })}
      connectButton={{ label: "Get Started" }}
      connectModal={{
        size: "wide",
        title: "Connect to Penny4Thots",
        titleIcon: "/logo-white-no-bkg.webp",
        welcomeScreen: {
          title: "Penny4Thots Prediction Markets",
          subtitle: "...if you can think it, it's important.",
          img: {
            src: '/logo-white-no-bkg.webp',
            width: 200,
            height: 200,
          },
        },
      }}
    />
  );
}

// ============================================================================
// Read Calls (using viem)
// ============================================================================

export const readMarketInfo = async (ids: number[]): Promise<MarketInfoFormatted[]> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'readMarket',
    args: [ids],
  });

  const marketInfoArray = result as MarketInfo[];

  return marketInfoArray.map((marketInfo) => ({
    indexer: Number(marketInfo.indexer),
    title: marketInfo.title,
    subtitle: marketInfo.subtitle,
    description: marketInfo.description,
    image: marketInfo.image,
    tags: parseTags(marketInfo.tags),
    optionA: marketInfo.optionA,
    optionB: marketInfo.optionB,
    feetype: marketInfo.feetype,
  }));
};

export const readMarketData = async (ids: number[]): Promise<MarketDataFormatted[]> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'readMarketData',
    args: [ids],
  });

  const marketDataArray = result as MarketData[];

  return marketDataArray.map((marketData) => ({
    indexer: 0, // Will be filled from context
    creator: marketData.creator,
    status: marketData.status,
    marketBalance: formatEther(marketData.marketBalance),
    activity: formatEther(marketData.activity),
    aVotes: Number(marketData.aVotes),
    bVotes: Number(marketData.bVotes),
    // === Shares system ===
    startTime: Number(marketData.startTime),
    endTime: Number(marketData.endTime),
    closed: marketData.closed,
    winningSide: marketData.winningSide as Side,
    totalSharesA: formatEther(marketData.totalSharesA),
    totalSharesB: formatEther(marketData.totalSharesB),
    positionCount: Number(marketData.positionCount),
  }));
};

export const readMarketCount = async (): Promise<number> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'marketCount',
  }) as number;

  return Number(result);
};


export const readPaymentToken = async (marketId: number): Promise<Address> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'paymentTokens',
    args: [marketId],
  }) as Address;

  return result;
};

export interface DataConstants {
  marketCount: number;
  payId: number;
  platformFee: number;
  deadtax: number;
  bobbtax: number;
  staketax: number;
  lasttax: number;
  devtax: number;
  gasfee: number;
  bps: number;
  decayWindowBps: number;
  decayProfitBps: number;
  kamikazeBurnBps: number;
  maxFinalizeBatch: number;
  paused: boolean;
}

export const fetchDataConstants = async (): Promise<DataConstants> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'fetchDataConstants',
  }) as [bigint[], boolean[]];

  const [uintValues, boolValues] = result;

  return {
    marketCount: Number(uintValues[0]),
    payId: Number(uintValues[1]),
    platformFee: Number(uintValues[2]),
    deadtax: Number(uintValues[3]),
    bobbtax: Number(uintValues[4]),
    staketax: Number(uintValues[5]),
    lasttax: Number(uintValues[6]),
    devtax: Number(uintValues[7]),
    gasfee: Number(uintValues[8]),
    bps: Number(uintValues[9]),
    decayWindowBps: Number(uintValues[10]),
    decayProfitBps: Number(uintValues[11]),
    kamikazeBurnBps: Number(uintValues[12]),
    maxFinalizeBatch: Number(uintValues[13]),
    paused: boolValues[0],
  };
};

/**
 * Calculate platform fee as a percentage
 * platformFee divides 1%, so if platformFee is 5, the fee is 1% / 5 = 0.20%
 */
export const calculatePlatformFeePercentage = (platformFee: number): number => {
  if (platformFee === 0) return 0;
  return 1 / platformFee;
};

// Range limit for fetching markets from blockchain
const MARKET_FETCH_LIMIT = 50;

/**
 * Fetch markets from blockchain with a limit of 50 most recent markets
 * Markets are fetched in descending order (newest first)
 * Only fetches MarketInfo (immutable data)
 *
 * @param additionalMarketIds - Optional array of market IDs to include even if outside the 50 most recent
 */
export const fetchMarketsFromBlockchain = async (additionalMarketIds?: number[]): Promise<MarketInfoFormatted[]> => {
  const marketCount = await readMarketCount();

  // No markets
  if (marketCount === 0) {
    return [];
  }

  // Highest valid ID
  const startIndex = marketCount - 1;

  // Lower bound, respecting limit
  const endIndex = Math.max(0, startIndex - MARKET_FETCH_LIMIT + 1);

  const marketIds: number[] = [];
  for (let i = startIndex; i >= endIndex; i--) {
    marketIds.push(i);
  }

  // Include additional market IDs (e.g., from deep links) if not already in the range
  if (additionalMarketIds && additionalMarketIds.length > 0) {
    for (const additionalId of additionalMarketIds) {
      // Only add if valid and not already in the list
      if (additionalId >= 0 && additionalId < marketCount && !marketIds.includes(additionalId)) {
        marketIds.push(additionalId);
      }
    }
  }

  const markets = await readMarketInfo(marketIds);
  return markets;
};

/**
 * Fetch market data from blockchain for given IDs
 * Only fetches MarketData (volatile/changing data)
 */
export const fetchMarketDataFromBlockchain = async (ids: number[]): Promise<MarketDataFormatted[]> => {
  if (ids.length === 0) return [];
  const marketData = await readMarketData(ids);
  return marketData;
};


// ============================================================================
// Write Calls (using thirdweb)
// ============================================================================

export const prepareWriteMarket = (params: WriteMarketParams) => {
  const infoArray = [
    params.title,
    params.subtitle,
    params.description,
    params.image,
    params.tags,
    params.optionA || "Yes",
    params.optionB || "No",
  ];

  const feetype = params.feetype || false;
  const signal = params.signal || false; // true for token payment, false for ETH
  const endTime = BigInt(params.endTime || 0); // Unix timestamp, 0 for no timer

  // Determine the correct payment token address
  // Use the provided paymentToken, which should be set correctly by the caller
  const paymentTokenAddress: Address = params.paymentToken || ("0x0000000000000000000000000000000000000000" as Address);

  return prepareContractCall({
    contract: penny4thotsContract,
    method: "function writeMarket(string[] calldata _info, uint256 _marketBalance, bool _signal, bool _feetype, address _paymentToken, uint256 _endTime) external payable",
    params: [
      infoArray,
      params.marketBalance,
      signal, // _signal - true if token payment, false if ETH payment
      feetype,
      paymentTokenAddress,
      endTime, // Unix timestamp for market end time
    ],
  });
};

// Hook helper for write transactions
export const useWriteMarket = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const writeMarket = async (params: WriteMarketParams) => {
    const dataConstants = await fetchDataConstants();
    const gasfee = BigInt(dataConstants.gasfee);

    const transaction = {
      ...prepareWriteMarket(params),
      value: (params.signal || false) ? gasfee : params.marketBalance,
    };
    const result = await sendTx(transaction);

    // Wait for transaction to be mined/confirmed before returning
    // This ensures the new market is written to the blockchain before we fetch updated data
    await waitForReceipt({
      client,
      chain: sepolia,
      transactionHash: result.transactionHash,
    });

    return result;
  };

  return { writeMarket, isPending, error };
};

export interface VoteParams {
  marketId: number;
  signal: boolean; // true for YES, false for NO
  marketBalance: bigint;
  feetype: boolean;
  paymentToken: Address;
}

export const prepareVote = (params: VoteParams) => {
  return prepareContractCall({
    contract: penny4thotsContract,
    method: "function vote(bool _signal, uint256 _market, uint256 _marketBalance) external payable",
    params: [params.signal, BigInt(params.marketId), params.marketBalance],
  });
};

export const useVote = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const vote = async (params: VoteParams) => {
    const dataConstants = await fetchDataConstants();
    const gasfee = BigInt(dataConstants.gasfee);

    const transaction = {
      ...prepareVote(params),
      value: params.feetype ? gasfee : params.marketBalance,
    };
    const result = await sendTx(transaction);

    await waitForReceipt({
      client,
      chain: sepolia,
      transactionHash: result.transactionHash,
    });

    return result;
  };

  return { vote, isPending, error };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse comma-delimited tags string from blockchain into array
 * Tags are stored on-chain as "tag1,tag2,tag3" and need to be split
 */
export const parseTags = (tagsString: string): string[] => {
  if (!tagsString || tagsString.trim() === '') return [];
  return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
};

/**
 * Serialize tags array to comma-delimited string for blockchain storage
 * Max 7 tags allowed
 */
export const serializeTags = (tags: string[]): string => {
  return tags.slice(0, 7).join(',');
};

/**
 * Convert any ETH amount (string or number) to wei (bigint)
 * Handles both decimal and whole numbers
 * @param amount - ETH amount as string or number (e.g., "0.01", 1, "1.5")
 * @returns bigint in wei
 */
export const toWei = (amount: string | number): bigint => {
  return parseEther(String(amount));
};

export const randomShuffle = (max: number): number => {
  return Math.floor(Math.random() * max);
};

export function fisherYatesShuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const copyClipboard = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};

export const truncateAddress = (address: string | null | undefined): string => {
  if (!address) return "No Account";
  const match = address.match(
    /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
  );
  if (!match) return address;
  return `${match[1]} ... ${match[2]}`;
};

export const formatNumber = (number: number | null | undefined): string => {
  if (!number) return "0";
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return formatter.format(number);
};

export const removeThousands = (value: string): string => {
  const cleanedValue = value.replace(/,/g, '');
  const integerPart = cleanedValue.split('.')[0];
  return integerPart;
};

export function normalizeNumberString(n: string | number): string {
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 18,
    useGrouping: false
  });
}

/**
 * Check if a token address is the zero address (indicating ETH payment)
 */
export const isZeroAddress = (address: Address): boolean => {
  return address === ZERO_ADDRESS;
};

/**
 * Read the current allowance for a spender on a token
 */
export const readTokenAllowance = async (
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address
): Promise<bigint> => {
  const result = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "allowance",
    args: [ownerAddress, spenderAddress],
  });

  return result as bigint;
};

/**
 * Read the token balance for an address
 */
export const readTokenBalance = async (
  tokenAddress: Address,
  ownerAddress: Address
): Promise<bigint> => {
  const result = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [ownerAddress],
  });

  return result as bigint;
};

/**
 * Prepare an ERC20 approve transaction
 */
export const prepareTokenApprove = (tokenAddress: Address, amount: bigint) => {
  const tokenContract = getContract({
    client,
    chain: sepolia,
    address: tokenAddress,
  });

  return prepareContractCall({
    contract: tokenContract,
    method: "function approve(address spender, uint256 amount) external returns (bool)",
    params: [blockchain.contract_address, amount],
  });
};

/**
 * Hook for approving token spending
 */
export const useTokenApprove = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const approve = async (tokenAddress: Address, amount: bigint) => {
    const transaction = prepareTokenApprove(tokenAddress, amount);
    const result = await sendTx(transaction);

    await waitForReceipt({
      client,
      chain: sepolia,
      transactionHash: result.transactionHash,
    });

    return result;
  };

  return { approve, isPending, error };
};

// ============================================================================
// User Profile Functions (for My Thots, Your Thots, History pages)
// ============================================================================

/**
 * Get user's created thots (markets they created)
 * Returns array of market IDs
 */
export const getUserThots = async (userAddress: Address, start: number, finish: number): Promise<number[]> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'getUserThots',
    args: [userAddress, BigInt(start), BigInt(finish)],
  });

  return (result as bigint[]).map((id) => Number(id));
};

/**
 * Get user's voted markets (markets they participated in)
 * Returns array of market IDs
 */
export const getUserMarkets = async (userAddress: Address, start: number, finish: number): Promise<number[]> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'getUserMarkets',
    args: [userAddress, BigInt(start), BigInt(finish)],
  });

  return (result as bigint[]).map((id) => Number(id));
};

/**
 * ClaimRecord structure from the contract
 */
export interface ClaimRecord {
  marketId: number;
  token: Address;
  amount: string;
  timestamp: number;
  positionId: number;
}

/**
 * Get the total count of user's claim history
 */
export const getUserTotalClaimHistory = async (userAddress: Address): Promise<number> => {
  try {
    const result = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'userTotalClaimHistory',
      args: [userAddress],
    });
    return Number(result);
  } catch {
    return 0;
  }
};

/**
 * Get user's claims in a paginated way using getUserClaims(address, start, finish)
 * Returns array of ClaimRecord for the specified range
 */
export const getUserClaims = async (
  userAddress: Address,
  start: number,
  finish: number
): Promise<ClaimRecord[]> => {
  if (start >= finish) return [];

  try {
    const result = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'getUserClaims',
      args: [userAddress, BigInt(start), BigInt(finish)],
    });

    const rawClaims = result as Array<{
      marketId: bigint;
      token: Address;
      amount: bigint;
      timestamp: bigint;
      positionId: bigint;
    }>;

    return rawClaims
      .map((claim) => ({
        marketId: Number(claim.marketId),
        token: claim.token,
        amount: formatEther(claim.amount),
        timestamp: Number(claim.timestamp),
        positionId: Number(claim.positionId),
      }))
      .filter((claim) => claim.timestamp > 0); // Filter out empty records
  } catch (err) {
    console.error('Error fetching user claims:', err);
    return [];
  }
};

/**
 * Get user's claim history (convenience function that fetches all claims)
 * Returns array of ClaimRecord in reverse order (newest first)
 */
export const getUserClaimHistory = async (userAddress: Address): Promise<ClaimRecord[]> => {
  const total = await getUserTotalClaimHistory(userAddress);
  if (total === 0) return [];

  // Fetch all claims in one batch call
  const claims = await getUserClaims(userAddress, 0, total);

  // Return in reverse order (newest first)
  return claims.reverse();
};

/**
 * Get the count of user's thots (created markets)
 */
export const getUserTotalThots = async (userAddress: Address): Promise<number> => {
  try {
    const result = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'userTotalThots',
      args: [userAddress],
    });
    return Number(result);
  } catch {
    return 0;
  }
};

/**
 * Get the count of user's voted markets
 */
export const getUserTotalMarkets = async (userAddress: Address): Promise<number> => {
  try {
    const result = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'userTotalMarkets',
      args: [userAddress],
    });
    return Number(result);
  } catch {
    return 0;
  }
};

/**
 * Check which positions are claimable for a user in a market
 * Returns array of position IDs that have winning positions (can be claimed)
 * If returned array is empty, user has no claimable positions in that market
 */
export const getClaimablePositions = async (marketId: number, positionIds: number[]): Promise<number[]> => {
  if (positionIds.length === 0) return [];

  try {
    const result = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'isClaimable',
      args: [BigInt(marketId), positionIds.map(id => BigInt(id))],
    });
    return (result as bigint[]).map(id => Number(id));
  } catch (err) {
    console.error('Error checking claimable positions:', err);
    return [];
  }
};

// ============================================================================
// User Position Functions (for claiming)
// ============================================================================

const POSITION_FETCH_LIMIT = 200;

/**
 * Get the count of user's positions in a specific market
 */
export const getUserPositionCount = async (marketId: number, userAddress: Address): Promise<number> => {
  try {
    const result = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'userPositionCount',
      args: [BigInt(marketId), userAddress],
    });
    return Number(result);
  } catch (err) {
    console.error('Error fetching user position count:', err);
    return 0;
  }
};

/**
 * Get user's positions in a market for a given range
 * Returns array of position IDs
 */
export const getUserPositionsInRange = async (
  marketId: number,
  userAddress: Address,
  start: number,
  finish: number
): Promise<number[]> => {
  if (start >= finish) return [];

  try {
    const result = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'getUserPositions',
      args: [BigInt(marketId), userAddress, BigInt(start), BigInt(finish)],
    });

    return (result as bigint[]).map((id) => Number(id));
  } catch (err) {
    console.error('Error fetching user positions:', err);
    return [];
  }
};

/**
 * Delay utility for rate-limiting blockchain calls
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get all user positions in a market with pagination
 * Uses 200 position limit per call with 3 second delay between calls for large datasets
 */
export const getAllUserPositions = async (
  marketId: number,
  userAddress: Address
): Promise<number[]> => {
  const positionCount = await getUserPositionCount(marketId, userAddress);

  if (positionCount === 0) return [];

  const allPositions: number[] = [];
  const callsRequired = Math.ceil(positionCount / POSITION_FETCH_LIMIT);

  for (let i = 0; i < callsRequired; i++) {
    const start = i * POSITION_FETCH_LIMIT;
    const finish = Math.min(start + POSITION_FETCH_LIMIT, positionCount);

    const positions = await getUserPositionsInRange(marketId, userAddress, start, finish);
    allPositions.push(...positions);

    // Add 3 second delay between calls if there are more calls to make
    if (i < callsRequired - 1) {
      await delay(3000);
    }
  }

  return allPositions;
};

// ============================================================================
// Batch Claim Functions
// ============================================================================

export interface BatchClaimParams {
  marketId: number;
  positionIds: number[];
}

export const prepareBatchClaim = (params: BatchClaimParams) => {
  return prepareContractCall({
    contract: penny4thotsContract,
    method: "function batchClaim(uint256 _market, uint256[] calldata _posIds) external",
    params: [BigInt(params.marketId), params.positionIds.map(id => BigInt(id))],
  });
};

export const useBatchClaim = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const batchClaim = async (params: BatchClaimParams) => {
    const transaction = prepareBatchClaim(params);
    const result = await sendTx(transaction);

    await waitForReceipt({
      client,
      chain: sepolia,
      transactionHash: result.transactionHash,
    });

    return result;
  };

  return { batchClaim, isPending, error };
};

// ============================================================================
// Market Lock Functions (for checking if shares are finalized)
// ============================================================================

export interface MarketLock {
  finalizedUpTo: number;
  sharesFinalized: boolean;
}

/**
 * Get the market lock info for a specific market
 * Returns the finalization status including whether shares are finalized
 */
export const readMarketLock = async (marketId: number): Promise<MarketLock> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'allMarketLocks',
    args: [BigInt(marketId)],
  }) as [bigint, boolean];

  return {
    finalizedUpTo: Number(result[0]),
    sharesFinalized: result[1],
  };
};

// Re-export useful viem utilities
export { formatEther, parseEther, ZERO_ADDRESS };
