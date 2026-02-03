import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient, getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { ConnectButton, darkTheme, useSendTransaction } from "thirdweb/react";
import { defineChain, sepolia } from "thirdweb/chains";
import { createPublicClient, http, formatEther, parseEther, type Address, type Abi } from "viem";
import { sepolia as viemSepolia } from "viem/chains";
import { ReactElement } from "react";
import penny4thots from "../abi/penny4thots.json";

const contractABI = penny4thots.abi as Abi;

// ============================================================================
// Types
// ============================================================================

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
  optionA: string;
  aVotes: bigint;
  optionB: string;
  bVotes: bigint;
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
  optionA: string;
  aVotes: number;
  optionB: string;
  bVotes: number;
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
        "farcaster",
        "google",
        "x",
        "telegram",
        "facebook",
        "discord",
        "apple",
        "phone",
        "email",
      ],
    },
  }),
];

// ============================================================================
// Blockchain Configuration
// ============================================================================

export const blockchain = {
  chainId: 11155111,
  rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
  decimals: 18,
  contract_address: '0x826F0F01E41C1AB3dD1b52b7e3662da9702Bb9Ad' as Address,
  symbol: 'ETH',
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
      chain={sepolia}
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
        titleIcon: "/logo-white-no-bkg.png",
        welcomeScreen: {
          title: "Penny4Thots Prediction Markets",
          subtitle: "...if you can think it, it's important.",
          img: {
            src: '/logo-white-no-bkg.png',
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
    optionA: marketData.optionA,
    aVotes: Number(marketData.aVotes),
    optionB: marketData.optionB,
    bVotes: Number(marketData.bVotes),
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

export const readFee = async (): Promise<bigint> => {
  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'fee',
  }) as bigint;

  return result;
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

// Range limit for fetching markets from blockchain
const MARKET_FETCH_LIMIT = 50;

/**
 * Fetch markets from blockchain with a limit of 50 most recent markets
 * Markets are fetched in descending order (newest first)
 * Only fetches MarketInfo (immutable data)
 */
export const fetchMarketsFromBlockchain = async (): Promise<MarketInfoFormatted[]> => {
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

  // When feetype is false (ETH payment), include marketBalance in msg.value
  // When feetype is true (token payment), only include fee
  const msgValue = feetype ? params.fee : params.fee + params.marketBalance;

  return prepareContractCall({
    contract: penny4thotsContract,
    method: "function writeMarket(string[] calldata _info, uint256 _marketBalance, bool _signal, bool _feetype, address _paymentToken) external payable",
    params: [
      infoArray,
      params.marketBalance,
      false, // _signal - initial vote (false = NO, true = YES)
      feetype,
      params.paymentToken || "0x0000000000000000000000000000000000000000" as Address,
    ],
    value: msgValue,
  });
};

// Hook helper for write transactions
export const useWriteMarket = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const writeMarket = async (params: WriteMarketParams) => {
    const transaction = prepareWriteMarket(params);
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
    value: params.feetype ? 0n : params.marketBalance,
  });
};

export const useVote = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const vote = async (params: VoteParams) => {
    const transaction = prepareVote(params);
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

// Re-export useful viem utilities
export { formatEther, parseEther };
