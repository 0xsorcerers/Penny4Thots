import { useState, useEffect, useCallback } from "react";
import { GetStartedPage } from "@/components/landing/GetStartedPage";
import { Header } from "@/components/layout/Header";
import { MarketGrid } from "@/components/market/MarketGrid";
import { CreateMarketModal } from "@/components/market/CreateMarketModal";
import { useMarketStore } from "@/store/marketStore";
import { useActiveAccount } from "thirdweb/react";
import { useWriteMarket, readFee, fetchMarketsFromBlockchain, fetchMarketDataFromBlockchain, readMarketCount, toWei } from "@/tools/utils";
import type { CreateMarketData } from "@/types/market";
import { toast } from "sonner";

export default function Index() {
  const { markets, setMarketsFromBlockchain, updateMarketData, marketInfos, isLoadingFromBlockchain, setIsLoadingFromBlockchain } = useMarketStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFetchedCount, setLastFetchedCount] = useState(0);
  const account = useActiveAccount();
  const { writeMarket, isPending, error } = useWriteMarket();

  // Smart fetch that only loads new markets not already in localStorage
  const loadMarketsFromBlockchain = useCallback(async () => {
    setIsLoadingFromBlockchain(true);
    try {
      const currentMarketCount = await readMarketCount();

      // If no new markets, just refresh market data
      if (currentMarketCount === lastFetchedCount && marketInfos.length > 0) {
        const marketDataMap = await fetchMarketDataFromBlockchain(
          marketInfos.map(m => m.indexer)
        );
        const dataMap = new Map(
          marketDataMap.map((data, idx) => [marketInfos[idx].indexer, data])
        );
        updateMarketData(dataMap);
      } else {
        // Fetch all market info and data
        const blockchainInfos = await fetchMarketsFromBlockchain();
        const marketDataMap = await fetchMarketDataFromBlockchain(
          blockchainInfos.map(m => m.indexer)
        );
        const dataMap = new Map(
          marketDataMap.map((data, idx) => [blockchainInfos[idx].indexer, data])
        );
        setMarketsFromBlockchain(blockchainInfos, dataMap);
        setLastFetchedCount(currentMarketCount);
      }
    } catch (err) {
      console.error("Failed to load markets from blockchain:", err);
      toast.error("Failed to load markets from blockchain");
    } finally {
      setIsLoadingFromBlockchain(false);
    }
  }, [lastFetchedCount, marketInfos, setMarketsFromBlockchain, updateMarketData, setIsLoadingFromBlockchain]);

  useEffect(() => {
    if (account) {
      loadMarketsFromBlockchain();
    }
  }, [account, loadMarketsFromBlockchain]);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  const handleCreateMarket = async (data: CreateMarketData & { marketBalance: string; initialVote: "YES" | "NO" }) => {
    if (!account) {
      toast.error("Please connect your wallet first");
      throw new Error("Wallet not connected");
    }

    setIsSubmitting(true);
    try {
      const fee = await readFee();
      const marketBalanceBigInt = toWei(data.marketBalance);

      // Call blockchain
      await writeMarket({
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        image: data.posterImage,
        tags: data.tags.join(","),
        marketBalance: marketBalanceBigInt,
        fee: fee,
      });

      toast.success("Market created successfully!");
      setIsCreateModalOpen(false);

      // Reload markets from blockchain after successful transaction
      await loadMarketsFromBlockchain();
    } catch (err: unknown) {
      console.error("Failed to create market:", err);
      // Check if user rejected/cancelled the transaction
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes("reject") ||
          errorMessage.toLowerCase().includes("denied") ||
          errorMessage.toLowerCase().includes("cancel") ||
          errorMessage.toLowerCase().includes("user refused")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(errorMessage || "Failed to create market");
      }
      // Re-throw so modal knows submission failed and doesn't reset form
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show GetStartedPage if user is not connected
  if (!account) {
    return <GetStartedPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onConnect={handleConnect} isConnected={isConnected} />
      <MarketGrid
        markets={markets}
        onCreateMarket={() => setIsCreateModalOpen(true)}
        isLoading={isLoadingFromBlockchain}
      />
      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateMarket}
        isLoading={isSubmitting}
      />
    </div>
  );
}
