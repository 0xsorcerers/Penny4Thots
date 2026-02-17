import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { getPublicClient, isZeroAddress, ZERO_ADDRESS, readTokenDecimals, fromTokenSmallestUnit } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import type { Address } from "viem";
import erc20 from "@/abi/ERC20.json";
import { Abi } from "viem";
import { useTheme } from "@/hooks/use-theme";

interface MarketBalanceProps {
  marketBalance: bigint; // Raw balance in token's smallest unit
  paymentToken?: Address;
}

export function MarketBalance({ marketBalance, paymentToken }: MarketBalanceProps) {
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const [symbol, setSymbol] = useState<string>(selectedNetwork.symbol);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18); // Default to 18
  const [isLoading, setIsLoading] = useState(false);
  const { isLight } = useTheme();

  useEffect(() => {
    if (paymentToken && !isZeroAddress(paymentToken)) {
      const fetchTokenInfo = async () => {
        setIsLoading(true);
        try {
          const client = getPublicClient(selectedNetwork);
          const erc20ABI = erc20.abi as Abi;
          
          // Fetch both symbol and decimals in parallel
          const [fetchedSymbol, decimals] = await Promise.all([
            client.readContract({
              address: paymentToken,
              abi: erc20ABI,
              functionName: "symbol",
            }),
            readTokenDecimals(paymentToken)
          ]);
          
          setSymbol(fetchedSymbol as string);
          setTokenDecimals(decimals);
        } catch (err) {
          console.error("Failed to fetch token info:", err);
          setSymbol("TOKEN");
          setTokenDecimals(18); // Reset to default
        } finally {
          setIsLoading(false);
        }
      };
      fetchTokenInfo();
    } else {
      setSymbol(selectedNetwork.symbol);
      setTokenDecimals(18); // ETH uses 18 decimals
    }
  }, [paymentToken, selectedNetwork]);

  // Convert market balance using proper decimal handling
  const displayBalance = (() => {
    if (!paymentToken || isZeroAddress(paymentToken)) {
      // ETH - convert from 18 decimals to readable format
      const ethBalance = fromTokenSmallestUnit(marketBalance, 18);
      const ethValue = parseFloat(ethBalance);
      return ethValue >= 10 ? ethValue.toFixed(1) : ethValue.toFixed(4);
    } else {
      // Token - convert from smallest unit using token decimals
      try {
        const formattedBalance = fromTokenSmallestUnit(marketBalance, tokenDecimals);
        const tokenValue = parseFloat(formattedBalance);
        return tokenValue >= 10 ? tokenValue.toFixed(1) : tokenValue.toFixed(4);
      } catch {
        // Fallback if conversion fails
        return marketBalance.toString();
      }
    }
  })();
  const symbolColor =
    symbol === selectedNetwork.symbol
      ? isLight
        ? "text-amber-600" // Amber color for blockchain symbol in light mode
        : "text-primary"   // Primary color for blockchain symbol in dark mode (gold/emerald)
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
