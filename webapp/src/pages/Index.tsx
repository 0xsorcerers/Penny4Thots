import { useState } from "react";
import { GetStartedPage } from "@/components/landing/GetStartedPage";
import { Header } from "@/components/layout/Header";
import { MarketGrid } from "@/components/market/MarketGrid";
import { CreateMarketModal } from "@/components/market/CreateMarketModal";
import { useMarketStore } from "@/store/marketStore";
import { useActiveAccount } from "thirdweb/react";
import type { CreateMarketData } from "@/types/market";

export default function Index() {
  const { markets, addMarket } = useMarketStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const account = useActiveAccount();

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  const handleCreateMarket = (data: CreateMarketData) => {
    addMarket(data);
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
      />
    </div>
  );
}
