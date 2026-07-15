import { type Address } from "viem";

export interface WhitelistConfig {
  chainId: number;
  token: string[];
  whitelistedTokens: Address[];
  type: string[];
}

const sepoliaWhitelist: WhitelistConfig = {
  chainId: 11155111,
  token: [
    //cryptocurrencies
    "Ethereum", "Penny4Thots", "Trump", "PennyUSD", "Musk", "Euros", "Yuan", "Rubles", "Korean Won", "Yen", "Rupees",
    
    //stocks
    "Tesla", "Apple", "Microsoft", "Coinbase", "Google",
    
    //etf
    "QQQ", "SGOV",
    
    //commodities
    "xGOLD", "xSILVER", "xLITHIUM",
  ],
  whitelistedTokens: [
    //cryptocurrencies
    "0x0000000000000000000000000000000000000000" as Address,
    "0xDa2BeB1ab94f6868448A697D15B092B578a7B737" as Address,
    "0xC42cad6c382e14F819ed374080e247A05CB87a58" as Address,
    "0xe9463B126335E7AA6C3F5e31c4EE74E8a50DDD16" as Address,
    "0x1eF1276E16e2d5f14c1c43Bcd09d035cFD17bf89" as Address,

    "0xC9106468f3152948976dB862cd14F6A3bB36Af4C" as Address,
    "0x8bb94d9345EB47e8b5f4555c7724124043D0931a" as Address,
    "0x65F8BdB6901150cD17cAcBd7CC30dDB92726d04D" as Address,
    "0x06e823af5629CbA70697DDAb085fFCC2dCCaF1Ac" as Address,
    "0x9608c510f40f80aef7e71e29af8428e714489430" as Address,

    "0x4896DE7Fc291edE3fD11073fC4Ea2974dD6dB6Cb" as Address,

    //stocks
    "0xe7BBD4E79F0258B6b941edbb45dF5AE8080b9A8b" as Address,
    "0xF3FF9ad844b840DEE0D0988bf4EE7b4D4495aEA2" as Address,
    "0x6785aF35f2c72cD65c0D3c8832Fc399b55F9fa56" as Address,
    "0x2f19d1fb895179b41588B6fAF63AA50D396AA1E8" as Address,
    "0x10f74E7D2Bcb7D9184cBdE73ac9f887e47FE1588" as Address,

    //etf
    "0xe0168E64ac1FC07a930FBF6c1E3Cb8F0838B9B7e" as Address,
    "0x95272D7d8b8882d2e6dDcea85BF92767c13f6bE7" as Address,

    //commodities
    "0xbea7473F9655c1E808B834018C4F70135dfad78a" as Address,
    "0x178BBBdB9F116456fadE7060A904eAC235C928Cc" as Address,
    "0x224D60f1F07896CeA1573079609CFbD4091Ecc2f" as Address,
  ],
  type: [
    //cryptocurrencies
    "crypto","crypto", "crypto", "crypto", "crypto", "crypto", "crypto", "crypto", "crypto", "crypto", "crypto",

    //stocks
    "stock", "stock", "stock", "stock", "stock",

    //etf
    "etf", "etf",

    //commodities
    "commodity", "commodity", "commodity"
  ],
};


