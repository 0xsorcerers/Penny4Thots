import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient, getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { ConnectButton, darkTheme, useSendTransaction } from "thirdweb/react";
import { defineChain, sepolia } from "thirdweb/chains";
import {
  createPublicClient,
  http,
  formatEther,
  parseEther,
  parseUnits,
  getAddress,
  isAddress,
  type Address,
  type Abi,
  type AbiFunction,
  type AbiParameter,
} from "viem";
import { sepolia as viemSepolia } from "viem/chains";
import { ReactElement } from "react";
import penny4thots from "../abi/penny4thots.json";
import erc20 from "../abi/ERC20.json";
import erc721 from "../abi/ERC721.json";
import proofOfAccessAbiJson from "../abi/proofOfAccess.json";
import harvesterAbiJson from "../abi/Harvester.json";
import { hasLiveHarvester, hasLiveProofOfAccess } from "./networkData";
import { getCurrentNetwork } from "../store/networkStore";
import { NETWORK_THEMES } from "./networkTheme";
import { getTokenName } from "./whitelisted";

const contractABI = penny4thots.abi as Abi;
const erc20ABI = erc20.abi as Abi;
const erc721ABI = erc721.abi as Abi;
const proofOfAccessABI = proofOfAccessAbiJson.abi as Abi;
const harvesterABI = harvesterAbiJson.abi as Abi;

/**
 * transferFrom function ABI object from webapp/src/abi/ERC721.json.
 * Used to gift / push PoA NFTs from the connected wallet.
 */
const erc721TransferFromAbi: AbiFunction = (() => {
  const item = (erc721.abi as Abi).find(
    (entry): entry is AbiFunction =>
      entry.type === "function" &&
      "name" in entry &&
      entry.name === "transferFrom",
  );
  if (!item) {
    throw new Error("transferFrom not found in ERC721.json abi");
  }
  return item;
})();

/** Human-readable signature built from the ERC721.json transferFrom fragment */
const erc721TransferFromSignature = (() => {
  const inputs = (erc721TransferFromAbi.inputs ?? [])
    .map((input: AbiParameter) => {
      const name = "name" in input && input.name ? ` ${input.name}` : "";
      return `${input.type}${name}`;
    })
    .join(", ");
  return `function ${erc721TransferFromAbi.name}(${inputs})` as const;
})();

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
  blacklist: boolean;
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
  blacklist: boolean;
  marketBalance: bigint; // Keep as bigint - let display layer handle formatting
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
        "tiktok",
        "telegram",
        "facebook",
        "apple",
        "phone",
        "email",
        "discord",
      ],
      mode: "redirect",
    },
  }),
];

// ============================================================================
// Blockchain Configuration (Dynamic per selected network)
// ============================================================================

/**
 * Get the current blockchain config based on selected network
 * This is dynamic and updates when user switches networks
 */
export const getBlockchain = () => {
  const network = getCurrentNetwork();
  return {
    chainId: network.chainId,
    rpc: network.rpc,
    blockExplorer: network.blockExplorer,
    decimals: network.decimals,
    symbol: network.symbol,
    contract_address: network.contract_address,
  };
};

/**
 * Create a dynamic network definition for Thirdweb
 * Used in ConnectButton and contract interactions
 */
export const getThirdwebNetwork = () => {
  const blockchain = getBlockchain();
  return defineChain({ id: blockchain.chainId, rpc: blockchain.rpc });
};

/**
 * Create a dynamic viem public client for the selected network
 * Used for read-only contract calls
 */
export const getPublicClient = (network?: typeof getCurrentNetwork extends () => infer T ? T : never) => {
  const blockchain = network || getBlockchain();
  return createPublicClient({
    transport: http(blockchain.rpc),
  });
};

/**
 * Get the Penny4Thots contract for the selected network
 */
export const getPenny4ThotsContract = () => {
  const blockchain = getBlockchain();
  return getContract({
    client,
    chain: getThirdwebNetwork(),
    address: blockchain.contract_address,
  });
};

// Legacy constants for backward compatibility - but they now use getters
export const blockchain = getBlockchain();
export const network = getThirdwebNetwork();
export const publicClient = getPublicClient();
export const penny4thotsContract = getPenny4ThotsContract();

// ============================================================================
// Connector Component
// ============================================================================

export function Connector(): ReactElement {
  const currentNetwork = getCurrentNetwork();
  const networkTheme = NETWORK_THEMES[currentNetwork.chainId];
  const modalBgChannels = networkTheme?.dark?.tokens?.["modal-bg"] || "120 62% 4%";
  const modalBg = `hsl(${modalBgChannels})`;

  return (
    <ConnectButton
      client={client}
      chain={getThirdwebNetwork()}
      wallets={wallets}
      theme={darkTheme({
        colors: {
          modalBg,
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
        title: "Sign In",
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
  if (ids.length === 0) return [];

  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += IMMUTABLE_MARKET_FETCH_LIMIT) {
    chunks.push(ids.slice(i, i + IMMUTABLE_MARKET_FETCH_LIMIT));
  }

  const allMarketInfos: MarketInfoFormatted[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
      abi: contractABI,
      functionName: 'readMarket',
      args: [chunks[i]],
    });

    const marketInfoArray = result as MarketInfo[];

    allMarketInfos.push(...marketInfoArray.map((marketInfo) => ({
      indexer: Number(marketInfo.indexer),
      title: marketInfo.title,
      subtitle: marketInfo.subtitle,
      description: marketInfo.description,
      image: marketInfo.image,
      tags: parseTags(marketInfo.tags),
      optionA: marketInfo.optionA,
      optionB: marketInfo.optionB,
      feetype: marketInfo.feetype,
    })));

    if (i < chunks.length - 1) {
      await delay(BATCH_GESTATION_MS);
    }
  }

  return allMarketInfos;
};

export const readMarketData = async (ids: number[]): Promise<MarketDataFormatted[]> => {
  if (ids.length === 0) return [];

  const limitedIds = ids.slice(0, MUTABLE_MARKET_FETCH_LIMIT);
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
    abi: contractABI,
    functionName: 'readMarketData',
    args: [limitedIds],
  });

  const marketDataArray = result as MarketData[];

  return marketDataArray.map((marketData) => ({
    indexer: 0, // Will be filled from context
    creator: marketData.creator,
    status: marketData.status,
    blacklist: marketData.blacklist,
    closed: marketData.closed,
    marketBalance: marketData.marketBalance, // Keep as bigint - let display layer handle formatting
    activity: formatEther(marketData.activity),
    aVotes: Number(marketData.aVotes),
    bVotes: Number(marketData.bVotes),
    // === Shares system ===
    startTime: Number(marketData.startTime),
    endTime: Number(marketData.endTime),
    winningSide: marketData.winningSide as Side,
    totalSharesA: formatEther(marketData.totalSharesA),
    totalSharesB: formatEther(marketData.totalSharesB),
    positionCount: Number(marketData.positionCount),
  }));
};

export const readMarketCount = async (): Promise<number> => {
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
    abi: contractABI,
    functionName: 'marketCount',
  }) as number;

  return Number(result);
};


export const readPaymentToken = async (marketId: number): Promise<Address> => {
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
    abi: contractABI,
    functionName: 'paymentTokens',
    args: [marketId],
  }) as Address;

  return result;
};

export const readAdjudicators = async (marketId: number): Promise<string> => {
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
    abi: contractABI,
    functionName: 'adjudicators',
    args: [marketId],
  }) as string;

  return result;
};

// ============================================================================
// Adjudicators Parser (Collision-Safe Version)
// ============================================================================

export interface ParsedSegment {
  text: string;
  type: 'normal' | 'number' | 'hash' | 'quoted' | 'parenthesis' | 'voted';
  className: string;
}

/**
 * Precedence Order (Top → Bottom):
 * 1. Quoted text
 * 2. Parenthesis
 * 3. Hash (64 hex)
 * 4. Word after "voted"
 * 5. Numbers
 */
export const parseAdjudicators = (input: string): ParsedSegment[] => {
  if (!input) return [];

  const segments: ParsedSegment[] = [];

  const combinedRegex =
  /"([^"]*)"|\(([^)]*)\)|\b([a-fA-F0-9]{64})\b|(?<=\bvoted\s)(\w+)|(?<=\)\s)([A-Z])\b|\b(\d{4}-\d{2}-\d{2}|\d+\/\d+\/\d+|\d+)\b/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(input)) !== null) {
    const start = match.index;
    const end = combinedRegex.lastIndex;

    // Add normal text before match
    if (start > lastIndex) {
      segments.push(createSegment(
        input.slice(lastIndex, start),
        'normal'
      ));
    }

    let segment: ParsedSegment;

    if (match[1] !== undefined) {
      segment = createSegment(`"${match[1]}"`, 'quoted');
    }
    else if (match[2] !== undefined) {
      segment = createSegment(`(${match[2]})`, 'parenthesis');
    }
    else if (match[3] !== undefined) {
      segment = createSegment(`#${match[3]}`, 'hash');
    }
    else if (match[4] !== undefined) {
      // Word after "voted "
      segment = createSegment(match[4], 'voted');
    }
    else if (match[5] !== undefined) {
      // Single letter after ") "
      segment = createSegment(match[5], 'voted');
    }
    else if (match[6] !== undefined) {
      segment = createSegment(match[6], 'number');
    }
    else {
      segment = createSegment(match[0], 'normal');
    }

    segments.push(segment);
    lastIndex = end;
  }

  // Remaining trailing text
  if (lastIndex < input.length) {
    segments.push(createSegment(
      input.slice(lastIndex),
      'normal'
    ));
  }

  return segments;
};

const createSegment = (
  text: string,
  type: ParsedSegment['type']
): ParsedSegment => {
  const base = "font-outfit text-sm break-words [overflow-wrap:anywhere]";

  const styles: Record<ParsedSegment['type'], string> = {
    normal: `${base} text-slate-600 dark:text-slate-400`,
    number: `${base} text-cyan-600 dark:text-cyan-400 font-mono font-semibold`,
    hash: `${base} text-purple-600 dark:text-purple-400 font-mono`,
    quoted: `${base} text-emerald-600 dark:text-emerald-400 italic`,
    parenthesis: `${base} text-amber-600 dark:text-amber-400`,
    voted: `${base} text-rose-600 dark:text-rose-400 font-bold uppercase`
  };

  return {
    text,
    type,
    className: styles[type]
  };
};


/**
 * Get appropriate CSS class name for each segment type
 */
const getSegmentClassName = (type: ParsedAdjudicatorSegment['type']): string => {
  const baseClasses = "font-outfit text-sm";
  
  switch (type) {
    case 'number':
      return `${baseClasses} text-cyan-600 dark:text-cyan-400 font-mono font-semibold`;
    case 'hash':
      return `${baseClasses} text-purple-600 dark:text-purple-400 font-mono`;
    case 'quoted':
      return `${baseClasses} text-emerald-600 dark:text-emerald-400 font-medium italic`;
    case 'parenthesis':
      return `${baseClasses} text-amber-600 dark:text-amber-400 font-medium`;
    case 'voted-word':
      return `${baseClasses} text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide`;
    case 'normal':
    default:
      return `${baseClasses} text-slate-700 dark:text-slate-300`;
  }
};

/**
 * Render parsed adjudicators segments as JSX elements
 */
