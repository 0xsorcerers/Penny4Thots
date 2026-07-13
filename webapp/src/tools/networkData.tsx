import { type Address } from "viem";

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpc: string;
  blockExplorer: string;
  decimals: number;
  symbol: string;
  contract_address: Address;
  penny_address: string;
  /** ProofOfAccess NFT mint contract — empty until deployed on this chain */
  proofOfAccess_address: string;
  /** Harvester V2 stake/claim contract — empty until deployed */
  harvester_address: string;
}

const sepolia: NetworkConfig = {
  name: 'Sepolia (Testnet)',
  chainId: 11155111,
  rpc: 'https://0xrpc.io/sep',
  blockExplorer: 'https://sepolia.etherscan.io',
  decimals: 18,
  symbol: 'sETH',
  contract_address: '0x569e65de26FA684DDb0b86E68BD9cEc85FeB9A96' as Address, // 0x0f7Cf85d6760b8c7821b747B4f5035fa01a4e1e3 0x7DeA875A4D644aB78e0914FFF8b760bE5e8F54cb
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const base: NetworkConfig = {
  name: 'Base Network (Live)',
  chainId: 8453,
  rpc: 'https://gateway.tenderly.co/public/base',
  blockExplorer: 'https://basescan.org',
  decimals: 18,
  symbol: 'ETH',
  contract_address: '0x499c9bF1556aBFAb44546514F8c655Fd9b99E801' as Address, // 0xe8f5b91e8e4c49f499002745bA49dc9fEE7670C6
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const bnb: NetworkConfig = {
  name: 'BNB Network (Live)',
  chainId: 56,
  rpc: 'https://bsc-dataseed.binance.org',
  blockExplorer: 'https://bscscan.com',
  decimals: 18,
  symbol: 'BNB',
  contract_address: '0x825Bb9873b9E982e3692eA69715E162206B2ecc1' as Address, // 0x13B9CD2340E8224D4c1CC86d3481c217d9078AAe
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const hashkey: NetworkConfig = {
  name: 'HashKey Chain (Live)',
  chainId: 177,
  rpc: 'https://mainnet.hsk.xyz',
  blockExplorer: 'https://hashkey.blockscout.com',
  decimals: 18,
  symbol: 'HSK',
  contract_address: '0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7' as Address,
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
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
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const manta: NetworkConfig = {
  name: 'Manta Network (Live)',
  chainId: 169,
  rpc: 'https://pacific-rpc.manta.network/http',
  blockExplorer: 'https://pacific-explorer.manta.network/',
  decimals: 18,
  symbol: 'ETH',
  contract_address: '0x83D8EeeB23539CEB139DDbD00dc26eE57Bb3F2Bd' as Address,
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const opbnb: NetworkConfig = {
  name: 'opBNB L2 (Live)',
  chainId: 204,
  rpc: 'https://opbnb-mainnet-rpc.bnbchain.org',
  blockExplorer: 'https://opbnb.bscscan.com',
  decimals: 18,
  symbol: 'BNB',
  contract_address: '0x8d4a1A116Fd092D21b47Aa29a1882995af234353' as Address,
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const monad: NetworkConfig = {
  name: 'Monad (Live)',
  chainId: 143,
  rpc: 'https://rpc4.monad.xyz',
  blockExplorer: 'https://monadscan.com',
  decimals: 18,
  symbol: 'MON',
  contract_address: '0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7' as Address,
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const litvm: NetworkConfig = {
  name: 'LitVM (Testnet)',
  chainId: 4441,
  rpc: 'https://liteforge.rpc.caldera.xyz/http',
  blockExplorer: 'https://liteforge.explorer.caldera.xyz/',
  decimals: 18,
  symbol: 'LTC (zk)',
  contract_address: '0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7' as Address,
  penny_address: '',
  proofOfAccess_address: '',
  harvester_address: '',
};

const robinhood: NetworkConfig = {
  name: 'Robinhood (Live)',
  chainId: 4663,
  rpc: 'https://rpc.mainnet.chain.robinhood.com',
  blockExplorer: 'https://robinhoodchain.blockscout.com/',
  decimals: 18,
  symbol: 'ETH',
  contract_address: '0x5081f537929bAD504b7813B40Cc215344078451A' as Address, //0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7
  penny_address: '0x6924315c4bf46e4b43c980fbd98c87914eca787e',
  // Deploy ProofOfAccess + HarvesterV2 on Robinhood, then paste addresses here
  proofOfAccess_address: '',
  harvester_address: '',
};

const chains: NetworkConfig[] = [robinhood, litvm]; // , scroll, manta, opbnb, sepolia, base, bnb, hashkey, monad, 

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function isValidAddress(addr: string | null | undefined): boolean {
  if (!addr) return false;
  const a = addr.trim().toLowerCase();
  return a.startsWith("0x") && a.length === 42 && a !== ZERO_ADDRESS;
}

/** True when the chain has a real PENNY token address (enables Farm / Harvester UI). */
export function hasValidPennyEntry(network: Pick<NetworkConfig, "penny_address"> | null | undefined): boolean {
  return isValidAddress(network?.penny_address);
}

/** True when ProofOfAccess is configured for minting. */
export function hasValidProofOfAccess(network: Pick<NetworkConfig, "proofOfAccess_address"> | null | undefined): boolean {
  return isValidAddress(network?.proofOfAccess_address);
}

export { chains };
