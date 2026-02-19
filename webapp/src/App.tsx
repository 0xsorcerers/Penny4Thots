import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AutoConnect } from "thirdweb/react";
import { client, wallets } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useMarketStore } from "@/store/marketStore";
import Welcome from "./pages/Welcome";
import Index from "./pages/Index";
import MarketPage from "./pages/MarketPage";
import MyThots from "./pages/MyThots";
import YourThots from "./pages/YourThots";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function NetworkMarketCacheSync() {
  const chainId = useNetworkStore((state) => state.selectedNetwork.chainId);
  const switchToNetworkCache = useMarketStore((state) => state.switchToNetworkCache);

  useEffect(() => {
    switchToNetworkCache(chainId);
  }, [chainId, switchToNetworkCache]);

  return null;
}

const App = () => (
  <>
    <AutoConnect
      client={client}
      wallets={wallets}
      appMetadata={{
        name: "Penny4Thots",
        url: window.location.origin,
        description: "Penny4Thots Prediction Markets",
        logoUrl: `${window.location.origin}/logo-white-no-bkg.webp`,
      }}
    />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NetworkMarketCacheSync />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/app" element={<Index />} />
            <Route path="/market/:id" element={<MarketPage />} />
            <Route path="/my-thots" element={<MyThots />} />
            <Route path="/your-thots" element={<YourThots />} />
            <Route path="/history" element={<History />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </>
);

export default App;
