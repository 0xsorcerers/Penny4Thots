import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { publicClient, isZeroAddress, ZERO_ADDRESS, blockchain } from "@/tools/utils";
import type { Address } from "viem";
import erc20 from "@/abi/ERC20.json";
import { Abi } from "viem";

interface MarketBalanceProps {
  marketBalance: string;
  paymentToken?: Address;
}

export function MarketBalance({ marketBalance, paymentToken }: MarketBalanceProps) {
  const [symbol, setSymbol] = useState<string>(blockchain.symbol);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (paymentToken && !isZeroAddress(paymentToken)) {
      const fetchSymbol = async () => {
        setIsLoading(true);
        try {
          const erc20ABI = erc20.abi as Abi;
          const fetchedSymbol = await publicClient.readContract({
            address: paymentToken,
            abi: erc20ABI,
            functionName: "symbol",
          });
          setSymbol(fetchedSymbol as string);
        } catch (err) {
          console.error("Failed to fetch token symbol:", err);
          setSymbol("TOKEN");
        } finally {
          setIsLoading(false);
        }
      };
      fetchSymbol();
    } else {
      setSymbol(blockchain.symbol);
    }
  }, [paymentToken]);

  const displayBalance = parseFloat(marketBalance).toFixed(4);
  const symbolColor =
    symbol === blockchain.symbol
      ? "text-primary" // Primary color for blockchain symbol (gold/emerald)
      : "text-accent"; // Accent color for tokens (cyan/coral)

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 font-mono text-xs">
      <Wallet className="h-3 w-3 text-slate-400" />
      <span className="text-blue-500 dark:text-foreground font-semibold">{displayBalance}</span>
      <span className={`font-bold ${symbolColor}`}>{symbol}</span>
      <span className="text-slate-400 dark:text-foreground">staked.</span>
    </div>
  );
}
