import { useState } from "react";
import { GetStartedPage } from "@/components/landing/GetStartedPage";
import { Header } from "@/components/layout/Header";
import { MarketGrid } from "@/components/market/MarketGrid";
import { CreateMarketModal } from "@/components/market/CreateMarketModal";
import { useMarketStore } from "@/store/marketStore";
import { useActiveAccount } from "thirdweb/react";
import { useWriteMarket, parseEther, readFee } from "@/tools/utils";
import type { CreateMarketData } from "@/types/market";
import { toast } from "sonner";

export default function Index() {
  const { markets, addMarket } = useMarketStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const account = useActiveAccount();
  const { writeMarket, isPending, error } = useWriteMarket();

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  const handleCreateMarket = async (data: CreateMarketData & { marketBalance: string; initialVote: "YES" | "NO" }) => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsSubmitting(true);
    try {
      const fee = await readFee();
      const marketBalanceBigInt = parseEther(data.marketBalance);

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

      // Add to local store on success
      addMarket(data);
      toast.success("Market created successfully!");
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create market:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create market");
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
      <MarketGrid markets={markets} onCreateMarket={() => setIsCreateModalOpen(true)} />
      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateMarket}
        isLoading={isSubmitting}
      />
    </div>
  );
}
