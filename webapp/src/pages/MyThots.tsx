import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowLeft, Loader2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount } from "thirdweb/react";
import { MarketCardMyThots } from "@/components/market/MarketCardMyThots";
import { VoteModal } from "@/components/market/VoteModal";
import { Button } from "@/components/ui/button";
import type { Market } from "@/types/market";
import type { Address } from "viem";
import { toast } from "sonner";
import {
  getUserThots,
  getUserTotalThots,
  readMarketInfo,
  readMarketData,
  useVote,
  useTokenApprove,
  readTokenAllowance,
  readTokenBalance,
  blockchain,
  formatEther,
  type MarketInfoFormatted,
  type MarketDataFormatted,
  type VoteParams,
} from "@/tools/utils";

const BATCH_SIZE = 200;
const BATCH_DELAY_MS = 3000;
const ITEMS_PER_PAGE = 30;
const STORAGE_KEY = "penny4thots-mythots-cache";

interface CachedMarketInfo {
  [key: number]: MarketInfoFormatted;
}

const getCache = (): CachedMarketInfo => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const setCache = (cache: CachedMarketInfo) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    console.warn("Failed to save to localStorage");
  }
};

export default function MyThots() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const [allMarketIds, setAllMarketIds] = useState<number[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [voteModalData, setVoteModalData] = useState<{
    marketId: number;
    marketTitle: string;
    marketImage?: string;
    optionA?: string;
    optionB?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cachedInfoRef = useRef<CachedMarketInfo>(getCache());

  const { vote, isPending: isVoting } = useVote();
  const { approve, isPending: isApproving } = useTokenApprove();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchAllMarketIds = useCallback(async () => {
    if (!account?.address) {
      console.log("[MyThots] No account connected");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userAddress = account.address as Address;
      console.log("[MyThots] Fetching for address:", userAddress);

      setLoadingProgress("Fetching total count...");
      const count = await getUserTotalThots(userAddress);
      console.log("[MyThots] Total thots count:", count);
      setTotalCount(count);

      if (count === 0) {
        console.log("[MyThots] User has no thots");
        setAllMarketIds([]);
        setIsLoading(false);
        return;
      }

      const allIds: number[] = [];
      const numBatches = Math.ceil(count / BATCH_SIZE);

      for (let batch = 0; batch < numBatches; batch++) {
        const start = batch * BATCH_SIZE;
        const finish = Math.min(start + BATCH_SIZE, count);

        setLoadingProgress(`Loading batch ${batch + 1}/${numBatches}...`);
        console.log(`[MyThots] Fetching batch ${batch + 1}: start=${start}, finish=${finish}`);
        const batchIds = await getUserThots(userAddress, start, finish);
        console.log("[MyThots] Batch IDs received:", batchIds);
        allIds.push(...batchIds);

        if (batch < numBatches - 1) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      console.log("[MyThots] All IDs before filter:", allIds);
      const validIds = [...new Set(allIds.filter((id) => id > 0))];
      console.log("[MyThots] Valid IDs after filter:", validIds);
      validIds.sort((a, b) => b - a);
      setAllMarketIds(validIds);
      setCurrentPage(1);
    } catch (error) {
      console.error("[MyThots] Error fetching user thots:", error);
      setAllMarketIds([]);
    } finally {
      setIsLoading(false);
      setLoadingProgress("");
    }
  }, [account?.address]);

  const loadMarketsForPage = useCallback(async (page: number, ids: number[]) => {
    if (ids.length === 0) {
      setMarkets([]);
      return;
    }

    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, ids.length);
    const pageIds = ids.slice(startIdx, endIdx);

    if (pageIds.length === 0) {
      setMarkets([]);
      return;
    }

    const cache = cachedInfoRef.current;
    const uncachedIds = pageIds.filter(id => !cache[id]);
    const cachedInfos = pageIds.filter(id => cache[id]).map(id => cache[id]);

    let newInfos: MarketInfoFormatted[] = [];
    if (uncachedIds.length > 0) {
      newInfos = await readMarketInfo(uncachedIds);
      newInfos.forEach(info => {
        cache[info.indexer] = info;
      });
      cachedInfoRef.current = cache;
      setCache(cache);
    }

    const allInfos = [...cachedInfos, ...newInfos];
    const dataArray = await readMarketData(pageIds);

    const dataMap = new Map<number, MarketDataFormatted>();
    dataArray.forEach((data, idx) => {
      dataMap.set(pageIds[idx], { ...data, indexer: pageIds[idx] });
    });

    const infoMap = new Map<number, MarketInfoFormatted>();
    allInfos.forEach(info => {
      infoMap.set(info.indexer, info);
    });

    const formattedMarkets = pageIds
      .map((id) => {
        const info = infoMap.get(id);
        const data = dataMap.get(id);
        if (!info) return null;
        return {
          id: `penny4thot-${info.indexer}`,
          indexer: info.indexer,
          creator: data?.creator || "",
          title: info.title,
          subtitle: info.subtitle,
          description: info.description,
          posterImage: info.image,
          tags: info.tags,
          tradeOptions: data?.status || false,
          yesVotes: data?.aVotes || 0,
          noVotes: data?.bVotes || 0,
          createdAt: new Date().toISOString(),
          marketBalance: data?.marketBalance || "0",
          status: data?.status || false,
          optionA: info.optionA || "Yes",
          optionB: info.optionB || "No",
          startTime: data?.startTime || 0,
          endTime: data?.endTime || 0,
          closed: data?.closed || false,
          winningSide: data?.winningSide || 0,
          totalSharesA: data?.totalSharesA || "0",
          totalSharesB: data?.totalSharesB || "0",
          positionCount: data?.positionCount || 0,
        } as Market;
      })
      .filter((m): m is Market => m !== null);

    setMarkets(formattedMarkets);
  }, []);

  useEffect(() => {
    fetchAllMarketIds();
  }, [fetchAllMarketIds]);

  useEffect(() => {
    if (allMarketIds.length > 0) {
      loadMarketsForPage(currentPage, allMarketIds);
    }
  }, [currentPage, allMarketIds, loadMarketsForPage]);

  const totalPages = Math.ceil(allMarketIds.length / ITEMS_PER_PAGE);

  const handleVoteClick = (marketId: number) => {
    const market = markets.find((m) => m.indexer === marketId);
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
      toast.error("Please connect your wallet first");
      throw new Error("Wallet not connected");
    }

    setIsSubmitting(true);
    try {
      if (voteParams.feetype) {
        const userBalance = await readTokenBalance(
          voteParams.paymentToken,
          account.address as Address
        );

        if (userBalance < voteParams.marketBalance) {
          const balanceInEth = formatEther(userBalance);
          const requiredInEth = formatEther(voteParams.marketBalance);
          toast.error("Insufficient token balance", {
            description: `You have ${balanceInEth} but need ${requiredInEth}`,
          });
          throw new Error(`Insufficient balance: have ${balanceInEth}, need ${requiredInEth}`);
        }

        const currentAllowance = await readTokenAllowance(
          voteParams.paymentToken,
          account.address as Address,
          blockchain.contract_address
        );

        if (currentAllowance < voteParams.marketBalance) {
          toast.info("Approval required", {
            description: "Approving the token spending in your wallet",
          });

          await approve(voteParams.paymentToken, voteParams.marketBalance);
          toast.success("Token approved!");
        }
      }

      await vote(voteParams);
      toast.success("Vote submitted successfully!");
      await loadMarketsForPage(currentPage, allMarketIds);
    } catch (err: unknown) {
      console.error("Failed to vote:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.toLowerCase().includes("reject") ||
        errorMessage.toLowerCase().includes("denied") ||
        errorMessage.toLowerCase().includes("cancel") ||
        errorMessage.toLowerCase().includes("user refused")
      ) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(errorMessage || "Failed to submit vote");
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header - Emerald/Teal theme for My Thots */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/app")}
            className="mb-8 flex items-center gap-2 font-outfit text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="font-syne text-4xl font-bold text-foreground">My Thots</h1>
              <p className="mt-1 font-outfit text-lg text-muted-foreground">
                Markets you've created
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex items-center gap-3"
          >
            <div className="rounded-full bg-emerald-500/10 px-4 py-2">
              <span className="font-mono text-sm text-emerald-500">
                {allMarketIds.length} {allMarketIds.length === 1 ? "market" : "markets"}
              </span>
            </div>
            {totalPages > 1 && (
              <div className="rounded-full bg-muted px-4 py-2">
                <span className="font-mono text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {!account?.address ? (
            <motion.div
              key="not-connected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/30 bg-card/50 py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Brain className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                Connect Your Wallet
              </h3>
              <p className="max-w-sm text-center font-outfit text-muted-foreground">
                Connect your wallet to view the markets you've created.
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/30 bg-card/50 py-20"
            >
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
              <p className="font-outfit text-muted-foreground">{loadingProgress || "Loading your thots..."}</p>
            </motion.div>
          ) : markets.length > 0 ? (
            <>
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {markets.map((market, index) => (
                  <motion.div
                    key={market.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <MarketCardMyThots market={market} onVoteClick={handleVoteClick} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "border-emerald-500/30 hover:bg-emerald-500/10"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/30 bg-card/50 py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Sparkles className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                No Thots Yet
              </h3>
              <p className="mb-6 max-w-sm text-center font-outfit text-muted-foreground">
                You haven't created any prediction markets yet. Start sharing your thots with the
                world!
              </p>
              <Button
                onClick={() => navigate("/app")}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 font-outfit font-semibold"
              >
                Create Your First Thot
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vote Modal */}
      {voteModalData && (
        <VoteModal
          isOpen={isVoteModalOpen}
          onClose={() => {
            setIsVoteModalOpen(false);
            setVoteModalData(null);
          }}
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
