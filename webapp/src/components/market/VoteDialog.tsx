import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEther } from "@/tools/utils";

interface VoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (amount: bigint, signal: boolean) => Promise<void>;
  isLoading?: boolean;
  marketTitle: string;
  signal: boolean; // true for YES, false for NO
}

export function VoteDialog({
  isOpen,
  onClose,
  onVote,
  isLoading = false,
  marketTitle,
  signal,
}: VoteDialogProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) === 0) return;

    setIsSubmitting(true);
    try {
      const bigIntAmount = BigInt(Math.floor(parseFloat(amount) * 1e18));
      await onVote(bigIntAmount, signal);
      setAmount("");
      onClose();
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = amount && parseFloat(amount) > 0;

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
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md"
            >
              <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 p-6">
                  <div>
                    <h2 className="font-syne text-xl font-bold text-foreground">
                      Place Your Vote
                    </h2>
                    <p className="mt-1 font-outfit text-sm text-muted-foreground">
                      {marketTitle}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                  {/* Vote Direction */}
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground mb-2">Your Vote</p>
                    <p className={`text-2xl font-bold ${signal ? "text-yes" : "text-no"}`}>
                      {signal ? "YES" : "NO"}
                    </p>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="font-outfit text-foreground">
                      Amount to Send (ETH) *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.001"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.01"
                      className="rounded-xl border-border/50 bg-background font-outfit"
                      disabled={isSubmitting}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This amount will be sent with your vote to engage your choice in the market
                    </p>
                  </div>

                  {/* Warning */}
                  <div className="flex gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      <p className="font-semibold">Cannot be zero</p>
                      <p className="mt-1">You must send a non-zero amount to engage your vote</p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl font-outfit"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isValid || isSubmitting || isLoading}
                      className="flex-1 rounded-xl bg-primary font-outfit font-semibold"
                    >
                      {isSubmitting || isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Voting...
                        </>
                      ) : (
                        "Send Vote"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