export const renderParsedAdjudicators = (input: string): JSX.Element[] => {
  const segments = parseAdjudicators(input);

  return segments.map((seg, i) => (
    <span key={i} className={`${seg.className} whitespace-pre-wrap`}>
      {seg.text}
    </span>
  ));
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
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
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

// Market pagination/fetch constraints
export const MARKETS_PER_PAGE = 15;
const IMMUTABLE_MARKET_FETCH_LIMIT = 200;
const MUTABLE_MARKET_FETCH_LIMIT = 50;
const BATCH_GESTATION_MS = 3000;

export const getMarketIdsForPage = (
  marketCount: number,
  page: number,
  pageSize: number = MARKETS_PER_PAGE
): number[] => {
  if (marketCount <= 0 || page < 1) return [];

  const start = marketCount - ((page - 1) * pageSize) - 1;
  if (start < 0) return [];

  const end = Math.max(0, start - pageSize + 1);
  const ids: number[] = [];
  for (let i = start; i >= end; i--) ids.push(i);
  return ids;
};

/**
 * Fetch all immutable market info in descending order (newest first)
 * in conservative background-sized chunks.
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

  const marketIds: number[] = [];
  for (let i = marketCount - 1; i >= 0; i--) {
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

  const allMarketData: MarketDataFormatted[] = [];

  for (let i = 0; i < ids.length; i += MUTABLE_MARKET_FETCH_LIMIT) {
    const chunkIds = ids.slice(i, i + MUTABLE_MARKET_FETCH_LIMIT);
    const chunkData = await readMarketData(chunkIds);
    allMarketData.push(...chunkData);
  }

  return allMarketData;
};

/**
 * Filter out blacklisted markets by reading mutable market data in chunks.
 */
export const filterBlacklistedMarketIds = async (ids: number[]): Promise<number[]> => {
  if (ids.length === 0) return [];

  const visibleIds: number[] = [];
  for (let i = 0; i < ids.length; i += MUTABLE_MARKET_FETCH_LIMIT) {
    const chunkIds = ids.slice(i, i + MUTABLE_MARKET_FETCH_LIMIT);
    const chunkData = await readMarketData(chunkIds);
    chunkData.forEach((marketData, idx) => {
      if (!marketData.blacklist) {
        visibleIds.push(chunkIds[idx]);
      }
    });
  }

  return visibleIds;
};

/**
 * Build two filtered market ID arrays in one pass over market data:
 * - allVisibleIds: excludes blacklisted markets
 * - liveVisibleIds: excludes blacklisted and closed markets
 */
export const buildVisibleMarketIdBuckets = async (
  ids: number[]
): Promise<{ allVisibleIds: number[]; liveVisibleIds: number[] }> => {
  if (ids.length === 0) {
    return { allVisibleIds: [], liveVisibleIds: [] };
  }

  const allVisibleIds: number[] = [];
  const liveVisibleIds: number[] = [];

  for (let i = 0; i < ids.length; i += MUTABLE_MARKET_FETCH_LIMIT) {
    const chunkIds = ids.slice(i, i + MUTABLE_MARKET_FETCH_LIMIT);
    const chunkData = await readMarketData(chunkIds);

    chunkData.forEach((marketData, idx) => {
      if (marketData.blacklist) return;

      const id = chunkIds[idx];
      allVisibleIds.push(id);

      if (!marketData.closed) {
        liveVisibleIds.push(id);
      }
    });
  }

  return { allVisibleIds, liveVisibleIds };
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
  const signal = params.signal || false; // true for Option A (YES), false for Option B (NO)
  const endTime = BigInt(params.endTime || 0); // Unix timestamp, 0 for no timer

  // Determine the correct payment token address
  // Use the provided paymentToken, which should be set correctly by the caller
  const paymentTokenAddress: Address = params.paymentToken || ("0x0000000000000000000000000000000000000000" as Address);

  return prepareContractCall({
    contract: getPenny4ThotsContract(),
    method: "function writeMarket(string[] calldata _info, uint256 _marketBalance, bool _signal, bool _feetype, address _paymentToken, uint256 _endTime) external payable",
    params: [
      infoArray,
      params.marketBalance,
      signal, // _signal - true for Option A (YES), false for Option B (NO)
      feetype, // _feetype - true for token payment, false for ETH payment
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
      value: params.feetype ? gasfee : params.marketBalance, // Use feetype for msg.value calculation
    };
    const result = await sendTx(transaction);

    // Wait for transaction to be mined/confirmed before returning
    // This ensures the new market is written to the blockchain before we fetch updated data
    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
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
    contract: getPenny4ThotsContract(),
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
      chain: getThirdwebNetwork(),
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
 * Uses special characters as delineators - they become split points
 * Only letters/numbers from any language are kept in resulting tags
 */
export const parseTags = (tagsString: string): string[] => {
  if (!tagsString || tagsString.trim() === '') return [];
  // Replace all non-letter/non-number characters with commas (delineators)
  // Then split by comma to get clean tags
  return tagsString
    .replace(/[^\p{L}\p{N}]/gu, ',')
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
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

/**
 * Convert a token amount to its smallest unit (bigint) based on token decimals
 * @param amount - Token amount as string or number (e.g., "0.01", 1, "1.5")
 * @param decimals - Number of decimals the token uses (e.g., 6 for USDC, 18 for WETH)
 * @returns bigint in the token's smallest unit
 */
export const toTokenSmallestUnit = (amount: string | number, decimals: number): bigint => {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`Invalid token decimals: ${decimals}`);
  }

  return parseUnits(String(amount), decimals);
};

/**
 * Convert a token amount from its smallest unit to a readable string based on token decimals
 * @param amount - Amount in the token's smallest unit (bigint)
 * @param decimals - Number of decimals the token uses (e.g., 6 for USDC, 18 for WETH)
 * @returns Formatted string with appropriate decimal places
 */
export const fromTokenSmallestUnit = (amount: bigint, decimals: number): string => {
  // For common decimal values, use optimized approach
  if (decimals === 18) {
    return formatEther(amount);
  }
  
  // For other decimal values, use manual formatting
  const amountStr = amount.toString();
  
  // Pad with leading zeros to ensure we can place decimal point
  const padded = amountStr.padStart(decimals + 1, '0');
  
  // Split into integer and fractional parts
  const integerPart = padded.slice(0, -decimals) || '0';
  const fractionalPart = padded.slice(-decimals);
  
  // Remove trailing zeros from fractional part
  const trimmedFractional = fractionalPart.replace(/0+$/, '');
  
  // Combine parts
  if (trimmedFractional) {
    return `${integerPart}.${trimmedFractional}`;
  }
  return integerPart;
};

/**
 * Format a token amount for display with proper decimal handling
 * @param amount - Amount in the token's smallest unit (bigint)
 * @param decimals - Number of decimals the token uses
 * @param maxDisplayDecimals - Maximum decimals to show (optional, defaults to token decimals)
 * @returns Formatted display string
 */
export const formatTokenAmount = (
  amount: bigint, 
  decimals: number, 
  maxDisplayDecimals?: number
): string => {
  const fullAmount = fromTokenSmallestUnit(amount, decimals);
  const maxDecimals = maxDisplayDecimals !== undefined ? maxDisplayDecimals : decimals;
  
  if (maxDecimals === 0) {
    return fullAmount.split('.')[0];
  }
  
  const parts = fullAmount.split('.');
  if (parts.length === 1) {
    return parts[0];
  }
  
  const integerPart = parts[0];
  const fractionalPart = parts[1].slice(0, maxDecimals);
  
  if (fractionalPart) {
    return `${integerPart}.${fractionalPart}`;
  }
  return integerPart;
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

/**
 * Smart decimal precision for display amounts (keep as few places as possible):
 * - |n| >= 10 (tens+) → max 1 decimal place
 * - 1 <= |n| < 10 (single digits) → max 2 decimal places
 * - |n| < 1 (fractional) → max 6 decimal places
 */
export function displayDecimalPlaces(absValue: number): number {
  if (!Number.isFinite(absValue) || absValue === 0) return 0;
  if (absValue >= 10) return 1;
  if (absValue >= 1) return 2;
  return 6;
}

/**
 * Format a number/string with thousand separators and magnitude-based decimals.
 * Trailing zeros are stripped so we show as few decimals as we can within the cap.
 *
 * @example formatThousands(1234.56) → "1,234.6"
 * @example formatThousands(3.14159) → "3.14"
 * @example formatThousands(0.000123456) → "0.000123"
 */
export function formatThousands(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";

  const cleaned =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, "").trim());

  if (!Number.isFinite(cleaned) || cleaned === 0) return "0";

  const abs = Math.abs(cleaned);
  const places = displayDecimalPlaces(abs);
  const factor = 10 ** places;
  // Round half away from zero toward the configured precision ("rounded up" places)
  const rounded =
    places === 0
      ? Math.round(cleaned)
      : Math.round(cleaned * factor) / factor;

  // Avoid "-0"
  if (rounded === 0) return "0";

  let fixed = rounded.toFixed(places);
  // Keep decimals as few as possible: drop trailing zeros / bare "."
  if (fixed.includes(".")) {
    fixed = fixed.replace(/\.?0+$/, "");
  }

  const negative = fixed.startsWith("-");
  const unsigned = negative ? fixed.slice(1) : fixed;
  const [intPart, fracPart] = unsigned.split(".");
  const intFormatted = Number(intPart).toLocaleString("en-US");
  const body =
    fracPart !== undefined && fracPart.length > 0
      ? `${intFormatted}.${fracPart}`
      : intFormatted;
  return negative ? `-${body}` : body;
}

/**
 * Convert token smallest-units → human amount, then formatThousands for UI.
 */
export function formatTokenAmountThousands(
  amount: bigint,
  decimals: number,
): string {
  if (amount <= 0n) return "0";
  const dec = Number.isInteger(decimals) && decimals >= 0 ? decimals : 18;
  try {
    const full = fromTokenSmallestUnit(amount, dec);
    return formatThousands(full);
  } catch {
    return amount.toString();
  }
}

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
 * Check if a token address is the zero address (native coin / ETH payment).
 * Case-insensitive — Harvester uses address(0) as the native reward stream id.
 */
export const isZeroAddress = (address: Address | string | null | undefined): boolean => {
  if (!address) return true;
  return String(address).trim().toLowerCase() === ZERO_ADDRESS.toLowerCase();
};

/**
 * Read the current allowance for a spender on a token
 */
export const readTokenAllowance = async (
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address
): Promise<bigint> => {
  const result = await getPublicClient().readContract({
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
  const result = await getPublicClient().readContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [ownerAddress],
  });
  return result as bigint;
};

/**
 * Read the token decimals
 */
export const readTokenDecimalsStrict = async (tokenAddress: Address): Promise<number> => {
  const result = await getPublicClient().readContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "decimals",
  });
  const decimals = Number(result);

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`Invalid token decimals for ${tokenAddress}`);
  }

  return decimals;
};

export const readTokenDecimals = async (tokenAddress: Address): Promise<number> => {
  try {
    return await readTokenDecimalsStrict(tokenAddress);
  } catch (err) {
    console.error('Error reading token decimals:', err);
    return 18; // Display fallback only. Transaction paths should use readTokenDecimalsStrict.
  }
};

/**
 * Read the token symbol
 */
export const readTokenSymbol = async (tokenAddress: Address): Promise<string> => {
  try {
    const result = await getPublicClient().readContract({
      address: tokenAddress,
      abi: erc20ABI,
      functionName: "symbol",
    });
    return result as string;
  } catch (err) {
    console.error('Error reading token symbol:', err);
    return 'TOKEN';
  }
};

/**
 * Read the ERC20 token name() for display (e.g. custom reward stream addresses).
 */
export const readTokenName = async (tokenAddress: Address): Promise<string> => {
  try {
    if (tokenAddress === ZERO_ADDRESS) return "Native";
    const result = await getPublicClient().readContract({
      address: tokenAddress,
      abi: erc20ABI,
      functionName: "name",
    });
    const name = String(result ?? "").trim();
    return name || "Unknown token";
  } catch (err) {
    console.error("Error reading token name:", err);
    return "Unknown token";
  }
};

export interface Erc20TokenMeta {
  name: string;
  symbol: string;
}

/** Parallel ERC20 name() + symbol() lookup for reward stream labels. */
export const readTokenMeta = async (tokenAddress: Address): Promise<Erc20TokenMeta> => {
  if (tokenAddress === ZERO_ADDRESS) {
    return { name: "Native", symbol: "ETH" };
  }
  const [name, symbol] = await Promise.all([
    readTokenName(tokenAddress),
    readTokenSymbol(tokenAddress),
  ]);
  return { name, symbol };
};

/**
 * Prepare an ERC20 approve transaction
 */
