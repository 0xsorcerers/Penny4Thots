import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  readPaymentToken,
  fetchMarketDataFromBlockchain,
  isZeroAddress,
  ZERO_ADDRESS,
  type VoteParams,
} from "@/tools/utils";
import type { Address } from "viem";

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitVote: (params: VoteParams) => Promise<void>;
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
  isLoading = false,
  marketId,
  marketTitle,
  marketImage,
  optionA = "Yes",
  optionB = "No",
}: VoteModalProps) {
  const [step, setStep] = useState<VoteStep>("select");
  const [selectedSignal, setSelectedSignal] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentToken, setPaymentToken] = useState<Address>(ZERO_ADDRESS);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedSignal(null);
      setAmount("");
      setError(null);
      fetchMarketPaymentData();
    }
  }, [isOpen, marketId]);

  const fetchMarketPaymentData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch fresh market data and payment token
      const [marketDataArray, tokenAddress] = await Promise.all([
        fetchMarketDataFromBlockchain([marketId]),
        readPaymentToken(marketId),
      ]);

      if (marketDataArray.length > 0) {
        console.log("Fresh market data:", marketDataArray[0]);
      }

      setPaymentToken(tokenAddress);
      console.log("Payment token for market", marketId, ":", tokenAddress);
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
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

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
            className="fixed inset-0 z-50 bg-black backdrop-blur-md"
          >
            {/* Market image background */}
            {marketImage && (
              <img
                src={marketImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  opacity: step === "select" ? 0.4 : 0.25,
                  mixBlendMode: "overlay",
                }}
              />
            )}
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
              <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 p-6">
                  <div>
                    <h2 className="font-syne text-xl font-bold text-foreground">
                      {step === "select" && "Cast Your Vote"}
                      {step === "amount" && "Enter Amount"}
                      {step === "success" && "Vote Submitted!"}
                    </h2>
                    <p className="mt-1 font-outfit text-sm text-muted-foreground line-clamp-1">
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
                      <p className="mt-4 text-sm text-muted-foreground">
                        Loading market data...
                      </p>
                    </div>
                  ) : step === "select" ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground text-center mb-6">
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

                      {/* Amount Input */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="vote-amount"
                          className="font-outfit text-foreground"
                        >
                          Spending Amount *
                        </Label>
                        <Input
                          id="vote-amount"
                          type="number"
                          step="0.001"
                          min="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.01"
                          className="rounded-xl border-border/50 bg-background font-outfit text-lg"
                          disabled={isLoading}
                          autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                          {isZeroAddress(paymentToken)
                            ? "Amount in ETH to send with your vote"
                            : "Amount in tokens to stake with your vote"}
                        </p>
                      </div>

                      {/* Warning */}
                      <div className="flex gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          <p className="font-semibold">Cannot be zero</p>
                          <p className="mt-1">
                            You must send a non-zero amount to engage your vote
                          </p>
                        </div>
                      </div>

                      {/* Error */}
                      {error && (
                        <div className="flex gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-destructive">{error}</p>
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
                          className="flex-1 rounded-xl bg-primary font-outfit font-semibold"
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
                      <p className="mt-4 font-semibold text-foreground text-lg">
                        Vote Submitted!
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
