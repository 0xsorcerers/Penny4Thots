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
  contract_address: '0x7DeA875A4D644aB78e0914FFF8b760bE5e8F54cb' as Address,
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

const bnb: NetworkConfig = {
  name: 'BNB Network (Live)',
  chainId: 56,
  rpc: 'https://bsc-dataseed.binance.org',
  blockExplorer: 'https://bscscan.com',
  decimals: 18,
  symbol: 'BNB',
  contract_address: '0x13B9CD2340E8224D4c1CC86d3481c217d9078AAe' as Address,
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

const chains: NetworkConfig[] = [sepolia, manta, bnb, opbnb];

export { chains, type NetworkConfig };