export const prepareTokenApprove = (tokenAddress: Address, amount: bigint) => {
  const tokenContract = getContract({
    client,
    chain: getThirdwebNetwork(),
    address: tokenAddress,
  });

  return prepareContractCall({
    contract: tokenContract,
    method: "function approve(address spender, uint256 amount) external returns (bool)",
    params: [getBlockchain().contract_address, amount],
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
      chain: getThirdwebNetwork(),
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
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
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
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
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
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
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
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
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
        amount: claim.amount.toString(),
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
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
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
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
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
export const getClaimablePositions = async (marketId: number, userAddress: Address, positionIds: number[]): Promise<number[]> => {
  if (positionIds.length === 0) return [];

  try {
    console.log(`[getClaimablePositions] Market ${marketId}, User ${userAddress}, Checking positions:`, positionIds);
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
      abi: contractABI,
      functionName: 'isClaimable',
      args: [userAddress, BigInt(marketId), positionIds.map(id => BigInt(id))],
    });
    const claimable = (result as bigint[]).map(id => Number(id));
    console.log(`[getClaimablePositions] Market ${marketId}, User ${userAddress}, Claimable positions:`, claimable);
    return claimable;
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
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
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
 * Get the total number of user positions for a market.
 * Alias used by trade/kamikaze UI flows.
 */
export const totalUserMarket = async (marketId: number, userAddress: Address): Promise<number> => {
  return getUserPositionCount(marketId, userAddress);
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
    const result = await getPublicClient().readContract({
      address: getBlockchain().contract_address,
      abi: contractABI,
      functionName: 'getUserPositions',
      args: [BigInt(marketId), userAddress, BigInt(start), BigInt(finish)],
    });

    const positions = (result as bigint[]).map((id) => Number(id));
    console.log(`[getUserPositionsInRange] Market ${marketId}, User ${userAddress}, Range ${start}-${finish}:`, positions);
    return positions;
  } catch (err) {
    console.error('Error fetching user positions:', err);
    return [];
  }
};

/**
 * Alias for getUserPositionsInRange used by trade/kamikaze UI flows.
 */
export const getUserPositions = async (
  marketId: number,
  userAddress: Address,
  start: number,
  finish: number
): Promise<number[]> => {
  return getUserPositionsInRange(marketId, userAddress, start, finish);
};

export interface PositionDetails {
  positionId: number;
  user: Address;
  side: Side;
  amount: bigint;
  timestamp: number;
  claimed: boolean;
  kamikazed: boolean;
}

/**
 * Read position details in a single multicall batch to reduce RPC pressure.
 */
export const getPositionDetailsBatch = async (
  marketId: number,
  positionIds: number[]
): Promise<PositionDetails[]> => {
  if (positionIds.length === 0) return [];

  const allDetails: PositionDetails[] = [];
  const callsRequired = Math.ceil(positionIds.length / POSITION_FETCH_LIMIT);

  for (let i = 0; i < callsRequired; i++) {
    const start = i * POSITION_FETCH_LIMIT;
    const finish = Math.min(start + POSITION_FETCH_LIMIT, positionIds.length);
    const chunk = positionIds.slice(start, finish);

    const results = await Promise.allSettled(
      chunk.map((positionId) =>
        getPublicClient().readContract({
          address: getBlockchain().contract_address,
          abi: contractABI,
          functionName: "positions",
          args: [BigInt(marketId), BigInt(positionId)],
        })
      )
    );

    results.forEach((result, idx) => {
      if (result.status !== "fulfilled") return;
      const value = result.value as [Address, number, bigint, bigint, boolean, boolean];
      allDetails.push({
        positionId: chunk[idx],
        user: value[0],
        side: value[1] as Side,
        amount: value[2],
        timestamp: Number(value[3]),
        claimed: value[4],
        kamikazed: value[5],
      });
    });
  }

  return allDetails;
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
  console.log(`[getAllUserPositions] Market ${marketId}, User ${userAddress}, Total position count:`, positionCount);

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

  console.log(`[getAllUserPositions] Market ${marketId}, User ${userAddress}, All collected positions:`, allPositions);
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
    contract: getPenny4ThotsContract(),
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
      chain: getThirdwebNetwork(),
      transactionHash: result.transactionHash,
    });

    return result;
  };

  return { batchClaim, isPending, error };
};

// ============================================================================
// Batch Kamikaze Functions
// ============================================================================

export interface BatchKamikazeParams {
  marketId: number;
  positionIds: number[];
}

export const prepareBatchKamikaze = (params: BatchKamikazeParams) => {
  return prepareContractCall({
    contract: getPenny4ThotsContract(),
    method: "function batchKamikaze(uint256 _market, uint256[] calldata _posIds) external",
    params: [BigInt(params.marketId), params.positionIds.map(id => BigInt(id))],
  });
};

export const useBatchKamikaze = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const batchKamikaze = async (params: BatchKamikazeParams) => {
    const transaction = prepareBatchKamikaze(params);
    const result = await sendTx(transaction);

    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
      transactionHash: result.transactionHash,
    });

    return result;
  };

  return { batchKamikaze, isPending, error };
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
  const result = await getPublicClient().readContract({
    address: getBlockchain().contract_address,
    abi: contractABI,
    functionName: 'allMarketLocks',
    args: [BigInt(marketId)],
  }) as [bigint, boolean];

  return {
    finalizedUpTo: Number(result[0]),
    sharesFinalized: result[1],
  };
};

// ============================================================================
// ProofOfAccess (NFT mint) — Harvester access pass
// ============================================================================

/** Contract defaults when chain is not live yet (mirrors ProofOfAccess.sol) */
export const PROOF_OF_ACCESS_DEFAULTS = {
  mintFee: 10_000_000_000_000n, // 0.00001 ether
  /** 2_000_000 PENNY with 18 decimals (requiredAmount = 2000000 * 10**18) */
  requiredAmount: 2_000_000n * 10n ** 18n,
  multipliers: [1n, 2n, 4n, 8n, 16n, 32n] as const,
  /** Rough gas units for approve + mint when estimating ETH reserve */
  gasUnitsReserve: 350_000n,
};

export function getProofOfAccessAddress(): Address | null {
  const network = getCurrentNetwork();
  // Dummy stand-in unlocks UI only — never return it for live contract calls
  if (!hasLiveProofOfAccess(network)) return null;
  return network.proof_of_access;
}

export const getProofOfAccessContract = () => {
  const address = getProofOfAccessAddress();
  if (!address) throw new Error("ProofOfAccess not deployed on this network");
  return getContract({
    client,
    chain: getThirdwebNetwork(),
    address,
  });
};

/**
 * Resolve PENNY token for the current chain.
 * Prefer network config; fall back to ProofOfAccess.pennyToken() when deployed.
 */
export async function resolvePennyTokenAddress(): Promise<Address> {
  const network = getCurrentNetwork();
  const configured = (network.penny_address || "").trim() as Address;
  if (configured && configured !== ZERO_ADDRESS && configured.length === 42) {
    return configured;
  }

  const poa = getProofOfAccessAddress();
  if (!poa) throw new Error("PENNY token not configured on this network");

  const onChain = (await getPublicClient().readContract({
    address: poa,
    abi: proofOfAccessABI,
    functionName: "pennyToken",
  })) as Address;

  if (!onChain || onChain === ZERO_ADDRESS) {
    throw new Error("ProofOfAccess has no pennyToken set");
  }
  return onChain;
}

export interface ProofOfAccessMintConfig {
  mintFee: bigint;
  requiredAmount: bigint;
  multiplier: bigint;
  burnAmount: bigint;
  paused: boolean;
  deployed: boolean;
  pennyToken: Address | null;
  pennyDecimals: number;
}

export interface ProofOfAccessMintReadiness {
  config: ProofOfAccessMintConfig;
  pennyToken: Address;
  pennyDecimals: number;
  ethBalance: bigint;
  pennyBalance: bigint;
  allowance: bigint;
  gasPrice: bigint;
  ethGasReserve: bigint;
  ethNeeded: bigint;
  needsApproval: boolean;
  hasEnoughPenny: boolean;
  hasEnoughGas: boolean;
  canMint: boolean;
}

/** Read mint fee / burn requirements for a tier (falls back to contract defaults if undeployed). */
export async function fetchProofOfAccessMintConfig(tierLevel: number): Promise<ProofOfAccessMintConfig> {
  const address = getProofOfAccessAddress();
  const clamped = Math.max(0, Math.min(5, tierLevel));

  if (!address) {
    const multiplier = PROOF_OF_ACCESS_DEFAULTS.multipliers[clamped] ?? 1n;
    return {
      mintFee: PROOF_OF_ACCESS_DEFAULTS.mintFee,
      requiredAmount: PROOF_OF_ACCESS_DEFAULTS.requiredAmount,
      multiplier,
      burnAmount: PROOF_OF_ACCESS_DEFAULTS.requiredAmount * multiplier,
      paused: false,
      deployed: false,
      pennyToken: null,
      pennyDecimals: 18,
    };
  }

  const client_ = getPublicClient();
  try {
    const [mintFee, requiredAmount, multiplier, paused, pennyToken] = await Promise.all([
      client_.readContract({
        address,
        abi: proofOfAccessABI,
        functionName: "mintFee",
      }) as Promise<bigint>,
      client_.readContract({
        address,
        abi: proofOfAccessABI,
        functionName: "requiredAmount",
      }) as Promise<bigint>,
      client_.readContract({
        address,
        abi: proofOfAccessABI,
        functionName: "multipliers",
        args: [BigInt(clamped)],
      }) as Promise<bigint>,
      client_.readContract({
        address,
        abi: proofOfAccessABI,
        functionName: "paused",
      }) as Promise<boolean>,
      client_.readContract({
        address,
        abi: proofOfAccessABI,
        functionName: "pennyToken",
      }) as Promise<Address>,
    ]);

    let pennyDecimals = 18;
    if (pennyToken && pennyToken !== ZERO_ADDRESS) {
      try {
        pennyDecimals = await readTokenDecimalsStrict(pennyToken);
      } catch {
        pennyDecimals = 18;
      }
    }

    return {
      mintFee,
      requiredAmount,
      multiplier,
      burnAmount: requiredAmount * multiplier,
      paused,
      deployed: true,
      pennyToken: pennyToken && pennyToken !== ZERO_ADDRESS ? pennyToken : null,
      pennyDecimals,
    };
  } catch (err) {
    console.error("fetchProofOfAccessMintConfig failed, using defaults", err);
    const multiplier = PROOF_OF_ACCESS_DEFAULTS.multipliers[clamped] ?? 1n;
    return {
      mintFee: PROOF_OF_ACCESS_DEFAULTS.mintFee,
      requiredAmount: PROOF_OF_ACCESS_DEFAULTS.requiredAmount,
      multiplier,
      burnAmount: PROOF_OF_ACCESS_DEFAULTS.requiredAmount * multiplier,
      paused: false,
      deployed: true,
      pennyToken: null,
      pennyDecimals: 18,
    };
  }
}

/**
 * Pre-flight checks before mint: balances, allowance, and rough ETH gas + fee reserve.
 * Call this when the user opens the mint confirm dialog.
 */
export async function checkProofOfAccessMintReadiness(
  wallet: Address,
  tierLevel: number,
): Promise<ProofOfAccessMintReadiness> {
  const config = await fetchProofOfAccessMintConfig(tierLevel);
  if (!config.deployed) {
    throw new Error("ProofOfAccess contract is not deployed on this network yet");
  }
  if (config.paused) {
    throw new Error("Minting is paused");
  }

  const spender = getProofOfAccessAddress();
  if (!spender) throw new Error("ProofOfAccess not deployed on this network");

  const pennyToken = config.pennyToken ?? (await resolvePennyTokenAddress());
  const client_ = getPublicClient();

  const [ethBalance, pennyBalance, allowance, gasPrice, pennyDecimals] = await Promise.all([
    client_.getBalance({ address: wallet }),
    readTokenBalance(pennyToken, wallet),
    readTokenAllowance(pennyToken, wallet, spender),
    client_.getGasPrice(),
    config.pennyDecimals
      ? Promise.resolve(config.pennyDecimals)
      : readTokenDecimals(pennyToken),
  ]);

  const ethGasReserve = gasPrice * PROOF_OF_ACCESS_DEFAULTS.gasUnitsReserve;
  const ethNeeded = config.mintFee + ethGasReserve;
  const needsApproval = allowance < config.burnAmount;
  const hasEnoughPenny = pennyBalance >= config.burnAmount;
  const hasEnoughGas = ethBalance >= ethNeeded;

  return {
    config: { ...config, pennyToken, pennyDecimals },
    pennyToken,
    pennyDecimals,
    ethBalance,
    pennyBalance,
    allowance,
    gasPrice,
    ethGasReserve,
    ethNeeded,
    needsApproval,
    hasEnoughPenny,
    hasEnoughGas,
    canMint: hasEnoughPenny && hasEnoughGas,
  };
}

/** Approve PENNY burn amount for the ProofOfAccess spender. */
export const preparePennyApproveForProofOfAccess = (amount: bigint, pennyAddress?: Address) => {
  const network = getCurrentNetwork();
  const penny = (pennyAddress || (network.penny_address as Address)) as Address;
  const spender = getProofOfAccessAddress();
  if (!spender) throw new Error("ProofOfAccess not deployed on this network");
  if (!penny || penny === ZERO_ADDRESS) throw new Error("PENNY token not configured");

  const tokenContract = getContract({
    client,
    chain: getThirdwebNetwork(),
    address: penny,
  });

  return prepareContractCall({
    contract: tokenContract,
    method: "function approve(address spender, uint256 amount) external returns (bool)",
    params: [spender, amount],
  });
};

export const prepareProofOfAccessMint = (tierLevel: number) => {
  return prepareContractCall({
    contract: getProofOfAccessContract(),
    method: "function mint(uint256 _tierLevel) public payable",
    params: [BigInt(tierLevel)],
  });
};

