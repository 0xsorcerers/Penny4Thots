import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  HelpCircle,
  Infinity as InfinityIcon,
  Leaf,
  Sparkles,
  Sprout,
  Wallet,
  Coins,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount } from "thirdweb/react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNetworkStore } from "@/store/networkStore";
import { canAccessFarm, hasLiveProofOfAccess } from "@/tools/networkData";
import { STAKING_TIERS, getTier, type TierId } from "@/tools/stakingTiers";
import {
  Connector,
  fetchProofOfAccessMintConfig,
  formatEther,
  useProofOfAccessMint,
  type ProofOfAccessMintConfig,
} from "@/tools/utils";

/** Demo / design-preview data — multi-token Harvester V2 mock */
const DEMO = {
  nativeBalance: "0.0014",
  pennyBalance: "30.075",
  totalFarm: "12,450.00",
  currentFarm: "8,200.50",
  preApproved: "25,000.00",
  stakeToken: "GAME",
  rewards: [
    { symbol: "USDC", harvested: "142.50", estimated: "18.34", color: "from-emerald-400 to-teal-500" },
    { symbol: "ETH", harvested: "0.084", estimated: "0.012", color: "from-indigo-400 to-violet-500" },
    { symbol: "PENNY", harvested: "1,280.00", estimated: "96.40", color: "from-amber-400 to-orange-500" },
  ],
  subscriptions: ["USDC", "ETH", "PENNY"],
  maxSubscriptions: 5,
  participants: 1_248,
  era: 42,
  timelockHours: 24,
};

const TIER_STORAGE_KEY = "penny4thots-staking-last-tier";

function readCachedTierId(): TierId {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(TIER_STORAGE_KEY);
    if (raw === null) return 0; // first visit → Marble
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n >= 0 && n <= 5) return n as TierId;
  } catch {
    /* ignore */
  }
  return 0;
}

function writeCachedTierId(id: TierId) {
  try {
    localStorage.setItem(TIER_STORAGE_KEY, String(id));
  } catch {
    /* ignore */
  }
}

type ActionColumnProps = {
  title: string;
  subtitle: string;
  background: string;
  children: React.ReactNode;
  delay?: number;
};

/** Art columns keep a dark overlay for character readability on top of tier art */
function ActionColumn({ title, subtitle, background, children, delay = 0 }: ActionColumnProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className="group relative min-h-[380px] flex-1 overflow-hidden rounded-2xl border border-border/60 shadow-xl sm:min-h-[420px] lg:min-h-[520px]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={background}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `url(${background})`,
            backgroundPosition: "center top",
          }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,rgba(0,0,0,0.35)_100%)]" />

      <div className="absolute left-4 right-4 top-4 z-10">
        <p className="font-sora text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
          {subtitle}
        </p>
        <h3 className="font-cinzel text-xl font-bold tracking-wide text-white drop-shadow-lg sm:text-2xl">
          {title}
        </h3>
      </div>

      <div className="relative z-10 flex h-full min-h-[380px] flex-col justify-end p-4 pb-5 sm:min-h-[420px] sm:p-5 lg:min-h-[520px]">
        {children}
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  unit,
  accentClass,
  delay = 0,
}: {
  label: string;
  value: string;
  unit: string;
  accentClass: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-border/50 theme-surface px-3 py-2.5 sm:px-4"
    >
      <p className={cn("font-sora text-[11px] font-medium tracking-wide sm:text-xs", accentClass)}>{label}</p>
      <p className="mt-0.5 font-jetbrains text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {value} <span className="font-sora text-sm font-semibold text-muted-foreground">{unit}</span>
      </p>
    </motion.div>
  );
}

