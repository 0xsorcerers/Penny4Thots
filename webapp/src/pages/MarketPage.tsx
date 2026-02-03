import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Clock,
  Share2,
} from "lucide-react";
import { useMarketStore } from "@/store/marketStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMarket, voteYes, voteNo } = useMarketStore();
  const market = getMarket(id || "");

  const [hasVoted, setHasVoted] = useState<"yes" | "no" | null>(null);
  const [tradeMode, setTradeMode] = useState<"idle" | "active">("idle");

  // Scroll to top when market page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

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

  const handleVote = (choice: "yes" | "no") => {
    if (hasVoted) return;
    if (choice === "yes") {
      voteYes(market.id);
    } else {
      voteNo(market.id);
    }
    setHasVoted(choice);
  };

  const handleTradeClick = () => {
    if (market.tradeOptions) {
      setTradeMode(tradeMode === "idle" ? "active" : "idle");
    }
  };

  const handleBuySell = (action: "buy" | "sell") => {
    console.log(`${action} action for market:`, market.id);
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
    <div className="relative min-h-screen bg-background">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img
          src={market.posterImage}
          alt=""
          className="h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
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
            onClick={() => navigate("/")}
            variant="ghost"
            className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card"
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
          <Button
            variant="ghost"
            className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
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

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Created {formatDate(market.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </span>
            </div>
          </motion.div>

          {/* Poster Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 overflow-hidden rounded-2xl border border-border/50"
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
            className="mb-8 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm"
          >
            <h2 className="mb-3 font-syne text-lg font-bold text-foreground">About this market</h2>
            <p className="font-outfit leading-relaxed text-foreground/80">{market.description}</p>
          </motion.div>

          {/* Voting Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm"
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

            {/* Vote Buttons */}
            <div className="grid gap-4 sm:grid-cols-2">
              <motion.button
                whileHover={{ scale: hasVoted ? 1 : 1.02 }}
                whileTap={{ scale: hasVoted ? 1 : 0.98 }}
                onClick={() => handleVote("yes")}
                disabled={hasVoted !== null}
                className={cn(
                  "relative overflow-hidden rounded-xl py-5 font-syne text-xl font-bold transition-all",
                  hasVoted === "yes"
                    ? "bg-yes text-yes-foreground ring-2 ring-yes ring-offset-2 ring-offset-background"
                    : hasVoted === "no"
                    ? "bg-muted/50 text-muted-foreground opacity-50"
                    : "bg-yes/20 text-yes hover:bg-yes hover:text-yes-foreground"
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  {market.optionA}
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: hasVoted ? 1 : 1.02 }}
                whileTap={{ scale: hasVoted ? 1 : 0.98 }}
                onClick={() => handleVote("no")}
                disabled={hasVoted !== null}
                className={cn(
                  "relative overflow-hidden rounded-xl py-5 font-syne text-xl font-bold transition-all",
                  hasVoted === "no"
                    ? "bg-no text-no-foreground ring-2 ring-no ring-offset-2 ring-offset-background"
                    : hasVoted === "yes"
                    ? "bg-muted/50 text-muted-foreground opacity-50"
                    : "bg-no/20 text-no hover:bg-no hover:text-no-foreground"
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <TrendingDown className="h-6 w-6" />
                  {market.optionB}
                </span>
              </motion.button>
            </div>

            {hasVoted && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-center font-outfit text-sm text-muted-foreground"
              >
                You voted <span className={hasVoted === "yes" ? "text-yes" : "text-no"}>{hasVoted.toUpperCase()}</span>
              </motion.p>
            )}
          </motion.div>

          {/* Trade Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm"
          >
            <h2 className="mb-4 font-syne text-lg font-bold text-foreground">Trade</h2>

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
                    {market.tradeOptions ? "Trade This Market" : "Trading Disabled"}
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
                    BUY
                  </Button>
                  <Button
                    onClick={() => handleBuySell("sell")}
                    className="rounded-xl bg-no py-6 font-outfit text-lg font-bold text-no-foreground transition-all hover:bg-no/90 hover:shadow-[0_0_30px_rgba(var(--no),0.3)]"
                  >
                    SELL
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
