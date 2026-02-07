import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AutoConnect, ThirdwebProvider } from "thirdweb/react";
import { client, wallets } from "@/tools/utils";
import Welcome from "./pages/Welcome";
import Index from "./pages/Index";
import MarketPage from "./pages/MarketPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThirdwebProvider>
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/app" element={<Index />} />
            <Route path="/market/:id" element={<MarketPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThirdwebProvider>
);

export default App;
