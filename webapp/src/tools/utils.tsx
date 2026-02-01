import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, darkTheme } from "thirdweb/react";
import { defineChain, sepolia } from "thirdweb/chains";
import { ethers, JsonRpcProvider } from "ethers";
import { getContract } from "thirdweb";
import { env } from "process";
import { ReactElement } from "react";
import penny4thots from "../abi/penny4thots.json";

//Thirdweb wallet connect
// Global Constants ***************************************************************************************************************

export const client = createThirdwebClient({
  clientId: 'ddddd23bccaca244c84bd1a746e4c1b2',
});

export const wallets = [
  createWallet("com.binance.wallet"),
  createWallet("com.coinbase.wallet"),
  walletConnect(),
  inAppWallet({
    auth: {
      // mode: "redirect",
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

export const blockchain = {
  // mainnet
  // chainId: 56,
  // rpc: 'https://bsc-dataseed.bnbchain.org', 
  // blockExplorer: 'https://bscscan.com',
  // decimals: 18,
  // contract_address: '0x0217dFf6d795F4BaE2ed7DCEcb922cA65e84a417',
  // contractABI: penny4thots.abi,

  // testnet
  // name: 'Jesse',
  // symbol: 'JESSE',
  // // partner1: 'Moth',
  // // partner1_symbol: 'MOTH',
  chainId: 11155111,
  rpc: 'https://rpc2.sepolia.orgwss://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
  // jesse_contract_address: "0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59",
  decimals: 18,
  contract_address: '0x0217dFf6d795F4BaE2ed7DCEcb922cA65e84a417',
  contractABI: penny4thots.abi,
  // pyth_contract_address: "0x2880ab155794e7179c9ee2e38200202908c17b43",
  // legend_contract_address: "0xE153921AF05bB17bA83c236a9C43d8d268716342",
  // // partner1_contract_address: "0xB87BE8c350d600290D9EcCBAA8cA73cf969a41A4", 
  // base_price_id: "0xf490b178d0c85683b7a0f2388b40af2e6f7c90cbe0f96b31f315f08d0e5a2d6d", // Base/USD
};

export const network = defineChain({ id: blockchain.chainId, rpc: blockchain.rpc});

// Connector Component
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
          // supportedTokens={{
          //   [blockchain.chainId]: [{
          //     address: blockchain.jesse_contract_address,
          //     name: blockchain.name,
          //     symbol: blockchain.symbol,
          //     icon: 'https://cybernauts.fun/assets/images/jesse_logo.png',
          //   },
          //   // {
          //   //   address: blockchain.partner1_contract_address,
          //   //   name: blockchain.partner1,
          //   //   symbol: blockchain.partner1_symbol,
          //   //   icon: 'https://cybernauts.fun/assets/images/partner1_logo.jpg',
          //   // }
          // ]
          // }}
          connectButton={{ label: "Get Started" }}
          connectModal={{
            size: "wide",
            title: "Connect to Penny4Thots",
            titleIcon:
              "/logo-white-no-bkg.png",
            welcomeScreen: {
              title: "Penny4Thots Prediction Markets",
              subtitle:
                "...if you can think it, it's important.",
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

// Read Calls

export const readMarket = async (address: string, ids: number[]): Promise<any[]> => {
  // create provider (fallback to default sepolia provider if RPC is malformed)
  let provider: JsonRpcProvider | ethers.providers.BaseProvider;
  try {
    provider = new JsonRpcProvider(blockchain.rpc as string);
  } catch (e) {
    provider = ethers.getDefaultProvider('sepolia');
  }

  const contract = new ethers.Contract(
    blockchain.contract_address,
    blockchain.contractABI,
    provider
  );

  const raw = await contract.readMarket(address, ids);

  const normalize = (val: any): any => {
    if (Array.isArray(val)) return val.map(normalize);
    if (ethers.BigNumber && ethers.BigNumber.isBigNumber && ethers.BigNumber.isBigNumber(val)) {
      return val.toString();
    }
    if (val && typeof val === 'object') {
      const out: Record<string, any> = {};
      for (const k of Object.keys(val)) {
        // Skip numeric keys on ethers returned array-like objects (they will be handled by Array.isArray above)
        if (/^\d+$/.test(k)) continue;
        out[k] = normalize(val[k]);
      }
      return out;
    }
    return val;
  };

  return normalize(raw) as any[];
};

// Write Calls

// Shuffle implementation
export const randomShuffle = (max: number): number => {
  return Math.floor(Math.random() * max);
};

// Fisher-Yates shuffle implementation
export function fisherYatesShuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // Random index from 0 to i
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

export const copyClipboard = async(text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
}
  
//export esthetics
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
  // convert scientific to decimal string manually
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 18,
    useGrouping: false
  });
}