const robinhoodWhitelist: WhitelistConfig = {
  chainId: 4663,
  token: [
    //cryptocurrencies
    "Ethereum", "USD Global", "Virtual", "Cashcat meme", "Kitsu meme", "Penny4Thots",
    
    //Stocks
    "Apple", "Nvidia", "Telsa", "SpaceX", "Circle Internet Group",
    "SanDisk", "Alphabet", "Micron Techonology", "Coinbase", "Amazon", "Nebius", "Meta Platforms", "USA Rare Earth",
    "Advanced Micro Devices", "MicroStrategy", "Microsoft", "Palantir Technologies", "Intel", "Taiwan SemiConductor Manufacturing",
    "ASML Holding NV", "Alibaba", "CoreWeave", "Oracle","Bloom Energy Corp", "GameStop",
    "Rocket Lab","Rigetti Computing",

    //ETFs
    "Investico QQQ Trust", "iShares 0-3 Month Treasury Bond ETF", "iShares Silver Trust", "SPDR S&P 500 ETF Trust",
    "Invesco Russell 1000 Equal Weight ETF"

  ],
  whitelistedTokens: [
    //crypto
    "0x0000000000000000000000000000000000000000" as Address, //ETH
    "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address, //USG
    "0xc6911796042b15d7Fa4F6CDe69e245DdCd3d9c31" as Address, //VIRTUAL
    "0x020bfC650A365f8BB26819deAAbF3E21291018b4" as Address, //CASHCAT
    "0x8d4dFaaA4198b6486E0293Fec914C2B6a821D4DC" as Address, //KITSU
    "0x6924315c4bf46e4b43c980fbd98c87914eca787e" as Address, //PENNY


    //stocks
    "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9" as Address, //AAPL
    "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" as Address, //NVDA
    "0x322f0929c4625ed5bad873c95208d54e1c003b2d" as Address, //TSLA
    "0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea" as Address, //SPCX
    "0xdf0992e440dd0be65bd8439b609d6d4366bf1cb5" as Address, //CICL

    "0xb90a19ff0af67f7779aff50a882a9cff42446400" as Address, //SNDK
    "0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3" as Address, //GOOGL
    "0xff080c8ce2e5feadaca0da81314ae59d232d4afd" as Address, //MU
    "0x6330d8c3178a418788df01a47479c0ce7ccf450b" as Address, //COIN
    "0x12f190a9f9d7d37a250758b26824b97ce941bf54" as Address, //AMZN

    "0x9d9c6684f596f66a64c030b93a886d51fd4d7931" as Address, //NEBIUS
    "0xc0d6457c16cc70d6790dd43521c899c87ce02f35" as Address, //META
    "0xd917B029C761D264c6A312BBbcDA868658eF86a6" as Address, //USAR
    "0x86923f96303d656e4aa86d9d42d1e57ad2023fdc" as Address, //AMD
    "0xec262a75e413fafd0df80480274532c79d42da09" as Address, //MSTR

    "0xe93237c50d904957cf27e7b1133b510c669c2e74" as Address, //MSFT
    "0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a" as Address, //PLTR
    "0xc72b96e0e48ecd4dc75e1e45396e26300bc39681" as Address, // INTC
    "0x58ffe4a942d3885baa22d7520691f611ef09e7aa" as Address, //TSM
    "0x47f93d52cbec7c6d2cfc080e154002370a60daea" as Address, //ASML
    
    "0xad25ac6c84d497db898fa1e8387bf6af3532a1c4" as Address, //BABA
    "0x5f10a1c971b69e47e059e1dc91901b59b3fb49c3" as Address, //CRWV
    "0xb0992820e760d836549ba69bc7598b4af75dee03" as Address, //ORCL
    "0x822CC93fFD030293E9842c30BBD678F530701867" as Address, //BE
    "0x1b0e319c6a659f002271b69db8a7df2f911c153e" as Address, //GME

    "0x3b14c39e89d60d627b42a1a4ca45b5bb45fc12e2" as Address, //RKLB
    "0x284358abc07f9359f19f4b5b4ac91901be2597ba" as Address, //RGTI

    //ETFs
    "0xd5f3879160bc7c32ebb4dc785f8a4f505888de68" as Address, //QQQ
    "0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5" as Address, //SGOV
    "0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f" as Address, //SLV
    "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C" as Address, //SPY
    "0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344" as Address, //CUSO

    //commodities

  ],
  type: [
    "crypto", "crypto", "crypto", "crypto", "crypto", "crypto",

    "stock", "stock", "stock", "stock", "stock", "stock", "stock", "stock", "stock", "stock", 
    "stock", "stock", "stock", "stock", "stock", "stock", "stock", "stock", "stock", "stock",
    "stock", "stock", "stock", "stock", "stock", "stock", "stock",

    "etf", "etf", "etf", "etf", "etf"
  ]
};

const litvmWhitelist: WhitelistConfig = {
  chainId: 4441,
  token: [],
  whitelistedTokens: [] as Address[],
  type: [] as string[]
};

