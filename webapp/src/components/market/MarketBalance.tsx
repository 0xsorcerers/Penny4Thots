import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { getPublicClient, isZeroAddress, readTokenDecimals, fromTokenSmallestUnit } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import type { Address } from "viem";
import erc20 from "@/abi/ERC20.json";
import { Abi } from "viem";
import { useTheme } from "@/hooks/useTheme";

interface MarketBalanceProps {
  marketBalance: bigint; // Raw balance in token's smallest unit
  paymentToken?: Address;
}

export function MarketBalance({ marketBalance, paymentToken }: MarketBalanceProps) {
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const [symbol, setSymbol] = useState<string>(selectedNetwork.symbol);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const { theme } = useTheme();
  const isNativeToken = !paymentToken || isZeroAddress(paymentToken);
  const isLight = theme === "light";

  useEffect(() => {
    if (isNativeToken) {
      setSymbol(selectedNetwork.symbol);
      setTokenDecimals(18);
      return;
    }

    let isMounted = true;

    const fetchTokenInfo = async () => {
      try {
        const client = getPublicClient(selectedNetwork);
        const erc20ABI = erc20.abi as Abi;
        const [fetchedSymbol, decimals] = await Promise.all([
          client.readContract({
            address: paymentToken,
            abi: erc20ABI,
            functionName: "symbol",
          }),
          readTokenDecimals(paymentToken),
        ]);

        if (!isMounted) return;
        setSymbol(fetchedSymbol as string);
        setTokenDecimals(decimals);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch token info:", err);
        setSymbol("TOKEN");
        setTokenDecimals(18);
      }
    };

    void fetchTokenInfo();

    return () => {
      isMounted = false;
    };
  }, [isNativeToken, paymentToken, selectedNetwork]);

  const formatBalance = (balance: bigint, decimals: number) => {
    const formattedBalance = fromTokenSmallestUnit(balance, decimals);
    const numericValue = parseFloat(formattedBalance);
    return numericValue >= 10 ? numericValue.toFixed(1) : numericValue.toFixed(4);
  };

  const displayBalance = (() => {
    try {
      return formatBalance(marketBalance, isNativeToken ? 18 : tokenDecimals);
    } catch {
      return marketBalance.toString();
    }
  })();

  const symbolColor =
    symbol === selectedNetwork.symbol
      ? isLight
        ? "text-amber-600"
        : "text-primary"
      : "text-accent";

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 font-mono text-xs">
      <Wallet className="h-3 w-3 text-slate-400" />
      <span className="text-blue-500 dark:text-foreground font-semibold">{displayBalance}</span>
      <span className={`font-bold ${symbolColor}`}>{symbol}</span>
      <span className="text-slate-400 dark:text-foreground">staked.</span>
    </div>
  );
}
