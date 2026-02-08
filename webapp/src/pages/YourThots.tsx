import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount } from "thirdweb/react";
import { MarketCard } from "@/components/market/MarketCard";
import { VoteModal } from "@/components/market/VoteModal";
import { Button } from "@/components/ui/button";
import type { Market } from "@/types/market";
import type { Address } from "viem";
import { toast } from "sonner";
import {
  getUserMarkets,
  getUserMarketsCount,
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

export default function YourThots() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [voteModalData, setVoteModalData] = useState<{
    marketId: number;
    marketTitle: string;
    marketImage?: string;
    optionA?: string;
    optionB?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { vote, isPending: isVoting } = useVote();
  const { approve, isPending: isApproving } = useTokenApprove();

  const fetchUserMarkets = useCallback(async () => {
    if (!account?.address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userAddress = account.address as Address;

      // Get the count of user's voted markets
      const count = await getUserMarketsCount(userAddress);

      if (count === 0) {
        setMarkets([]);
        setIsLoading(false);
        return;
      }

      // Fetch the market IDs
      const marketIds = await getUserMarkets(userAddress, 0, count);

      // Filter out zeros and duplicates
      const validIds = [...new Set(marketIds.filter((id) => id > 0))];

      if (validIds.length === 0) {
        setMarkets([]);
        setIsLoading(false);
        return;
      }

      // Fetch market info and data
      const [infos, dataArray] = await Promise.all([
        readMarketInfo(validIds),
        readMarketData(validIds),
      ]);

      // Create a map for data
      const dataMap = new Map<number, MarketDataFormatted>();
      dataArray.forEach((data, idx) => {
        dataMap.set(validIds[idx], { ...data, indexer: validIds[idx] });
      });

      // Convert to Market format
      const formattedMarkets: Market[] = infos.map((info: MarketInfoFormatted) => {
        const data = dataMap.get(info.indexer);
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
        };
      });

      setMarkets(formattedMarkets);
    } catch (error) {
      console.error("Error fetching user markets:", error);
      setMarkets([]);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchUserMarkets();
  }, [fetchUserMarkets]);

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
            description: "Please approve the token spending in your wallet",
          });

          await approve(voteParams.paymentToken, voteParams.marketBalance);
          toast.success("Token approved!");
        }
      }

      await vote(voteParams);
      toast.success("Vote submitted successfully!");
      await fetchUserMarkets();
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
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-secondary/5 via-transparent to-transparent" />

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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-accent shadow-lg shadow-secondary/25">
              <MessageCircle className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-syne text-4xl font-bold text-foreground">Your Thots</h1>
              <p className="mt-1 font-outfit text-lg text-muted-foreground">
                Markets you've voted on
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex items-center gap-3"
          >
            <div className="rounded-full bg-secondary/10 px-4 py-2">
              <span className="font-mono text-sm text-secondary">
                {markets.length} {markets.length === 1 ? "market" : "markets"}
              </span>
            </div>
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
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                Connect Your Wallet
              </h3>
              <p className="max-w-sm text-center font-outfit text-muted-foreground">
                Connect your wallet to view the markets you've voted on.
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
              <Loader2 className="h-10 w-10 animate-spin text-secondary mb-4" />
              <p className="font-outfit text-muted-foreground">Loading your voted markets...</p>
            </motion.div>
          ) : markets.length > 0 ? (
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
                  transition={{ delay: index * 0.05 }}
                >
                  <MarketCard market={market} onVoteClick={handleVoteClick} />
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
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <Sparkles className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                No Votes Yet
              </h3>
              <p className="mb-6 max-w-sm text-center font-outfit text-muted-foreground">
                You haven't voted on any prediction markets yet. Explore markets and share your
                thots!
              </p>
              <Button
                onClick={() => navigate("/app")}
                className="rounded-xl bg-secondary font-outfit font-semibold text-secondary-foreground"
              >
                Explore Markets
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
