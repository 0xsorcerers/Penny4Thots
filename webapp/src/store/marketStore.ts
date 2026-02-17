import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Market, CreateMarketData } from "@/types/market";
import type { MarketInfoFormatted, MarketDataFormatted } from "@/tools/utils";
import { getCurrentNetwork } from "./networkStore";

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
}

/**
 * Get network-specific storage key for market data
 */
const getNetworkStorageKey = (defaultKey: string): string => {
  const network = getCurrentNetwork();
  return `${defaultKey}-chain-${network.chainId}`;
};

export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      markets: [],
      marketInfos: [],
      marketDataMap: new Map(),
      hasStarted: false,
      isLoadingFromBlockchain: false,

      setHasStarted: (value) => set({ hasStarted: value }),

      setIsLoadingFromBlockchain: (value) => set({ isLoadingFromBlockchain: value }),

      setMarketsFromBlockchain: (blockchainInfos, blockchainDataMap) => {
        const markets: Market[] = blockchainInfos.map((info) => {
          const data = blockchainDataMap.get(info.indexer);
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
            createdAt: new Date().toISOString(),
            marketBalance: data?.marketBalance?.toString() || "0",
            status: data?.status || false,
            optionA: info.optionA || "Yes",
            optionB: info.optionB || "No",
            // New shares system fields
            startTime: data?.startTime || 0,
            endTime: data?.endTime || 0,
            closed: data?.closed || false,
            winningSide: data?.winningSide || 0,
            totalSharesA: data?.totalSharesA || "0",
            totalSharesB: data?.totalSharesB || "0",
            positionCount: data?.positionCount || 0,
          };
        });
        set({
          markets,
          marketInfos: blockchainInfos,
          marketDataMap: blockchainDataMap,
        });
      },

      updateMarketData: (dataMap) => {
        const { marketInfos } = get();
        const markets: Market[] = marketInfos.map((info) => {
          const data = dataMap.get(info.indexer);
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
            createdAt: new Date().toISOString(),
            marketBalance: data?.marketBalance?.toString() || "0",
            status: data?.status || false,
            optionA: info.optionA || "Yes",
            optionB: info.optionB || "No",
            // New shares system fields
            startTime: data?.startTime || 0,
            endTime: data?.endTime || 0,
            closed: data?.closed || false,
            winningSide: data?.winningSide || 0,
            totalSharesA: data?.totalSharesA || "0",
            totalSharesB: data?.totalSharesB || "0",
            positionCount: data?.positionCount || 0,
          };
        });
        set({ markets, marketDataMap: dataMap });
      },

      addMarket: (data) => {
        const newMarket: Market = {
          id: crypto.randomUUID(),
          ...data,
          tradeOptions: Math.random() > 0.5, // Random for demo
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
        set((state) => ({
          markets: state.markets.filter((m) => m.indexer !== indexer),
          marketInfos: state.marketInfos.filter((m) => m.indexer !== indexer),
          marketDataMap: new Map(
            Array.from(state.marketDataMap).filter(([key]) => key !== indexer)
          ),
        }));
      },

      clearAllMarkets: () => {
        set({
          markets: [],
          marketInfos: [],
          marketDataMap: new Map(),
        });
      },
    }),
    {
      name: getNetworkStorageKey("prediction-market-storage"),
    }
  )
);
