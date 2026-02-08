import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History as HistoryIcon,
  ArrowLeft,
  Loader2,
  Clock,
  Coins,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount } from "thirdweb/react";
import type { Address } from "viem";
import {
  getUserClaimHistory,
  blockchain,
  truncateAddress,
  type ClaimRecord,
} from "@/tools/utils";

export default function History() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClaimHistory = useCallback(async () => {
    if (!account?.address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userAddress = account.address as Address;
      const history = await getUserClaimHistory(userAddress);
      setClaims(history);
    } catch (error) {
      console.error("Error fetching claim history:", error);
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchClaimHistory();
  }, [fetchClaimHistory]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num < 0.0001) return "< 0.0001";
    return num.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-background to-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/app")}
            className="mb-8 flex items-center gap-2 font-outfit text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary shadow-lg shadow-accent/25">
              <HistoryIcon className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-syne text-4xl font-bold text-foreground">History</h1>
              <p className="mt-1 font-outfit text-lg text-muted-foreground">
                Your claim history
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex items-center gap-3"
          >
            <div className="rounded-full bg-accent/10 px-4 py-2">
              <span className="font-mono text-sm text-accent">
                {claims.length} {claims.length === 1 ? "claim" : "claims"}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {!account?.address ? (
            <motion.div
              key="not-connected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <HistoryIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                Connect Your Wallet
              </h3>
              <p className="max-w-sm text-center font-outfit text-muted-foreground">
                Connect your wallet to view your claim history.
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
              <p className="font-outfit text-muted-foreground">Loading your claim history...</p>
            </motion.div>
          ) : claims.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {claims.map((claim, index) => (
                <motion.div
                  key={`${claim.marketId}-${claim.positionId}-${claim.timestamp}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 transition-all hover:border-accent/30 hover:shadow-[0_0_30px_rgba(var(--accent),0.1)]"
                >
                  {/* Gradient accent line */}
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent via-primary to-secondary opacity-50 group-hover:opacity-100 transition-opacity" />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left side - Claim details */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex-shrink-0">
                        <Coins className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-syne text-lg font-bold text-foreground">
                            Market #{claim.marketId}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                            Position #{claim.positionId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-outfit">{formatDate(claim.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Amount and token */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-2xl font-bold text-yes">
                          +{formatAmount(claim.amount)}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <span className="font-outfit text-sm text-muted-foreground">
                            {truncateAddress(claim.token)}
                          </span>
                          <a
                            href={`${blockchain.blockExplorer}/address/${claim.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-accent transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <h3 className="mb-2 font-syne text-xl font-bold text-foreground">
                No Claims Yet
              </h3>
              <p className="mb-6 max-w-sm text-center font-outfit text-muted-foreground">
                You haven't claimed any winnings yet. Vote on markets and claim your rewards when
                they resolve!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
