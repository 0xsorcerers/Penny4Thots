import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2, CheckCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveAccount } from "thirdweb/react";
import {
  useVote,
  useTokenApprove,
  readPaymentToken,
  readTokenAllowance,
  fetchMarketDataFromBlockchain,
  isZeroAddress,
  blockchain,
  ZERO_ADDRESS,
  type VoteParams,
} from "@/tools/utils";
import type { Address } from "viem";
import { toast } from "sonner";

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoteSuccess?: () => void;
  marketId: number;
  marketTitle: string;
  optionA?: string;
  optionB?: string;
}

type VoteStep = "select" | "amount" | "approving" | "voting" | "success";

export function VoteModal({
  isOpen,
  onClose,
  onVoteSuccess,
  marketId,
  marketTitle,
  optionA = "Yes",
  optionB = "No",
}: VoteModalProps) {
  const account = useActiveAccount();
  const { vote, isPending: isVoting } = useVote();
  const { approve, isPending: isApproving } = useTokenApprove();

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
    if (!account?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setError(null);
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    const isEthPayment = isZeroAddress(paymentToken);

    try {
      // If using a token (not ETH), check allowance and approve if needed
      if (!isEthPayment) {
        setStep("approving");

        const currentAllowance = await readTokenAllowance(
          paymentToken,
          account.address as Address,
          blockchain.contract_address
        );

        console.log("Current allowance:", currentAllowance.toString());
        console.log("Required amount:", amountWei.toString());

        // If allowance is insufficient, request approval
        if (currentAllowance < amountWei) {
          toast.info("Approval required", {
            description: "Please approve the token spending in your wallet",
          });

          await approve(paymentToken, amountWei);
          toast.success("Token approved!");
        }
      }

      // Now submit the vote
      setStep("voting");

      const voteParams: VoteParams = {
        marketId,
        signal: selectedSignal,
        marketBalance: amountWei,
        feetype: !isEthPayment, // true if token payment, false if ETH
        paymentToken,
      };

      await vote(voteParams);

      setStep("success");
      toast.success("Vote submitted successfully!");

      // Notify parent of success
      setTimeout(() => {
        onVoteSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Vote failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Transaction failed. Please try again.";
      setError(errorMessage);
      setStep("amount");
      toast.error("Vote failed", {
        description: errorMessage,
      });
    }
  };

  const isValid = amount && parseFloat(amount) > 0;
  const selectedOption = selectedSignal ? optionA : optionB;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 p-6">
                  <div>
                    <h2 className="font-syne text-xl font-bold text-foreground">
                      {step === "select" && "Cast Your Vote"}
                      {step === "amount" && "Enter Amount"}
                      {step === "approving" && "Approving Token"}
                      {step === "voting" && "Submitting Vote"}
                      {step === "success" && "Vote Submitted!"}
                    </h2>
                    <p className="mt-1 font-outfit text-sm text-muted-foreground line-clamp-1">
                      {marketTitle}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={step === "approving" || step === "voting"}
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

                      {!account && (
                        <div className="mt-4 flex gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
                          <Wallet className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-600 dark:text-yellow-400">
                            <p className="font-semibold">Wallet Required</p>
                            <p className="mt-1">Connect your wallet to vote</p>
                          </div>
                        </div>
                      )}
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
                          className="flex-1 rounded-xl font-outfit"
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSubmitVote}
                          disabled={!isValid || !account}
                          className="flex-1 rounded-xl bg-primary font-outfit font-semibold"
                        >
                          Submit Vote
                        </Button>
                      </div>
                    </div>
                  ) : step === "approving" || step === "voting" ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="mt-4 font-semibold text-foreground">
                        {step === "approving"
                          ? "Approving token..."
                          : "Submitting vote..."}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground text-center">
                        {step === "approving"
                          ? "Please confirm the approval in your wallet"
                          : "Please confirm the transaction in your wallet"}
                      </p>
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
