import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { getPublicClient, isZeroAddress, readTokenDecimals, fromTokenSmallestUnit } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import type { Address } from "viem";
import erc20 from "@/abi/ERC20.json";
import { Abi } from "viem";

interface MarketBalanceProps {
  marketBalance: bigint; // Raw balance in token's smallest unit
  paymentToken?: Address;
}

export function MarketBalance({ marketBalance, paymentToken }: MarketBalanceProps) {
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const [symbol, setSymbol] = useState<string>(selectedNetwork.symbol);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const isNativeToken = !paymentToken || isZeroAddress(paymentToken);

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

  const symbolColor = "text-yes";

  return (
    <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs theme-chip-secondary">
      <Wallet className="h-3 w-3 text-muted-foreground" />
      <span className="font-semibold text-foreground">{displayBalance}</span>
      <span className={`font-bold ${symbolColor}`}>{symbol}</span>
      <span className="text-muted-foreground">staked.</span>
    </div>
  );
}
