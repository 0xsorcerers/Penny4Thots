import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, darkTheme } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import { ethers, JsonRpcProvider } from "ethers";
import { getContract } from "thirdweb";
import { env } from "process";
import { ReactElement } from "react";

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
  // name: 'Jesse',
  // symbol: 'JESSE',
  // partner1: 'Moth',
  // partner1_symbol: 'MOTH',
  // address: '0x683046277b72c02B3Ac266761B02d3eaA0C25c9a',
  chainId: 8453,
  rpc: 'https://gateway.tenderly.co/public/base', // https://base.public.blockpi.network/v1/rpc/public
  blockExplorer: 'https://basescan.org',
  // jesse_contract_address: "0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59",
  decimals: 18,
  // pyth_contract_address: "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a",
  // legend_contract_address: "0x5AD10b04Ac3F02471D41ae5143e35eE5493F10df",
  // partner1_contract_address: "0xB87BE8c350d600290D9EcCBAA8cA73cf969a41A4", 
  // base_price_id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // Base/USD 

  // testnet
  // name: 'Jesse',
  // symbol: 'JESSE',
  // // partner1: 'Moth',
  // // partner1_symbol: 'MOTH',
  // address: '0x683046277b72c02B3Ac266761B02d3eaA0C25c9a',
  // chainId: 8453,
  // rpc: 'https://developer-access-mainnet.base.org',
  // blockExplorer: 'https://basescan.org',
  // jesse_contract_address: "0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59",
  // decimals: 18,
  // pyth_contract_address: "0x2880ab155794e7179c9ee2e38200202908c17b43",
  // legend_contract_address: "0xE153921AF05bB17bA83c236a9C43d8d268716342",
  // // partner1_contract_address: "0xB87BE8c350d600290D9EcCBAA8cA73cf969a41A4", 
  // base_price_id: "0xf490b178d0c85683b7a0f2388b40af2e6f7c90cbe0f96b31f315f08d0e5a2d6d", // Base/USD
};

export const base = defineChain({ id: blockchain.chainId, rpc: blockchain.rpc});

export function Connector(): ReactElement {
  return (
      <ConnectButton
        client={client}
        chain={base}
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
              "/white-on-background.png",
            welcomeScreen: {
              title: "Penny4Thots Prediction Markets",
              subtitle:
                "...if you can think it, it's important.",
              img: {
                src: '/white-on-background.png',
                width: 200,
                height: 200,
              },
            },
          }}
        />     
    );
  }

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