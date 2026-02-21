import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Users, Clock, Share2, Loader2, CircleDot, CircleOff, Hourglass, Gift, Copy, Send, MessageCircle } from "lucide-react";
import { useActiveAccount, useActiveWallet, useActiveWalletChain, useDisconnect, useIsAutoConnecting, useSwitchActiveWalletChain } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import { useMarketStore } from "@/store/marketStore";
import { useNetworkStore } from "@/store/networkStore";
import { useMarketDataHydration } from "@/hooks/useMarketDataHydration";
import { useVote, useTokenApprove, readPaymentToken, readTokenAllowance, isZeroAddress, fetchDataConstants, calculatePlatformFeePercentage, fetchMarketDataFromBlockchain, getClaimablePositions, getAllUserPositions, useBatchClaim, readMarketLock, type VoteParams } from "@/tools/utils";
import { VoteModal } from "@/components/market/VoteModal";
import { VoteStats } from "@/components/market/VoteStats";
import { MarketBalance } from "@/components/market/MarketBalance";
import { CountdownTimerLarge } from "@/components/market/CountdownTimer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHAIN_ID_QUERY_PARAM } from "@/lib/marketRoutes";
import type { Address } from "viem";
import { toast } from "sonner";
export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedNetwork, setSelectedNetwork, getNetworkByChainId } = useNetworkStore();
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
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [selectedVoteSignal, setSelectedVoteSignal] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeMode, setTradeMode] = useState<"idle" | "active">("idle");
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [paymentToken, setPaymentToken] = useState<Address | null>(null);
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number | null>(null);
  const [marketClaimable, setMarketClaimable] = useState<boolean | null>(null);
  const [sharesFinalized, setSharesFinalized] = useState<boolean | null>(null);
  const [userPositions, setUserPositions] = useState<number[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  const shareUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(CHAIN_ID_QUERY_PARAM, String(selectedNetwork.chainId));
    return url.toString();
  }, [selectedNetwork.chainId]);

  const shareMessage = useMemo(() => {
    const title = market?.title || "Penny4Thots Market";
    const optionA = market?.optionA || "Yes";
    const optionB = market?.optionB || "No";
    return `${title} — ${optionA} vs ${optionB} on ${selectedNetwork.name}`;
  }, [market?.optionA, market?.optionB, market?.title, selectedNetwork.name]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied", {
        description: "Market link includes the intended network.",
      });
      setIsShareMenuOpen(false);
    } catch (error) {
      console.error("Failed to copy share link:", error);
      toast.error("Could not copy link", {
        description: "Please copy the URL manually.",
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
      toast.error("Share failed", {
        description: "Try copying the link instead.",
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
        toast.error("Invalid market network in URL", {
          description: `Unsupported chainId=${targetChainId}.`,
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
          toast.error("Wallet network mismatch", {
            description: "Please reconnect and approve the requested network.",
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
          <p className="font-outfit text-muted-foreground">Loading market data...</p>
        </div>
      </div>
    );
  }
  if (!market) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 font-syne text-2xl font-bold text-foreground">Market not found</h1>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Markets
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
      toast.info("Restoring wallet...", {
        description: "You can continue, but you may need to wait a moment before submitting.",
      });
    }
    if (!market || market.indexer === undefined) {
      console.error("Market or indexer not available", { market, indexer: market?.indexer });
      toast.error("Market data not loaded");
      return;
    }
    setSelectedVoteSignal(signal);
    setIsVoteModalOpen(true);
  };
  const handleClaim = async () => {
    if (!account?.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!market || market.indexer === undefined) {
      toast.error("Market data not loaded");
      return;
    }
    if (userPositions.length === 0) {
      toast.error("No positions to claim");
      return;
    }
    try {
      toast.info("Processing claim...", {
        description: `Claiming ${userPositions.length} position${userPositions.length > 1 ? 's' : ''}`,
      });
      await batchClaim({
        marketId: market.indexer,
        positionIds: userPositions,
      });
      toast.success("Claim successful!", {
        description: `You have successfully claimed your rewards from ${userPositions.length} position${userPositions.length > 1 ? 's' : ''}`,
      });
      // Clear positions after successful claim
      setUserPositions([]);
    } catch (err) {
      console.error("Claim failed:", err);
      toast.error("Claim failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
      // Don't clear positions on failure so user can retry
    }
  };
  const handleSubmitVote = async (voteParams: VoteParams) => {
    if (!account?.address) {
      toast.error("Please connect your wallet first");
      throw new Error("Wallet not connected");
    }
    setIsSubmitting(true);
    try {
      const isEthPayment = isZeroAddress(voteParams.paymentToken);
      // If using a token (not ETH), check allowance and approve if needed
      if (!isEthPayment) {
        const currentAllowance = await readTokenAllowance(
          voteParams.paymentToken,
          account.address as Address,
          "0x826F0F01E41C1AB3dD1b52b7e3662da9702Bb9Ad" as Address
        );
        // If allowance is insufficient, request approval
        if (currentAllowance < voteParams.marketBalance) {
          toast.info("Approval required", {
            description: "Approving token spending in your wallet",
          });
          await approve(voteParams.paymentToken, voteParams.marketBalance);
          toast.success("Token approved!");
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
      toast.success("Vote submitted successfully!");
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
  const handleTradeClick = () => {
    if (market.tradeOptions) {
      setTradeMode(tradeMode === "idle" ? "active" : "idle");
    }
  };
  const handleBuySell = (action: "buy" | "sell") => {
    setTradeMode("idle");
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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
            Back
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
                    Share this market on {selectedNetwork.name}
                  </p>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={handleCopyShareLink}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy link
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={() => openShareIntent("https://x.com/intent/post")}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Share on X
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={() => openShareIntent("https://t.me/share/url")}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Share on Telegram
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg"
                      onClick={handleNativeShare}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share via device
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
                  className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary"
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
            <p className="mb-6 font-outfit text-xl text-muted-foreground">{market.subtitle}</p>
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
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {/* Market Status Badge */}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Created {formatDate(market.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </span>
              
              {market.closed ? (
                sharesFinalized === null ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                    <CircleOff className="h-3.5 w-3.5" />
                    Checking...
                  </span>
                ) : sharesFinalized === false ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <CircleOff className="h-3.5 w-3.5" />
                    Resolving
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-semibold text-red-500 dark:bg-red-500/20 dark:text-red-400">
                    <CircleOff className="h-3.5 w-3.5" />
                    Ended
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CircleDot className="h-3.5 w-3.5" />
                  Live
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
            <h2 className="mb-3 font-syne text-lg font-bold text-foreground">About this market</h2>
            <p className="font-outfit leading-relaxed text-foreground/80">{market.description}</p>
          </motion.div>
          {/* Voting Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl shadow-[0_4px_24px_-4px_hsl(220_30%_15%/0.1),inset_0_1px_0_hsl(0_0%_100%/0.8)] dark:border-border/50 dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none"
          >
            <h2 className="mb-4 font-syne text-lg font-bold text-foreground">Cast your vote</h2>
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
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{market.yesVotes} votes</span>
                <span>{market.noVotes} votes</span>
              </div>
            </div>
            {/* Stats Section - Just Vote Stats */}
            <div className="mb-6 flex justify-center sm:justify-start">
              <VoteStats aVotes={market.yesVotes} bVotes={market.noVotes} />
            </div>
            {isRestoringWallet && (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-sm text-muted-foreground sm:justify-start">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-outfit">Restoring wallet...</span>
              </div>
            )}
            {/* Platform Fee Display */}
            {platformFeePercentage !== null && (
              <div className="mb-6 text-center sm:text-left">
                <p className="text-xs text-muted-foreground">
                  Platform fee:{" "}
                  <span
                    style={{
                      color: "hsl(var(--primary))",
                    }}
                    className="font-semibold"
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
                    className="w-full relative overflow-hidden rounded-xl py-5 font-syne text-xl font-bold transition-all bg-gradient-to-r from-amber-700/20 to-yellow-600/20 text-amber-600 hover:from-amber-700 hover:to-yellow-600 hover:text-white dark:from-amber-700/30 dark:to-yellow-600/30 dark:text-amber-500 dark:hover:from-amber-700 dark:hover:to-yellow-600 dark:hover:text-white border border-amber-700/30"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <TrendingUp className="h-6 w-6" />
                      {timerExpired ? "Late Vote" : "Vote"}
                    </span>
                  </motion.button>
                );
              })()
            ) : marketClaimable === null || sharesFinalized === null ? (
              /* Closed Market - endTime expired, closed=true, sharesFinalized=false - Penalty Window */
              <div className="w-full rounded-xl py-5 bg-muted/30 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="font-outfit text-muted-foreground">Penalty Window</span>
              </div>
            ) : !sharesFinalized ? (
              /* Closed Market - closed=true, sharesFinalized=false - Resolving */
              <div className="w-full rounded-xl py-5 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20 flex items-center justify-center gap-2">
                <Hourglass className="h-5 w-5 text-slate-600 dark:text-slate-400 animate-pulse" />
                <span className="font-syne text-lg font-semibold text-slate-600 dark:text-slate-400">Resolving Market</span>
              </div>
            ) : isLoadingPositions ? (
              /* Closed Market - Loading positions to check claimable status */
              <div className="w-full rounded-xl py-5 bg-muted/30 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="font-outfit text-muted-foreground">Loading positions...</span>
              </div>
            ) : userPositions.length === 0 ? (
              /* Closed & Finalized - User has no winning positions - Show Closed (disabled) */
              <div className="w-full rounded-xl py-5 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20 flex items-center justify-center gap-2 opacity-60">
                <CircleOff className="h-5 w-5 text-slate-600 dark:text-slate-500" />
                <span className="font-syne text-lg font-semibold text-slate-600 dark:text-slate-400">Closed</span>
              </div>
            ) : (
              /* Closed & Finalized - User has winning positions - Show Claim button */
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full relative overflow-hidden rounded-xl py-5 font-syne text-xl font-bold transition-all bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 hover:from-amber-500 hover:to-orange-500 hover:text-white dark:from-amber-500/30 dark:to-orange-500/30 dark:text-amber-400 dark:hover:from-amber-500 dark:hover:to-orange-500 dark:hover:text-white border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isClaiming ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Gift className="h-6 w-6" />
                  )}
                  {isClaiming ? "Claiming..." : userPositions.length > 1 ? `Claim All (${userPositions.length})` : "Claim"}
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
            <h2 className="mb-4 font-syne text-lg font-bold text-foreground">Trade <span className="text-xs font-normal text-muted-foreground">[Kamikaze trades have a 50% haircut for anyone desiring to alternate a vote position]</span></h2>
            
            <AnimatePresence mode="wait">
              {tradeMode === "idle" ? (
                <motion.div
                  key="trade-button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    onClick={handleTradeClick}
                    disabled={!market.tradeOptions}
                    className={cn(
                      "w-full rounded-xl py-6 font-outfit text-lg font-semibold transition-all",
                      market.tradeOptions
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "cursor-not-allowed bg-muted/50 text-muted-foreground opacity-50"
                    )}
                  >
                    <BarChart3 className="mr-2 h-5 w-5" />
                    {market.tradeOptions ? "Kamikaze This Market" : "Kamikaze Disabled"}
                  </Button>
                  {!market.tradeOptions && (
                    <p className="mt-2 text-center font-outfit text-sm text-muted-foreground">
                      Trading is currently not available for this market
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="buy-sell-buttons"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <Button
                    onClick={() => handleBuySell("buy")}
                    className="rounded-xl bg-yes py-6 font-outfit text-lg font-bold text-yes-foreground transition-all hover:bg-yes/90 hover:shadow-[0_0_30px_rgba(var(--yes),0.3)]"
                  >
                    Kamikaze
                  </Button>
                  <Button
                    onClick={() => handleBuySell("sell")}
                    className="rounded-xl bg-no py-6 font-outfit text-lg font-bold text-no-foreground transition-all hover:bg-no/90 hover:shadow-[0_0_30px_rgba(var(--no),0.3)]"
                  >
                    Full Kamikaze
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
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
    </div>
  );
}
