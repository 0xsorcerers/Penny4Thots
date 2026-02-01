import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Market, CreateMarketData } from "@/types/market";
import type { MarketInfoFormatted } from "@/tools/utils";

interface MarketStore {
  markets: Market[];
  hasStarted: boolean;
  isLoadingFromBlockchain: boolean;
  setHasStarted: (value: boolean) => void;
  setMarketsFromBlockchain: (blockchainMarkets: MarketInfoFormatted[]) => void;
  setIsLoadingFromBlockchain: (value: boolean) => void;
  addMarket: (data: CreateMarketData) => Market;
  getMarket: (id: string) => Market | undefined;
  voteYes: (id: string) => void;
  voteNo: (id: string) => void;
  toggleTradeOptions: (id: string) => void;
}

export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      markets: [],
      hasStarted: false,
      isLoadingFromBlockchain: false,

      setHasStarted: (value) => set({ hasStarted: value }),

      setIsLoadingFromBlockchain: (value) => set({ isLoadingFromBlockchain: value }),

      setMarketsFromBlockchain: (blockchainMarkets) => {
        const markets: Market[] = blockchainMarkets.map((bm) => ({
          id: `blockchain-${bm.indexer}`,
          indexer: bm.indexer,
          creator: bm.creator,
          title: bm.title,
          subtitle: bm.subtitle,
          description: bm.description,
          posterImage: bm.image,
          tags: bm.tags,
          tradeOptions: bm.status,
          yesVotes: 0,
          noVotes: 0,
          createdAt: new Date().toISOString(),
          marketBalance: bm.marketBalance,
          status: bm.status,
        }));
        set({ markets });
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
    }),
    {
      name: "prediction-market-storage",
    }
  )
);
