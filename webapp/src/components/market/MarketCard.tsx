import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, X, CircleOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMarketStore } from "@/store/marketStore";
import { VoteStats } from "./VoteStats";
import { CountdownTimer } from "./CountdownTimer";
import { MarketBalance } from "./MarketBalance";
import { readPaymentToken } from "@/tools/utils";
import { toast } from "sonner";
import type { Address } from "viem";

interface MarketCardProps {
  market: Market;
  onVoteClick?: (marketId: number, signal: boolean) => void;
}

const truncateOption = (option: string, maxLength: number = 9): string => {
  return option.length > maxLength ? option.slice(0, maxLength) + "..." : option;
};

export function MarketCard({ market, onVoteClick }: MarketCardProps) {
  const navigate = useNavigate();
  const { deleteMarket } = useMarketStore();
  const [isHovered, setIsHovered] = useState(false);
  const [tradeMode, setTradeMode] = useState<"idle" | "active">("idle");
  const [showAllTags, setShowAllTags] = useState(false);
  const [paymentToken, setPaymentToken] = useState<Address | null>(null);

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

  const handleCardClick = () => {
    navigate(`/market/${market.id}`);
  };

  const handleTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (market.tradeOptions) {
      setTradeMode(tradeMode === "idle" ? "active" : "idle");
    }
  };

  const handleBuySell = (e: React.MouseEvent, action: "buy" | "sell") => {
    e.stopPropagation();
    console.log(`${action} action for market:`, market.id);
    setTradeMode("idle");
  };

  const handleShowMoreTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllTags(true);
  };

  const handleDeleteMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (market.indexer !== undefined) {
      deleteMarket(market.indexer);
      toast.success("Market removed from your view");
    }
  };

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Directly open vote modal without showing option buttons
    if (onVoteClick && market.indexer !== undefined) {
      // Pass true as default signal, user will select in modal
      onVoteClick(market.indexer, true);
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
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300",
        // Light mode glassmorphism
        "border border-amber-100/60 bg-amber-50/70 backdrop-blur-xl shadow-[0_4px_24px_-4px_hsl(220_30%_15%/0.1),inset_0_1px_0_hsl(38_25%_85%/0.8)]",
        "hover:border-primary/30 hover:shadow-[0_8px_32px_-8px_hsl(220_30%_15%/0.15),0_0_30px_rgba(var(--primary),0.08)]",
        // Dark mode
        "dark:border-border/50 dark:bg-card/80 dark:backdrop-blur-sm dark:shadow-none",
        "dark:hover:border-primary/30 dark:hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] dark:hover:bg-card",
        market.closed && "opacity-60 grayscale hover:opacity-70"
      )}
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={market.posterImage}
          alt=""
          className="h-full w-full object-cover opacity-40 transition-opacity duration-500 group-hover:opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col p-5">
        {/* Delete Button */}
        <motion.button
          onClick={handleDeleteMarket}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 right-4 z-20 rounded-full p-2 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
          title="Remove market from view"
        >
          <X className="h-4 w-4" />
        </motion.button>

        {/* Tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {market.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary"
            >
              {tag}
            </span>
          ))}
          {market.tags.length > 3 && (
            <button
              onClick={handleShowMoreTags}
              className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
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

        {/* Progress bar showing option A/B ratio */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-mono text-yes">
              <TrendingUp className="h-3 w-3" />
              {truncateOption(market.optionA || "Yes")} {yesPercentage.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1 font-mono text-no">
              {truncateOption(market.optionB || "No")} {(100 - yesPercentage).toFixed(0)}%
              <TrendingDown className="h-3 w-3" />
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-no/30">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-yes to-yes/80"
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

        {/* Vote/Trade Buttons */}
        <AnimatePresence mode="wait">
          {market.closed ? (
            <motion.div
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-outfit text-sm font-medium bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60"
            >
              <CircleOff className="h-4 w-4" />
              Closed
            </motion.div>
          ) : tradeMode === "idle" ? (
            (() => {
              // Check if timer has expired but market is not closed
              const now = Math.floor(Date.now() / 1000);
              const timerExpired = market.endTime && market.endTime > 0 && now >= market.endTime;
              const buttonText = timerExpired ? "Late vote" : "Vote";

              return (
                <motion.button
                  key="vote"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleVoteClick}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-outfit text-sm font-medium transition-all bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {buttonText}
                </motion.button>
              );
            })()
          ) : tradeMode === "active" ? (
            <motion.button
              key="trade"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleTradeClick}
              disabled={!market.tradeOptions}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-outfit text-sm font-medium transition-all",
                market.tradeOptions
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "cursor-not-allowed bg-muted/50 text-muted-foreground opacity-50"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              {market.tradeOptions ? "Trade" : "Trading Disabled"}
            </motion.button>
          ) : (
            <motion.div
              key="buy-sell"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex gap-2"
            >
              <button
                onClick={(e) => handleBuySell(e, "buy")}
                className="flex-1 rounded-xl bg-yes py-2.5 font-outfit text-sm font-semibold text-yes-foreground transition-all hover:bg-yes/90 hover:shadow-[0_0_20px_rgba(var(--yes),0.3)]"
              >
                BUY
              </button>
              <button
                onClick={(e) => handleBuySell(e, "sell")}
                className="flex-1 rounded-xl bg-no py-2.5 font-outfit text-sm font-semibold text-no-foreground transition-all hover:bg-no/90 hover:shadow-[0_0_20px_rgba(var(--no),0.3)]"
              >
                SELL
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hover glow effect */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary/20"
          />
        )}
      </AnimatePresence>

      {/* Tags Modal */}
      <Dialog open={showAllTags} onOpenChange={setShowAllTags}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{market.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">All tags for this market</p>
            <div className="flex flex-wrap gap-2">
              {market.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-3 py-1.5 font-mono text-sm text-primary"
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
