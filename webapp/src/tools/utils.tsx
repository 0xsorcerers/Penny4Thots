import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
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
  creator: Address;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string;
  status: boolean;
  marketBalance: bigint;
}

export interface MarketInfoFormatted {
  indexer: number;
  creator: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string;
  status: boolean;
  marketBalance: string;
}

export interface WriteMarketParams {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string;
  marketBalance: bigint;
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
  contract_address: '0x0217dFf6d795F4BaE2ed7DCEcb922cA65e84a417' as Address,
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

export const readMarket = async (ids: number[]): Promise<MarketInfoFormatted[]> => {
  const uint8Ids = ids.map(id => id);

  const result = await publicClient.readContract({
    address: blockchain.contract_address,
    abi: contractABI,
    functionName: 'readMarket',
    args: [uint8Ids],
  }) as MarketInfo[];

  return result.map((market) => ({
    indexer: Number(market.indexer),
    creator: market.creator,
    title: market.title,
    subtitle: market.subtitle,
    description: market.description,
    image: market.image,
    tags: market.tags,
    status: market.status,
    marketBalance: formatEther(market.marketBalance),
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
  ];

  return prepareContractCall({
    contract: penny4thotsContract,
    method: "function writeMarket(string[] calldata _info, uint256 _marketBalance) external payable",
    params: [infoArray, params.marketBalance],
    value: params.fee,
  });
};

// Hook helper for write transactions
export const useWriteMarket = () => {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const writeMarket = async (params: WriteMarketParams) => {
    const transaction = prepareWriteMarket(params);
    const result = await sendTx(transaction);
    return result;
  };

  return { writeMarket, isPending, error };
};

// ============================================================================
// Utility Functions
// ============================================================================

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
