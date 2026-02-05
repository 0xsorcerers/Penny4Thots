import { useState, useEffect, useCallback } from 'react';
import {
  readMarketInfo,
  readMarketData,
  readMarketCount,
  type MarketInfoFormatted,
  type MarketDataFormatted,
} from '@/tools/utils';

interface UseMarketsReturn {
  marketInfo: MarketInfoFormatted[];
  marketData: Map<number, MarketDataFormatted>;
  marketCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  fetchMarketInfoByIds: (ids: number[]) => Promise<MarketInfoFormatted[]>;
  fetchMarketDataByIds: (ids: number[]) => Promise<MarketDataFormatted[]>;
}

export function useMarkets(initialIds?: number[]): UseMarketsReturn {
  const [marketInfo, setMarketInfo] = useState<MarketInfoFormatted[]>([]);
  const [marketData, setMarketData] = useState<Map<number, MarketDataFormatted>>(new Map());
  const [marketCount, setMarketCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarketInfoByIds = useCallback(async (ids: number[]): Promise<MarketInfoFormatted[]> => {
    if (ids.length === 0) return [];
    try {
      const result = await readMarketInfo(ids);
      return result;
    } catch (err) {
      console.error('Error fetching market info by ids:', err);
      throw err;
    }
  }, []);

  const fetchMarketDataByIds = useCallback(async (ids: number[]): Promise<MarketDataFormatted[]> => {
    if (ids.length === 0) return [];
    try {
      const result = await readMarketData(ids);
      return result;
    } catch (err) {
      console.error('Error fetching market data by ids:', err);
      throw err;
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch market count
      const count = await readMarketCount();

      setMarketCount(count);

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

      // Fetch market info and data in parallel
      if (idsToFetch.length > 0) {
        const [infoData, dataData] = await Promise.all([
          readMarketInfo(idsToFetch),
          readMarketData(idsToFetch),
        ]);

        setMarketInfo(infoData);

        // Create a map of market data indexed by indexer
        const dataMap = new Map<number, MarketDataFormatted>();
        dataData.forEach((data, idx) => {
          dataMap.set(idsToFetch[idx], data);
        });
        setMarketData(dataMap);
      } else {
        setMarketInfo([]);
        setMarketData(new Map());
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
    marketInfo,
    marketData,
    marketCount,
    isLoading,
    error,
    refetch: fetchAllData,
    fetchMarketInfoByIds,
    fetchMarketDataByIds,
  };
}

export default useMarkets;
