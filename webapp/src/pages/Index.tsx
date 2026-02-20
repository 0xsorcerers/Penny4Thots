import { useState, useEffect, useCallback, useRef } from "react";
import { GetStartedPage } from "@/components/landing/GetStartedPage";
import { Header } from "@/components/layout/Header";
import { MarketGrid } from "@/components/market/MarketGrid";
import { CreateMarketModal } from "@/components/market/CreateMarketModal";
import { VoteModal } from "@/components/market/VoteModal";
import { useMarketStore } from "@/store/marketStore";
import { useNetworkStore } from "@/store/networkStore";
import { useActiveAccount } from "thirdweb/react";
import { useWriteMarket, useVote, useTokenApprove, fetchMarketsFromBlockchain, fetchMarketDataFromBlockchain, readMarketCount, readPaymentToken, readTokenAllowance, readTokenBalance, readTokenDecimals, toWei, toTokenSmallestUnit, fromTokenSmallestUnit, isZeroAddress, getBlockchain, formatEther, getMarketIdsForPage, MARKETS_PER_PAGE, type VoteParams } from "@/tools/utils";
import type { CreateMarketData, Market } from "@/types/market";
import type { Address } from "viem";
import { toast } from "sonner";

export default function Index() {
  const { markets, setMarketsFromBlockchain, updateMarketData, marketInfos, isLoadingFromBlockchain, setIsLoadingFromBlockchain } = useMarketStore();
  const { selectedNetwork } = useNetworkStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [voteModalData, setVoteModalData] = useState<{ marketId: number; marketTitle: string; marketImage?: string; optionA?: string; optionB?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFetchedCount, setLastFetchedCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentNetworkChainId, setCurrentNetworkChainId] = useState(selectedNetwork.chainId);
  const [currentPage, setCurrentPage] = useState(1);
  const [marketCount, setMarketCount] = useState(0);
  const account = useActiveAccount();
  const { writeMarket, isPending, error } = useWriteMarket();
  const { vote, isPending: isVoting } = useVote();
  const { approve, isPending: isApproving } = useTokenApprove();
  const lastSearchHydrationKeyRef = useRef<string>("");

  // Smart fetch: hydrate immutable market info in background, keep mutable data fresh per visible page.
  const loadMarketsFromBlockchain = useCallback(async () => {
    try {
      const currentMarketCount = await readMarketCount();
      setMarketCount(currentMarketCount);

      // If no markets exist, clear and return early
      if (currentMarketCount === 0) {
        const { clearAllMarkets } = useMarketStore.getState();
        clearAllMarkets();
        setLastFetchedCount(0);
        setCurrentPage(1);
        return;
      }

      const totalPages = Math.max(1, Math.ceil(currentMarketCount / MARKETS_PER_PAGE));
      const nextPage = Math.min(currentPage, totalPages);
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      }

      const pageIds = getMarketIdsForPage(currentMarketCount, nextPage, MARKETS_PER_PAGE);

      // If immutable data is stale/missing, fetch and persist all of it in background-sized batches.
      if (currentMarketCount !== lastFetchedCount || marketInfos.length !== currentMarketCount) {
        setIsLoadingFromBlockchain(true);
        try {
          const blockchainInfos = await fetchMarketsFromBlockchain();
          const pageData = await fetchMarketDataFromBlockchain(pageIds);
          const pageDataMap = new Map(
            pageData.map((data, idx) => [pageIds[idx], { ...data, indexer: pageIds[idx] }])
          );
          setMarketsFromBlockchain(blockchainInfos, pageDataMap);
          setLastFetchedCount(currentMarketCount);
        } finally {
          setIsLoadingFromBlockchain(false);
        }
        return;
      }

      // Immutable data already cached: fetch mutable data only for the current page.
      try {
        const pageData = await fetchMarketDataFromBlockchain(pageIds);
        const dataMap = new Map(
          pageData.map((data, idx) => [pageIds[idx], { ...data, indexer: pageIds[idx] }])
        );
        updateMarketData(dataMap);
      } catch (err) {
        console.error("Failed to refresh page market data:", err);
      }
    } catch (err) {
      console.error("Failed to load markets from blockchain:", err);
      toast.error("Failed to load markets from blockchain");
      setIsLoadingFromBlockchain(false);
    }
  }, [currentPage, lastFetchedCount, marketInfos.length, setMarketsFromBlockchain, updateMarketData, setIsLoadingFromBlockchain]);

  const handleRefreshAllMarkets = useCallback(async () => {
    const { clearAllMarkets } = useMarketStore.getState();
    clearAllMarkets();
    setLastFetchedCount(0);
    setCurrentPage(1);
    await loadMarketsFromBlockchain();
  }, [loadMarketsFromBlockchain]);

  useEffect(() => {
    // If network has changed, reset the fetch tracking to reload data
    if (currentNetworkChainId !== selectedNetwork.chainId) {
      setCurrentNetworkChainId(selectedNetwork.chainId);
      setLastFetchedCount(0);
      // Data will be reloaded in the next effect
    }
  }, [selectedNetwork.chainId, currentNetworkChainId]);

  useEffect(() => {
    if (account && isInitialLoad) {
      setIsInitialLoad(false);
      loadMarketsFromBlockchain();
    } else if (account && !isInitialLoad && marketInfos.length === 0) {
      // If we've navigated back and lost data, reload
      loadMarketsFromBlockchain();
    } else if (account && !isInitialLoad && currentNetworkChainId !== selectedNetwork.chainId) {
      // Network has changed, reload markets for new network
      loadMarketsFromBlockchain();
    }
  }, [account, isInitialLoad, marketInfos.length, loadMarketsFromBlockchain, currentNetworkChainId, selectedNetwork.chainId]);


  useEffect(() => {
    if (!account || isInitialLoad) return;
    loadMarketsFromBlockchain();
  }, [account, currentPage, isInitialLoad, loadMarketsFromBlockchain]);

  const marketsForCurrentPage = (() => {
    const pageIds = getMarketIdsForPage(marketCount, currentPage, MARKETS_PER_PAGE);
    const marketMap = new Map(markets.map((m) => [m.indexer, m]));
    return pageIds.map((id) => marketMap.get(id)).filter((m): m is Market => Boolean(m));
  })();


  const handleSearchResultsChange = useCallback(async (marketIds: number[]) => {
    if (!marketIds.length) {
      lastSearchHydrationKeyRef.current = "";
      return;
    }

    const idsToRead = marketIds.slice(0, MARKETS_PER_PAGE);
    const hydrationKey = idsToRead.join(",");
    if (hydrationKey === lastSearchHydrationKeyRef.current) return;

    lastSearchHydrationKeyRef.current = hydrationKey;

    try {
      const pageData = await fetchMarketDataFromBlockchain(idsToRead);
      const dataMap = new Map(
        pageData.map((data, idx) => [idsToRead[idx], { ...data, indexer: idsToRead[idx] }])
      );
      updateMarketData(dataMap);
    } catch (err) {
      console.error("Failed to hydrate search result market data:", err);
    }
  }, [updateMarketData]);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  const handleVoteClick = (marketId: number, signal: boolean) => {
    const market = markets.find(m => m.indexer === marketId);
    if (market) {
      setVoteModalData({
        marketId,
        marketTitle: market.title,
        marketImage: market.posterImage,
        optionA: market.optionA,
        optionB: market.optionB,
      });
      setIsVoteModalOpen(true);
    }
  };

  const handleSubmitVote = async (voteParams: VoteParams) => {
    if (!account?.address) {
      toast.error("Please connect your wallet first");
      throw new Error("Wallet not connected");
    }

    setIsSubmitting(true);
    try {
      // Check if token payment is needed (feetype = true means token, false means ETH)
      if (voteParams.feetype) {
        // Token payment - check balance first
        const userBalance = await readTokenBalance(
          voteParams.paymentToken,
          account.address as Address
        );

        // Check if user has sufficient balance
        if (userBalance < voteParams.marketBalance) {
          const tokenDecimals = await readTokenDecimals(voteParams.paymentToken);
          const balanceFormatted = fromTokenSmallestUnit(userBalance, tokenDecimals);
          const requiredFormatted = fromTokenSmallestUnit(voteParams.marketBalance, tokenDecimals);
          toast.error("Insufficient token balance", {
            description: `You have ${balanceFormatted} but need ${requiredFormatted}`,
          });
          throw new Error(`Insufficient balance: have ${balanceFormatted}, need ${requiredFormatted}`);
        }

        // Balance is sufficient - now check allowance
        const currentAllowance = await readTokenAllowance(
          voteParams.paymentToken,
          account.address as Address,
          getBlockchain().contract_address
        );

        // Only approve if allowance is insufficient
        if (currentAllowance < voteParams.marketBalance) {
          toast.info("Approval required", {
            description: "Approving token spending in your wallet",
          });

          await approve(voteParams.paymentToken, voteParams.marketBalance);
          toast.success("Token approved!");
        }
        // If allowance is adequate, proceed directly to vote
      }

      // Submit the vote
      await vote(voteParams);
      toast.success("Vote submitted successfully!");

      // Reload markets from blockchain after successful vote
      await loadMarketsFromBlockchain();
    } catch (err: unknown) {
      console.error("Failed to vote:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes("reject") ||
          errorMessage.toLowerCase().includes("denied") ||
          errorMessage.toLowerCase().includes("cancel") ||
          errorMessage.toLowerCase().includes("user refused")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(errorMessage || "Failed to submit vote");
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMarket = async (data: CreateMarketData & { marketBalance: string; initialVote: "YES" | "NO" | null; useToken: boolean; tokenAddress: Address; endTime: number; signal: boolean; feetype: boolean }) => {
    if (!account) {
      toast.error("Please connect your wallet first");
      throw new Error("Wallet not connected");
    }

    setIsSubmitting(true);
    try {
      // Convert market balance using appropriate decimal handling
      let marketBalanceBigInt: bigint;
      if (data.useToken) {
        // Get token decimals for proper conversion
        const tokenDecimals = await readTokenDecimals(data.tokenAddress);
        marketBalanceBigInt = toTokenSmallestUnit(data.marketBalance, tokenDecimals);
      } else {
        // Use ETH conversion (18 decimals)
        marketBalanceBigInt = toWei(data.marketBalance);
      }

      // _signal is true for Option A (YES), false for Option B (NO)
      const signal = data.signal;

      // Check token allowance if paying with token
      if (data.useToken) {
        // First, check if user has sufficient balance
        const userBalance = await readTokenBalance(
          data.tokenAddress,
          account.address as Address
        );

        // Check if user has sufficient balance
        if (userBalance < marketBalanceBigInt) {
          const tokenDecimals = await readTokenDecimals(data.tokenAddress);
          const balanceFormatted = fromTokenSmallestUnit(userBalance, tokenDecimals);
          const requiredFormatted = fromTokenSmallestUnit(marketBalanceBigInt, tokenDecimals);
          toast.error("Insufficient token balance", {
            description: `You have ${balanceFormatted} but need ${requiredFormatted}`,
          });
          throw new Error(`Insufficient balance: have ${balanceFormatted}, need ${requiredFormatted}`);
        }

        // Balance is sufficient - now check allowance
        const currentAllowance = await readTokenAllowance(
          data.tokenAddress,
          account.address as Address,
          getBlockchain().contract_address
        );

        // Only approve if allowance is insufficient
        if (currentAllowance < marketBalanceBigInt) {
          toast.info("Approval required", {
            description: "Approving token spending in your wallet",
          });

          await approve(data.tokenAddress, marketBalanceBigInt);
          toast.success("Token approved!");
        }
        // If allowance is adequate, proceed directly to market creation
      }

      // Call blockchain
      await writeMarket({
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        image: data.posterImage,
        tags: data.tags.join(","),
        optionA: data.optionA,
        optionB: data.optionB,
        marketBalance: marketBalanceBigInt,
        fee: BigInt(0),
        feetype: data.useToken,
        paymentToken: data.tokenAddress,
        signal: signal,
        endTime: data.endTime,
      });

      toast.success("Market created successfully!");
      setIsCreateModalOpen(false);

      // Reload markets from blockchain after successful transaction
      await loadMarketsFromBlockchain();
    } catch (err: unknown) {
      console.error("Failed to create market:", err);
      // Check if user rejected/cancelled the transaction
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes("reject") ||
          errorMessage.toLowerCase().includes("denied") ||
          errorMessage.toLowerCase().includes("cancel") ||
          errorMessage.toLowerCase().includes("user refused")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(errorMessage || "Failed to create market");
      }
      // Re-throw so modal knows submission failed and doesn't reset form
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show GetStartedPage if user is not connected
  if (!account) {
    return <GetStartedPage />;
  }

  return (
    <div className="min-h-screen textured-bg">
      <Header
        onConnect={handleConnect}
        isConnected={isConnected}
        onNetworkChange={() => {
          // Trigger reload when network changes
          setLastFetchedCount(0);
          setCurrentPage(1);
        }}
      />
      <div className="relative z-10">
        <MarketGrid
          markets={marketsForCurrentPage}
          allMarkets={markets}
          marketCount={marketCount}
          currentPage={currentPage}
          pageSize={MARKETS_PER_PAGE}
          onPageChange={setCurrentPage}
          onCreateMarket={() => setIsCreateModalOpen(true)}
          onVoteClick={handleVoteClick}
          onRefreshMarkets={handleRefreshAllMarkets}
          onSearchResultsChange={handleSearchResultsChange}
          isLoading={isLoadingFromBlockchain}
        />
      </div>
      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateMarket}
        isLoading={isSubmitting}
      />
      {voteModalData && (
        <VoteModal
          isOpen={isVoteModalOpen}
          onClose={() => setIsVoteModalOpen(false)}
          onSubmitVote={handleSubmitVote}
          isLoading={isSubmitting || isVoting || isApproving}
          marketId={voteModalData.marketId}
          marketTitle={voteModalData.marketTitle}
          marketImage={voteModalData.marketImage}
          optionA={voteModalData.optionA}
          optionB={voteModalData.optionB}
        />
      )}
    </div>
  );
}