/**
 * Hook: approve PENNY (if needed) then mint ProofOfAccess NFT for tierLevel (0–5).
 * Requires wallet connection via thirdweb (user signs — not a backend key).
 *
 * Flow:
 * 1) Readiness check (balances / gas) — pass wallet or precomputed readiness
 * 2) Wallet popup: approve ProofOfAccess to spend burnAmount PENNY (if needed)
 * 3) Wallet popup: mint(_tierLevel) payable with mintFee
 */
export const useProofOfAccessMint = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const mintTier = async (
    tierLevel: number,
    options: {
      wallet: Address;
      readiness?: ProofOfAccessMintReadiness;
      onStep?: (step: "checking" | "approving" | "minting") => void;
    },
  ) => {
    options.onStep?.("checking");
    const readiness =
      options.readiness ??
      (await checkProofOfAccessMintReadiness(options.wallet, tierLevel));

    const { config, pennyToken, needsApproval, hasEnoughPenny, hasEnoughGas, canMint } =
      readiness;

    if (!config.deployed) {
      throw new Error("ProofOfAccess contract is not deployed on this network yet");
    }
    if (config.paused) {
      throw new Error("Minting is paused");
    }
    if (!hasEnoughPenny) {
      throw new Error(
        `Not enough PENNY to mint. Need ${formatCompactTokenAmount(config.burnAmount, readiness.pennyDecimals)} PENNY to burn.`,
      );
    }
    if (!hasEnoughGas) {
      throw new Error(
        `Not enough ${getCurrentNetwork().symbol} for mint fee + gas. Keep a little extra for the approve and mint transactions.`,
      );
    }
    if (!canMint) {
      throw new Error("Cannot mint right now — check PENNY balance and gas.");
    }

    // 1) Approve PENNY burn when allowance is insufficient
    if (needsApproval) {
      options.onStep?.("approving");
      const approveTx = preparePennyApproveForProofOfAccess(config.burnAmount, pennyToken);
      const approveResult = await sendTx(approveTx);
      await waitForReceipt({
        client,
        chain: getThirdwebNetwork(),
        transactionHash: approveResult.transactionHash,
      });
    }

    // 2) Mint with fee
    options.onStep?.("minting");
    const mintTx = {
      ...prepareProofOfAccessMint(tierLevel),
      value: config.mintFee,
    };
    const mintResult = await sendTx(mintTx);
    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
      transactionHash: mintResult.transactionHash,
    });

    return mintResult;
  };

  return { mintTier, isPending, error };
};

// ============================================================================
// ProofOfAccess NFT gift (ERC-721 transferFrom via ERC721.json)
// ============================================================================

/**
 * ProofOfAccess address wired with the standard ERC-721 ABI
 * (webapp/src/abi/ERC721.json) for transfer / ownership calls.
 */
export const getProofOfAccessErc721Contract = () => {
  const address = getProofOfAccessAddress();
  if (!address) throw new Error("ProofOfAccess not deployed on this network");
  return getContract({
    client,
    chain: getThirdwebNetwork(),
    address,
    abi: erc721ABI,
  });
};

/**
 * Prepare ERC-721 transferFrom on the live ProofOfAccess address.
 * Method ABI comes from ERC721.json (not ProofOfAccess-specific ABI).
 * Caller must own the token (or be approved); wallet signs the tx.
 */
export const prepareProofOfAccessTransferFrom = (
  from: Address,
  to: Address,
  tokenId: bigint,
) => {
  return prepareContractCall({
    contract: getProofOfAccessErc721Contract(),
    // Signature is derived from ERC721.json transferFrom (see erc721TransferFromAbi)
    method: erc721TransferFromSignature,
    params: [from, to, tokenId],
  });
};

/**
 * Hook: gift a ProofOfAccess NFT to any wallet via ERC-721 transferFrom.
 * Uses ERC721.json transferFrom against the PoA contract address.
 * Requires the connected wallet to own the tokenId (msg.sender = from).
 */
export const useProofOfAccessGift = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const giftNft = async (params: {
    from: Address;
    to: string;
    tokenId: bigint;
  }) => {
    const toRaw = params.to.trim();
    if (!isAddress(toRaw)) {
      throw new Error("Enter a valid wallet address (0x…)");
    }

    const from = getAddress(params.from);
    const to = getAddress(toRaw);

    if (to === ZERO_ADDRESS) {
      throw new Error("Cannot gift to the zero address");
    }
    if (to.toLowerCase() === from.toLowerCase()) {
      throw new Error("Cannot gift an NFT to your own wallet");
    }
    if (params.tokenId < 0n) {
      throw new Error("Invalid NFT token id");
    }

    const transferTx = prepareProofOfAccessTransferFrom(from, to, params.tokenId);
    const result = await sendTx(transferTx);
    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
      transactionHash: result.transactionHash,
    });

    return { ...result, to };
  };

  return { giftNft, isPending, error };
};

/**
 * Compact token amount for staking / mint UI.
 * Uses formatThousands (thousand separators + magnitude-based decimals).
 * `maxFrac` is kept for call-site compatibility but caps are driven by formatThousands.
 */
export function formatCompactTokenAmount(
  amount: bigint,
  decimals: number,
  _maxFrac = 2,
): string {
  try {
    return formatTokenAmountThousands(amount, decimals);
  } catch {
    return amount.toString();
  }
}

// ============================================================================
// ProofOfAccess ownership + wallet balances (viem reads)
// ============================================================================

/** On-chain Player struct from ProofOfAccess.getPlayerOwners / getPlayers */
export interface ProofOfAccessPlayer {
  TIER: string;
  ID: bigint;
  LISTS: bigint;
  BLACKLIST: boolean;
}

/**
 * List all ProofOfAccess NFTs owned by a wallet (viem read).
 * Returns empty array when PoA is not live or the call fails.
 */
export async function getPlayerOwners(wallet: Address): Promise<ProofOfAccessPlayer[]> {
  const poa = getProofOfAccessAddress();
  if (!poa) return [];

  try {
    const result = await getPublicClient().readContract({
      address: poa,
      abi: proofOfAccessABI,
      functionName: "getPlayerOwners",
      args: [wallet],
    });

    const rows = result as Array<{
      TIER: string;
      ID: bigint;
      LISTS: bigint;
      BLACKLIST: boolean;
    }>;

    return rows.map((p) => {
      // Player.ID is the minted ERC-721 tokenId (set in mint as ID: _tokenId)
      const tokenId = BigInt(
        (p as { ID?: bigint | number | string }).ID ??
          (Array.isArray(p) ? (p as unknown[])[1] : 0) ??
          0,
      );
      return {
        TIER: String((p as { TIER?: string }).TIER ?? (Array.isArray(p) ? (p as unknown[])[0] : "")),
        ID: tokenId,
        LISTS: BigInt(
          (p as { LISTS?: bigint | number | string }).LISTS ??
            (Array.isArray(p) ? (p as unknown[])[2] : 1) ??
            1,
        ),
        BLACKLIST: Boolean(
          (p as { BLACKLIST?: boolean }).BLACKLIST ??
            (Array.isArray(p) ? (p as unknown[])[3] : false),
        ),
      };
    });
  } catch (err) {
    console.error("getPlayerOwners failed", err);
    return [];
  }
}

export interface WalletStakingBalances {
  ethBalance: bigint;
  pennyBalance: bigint;
  pennyDecimals: number;
  pennyToken: Address | null;
}

/**
 * Native gas token + PENNY balances via viem (getBalance + ERC20 balanceOf).
 * Safe when PENNY is not configured — returns 0n for penny.
 */
export async function fetchWalletStakingBalances(
  wallet: Address,
): Promise<WalletStakingBalances> {
  const client_ = getPublicClient();
  const ethBalance = await client_.getBalance({ address: wallet });

  let pennyToken: Address | null = null;
  let pennyBalance = 0n;
  let pennyDecimals = 18;

  try {
    pennyToken = await resolvePennyTokenAddress();
    const [bal, dec] = await Promise.all([
      readTokenBalance(pennyToken, wallet),
      readTokenDecimals(pennyToken),
    ]);
    pennyBalance = bal;
    pennyDecimals = dec;
  } catch {
    /* PENNY not configured or RPC error — leave zeros */
  }

  return { ethBalance, pennyBalance, pennyDecimals, pennyToken };
}

// ============================================================================
// Harvester V2 — deposit PENNY + reward stream subscriptions
// ============================================================================

/** Rough gas units per farm step (approve / subscribe / deposit) */
export const HARVESTER_FARM_DEFAULTS = {
  gasUnitsPerTx: 280_000n,
  /** Fallback when PoA mintFee cannot be read */
  ethBufferFallback: 10_000_000_000_000n, // 0.00001 ether
};

export function getHarvesterAddress(): Address | null {
  const network = getCurrentNetwork();
  if (!hasLiveHarvester(network)) return null;
  return network.harvester;
}

export const getHarvesterContract = () => {
  const address = getHarvesterAddress();
  if (!address) throw new Error("Harvester not deployed on this network");
  return getContract({
    client,
    chain: getThirdwebNetwork(),
    address,
  });
};

export interface HarvesterUserSubscriptions {
  tokens: Address[];
  count: number;
}

/**
 * Read active reward streams for a wallet via Harvester.getUserSubscriptions.
 * Returns [] when the user has never farmed / has no streams.
 */
export async function fetchUserSubscriptions(wallet: Address): Promise<HarvesterUserSubscriptions> {
  const harvester = getHarvesterAddress();
  if (!harvester) return { tokens: [], count: 0 };

  const client_ = getPublicClient();
  try {
    const subs = (await client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "getUserSubscriptions",
      args: [wallet],
    })) as Address[];

    const tokens = (subs ?? []).map((a) => a as Address);
    return { tokens, count: tokens.length };
  } catch (err) {
    console.error("fetchUserSubscriptions failed", err);
    return { tokens: [], count: 0 };
  }
}

export interface HarvesterFarmStats {
  /** balances[user] — this wallet's PENNY staked in Harvester (Current Farm) */
  stakedBalance: bigint;
  /**
   * Harvester.TotalPENNYSent — protocol-wide PENNY accounted in the farm (Total Farm).
   * Updated on deposit (+) and withdraw (−) on-chain.
   */
  totalFarmPennySent: bigint;
  firstToken: Address | null;
  subscriptions: Address[];
  paused: boolean;
  deployed: boolean;
}

/** Read Harvester.TotalPENNYSent (global farm total). Returns 0n if not deployed. */
export async function fetchTotalPennySent(): Promise<bigint> {
  const harvester = getHarvesterAddress();
  if (!harvester) return 0n;
  try {
    const value = (await getPublicClient().readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "TotalPENNYSent",
    })) as bigint;
    return value ?? 0n;
  } catch (err) {
    console.error("fetchTotalPennySent failed", err);
    return 0n;
  }
}

/** Live Total Farm (TotalPENNYSent) / Current Farm (balances[user]) for the dashboard. */
export async function fetchHarvesterFarmStats(wallet: Address): Promise<HarvesterFarmStats> {
  const harvester = getHarvesterAddress();
  if (!harvester) {
    return {
      stakedBalance: 0n,
      totalFarmPennySent: 0n,
      firstToken: null,
      subscriptions: [],
      paused: false,
      deployed: false,
    };
  }

  const client_ = getPublicClient();
  const [stakedBalance, paused, totalFarmPennySent, subs] = await Promise.all([
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "balances",
      args: [wallet],
    }) as Promise<bigint>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "paused",
    }) as Promise<boolean>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "TotalPENNYSent",
    }) as Promise<bigint>,
    fetchUserSubscriptions(wallet),
  ]);

  const firstToken = subs.tokens[0] ?? null;

  return {
    stakedBalance,
    totalFarmPennySent: totalFarmPennySent ?? 0n,
    firstToken,
    subscriptions: subs.tokens,
    paused,
    deployed: true,
  };
}

// ============================================================================
// Harvester claim history — userTotalClaimHistory + getUserClaims
// ============================================================================

/** Max records per getUserClaims call (enforced on-chain). */
export const HARVESTER_CLAIMS_MAX_BATCH = 200;

/**
 * Default page size for the Harvested claim-history UI.
 * Kept small so one screen of rows maps 1:1 to a contract batch.
 */
export const HARVESTER_CLAIMS_PAGE_SIZE = 10;

/**
 * One Harvester claim history row (on-chain ClaimRecord).
 * Distinct from market ClaimRecord (which has marketId / positionId).
 */
export interface HarvesterClaimRecord {
  timestamp: number;
  token: Address;
  /** Raw amount in token smallest units (string for safe serialization). */
  amount: string;
}

/** Claim row enriched with ERC20 / native display metadata. */
export interface HarvesterClaimDisplay extends HarvesterClaimRecord {
  name: string;
  symbol: string;
  decimals: number;
  displayAmount: string;
}

