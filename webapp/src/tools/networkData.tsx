import { type Address } from "viem";

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpc: string;
  blockExplorer: string;
  decimals: number;
  symbol: string;
  contract_address: Address;
}

const sepolia: NetworkConfig = {
  name: 'Sepolia (Testnet)',
  chainId: 11155111,
  rpc: 'https://0xrpc.io/sep',
  blockExplorer: 'https://sepolia.etherscan.io',
  decimals: 18,
  symbol: 'sETH',
  contract_address: '0x0f7Cf85d6760b8c7821b747B4f5035fa01a4e1e3' as Address, // 0x7DeA875A4D644aB78e0914FFF8b760bE5e8F54cb
};

const base: NetworkConfig = {
  name: 'Base Network (Live)',
  chainId: 8453,
  rpc: 'https://gateway.tenderly.co/public/base',
  blockExplorer: 'https://basescan.org',
  decimals: 18,
  symbol: 'ETH',
  contract_address: '0x499c9bF1556aBFAb44546514F8c655Fd9b99E801' as Address, // 0xe8f5b91e8e4c49f499002745bA49dc9fEE7670C6
};

const bnb: NetworkConfig = {
  name: 'BNB Network (Live)',
  chainId: 56,
  rpc: 'https://bsc-dataseed.binance.org',
  blockExplorer: 'https://bscscan.com',
  decimals: 18,
  symbol: 'BNB',
  contract_address: '0x825Bb9873b9E982e3692eA69715E162206B2ecc1' as Address, // 0x13B9CD2340E8224D4c1CC86d3481c217d9078AAe
};

const hashkey: NetworkConfig = {
  name: 'HashKey Chain (Live)',
  chainId: 177,
  rpc: 'https://mainnet.hsk.xyz',
  blockExplorer: 'https://hashkey.blockscout.com',
  decimals: 18,
  symbol: 'HSK',
  contract_address: '0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7' as Address,
};


// Relegated Networks
const scroll: NetworkConfig = {
  name: 'Scroll Network (Live)',
  chainId: 534352,
  rpc: 'https://rpc.scroll.io',
  blockExplorer: 'https://scrollscan.com/',
  decimals: 18,
  symbol: 'ETH',
  contract_address: '0x554C2ca099DC9676470f92Df3083040B7f4DdeF5' as Address, // 0x06F94c107808bC4d9c27fA8476C3E2f5F83A9c3C
};

const manta: NetworkConfig = {
  name: 'Manta Network (Live)',
  chainId: 169,
  rpc: 'https://pacific-rpc.manta.network/http',
  blockExplorer: 'https://pacific-explorer.manta.network/',
  decimals: 18,
  symbol: 'ETH',
  contract_address: '0x83D8EeeB23539CEB139DDbD00dc26eE57Bb3F2Bd' as Address,
};

const opbnb: NetworkConfig = {
  name: 'opBNB L2 (Live)',
  chainId: 204,
  rpc: 'https://opbnb-mainnet-rpc.bnbchain.org',
  blockExplorer: 'https://opbnb.bscscan.com',
  decimals: 18,
  symbol: 'BNB',
  contract_address: '0x8d4a1A116Fd092D21b47Aa29a1882995af234353' as Address,
};

const chains: NetworkConfig[] = [sepolia, base, bnb, hashkey]; // , scroll, manta, opbnb

export { chains };
