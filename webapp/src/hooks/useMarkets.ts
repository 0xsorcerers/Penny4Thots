import { useState, useEffect, useCallback } from 'react';
import {
  readMarket,
  readMarketCount,
  readFee,
  type MarketInfoFormatted
} from '@/tools/utils';

interface UseMarketsReturn {
  markets: MarketInfoFormatted[];
  marketCount: number;
  fee: bigint;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  fetchMarketsByIds: (ids: number[]) => Promise<MarketInfoFormatted[]>;
}

export function useMarkets(initialIds?: number[]): UseMarketsReturn {
  const [markets, setMarkets] = useState<MarketInfoFormatted[]>([]);
  const [marketCount, setMarketCount] = useState<number>(0);
  const [fee, setFee] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarketsByIds = useCallback(async (ids: number[]): Promise<MarketInfoFormatted[]> => {
    if (ids.length === 0) return [];
    try {
      const result = await readMarket(ids);
      return result;
    } catch (err) {
      console.error('Error fetching markets by ids:', err);
      throw err;
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch market count and fee in parallel
      const [count, currentFee] = await Promise.all([
        readMarketCount(),
        readFee(),
      ]);

      setMarketCount(count);
      setFee(currentFee);

      // Determine which IDs to fetch
      let idsToFetch: number[];
      if (initialIds && initialIds.length > 0) {
        idsToFetch = initialIds;
      } else if (count > 0) {
        // Fetch all markets if no specific IDs provided
        idsToFetch = Array.from({ length: count }, (_, i) => i);
      } else {
        idsToFetch = [];
      }

      // Fetch markets
      if (idsToFetch.length > 0) {
        const marketsData = await readMarket(idsToFetch);
        setMarkets(marketsData);
      } else {
        setMarkets([]);
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch market data');
      setError(errorObj);
      console.error('Error fetching market data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [initialIds]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    markets,
    marketCount,
    fee,
    isLoading,
    error,
    refetch: fetchAllData,
    fetchMarketsByIds,
  };
}

export default useMarkets;
