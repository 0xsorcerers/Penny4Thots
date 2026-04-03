import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Clock, Share2, Loader2, CircleDot, CircleOff, Hourglass, Gift, Copy, Send, MessageCircle, AlertTriangle } from "lucide-react";
import { useActiveAccount, useActiveWallet, useActiveWalletChain, useDisconnect, useIsAutoConnecting, useSwitchActiveWalletChain } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import { useMarketStore } from "@/store/marketStore";
import { useNetworkStore } from "@/store/networkStore";
import { useLanguageStore } from "@/store/languageStore";
import { useMarketDataHydration } from "@/hooks/useMarketDataHydration";
import { useVote, useTokenApprove, readPaymentToken, readTokenAllowance, readTokenBalance, readTokenDecimals,
  readTokenSymbol, isZeroAddress, fetchDataConstants, calculatePlatformFeePercentage,
  fetchMarketDataFromBlockchain, getClaimablePositions, getAllUserPositions,
  useBatchClaim, useBatchKamikaze, readMarketLock, getUserPositionCount, getUserPositions,
  getPositionDetailsBatch, formatTokenAmount, fromTokenSmallestUnit, getBlockchain, type VoteParams } from "@/tools/utils";
import { VoteModal } from "@/components/market/VoteModal";
import { VoteStats } from "@/components/market/VoteStats";
import { MarketBalance } from "@/components/market/MarketBalance";
import { CountdownTimerLarge } from "@/components/market/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CHAIN_ID_QUERY_PARAM } from "@/lib/marketRoutes";
import type { Address } from "viem";
import { toast } from "sonner";
import { t } from "@/tools/languages";
export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedNetwork, setSelectedNetwork, getNetworkByChainId } = useNetworkStore();
  const selectedLanguage = useLanguageStore((state) => state.selectedLanguage);
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const activeWalletChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { disconnect } = useDisconnect();
  const [isEnsuringNetwork, setIsEnsuringNetwork] = useState(true);

  const targetChainId = useMemo(() => {
    const raw = searchParams.get(CHAIN_ID_QUERY_PARAM);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [searchParams]);

  const targetNetwork = useMemo(() => {
    if (!targetChainId) return undefined;
    return getNetworkByChainId(targetChainId);
  }, [getNetworkByChainId, targetChainId]);
  // Extract the numeric market indexer from the URL id (format: "penny4thot-{indexer}")
  const targetMarketIndexer = useMemo(() => {
    if (!id) return undefined;
    const match = id.match(/penny4thot-(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }, [id]);
  // Hydrate market data - this ensures the store is populated even for deep-link access
  // This replicates the same data loading that Index.tsx does, ensuring consistency
  const { isLoading: isHydrating, isHydrated } = useMarketDataHydration({
    targetMarketId: targetMarketIndexer,
    enabled: !isEnsuringNetwork,
  });
  const market = useMarketStore((state) => state.getMarket(id || ""));
  const isAutoConnecting = useIsAutoConnecting();
  const { vote, isPending: isVoting } = useVote();
  const { approve, isPending: isApproving } = useTokenApprove();
  const { batchClaim, isPending: isClaiming } = useBatchClaim();
  const { batchKamikaze, isPending: isBatchKamikazing } = useBatchKamikaze();
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [selectedVoteSignal, setSelectedVoteSignal] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [paymentToken, setPaymentToken] = useState<Address | null>(null);
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number | null>(null);
  const [marketClaimable, setMarketClaimable] = useState<boolean | null>(null);
  const [sharesFinalized, setSharesFinalized] = useState<boolean | null>(null);
  const [userPositions, setUserPositions] = useState<number[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isLoadingKamikazePositions, setIsLoadingKamikazePositions] = useState(false);
  const [kamikazePositionIds, setKamikazePositionIds] = useState<number[]>([]);
  const [kamikazeDisplayPositionIds, setKamikazeDisplayPositionIds] = useState<number[]>([]);
  const [kamikazedPositionIds, setKamikazedPositionIds] = useState<Set<number>>(new Set());
  const [kamikazePositionCapital, setKamikazePositionCapital] = useState<Map<number, bigint>>(new Map());
  const [selectedKamikazeIds, setSelectedKamikazeIds] = useState<Set<number>>(new Set());
  const [kamikazeTokenSymbol, setKamikazeTokenSymbol] = useState<string>(selectedNetwork.symbol);
  const [kamikazeTokenDecimals, setKamikazeTokenDecimals] = useState<number>(selectedNetwork.decimals);
  const [isSubmittingKamikaze, setIsSubmittingKamikaze] = useState(false);

  const shareUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(CHAIN_ID_QUERY_PARAM, String(selectedNetwork.chainId));
    return url.toString();
  }, [selectedNetwork.chainId]);

  const shareMessage = useMemo(() => {
    const title = market?.title || "Penny4Thots Market";
    const optionA = market?.optionA || t(selectedLanguage, "common.yes");
    const optionB = market?.optionB || t(selectedLanguage, "common.no");
    return `${title} — ${optionA} vs ${optionB} on ${selectedNetwork.name}`;
  }, [market?.optionA, market?.optionB, market?.title, selectedNetwork.name, selectedLanguage]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t(selectedLanguage, "market.shareLinkCopied"), {
        description: t(selectedLanguage, "market.shareLinkCopiedDesc"),
      });
      setIsShareMenuOpen(false);
    } catch (error) {
      console.error("Failed to copy share link:", error);
      toast.error(t(selectedLanguage, "market.copyLinkFailed"), {
        description: t(selectedLanguage, "market.copyLinkFailedDesc"),
      });
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopyShareLink();
      return;
    }

    try {
      await navigator.share({
        title: market?.title || "Penny4Thots Market",
        text: shareMessage,
        url: shareUrl,
      });
      setIsShareMenuOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Native share failed:", error);
      toast.error(t(selectedLanguage, "market.shareFailed"), {
        description: t(selectedLanguage, "market.shareFailedDesc"),
      });
    }
  };

  const openShareIntent = (baseUrl: string, paramName: string = "url") => {
    const shareIntent = new URL(baseUrl);
    shareIntent.searchParams.set(paramName, shareUrl);
    if (baseUrl.includes("x.com/intent/post")) {
      shareIntent.searchParams.set("text", shareMessage);
    }
    window.open(shareIntent.toString(), "_blank", "noopener,noreferrer");
    setIsShareMenuOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    const syncNetwork = async () => {
      if (!targetChainId) {
        if (!cancelled) setIsEnsuringNetwork(false);
        return;
      }

      if (!targetNetwork) {
        toast.error(t(selectedLanguage, "market.invalidNetwork"), {
          description: t(selectedLanguage, "market.invalidNetworkDesc", { chainId: targetChainId ?? "" }),
        });
        if (!cancelled) setIsEnsuringNetwork(false);
        return;
      }

      if (selectedNetwork.chainId !== targetNetwork.chainId) {
        setSelectedNetwork(targetNetwork);
      }

      if (account?.address && activeWalletChain?.id !== targetNetwork.chainId) {
        try {
          await switchChain(defineChain({ id: targetNetwork.chainId, rpc: targetNetwork.rpc }));
        } catch (error) {
          console.error("Failed to switch network for deep-linked market:", error);
          if (activeWallet) {
            await disconnect(activeWallet);
          }
          toast.error(t(selectedLanguage, "market.walletNetworkMismatch"), {
            description: t(selectedLanguage, "market.walletNetworkMismatchDesc"),
          });
        }
      }

      if (!cancelled) setIsEnsuringNetwork(false);
    };

    setIsEnsuringNetwork(true);
    syncNetwork();

    return () => {
      cancelled = true;
    };
  }, [
    account?.address,
    activeWallet,
    activeWalletChain?.id,
    disconnect,
    selectedNetwork.chainId,
    setSelectedNetwork,
    switchChain,
    targetChainId,
    targetNetwork,
  ]);
  // Scroll to top when market page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  // Fetch payment token and platform fee
  useEffect(() => {
    if (market?.indexer !== undefined) {
      const fetchToken = async () => {
        try {
          const [token, dataConstants] = await Promise.all([
            readPaymentToken(market.indexer!),
            fetchDataConstants(),
          ]);
          setPaymentToken(token);
          const feePercentage = calculatePlatformFeePercentage(dataConstants.platformFee);
          setPlatformFeePercentage(feePercentage);
        } catch (err) {
          console.error("Failed to fetch payment token or data constants:", err);
        }
      };
      fetchToken();
    }
  }, [market?.indexer]);
  // Fetch user positions and check which are claimable when market is closed
  useEffect(() => {
    if (market?.indexer !== undefined && market?.closed && account?.address) {
      const fetchClaimablePositions = async () => {
        setIsLoadingPositions(true);
        try {
          // First check if shares are finalized
          const marketLock = await readMarketLock(market.indexer!);
          setSharesFinalized(marketLock.sharesFinalized);
          if (!marketLock.sharesFinalized) {
            // Market is closed but shares not finalized - Resolving state
            setUserPositions([]);
            setMarketClaimable(false);
            setIsLoadingPositions(false);
            return;
          }
          // Shares are finalized, now get all user positions in this market
          const allPositions = await getAllUserPositions(market.indexer!, account.address as `0x${string}`);
          if (allPositions.length === 0) {
            // User has no positions in this market
            setUserPositions([]);
            setMarketClaimable(true); // Market is claimable but user has no positions
          } else {
            // Check which positions are actually claimable (winning positions)
            const claimablePositions = await getClaimablePositions(market.indexer!, account.address as Address, allPositions);
            setUserPositions(claimablePositions);
            setMarketClaimable(true);
          }
        } catch (err) {
          console.error("Failed to fetch claimable positions:", err);
          setUserPositions([]);
          setMarketClaimable(false);
          setSharesFinalized(null);
        } finally {
          setIsLoadingPositions(false);
        }
      };
      fetchClaimablePositions();
    } else if (market?.closed && !account?.address) {
      // Market is closed but user not connected - check sharesFinalized
      const checkSharesFinalized = async () => {
        if (market?.indexer !== undefined) {
          try {
            const marketLock = await readMarketLock(market.indexer!);
            setSharesFinalized(marketLock.sharesFinalized);
          } catch (err) {
            console.error("Failed to check shares finalized:", err);
            setSharesFinalized(null);
          }
        }
      };
      checkSharesFinalized();
    }
  }, [market?.indexer, market?.closed, account?.address]);
  // Log vote modal state for debugging
  useEffect(() => {
    console.log("MarketPage render - isVoteModalOpen:", isVoteModalOpen, "market.indexer:", market?.indexer, "market.posterImage:", market?.posterImage);
  }, [isVoteModalOpen, market?.indexer, market?.posterImage]);
  // Show loading state while hydrating data (deep-link scenario)
  if (isEnsuringNetwork || isHydrating || !isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="font-outfit text-muted-foreground">{t(selectedLanguage, "market.loadingMarket")}</p>
        </div>
      </div>
    );
  }
  if (!market) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 font-syne text-2xl font-bold text-foreground">{t(selectedLanguage, "market.marketNotFoundTitle")}</h1>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t(selectedLanguage, "market.marketNotFoundButton")}
          </Button>
        </div>
      </div>
    );
  }
  const totalVotes = market.yesVotes + market.noVotes;
  const yesPercentage = totalVotes > 0 ? (market.yesVotes / totalVotes) * 100 : 50;
  const canVote = Boolean(account?.address);
  const isRestoringWallet = !canVote && isAutoConnecting;
  const handleVoteClick = (signal: boolean) => {
    console.log("handleVoteClick called with signal:", signal, "market:", market?.title, "indexer:", market?.indexer);
    if (isRestoringWallet) {
      toast.info(t(selectedLanguage, "market.restoringWallet"), {
        description: t(selectedLanguage, "market.restoringWalletDesc"),
      });
    }
    if (!market || market.indexer === undefined) {
      console.error("Market or indexer not available", { market, indexer: market?.indexer });
      toast.error(t(selectedLanguage, "market.loadingMarket"));
      return;
    }
    setSelectedVoteSignal(signal);
    setIsVoteModalOpen(true);
  };
  const handleClaim = async () => {
    if (!account?.address) {
      toast.error(t(selectedLanguage, "voteModal.walletNotConnected"));
      return;
    }
    if (!market || market.indexer === undefined) {
      toast.error(t(selectedLanguage, "market.loadingMarket"));
      return;
    }
    if (userPositions.length === 0) {
      toast.error(t(selectedLanguage, "market.noPositionsToClaim"));
      return;
    }
    try {
      toast.info(t(selectedLanguage, "marketCard.claiming"), {
        description: `Claiming ${userPositions.length} position${userPositions.length > 1 ? 's' : ''}`,
      });
      await batchClaim({
        marketId: market.indexer,
        positionIds: userPositions,
      });
      toast.success(t(selectedLanguage, "market.claimSuccessful"), {
        description: `You have successfully claimed your rewards from ${userPositions.length} position${userPositions.length > 1 ? 's' : ''}`,
      });
      // Clear positions after successful claim
      setUserPositions([]);
    } catch (err) {
      console.error("Claim failed:", err);
      toast.error(t(selectedLanguage, "market.claimFailed"), {
        description: err instanceof Error ? err.message : "Please try again",
      });
      // Don't clear positions on failure so user can retry
    }
  };
  const handleSubmitVote = async (voteParams: VoteParams) => {
    if (!account?.address) {
      toast.error(t(selectedLanguage, "voteModal.walletNotConnected"));
      throw new Error("Wallet not connected");
    }
    setIsSubmitting(true);
    try {
      const isEthPayment = isZeroAddress(voteParams.paymentToken);
      // If using a token (not ETH), check balance first, then allowance and approve if needed
      if (!isEthPayment) {
        const userBalance = await readTokenBalance(
          voteParams.paymentToken,
          account.address as Address
        );

        if (userBalance < voteParams.marketBalance) {
          const tokenDecimals = await readTokenDecimals(voteParams.paymentToken);
          const balanceFormatted = fromTokenSmallestUnit(userBalance, tokenDecimals);
          const requiredFormatted = fromTokenSmallestUnit(voteParams.marketBalance, tokenDecimals);
          toast.error(t(selectedLanguage, "voteModal.insufficientBalance"), {
            description: `You have ${balanceFormatted} but need ${requiredFormatted}`, 
          });
          throw new Error(`Insufficient balance: have ${balanceFormatted}, need ${requiredFormatted}`);
        }

        const currentAllowance = await readTokenAllowance(
          voteParams.paymentToken,
          account.address as Address,
          getBlockchain().contract_address
        );
        // If allowance is insufficient, request approval
        if (currentAllowance < voteParams.marketBalance) {
          toast.info(t(selectedLanguage, "voteModal.approvalRequired"), {
            description: t(selectedLanguage, "voteModal.approvalDesc"),
          });
          await approve(voteParams.paymentToken, voteParams.marketBalance);
          toast.success(t(selectedLanguage, "voteModal.tokenApproved"));
        }
      }
      // Now submit the vote
      await vote(voteParams);
      // Refetch fresh marketData for this market so page reflects latest votes/balances.
      // This directly patches the store for seamless UI update without page refresh.
      try {
        const marketId = market.indexer!;
        const marketDataArr = await fetchMarketDataFromBlockchain([marketId]);
        if (marketDataArr.length > 0) {
          const freshData = { ...marketDataArr[0], indexer: marketId };
          // Patch both marketDataMap and markets array directly for immediate UI update
          useMarketStore.setState((state) => {
            const nextMap = new Map(state.marketDataMap);
            nextMap.set(marketId, freshData);
            const nextMarkets = state.markets.map((m) => {
              if (m.indexer !== marketId) return m;
              return {
                ...m,
                creator: freshData.creator,
                tradeOptions: freshData.closed,
                yesVotes: freshData.aVotes,
                noVotes: freshData.bVotes,
                marketBalance: freshData.marketBalance,
                startTime: freshData.startTime,
                endTime: freshData.endTime,
                closed: freshData.closed,
                winningSide: freshData.winningSide,
                totalSharesA: freshData.totalSharesA,
                totalSharesB: freshData.totalSharesB,
                positionCount: freshData.positionCount,
              };
            });
            return { marketDataMap: nextMap, markets: nextMarkets };
          });
        }
      } catch (err) {
        console.error("Failed to refresh market data after vote:", err);
      }
      toast.success(t(selectedLanguage, "voteModal.voteSuccess"));
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
  const getOrdinalLabel = (index: number): string => {
    const labels = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
    return labels[index] || `${index + 1}th`;
  };
  const loadKamikazePositions = async (): Promise<{ eligible: number[]; display: number[] }> => {
    if (!market || market.indexer === undefined || !account?.address) return { eligible: [], display: [] };

    setIsLoadingKamikazePositions(true);
    try {
      const totalPositions = await getUserPositionCount(market.indexer, account.address as Address);
      console.log("[Kamikaze] userPositionCount", {
        marketId: market.indexer,
        user: account.address,
        totalPositions,
      });
      if (totalPositions === 0) {
        setKamikazePositionIds([]);
        setKamikazeDisplayPositionIds([]);
        setKamikazedPositionIds(new Set());
        setKamikazePositionCapital(new Map());
        return { eligible: [], display: [] };
      }

      const rangeLimit = 200;
      const callsRequired = Math.ceil(totalPositions / rangeLimit);
      const collectedPositionIds: number[] = [];
      for (let i = 0; i < callsRequired; i++) {
        const start = i * rangeLimit;
        const finish = Math.min(start + rangeLimit, totalPositions);
        const chunk = await getUserPositions(market.indexer, account.address as Address, start, finish);
        console.log("[Kamikaze] getUserPositions chunk", {
          marketId: market.indexer,
          user: account.address,
          start,
          finish,
          chunkCount: chunk.length,
          chunk,
        });
        collectedPositionIds.push(...chunk);
      }

      const positionIds = Array.from(new Set(collectedPositionIds));
      console.log("[Kamikaze] combined positionIds", {
        marketId: market.indexer,
        user: account.address,
        count: positionIds.length,
        positionIds,
      });

      if (positionIds.length === 0) {
        setKamikazePositionIds([]);
        setKamikazeDisplayPositionIds([]);
        setKamikazedPositionIds(new Set());
        setKamikazePositionCapital(new Map());
        return { eligible: [], display: [] };
      }

      const details = await getPositionDetailsBatch(market.indexer, positionIds);
      console.log("[Kamikaze] position details", {
        marketId: market.indexer,
        user: account.address,
        detailCount: details.length,
        details: details.map((d) => ({
          positionId: d.positionId,
          user: d.user,
          amount: d.amount.toString(),
          claimed: d.claimed,
          kamikazed: d.kamikazed,
          side: d.side,
          timestamp: d.timestamp,
        })),
      });
      const normalizedAddress = (account.address as Address).toLowerCase();
      const displayable = details
        .filter((p) => p.user.toLowerCase() === normalizedAddress && p.amount > 0n && !p.claimed)
        .map((p) => p.positionId);
      const kamikazedSet = new Set(
        details
          .filter((p) => p.user.toLowerCase() === normalizedAddress && p.amount > 0n && !p.claimed && p.kamikazed)
          .map((p) => p.positionId)
      );
      const eligible = details
        .filter((p) => p.user.toLowerCase() === normalizedAddress && p.amount > 0n && !p.claimed && !p.kamikazed)
        .map((p) => p.positionId);
      console.log("[Kamikaze] eligible positions", {
        marketId: market.indexer,
        user: account.address,
        eligibleCount: eligible.length,
        eligible,
      });

      const capitalMap = new Map<number, bigint>();
      details.forEach((p) => {
        if (displayable.includes(p.positionId)) {
          capitalMap.set(p.positionId, p.amount);
        }
      });

      const marketToken = paymentToken ?? await readPaymentToken(market.indexer);
      if (marketToken && !isZeroAddress(marketToken)) {
        const [symbol, decimals] = await Promise.all([
          readTokenSymbol(marketToken),
          readTokenDecimals(marketToken),
        ]);
        setKamikazeTokenSymbol(symbol);
        setKamikazeTokenDecimals(decimals);
      } else {
        setKamikazeTokenSymbol(selectedNetwork.symbol);
        setKamikazeTokenDecimals(selectedNetwork.decimals);
      }

      setKamikazePositionIds(eligible);
      setKamikazeDisplayPositionIds(displayable);
      setKamikazedPositionIds(kamikazedSet);
      setKamikazePositionCapital(capitalMap);
      return { eligible, display: displayable };
    } finally {
      setIsLoadingKamikazePositions(false);
    }
  };
  const handleOpenKamikazeModal = async () => {
    if (!account?.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!market || market.indexer === undefined) {
      toast.error(t(selectedLanguage, "market.loadingMarket"));
      return;
    }
    if (market.closed) {
      toast.error("Kamikaze is disabled for this market");
      return;
    }

    setSelectedKamikazeIds(new Set());
    setKamikazePositionIds([]);
    setKamikazeDisplayPositionIds([]);
    setKamikazedPositionIds(new Set());
    setKamikazePositionCapital(new Map());
    setIsSellModalOpen(true);

    const { eligible, display } = await loadKamikazePositions();
    if (display.length === 0) {
      toast.info("No positions found for this market");
    } else if (eligible.length === 0) {
      toast.info("All listed positions are already kamikazed");
    }
  };

  const submitBatchKamikaze = async (positionIds: number[]) => {
    if (!market || market.indexer === undefined) {
      throw new Error(t(selectedLanguage, "market.loadingMarket"));
    }

    const uniqueIds = Array.from(new Set(positionIds)).filter((id) => Number.isInteger(id) && id >= 0);
    if (uniqueIds.length === 0) {
      throw new Error("No positions selected for kamikaze");
    }

    console.log("[Kamikaze] batchKamikaze payload", {
      marketId: market.indexer,
      positionIds: uniqueIds,
      count: uniqueIds.length,
    });

    await batchKamikaze({
      marketId: market.indexer,
      positionIds: uniqueIds,
    });
  };

  const handleKamikazeAll = async () => {
    if (!account?.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!market || market.indexer === undefined) {
      toast.error(t(selectedLanguage, "market.loadingMarket"));
      return;
    }
    if (market.closed) {
      toast.error("Kamikaze is disabled for this market");
      return;
    }

    setIsSubmittingKamikaze(true);
    try {
      const { eligible } = await loadKamikazePositions();
      const ids = eligible;
      if (ids.length === 0) {
        toast.error("No positions available for kamikaze");
        return;
      }

      await submitBatchKamikaze(ids);
      toast.success("Kamikaze successful", {
        description: `Kamikazed ${ids.length} position${ids.length > 1 ? "s" : ""}.`,
      });
      setSelectedKamikazeIds(new Set());
      setKamikazePositionIds([]);
      setKamikazeDisplayPositionIds([]);
      setKamikazedPositionIds(new Set());
      setKamikazePositionCapital(new Map());
    } catch (err) {
      console.error("Kamikaze all failed:", err);
      toast.error("Kamikaze failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsSubmittingKamikaze(false);
    }
  };
  const handleSubmitSelectedKamikaze = async () => {
    if (!market || market.indexer === undefined) return;

    const selected = kamikazePositionIds.filter((id) => selectedKamikazeIds.has(id));
    if (selected.length === 0) {
      toast.error("Select at least one position");
      return;
    }

    setIsSubmittingKamikaze(true);
    try {
      await submitBatchKamikaze(selected);
      toast.success("Kamikaze successful", {
        description: `Kamikazed ${selected.length} position${selected.length > 1 ? "s" : ""}.`,
      });
      setIsSellModalOpen(false);
      setSelectedKamikazeIds(new Set());
      setKamikazePositionIds([]);
      setKamikazeDisplayPositionIds([]);
      setKamikazedPositionIds(new Set());
      setKamikazePositionCapital(new Map());
    } catch (err) {
      console.error("Kamikaze failed:", err);
      toast.error("Kamikaze failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsSubmittingKamikaze(false);
    }
  };
  const toggleKamikazeSelection = (positionId: number) => {
    if (kamikazedPositionIds.has(positionId)) return;

    setSelectedKamikazeIds((prev) => {
      const next = new Set(prev);
      if (next.has(positionId)) {
        next.delete(positionId);
      } else {
        next.add(positionId);
      }
      return next;
    });
  };
  const isKamikazeUnavailable = market.closed;
  const isKamikazeBusy = isLoadingKamikazePositions || isSubmittingKamikaze || isBatchKamikazing;
  const localeMap: Record<string, string> = {
    EN: "en-US",
    ES: "es-ES",
    FR: "fr-FR",
    DE: "de-DE",
    PT: "pt-PT",
    ZH: "zh-CN",
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(localeMap[selectedLanguage] ?? "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  return (
    <div className="relative min-h-screen textured-bg">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img
          src={market.posterImage}
          alt=""
          className="h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background/80 dark:from-background/40 dark:via-background/70 dark:to-background" />
      </div>
      {/* Content */}
      <div className="relative z-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed left-4 top-4 z-20 sm:left-6 sm:top-6"
        >
          <Button
            onClick={() => {
              // Check if there's previous app history, if not go home (deep link scenario)
              if (window.history.length <= 2) {
                navigate("/");
              } else {
                navigate(-1);
              }
            }}
            variant="ghost"
            className="rounded-xl border border-white/50 bg-white/70 backdrop-blur-xl hover:bg-white/80 shadow-[0_2px_12px_-2px_hsl(220_30%_15%/0.08)] dark:border-border/50 dark:bg-card/80 dark:backdrop-blur-sm dark:hover:bg-card dark:shadow-none"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t(selectedLanguage, "marketPage.back")}
          </Button>
        </motion.div>
        {/* Share Button */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6"
        >
          <div className="relative">
            <Button
              variant="ghost"
              className="rounded-xl border border-white/50 bg-white/70 backdrop-blur-xl hover:bg-white/80 shadow-[0_2px_12px_-2px_hsl(220_30%_15%/0.08)] dark:border-border/50 dark:bg-card/80 dark:backdrop-blur-sm dark:hover:bg-card dark:shadow-none"
              onClick={() => setIsShareMenuOpen((prev) => !prev)}
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <AnimatePresence>
              {isShareMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-white/40 bg-white/85 p-2 shadow-lg backdrop-blur-xl dark:border-border/50 dark:bg-card/95"
                >
                  <p className="px-2 pb-2 pt-1 font-outfit text-xs text-muted-foreground">
                    {t(selectedLanguage, "marketPage.shareThisMarket", { network: selectedNetwork.name })}
                  </p>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={handleCopyShareLink}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {t(selectedLanguage, "marketPage.copyLink")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={() => openShareIntent("https://x.com/intent/post")}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {t(selectedLanguage, "marketPage.shareOnX")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={() => openShareIntent("https://t.me/share/url")}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {t(selectedLanguage, "marketPage.shareOnTelegram")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={handleNativeShare}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      {t(selectedLanguage, "marketPage.shareViaDevice")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        {/* Main Content */}
        <div className="mx-auto max-w-3xl px-4 pt-20 pb-12 sm:px-6">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            {/* Tags */}
            <div className="mb-4 flex flex-wrap gap-2">
              {market.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-3 py-1 font-mono text-xs theme-option-a-chip"
                >
                  {tag}
                </span>
              ))}
            </div>
            {/* Title */}
            <h1 className="mb-3 font-syne text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
              {market.title}
            </h1>
            {/* Subtitle */}
            <p className="mb-6 font-outfit text-xl theme-text-accent">{market.subtitle}</p>
            {/* Market Balance - Volume Traded */}
            {market.marketBalance && (
              <div className="mb-6">
                <MarketBalance
                  marketBalance={market.marketBalance}
                  paymentToken={paymentToken as Address}
                />
              </div>
            )}
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm theme-text-support">
              {/* Market Status Badge */}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {t(selectedLanguage, "marketPage.createdOn", { date: formatDate(market.createdAt) })}
              </span>
              <span className="flex items-center gap-1.5 theme-text-accent">
                <Users className="h-4 w-4" />
                {totalVotes} {totalVotes === 1 ? t(selectedLanguage, "marketPage.voteSingular") : t(selectedLanguage, "marketPage.votePlural")}
              </span>
              
              {market.closed ? (
                sharesFinalized === null ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                    <CircleOff className="h-3.5 w-3.5" />
                    {t(selectedLanguage, "marketPage.checking")}
                  </span>
                ) : sharesFinalized === false ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <CircleOff className="h-3.5 w-3.5" />
                    {t(selectedLanguage, "marketPage.resolving")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-semibold text-red-500 dark:bg-red-500/20 dark:text-red-400">
                    <CircleOff className="h-3.5 w-3.5" />
                    {t(selectedLanguage, "marketPage.ended")}
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CircleDot className="h-3.5 w-3.5" />
                  {t(selectedLanguage, "marketPage.live")}
                </span>
              )}
            </div>
            {/* Countdown Timer - shown after status badge */}
            {market.endTime && market.endTime > 0 && (
              <div className="mt-4">
                <CountdownTimerLarge endTime={market.endTime} closed={market.closed} sharesFinalized={sharesFinalized} marketId={targetMarketIndexer} />
              </div>
            )}
          </motion.div>
          {/* Poster Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 overflow-hidden rounded-2xl border border-white/60 shadow-[0_8px_32px_-8px_hsl(220_30%_15%/0.15)] dark:border-border/50 dark:shadow-none"
          >
            <img
              src={market.posterImage}
              alt={market.title}
              className="aspect-video w-full object-cover"
            />
          </motion.div>
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl shadow-[0_4px_24px_-4px_hsl(220_30%_15%/0.1),inset_0_1px_0_hsl(0_0%_100%/0.8)] dark:border-border/50 dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none"
          >
            <h2 className="mb-3 font-syne text-lg font-bold theme-option-a-gradient-text animate-shimmer-sweep">{t(selectedLanguage, "marketPage.aboutMarket")}</h2>
            <p className="font-outfit leading-relaxed theme-text-support">{market.description}</p>
          </motion.div>
          {/* Voting Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl shadow-[0_4px_24px_-4px_hsl(220_30%_15%/0.1),inset_0_1px_0_hsl(0_0%_100%/0.8)] dark:border-border/50 dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none"
          >
            <h2 className="mb-4 font-syne text-lg font-bold theme-option-a-gradient-text animate-shimmer-sweep">{t(selectedLanguage, "marketPage.castVote")}</h2>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-mono text-yes">
                  <TrendingUp className="h-4 w-4" />
                  {market.optionA} {yesPercentage.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1.5 font-mono text-no">
                  {market.optionB} {(100 - yesPercentage).toFixed(1)}%
                  <TrendingDown className="h-4 w-4" />
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-no/30">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-yes to-yes/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${yesPercentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="theme-text-positive">{market.yesVotes} {t(selectedLanguage, "marketPage.votePlural")}</span>
                <span className="theme-text-negative">{market.noVotes} {t(selectedLanguage, "marketPage.votePlural")}</span>
              </div>
            </div>
            {/* Stats Section - Just Vote Stats */}
            <div className="mb-6 flex justify-center sm:justify-start">
              <VoteStats aVotes={market.yesVotes} bVotes={market.noVotes} />
            </div>
            {isRestoringWallet && (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-sm text-muted-foreground sm:justify-start">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-outfit">{t(selectedLanguage, "market.restoringWallet")}</span>
              </div>
            )}
            {/* Platform Fee Display */}
            {platformFeePercentage !== null && (
              <div className="mb-6 text-center sm:text-left">
                <p className="text-xs theme-text-support">
                  {t(selectedLanguage, "marketPage.platformFee")}:{" "}
                  <span
                    className="font-semibold theme-text-accent"
                  >
                    {platformFeePercentage.toFixed(2)}%
                  </span>
                </p>
              </div>
            )}
            {/* Vote/Claim Action Button */}
            {!market.closed ? (
              /* Live Market - endTime running, closed=false */
              (() => {
                const now = Math.floor(Date.now() / 1000);
                const timerExpired = market.endTime && market.endTime > 0 && now >= market.endTime;
                
                return (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleVoteClick(true)}
                    className="w-full relative overflow-hidden rounded-xl border py-5 font-syne text-xl font-bold transition-all theme-option-a-action"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <TrendingUp className="h-6 w-6" />
                      {timerExpired ? t(selectedLanguage, "marketPage.lateVote") : t(selectedLanguage, "marketPage.vote")}
                    </span>
                  </motion.button>
                );
              })()
            ) : marketClaimable === null || sharesFinalized === null ? (
              /* Closed Market - endTime expired, closed=true, sharesFinalized=false - Penalty Window */
              <div className="w-full rounded-xl py-5 bg-muted/30 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="font-outfit text-muted-foreground">{t(selectedLanguage, "marketPage.penaltyWindow")}</span>
              </div>
            ) : !sharesFinalized ? (
              /* Closed Market - closed=true, sharesFinalized=false - Resolving */
              <div className="w-full rounded-xl py-5 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20 flex items-center justify-center gap-2">
                <Hourglass className="h-5 w-5 text-slate-600 dark:text-slate-400 animate-pulse" />
                <span className="font-syne text-lg font-semibold text-slate-600 dark:text-slate-400">{t(selectedLanguage, "marketCard.resolving")}</span>
              </div>
            ) : isLoadingPositions ? (
              /* Closed Market - Loading positions to check claimable status */
              <div className="w-full rounded-xl py-5 bg-muted/30 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="font-outfit text-muted-foreground">{t(selectedLanguage, "marketPage.loadingPositions")}</span>
              </div>
            ) : userPositions.length === 0 ? (
              /* Closed & Finalized - User has no winning positions - Show Closed (disabled) */
              <div className="w-full rounded-xl py-5 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20 flex items-center justify-center gap-2 opacity-60">
                <CircleOff className="h-5 w-5 text-slate-600 dark:text-slate-500" />
                <span className="font-syne text-lg font-semibold text-slate-600 dark:text-slate-400">{t(selectedLanguage, "marketPage.closed")}</span>
              </div>
            ) : (
              /* Closed & Finalized - User has winning positions - Show Claim button */
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full relative overflow-hidden rounded-xl border py-5 font-syne text-xl font-bold transition-all theme-action-claim disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isClaiming ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Gift className="h-6 w-6" />
                  )}
                  {isClaiming
                    ? t(selectedLanguage, "marketCard.claiming")
                    : userPositions.length > 1
                      ? t(selectedLanguage, "marketCard.claimAll", { count: userPositions.length })
                      : t(selectedLanguage, "marketCard.claim")}
                </span>
              </motion.button>
            )}
          </motion.div>
          {/* Trade Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl shadow-[0_4px_24px_-4px_hsl(220_30%_15%/0.1),inset_0_1px_0_hsl(0_0%_100%/0.8)] dark:border-border/50 dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none"
          >
            <h2 className="mb-4 font-syne text-lg font-bold theme-option-a-gradient-text animate-shimmer-sweep">{t(selectedLanguage, "marketPage.trade")} <span className="text-xs font-normal theme-text-support">[Kamikaze trades have a 50% haircut for anyone desiring to alternate a vote position]</span></h2>
            {isKamikazeUnavailable ? (
              <div>
                <Button
                  disabled
                  className="w-full rounded-xl py-6 font-outfit text-lg font-semibold cursor-not-allowed bg-muted/50 text-muted-foreground opacity-50"
                >
                  Kamikaze Disabled
                </Button>
                <p className="mt-2 text-center font-outfit text-sm text-muted-foreground">
                  Trading is currently not available for this market
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Button
                  onClick={handleOpenKamikazeModal}
                  disabled={isKamikazeBusy}
                  className="rounded-xl bg-red-500 py-6 font-outfit text-lg font-bold text-white transition-all hover:bg-red-600 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingKamikazePositions ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Kamikaze"
                  )}
                </Button>
                <Button
                  onClick={handleKamikazeAll}
                  disabled={isKamikazeBusy}
                  className="rounded-xl bg-red-700 py-6 font-outfit text-lg font-bold text-white transition-all hover:bg-red-800 hover:shadow-[0_0_30px_rgba(185,28,28,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingKamikaze || isBatchKamikazing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Kamikaze All"
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      {/* Vote Modal */}
      {market.indexer !== undefined && (
        <VoteModal
          isOpen={isVoteModalOpen}
          onClose={() => setIsVoteModalOpen(false)}
          onSubmitVote={handleSubmitVote}
          isLoading={isSubmitting || isVoting || isApproving}
          marketId={market.indexer}
          marketTitle={market.title}
          marketImage={market.posterImage}
          optionA={market.optionA}
          optionB={market.optionB}
        />
      )}
      <Dialog open={isSellModalOpen} onOpenChange={setIsSellModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-syne text-xl">Kamikaze Positions</DialogTitle>
            <DialogDescription className="font-outfit">
              Toggle the positions you want to kamikaze in this market.
            </DialogDescription>
          </DialogHeader>

          {selectedKamikazeIds.size > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 font-outfit text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
                Kamikaze positions carry a 50% haircut of capital
              </div>
              <p className="mt-1 font-mono text-xs text-red-700/90 dark:text-red-200/90">
                Selected intended capital:{" "}
                {kamikazePositionIds
                  .filter((id) => selectedKamikazeIds.has(id))
                  .map((id, idx) => {
                    const amount = kamikazePositionCapital.get(id) ?? 0n;
                    const slashed = amount / 2n;
                    return `${getOrdinalLabel(idx)}=${formatTokenAmount(slashed, kamikazeTokenDecimals, 6)} ${kamikazeTokenSymbol}`;
                  })
                  .join(" | ")}
              </p>
            </div>
          )}

          <div className="max-h-[48vh] overflow-y-auto pr-2">
            {isLoadingKamikazePositions ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t(selectedLanguage, "marketPage.loadingPositions")}
              </div>
            ) : kamikazeDisplayPositionIds.length === 0 ? (
              <p className="py-4 text-center font-outfit text-sm text-muted-foreground">
                No positions found for this market.
              </p>
            ) : (
              <div className="space-y-3">
                {kamikazeDisplayPositionIds.map((positionId, idx) => {
                  const amount = kamikazePositionCapital.get(positionId) ?? 0n;
                  const slashed = amount / 2n;
                  const isOn = selectedKamikazeIds.has(positionId);
                  const isKamikazed = kamikazedPositionIds.has(positionId);

                  return (
                    <div
                      key={positionId}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        isKamikazed
                          ? "border-border/40 bg-muted/30 opacity-60"
                          : isOn
                            ? "border-red-500/40 bg-red-500/5"
                            : "border-border/60 bg-background/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-syne text-sm font-semibold">
                            {getOrdinalLabel(idx)} position
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            Capital: {formatTokenAmount(amount, kamikazeTokenDecimals, 6)} {kamikazeTokenSymbol}
                          </p>
                          {isKamikazed && (
                            <p className="font-mono text-xs text-muted-foreground">
                              Status: Kamikazed
                            </p>
                          )}
                          {isOn && (
                            <p className="font-mono text-xs text-red-600 dark:text-red-300">
                              Slashed to: {formatTokenAmount(slashed, kamikazeTokenDecimals, 6)} {kamikazeTokenSymbol}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant={isKamikazed ? "outline" : isOn ? "default" : "outline"}
                          className={cn(
                            "min-w-20 font-outfit",
                            isKamikazed ? "cursor-not-allowed opacity-70" : isOn ? "bg-red-600 text-white hover:bg-red-700" : ""
                          )}
                          disabled={isKamikazed}
                          onClick={() => toggleKamikazeSelection(positionId)}
                        >
                          {isKamikazed ? "Kamikazed" : isOn ? "On" : "Off"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSellModalOpen(false)}
              disabled={isSubmittingKamikaze || isBatchKamikazing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleSubmitSelectedKamikaze}
              disabled={selectedKamikazeIds.size === 0 || isSubmittingKamikaze || isBatchKamikazing}
            >
              {isSubmittingKamikaze || isBatchKamikazing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Kamikaze Selected"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
