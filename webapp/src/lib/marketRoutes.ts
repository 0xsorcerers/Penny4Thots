export const CHAIN_ID_QUERY_PARAM = "chainId";

export const buildMarketRoute = (marketId: string, chainId: number): string => {
  const query = new URLSearchParams({
    [CHAIN_ID_QUERY_PARAM]: String(chainId),
  });

  return `/market/${marketId}?${query.toString()}`;
};
