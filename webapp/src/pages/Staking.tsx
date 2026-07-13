import { useEffect, useMemo, useState } from "react";
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
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import deepforestFlora from "@/assets/images/deepforest-flora.webp";
import { useNetworkStore } from "@/store/networkStore";
import { hasValidPennyEntry } from "@/tools/networkData";

/** Demo / design-preview data — multi-token Harvester V2 mock */
const DEMO = {
  wallet: "0x32Be…11Fe",
  ethBalance: "0.0014",
  totalFarm: "12,450.00",
  currentFarm: "8,200.50",
  preApproved: "25,000.00",
  stakeToken: "GAME",
  payTokenBalance: "30.075",
  payTokenSymbol: "USDC",
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

type ActionColumnProps = {
  title: string;
  subtitle: string;
  background: string;
  accent: string;
  children: React.ReactNode;
  delay?: number;
};

function ActionColumn({ title, subtitle, background, accent, children, delay = 0 }: ActionColumnProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className="group relative min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-white/15 shadow-2xl lg:min-h-[520px]"
    >
      {/* Full-bleed character background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className={cn("absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20", accent)} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,rgba(0,0,0,0.35)_100%)]" />

      {/* Column label */}
      <div className="absolute left-4 right-4 top-4 z-10">
        <p className="font-sora text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">{subtitle}</p>
        <h3 className="font-cinzel text-xl font-bold tracking-wide text-white drop-shadow-lg sm:text-2xl">{title}</h3>
      </div>

      {/* Controls sit low so art stays visible */}
      <div className="relative z-10 flex h-full min-h-[420px] flex-col justify-end p-4 pb-5 sm:p-5 lg:min-h-[520px]">
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
      className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 shadow-lg backdrop-blur-md sm:px-4"
    >
      <p className={cn("font-sora text-[11px] font-medium tracking-wide sm:text-xs", accentClass)}>{label}</p>
      <p className="mt-0.5 font-jetbrains text-base font-semibold tracking-tight text-white sm:text-lg">
        {value} <span className="font-sora text-sm font-semibold text-white/70">{unit}</span>
      </p>
    </motion.div>
  );
}