/**
 * Total number of harvest claims for a user.
 * On-chain: Harvester.userTotalClaimHistory(user) (user-facing "claims count").
 */
export async function fetchHarvesterUserClaimsCount(wallet: Address): Promise<number> {
  const harvester = getHarvesterAddress();
  if (!harvester) return 0;
  try {
    const result = await getPublicClient().readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "userTotalClaimHistory",
      args: [wallet],
    });
    const n = Number(result);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (err) {
    console.error("fetchHarvesterUserClaimsCount failed", err);
    return 0;
  }
}

/**
 * Read a slice of Harvester claim history.
 * Contract: getUserClaims(user, _start, _finish) where _finish is the batch length
 * (not an exclusive end index), max 200, and _start + _finish <= total.
 */
export async function fetchHarvesterUserClaims(
  wallet: Address,
  start: number,
  count: number,
): Promise<HarvesterClaimRecord[]> {
  const harvester = getHarvesterAddress();
  if (!harvester || count <= 0) return [];

  const safeStart = Math.max(0, Math.floor(start));
  const safeCount = Math.min(HARVESTER_CLAIMS_MAX_BATCH, Math.max(0, Math.floor(count)));
  if (safeCount === 0) return [];

  try {
    const result = await getPublicClient().readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "getUserClaims",
      args: [wallet, BigInt(safeStart), BigInt(safeCount)],
    });

    const raw = result as Array<{
      timestamp: bigint;
      token: Address;
      amount: bigint;
    }>;

    return (raw ?? [])
      .map((claim) => ({
        timestamp: Number(claim.timestamp),
        token: claim.token as Address,
        amount: claim.amount.toString(),
      }))
      .filter((claim) => claim.timestamp > 0);
  } catch (err) {
    console.error("fetchHarvesterUserClaims failed", err);
    return [];
  }
}

/**
 * Map a UI page (0 = newest) to storage start index + batch size.
 * History is stored oldest-first at index 0.
 */
export function harvesterClaimsPageRange(
  total: number,
  page: number,
  pageSize: number = HARVESTER_CLAIMS_PAGE_SIZE,
): { start: number; count: number } {
  if (total <= 0 || pageSize <= 0 || page < 0) return { start: 0, count: 0 };
  const remainingFromEnd = page * pageSize;
  if (remainingFromEnd >= total) return { start: 0, count: 0 };
  const endExclusive = total - remainingFromEnd;
  const start = Math.max(0, endExclusive - pageSize);
  return { start, count: endExclusive - start };
}

/**
 * Fetch one page of claims (newest first within the page) and enrich each row
 * with token name / symbol / decimals for display.
 */
export async function fetchHarvesterClaimsPage(
  wallet: Address,
  page: number,
  pageSize: number = HARVESTER_CLAIMS_PAGE_SIZE,
  totalOverride?: number,
): Promise<{
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  claims: HarvesterClaimDisplay[];
}> {
  const total =
    typeof totalOverride === "number" && totalOverride >= 0
      ? totalOverride
      : await fetchHarvesterUserClaimsCount(wallet);

  if (total === 0) {
    return { total: 0, page: 0, pageSize, pageCount: 0, claims: [] };
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const { start, count } = harvesterClaimsPageRange(total, safePage, pageSize);
  if (count === 0) {
    return { total, page: safePage, pageSize, pageCount, claims: [] };
  }

  const batch = await fetchHarvesterUserClaims(wallet, start, count);
  // Storage is oldest→newest; reverse so the page shows newest first (chronological desc).
  const ordered = [...batch].reverse();

  const uniqueTokens = [
    ...new Set(ordered.map((c) => c.token.toLowerCase())),
  ] as string[];

  const metaByToken = new Map<string, { name: string; symbol: string; decimals: number }>();
  await Promise.all(
    uniqueTokens.map(async (key) => {
      const addr = ordered.find((c) => c.token.toLowerCase() === key)?.token;
      if (!addr) return;
      try {
        const meta = await readRewardTokenMeta(addr);
        metaByToken.set(key, meta);
      } catch (err) {
        console.error("token meta for claim failed", key, err);
        metaByToken.set(key, { name: "Unknown", symbol: "???", decimals: 18 });
      }
    }),
  );

  const claims: HarvesterClaimDisplay[] = ordered.map((claim) => {
    const meta = metaByToken.get(claim.token.toLowerCase()) ?? {
      name: "Unknown",
      symbol: "???",
      decimals: 18,
    };
    let amountBi = 0n;
    try {
      amountBi = BigInt(claim.amount);
    } catch {
      amountBi = 0n;
    }
    return {
      ...claim,
      name: meta.name,
      symbol: meta.symbol,
      decimals: meta.decimals,
      displayAmount: formatTokenAmountThousands(amountBi, meta.decimals),
    };
  });

  return { total, page: safePage, pageSize, pageCount, claims };
}

export interface HarvesterDepositReadiness {
  depositAmount: bigint;
  pennyToken: Address;
  pennyDecimals: number;
  ethBalance: bigint;
  pennyBalance: bigint;
  allowance: bigint;
  gasPrice: bigint;
  ethGasReserve: bigint;
  mintFee: bigint;
  requiredAmount: bigint;
  ethNeeded: bigint;
  needsApproval: boolean;
  hasEnoughPenny: boolean;
  hasEnoughGas: boolean;
  canDeposit: boolean;
  paused: boolean;
  subscriptions: Address[];
  maxStreams: number;
  nftId: bigint;
  expectedTxCount: number;
}

/**
 * Max reward streams for the designated NFT in the user's basket.
 * - No usable NFT → standard access: 1 stream, nftId 0 (Harvester getPlayer fallback).
 * - preferredNftId when still owned → that NFT's LISTS.
 * - Otherwise → highest LISTS in basket.
 */
export function resolveMaxRewardStreams(
  ownedNfts: Array<{ ID: bigint; LISTS: bigint; BLACKLIST: boolean }>,
  preferredNftId?: bigint | null,
): { maxStreams: number; nftId: bigint } {
  const usable = ownedNfts.filter((n) => !n.BLACKLIST);
  if (usable.length === 0) {
    return { maxStreams: 1, nftId: 0n };
  }

  if (preferredNftId !== undefined && preferredNftId !== null) {
    const match = usable.find((n) => n.ID === preferredNftId);
    if (match) {
      return { maxStreams: Math.max(1, Number(match.LISTS)), nftId: match.ID };
    }
  }

  const best = usable.reduce((a, b) => (b.LISTS > a.LISTS ? b : a));
  return { maxStreams: Math.max(1, Number(best.LISTS)), nftId: best.ID };
}

/**
 * Pre-flight for farm deposit: PENNY balance, gas, allowance, PoA mintFee/requiredAmount context.
 * @param expectedTxCount 1–3 (approve / subscribe / deposit steps that need gas)
 */
export async function checkHarvesterDepositReadiness(
  wallet: Address,
  depositAmount: bigint,
  options?: {
    ownedNfts?: Array<{ ID: bigint; LISTS: bigint; BLACKLIST: boolean }>;
    preferredNftId?: bigint | null;
    /** Override expected wallet confirmations for gas reserve (default 3) */
    expectedTxCount?: number;
  },
): Promise<HarvesterDepositReadiness> {
  const harvester = getHarvesterAddress();
  if (!harvester) {
    throw new Error("Harvester contract is not deployed on this network yet");
  }
  if (depositAmount <= 0n) {
    throw new Error("Enter an amount greater than zero to farm");
  }

  const client_ = getPublicClient();
  const pennyToken = await resolvePennyTokenAddress();
  const { maxStreams, nftId } = resolveMaxRewardStreams(
    options?.ownedNfts ?? [],
    options?.preferredNftId,
  );

  // PoA mintFee / requiredAmount for gas guidance (same network context as mint)
  let mintFee = PROOF_OF_ACCESS_DEFAULTS.mintFee;
  let requiredAmount = PROOF_OF_ACCESS_DEFAULTS.requiredAmount;
  const poa = getProofOfAccessAddress();
  if (poa) {
    try {
      const [fee, req] = await Promise.all([
        client_.readContract({
          address: poa,
          abi: proofOfAccessABI,
          functionName: "mintFee",
        }) as Promise<bigint>,
        client_.readContract({
          address: poa,
          abi: proofOfAccessABI,
          functionName: "requiredAmount",
        }) as Promise<bigint>,
      ]);
      mintFee = fee;
      requiredAmount = req;
    } catch {
      /* keep defaults */
    }
  }

  const [ethBalance, pennyBalance, allowance, gasPrice, pennyDecimals, paused, subs] =
    await Promise.all([
      client_.getBalance({ address: wallet }),
      readTokenBalance(pennyToken, wallet),
      readTokenAllowance(pennyToken, wallet, harvester),
      client_.getGasPrice(),
      readTokenDecimals(pennyToken),
      client_.readContract({
        address: harvester,
        abi: harvesterABI,
        functionName: "paused",
      }) as Promise<boolean>,
      fetchUserSubscriptions(wallet),
    ]);

  if (paused) {
    throw new Error("Harvester is paused");
  }

  const expectedTxCount = Math.max(1, Math.min(3, options?.expectedTxCount ?? 3));
  const ethGasReserve =
    gasPrice * HARVESTER_FARM_DEFAULTS.gasUnitsPerTx * BigInt(expectedTxCount);
  // Include PoA mintFee as a conservative native buffer (user asked to read mintFee for gas checks)
  const ethNeeded = mintFee + ethGasReserve;
  const needsApproval = allowance < depositAmount;
  const hasEnoughPenny = pennyBalance >= depositAmount;
  const hasEnoughGas = ethBalance >= ethNeeded;

  return {
    depositAmount,
    pennyToken,
    pennyDecimals,
    ethBalance,
    pennyBalance,
    allowance,
    gasPrice,
    ethGasReserve,
    mintFee,
    requiredAmount,
    ethNeeded,
    needsApproval,
    hasEnoughPenny,
    hasEnoughGas,
    canDeposit: hasEnoughPenny && hasEnoughGas && !paused,
    paused,
    subscriptions: subs.tokens,
    maxStreams,
    nftId,
    expectedTxCount,
  };
}

/** Approve PENNY for the Harvester spender. */
export const preparePennyApproveForHarvester = (amount: bigint, pennyAddress?: Address) => {
  const network = getCurrentNetwork();
  const penny = (pennyAddress || (network.penny_address as Address)) as Address;
  const spender = getHarvesterAddress();
  if (!spender) throw new Error("Harvester not deployed on this network");
  if (!penny || penny === ZERO_ADDRESS) throw new Error("PENNY token not configured");

  const tokenContract = getContract({
    client,
    chain: getThirdwebNetwork(),
    address: getAddress(penny),
  });

  return prepareContractCall({
    contract: tokenContract,
    method: "function approve(address spender, uint256 amount) external returns (bool)",
    params: [getAddress(spender), amount],
  });
};

/**
 * Normalize reward-token addresses for Harvester.subscribeToToken(_newTokens, _nft):
 * - Must be valid 20-byte hex addresses
 * - EIP-55 checksum via getAddress (ABI-safe address format)
 * - Case-insensitive dedupe (contract reverts: "Duplicate token in array")
 */
export function normalizeRewardTokenAddresses(tokens: readonly string[]): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];

  for (const raw of tokens) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed || !isAddress(trimmed)) {
      throw new Error(`Invalid reward token address: ${raw}`);
    }
    // getAddress checksums; zero address is allowed if used as a stream id
    const checksummed = getAddress(trimmed);
    const key = checksummed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(checksummed);
  }

  if (out.length === 0) {
    throw new Error("Select at least one reward stream address");
  }
  return out;
}

/**
 * Build args for Harvester.subscribeToToken(address[] _newTokens, uint256 _nft).
 *
 * @_newTokens checksummed reward-token contract addresses (from whitelist / custom)
 * @_nft minted ProofOfAccess ERC-721 tokenId (Player.ID). Use 0n when user has no NFT
 *       (standard access → getPlayer falls back to 1 stream).
 */
export function buildSubscribeToTokenArgs(
  tokens: readonly string[],
  nftTokenId: bigint | number | string,
): { newTokens: Address[]; nftTokenId: bigint } {
  const newTokens = normalizeRewardTokenAddresses(tokens);
  let nft: bigint;
  try {
    nft = typeof nftTokenId === "bigint" ? nftTokenId : BigInt(nftTokenId);
  } catch {
    throw new Error(`Invalid NFT tokenId for subscribeToToken: ${String(nftTokenId)}`);
  }
  if (nft < 0n) {
    throw new Error("NFT tokenId cannot be negative");
  }
  return { newTokens, nftTokenId: nft };
}

