import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { GetStartedPage } from "@/components/landing/GetStartedPage";
import { Header } from "@/components/layout/Header";
import { MarketGrid } from "@/components/market/MarketGrid";
import { CreateMarketModal } from "@/components/market/CreateMarketModal";
import { VoteModal } from "@/components/market/VoteModal";
import { useMarketStore } from "@/store/marketStore";
import { useNetworkStore } from "@/store/networkStore";
import { useActiveAccount } from "thirdweb/react";
import { useWriteMarket, useVote, useTokenApprove, fetchMarketsFromBlockchain, fetchMarketDataFromBlockchain, readMarketCount, readPaymentToken, readTokenAllowance, readTokenBalance, readTokenDecimals, toWei, toTokenSmallestUnit, fromTokenSmallestUnit, isZeroAddress, getBlockchain, formatEther, MARKETS_PER_PAGE, buildVisibleMarketIdBuckets, type VoteParams } from "@/tools/utils";
import type { CreateMarketData, Market } from "@/types/market";
import type { Address } from "viem";
import { toast } from "sonner";
import { useLanguageStore } from "@/store/languageStore";
import { t } from "@/tools/languages";

const SHOW_CLOSED_MARKETS_STORAGE_KEY = "penny4thots-show-closed-markets";
const getShowClosedMarketsStorageKey = (chainId: number): string =>
  `${SHOW_CLOSED_MARKETS_STORAGE_KEY}-chain-${chainId}`;

