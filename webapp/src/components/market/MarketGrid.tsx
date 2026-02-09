import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Sparkles, Loader2, RotateCcw } from "lucide-react";
import type { Market } from "@/types/market";
import { MarketCard } from "./MarketCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfileDropdown } from "@/components/profile/ProfileDropdown";

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface MarketGridProps {
  markets: Market[];
  onCreateMarket: () => void;
  onVoteClick?: (marketId: number, signal: boolean) => void;
  onRefreshMarkets?: () => void;
  isLoading?: boolean;
}

export function MarketGrid({ markets, onCreateMarket, onVoteClick, onRefreshMarkets, isLoading = false }: MarketGridProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract all unique tags and shuffle them
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    markets.forEach((market) => {
      market.tags.forEach((tag) => tagSet.add(tag));
    });
    const sortedTags = Array.from(tagSet).sort();
    return shuffleArray(sortedTags);
  }, [markets]);

  // Filter and sort markets
  const filteredMarkets = useMemo(() => {
    let filtered = markets;

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter((m) => m.tags.includes(selectedTag));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.subtitle.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    // Sort by creation date (newest first)
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [markets, selectedTag, searchQuery]);

  // Show "More" button when there are more than 20 tags

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
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="font-syne text-3xl font-bold text-foreground">Markets</h1>
            <p className="mt-1 font-outfit text-muted-foreground">
              {markets.length} prediction {markets.length === 1 ? "market" : "markets"} available
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleRefreshMarkets}
              disabled={isRefreshing || isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Search & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-border/50 bg-card pl-10 font-outfit placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
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

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${
                  selectedTag === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                All
              </button>
              {allTags.slice(0, 20).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${
                    selectedTag === tag
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
              {allTags.length > 20 && (
                <button
                  onClick={() => setShowAllTags(true)}
                  className="rounded-full px-3 py-1.5 font-mono text-xs bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all flex-shrink-0"
                >
                  +{allTags.length - 20} more
                </button>
              )}
            </div>
          )}

          {/* All Tags Modal */}
          <Dialog open={showAllTags} onOpenChange={setShowAllTags}>
            <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm border-border/50">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Filter by Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select a tag to filter markets</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedTag(null);
                      setShowAllTags(false);
                    }}
                    className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${
                      selectedTag === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTag(selectedTag === tag ? null : tag);
                        setShowAllTags(false);
                      }}
                      className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${
                        selectedTag === tag
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Markets Grid or Empty State */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="font-outfit text-muted-foreground">Loading markets from blockchain...</p>
            </motion.div>
          ) : filteredMarkets.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
                  {filteredMarkets.map((market, index) => (
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
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                {searchQuery || selectedTag ? "No markets found" : "No markets yet"}
              </h3>
              <p className="mb-6 max-w-sm text-center font-outfit text-muted-foreground">
                {searchQuery || selectedTag
                  ? "Try adjusting your search or filter criteria."
                  : "Be the first to create a prediction market and share your insights with the world."}
              </p>
              {!searchQuery && !selectedTag && (
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
      </div>
    </div>
  );
}
