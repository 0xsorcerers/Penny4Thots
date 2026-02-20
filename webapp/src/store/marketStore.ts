import { create } from "zustand";
import type { Market, CreateMarketData } from "@/types/market";
import type { MarketInfoFormatted, MarketDataFormatted } from "@/tools/utils";
import { getCurrentNetwork } from "./networkStore";

interface PersistedMarketSnapshot {
  marketInfos: MarketInfoFormatted[];
}

interface MarketStore {
  markets: Market[];
  marketInfos: MarketInfoFormatted[];
  marketDataMap: Map<number, MarketDataFormatted>;
  hasStarted: boolean;
  isLoadingFromBlockchain: boolean;
  setHasStarted: (value: boolean) => void;
  setMarketsFromBlockchain: (blockchainInfos: MarketInfoFormatted[], blockchainDataMap: Map<number, MarketDataFormatted>) => void;
  updateMarketData: (dataMap: Map<number, MarketDataFormatted>) => void;
  setIsLoadingFromBlockchain: (value: boolean) => void;
  addMarket: (data: CreateMarketData) => Market;
  getMarket: (id: string) => Market | undefined;
  voteYes: (id: string) => void;
  voteNo: (id: string) => void;
  toggleTradeOptions: (id: string) => void;
  deleteMarket: (indexer: number) => void;
  clearAllMarkets: () => void;
  switchToNetworkCache: (chainId: number) => void;
}

const STORAGE_PREFIX = "prediction-market-storage";

const getNetworkStorageKey = (chainId: number): string => `${STORAGE_PREFIX}-chain-${chainId}`;

const buildMarkets = (
  marketInfos: MarketInfoFormatted[],
  marketDataMap: Map<number, MarketDataFormatted>
): Market[] => {
  return marketInfos.map((info) => {
    const data = marketDataMap.get(info.indexer);

    return {
      id: `penny4thot-${info.indexer}`,
      indexer: info.indexer,
      creator: data?.creator || "",
      title: info.title,
      subtitle: info.subtitle,
      description: info.description,
      posterImage: info.image,
      tags: info.tags,
      tradeOptions: data?.status || false,
      yesVotes: data?.aVotes || 0,
      noVotes: data?.bVotes || 0,
      createdAt: data?.startTime ? new Date(data.startTime * 1000).toISOString() : new Date().toISOString(),
      marketBalance: data?.marketBalance?.toString() || "0",
      status: data?.status || false,
      optionA: info.optionA || "Yes",
      optionB: info.optionB || "No",
      startTime: data?.startTime || 0,
      endTime: data?.endTime || 0,
      closed: data?.closed || false,
      winningSide: data?.winningSide || 0,
      totalSharesA: data?.totalSharesA || "0",
      totalSharesB: data?.totalSharesB || "0",
      positionCount: data?.positionCount || 0,
    };
  });
};

const loadSnapshotForChain = (chainId: number): PersistedMarketSnapshot | null => {
  try {
    const raw = localStorage.getItem(getNetworkStorageKey(chainId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedMarketSnapshot;

    if (!parsed || !Array.isArray(parsed.marketInfos)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(`Failed to load market snapshot for chain ${chainId}:`, error);
    return null;
  }
};

const saveSnapshotForChain = (
  chainId: number,
  state: Pick<MarketStore, "marketInfos">
): void => {
  try {
    const snapshot: PersistedMarketSnapshot = {
      marketInfos: state.marketInfos,
    };

    localStorage.setItem(getNetworkStorageKey(chainId), JSON.stringify(snapshot));
  } catch (error) {
    console.error(`Failed to persist market snapshot for chain ${chainId}:`, error);
  }
};

const getCurrentChainId = (): number => getCurrentNetwork().chainId;

const getInitialState = (): Pick<MarketStore, "markets" | "marketInfos" | "marketDataMap"> => {
  const chainId = getCurrentChainId();
  const snapshot = loadSnapshotForChain(chainId);

  const marketInfos = snapshot?.marketInfos ?? [];
  const marketDataMap = new Map<number, MarketDataFormatted>();

  return {
    marketInfos,
    marketDataMap,
    markets: buildMarkets(marketInfos, marketDataMap),
  };
};

export const useMarketStore = create<MarketStore>()((set, get) => {
  const initialState = getInitialState();

  const persistCurrentChain = () => {
    const chainId = getCurrentChainId();
    const state = get();
    saveSnapshotForChain(chainId, {
      marketInfos: state.marketInfos,
    });
  };

  return {
    ...initialState,
    hasStarted: false,
    isLoadingFromBlockchain: false,

    setHasStarted: (value) => set({ hasStarted: value }),

    setIsLoadingFromBlockchain: (value) => set({ isLoadingFromBlockchain: value }),

    setMarketsFromBlockchain: (blockchainInfos, blockchainDataMap) => {
      const markets = buildMarkets(blockchainInfos, blockchainDataMap);
      set({
        markets,
        marketInfos: blockchainInfos,
        marketDataMap: blockchainDataMap,
      });
      persistCurrentChain();
    },

    updateMarketData: (dataMap) => {
      const { marketInfos, marketDataMap } = get();
      const mergedDataMap = new Map(marketDataMap);
      dataMap.forEach((value, key) => {
        mergedDataMap.set(key, value);
      });
      const markets = buildMarkets(marketInfos, mergedDataMap);
      set({ markets, marketDataMap: mergedDataMap });
    },

    addMarket: (data) => {
      const newMarket: Market = {
        id: crypto.randomUUID(),
        ...data,
        tradeOptions: Math.random() > 0.5,
        yesVotes: 0,
        noVotes: 0,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ markets: [newMarket, ...state.markets] }));
      return newMarket;
    },

    getMarket: (id) => get().markets.find((m) => m.id === id),

    voteYes: (id) =>
      set((state) => ({
        markets: state.markets.map((m) =>
          m.id === id ? { ...m, yesVotes: m.yesVotes + 1 } : m
        ),
      })),

    voteNo: (id) =>
      set((state) => ({
        markets: state.markets.map((m) =>
          m.id === id ? { ...m, noVotes: m.noVotes + 1 } : m
        ),
      })),

    toggleTradeOptions: (id) =>
      set((state) => ({
        markets: state.markets.map((m) =>
          m.id === id ? { ...m, tradeOptions: !m.tradeOptions } : m
        ),
      })),

    deleteMarket: (indexer) => {
      set((state) => {
        const marketInfos = state.marketInfos.filter((m) => m.indexer !== indexer);
        const marketDataMap = new Map(
          Array.from(state.marketDataMap).filter(([key]) => key !== indexer)
        );

        return {
          marketInfos,
          marketDataMap,
          markets: buildMarkets(marketInfos, marketDataMap),
        };
      });
      persistCurrentChain();
    },

    clearAllMarkets: () => {
      set({
        markets: [],
        marketInfos: [],
        marketDataMap: new Map(),
      });
      persistCurrentChain();
    },

    switchToNetworkCache: (chainId) => {
      const snapshot = loadSnapshotForChain(chainId);
      const marketInfos = snapshot?.marketInfos ?? [];
      const marketDataMap = new Map<number, MarketDataFormatted>();

      set({
        marketInfos,
        marketDataMap,
        markets: buildMarkets(marketInfos, marketDataMap),
      });
    },
  };
});