export default function Staking() {
  const navigate = useNavigate();
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const canAccessStaking = hasValidPennyEntry(selectedNetwork);
  const [farmAmount, setFarmAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedReward, setSelectedReward] = useState(DEMO.rewards[0].symbol);
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"mint" | "streams" | "info">("mint");

  useEffect(() => {
    if (!canAccessStaking) {
      toast.error("Farm unavailable on this network", {
        description: "Switch to a chain with a valid PENNY token entry.",
      });
      navigate("/app", { replace: true });
    }
  }, [canAccessStaking, navigate]);

  const selectedRewardData = useMemo(
    () => DEMO.rewards.find((r) => r.symbol === selectedReward) ?? DEMO.rewards[0],
    [selectedReward],
  );

  const totalEstimated = DEMO.rewards.reduce((acc, r) => acc + parseFloat(r.estimated.replace(/,/g, "")), 0);
  const totalHarvested = DEMO.rewards.length;

  const handleDemoAction = (action: string) => {
    toast.success(`${action} (design preview)`, {
      description: "Contract wiring comes next — this page is the visual shell.",
    });
  };

  if (!canAccessStaking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#0a1210] font-sora text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-950/80 to-[#060a08]" />
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-400" />
          <p className="font-cinzel text-xl font-semibold">Farm locked</p>
          <p className="max-w-sm text-sm text-white/60">
            This network has no valid PENNY entry. Redirecting to markets…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1210] font-sora text-white">
      {/* Forest canopy backdrop (matches outline) */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${deepforestFlora})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-950/85 via-[#0a1210]/88 to-[#060a08]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.12),_transparent_55%)]" />

      <Header isConnected />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-2 pb-6 pt-20 sm:px-4 lg:px-6">
        {/* Top bar: back + swap + wallet */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app")}
            className="rounded-full border border-white/10 bg-black/30 text-white hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Markets</span>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Token pair strip (like outline USDC ∞ USDC) */}
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-slate-900/80 px-3 py-1.5 font-jetbrains text-xs font-semibold shadow-lg backdrop-blur-md sm:text-sm">
              <span className="text-cyan-300">{DEMO.payTokenBalance} {DEMO.payTokenSymbol}</span>
              <InfinityIcon className="h-3.5 w-3.5 text-white/50" />
              <span className="text-sky-300">{DEMO.payTokenBalance} {DEMO.payTokenSymbol}</span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-slate-900/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <div className="leading-tight">
                <p className="font-jetbrains text-[10px] text-white/60 sm:text-xs">{DEMO.wallet}</p>
                <p className="font-jetbrains text-[10px] font-medium text-emerald-300 sm:text-xs">{DEMO.ethBalance} ETH</p>
              </div>
            </div>
          </div>
        </div>

        {/* Layout: sidebar + main stage */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          {/* Left rail (mint / streams / help) */}
          <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-200/95 to-amber-50/90 text-slate-900 shadow-xl lg:w-[220px] lg:shrink-0">
            <div className="flex items-center justify-center border-b border-slate-300/60 bg-slate-300/50 px-3 py-4">
              <button
                type="button"
                onClick={() => {
                  setActiveSidebarTab("mint");
                  handleDemoAction("Mint flow");
                }}
                className="rounded-2xl border-2 border-lime-500 bg-lime-400 px-8 py-2.5 font-orbitron text-xl font-extrabold tracking-wide text-slate-900 shadow-[0_0_24px_rgba(163,230,53,0.55)] transition hover:scale-[1.03] hover:bg-lime-300"
              >
                mint
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
              <div className="flex gap-1 rounded-xl bg-slate-900/5 p-1">
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
                        ? "bg-white text-slate-900 shadow"
                        : "text-slate-600 hover:bg-white/50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <div className="min-h-[160px] flex-1 rounded-xl border border-amber-200/80 bg-amber-100/80 p-3 font-sora text-sm">
                <AnimatePresence mode="wait">
                  {activeSidebarTab === "mint" && (
                    <motion.div
                      key="mint"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="space-y-2"
                    >
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/80">
                        Stake token
                      </p>
                      <p className="leading-relaxed text-slate-700">
                        Stake <span className="font-bold text-slate-900">{DEMO.stakeToken}</span> into the Harvester
                        to earn multi-token yields from your subscribed reward streams.
                      </p>
                      <div className="rounded-lg bg-white/70 px-2.5 py-2 font-jetbrains text-[11px] text-slate-600">
                        {selectedNetwork.name} · PENNY ready
                      </div>
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
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/80">
                        Reward streams
                      </p>
                      <p className="text-xs text-slate-600">
                        Subscribed {DEMO.subscriptions.length}/{DEMO.maxSubscriptions}
                      </p>
                      <ul className="space-y-1.5">
                        {DEMO.subscriptions.map((s) => (
                          <li
                            key={s}
                            className="flex items-center justify-between rounded-lg bg-white/70 px-2.5 py-1.5 font-jetbrains text-xs font-semibold"
                          >
                            <span>{s}</span>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="mt-1 w-full rounded-lg bg-slate-900 font-sora text-white hover:bg-slate-800"
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
                      className="space-y-2 text-xs text-slate-700"
                    >
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/80">
                        Protocol
                      </p>
                      <div className="space-y-1.5 rounded-lg bg-white/70 p-2 font-sora">
                        <div className="flex justify-between">
                          <span>Participants</span>
                          <span className="font-jetbrains font-semibold">{DEMO.participants.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current ERA</span>
                          <span className="font-jetbrains font-semibold">{DEMO.era}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Timelock</span>
                          <span className="font-jetbrains font-semibold">{DEMO.timelockHours}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Model</span>
                          <span className="font-semibold">Multi-token V2</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-300/50 pt-2">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-lime-500 bg-lime-400 text-slate-900 shadow-md transition hover:bg-lime-300"
                  title="Quick action"
                  onClick={() => handleDemoAction("Sidebar quick action")}
                >
                  <Sprout className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-md transition hover:bg-sky-400"
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
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatCard
                label="Total Farm"
                value={DEMO.totalFarm}
                unit={DEMO.stakeToken}
                accentClass="text-sky-300"
                delay={0.05}
              />
              <StatCard
                label="Current Farm"
                value={DEMO.currentFarm}
                unit={DEMO.stakeToken}
                accentClass="text-cyan-300"
                delay={0.1}
              />
              <StatCard
                label="Harvested"
                value={`${totalHarvested} tokens`}
                unit="claimed"
                accentClass="text-amber-300"
                delay={0.15}
              />
              <StatCard
                label="Estimated Rewards"
                value={totalEstimated.toFixed(2)}
                unit="mixed"
                accentClass="text-emerald-300"
                delay={0.2}
              />
            </div>

            {/* Multi-token reward strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="font-sora text-xs font-medium tracking-wide text-white/70">Active yields</span>
              {DEMO.rewards.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => setSelectedReward(r.symbol)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-jetbrains text-xs font-semibold transition",
                    selectedReward === r.symbol
                      ? "bg-gradient-to-r text-white shadow-md " + r.color
                      : "bg-white/10 text-white/80 hover:bg-white/20",
                  )}
                >
                  {r.estimated} {r.symbol}
                </button>
              ))}
            </motion.div>

            {/* Three action columns */}
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              {/* FARM */}
              <ActionColumn
                title="Farm"
                subtitle="Stake GAME"
                background="/staking/farm-guardian.jpg"
                accent=""
                delay={0.15}
              >
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-red-400/40 bg-red-900/75 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="font-sora text-xs font-medium tracking-wide text-red-100/90">Pre-Approved</p>
                    <p className="font-jetbrains text-lg font-bold text-white">
                      {DEMO.preApproved}{" "}
                      <span className="font-sora text-sm font-semibold text-red-100/80">{DEMO.stakeToken}</span>
                    </p>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter Amount"
                    value={farmAmount}
                    onChange={(e) => setFarmAmount(e.target.value)}
                    className="h-11 rounded-xl border-0 bg-white text-center font-jetbrains font-medium text-slate-900 placeholder:font-sora placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-400"
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
                    className="h-12 w-full rounded-xl bg-emerald-500 font-orbitron text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400 sm:text-base"
                    onClick={() => handleDemoAction("Farm Now")}
                  >
                    <Sprout className="h-4 w-4" />
                    Farm Now
                  </Button>
                </div>
              </ActionColumn>

              {/* WITHDRAW */}
              <ActionColumn
                title="Withdraw"
                subtitle="Unstake GAME"
                background="/staking/withdraw-warrior.jpg"
                accent=""
                delay={0.25}
              >
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-amber-400/30 bg-black/55 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="font-sora text-xs font-medium tracking-wide text-amber-200/90">Your stake</p>
                    <p className="font-jetbrains text-lg font-bold text-white">
                      {DEMO.currentFarm}{" "}
                      <span className="font-sora text-sm font-semibold text-white/70">{DEMO.stakeToken}</span>
                    </p>
                    <p className="mt-0.5 font-sora text-[10px] text-white/50">Timelock: {DEMO.timelockHours}h after entry</p>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Withdraw amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="h-11 rounded-xl border-0 bg-white/95 text-center font-jetbrains font-medium text-slate-900 placeholder:font-sora placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-400"
                  />
                  <Button
                    className="h-12 w-full rounded-xl bg-emerald-500 font-orbitron text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400 sm:text-base"
                    onClick={() => handleDemoAction("Withdraw Now")}
                  >
                    <Wallet className="h-4 w-4" />
                    Withdraw Now
                  </Button>
                </div>
              </ActionColumn>

              {/* HARVEST */}
              <ActionColumn
                title="Harvest"
                subtitle="Multi-token claim"
                background="/staking/harvest-vine.jpg"
                accent=""
                delay={0.35}
              >
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-emerald-400/30 bg-black/55 px-3 py-2 backdrop-blur-sm">
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
                            <span className="font-sora text-sm font-semibold text-white/70">{selectedReward}</span>
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
                            className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 shadow-xl"
                          >
                            {DEMO.rewards.map((r) => (
                              <li key={r.symbol}>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between px-3 py-2 text-left font-sora text-sm hover:bg-white/10"
                                  onClick={() => {
                                    setSelectedReward(r.symbol);
                                    setShowRewardPicker(false);
                                  }}
                                >
                                  <span className="font-medium text-white">{r.symbol}</span>
                                  <span className="font-jetbrains text-emerald-300">{r.estimated}</span>
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
                      className="h-12 flex-1 rounded-xl bg-emerald-500 font-orbitron text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400 sm:text-base"
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

        <p className="mt-3 text-center font-sora text-[10px] tracking-wide text-white/40 sm:text-xs">
          Harvester V2 design preview · multi-token reward model · not connected to live contracts yet
        </p>
      </main>
    </div>
  );
}
