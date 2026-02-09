import { useState, useEffect, useMemo } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";

import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Users, Clock, Share2, Loader2, CircleDot, CircleOff, Hourglass, Gift } from "lucide-react";

import { useActiveAccount, useIsAutoConnecting } from "thirdweb/react";

import { useMarketStore } from "@/store/marketStore";

import { useMarketDataHydration } from "@/hooks/useMarketDataHydration";

import { useVote, useTokenApprove, readPaymentToken, readTokenAllowance, isZeroAddress, fetchDataConstants, calculatePlatformFeePercentage, fetchMarketDataFromBlockchain, isClaimable, type VoteParams } from "@/tools/utils";

import { VoteModal } from "@/components/market/VoteModal";

import { VoteStats } from "@/components/market/VoteStats";

import { MarketBalance } from "@/components/market/MarketBalance";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import type { Address } from "viem";

import { toast } from "sonner";







export default function MarketPage() {

  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

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
  });

  const market = useMarketStore((state) => state.getMarket(id || ""));

  const account = useActiveAccount();

  const isAutoConnecting = useIsAutoConnecting();

  const { vote, isPending: isVoting } = useVote();

  const { approve, isPending: isApproving } = useTokenApprove();







  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);



  const [selectedVoteSignal, setSelectedVoteSignal] = useState<boolean | null>(null);



  const [isSubmitting, setIsSubmitting] = useState(false);



  const [tradeMode, setTradeMode] = useState<"idle" | "active">("idle");



  const [paymentToken, setPaymentToken] = useState<Address | null>(null);



  const [platformFeePercentage, setPlatformFeePercentage] = useState<number | null>(null);

  const [marketClaimable, setMarketClaimable] = useState<boolean | null>(null);







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

  // Fetch claimable status when market is closed
  useEffect(() => {
    if (market?.indexer !== undefined && market?.closed) {
      const checkClaimable = async () => {
        try {
          const claimable = await isClaimable(market.indexer!);
          setMarketClaimable(claimable);
        } catch (err) {
          console.error("Failed to check if market is claimable:", err);
          setMarketClaimable(false);
        }
      };
      checkClaimable();
    } else {
      setMarketClaimable(null);
    }
  }, [market?.indexer, market?.closed]);

  // Log vote modal state for debugging


  useEffect(() => {



    console.log("MarketPage render - isVoteModalOpen:", isVoteModalOpen, "market.indexer:", market?.indexer, "market.posterImage:", market?.posterImage);



  }, [isVoteModalOpen, market?.indexer, market?.posterImage]);







  // Show loading state while hydrating data (deep-link scenario)
  if (isHydrating || !isHydrated) {
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



    console.log("Opening vote modal for market:", market.indexer, "signal:", signal, "posterImage:", market.posterImage);



    setSelectedVoteSignal(signal);



    setIsVoteModalOpen(true);



    console.log("Vote modal state set, isVoteModalOpen should now be true");



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



            description: "Approving the token spending in your wallet",



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
                tradeOptions: freshData.status,
                yesVotes: freshData.aVotes,
                noVotes: freshData.bVotes,
                marketBalance: freshData.marketBalance,
                status: freshData.status,
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



            onClick={() => navigate(-1)}



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
              {market.closed ? (
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-semibold text-red-500 dark:bg-red-500/20 dark:text-red-400">
                  <CircleOff className="h-3.5 w-3.5" />
                  Closed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CircleDot className="h-3.5 w-3.5" />
                  Live
                </span>
              )}

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
              /* Live Market - Show Vote Button */
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleVoteClick(true)}
                className="w-full relative overflow-hidden rounded-xl py-5 font-syne text-xl font-bold transition-all bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-500 hover:from-emerald-500 hover:to-teal-500 hover:text-white dark:from-emerald-500/30 dark:to-teal-500/30 dark:text-emerald-400 dark:hover:from-emerald-500 dark:hover:to-teal-500 dark:hover:text-white border border-emerald-500/30"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  Vote
                </span>
              </motion.button>
            ) : marketClaimable === null ? (
              /* Closed Market - Loading claimable status */
              <div className="w-full rounded-xl py-5 bg-muted/30 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="font-outfit text-muted-foreground">Checking status...</span>
              </div>
            ) : marketClaimable ? (
              /* Closed Market - Claimable - Show Claim Button */
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.info("Claim feature coming soon!")}
                className="w-full relative overflow-hidden rounded-xl py-5 font-syne text-xl font-bold transition-all bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 hover:from-amber-500 hover:to-orange-500 hover:text-white dark:from-amber-500/30 dark:to-orange-500/30 dark:text-amber-400 dark:hover:from-amber-500 dark:hover:to-orange-500 dark:hover:text-white border border-amber-500/30"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Gift className="h-6 w-6" />
                  Claim Rewards
                </span>
              </motion.button>
            ) : (
              /* Closed Market - Not Claimable - Show Resolving */
              <div className="w-full rounded-xl py-5 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20 flex items-center justify-center gap-2">
                <Hourglass className="h-5 w-5 text-slate-400 dark:text-slate-500 animate-pulse" />
                <span className="font-syne text-lg font-semibold text-slate-500 dark:text-slate-400">Resolving Market</span>
              </div>
            )}

          </motion.div>





          {/* Trade Section */}



          <motion.div



            initial={{ opacity: 0, y: 20 }}



            animate={{ opacity: 1, y: 0 }}



            transition={{ delay: 0.5 }}



            className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm"



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