function TierCarousel({
  tierId,
  onChange,
}: {
  tierId: TierId;
  onChange: (id: TierId) => void;
}) {
  const tier = getTier(tierId);
  const prev = () => onChange(((tierId + STAKING_TIERS.length - 1) % STAKING_TIERS.length) as TierId);
  const next = () => onChange(((tierId + 1) % STAKING_TIERS.length) as TierId);

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-xl border-2 border-border/70 shadow-lg"
        style={{ boxShadow: `0 0 28px ${tier.glow}` }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={tier.id}
            src={tier.art.nft}
            alt={`${tier.title} NFT`}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.96 }}
            transition={{ duration: 0.35 }}
            className="aspect-square w-full object-cover object-top"
            draggable={false}
          />
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-10">
          <p className="font-orbitron text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">
            Tier {tier.id} · {tier.contractName}
          </p>
          <p className="font-cinzel text-lg font-bold text-white drop-shadow">{tier.title}</p>
          <p className="font-sora text-[10px] leading-snug text-white/75">{tier.tagline}</p>
        </div>

        <motion.button
          type="button"
          aria-label="Previous tier"
          onClick={prev}
          animate={{ x: [0, -4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-primary hover:text-primary-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <motion.button
          type="button"
          aria-label="Next tier"
          onClick={next}
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-primary hover:text-primary-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {STAKING_TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={`Select ${t.title}`}
            onClick={() => onChange(t.id)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              t.id === tierId ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function formatPennyDisplay(amount: bigint): string {
  const whole = amount / 1_000_000n;
  return whole.toLocaleString();
}

export default function Staking() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const canAccessStaking = canAccessFarm(selectedNetwork);
  const poaLive = hasLiveProofOfAccess(selectedNetwork);
  const { mintTier, isPending: isMinting } = useProofOfAccessMint();

  // Marble (0) on first visit; restore last choice on return
  const [tierId, setTierId] = useState<TierId>(() => readCachedTierId());
  const [mintConfig, setMintConfig] = useState<ProofOfAccessMintConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [farmAmount, setFarmAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedReward, setSelectedReward] = useState(DEMO.rewards[0].symbol);
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"mint" | "streams" | "info">("mint");

  const tier = useMemo(() => getTier(tierId), [tierId]);

  const handleTierChange = useCallback((id: TierId) => {
    setTierId(id);
    writeCachedTierId(id);
  }, []);

  useEffect(() => {
    if (!canAccessStaking) {
      toast.error("Farm unavailable on this network", {
        description: "Switch to a chain with a deployed ProofOfAccess contract.",
      });
      navigate("/app", { replace: true });
    }
  }, [canAccessStaking, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoadingConfig(true);
    fetchProofOfAccessMintConfig(tierId)
      .then((cfg) => {
        if (!cancelled) setMintConfig(cfg);
      })
      .catch(() => {
        if (!cancelled) setMintConfig(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tierId, selectedNetwork.chainId]);

  const selectedRewardData = useMemo(
    () => DEMO.rewards.find((r) => r.symbol === selectedReward) ?? DEMO.rewards[0],
    [selectedReward],
  );

  const totalEstimated = DEMO.rewards.reduce((acc, r) => acc + parseFloat(r.estimated.replace(/,/g, "")), 0);
  const totalHarvested = DEMO.rewards.length;

  const handleDemoAction = (action: string) => {
    toast.success(`${action} (design preview)`, {
      description: "Farm / withdraw / harvest wiring comes next.",
    });
  };

  const handleMint = useCallback(async () => {
    if (!account) {
      toast.error("Connect your wallet to mint");
      return;
    }
    if (!poaLive) {
      toast.error("ProofOfAccess not live yet", {
        description:
          "Using zero stand-in address. Deploy the contract, then set proof_of_access in networkData.",
      });
      return;
    }
    if (mintConfig?.paused) {
      toast.error("Minting is paused");
      return;
    }

    try {
      toast.loading("Approving PENNY burn…", { id: "mint-poa" });
      await mintTier(tierId);
      toast.success(`Minted ${tier.title} (${tier.contractName})`, {
        id: "mint-poa",
        description: `Tier level ${tierId} · ${tier.lists} list slots`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      toast.error(message, { id: "mint-poa" });
    }
  }, [account, poaLive, mintConfig?.paused, mintTier, tierId, tier]);

  const shortWallet = account?.address
    ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}`
    : "Not connected";

  if (!canAccessStaking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center textured-bg">
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500" />
          <p className="font-cinzel text-xl font-semibold text-foreground">Farm locked</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            This network has no ProofOfAccess contract. Redirecting to markets…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden textured-bg font-sora text-foreground">
      {/* Soft network accent washes (same language as History / Markets) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -right-1/2 -top-1/2 h-full w-full animate-pulse bg-gradient-to-bl from-primary/5 via-transparent to-transparent"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute -bottom-1/2 -left-1/2 h-full w-full animate-pulse bg-gradient-to-tr from-accent/5 via-transparent to-transparent"
          style={{ animationDuration: "6s" }}
        />
      </div>

      <Header isConnected={!!account} />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-2 pb-6 pt-20 sm:px-4 lg:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app")}
            className="rounded-full border border-border/60 theme-surface text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Markets</span>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 theme-surface px-3 py-1.5 font-jetbrains text-xs font-semibold sm:text-sm">
              <span className="text-primary">
                {DEMO.nativeBalance} {selectedNetwork.symbol}
              </span>
              <InfinityIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-accent">
                {DEMO.pennyBalance} PENNY
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border/60 theme-surface px-3 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              <div className="leading-tight">
                <p className="font-jetbrains text-[10px] text-muted-foreground sm:text-xs">{shortWallet}</p>
                <p className="font-jetbrains text-[10px] font-medium text-success sm:text-xs">
                  {DEMO.nativeBalance} {selectedNetwork.symbol}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          {/* Left rail — tier picker + mint */}
          <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-border/60 theme-surface-elevated shadow-xl lg:w-[260px] lg:shrink-0">
            <div className="border-b border-border/50 bg-muted/30 px-3 py-3">
              <p className="mb-2 text-center font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Pick your tier
              </p>
              <TierCarousel tierId={tierId} onChange={handleTierChange} />
            </div>

            <div className="flex items-center justify-center border-b border-border/50 px-3 py-3">
              <button
                type="button"
                disabled={isMinting}
                onClick={() => {
                  setActiveSidebarTab("mint");
                  void handleMint();
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary px-6 py-2.5 font-orbitron text-xl font-extrabold tracking-wide text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70",
                )}
              >
                {isMinting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    minting…
                  </>
                ) : (
                  "mint"
                )}
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
              <div className="flex gap-1 rounded-xl bg-muted/40 p-1">
                {(
                  [
                    { id: "mint" as const, label: "Mint", icon: Coins },
                    { id: "streams" as const, label: "Streams", icon: Layers },
                    { id: "info" as const, label: "Info", icon: HelpCircle },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSidebarTab(id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 font-sora text-[11px] font-semibold transition",
                      activeSidebarTab === id
                        ? "bg-card text-foreground shadow-sm border border-border/50"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <div className="min-h-[140px] flex-1 rounded-xl border border-border/50 bg-card/60 p-3 font-sora text-sm">
                <AnimatePresence mode="wait">
                  {activeSidebarTab === "mint" && (
                    <motion.div
                      key={`mint-${tierId}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="space-y-2"
                    >
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Proof of Access
                      </p>
                      <p className="leading-relaxed text-muted-foreground">
                        Mint a{" "}
                        <span className="font-bold text-foreground">{tier.title}</span>{" "}
                        <span className="font-jetbrains text-xs text-muted-foreground">
                          ({tier.contractName})
                        </span>{" "}
                        NFT pass · tierLevel{" "}
                        <span className="font-jetbrains font-bold text-foreground">{tierId}</span>
                      </p>
                      <div className="space-y-1 rounded-lg border border-border/40 bg-background/50 px-2.5 py-2 font-jetbrains text-[11px] text-muted-foreground">
                        {loadingConfig ? (
                          <p className="flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading fee…
                          </p>
                        ) : (
                          <>
                            <div className="flex justify-between gap-2">
                              <span>Burn</span>
                              <span className="font-semibold text-foreground">
                                {mintConfig
                                  ? `${formatPennyDisplay(mintConfig.burnAmount)} PENNY`
                                  : `${tier.multiplier}× base`}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Mint fee</span>
                              <span className="font-semibold text-foreground">
                                {mintConfig
                                  ? `${formatEther(mintConfig.mintFee)} ETH`
                                  : "0.00001 ETH"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>List slots</span>
                              <span className="font-semibold text-foreground">{tier.lists}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Multiplier</span>
                              <span className="font-semibold text-foreground">{tier.multiplier}×</span>
                            </div>
                          </>
                        )}
                        <div className="mt-1 border-t border-border/40 pt-1 text-[10px] text-muted-foreground">
                          {selectedNetwork.name} ·{" "}
                          {poaLive ? (
                            <span className="text-success">contract live</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              zero stand-in · set proof_of_access after deploy
                            </span>
                          )}
                        </div>
                      </div>
                      {!account && (
                        <div className="pt-1">
                          <Connector />
                        </div>
                      )}
                    </motion.div>
                  )}
                  {activeSidebarTab === "streams" && (
                    <motion.div
                      key="streams"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="space-y-2"
                    >
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Reward streams
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Subscribed {DEMO.subscriptions.length}/{DEMO.maxSubscriptions}
                      </p>
                      <ul className="space-y-1.5">
                        {DEMO.subscriptions.map((s) => (
                          <li
                            key={s}
                            className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 font-jetbrains text-xs font-semibold text-foreground"
                          >
                            <span>{s}</span>
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="mt-1 w-full rounded-lg bg-primary font-sora text-primary-foreground hover:opacity-90"
                        onClick={() => handleDemoAction("Manage subscriptions")}
                      >
                        Manage streams
                      </Button>
                    </motion.div>
                  )}
                  {activeSidebarTab === "info" && (
                    <motion.div
                      key="info"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="space-y-2 text-xs text-muted-foreground"
                    >
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Protocol
                      </p>
                      <div className="space-y-1.5 rounded-lg border border-border/40 bg-background/50 p-2 font-sora text-foreground">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Participants</span>
                          <span className="font-jetbrains font-semibold">
                            {DEMO.participants.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current ERA</span>
                          <span className="font-jetbrains font-semibold">{DEMO.era}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Timelock</span>
                          <span className="font-jetbrains font-semibold">{DEMO.timelockHours}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model</span>
                          <span className="font-semibold">Multi-token V2</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary text-primary-foreground shadow-md transition hover:opacity-90"
                  title="Quick farm"
                  onClick={() => handleDemoAction("Sidebar quick action")}
                >
                  <Sprout className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-accent text-accent-foreground shadow-md transition hover:opacity-90"
                  title="Help"
                  onClick={() => setActiveSidebarTab("info")}
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          </aside>

          {/* Main stage */}
          <section className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatCard
                label="Total Farm"
                value={DEMO.totalFarm}
                unit={DEMO.stakeToken}
                accentClass="text-primary"
                delay={0.05}
              />
              <StatCard
                label="Current Farm"
                value={DEMO.currentFarm}
                unit={DEMO.stakeToken}
                accentClass="text-accent"
                delay={0.1}
              />
              <StatCard
                label="Harvested"
                value={`${totalHarvested} tokens`}
                unit="claimed"
                accentClass="text-amber-600 dark:text-amber-300"
                delay={0.15}
              />
              <StatCard
                label="Estimated Rewards"
                value={totalEstimated.toFixed(2)}
                unit="mixed"
                accentClass="text-success"
                delay={0.2}
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 theme-surface px-3 py-2"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-sora text-xs font-medium tracking-wide text-muted-foreground">
                Viewing · {tier.title}
              </span>
              <span
                className={cn(
                  "rounded-full bg-gradient-to-r px-2.5 py-0.5 font-orbitron text-[10px] font-bold text-white shadow",
                  tier.accent,
                )}
              >
                {tier.contractName}
              </span>
              {DEMO.rewards.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => setSelectedReward(r.symbol)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-jetbrains text-xs font-semibold transition",
                    selectedReward === r.symbol
                      ? "bg-gradient-to-r text-white shadow-md " + r.color
                      : "theme-chip-secondary hover:opacity-90",
                  )}
                >
                  {r.estimated} {r.symbol}
                </button>
              ))}
            </motion.div>

            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              <ActionColumn
                title="Farm"
                subtitle="Stake GAME · Serving"
                background={tier.art.farm}
                delay={0.15}
              >
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-destructive/40 bg-destructive/80 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="font-sora text-xs font-medium tracking-wide text-destructive-foreground/90">
                      Pre-Approved
                    </p>
                    <p className="font-jetbrains text-lg font-bold text-destructive-foreground">
                      {DEMO.preApproved}{" "}
                      <span className="font-sora text-sm font-semibold text-destructive-foreground/80">
                        {DEMO.stakeToken}
                      </span>
                    </p>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter Amount"
                    value={farmAmount}
                    onChange={(e) => setFarmAmount(e.target.value)}
                    className="h-11 rounded-xl border border-border/50 theme-input-surface text-center font-jetbrains font-medium text-foreground placeholder:font-sora placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <div className="flex gap-1.5">
                    {["25%", "50%", "MAX"].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          setFarmAmount(
                            pct === "MAX"
                              ? DEMO.preApproved.replace(/,/g, "")
                              : (
                                  (parseFloat(DEMO.preApproved.replace(/,/g, "")) * parseInt(pct, 10)) /
                                  100
                                ).toFixed(2),
                          )
                        }
                        className="flex-1 rounded-lg bg-white/15 py-1 font-orbitron text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/25"
                      >
                        {pct}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="h-12 w-full rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground shadow-lg hover:opacity-90 sm:text-base"
                    onClick={() => handleDemoAction("Farm Now")}
                  >
                    <Sprout className="h-4 w-4" />
                    Farm Now
                  </Button>
                </div>
              </ActionColumn>

              <ActionColumn
                title="Withdraw"
                subtitle="Unstake · Panicked"
                background={tier.art.withdraw}
                delay={0.25}
              >
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="font-sora text-xs font-medium tracking-wide text-amber-200/90">Your stake</p>
                    <p className="font-jetbrains text-lg font-bold text-white">
                      {DEMO.currentFarm}{" "}
                      <span className="font-sora text-sm font-semibold text-white/70">{DEMO.stakeToken}</span>
                    </p>
                    <p className="mt-0.5 font-sora text-[10px] text-white/50">
                      Timelock: {DEMO.timelockHours}h after entry
                    </p>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Withdraw amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="h-11 rounded-xl border border-border/50 theme-input-surface text-center font-jetbrains font-medium text-foreground placeholder:font-sora placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Button
                    className="h-12 w-full rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground shadow-lg hover:opacity-90 sm:text-base"
                    onClick={() => handleDemoAction("Withdraw Now")}
                  >
                    <Wallet className="h-4 w-4" />
                    Withdraw Now
                  </Button>
                </div>
              </ActionColumn>

              <ActionColumn
                title="Harvest"
                subtitle="Claim · Epic glory"
                background={tier.art.harvest}
                delay={0.35}
              >
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-white/20 bg-black/55 px-3 py-2 backdrop-blur-sm">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowRewardPicker((v) => !v)}
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <div>
                          <p className="font-sora text-xs font-medium tracking-wide text-emerald-200/90">
                            Claimable · {selectedReward}
                          </p>
                          <p className="font-jetbrains text-lg font-bold text-white">
                            {selectedRewardData.estimated}{" "}
                            <span className="font-sora text-sm font-semibold text-white/70">
                              {selectedReward}
                            </span>
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-white/70 transition",
                            showRewardPicker && "rotate-180",
                          )}
                        />
                      </button>
                      <AnimatePresence>
                        {showRewardPicker && (
                          <motion.ul
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-border/60 theme-surface-elevated shadow-xl"
                          >
                            {DEMO.rewards.map((r) => (
                              <li key={r.symbol}>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between px-3 py-2 text-left font-sora text-sm text-foreground hover:bg-muted/50"
                                  onClick={() => {
                                    setSelectedReward(r.symbol);
                                    setShowRewardPicker(false);
                                  }}
                                >
                                  <span className="font-medium">{r.symbol}</span>
                                  <span className="font-jetbrains text-success">{r.estimated}</span>
                                </button>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                    <p className="mt-1 font-sora text-[10px] text-white/50">
                      Lifetime harvested:{" "}
                      <span className="font-jetbrains">
                        {selectedRewardData.harvested} {selectedReward}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <Button
                      className="h-12 flex-1 rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground shadow-lg hover:opacity-90 sm:text-base"
                      onClick={() => handleDemoAction(`Harvest ${selectedReward}`)}
                    >
                      <Leaf className="h-4 w-4" />
                      Harvest Now
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDemoAction("Harvest all streams")}
                    className="w-full rounded-lg bg-white/10 py-2 font-sora text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm transition hover:bg-white/20"
                  >
                    Harvest all streams
                  </button>
                </div>
              </ActionColumn>
            </div>
          </section>
        </div>

        <p className="mt-3 text-center font-sora text-[10px] tracking-wide text-muted-foreground sm:text-xs">
          ProofOfAccess mint · tier {tierId} {tier.title} · themed with network light/dark surfaces
        </p>
      </main>
    </div>
  );
}