/**
 * Prepare Harvester.subscribeToToken.
 * @param tokens reward stream token contract addresses
 * @param nftTokenId minted PoA NFT tokenId (Player.ID / ERC721 tokenId), or 0n for standard
 */
export const prepareSubscribeToToken = (
  tokens: readonly string[],
  nftTokenId: bigint | number | string,
) => {
  const { newTokens, nftTokenId: nft } = buildSubscribeToTokenArgs(tokens, nftTokenId);

  // Human-readable signature without storage keywords — matches Harvester ABI:
  // subscribeToToken(address[] _newTokens, uint256 _nft)
  return prepareContractCall({
    contract: getHarvesterContract(),
    method: "function subscribeToToken(address[] _newTokens, uint256 _nft) external",
    params: [newTokens, nft],
  });
};

export const prepareHarvesterDeposit = (amount: bigint) => {
  return prepareContractCall({
    contract: getHarvesterContract(),
    method: "function deposit(uint256 _amount) public",
    params: [amount],
  });
};

/** Case-insensitive set equality for token address lists (order does not matter). */
export function addressesEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = a.map((x) => x.toLowerCase()).sort();
  const setB = b.map((x) => x.toLowerCase()).sort();
  return setA.every((v, i) => v === setB[i]);
}

/**
 * Plan wallet steps for a farm deposit.
 * - needsApproval only when on-chain allowance < deposit (extra pre-approval is fine)
 * - needsSubscribe when prior list is empty OR selected list differs from on-chain
 * - deposit always required for farmDeposit
 */
export function planFarmDepositSteps(options: {
  allowance: bigint;
  depositAmount: bigint;
  priorSubscriptions: readonly string[];
  nextSubscriptions: readonly string[];
}): {
  needsApproval: boolean;
  needsSubscribe: boolean;
  needsDeposit: boolean;
  txCount: number;
  stepLabels: string[];
  ctaLabel: string;
} {
  const needsApproval = options.allowance < options.depositAmount;
  let nextNormalized: Address[] = [];
  try {
    nextNormalized = normalizeRewardTokenAddresses(options.nextSubscriptions);
  } catch {
    nextNormalized = [];
  }
  const priorNormalized = (options.priorSubscriptions ?? [])
    .filter((a) => isAddress(String(a).trim()))
    .map((a) => getAddress(String(a).trim()));

  const needsSubscribe =
    nextNormalized.length > 0 &&
    (priorNormalized.length === 0 || !addressesEqual(priorNormalized, nextNormalized));

  const needsDeposit = options.depositAmount > 0n;
  const stepLabels: string[] = [];
  if (needsApproval) stepLabels.push("approve");
  if (needsSubscribe) stepLabels.push("subscribe");
  if (needsDeposit) stepLabels.push("deposit");

  const txCount = stepLabels.length;
  let ctaLabel = "Confirm Deposit";
  if (needsApproval && needsSubscribe) ctaLabel = "Approve, Subscribe & Deposit";
  else if (needsApproval) ctaLabel = "Approve & Deposit";
  else if (needsSubscribe) ctaLabel = "Subscribe & Deposit";
  else ctaLabel = "Deposit";

  return { needsApproval, needsSubscribe, needsDeposit, txCount, stepLabels, ctaLabel };
}

export type HarvesterFarmStep =
  | "idle"
  | "checking"
  | "approving"
  | "subscribing"
  | "depositing";

export interface FarmDepositResult {
  depositResult: unknown;
  didApprove: boolean;
  didSubscribe: boolean;
  newTokens: Address[];
  nftTokenId: bigint;
  allowanceBefore: bigint;
}

/**
 * Hook: approve PENNY (only if allowance < amount) →
 * subscribeToToken (only if streams empty/changed) → deposit.
 *
 * Pre-approved wallets (allowance ≥ deposit) skip approve.
 * Stream list changes always trigger subscribe before deposit.
 */
export const useHarvesterFarm = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const farmDeposit = async (options: {
    wallet: Address;
    amount: bigint;
    /** Final reward stream list chosen in the subscription dialog */
    selectedTokens: Address[];
    nftId: bigint;
    readiness?: HarvesterDepositReadiness;
    onStep?: (step: HarvesterFarmStep, detail?: string) => void;
  }): Promise<FarmDepositResult> => {
    options.onStep?.("checking", "Checking balances, allowance, and streams…");

    const harvester = getHarvesterAddress();
    if (!harvester) throw new Error("Harvester not deployed on this network yet");

    // Fresh on-chain reads so we never skip/force steps from stale dialog state
    const pennyToken =
      options.readiness?.pennyToken ?? (await resolvePennyTokenAddress());
    const [freshAllowance, freshSubs, pennyBalance, ethBalance, gasPrice, pennyDecimals, paused] =
      await Promise.all([
        readTokenAllowance(pennyToken, options.wallet, harvester),
        fetchUserSubscriptions(options.wallet),
        readTokenBalance(pennyToken, options.wallet),
        getPublicClient().getBalance({ address: options.wallet }),
        getPublicClient().getGasPrice(),
        options.readiness?.pennyDecimals
          ? Promise.resolve(options.readiness.pennyDecimals)
          : readTokenDecimals(pennyToken),
        getPublicClient().readContract({
          address: harvester,
          abi: harvesterABI,
          functionName: "paused",
        }) as Promise<boolean>,
      ]);

    if (paused) throw new Error("Harvester is paused");
    if (options.amount <= 0n) throw new Error("Enter an amount greater than zero to farm");
    if (pennyBalance < options.amount) {
      throw new Error(
        `Not enough PENNY. Need ${formatCompactTokenAmount(options.amount, pennyDecimals)} PENNY to deposit.`,
      );
    }

    const { newTokens, nftTokenId } = buildSubscribeToTokenArgs(
      options.selectedTokens,
      options.nftId,
    );
    const maxStreams = options.readiness?.maxStreams ?? newTokens.length;
    if (newTokens.length > maxStreams) {
      throw new Error(`Too many reward streams. Your pass allows up to ${maxStreams}.`);
    }

    // allowance ≥ deposit → skip approve (wallets often pre-approve more than needed)
    const plan = planFarmDepositSteps({
      allowance: freshAllowance,
      depositAmount: options.amount,
      priorSubscriptions: freshSubs.tokens,
      nextSubscriptions: newTokens,
    });

    if (newTokens.length === 0) {
      throw new Error("Select at least one reward stream to subscribe to");
    }

    // Rough gas check based on actual planned txs
    const mintFee = options.readiness?.mintFee ?? PROOF_OF_ACCESS_DEFAULTS.mintFee;
    const ethGasReserve =
      gasPrice * HARVESTER_FARM_DEFAULTS.gasUnitsPerTx * BigInt(Math.max(1, plan.txCount));
    const ethNeeded = mintFee + ethGasReserve;
    if (ethBalance < ethNeeded) {
      throw new Error(
        `Not enough ${getCurrentNetwork().symbol} for gas (${plan.stepLabels.join(" → ")}). Keep a little extra.`,
      );
    }

    // 1) Approve only when current allowance is below the deposit amount
    let didApprove = false;
    if (plan.needsApproval) {
      options.onStep?.(
        "approving",
        `Approve ${formatCompactTokenAmount(options.amount, pennyDecimals)} PENNY for Harvester…`,
      );
      const approveTx = preparePennyApproveForHarvester(options.amount, pennyToken);
      const approveResult = await sendTx(approveTx);
      await waitForReceipt({
        client,
        chain: getThirdwebNetwork(),
        transactionHash: approveResult.transactionHash,
      });
      didApprove = true;
    } else {
      options.onStep?.(
        "checking",
        `Pre-approved ${formatCompactTokenAmount(freshAllowance, pennyDecimals)} PENNY — skipping approve…`,
      );
    }

    // 2) Subscribe whenever list is new or differs from on-chain prior list
    let didSubscribe = false;
    if (plan.needsSubscribe) {
      options.onStep?.(
        "subscribing",
        `Confirm ${newTokens.length} reward stream${newTokens.length === 1 ? "" : "s"} (NFT #${nftTokenId.toString()})…`,
      );
      const subTx = prepareSubscribeToToken(newTokens, nftTokenId);
      const subResult = await sendTx(subTx);
      await waitForReceipt({
        client,
        chain: getThirdwebNetwork(),
        transactionHash: subResult.transactionHash,
      });
      didSubscribe = true;
    }

    // 3) Deposit always
    options.onStep?.(
      "depositing",
      `Deposit ${formatCompactTokenAmount(options.amount, pennyDecimals)} PENNY…`,
    );
    const depositTx = prepareHarvesterDeposit(options.amount);
    const depositResult = await sendTx(depositTx);
    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
      transactionHash: depositResult.transactionHash,
    });

    options.onStep?.("idle", "Deposit complete");
    return {
      depositResult,
      didApprove,
      didSubscribe,
      newTokens,
      nftTokenId,
      allowanceBefore: freshAllowance,
    };
  };

  /**
   * Update reward streams only (subscribeToToken) — no deposit.
   * Used by the animated subscription button outside of farm flow.
   */
  const updateSubscriptions = async (options: {
    tokens: Address[];
    nftId: bigint;
    maxStreams: number;
    onStep?: (step: HarvesterFarmStep, detail?: string) => void;
  }) => {
    if (options.tokens.length === 0) {
      throw new Error("Select at least one reward stream");
    }
    if (options.tokens.length > options.maxStreams) {
      throw new Error(`Max ${options.maxStreams} reward stream(s) for your pass`);
    }
    if (!getHarvesterAddress()) {
      throw new Error("Harvester not deployed on this network yet");
    }

    const { newTokens, nftTokenId } = buildSubscribeToTokenArgs(options.tokens, options.nftId);
    if (newTokens.length > options.maxStreams) {
      throw new Error(`Max ${options.maxStreams} reward stream(s) for your pass`);
    }

    options.onStep?.(
      "subscribing",
      `Confirm subscription list (NFT tokenId ${nftTokenId.toString()})…`,
    );
    const subTx = prepareSubscribeToToken(newTokens, nftTokenId);
    const subResult = await sendTx(subTx);
    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
      transactionHash: subResult.transactionHash,
    });
    options.onStep?.("idle", "Subscriptions updated");
    return subResult;
  };

  /**
   * Full unstake via Harvester.withdraw() — only after entryMap + timeLock.
   */
  const farmWithdraw = async (options?: {
    onStep?: (step: "checking" | "withdrawing" | "idle", detail?: string) => void;
  }) => {
    if (!getHarvesterAddress()) {
      throw new Error("Harvester not deployed on this network yet");
    }
    options?.onStep?.("checking", "Checking withdraw timelock…");
    options?.onStep?.("withdrawing", "Confirm withdraw in your wallet…");
    const tx = prepareHarvesterWithdraw();
    const result = await sendTx(tx);
    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
      transactionHash: result.transactionHash,
    });
    options?.onStep?.("idle", "Withdraw complete");
    return result;
  };

  /**
   * Claim rewards for selected pay-token addresses via Harvester.claim(address[]).
   * Contract skips tokens still under per-token claim timelock or with zero rewards.
   */
  const farmClaim = async (options: {
    tokens: Address[];
    onStep?: (step: "checking" | "claiming" | "idle", detail?: string) => void;
  }) => {
    if (!getHarvesterAddress()) {
      throw new Error("Harvester not deployed on this network yet");
    }
    const tokens = normalizeRewardTokenAddresses(options.tokens);
    if (tokens.length === 0) {
      throw new Error("Select at least one reward stream to claim");
    }
    options.onStep?.(
      "claiming",
      `Claiming ${tokens.length} reward stream${tokens.length === 1 ? "" : "s"}…`,
    );
    const tx = prepareHarvesterClaim(tokens);
    const result = await sendTx(tx);
    await waitForReceipt({
      client,
      chain: getThirdwebNetwork(),
      transactionHash: result.transactionHash,
    });
    options.onStep?.("idle", "Claim complete");
    return result;
  };

  return { farmDeposit, updateSubscriptions, farmWithdraw, farmClaim, isPending, error };
};

// ============================================================================
// Harvester withdraw (timelock) + claim (reward streams)
// ============================================================================

/** Matches Harvester.divisor = 100 ether — rewardsOwed is scaled by this before payout. */
export const HARVESTER_REWARD_DIVISOR = 100n * 10n ** 18n;

export interface HarvesterWithdrawTimelock {
  entryTimestamp: number;
  timeLockSeconds: number;
  unlockAt: number;
  canWithdraw: boolean;
  stakedBalance: bigint;
  remainingSeconds: number;
  deployed: boolean;
}

/**
 * Read entryMap + timeLock for withdraw UI countdown.
 * Unlock when block.timestamp > entryMap + timeLock (contract: onlyAfterTimelock).
 */