export const whitelists: WhitelistConfig[] = [sepoliaWhitelist, robinhoodWhitelist, litvmWhitelist];

export const isTokenWhitelisted = (chainId: number, tokenAddress: Address): boolean => {
  const whitelist = whitelists.find((w) => w.chainId === chainId);
  if (!whitelist) return false;
  
  return whitelist.whitelistedTokens.some(
    (address) => address.toLowerCase() === tokenAddress.toLowerCase()
  );
};

export const getTokenType = (chainId: number, tokenAddress: Address): string | null => {
  const whitelist = whitelists.find((w) => w.chainId === chainId);
  if (!whitelist) return null;
  
  const index = whitelist.whitelistedTokens.findIndex(
    (address) => address.toLowerCase() === tokenAddress.toLowerCase()
  );
  
  if (index === -1) return null;
  
  return whitelist.type[index] || null;
};

export const getTokenName = (chainId: number, tokenAddress: Address): string | null => {
  const whitelist = whitelists.find((w) => w.chainId === chainId);
  if (!whitelist) return null;
  
  const index = whitelist.whitelistedTokens.findIndex(
    (address) => address.toLowerCase() === tokenAddress.toLowerCase()
  );
  
  if (index === -1) return null;
  
  return whitelist.token[index] || null;
};

export type RewardTokenCategory = "crypto" | "stock" | "etf" | "commodity" | "other";

export interface WhitelistedRewardToken {
  address: Address;
  name: string;
  type: RewardTokenCategory;
}

/** Normalize whitelist type strings to category keys */
function normalizeTokenType(type: string): RewardTokenCategory {
  const t = type.trim().toLowerCase();
  if (t === "crypto" || t === "cryptocurrency" || t === "cryptocurrencies") return "crypto";
  if (t === "stock" || t === "stocks") return "stock";
  if (t === "etf" || t === "etfs") return "etf";
  if (t === "commodity" || t === "commodities") return "commodity";
  return "other";
}

/** All whitelisted reward stream tokens for a chain (ordered as configured). */
export function getWhitelistedRewardTokens(chainId: number): WhitelistedRewardToken[] {
  const whitelist = whitelists.find((w) => w.chainId === chainId);
  if (!whitelist) return [];

  return whitelist.whitelistedTokens.map((address, index) => ({
    address,
    name: whitelist.token[index] || shortTokenLabel(address),
    type: normalizeTokenType(whitelist.type[index] || "other"),
  }));
}

/** Group whitelist by category for subscription UI. */
export function getWhitelistedTokensByCategory(
  chainId: number,
): Record<RewardTokenCategory, WhitelistedRewardToken[]> {
  const tokens = getWhitelistedRewardTokens(chainId);
  const groups: Record<RewardTokenCategory, WhitelistedRewardToken[]> = {
    crypto: [],
    stock: [],
    etf: [],
    commodity: [],
    other: [],
  };
  for (const t of tokens) {
    groups[t.type].push(t);
  }
  return groups;
}

export function shortTokenLabel(address: string): string {
  if (!address || address.length < 10) return address || "Token";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Resolve display name for any address (whitelist or custom). */
export function resolveRewardTokenLabel(chainId: number, address: Address): string {
  return getTokenName(chainId, address) || shortTokenLabel(address);
}

/** True when address is on our official reward-stream whitelist for the chain. */
export function isRewardTokenVerified(chainId: number, address: Address): boolean {
  return isTokenWhitelisted(chainId, address);
}

/**
 * Whitelist entries whose display name matches (case-insensitive) a custom token name.
 * Used to flag possible copycat tokens that reuse a verified name.
 */
export function findWhitelistNameCollisions(
  chainId: number,
  name: string,
  excludeAddress?: Address,
): WhitelistedRewardToken[] {
  const needle = name.trim().toLowerCase();
  if (!needle) return [];
  const exclude = excludeAddress?.toLowerCase();
  return getWhitelistedRewardTokens(chainId).filter((t) => {
    if (exclude && t.address.toLowerCase() === exclude) return false;
    return t.name.trim().toLowerCase() === needle;
  });
}
