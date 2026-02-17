import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History as HistoryIcon,
  ArrowLeft,
  Loader2,
  Clock,
  Coins,
  ExternalLink,
  Sparkles,
  Trophy,
  TrendingUp,
  TrendingDown,
  Hash,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount } from "thirdweb/react";
import type { Address } from "viem";
import {
  getUserTotalClaimHistory,
  getUserClaims,
  truncateAddress,
  readMarketInfo,
  readPaymentToken,
  readTokenSymbol,
  isZeroAddress,
  type ClaimRecord,
  type MarketInfoFormatted,
  Side,
} from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useMarketStore } from "@/store/marketStore";

// Color palette for distinguishing markets
const MARKET_COLORS = [
  { bg: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30", accent: "text-emerald-400", glow: "shadow-emerald-500/20" },
  { bg: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30", accent: "text-violet-400", glow: "shadow-violet-500/20" },
  { bg: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30", accent: "text-amber-400", glow: "shadow-amber-500/20" },
  { bg: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/30", accent: "text-cyan-400", glow: "shadow-cyan-500/20" },
  { bg: "from-rose-500/20 to-pink-500/20", border: "border-rose-500/30", accent: "text-rose-400", glow: "shadow-rose-500/20" },
  { bg: "from-lime-500/20 to-green-500/20", border: "border-lime-500/30", accent: "text-lime-400", glow: "shadow-lime-500/20" },
  { bg: "from-fuchsia-500/20 to-pink-500/20", border: "border-fuchsia-500/30", accent: "text-fuchsia-400", glow: "shadow-fuchsia-500/20" },
  { bg: "from-sky-500/20 to-indigo-500/20", border: "border-sky-500/30", accent: "text-sky-400", glow: "shadow-sky-500/20" },
];

// Seeded random for consistent colors per market
function getMarketColor(marketId: number) {
  return MARKET_COLORS[marketId % MARKET_COLORS.length];
}

interface ClaimWithMarketInfo extends ClaimRecord {
  marketInfo?: MarketInfoFormatted;
  tokenSymbol?: string;
}

export default function History() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const [claims, setClaims] = useState<ClaimWithMarketInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const marketDataMap = useMarketStore((state) => state.marketDataMap);

  // Storage keys for caching
  const getStorageKey = (address: Address) => `claim_history_${address}`;
  const getCountStorageKey = (address: Address) => `claim_count_${address}`;

  // Load cached data on mount
  useEffect(() => {
    if (!account?.address) return;

    const cachedClaims = localStorage.getItem(getStorageKey(account.address as Address));
    const cachedCount = localStorage.getItem(getCountStorageKey(account.address as Address));

    if (cachedClaims && cachedCount) {
      try {
        setClaims(JSON.parse(cachedClaims));
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to parse cached claims:', err);
        localStorage.removeItem(getStorageKey(account.address as Address));
        localStorage.removeItem(getCountStorageKey(account.address as Address));
      }
    }
  }, [account?.address]);

  const fetchClaimHistory = useCallback(async (forceRefresh = false) => {
    if (!account?.address) {
      setIsLoading(false);
      return;
    }

    try {
      const userAddress = account.address as Address;
      const storageKey = getStorageKey(userAddress);
      const countStorageKey = getCountStorageKey(userAddress);

      // Check cached count first
      const cachedCount = localStorage.getItem(countStorageKey);
      const currentTotal = await getUserTotalClaimHistory(userAddress);

      // If we have cached data and no new claims, use cache
      if (!forceRefresh && cachedCount && parseInt(cachedCount) === currentTotal) {
        const cachedClaims = localStorage.getItem(storageKey);
        if (cachedClaims) {
          setClaims(JSON.parse(cachedClaims));
          setIsLoading(false);
          return;
        }
      }

      // New claims available or force refresh - fetch only new data
      setIsLoading(true);
      
      if (currentTotal === 0) {
        setClaims([]);
        localStorage.setItem(storageKey, JSON.stringify([]));
        localStorage.setItem(countStorageKey, '0');
        return;
      }

      const BATCH_SIZE = 200;
      const BATCH_DELAY_MS = 3000;

      // Fetch all claims in batches
      const history: ClaimWithMarketInfo[] = [];
      for (let start = 0; start < currentTotal; start += BATCH_SIZE) {
        const _finish = Math.min(start + BATCH_SIZE, currentTotal);
        const batch = await getUserClaims(userAddress, start, _finish);
        history.push(...batch);
        
        // Add delay between batches to avoid rate limiting
        if (start + BATCH_SIZE < currentTotal) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      // Get unique market IDs from claims
      const uniqueMarketIds = [...new Set(history.map(c => c.marketId))];

      // Fetch market info and token symbols for all unique markets
      const marketInfoMap: Map<number, MarketInfoFormatted> = new Map();
      const tokenSymbolMap: Map<number, string> = new Map();
      
      if (uniqueMarketIds.length > 0) {
        try {
          // Fetch market info
          const marketInfos = await readMarketInfo(uniqueMarketIds);
          marketInfos.forEach(info => {
            marketInfoMap.set(info.indexer, info);
          });

          // Fetch payment tokens and their symbols
          for (const marketId of uniqueMarketIds) {
            try {
              const paymentToken = await readPaymentToken(marketId);
              let tokenSymbol: string;
              
              if (isZeroAddress(paymentToken)) {
                // Zero address means it's ETH, use blockchain symbol
                tokenSymbol = selectedNetwork.symbol;
              } else {
                // It's a token, fetch its symbol
                tokenSymbol = await readTokenSymbol(paymentToken);
              }
              
              tokenSymbolMap.set(marketId, tokenSymbol);
            } catch (err) {
              console.error(`Failed to fetch token symbol for market ${marketId}:`, err);
              tokenSymbolMap.set(marketId, 'UNKNOWN');
            }
          }
        } catch (err) {
          console.error("Failed to fetch market info for claims:", err);
        }
      }

      // Enrich claims with market info and token symbols, then reverse for newest first
      const enrichedClaims: ClaimWithMarketInfo[] = history
        .map(claim => ({
          ...claim,
          marketInfo: marketInfoMap.get(claim.marketId),
          tokenSymbol: tokenSymbolMap.get(claim.marketId) || 'UNKNOWN',
        }))
        .reverse();

      // Update state and cache
      setClaims(enrichedClaims);
      localStorage.setItem(storageKey, JSON.stringify(enrichedClaims));
      localStorage.setItem(countStorageKey, currentTotal.toString());
    } catch (error) {
      console.error("Error fetching claim history:", error);
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchClaimHistory();
  }, [fetchClaimHistory]);

  // Calculate total claimed amount
  const totalClaimed = useMemo(() => {
    return claims.reduce((sum, claim) => sum + parseFloat(claim.amount), 0);
  }, [claims]);

  // Group claims by market for summary
  const marketSummary = useMemo(() => {
    const summary = new Map<number, { count: number; total: number; title: string }>();
    claims.forEach(claim => {
      const existing = summary.get(claim.marketId) || { count: 0, total: 0, title: claim.marketInfo?.title || `Market #${claim.marketId}` };
      existing.count += 1;
      existing.total += parseFloat(claim.amount);
      summary.set(claim.marketId, existing);
    });
    return summary;
  }, [claims]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(timestamp);
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num < 0.0001) return "< 0.0001";
    if (num < 1) return num.toFixed(4);
    if (num < 100) return num.toFixed(3);
    return num.toFixed(2);
  };

  const getWinningSideLabel = (marketId: number, marketInfo?: MarketInfoFormatted) => {
    const marketData = marketDataMap.get(marketId);
    if (!marketData) return null;

    if (marketData.winningSide === Side.A) {
      return { side: "A", label: marketInfo?.optionA || "Yes", isYes: true };
    } else if (marketData.winningSide === Side.B) {
      return { side: "B", label: marketInfo?.optionB || "No", isYes: false };
    }
    return null;
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isLoading) return;
    setIsRefreshing(true);
    try {
      setClaims([]);
      await fetchClaimHistory(true); // Force refresh to bypass cache
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, isLoading, fetchClaimHistory]);

  return (
    <div className="min-h-screen textured-bg">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-accent/5 via-transparent to-transparent animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="mb-8 flex items-center gap-2 font-outfit text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-primary rounded-2xl blur-xl opacity-50" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary shadow-lg">
                  <Trophy className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="font-syne text-4xl font-bold text-foreground">Claim History</h1>
                <p className="mt-1 font-outfit text-lg text-muted-foreground">
                  Your winning positions and rewards
                </p>
              </div>
            </div>
            {account?.address && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 font-outfit text-sm text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh claim history from blockchain"
              >
                <motion.div
                  animate={{ rotate: isRefreshing || isLoading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: isRefreshing || isLoading ? Infinity : 0, ease: "linear" }}
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.div>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            )}
          </motion.div>

          {/* Stats Summary */}
          {claims.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Layers className="h-4 w-4" />
                  <span className="font-outfit text-sm">Total Claims</span>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground">{claims.length}</p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Coins className="h-4 w-4" />
                  <span className="font-outfit text-sm">Total Earned</span>
                </div>
                <p className="font-mono text-2xl font-bold text-yes">{formatAmount(totalClaimed.toString())}</p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Hash className="h-4 w-4" />
                  <span className="font-outfit text-sm">Markets Won</span>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground">{marketSummary.size}</p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-outfit text-sm">Avg per Claim</span>
                </div>
                <p className="font-mono text-2xl font-bold text-accent">
                  {formatAmount((totalClaimed / claims.length).toString())}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {!account?.address ? (
            <motion.div
              key="not-connected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <HistoryIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                Connect Your Wallet
              </h3>
              <p className="max-w-sm text-center font-outfit text-muted-foreground">
                Connect your wallet to view your claim history.
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
              <p className="font-outfit text-muted-foreground">Loading your claim history...</p>
            </motion.div>
          ) : claims.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent via-primary to-border hidden sm:block" />

                {claims.map((claim, index) => {
                  const colorScheme = getMarketColor(claim.marketId);
                  const winningSide = getWinningSideLabel(claim.marketId, claim.marketInfo);

                  return (
                    <motion.div
                      key={`${claim.marketId}-${claim.positionId}-${claim.timestamp}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-0 sm:pl-16"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-4 top-6 hidden sm:flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${colorScheme.bg} ${colorScheme.border} border-2 shadow-lg ${colorScheme.glow}`}>
                        <div className={`h-2 w-2 rounded-full ${colorScheme.accent} bg-current`} />
                      </div>

                      <div
                        className={`group relative overflow-hidden rounded-2xl border ${colorScheme.border} bg-gradient-to-br ${colorScheme.bg} backdrop-blur-sm p-6 transition-all hover:shadow-xl ${colorScheme.glow} cursor-pointer`}
                        onClick={() => navigate(`/market/penny4thot-${claim.marketId}`)}
                      >
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -translate-x-full group-hover:translate-x-full duration-1000" />

                        {/* Header with market info */}
                        <div className="flex flex-col gap-4 mb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {claim.marketInfo ? (
                                <>
                                  <h3 className="font-syne text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                    {claim.marketInfo.title}
                                  </h3>
                                  <p className="font-outfit text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {claim.marketInfo.subtitle}
                                  </p>
                                </>
                              ) : (
                                <h3 className="font-syne text-lg font-bold text-foreground">
                                  Market #{claim.marketId}
                                </h3>
                              )}
                            </div>

                            {/* Amount badge */}
                            <div className="flex flex-col items-end">
                              <div className="rounded-xl bg-yes/20 px-4 py-2 backdrop-blur-sm">
                                <p className="font-mono text-xl font-bold text-yes">
                                  +{formatAmount(claim.amount)} {claim.tokenSymbol}
                                </p>
                              </div>
                              <span className="font-outfit text-xs text-muted-foreground mt-1">
                                {formatRelativeTime(claim.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Tags row */}
                          {claim.marketInfo?.tags && claim.marketInfo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {claim.marketInfo.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Details row */}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {/* Position ID */}
                          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5">
                            <Hash className={`h-3.5 w-3.5 ${colorScheme.accent}`} />
                            <span className="font-mono text-foreground/80">Position #{claim.positionId}</span>
                          </div>

                          {/* Winning side indicator */}
                          {winningSide && (
                            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${winningSide.isYes ? 'bg-yes/20' : 'bg-no/20'}`}>
                              {winningSide.isYes ? (
                                <TrendingUp className="h-3.5 w-3.5 text-yes" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 text-no" />
                              )}
                              <span className={`font-outfit ${winningSide.isYes ? 'text-yes' : 'text-no'}`}>
                                {winningSide.label} won
                              </span>
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-outfit text-foreground/80">{formatDate(claim.timestamp)}</span>
                          </div>

                          {/* Token link */}
                          <a
                            href={`${selectedNetwork.blockExplorer}/address/${claim.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                          >
                            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-xs text-muted-foreground">
                              {truncateAddress(claim.token)}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        </div>

                        {/* Click hint */}
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="font-outfit text-xs text-muted-foreground">Click to view market</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/10 to-primary/10">
                  <Sparkles className="h-10 w-10 text-accent" />
                </div>
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                No Claims Yet
              </h3>
              <p className="mb-6 max-w-sm text-center font-outfit text-muted-foreground">
                You haven't claimed any winnings yet. Vote on markets and claim your rewards when
                they resolve!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/app")}
                className="rounded-xl bg-gradient-to-r from-accent to-primary px-6 py-3 font-outfit font-semibold text-primary-foreground shadow-lg hover:shadow-xl transition-shadow"
              >
                Explore Markets
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
