import { type Address } from "viem";

export interface WhitelistConfig {
  chainId: number;
  token: string[];
  whitelistedTokens: Address[];
  type: string[];
}

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

export const whitelists: WhitelistConfig[] = [robinhoodWhitelist, litvmWhitelist];

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
