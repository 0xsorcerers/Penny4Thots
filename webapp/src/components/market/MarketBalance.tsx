import { useEffect, useState } from "react";
import { Wallet, BadgeCheck, Bitcoin, Blocks, Droplets, ChartNetwork } from "lucide-react";
import { getPublicClient, isZeroAddress, readTokenDecimals, fromTokenSmallestUnit } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import type { Address } from "viem";
import erc20 from "@/abi/ERC20.json";
import { Abi } from "viem";
import { isTokenWhitelisted, getTokenType, getTokenName } from "@/tools/whitelisted";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MarketBalanceProps {
  marketBalance: bigint | string; // Raw balance in token's smallest unit
  paymentToken?: Address;
}

const normalizeRawBalance = (balance: bigint | string): bigint => {
  return typeof balance === "bigint" ? balance : BigInt(balance || "0");
};

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
      return formatBalance(normalizeRawBalance(marketBalance), isNativeToken ? 18 : tokenDecimals);
    } catch {
      return marketBalance.toString();
    }
  })();

  const symbolColor = "text-yes";
  
  // Check if token should show verification badge
  // Native tokens (zero address) always show verification
  // Token markets only show verification if whitelisted
  const showVerification = isNativeToken || isTokenWhitelisted(selectedNetwork.chainId, paymentToken || "0x0000000000000000000000000000000000000000" as Address);
  
  // Get token type for whitelisted tokens
  const tokenType = getTokenType(selectedNetwork.chainId, paymentToken || "0x0000000000000000000000000000000000000000" as Address);
  
  // Get token name for whitelisted tokens
  const tokenName = getTokenName(selectedNetwork.chainId, paymentToken || "0x0000000000000000000000000000000000000000" as Address);
  
  // Render type icon based on token type
  const renderTypeIcon = () => {
    if (!showVerification || !tokenType) return null;
    
    if (tokenType === "crypto") {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Bitcoin className="h-3 w-3 theme-icon-crypto transition-transform hover:scale-125 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Crypto asset</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (tokenType === "stock") {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Blocks className="h-3 w-3 theme-icon-stock transition-transform hover:scale-125 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Stock asset</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (tokenType === "etf") {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <ChartNetwork className="h-3 w-3 theme-icon-etf transition-transform hover:scale-125 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>ETF asset</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    return null;
  };

  return (
    <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs theme-chip-secondary">
      <Wallet className="h-3 w-3 text-muted-foreground" />
      <span className="font-semibold text-foreground">{displayBalance}</span>
      <span className={`font-bold ${symbolColor}`}>{symbol}</span>
      {showVerification && (
        <TooltipProvider>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <BadgeCheck className="h-3 w-3 theme-icon-verified transition-transform hover:scale-125 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tokenName ? `${tokenName} Verified` : "Verified"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Droplets  className="h-3 w-3 theme-icon-autodrop transition-transform hover:scale-125 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Eligible for Autodrops</p>
              </TooltipContent>
            </Tooltip>
            {renderTypeIcon()}
          </div>
        </TooltipProvider>
      )}
      <span className="text-muted-foreground">staked.</span>
    </div>
  );
}
