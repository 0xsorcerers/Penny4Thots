import { useState, useEffect, useCallback } from "react";
import { useMarketStore } from "@/store/marketStore";
import {
  fetchMarketsFromBlockchain,
  fetchMarketDataFromBlockchain,
  readMarketCount,
} from "@/tools/utils";

interface UseMarketDataHydrationOptions {
  /** Market ID to ensure is included in the fetch (for deep-link scenarios) */
  targetMarketId?: number;
  /** Whether hydration should run */
  enabled?: boolean;
}

interface UseMarketDataHydrationResult {
  /** Whether data is currently being loaded */
  isLoading: boolean;
  /** Whether the initial hydration has completed */
  isHydrated: boolean;
  /** Any error that occurred during hydration */
  error: Error | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
}

/**
 * Hook to ensure market data is hydrated in the store.
 *
 * This hook replicates the data loading logic from Index.tsx but can be used
 * from any page (like MarketPage for deep-link scenarios).
 *
 * It ensures:
 * 1. Market count is fetched
 * 2. Market infos are fetched (up to 50 most recent)
 * 3. Market data is fetched for all infos
 * 4. If a targetMarketId is provided and it's outside the 50 most recent,
 *    it will be included in the fetch
 * 5. All data is stored in the Zustand store
 */
export function useMarketDataHydration(
  options: UseMarketDataHydrationOptions = {}
): UseMarketDataHydrationResult {
  const { targetMarketId, enabled = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    marketInfos,
    setMarketsFromBlockchain,
    updateMarketData,
    setIsLoadingFromBlockchain,
  } = useMarketStore();

  const loadMarketsFromBlockchain = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentMarketCount = await readMarketCount();

      // If no markets exist, clear and return
      if (currentMarketCount === 0) {
        const { clearAllMarkets } = useMarketStore.getState();
        clearAllMarkets();
        setIsHydrated(true);
        return;
      }

      // Check if we already have data and if the target market is in it
      const existingInfos = useMarketStore.getState().marketInfos;
      const hasTargetMarket = targetMarketId !== undefined
        ? existingInfos.some((m) => m.indexer === targetMarketId)
        : true;

      // If we have data and (no target OR target exists in data), just refresh market data
      if (existingInfos.length > 0 && hasTargetMarket) {
        // Just refresh market data (votes, status) without fetching market info
        try {
          const ids = existingInfos.map((m) => m.indexer);
          const marketDataArr = await fetchMarketDataFromBlockchain(ids);
          const dataMap = new Map(
            marketDataArr.map((data, idx) => [existingInfos[idx].indexer, { ...data, indexer: existingInfos[idx].indexer }])
          );
          updateMarketData(dataMap);
        } catch (err) {
          console.error("Failed to refresh market data:", err);
        }
        setIsHydrated(true);
        return;
      }

      // Need to fetch all market info and data
      setIsLoadingFromBlockchain(true);

      try {
        // Pass targetMarketId to ensure it's included even if outside top 50
        const additionalIds = targetMarketId !== undefined ? [targetMarketId] : undefined;
        const blockchainInfos = await fetchMarketsFromBlockchain(additionalIds);

        const marketDataArr = await fetchMarketDataFromBlockchain(
          blockchainInfos.map((m) => m.indexer)
        );

        const dataMap = new Map(
          marketDataArr.map((data, idx) => [
            blockchainInfos[idx].indexer,
            { ...data, indexer: blockchainInfos[idx].indexer },
          ])
        );

        // Update store with all data at once
        setMarketsFromBlockchain(blockchainInfos, dataMap);
        setIsHydrated(true);
      } finally {
        setIsLoadingFromBlockchain(false);
      }
    } catch (err) {
      console.error("Failed to load markets from blockchain:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [targetMarketId, setMarketsFromBlockchain, updateMarketData, setIsLoadingFromBlockchain]);

  // Run hydration on mount
  useEffect(() => {
    if (!enabled) return;
    loadMarketsFromBlockchain();
  }, [enabled, loadMarketsFromBlockchain]);

  return {
    isLoading,
    isHydrated,
    error,
    refresh: loadMarketsFromBlockchain,
  };
}
