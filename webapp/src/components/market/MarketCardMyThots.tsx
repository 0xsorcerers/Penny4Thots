import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Brain, Loader2, Gift, Hourglass, CircleOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Market } from "@/types/market";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VoteStats } from "./VoteStats";
import { CountdownTimer } from "./CountdownTimer";
import { MarketBalance } from "./MarketBalance";
import { readPaymentToken, getClaimablePositions, getAllUserPositions, useBatchClaim, readMarketLock } from "@/tools/utils";
import type { Address } from "viem";
import { useActiveAccount } from "thirdweb/react";
import { toast } from "sonner";

interface MarketCardMyThotsProps {
  market: Market;
  onVoteClick?: (marketId: number, signal: boolean) => void;
}

const truncateOption = (option: string, maxLength: number = 9): string => {
  return option.length > maxLength ? option.slice(0, maxLength) + "..." : option;
};

export function MarketCardMyThots({ market, onVoteClick }: MarketCardMyThotsProps) {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const [isHovered, setIsHovered] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [paymentToken, setPaymentToken] = useState<Address | null>(null);
  const [marketClaimable, setMarketClaimable] = useState<boolean | null>(null);
  const [sharesFinalized, setSharesFinalized] = useState<boolean | null>(null);
  const [userPositions, setUserPositions] = useState<number[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const { batchClaim, isPending: isClaiming } = useBatchClaim();

  const totalVotes = market.yesVotes + market.noVotes;
  const yesPercentage = totalVotes > 0 ? (market.yesVotes / totalVotes) * 100 : 50;

  // Fetch payment token for market balance display
  useEffect(() => {
    if (market.indexer !== undefined && market.marketBalance) {
      const fetchToken = async () => {
        try {
          const token = await readPaymentToken(market.indexer!);
          setPaymentToken(token);
        } catch (err) {
          console.error("Failed to fetch payment token:", err);
        }
      };
      fetchToken();
    }
  }, [market.indexer, market.marketBalance]);

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
            // Market is still resolving, no need to fetch positions
            setUserPositions([]);
            setMarketClaimable(false);
            setIsLoadingPositions(false);
            return;
          }

          // Shares are finalized, get all user positions in this market
          const allPositions = await getAllUserPositions(market.indexer!, account.address as `0x${string}`);

          if (allPositions.length === 0) {
            // User has no positions in this market
            setUserPositions([]);
            setMarketClaimable(true);
          } else {
            // Check which positions are actually claimable (winning positions)
            const claimablePositions = await getClaimablePositions(market.indexer!, allPositions);
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
            const marketLock = await readMarketLock(market.indexer);
            setSharesFinalized(marketLock.sharesFinalized);
            setMarketClaimable(marketLock.sharesFinalized);
          } catch (err) {
            console.error("Failed to check shares finalized:", err);
            setSharesFinalized(null);
            setMarketClaimable(false);
          }
        }
        setUserPositions([]);
        setIsLoadingPositions(false);
      };
      checkSharesFinalized();
    } else {
      setMarketClaimable(null);
      setSharesFinalized(null);
      setUserPositions([]);
    }
  }, [market?.indexer, market?.closed, account?.address]);

  const handleCardClick = () => {
    navigate(`/market/${market.id}`);
  };

  const handleShowMoreTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllTags(true);
  };

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onVoteClick && market.indexer !== undefined) {
      onVoteClick(market.indexer, true);
    }
  };

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!account?.address) {
      toast.error("Please connect your wallet first");
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
        marketId: market.indexer!,
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
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCardClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-card/80 to-teal-950/30 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
    >
      {/* Background image with emerald-tinted overlay */}
      <div className="absolute inset-0">
        <img
          src={market.posterImage}
          alt=""
          className="h-full w-full object-cover opacity-30 transition-opacity duration-500 group-hover:opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-card/80 to-teal-950/50" />
      </div>

      {/* Creator Badge */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 border border-emerald-500/30">
          <Brain className="h-3 w-3 text-emerald-400" />
          <span className="font-mono text-xs text-emerald-400">Creator</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col p-5">
        {/* Tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {market.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs text-emerald-400"
            >
              {tag}
            </span>
          ))}
          {market.tags.length > 3 && (
            <button
              onClick={handleShowMoreTags}
              className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs text-emerald-400/70 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400"
            >
              +{market.tags.length - 3} tags
            </button>
          )}
        </div>

        {/* Title & Subtitle */}
        <h3 className="mb-1 font-syne text-lg font-bold leading-tight text-foreground">
          {market.title}
        </h3>
        <p className="mb-3 font-outfit text-sm text-muted-foreground">{market.subtitle}</p>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-grow font-outfit text-sm text-foreground/70">
          {market.description}
        </p>

        {/* Progress bar showing option A/B ratio with emerald theme */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-mono text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {truncateOption(market.optionA || "Yes")} {yesPercentage.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1 font-mono text-teal-400">
              {truncateOption(market.optionB || "No")} {(100 - yesPercentage).toFixed(0)}%
              <TrendingDown className="h-3 w-3" />
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-teal-500/30">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${yesPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Vote Stats Tag with Timer and Balance */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <VoteStats aVotes={market.yesVotes} bVotes={market.noVotes} />
          {market.endTime && market.endTime > 0 && (
            <CountdownTimer endTime={market.endTime} closed={market.closed} compact />
          )}
          {market.marketBalance && (
            <MarketBalance marketBalance={market.marketBalance} paymentToken={paymentToken as Address} />
          )}
        </div>

        {/* Vote Button with emerald styling */}
        {!market.closed ? (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleVoteClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-outfit text-sm font-medium transition-all bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50"
          >
            Vote on Your Thot
          </motion.button>
        ) : marketClaimable === null || sharesFinalized === null ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-muted/30">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="font-outfit text-xs text-muted-foreground">Penalty Window</span>
          </div>
        ) : !sharesFinalized ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20">
            <Hourglass className="h-4 w-4 text-slate-400 dark:text-slate-500 animate-pulse" />
            <span className="font-outfit text-xs text-slate-500 dark:text-slate-400">Resolving Market</span>
          </div>
        ) : isLoadingPositions ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-muted/30">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="font-outfit text-xs text-muted-foreground">Loading positions...</span>
          </div>
        ) : userPositions.length === 0 ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20 opacity-60">
            <CircleOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="font-outfit text-xs text-slate-500 dark:text-slate-400">Closed</span>
          </div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleClaim}
            disabled={isClaiming}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-outfit text-sm font-medium transition-all bg-emerald-600/25 text-emerald-300 hover:bg-emerald-600/35 border border-emerald-500/40 hover:border-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaiming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Gift className="h-4 w-4" />
            )}
            {isClaiming ? "Claiming..." : userPositions.length > 1 ? `Claim All (${userPositions.length})` : "Claim"}
          </motion.button>
        )}
      </div>

      {/* Hover glow effect */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-emerald-500/30"
          />
        )}
      </AnimatePresence>

      {/* Tags Modal */}
      <Dialog open={showAllTags} onOpenChange={setShowAllTags}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm border-emerald-500/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{market.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">All tags for this market</p>
            <div className="flex flex-wrap gap-2">
              {market.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-emerald-500/15 px-3 py-1.5 font-mono text-sm text-emerald-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
