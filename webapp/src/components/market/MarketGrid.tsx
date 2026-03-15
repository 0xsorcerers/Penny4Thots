import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Sparkles, Loader2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import type { Market } from "@/types/market";
import { MarketCard } from "./MarketCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileDropdown } from "@/components/profile/ProfileDropdown";
import { MarketSearchIndex } from "@/lib/marketSearchIndex";

const SEARCH_DEBOUNCE_MS = 3000;



interface MarketGridProps {
  markets: Market[];
  allMarkets: Market[];
  marketCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onCreateMarket: () => void;
  onVoteClick?: (marketId: number, signal: boolean) => void;
  onRefreshMarkets?: () => void;
  onSearchResultsChange?: (marketIds: number[]) => void;
  showClosedMarkets?: boolean;
  onToggleClosedMarkets?: () => void;
  isLoading?: boolean;
}

export function MarketGrid({
  markets,
  allMarkets,
  marketCount,
  currentPage,
  pageSize,
  onPageChange,
  onCreateMarket,
  onVoteClick,
  onRefreshMarkets,
  onSearchResultsChange,
  showClosedMarkets = true,
  onToggleClosedMarkets,
  isLoading = false,
}: MarketGridProps) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "trending" | "marketcap">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const searchIndex = useMemo(() => new MarketSearchIndex(allMarkets), [allMarkets]);
  const allMarketMap = useMemo(() => new Map(allMarkets.map((m) => [m.indexer, m])), [allMarkets]);

  const isNumericSearch = debouncedQuery.length > 0 && /^\d+$/.test(debouncedQuery);

  const searchedMarketIds = useMemo(() => {
    if (!debouncedQuery) return [];
    if (isNumericSearch) {
      return searchIndex.findById(Number(debouncedQuery));
    }
    return searchIndex.search(debouncedQuery);
  }, [debouncedQuery, isNumericSearch, searchIndex]);

  const liveMarkets = useMemo(
    () => allMarkets.filter((market) => !market.closed),
    [allMarkets]
  );

  const filteredMarkets = useMemo(() => {
    const sourceMarkets = debouncedQuery
      ? searchedMarketIds.map((id) => allMarketMap.get(id)).filter((m): m is Market => Boolean(m))
      : selectedFilter === "all"
      ? markets
      : liveMarkets;

    if (selectedFilter === "trending") {
      return [...sourceMarkets].sort(
        (a, b) => Number(b.activity ?? 0) - Number(a.activity ?? 0)
      );
    }

    if (selectedFilter === "marketcap") {
      return [...sourceMarkets].sort(
        (a, b) => Number(b.marketBalance ?? 0) - Number(a.marketBalance ?? 0)
      );
    }

    return [...sourceMarkets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [markets, selectedFilter, debouncedQuery, searchedMarketIds, allMarketMap, liveMarkets]);

  const isUsingDerivedPagination = debouncedQuery.length > 0 || selectedFilter !== "all";
  const effectiveMarketCount = isUsingDerivedPagination ? filteredMarkets.length : marketCount;
  const totalPages = Math.max(1, Math.ceil(effectiveMarketCount / pageSize));

  const visibleMarkets = useMemo(() => {
    if (!isUsingDerivedPagination) {
      return filteredMarkets;
    }

    const startIdx = (currentPage - 1) * pageSize;
    return filteredMarkets.slice(startIdx, startIdx + pageSize);
  }, [currentPage, filteredMarkets, isUsingDerivedPagination, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  useEffect(() => {
    onPageChange(1);
  }, [selectedFilter, debouncedQuery, onPageChange]);

  const lastHydratedSearchIdsRef = useRef<string>("");

  useEffect(() => {
    if (!debouncedQuery || !onSearchResultsChange) {
      lastHydratedSearchIdsRef.current = "";
      return;
    }

    const idsToHydrate = visibleMarkets
      .map((m) => m.indexer)
      .filter((id): id is number => typeof id === "number")
      .slice(0, pageSize);

    const hydrationKey = idsToHydrate.join(",");
    if (hydrationKey === lastHydratedSearchIdsRef.current) return;

    lastHydratedSearchIdsRef.current = hydrationKey;
    onSearchResultsChange(idsToHydrate);
  }, [visibleMarkets, onSearchResultsChange, pageSize, debouncedQuery]);

  const visibleStart = effectiveMarketCount === 0 ? 0 : Math.max(0, effectiveMarketCount - ((currentPage - 1) * pageSize) - 1);
  const visibleEnd = effectiveMarketCount === 0 ? 0 : Math.max(0, visibleStart - pageSize + 1);

  const getPagePickerItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis", totalPages] as const;
    }

    if (currentPage >= totalPages - 3) {
      return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    }

    return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages] as const;
  };

  const renderPagePicker = (className = "") => (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-border/40 bg-card/35 px-3 py-2 backdrop-blur-sm ${className}`}>
      <div />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" className="bg-background/35 border-border/45" size="icon" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || isLoading}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getPagePickerItems().map((item, idx) => {
          if (item === "ellipsis") {
            return <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">...</span>;
          }
          return (
            <Button
              key={item}
              variant={currentPage === item ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(item)}
              disabled={isLoading}
              className={currentPage === item ? "bg-primary/85" : "bg-background/35 border-border/45"}
            >
              {item}
            </Button>
          );
        })}
        <Button variant="outline" className="bg-background/35 border-border/45" size="icon" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || isLoading}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggleClosedMarkets}
          className={`rounded-full border px-3 py-1.5 font-outfit text-xs transition-colors ${
            showClosedMarkets
              ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/20"
              : "border-border/50 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <span className="inline-block theme-option-a-gradient-text animate-shimmer-sweep">
            {showClosedMarkets ? "Hide Closed Markets" : "Show Closed Markets"}
          </span>
        </button>
      </div>
    </div>
  );
  const handleRefreshMarkets = async () => {
    if (isRefreshing || !onRefreshMarkets) return;
    setIsRefreshing(true);
    try {
      await onRefreshMarkets();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="font-syne text-3xl font-bold theme-option-a-gradient-text animate-shimmer-sweep">Markets</h1>
            <p className="mt-1 font-outfit theme-text-accent">
              {effectiveMarketCount} prediction {effectiveMarketCount === 1 ? "market" : "markets"} available
            </p>
            <p className="mt-1 font-outfit text-sm theme-text-support">
              {debouncedQuery
                ? `Search results: ${filteredMarkets.length}`
                : `Page ${currentPage} of ${totalPages} • Range ${visibleStart} - ${visibleEnd}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleRefreshMarkets}
              disabled={isRefreshing || isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border transition-all theme-vote-chip disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh all markets from blockchain"
            >
              <motion.div
                animate={{ rotate: isRefreshing || isLoading ? 360 : 0 }}
                transition={{ duration: 1, repeat: isRefreshing || isLoading ? Infinity : 0 }}
              >
                <RotateCcw className="h-5 w-5" />
              </motion.div>
            </motion.button>

            <Button
              onClick={onCreateMarket}
              className="group relative overflow-hidden rounded-xl bg-primary font-outfit font-semibold"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Market
              </span>
            </Button>

            <ProfileDropdown />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search markets by id, title, subtitle, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl pl-10 font-outfit placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${
                selectedFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              All ({marketCount})
            </button>
            <button
              onClick={() => setSelectedFilter("trending")}
              className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${
                selectedFilter === "trending"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              Trending ({liveMarkets.length})
            </button>
            <button
              onClick={() => setSelectedFilter("marketcap")}
              className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${
                selectedFilter === "marketcap"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              Marketcap ({liveMarkets.length})
            </button>
          </div>
        </motion.div>

        {effectiveMarketCount > 0 && renderPagePicker("mb-6") }

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 theme-surface-soft"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="font-outfit theme-text-support">Loading markets from blockchain...</p>
            </motion.div>
          ) : visibleMarkets.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visibleMarkets.map((market, index) => (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MarketCard market={market} onVoteClick={onVoteClick} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 theme-surface-soft"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 theme-text-accent" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                {searchQuery || selectedFilter !== "all" ? "No markets found" : "No markets yet"}
              </h3>
              <p className="mb-6 max-w-sm text-center font-outfit theme-text-support">
                {searchQuery || selectedFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Be the first to create a prediction market and share your insights with the world."}
              </p>
              {!searchQuery && selectedFilter === "all" && (
                <Button
                  onClick={onCreateMarket}
                  className="rounded-xl bg-primary font-outfit font-semibold"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Market
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {effectiveMarketCount > 0 && renderPagePicker("mt-6")}
      </div>
    </div>
  );
}
