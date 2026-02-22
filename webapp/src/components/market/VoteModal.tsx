import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketBalance } from "./MarketBalance";
import { Connector } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useActiveAccount } from "thirdweb/react";
import {
  readPaymentToken,
  fetchMarketDataFromBlockchain,
  fetchDataConstants,
  calculatePlatformFeePercentage,
  isZeroAddress,
  ZERO_ADDRESS,
  getPublicClient,
  readTokenDecimals,
  toTokenSmallestUnit,
  type VoteParams,
} from "@/tools/utils";
import type { Address } from "viem";
import erc20 from "@/abi/ERC20.json";
import { Abi } from "viem";

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitVote: (params: VoteParams) => Promise<void>;
  onVoteSuccess?: () => void;
  isLoading?: boolean;
  marketId: number;
  marketTitle: string;
  marketImage?: string;
  optionA?: string;
  optionB?: string;
}

type VoteStep = "select" | "amount" | "success";

export function VoteModal({
  isOpen,
  onClose,
  onSubmitVote,
  onVoteSuccess,
  isLoading = false,
  marketId,
  marketTitle,
  marketImage,
  optionA = "Yes",
  optionB = "No",
}: VoteModalProps) {
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const account = useActiveAccount();
  const [step, setStep] = useState<VoteStep>("select");
  const [selectedSignal, setSelectedSignal] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentToken, setPaymentToken] = useState<Address>(ZERO_ADDRESS);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18); // Default to 18
  const [marketBalance, setMarketBalance] = useState<string>("0");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectCta, setShowConnectCta] = useState(false);
  const [connectCtaDelayMs] = useState(3000);
  const [showProceedMessage, setShowProceedMessage] = useState(false);
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number | null>(null);

  // Fetch token symbol and decimals from blockchain
  const fetchTokenInfo = useCallback(async (address: Address) => {
    try {
      const client = getPublicClient(selectedNetwork);
      const erc20ABI = erc20.abi as Abi;
      
      // Fetch both symbol and decimals in parallel
      const [symbol, decimals] = await Promise.all([
        client.readContract({
          address: address,
          abi: erc20ABI,
          functionName: "symbol",
        }),
        readTokenDecimals(address)
      ]);
      
      setTokenSymbol(symbol as string);
      setTokenDecimals(decimals);
    } catch (err) {
      console.error("Failed to fetch token info:", err);
      setTokenSymbol(null);
      setTokenDecimals(18); // Reset to default
    }
  }, [selectedNetwork]);

  // Log when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedSignal(null);
      setAmount("");
      setError(null);
      setShowConnectCta(false);
      setShowProceedMessage(false);
      setTokenSymbol(null);
      setTokenDecimals(18); // Reset to default
      fetchMarketPaymentData();
    }
  }, [isOpen, marketId, marketImage]);

  useEffect(() => {
    if (!isOpen) return;
    if (!account) return;
    if (!error) return;
    if (!error.toLowerCase().includes("wallet not connected")) return;

    setShowProceedMessage(true);
    const timeoutId = window.setTimeout(() => {
      setShowProceedMessage(false);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [account, error, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!error) return;
    if (!error.toLowerCase().includes("wallet not connected")) return;
    if (showConnectCta) return;

    const timeoutId = window.setTimeout(() => {
      setShowConnectCta(true);
    }, connectCtaDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [connectCtaDelayMs, error, isOpen, showConnectCta]);

  const fetchMarketPaymentData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch fresh market data, payment token, and data constants
      const [marketDataArray, tokenAddress, dataConstants] = await Promise.all([
        fetchMarketDataFromBlockchain([marketId]),
        readPaymentToken(marketId),
        fetchDataConstants(),
      ]);

      if (marketDataArray.length > 0) {
        setMarketBalance(marketDataArray[0].marketBalance || "0");
      }

      setPaymentToken(tokenAddress);

      // Calculate and set platform fee percentage
      const feePercentage = calculatePlatformFeePercentage(dataConstants.platformFee);
      setPlatformFeePercentage(feePercentage);

      // If token is not zero address, fetch its symbol and decimals
      if (!isZeroAddress(tokenAddress)) {
        await fetchTokenInfo(tokenAddress);
      }
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      setError("Failed to load market data. Please try again.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleOptionSelect = (signal: boolean) => {
    setSelectedSignal(signal);
    setStep("amount");
  };

  const handleBack = () => {
    if (step === "amount") {
      setStep("select");
      setSelectedSignal(null);
      setAmount("");
    }
  };

  const handleSubmitVote = async () => {
    if (selectedSignal === null || !amount || parseFloat(amount) <= 0) return;

    setError(null);
    setShowConnectCta(false);
    setShowProceedMessage(false);
    
    // Convert amount using proper decimal handling
    let amountWei: bigint;
    if (!isZeroAddress(paymentToken)) {
      // Token payment - use token decimals
      amountWei = toTokenSmallestUnit(amount, tokenDecimals);
    } else {
      // ETH payment - use 18 decimals
      amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    }

    try {
      const voteParams: VoteParams = {
        marketId,
        signal: selectedSignal,
        marketBalance: amountWei,
        feetype: !isZeroAddress(paymentToken), // true if token payment, false if ETH
        paymentToken,
      };

      await onSubmitVote(voteParams);
      setStep("success");

      // Call success callback if provided
      if (onVoteSuccess) {
        onVoteSuccess();
      }

      // Close modal after success animation
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Vote failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Transaction failed. Please try again.";
      setError(errorMessage);
      setStep("amount");
    }
  };

  const isValid = amount && parseFloat(amount) > 0;
  const selectedOption = selectedSignal ? optionA : optionB;
  const isWalletNotConnectedError = error?.toLowerCase().includes("wallet not connected") ?? false;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Background with market image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: step === "select" ? 0.75 : 0.55,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black backdrop-blur-md overflow-hidden"
          >
            {/* Market image background - always visible */}
            {marketImage ? (
              <>
                <img
                  src={marketImage}
                  alt="Market background"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    console.error("Failed to load market image:", marketImage, e);
                  }}
                  onLoad={() => {
                    console.log("Market image loaded successfully:", marketImage);
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: step === "select" ? 0.4 : 0.25,
                    mixBlendMode: "overlay",
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
            )}
            {/* Additional dark overlay for contrast */}
            <div className="absolute inset-0 bg-black/40" />
          </motion.div>

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-2xl border border-border/50 shadow-2xl backdrop-blur-xl">
                {/* Background image */}
                {marketImage && (
                  <>
                    <img
                      src={marketImage}
                      alt="Market background"
                      loading="eager"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* Overlay for text readability */}
                    <div className="absolute inset-0 bg-black/75" />
                  </>
                )}
                {/* Card background fallback */}
                {!marketImage && (
                  <div className="absolute inset-0 bg-card/95" />
                )}
                
                {/* Content - relative positioning above background */}
                <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 p-6">
                  <div>
                    <h2 className="font-syne text-xl font-bold text-white">
                      {step === "select" && "Cast Your Vote"}
                      {step === "amount" && "Enter Amount"}
                      {step === "success" && "Vote Submitted!"}
                    </h2>
                    <p className="mt-1 font-outfit text-sm text-white/80 line-clamp-1">
                      {marketTitle}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {isLoadingData ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="mt-4 text-sm text-white/80">
                        Loading market data...
                      </p>
                    </div>
                  ) : step === "select" ? (
                    <div className="space-y-4">
                      <p className="text-sm text-white/80 text-center mb-6">
                        Choose your position
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleOptionSelect(true)}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-yes/10 border-2 border-yes/30 p-6 transition-all hover:bg-yes/20 hover:border-yes/50"
                        >
                          <span className="text-2xl font-bold text-yes">
                            {optionA}
                          </span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleOptionSelect(false)}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-no/10 border-2 border-no/30 p-6 transition-all hover:bg-no/20 hover:border-no/50"
                        >
                          <span className="text-2xl font-bold text-no">
                            {optionB}
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  ) : step === "amount" ? (
                    <div className="space-y-6">
                      {/* Selected Option */}
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Your Vote
                        </p>
                        <p
                          className={`text-2xl font-bold ${selectedSignal ? "text-yes" : "text-no"}`}
                        >
                          {selectedOption}
                        </p>
                      </div>

                      {/* Payment Label with 3D Animation */}
                      <div className="perspective">
                        <motion.div
                          className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 px-3 py-2 text-center"
                          animate={{
                            borderColor: isZeroAddress(paymentToken) ? "hsl(var(--primary) / 0.3)" : "hsl(var(--accent) / 0.3)",
                            backgroundColor: isZeroAddress(paymentToken)
                              ? "hsl(var(--primary) / 0.05) to hsl(var(--primary) / 0.1)"
                              : "hsl(var(--accent) / 0.05) to hsl(var(--accent) / 0.1)",
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div
                            animate={{
                              rotateX: isZeroAddress(paymentToken) ? -5 : 5,
                            }}
                            transition={{ duration: 0.3 }}
                            style={{
                              transformStyle: "preserve-3d" as const,
                            }}
                          >
                            <p className="font-syne text-sm font-bold text-white/80">
                              Pay with{" "}
                              <span className="theme-option-a-gradient-text animate-shimmer-sweep">
                                {tokenSymbol ? tokenSymbol : isZeroAddress(paymentToken) ? selectedNetwork.symbol : "Token"}
                              </span>
                            </p>
                          </motion.div>
                        </motion.div>
                      </div>

                      {/* Market Balance Info */}
                      <div className="flex justify-center">
                        <MarketBalance marketBalance={marketBalance} paymentToken={paymentToken} />
                      </div>

                      {/* Spending Amount */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="vote-amount"
                          className="font-outfit text-white/80"
                        >
                          Spending Amount{" "}
                          <span className="theme-option-a-gradient-text animate-shimmer-sweep">
                            ({tokenSymbol ? tokenSymbol : isZeroAddress(paymentToken) ? selectedNetwork.symbol : "Token"})
                          </span>{" "}
                          *
                        </Label>
                        <Input
                          id="vote-amount"
                          type="number"
                          step="0.001"
                          min="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={isZeroAddress(paymentToken) ? "0.01" : "1.0"}
                          className="rounded-xl border-border/50 bg-background font-outfit text-lg"
                          disabled={isLoading}
                          autoFocus
                        />
                        <p className="text-xs text-white/80">
                          Amount to stake with your vote
                        </p>
                        {/* Platform Fee Display */}
                        {platformFeePercentage !== null && (
                          <p className="text-xs mt-2">
                            <span className="text-white/80">Platform fee: </span>
                            <span
                              style={{
                                color: isZeroAddress(paymentToken) ? "hsl(var(--primary))" : "hsl(var(--accent))",
                              }}
                              className="font-semibold"
                            >
                              {platformFeePercentage.toFixed(2)}%
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Warning */}
                      <div className="flex gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-300">
                          <p className="font-semibold">Cannot be zero</p>
                          <p className="mt-1">
                            You must send a non-zero amount to engage your vote
                          </p>
                        </div>
                      </div>

                      {/* Error */}
                      {error && (!isWalletNotConnectedError || (!showConnectCta && !account)) && (
                        <div className="flex gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-300">{error}</p>
                        </div>
                      )}

                      {isWalletNotConnectedError && (
                        <div className="pt-2">
                          {account ? (
                            <p className="text-center text-xs text-primary">
                              {showProceedMessage ? "Connected. You can now vote." : ""}
                            </p>
                          ) : showConnectCta ? (
                            <div className="flex justify-center">
                              <div className="origin-center scale-90">
                                <Connector />
                              </div>
                            </div>
                          ) : (
                            <p className="text-center text-xs text-white/80">
                              Get Started button will appear shortly…
                            </p>
                          )}
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleBack}
                          disabled={isLoading}
                          className="flex-1 rounded-xl font-outfit"
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSubmitVote}
                          disabled={!isValid || isLoading}
                          className="flex-1 rounded-xl bg-primary text-primary-foreground font-outfit font-semibold border border-primary/40 shadow-lg hover:bg-primary/90"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Vote"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : step === "success" ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                      >
                        <CheckCircle className="h-16 w-16 text-yes" />
                      </motion.div>
                      <p className="mt-4 font-semibold text-primary text-lg">
                        Vote Submitted!
                      </p>
                      <p className="mt-2 text-sm text-white/80">
                        Your vote for{" "}
                        <span
                          className={selectedSignal ? "text-yes" : "text-no"}
                        >
                          {selectedOption}
                        </span>{" "}
                        has been recorded
                      </p>
                    </div>
                  ) : null}
                </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
