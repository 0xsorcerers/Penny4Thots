import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AutoConnect, useActiveAccount } from "thirdweb/react";
import { client, wallets } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useMarketStore } from "@/store/marketStore";
import { useTheme } from "@/hooks/useTheme";
import { applyNetworkTheme } from "@/tools/networkTheme";
import Welcome from "./pages/Welcome";
import Index from "./pages/Index";
import MarketPage from "./pages/MarketPage";
import MyThots from "./pages/MyThots";
import YourThots from "./pages/YourThots";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const FIRST_TIME_PREVIEW_KEY = "penny4thots-first-time-preview-complete";

function NetworkMarketCacheSync() {
  const chainId = useNetworkStore((state) => state.selectedNetwork.chainId);
  const switchToNetworkCache = useMarketStore((state) => state.switchToNetworkCache);

  useEffect(() => {
    switchToNetworkCache(chainId);
  }, [chainId, switchToNetworkCache]);

  return null;
}

function NetworkThemeSync() {
  const chainId = useNetworkStore((state) => state.selectedNetwork.chainId);
  const { theme } = useTheme();

  useEffect(() => {
    applyNetworkTheme(chainId, theme);
  }, [chainId, theme]);

  return null;
}

function HomeRoute() {
  const account = useActiveAccount();
  const [showPreview, setShowPreview] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    if (account) {
      setShowPreview(true);
      setIsResolved(true);
      return;
    }

    try {
      const hasCompletedFirstPreview = localStorage.getItem(FIRST_TIME_PREVIEW_KEY) === "true";

      if (!hasCompletedFirstPreview) {
        localStorage.setItem(FIRST_TIME_PREVIEW_KEY, "true");
      }

      setShowPreview(!hasCompletedFirstPreview);
    } catch (error) {
      console.error("Failed to resolve first-time preview state:", error);
      setShowPreview(true);
    } finally {
      setIsResolved(true);
    }
  }, [account]);

  if (!isResolved) {
    return null;
  }

  if (showPreview) {
    return <Index />;
  }

  return <Welcome />;
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
        <NetworkThemeSync />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
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