export async function fetchWithdrawTimelock(wallet: Address): Promise<HarvesterWithdrawTimelock> {
  const harvester = getHarvesterAddress();
  const empty: HarvesterWithdrawTimelock = {
    entryTimestamp: 0,
    timeLockSeconds: 0,
    unlockAt: 0,
    canWithdraw: false,
    stakedBalance: 0n,
    remainingSeconds: 0,
    deployed: false,
  };
  if (!harvester) return empty;

  const client_ = getPublicClient();
  try {
    const [entryMap, timeLock, stakedBalance] = await Promise.all([
      client_.readContract({
        address: harvester,
        abi: harvesterABI,
        functionName: "entryMap",
        args: [wallet],
      }) as Promise<bigint>,
      client_.readContract({
        address: harvester,
        abi: harvesterABI,
        functionName: "timeLock",
      }) as Promise<bigint>,
      client_.readContract({
        address: harvester,
        abi: harvesterABI,
        functionName: "balances",
        args: [wallet],
      }) as Promise<bigint>,
    ]);

    const entryTimestamp = Number(entryMap ?? 0n);
    const timeLockSeconds = Number(timeLock ?? 0n);
    // Contract onlyAfterTimelock: entryMap + timeLock < block.timestamp (strict)
    const lockedUntil =
      entryTimestamp > 0 && (stakedBalance ?? 0n) > 0n
        ? entryTimestamp + timeLockSeconds
        : 0;
    const now = Math.floor(Date.now() / 1000);
    const canWithdraw =
      (stakedBalance ?? 0n) > 0n && entryTimestamp > 0 && now > lockedUntil;
    // +1 so remaining hits 0 only when now is strictly past lockedUntil
    const remainingSeconds =
      lockedUntil > 0 && now <= lockedUntil ? lockedUntil - now + 1 : 0;

    return {
      entryTimestamp,
      timeLockSeconds,
      unlockAt: lockedUntil,
      canWithdraw,
      stakedBalance: stakedBalance ?? 0n,
      remainingSeconds,
      deployed: true,
    };
  } catch (err) {
    console.error("fetchWithdrawTimelock failed", err);
    return empty;
  }
}

export interface ClaimableRewardStream {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  /** On-chain claimRewards.rewardsOwed bucket (pre-sync, scaled). */
  rewardsOwedRaw: bigint;
  /** Simulated rewardsOwed after setTokenEra + era accrual at `estimatedAt`. */
  estimatedRewardsOwedRaw: bigint;
  /** Pending accrual added on top of the stored bucket (scaled). */
  pendingAccruedRaw: bigint;
  /**
   * Estimated token smallest units the user would receive if they claimed now
   * (after developTax, / divisor) — mirrors Harvester.claim payout.
   */
  claimableAmount: bigint;
  /** Full-precision display (token decimals, last wei/cent). */
  claimableDisplay: string;
  lastClaimAt: number;
  claimUnlockAt: number;
  isClaimLocked: boolean;
  /** User still has active PENNY weight on this stream */
  pennySent: bigint;
  eraAtBlock: bigint;
  onChainCurrentERA: bigint;
  simulatedCurrentERA: bigint;
  rewardPerStamp: bigint;
  /** Unix seconds used for this estimate (present-day timestamp). */
  estimatedAt: number;
  /** True when era loop ran (requires active global stake). */
  eraMathApplied: boolean;
  /** Eras walked in this estimate [eraAtBlock, simulatedCurrentERA). */
  erasProcessed: number;
}

export interface UserRewardStreamsSnapshot {
  wallet: Address;
  /** Harvester.balances[user] — gate for era math */
  stakedBalance: bigint;
  hasActiveStake: boolean;
  subscriptions: Address[];
  globals: HarvesterRewardGlobals;
  streams: ClaimableRewardStream[];
  estimatedAt: number;
  /** Fresh on-chain read always; era multicalls only when hasActiveStake */
  computationMode: "full_era_math" | "idle_no_stake" | "no_streams";
}

/**
 * Full ERC20 meta including decimals.
 * Zero-address (native stream): always 18 decimals; name from network whitelist;
 * symbol = network native symbol.
 */
export async function readRewardTokenMeta(
  tokenAddress: Address,
): Promise<{ name: string; symbol: string; decimals: number }> {
  // Harvester treats address(0) as native coin — always 18 decimals (wei)
  if (isZeroAddress(tokenAddress) || !tokenAddress) {
    const network = getCurrentNetwork();
    const whitelistName = getTokenName(network.chainId, ZERO_ADDRESS);
    return {
      name: whitelistName || `Native ${network.symbol}`,
      symbol: network.symbol || "ETH",
      decimals: 18,
    };
  }
  const [name, symbol, decimals] = await Promise.all([
    readTokenName(tokenAddress),
    readTokenSymbol(tokenAddress),
    readTokenDecimals(tokenAddress),
  ]);
  return { name, symbol, decimals: Number.isFinite(decimals) ? decimals : 18 };
}

/**
 * Convert Harvester rewardsOwed (scaled by divisor) → token smallest units (pre-tax).
 * Matches claim: rewards = estimatedRewards / divisor.
 */
export function rewardsOwedToTokenAmount(rewardsOwed: bigint): bigint {
  if (rewardsOwed <= 0n) return 0n;
  return rewardsOwed / HARVESTER_REWARD_DIVISOR;
}

/**
 * Format claimable / reward amounts for UI.
 * Delegates to formatTokenAmountThousands (thousands separators + smart decimals).
 */
export function formatExactTokenAmount(amount: bigint, decimals: number): string {
  return formatTokenAmountThousands(amount, decimals);
}

/**
 * Mirror Harvester.setTokenEra at `now`:
 *   totalDaysElapsed = (now - startTime) / eralength
 *   if totalDaysElapsed > currentERA → currentERA becomes totalDaysElapsed
 * Completed eras [oldERA, newERA) would be sealed with rewardPerStamp.
 */
export function simulateSetTokenEra(params: {
  isAdded: boolean;
  startTime: bigint;
  currentERA: bigint;
  eralength: bigint;
  nowSeconds: bigint;
}): { endPeriod: bigint; erasAdvanced: bigint } {
  if (!params.isAdded || params.eralength <= 0n) {
    return { endPeriod: params.currentERA, erasAdvanced: 0n };
  }
  if (params.nowSeconds < params.startTime) {
    return { endPeriod: params.currentERA, erasAdvanced: 0n };
  }
  const totalDaysElapsed = (params.nowSeconds - params.startTime) / params.eralength;
  if (totalDaysElapsed > params.currentERA) {
    return {
      endPeriod: totalDaysElapsed,
      erasAdvanced: totalDaysElapsed - params.currentERA,
    };
  }
  return { endPeriod: params.currentERA, erasAdvanced: 0n };
}

/**
 * Mirror Harvester._processSingleTokenClaim accrual loop (without writing state):
 *   for e in [eraAtBlock, endPeriod): rewardsAccrued += eraRate(e) * PENNYSent
 * Historical e < onChainCurrentERA → stored eraRewards[e]
 * Future/unfinalized e ≥ onChainCurrentERA → current rewardPerStamp (setTokenEra seal)
 */
export function simulateProcessRewardsOwed(params: {
  storedRewardsOwed: bigint;
  pennySent: bigint;
  eraAtBlock: bigint;
  onChainCurrentERA: bigint;
  endPeriod: bigint;
  rewardPerStamp: bigint;
  /** era index → stored eraRewards rate (only needed for e < onChainCurrentERA) */
  historicalEraRate: (era: bigint) => bigint;
}): { estimatedRewardsOwed: bigint; pendingAccrued: bigint; erasProcessed: number } {
  if (params.pennySent === 0n || params.eraAtBlock >= params.endPeriod) {
    return {
      estimatedRewardsOwed: params.storedRewardsOwed,
      pendingAccrued: 0n,
      erasProcessed: 0,
    };
  }

  let pendingAccrued = 0n;
  let erasProcessed = 0;
  for (let e = params.eraAtBlock; e < params.endPeriod; e++) {
    const rate =
      e < params.onChainCurrentERA
        ? params.historicalEraRate(e)
        : params.rewardPerStamp;
    pendingAccrued += rate * params.pennySent;
    erasProcessed += 1;
  }

  return {
    estimatedRewardsOwed: params.storedRewardsOwed + pendingAccrued,
    pendingAccrued,
    erasProcessed,
  };
}

/**
 * Mirror Harvester.claim payout math after rewardsOwed is synced:
 *   developed = (userRewards / 100) * developTax
 *   rewards   = (userRewards - developed) / divisor
 */
export function simulateClaimPayout(
  rewardsOwedScaled: bigint,
  developTax: bigint,
): bigint {
  if (rewardsOwedScaled <= 0n) return 0n;
  const tax = developTax < 0n ? 0n : developTax;
  const developed = (rewardsOwedScaled / 100n) * tax;
  const estimated = rewardsOwedScaled - developed;
  if (estimated <= 0n) return 0n;
  return estimated / HARVESTER_REWARD_DIVISOR;
}

function normalizePayTokenAddress(raw: string): Address {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || isZeroAddress(trimmed as Address)) return ZERO_ADDRESS;
  if (!isAddress(trimmed)) {
    throw new Error(`Invalid reward token address: ${raw}`);
  }
  return getAddress(trimmed) as Address;
}

/** Batch-read eraRewards[token][era] for a contiguous range (multicall, always fresh). */
async function fetchHistoricalEraRewards(
  harvester: Address,
  token: Address,
  fromEra: bigint,
  toEraExclusive: bigint,
): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>();
  if (fromEra >= toEraExclusive) return map;

  const client_ = getPublicClient();
  const eras: bigint[] = [];
  for (let e = fromEra; e < toEraExclusive; e++) {
    eras.push(e);
  }

  // Chunk to keep multicall payloads reasonable
  const CHUNK = 80;
  for (let i = 0; i < eras.length; i += CHUNK) {
    const slice = eras.slice(i, i + CHUNK);
    try {
      const results = await client_.multicall({
        contracts: slice.map((era) => ({
          address: harvester,
          abi: harvesterABI,
          functionName: "eraRewards" as const,
          args: [token, era] as const,
        })),
        allowFailure: true,
      });
      results.forEach((res, idx) => {
        const era = slice[idx];
        const key = era.toString();
        if (res.status === "success" && res.result != null) {
          map.set(key, res.result as bigint);
        } else {
          map.set(key, 0n);
        }
      });
    } catch (err) {
      console.error("fetchHistoricalEraRewards multicall failed", err);
      // Fallback sequential
      await Promise.all(
        slice.map(async (era) => {
          try {
            const rate = (await client_.readContract({
              address: harvester,
              abi: harvesterABI,
              functionName: "eraRewards",
              args: [token, era],
            })) as bigint;
            map.set(era.toString(), rate ?? 0n);
          } catch {
            map.set(era.toString(), 0n);
          }
        }),
      );
    }
  }

  return map;
}

export interface HarvesterRewardGlobals {
  eralength: bigint;
  developTax: bigint;
  timeLock: bigint;
  duration: bigint;
  paused: boolean;
}

/** Always re-read mutable protocol params (owner can change tax, timeLock, etc.). */
export async function fetchHarvesterRewardGlobals(
  harvester: Address,
): Promise<HarvesterRewardGlobals> {
  const client_ = getPublicClient();
  const [eralength, developTax, timeLock, duration, paused] = await Promise.all([
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "eralength",
    }) as Promise<bigint>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "developTax",
    }) as Promise<bigint>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "timeLock",
    }) as Promise<bigint>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "Duration",
    }) as Promise<bigint>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "paused",
    }) as Promise<boolean>,
  ]);
  return {
    eralength: eralength ?? 86400n,
    developTax: developTax ?? 0n,
    timeLock: timeLock ?? 86400n,
    duration: duration ?? 604800n,
    paused: Boolean(paused),
  };
}

type StreamOnChainBundle = {
  address: Address;
  eraAtBlock: bigint;
  storedRewardsOwed: bigint;
  pennySent: bigint;
  lastClaimAt: bigint;
  totalRewards: bigint;
  allRewardsOwed: bigint;
  rewardPerStamp: bigint;
  onChainCurrentERA: bigint;
  tokenStartTime: bigint;
  isAdded: boolean;
  tokenTotalStaked: bigint;
  meta: { name: string; symbol: string; decimals: number };
};

/**
 * Fresh multicall-style read of everything needed for one stream estimate.
 * No caching — safe to call on every staking page load.
 */
