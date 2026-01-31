import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Market } from "@/types/market";
import { cn } from "@/lib/utils";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [tradeMode, setTradeMode] = useState<"idle" | "active">("idle");

  const totalVotes = market.yesVotes + market.noVotes;
  const yesPercentage = totalVotes > 0 ? (market.yesVotes / totalVotes) * 100 : 50;

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
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(var(--primary),0.1)]"
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={market.posterImage}
          alt=""
          className="h-full w-full object-cover opacity-20 transition-opacity duration-500 group-hover:opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/95 to-card/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col p-5">
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
            <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
              +{market.tags.length - 3}
            </span>
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

        {/* Progress bar showing YES/NO ratio */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-mono text-yes">
              <TrendingUp className="h-3 w-3" />
              YES {yesPercentage.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1 font-mono text-no">
              NO {(100 - yesPercentage).toFixed(0)}%
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

        {/* Trade Button */}
        <AnimatePresence mode="wait">
          {tradeMode === "idle" ? (
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
    </motion.div>
  );
}