export default function Index() {
  const { markets, setMarketsFromBlockchain, updateMarketData, marketInfos, isLoadingFromBlockchain, setIsLoadingFromBlockchain, refreshLanguageTags } = useMarketStore();
  const { selectedNetwork } = useNetworkStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [voteModalData, setVoteModalData] = useState<{ marketId: number; marketTitle: string; marketImage?: string; optionA?: string; optionB?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFetchedCount, setLastFetchedCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentNetworkChainId, setCurrentNetworkChainId] = useState(selectedNetwork.chainId);
  const [currentPageAllMarkets, setCurrentPageAllMarkets] = useState(1);
  const [currentPageLiveMarkets, setCurrentPageLiveMarkets] = useState(1);
  const [showClosedMarkets, setShowClosedMarkets] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SHOW_CLOSED_MARKETS_STORAGE_KEY);
      if (stored === null) return true;
      return stored === "true";
    } catch {
      return true;
    }
  });
  const [allVisibleMarketIds, setAllVisibleMarketIds] = useState<number[]>([]);
  const [liveVisibleMarketIds, setLiveVisibleMarketIds] = useState<number[]>([]);
  const account = useActiveAccount();
  const { writeMarket, isPending, error } = useWriteMarket();
  const { vote, isPending: isVoting } = useVote();
  const { approve, isPending: isApproving } = useTokenApprove();
  const lastVisibleHydrationKeyRef = useRef<string>("");
  const hasHydratedShowClosedRef = useRef<number | null>(null);
  const marketLoadRequestIdRef = useRef(0);
  const { selectedLanguage } = useLanguageStore();

  // Smart fetch: hydrate immutable market info in background, keep mutable data fresh per visible page.
  const loadMarketsFromBlockchain = useCallback(async () => {
    const requestId = ++marketLoadRequestIdRef.current;
    const isStaleRequest = () => requestId !== marketLoadRequestIdRef.current;

    try {
      const currentMarketCount = await readMarketCount();
      if (isStaleRequest()) return;

      await refreshLanguageTags(selectedNetwork.chainId);
      if (isStaleRequest()) return;

      // If no markets exist, clear and return early
      if (currentMarketCount === 0) {
        const { clearAllMarkets } = useMarketStore.getState();
        clearAllMarkets();
        setLastFetchedCount(0);
        setCurrentPageAllMarkets(1);
        setCurrentPageLiveMarkets(1);
        setAllVisibleMarketIds([]);
        setLiveVisibleMarketIds([]);
        return;
      }

      // Always rebuild visibility buckets from mutable market data so closed/blacklist state stays current.
      const allIdsDesc = Array.from({ length: currentMarketCount }, (_, idx) => currentMarketCount - idx - 1);
      const { allVisibleIds, liveVisibleIds } = await buildVisibleMarketIdBuckets(allIdsDesc);
      if (isStaleRequest()) return;
      const currentAllVisibleMarketIds = allVisibleIds;
      const currentLiveVisibleMarketIds = liveVisibleIds;

      setAllVisibleMarketIds(currentAllVisibleMarketIds);
      setLiveVisibleMarketIds(currentLiveVisibleMarketIds);

      const idsForActiveView = showClosedMarkets ? currentAllVisibleMarketIds : currentLiveVisibleMarketIds;
      const activePage = showClosedMarkets ? currentPageAllMarkets : currentPageLiveMarkets;
      const setActivePage = showClosedMarkets ? setCurrentPageAllMarkets : setCurrentPageLiveMarkets;

      const totalPages = Math.max(1, Math.ceil(idsForActiveView.length / MARKETS_PER_PAGE));
      const nextPage = Math.min(activePage, totalPages);
      if (nextPage !== activePage) {
        setActivePage(nextPage);
      }

      const startIdx = (nextPage - 1) * MARKETS_PER_PAGE;
      const endIdx = startIdx + MARKETS_PER_PAGE;
      const pageIds = idsForActiveView.slice(startIdx, endIdx);

      // If immutable data is stale/missing, fetch and persist all of it in background-sized batches.
      if (currentMarketCount !== lastFetchedCount || marketInfos.length !== currentMarketCount) {
        setIsLoadingFromBlockchain(true);
        try {
          const blockchainInfos = await fetchMarketsFromBlockchain();
          const pageData = await fetchMarketDataFromBlockchain(pageIds);
          if (isStaleRequest()) return;
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
        if (isStaleRequest()) return;
        const dataMap = new Map(
          pageData.map((data, idx) => [pageIds[idx], { ...data, indexer: pageIds[idx] }])
        );
        updateMarketData(dataMap);
      } catch (err) {
        console.error("Failed to refresh page market data:", err);
      }
    } catch (err) {
      if (isStaleRequest()) return;
      console.error("Failed to load markets from blockchain:", err);
      toast.error(t(selectedLanguage, "common.error"));
      setIsLoadingFromBlockchain(false);
    }
  }, [
    currentPageAllMarkets,
    currentPageLiveMarkets,
    lastFetchedCount,
    marketInfos.length,
    setMarketsFromBlockchain,
    updateMarketData,
    setIsLoadingFromBlockchain,
    showClosedMarkets,
    refreshLanguageTags,
    selectedLanguage,
    selectedNetwork.chainId,
  ]);

  const handleRefreshAllMarkets = useCallback(async () => {
    const { clearAllMarkets } = useMarketStore.getState();
    clearAllMarkets();
    setLastFetchedCount(0);
    setCurrentPageAllMarkets(1);
    setCurrentPageLiveMarkets(1);
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
  }, [account, currentPageAllMarkets, currentPageLiveMarkets, showClosedMarkets, isInitialLoad, loadMarketsFromBlockchain]);

  const marketByIndexer = useMemo(() => new Map(markets.map((m) => [m.indexer, m])), [markets]);

  const visibleMarketIds = useMemo(
    () => (showClosedMarkets ? allVisibleMarketIds : liveVisibleMarketIds),
    [showClosedMarkets, allVisibleMarketIds, liveVisibleMarketIds]
  );

  const currentPage = showClosedMarkets ? currentPageAllMarkets : currentPageLiveMarkets;
  const setCurrentPage = showClosedMarkets ? setCurrentPageAllMarkets : setCurrentPageLiveMarkets;

  const marketCount = visibleMarketIds.length;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(visibleMarketIds.length / MARKETS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, setCurrentPage, visibleMarketIds.length]);

  const marketsForCurrentPage = useMemo(() => {
    const startIdx = (currentPage - 1) * MARKETS_PER_PAGE;
    const endIdx = startIdx + MARKETS_PER_PAGE;
    const pageIds = visibleMarketIds.slice(startIdx, endIdx);
    return pageIds.map((id) => marketByIndexer.get(id)).filter((m): m is Market => Boolean(m));
  }, [currentPage, visibleMarketIds, marketByIndexer]);

  const visibleMarketIdSet = useMemo(() => new Set(visibleMarketIds), [visibleMarketIds]);
  const visibleMarkets = useMemo(
    () => markets.filter((m) => m.indexer !== undefined && visibleMarketIdSet.has(m.indexer)),
    [markets, visibleMarketIdSet]
  );


  const handleVisibleMarketHydration = useCallback(async (marketIds: number[]) => {
    if (!marketIds.length) {
      lastVisibleHydrationKeyRef.current = "";
      return;
    }

    const idsToRead = Array.from(new Set(marketIds.filter((id) => visibleMarketIdSet.has(id))));
    if (!idsToRead.length) {
      lastVisibleHydrationKeyRef.current = "";
      return;
    }

    const hydrationKey = idsToRead.join(",");
    if (hydrationKey === lastVisibleHydrationKeyRef.current) return;

    lastVisibleHydrationKeyRef.current = hydrationKey;

    try {
      const pageData = await fetchMarketDataFromBlockchain(idsToRead);
      const dataMap = new Map(
        pageData.map((data, idx) => [idsToRead[idx], { ...data, indexer: idsToRead[idx] }])
      );
      updateMarketData(dataMap);
    } catch (err) {
      console.error("Failed to hydrate filtered market data:", err);
    }
  }, [updateMarketData, visibleMarketIdSet]);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  useEffect(() => {
    try {
      const storageKey = getShowClosedMarketsStorageKey(selectedNetwork.chainId);
      const stored = localStorage.getItem(storageKey);
      setShowClosedMarkets(stored === null ? true : stored === "true");
      hasHydratedShowClosedRef.current = selectedNetwork.chainId;
    } catch (err) {
      console.error("Failed to hydrate closed market visibility setting:", err);
      setShowClosedMarkets(true);
      hasHydratedShowClosedRef.current = selectedNetwork.chainId;
    }
  }, [selectedNetwork.chainId]);

  useEffect(() => {
    if (hasHydratedShowClosedRef.current !== selectedNetwork.chainId) {
      return;
    }

    try {
      localStorage.setItem(
        getShowClosedMarketsStorageKey(selectedNetwork.chainId),
        String(showClosedMarkets)
      );
    } catch (err) {
      console.error("Failed to persist closed market visibility setting:", err);
    }
  }, [showClosedMarkets, selectedNetwork.chainId]);

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
      toast.error(t(selectedLanguage, "voteModal.walletNotConnected"));
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
          toast.error(t(selectedLanguage, "voteModal.insufficientBalance"), {
            description: t(selectedLanguage, "voteModal.insufficientBalanceDesc", { balance: balanceFormatted, required: requiredFormatted }),
          });
        }

        // Balance is sufficient - now check allowance
        const currentAllowance = await readTokenAllowance(
          voteParams.paymentToken,
          account.address as Address,
          getBlockchain().contract_address
        );

        // Only approve if allowance is insufficient
        if (currentAllowance < voteParams.marketBalance) {
          toast.info(t(selectedLanguage, "voteModal.approvalRequired"), {
            description: t(selectedLanguage, "voteModal.approvalDesc"),
          });

          await approve(voteParams.paymentToken, voteParams.marketBalance);
          toast.success(t(selectedLanguage, "voteModal.tokenApproved"));
        }
        // If allowance is adequate, proceed directly to vote
      }

      // Submit the vote
      await vote(voteParams);
      toast.success(t(selectedLanguage, "voteModal.voteSuccess"));

      // Reload markets from blockchain after successful vote
      await loadMarketsFromBlockchain();
    } catch (err: unknown) {
      console.error("Failed to vote:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes("reject") ||
          errorMessage.toLowerCase().includes("denied") ||
          errorMessage.toLowerCase().includes("cancel") ||
          errorMessage.toLowerCase().includes("user refused")) {
        toast.error(t(selectedLanguage, "common.transactionCancelled"));
      } else {
        toast.error(errorMessage || t(selectedLanguage, "voteModal.voteFailed"));
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMarket = async (data: CreateMarketData & { marketBalance: string; initialVote: "YES" | "NO" | null; useToken: boolean; tokenAddress: Address; endTime: number; signal: boolean; feetype: boolean }) => {
    if (!account) {
      toast.error(t(selectedLanguage, "voteModal.walletNotConnected"));
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
          toast.error(t(selectedLanguage, "voteModal.insufficientBalance"), {
            description: t(selectedLanguage, "voteModal.insufficientBalanceDesc", { balance: balanceFormatted, required: requiredFormatted }),
          });
        }

        // Balance is sufficient - now check allowance
        const currentAllowance = await readTokenAllowance(
          data.tokenAddress,
          account.address as Address,
          getBlockchain().contract_address
        );

        // Only approve if allowance is insufficient
        if (currentAllowance < marketBalanceBigInt) {
          toast.info(t(selectedLanguage, "voteModal.approvalRequired"), {
            description: t(selectedLanguage, "voteModal.approvalDesc"),
          });

          await approve(data.tokenAddress, marketBalanceBigInt);
          toast.success(t(selectedLanguage, "voteModal.tokenApproved"));
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

      toast.success(t(selectedLanguage, "createMarket.createMarketButton"));
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
        toast.error(t(selectedLanguage, "common.transactionCancelled"));
      } else {
        toast.error(errorMessage || t(selectedLanguage, "common.error"));
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
          setCurrentPageAllMarkets(1);
          setCurrentPageLiveMarkets(1);
        }}
      />
      <div className="relative z-10">
        <MarketGrid
          markets={marketsForCurrentPage}
          allMarkets={visibleMarkets}
          marketCount={marketCount}
          currentPage={currentPage}
          pageSize={MARKETS_PER_PAGE}
          onPageChange={setCurrentPage}
          onCreateMarket={() => setIsCreateModalOpen(true)}
          onVoteClick={handleVoteClick}
          onRefreshMarkets={handleRefreshAllMarkets}
          onSearchResultsChange={handleVisibleMarketHydration}
          showClosedMarkets={showClosedMarkets}
          onToggleClosedMarkets={() => setShowClosedMarkets((prev) => !prev)}
          isLoading={isLoadingFromBlockchain}
          networkSymbol={selectedNetwork.symbol}
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
