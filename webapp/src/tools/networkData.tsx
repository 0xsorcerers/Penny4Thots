import { type Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpc: string;
  blockExplorer: string;
  decimals: number;
  symbol: string;
  contract_address: Address;
  penny_address: string;
  /** ProofOfAccess NFT mint — zero until live deploy */
  proof_of_access: Address;
  /** Harvester V2 — zero until live deploy */
  harvester: Address;
}

const sepolia: NetworkConfig = {
  name: 'Sepolia (Testnet)',
  chainId: 11155111,
  rpc: 'https://0xrpc.io/sep',
  blockExplorer: 'https://sepolia.etherscan.io',
  decimals: 18,
  symbol: 'sETH',
  contract_address: '0x569e65de26FA684DDb0b86E68BD9cEc85FeB9A96' as Address,   
  penny_address: '0xDa2BeB1ab94f6868448A697D15B092B578a7B737',
  proof_of_access: '0xD426395b577E0B87aeF21E41E6580D05Bf790daa' as Address,  
  harvester: '0x9b5268Cb1003eca591C549947Cebf0A0d5360b39' as Address,   
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0x0000000000000000000000000000000000000000' as Address,
  harvester: '0x0000000000000000000000000000000000000000' as Address,
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
  proof_of_access: '0xb395e4483c155245D56d131B561A3d6FcF0Eb6fb' as Address,
  harvester: '0xC186D2EEF776846c8f7F06618AFE6117AD9b9A1d' as Address,
};

// Sepolia included for steady ProofOfAccess / Harvester testing once addresses are set
const chains: NetworkConfig[] = [robinhood, litvm]; // , scroll, manta, opbnb, base, bnb, hashkey, monad, 

function normalizeAddr(addr: string): string {
  return addr.trim().toLowerCase();
}

function isZeroAddress(addr: string | null | undefined): boolean {
  if (!addr) return true;
  return normalizeAddr(addr) === normalizeAddr(ZERO_ADDRESS);
}

function isNonZeroAddress(addr: string | null | undefined): boolean {
  if (!addr) return false;
  const a = normalizeAddr(addr);
  return a.startsWith("0x") && a.length === 42 && a !== normalizeAddr(ZERO_ADDRESS);
}

/** True when address is the zero stand-in (not a live contract). */
export function isDummyProofOfAccess(addr: string | null | undefined): boolean {
  return isZeroAddress(addr);
}

export function isDummyHarvester(addr: string | null | undefined): boolean {
  return isZeroAddress(addr);
}

/** True when the chain has a real PENNY token address. */
export function hasValidPennyEntry(network: Pick<NetworkConfig, "penny_address"> | null | undefined): boolean {
  return isNonZeroAddress(network?.penny_address);
}

/**
 * True when ProofOfAccess is configured (zero stand-in or live).
 * Prefer hasLiveProofOfAccess for features that need a real deploy.
 */
export function hasValidProofOfAccess(network: Pick<NetworkConfig, "proof_of_access"> | null | undefined): boolean {
  if (!network?.proof_of_access) return false;
  const a = normalizeAddr(network.proof_of_access);
  return a.startsWith("0x") && a.length === 42;
}

/**
 * True when ProofOfAccess is a real deploy (non-zero). Required for wallet mint txs.
 */
export function hasLiveProofOfAccess(network: Pick<NetworkConfig, "proof_of_access"> | null | undefined): boolean {
  return isNonZeroAddress(network?.proof_of_access);
}

/**
 * True when Harvester is a real deploy (non-zero). Required for stake / deposit txs.
 */
export function hasLiveHarvester(network: Pick<NetworkConfig, "harvester"> | null | undefined): boolean {
  return isNonZeroAddress(network?.harvester);
}

/**
 * Farm / stake UI (profile menu + /staking) only when both ProofOfAccess
 * and Harvester have real (non-zero) deploy addresses — both are required
 * for mint + farm functionality.
 */
export function canAccessFarm(
  network: Pick<NetworkConfig, "proof_of_access" | "harvester"> | null | undefined,
): boolean {
  return hasLiveProofOfAccess(network) && hasLiveHarvester(network);
}

export { chains, ZERO_ADDRESS };