async function readStreamOnChainBundle(
  harvester: Address,
  wallet: Address,
  token: Address,
): Promise<StreamOnChainBundle> {
  const address = normalizePayTokenAddress(token);
  const client_ = getPublicClient();

  const [claimTuple, lastClaim, ecoTuple, tokenTotalStaked, meta] = await Promise.all([
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "claimRewards",
      args: [wallet, address],
    }) as Promise<readonly [bigint, bigint, bigint]>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "UserTokenClaims",
      args: [wallet, address],
    }) as Promise<bigint>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "tokenEconomics",
      args: [address],
    }) as Promise<readonly [bigint, bigint, bigint, bigint, bigint, boolean]>,
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "tokenTotalStaked",
      args: [address],
    }) as Promise<bigint>,
    readRewardTokenMeta(address),
  ]);

  return {
    address,
    eraAtBlock: claimTuple?.[0] ?? 0n,
    storedRewardsOwed: claimTuple?.[1] ?? 0n,
    pennySent: claimTuple?.[2] ?? 0n,
    lastClaimAt: lastClaim ?? 0n,
    totalRewards: ecoTuple?.[0] ?? 0n,
    allRewardsOwed: ecoTuple?.[1] ?? 0n,
    rewardPerStamp: ecoTuple?.[2] ?? 0n,
    onChainCurrentERA: ecoTuple?.[3] ?? 0n,
    tokenStartTime: ecoTuple?.[4] ?? 0n,
    isAdded: Boolean(ecoTuple?.[5]),
    tokenTotalStaked: tokenTotalStaked ?? 0n,
    meta,
  };
}

/**
 * Build a ClaimableRewardStream from a fresh on-chain bundle.
 *
 * @param applyEraMath When false (no active stake), skip eraRewards reads and
 *   only convert the stored rewardsOwed bucket — no staking-time accrual.
 *   When true, walk every stored/pending ERA to the last cent.
 */
function computeStreamEstimateFromBundle(params: {
  bundle: StreamOnChainBundle;
  globals: HarvesterRewardGlobals;
  nowSec: number;
  applyEraMath: boolean;
  historicalEraRate?: (era: bigint) => bigint;
  endPeriod?: bigint;
}): ClaimableRewardStream {
  const { bundle, globals, nowSec, applyEraMath } = params;
  const decimals = isZeroAddress(bundle.address) ? 18 : bundle.meta.decimals;

  let estimatedRewardsOwed = bundle.storedRewardsOwed;
  let pendingAccrued = 0n;
  let erasProcessed = 0;
  let endPeriod = bundle.onChainCurrentERA;
  let eraMathApplied = false;

  if (applyEraMath) {
    endPeriod =
      params.endPeriod ??
      simulateSetTokenEra({
        isAdded: bundle.isAdded,
        startTime: bundle.tokenStartTime,
        currentERA: bundle.onChainCurrentERA,
        eralength: globals.eralength,
        nowSeconds: BigInt(nowSec),
      }).endPeriod;

    const rateFn =
      params.historicalEraRate ??
      ((_era: bigint) => 0n);

    const sim = simulateProcessRewardsOwed({
      storedRewardsOwed: bundle.storedRewardsOwed,
      // Accrual weight is the stream snapshot; global stake is the gate only
      pennySent: bundle.pennySent,
      eraAtBlock: bundle.eraAtBlock,
      onChainCurrentERA: bundle.onChainCurrentERA,
      endPeriod,
      rewardPerStamp: bundle.rewardPerStamp,
      historicalEraRate: rateFn,
    });
    estimatedRewardsOwed = sim.estimatedRewardsOwed;
    pendingAccrued = sim.pendingAccrued;
    erasProcessed = sim.erasProcessed;
    eraMathApplied = true;
  }

  const claimableAmount = simulateClaimPayout(
    estimatedRewardsOwed,
    globals.developTax,
  );

  const lastClaimAt = Number(bundle.lastClaimAt);
  const timeLockSeconds = Number(globals.timeLock);
  const claimUnlockAt = lastClaimAt > 0 ? lastClaimAt + timeLockSeconds : 0;
  const isClaimLocked = claimUnlockAt > 0 && nowSec < claimUnlockAt;

  return {
    address: bundle.address,
    name: bundle.meta.name,
    symbol: bundle.meta.symbol,
    decimals,
    rewardsOwedRaw: bundle.storedRewardsOwed,
    estimatedRewardsOwedRaw: estimatedRewardsOwed,
    pendingAccruedRaw: pendingAccrued,
    claimableAmount,
    claimableDisplay: formatExactTokenAmount(claimableAmount, decimals),
    lastClaimAt,
    claimUnlockAt,
    isClaimLocked,
    pennySent: bundle.pennySent,
    eraAtBlock: bundle.eraAtBlock,
    onChainCurrentERA: bundle.onChainCurrentERA,
    simulatedCurrentERA: endPeriod,
    rewardPerStamp: bundle.rewardPerStamp,
    estimatedAt: nowSec,
    eraMathApplied,
    erasProcessed,
  };
}

/**
 * Full client-side estimate for one stream (always re-reads that stream's state).
 * Prefer `loadUserRewardStreamsSnapshot` on staking page load (batched + stake gate).
 */
export async function estimateTokenClaimReward(params: {
  wallet: Address;
  token: Address;
  nowSeconds?: number;
  globals?: HarvesterRewardGlobals;
  /** When omitted, era math runs only if balances[wallet] > 0 */
  applyEraMath?: boolean;
}): Promise<ClaimableRewardStream | null> {
  const harvester = getHarvesterAddress();
  if (!harvester) return null;

  const nowSec = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const globals = params.globals ?? (await fetchHarvesterRewardGlobals(harvester));
  const bundle = await readStreamOnChainBundle(harvester, params.wallet, params.token);

  let applyEraMath = params.applyEraMath;
  if (applyEraMath === undefined) {
    const stake = (await getPublicClient().readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "balances",
      args: [params.wallet],
    })) as bigint;
    applyEraMath = (stake ?? 0n) > 0n;
  }

  if (!applyEraMath) {
    return computeStreamEstimateFromBundle({
      bundle,
      globals,
      nowSec,
      applyEraMath: false,
    });
  }

  const { endPeriod } = simulateSetTokenEra({
    isAdded: bundle.isAdded,
    startTime: bundle.tokenStartTime,
    currentERA: bundle.onChainCurrentERA,
    eralength: globals.eralength,
    nowSeconds: BigInt(nowSec),
  });

  const histFrom = bundle.eraAtBlock;
  const histTo =
    bundle.eraAtBlock < bundle.onChainCurrentERA && bundle.eraAtBlock < endPeriod
      ? bundle.onChainCurrentERA < endPeriod
        ? bundle.onChainCurrentERA
        : endPeriod
      : bundle.eraAtBlock;

  const historical = await fetchHistoricalEraRewards(
    harvester,
    bundle.address,
    histFrom,
    histTo,
  );

  return computeStreamEstimateFromBundle({
    bundle,
    globals,
    nowSec,
    applyEraMath: true,
    endPeriod,
    historicalEraRate: (era) => historical.get(era.toString()) ?? 0n,
  });
}

/**
 * Master load path for the staking page.
 *
 * 1. Always re-read balances, subscriptions, and mutable globals (tax, timeLock, …).
 * 2. Always re-read each stream’s claimRewards + tokenEconomics + meta.
 * 3. Run stored-era accrual math ONLY when balances[user] > 0 (active stake).
 * 4. Display amounts to the last token unit (full decimals).
 */
export async function loadUserRewardStreamsSnapshot(
  wallet: Address,
): Promise<UserRewardStreamsSnapshot> {
  const harvester = getHarvesterAddress();
  const nowSec = Math.floor(Date.now() / 1000);
  const emptyGlobals: HarvesterRewardGlobals = {
    eralength: 86400n,
    developTax: 0n,
    timeLock: 86400n,
    duration: 604800n,
    paused: false,
  };

  if (!harvester) {
    return {
      wallet,
      stakedBalance: 0n,
      hasActiveStake: false,
      subscriptions: [],
      globals: emptyGlobals,
      streams: [],
      estimatedAt: nowSec,
      computationMode: "no_streams",
    };
  }

  const client_ = getPublicClient();

  // --- Fresh protocol + user stake (params can change over time) ---
  const [stakedBalance, subs, globals] = await Promise.all([
    client_.readContract({
      address: harvester,
      abi: harvesterABI,
      functionName: "balances",
      args: [wallet],
    }) as Promise<bigint>,
    fetchUserSubscriptions(wallet),
    fetchHarvesterRewardGlobals(harvester).catch((err) => {
      console.error("fetchHarvesterRewardGlobals failed", err);
      return emptyGlobals;
    }),
  ]);

  const tokens = subs.tokens;
  const hasActiveStake = (stakedBalance ?? 0n) > 0n;

  if (!tokens.length) {
    return {
      wallet,
      stakedBalance: stakedBalance ?? 0n,
      hasActiveStake,
      subscriptions: [],
      globals,
      streams: [],
      estimatedAt: nowSec,
      computationMode: "no_streams",
    };
  }

  // --- Fresh per-stream contract state ---
  const bundles = await Promise.all(
    tokens.map(async (t) => {
      try {
        return await readStreamOnChainBundle(harvester, wallet, t);
      } catch (err) {
        console.error("readStreamOnChainBundle failed", t, err);
        return null;
      }
    }),
  );

  // --- Era math only with active stake (staking-time accrual) ---
  const streams: ClaimableRewardStream[] = [];

  if (!hasActiveStake) {
    // Still list streams + stored bucket / meta; do not walk eras
    for (const bundle of bundles) {
      if (!bundle) continue;
      streams.push(
        computeStreamEstimateFromBundle({
          bundle,
          globals,
          nowSec,
          applyEraMath: false,
        }),
      );
    }
    return {
      wallet,
      stakedBalance: stakedBalance ?? 0n,
      hasActiveStake: false,
      subscriptions: tokens,
      globals,
      streams,
      estimatedAt: nowSec,
      computationMode: "idle_no_stake",
    };
  }

  for (const bundle of bundles) {
    if (!bundle) continue;
    try {
      const { endPeriod } = simulateSetTokenEra({
        isAdded: bundle.isAdded,
        startTime: bundle.tokenStartTime,
        currentERA: bundle.onChainCurrentERA,
        eralength: globals.eralength,
        nowSeconds: BigInt(nowSec),
      });

      // Every sealed on-chain ERA the user has not yet claimed through
      const histFrom = bundle.eraAtBlock;
      const histTo =
        bundle.eraAtBlock < bundle.onChainCurrentERA && bundle.eraAtBlock < endPeriod
          ? bundle.onChainCurrentERA < endPeriod
            ? bundle.onChainCurrentERA
            : endPeriod
          : bundle.eraAtBlock;

      const historical = await fetchHistoricalEraRewards(
        harvester,
        bundle.address,
        histFrom,
        histTo,
      );

      streams.push(
        computeStreamEstimateFromBundle({
          bundle,
          globals,
          nowSec,
          applyEraMath: true,
          endPeriod,
          historicalEraRate: (era) => historical.get(era.toString()) ?? 0n,
        }),
      );
    } catch (err) {
      console.error("era math failed for stream", bundle.address, err);
      streams.push(
        computeStreamEstimateFromBundle({
          bundle,
          globals,
          nowSec,
          applyEraMath: false,
        }),
      );
    }
  }

  return {
    wallet,
    stakedBalance: stakedBalance ?? 0n,
    hasActiveStake: true,
    subscriptions: tokens,
    globals,
    streams,
    estimatedAt: nowSec,
    computationMode: "full_era_math",
  };
}

/**
 * Load estimated claimable rewards for every subscribed stream.
 * Always hits the chain for current params; era walk only with active stake.
 */
export async function fetchClaimableRewardStreams(
  wallet: Address,
  _subscriptionTokens?: Address[],
): Promise<ClaimableRewardStream[]> {
  // Master path — ignore stale token lists; always re-read subscriptions on-chain
  const snapshot = await loadUserRewardStreamsSnapshot(wallet);
  return snapshot.streams;
}

export const prepareHarvesterWithdraw = () => {
  return prepareContractCall({
    contract: getHarvesterContract(),
    method: "function withdraw() public",
    params: [],
  });
};

export const prepareHarvesterClaim = (payTokens: readonly string[]) => {
  const tokens = normalizeRewardTokenAddresses(payTokens);
  return prepareContractCall({
    contract: getHarvesterContract(),
    method: "function claim(address[] _payTokens) public",
    params: [tokens],
  });
};

/** Human-readable countdown for withdraw / claim locks. */
export function formatDurationCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s <= 0) return "0s";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${String(seconds).padStart(2, "0")}s`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

// Re-export useful viem utilities
export { formatEther, parseEther, parseUnits, ZERO_ADDRESS };
