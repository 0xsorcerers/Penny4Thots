import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Fuel,
  AlertTriangle,
  ImageOff,
  Search,
  Plus,
  X,
  Radio,
  Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount } from "thirdweb/react";
import type { Address } from "viem";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNetworkStore } from "@/store/networkStore";
import {
  canAccessFarm,
  hasLiveHarvester,
  hasLiveProofOfAccess,
} from "@/tools/networkData";
import {
  STAKING_TIERS,
  getTier,
  getTierByContractName,
  pickHighestBasketNft,
  type TierId,
} from "@/tools/stakingTiers";
import {
  getWhitelistedTokensByCategory,
  resolveRewardTokenLabel,
  shortTokenLabel,
  type RewardTokenCategory,
  type WhitelistedRewardToken,
} from "@/tools/whitelisted";
import {
  Connector,
  checkHarvesterDepositReadiness,
  checkProofOfAccessMintReadiness,
  createHarvesterClaimsCache,
  ensureHarvesterClaimsPage,
  fetchHarvesterFarmStats,
  fetchHarvesterUserClaimsCount,
  fetchProofOfAccessMintConfig,
  fetchTotalPennySent,
  fetchUserSubscriptions,
  fetchWalletStakingBalances,
  fetchWithdrawTimelock,
  formatCompactTokenAmount,
  formatDurationCountdown,
  formatEther,
  getPlayerOwners,
  harvesterClaimsPageRange,
  HARVESTER_CLAIMS_MAX_BATCH,
  HARVESTER_CLAIMS_PAGE_SIZE,
  isHarvesterClaimsRangeLoaded,
  loadUserRewardStreamsSnapshot,
  planFarmDepositSteps,
  resolveMaxRewardStreams,
  fromTokenSmallestUnit,
  toTokenSmallestUnit,
  useHarvesterFarm,
  useProofOfAccessGift,
  useProofOfAccessMint,
  type ClaimableRewardStream,
  type HarvesterClaimDisplay,
  type HarvesterClaimsCache,
  type HarvesterDepositReadiness,
  type HarvesterFarmStep,
  type HarvesterWithdrawTimelock,
  type ProofOfAccessMintConfig,
  type ProofOfAccessMintReadiness,
  type ProofOfAccessPlayer,
  type UserRewardStreamsSnapshot,
} from "@/tools/utils";

const STAKE_TOKEN = "PENNY";

/** Soft color accents for estimated-reward chips (cycles by index). */
const STREAM_CHIP_COLORS = [
  "from-emerald-400 to-teal-500",
  "from-indigo-400 to-violet-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500",
];

const CATEGORY_LABELS: Record<RewardTokenCategory, string> = {
  crypto: "Crypto",
  stock: "Stocks",
  etf: "ETFs",
  commodity: "Commodities",
  other: "Other",
};

const CATEGORY_ORDER: RewardTokenCategory[] = [
  "crypto",
  "stock",
  "etf",
  "commodity",
  "other",
];

function isValidAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function normalizeAddr(a: string): string {
  return a.trim().toLowerCase();
}

function sameAddressSet(a: Address[], b: Address[]): boolean {
  if (a.length !== b.length) return false;
  const sa = a.map(normalizeAddr).sort();
  const sb = b.map(normalizeAddr).sort();
  return sa.every((v, i) => v === sb[i]);
}

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

/** Art columns keep a dark overlay for character readability on top of tier art.
 * Desktop (lg+): fill remaining viewport height so Stake/Withdraw/Harvest CTAs stay in view. */
function ActionColumn({ title, subtitle, background, children, delay = 0 }: ActionColumnProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className="group relative min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-border/60 shadow-xl sm:min-h-[360px] lg:min-h-0 lg:h-full"
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

      <div className="absolute left-3 right-3 top-3 z-10 sm:left-4 sm:right-4 sm:top-4">
        <p className="font-sora text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
          {subtitle}
        </p>
        <h3 className="font-cinzel text-lg font-bold tracking-wide text-white drop-shadow-lg sm:text-xl lg:text-2xl">
          {title}
        </h3>
      </div>

      <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-end p-3 pb-4 sm:min-h-[360px] sm:p-4 lg:min-h-0 lg:p-4 lg:pb-4">
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
  onClick,
  title,
}: {
  label: string;
  value: string;
  unit: string;
  accentClass: string;
  delay?: number;
  onClick?: () => void;
  title?: string;
}) {
  const interactive = typeof onClick === "function";
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "rounded-xl border border-border/50 theme-surface px-3 py-2 sm:px-4 lg:py-1.5",
        interactive &&
          "cursor-pointer transition hover:border-amber-500/40 hover:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
      )}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title}
    >
      <p className={cn("font-sora text-[11px] font-medium tracking-wide sm:text-xs", accentClass)}>{label}</p>
      <p className="mt-0.5 font-jetbrains text-sm font-semibold tracking-tight text-foreground sm:text-base lg:text-[15px]">
        {value} <span className="font-sora text-xs font-semibold text-muted-foreground sm:text-sm">{unit}</span>
      </p>
    </motion.div>
  );
}

function formatClaimWhen(timestamp: number): string {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
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

  const playLoopVideo = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    void el.play().catch(() => {
      /* autoplay may be blocked until interaction; poster still shows */
    });
  }, []);

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-xl border-2 border-border/70 shadow-lg"
        style={{ boxShadow: `0 0 28px ${tier.glow}` }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.96 }}
            transition={{ duration: 0.35 }}
            className="relative aspect-square w-full lg:aspect-[5/4] xl:aspect-square"
          >
            {/* Static poster while video loads / as accessible fallback */}
            <img
              src={tier.art.nft}
              alt={`${tier.title} NFT`}
              className="absolute inset-0 h-full w-full object-cover object-top"
              draggable={false}
            />
            <video
              src={tier.art.nftVideo}
              poster={tier.art.nft}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedData={(e) => playLoopVideo(e.currentTarget)}
              onCanPlay={(e) => playLoopVideo(e.currentTarget)}
              ref={playLoopVideo}
              aria-label={`${tier.title} animated character`}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-1.5 pt-8 lg:pb-1 lg:pt-6">
          <p className="font-orbitron text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">
            Tier {tier.id} · {tier.contractName}
          </p>
          <p className="font-cinzel text-base font-bold text-white drop-shadow sm:text-lg lg:text-base xl:text-lg">
            {tier.title}
          </p>
          <p className="hidden font-sora text-[10px] leading-snug text-white/75 sm:block lg:hidden xl:block">
            {tier.tagline}
          </p>
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

function formatPennyDisplay(amount: bigint, decimals = 18): string {
  return formatCompactTokenAmount(amount, decimals, 2);
}

function formatNativeDisplay(amount: bigint): string {
  return formatCompactTokenAmount(amount, 18, 4);
}

export default function Staking() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const canAccessStaking = canAccessFarm(selectedNetwork);
  const poaLive = hasLiveProofOfAccess(selectedNetwork);
  const harvesterLive = hasLiveHarvester(selectedNetwork);
  const { mintTier, isPending: isMinting } = useProofOfAccessMint();
  const { giftNft, isPending: isGifting } = useProofOfAccessGift();
  const {
    farmDeposit,
    updateSubscriptions,
    farmWithdraw,
    farmClaim,
    isPending: isFarming,
  } = useHarvesterFarm();

  // Marble (0) on first visit; restore last choice on return
  const [tierId, setTierId] = useState<TierId>(() => readCachedTierId());
  const [mintConfig, setMintConfig] = useState<ProofOfAccessMintConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [farmAmount, setFarmAmount] = useState("");
  const [selectedRewardAddress, setSelectedRewardAddress] = useState<Address | null>(null);
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"mint" | "streams" | "info">("mint");
  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [mintReadiness, setMintReadiness] = useState<ProofOfAccessMintReadiness | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [mintStep, setMintStep] = useState<"idle" | "checking" | "approving" | "minting">("idle");

  // Farm / Harvester
  const [farmStep, setFarmStep] = useState<HarvesterFarmStep>("idle");
  const [farmStatus, setFarmStatus] = useState("Ready to farm PENNY");
  const [farmReadiness, setFarmReadiness] = useState<HarvesterDepositReadiness | null>(null);
  const [loadingFarmReadiness, setLoadingFarmReadiness] = useState(false);
  const [totalFarmPennySent, setTotalFarmPennySent] = useState<bigint | null>(null);
  const [currentFarmBalance, setCurrentFarmBalance] = useState<bigint | null>(null);
  const [liveSubscriptions, setLiveSubscriptions] = useState<Address[]>([]);
  const [loadingFarmStats, setLoadingFarmStats] = useState(false);

  // Withdraw timelock
  const [withdrawLock, setWithdrawLock] = useState<HarvesterWithdrawTimelock | null>(null);
  const [withdrawCountdown, setWithdrawCountdown] = useState(0);
  const [withdrawStep, setWithdrawStep] = useState<"idle" | "checking" | "withdrawing">("idle");
  const [loadingWithdrawLock, setLoadingWithdrawLock] = useState(false);

  // Claim / harvest streams (full on-chain snapshot + era math when staked)
  const [claimableStreams, setClaimableStreams] = useState<ClaimableRewardStream[]>([]);
  const [rewardSnapshot, setRewardSnapshot] = useState<UserRewardStreamsSnapshot | null>(null);
  const [loadingClaimables, setLoadingClaimables] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimSelection, setClaimSelection] = useState<Address[]>([]);
  const [claimStep, setClaimStep] = useState<"idle" | "claiming">("idle");

  // Harvested claim history (Harvester.userTotalClaimHistory + getUserClaims)
  // Cache holds up to 200-entry on-chain batches so Older/Newer is local until the next batch.
  const [harvestedCount, setHarvestedCount] = useState<number | null>(null);
  const [loadingHarvestedCount, setLoadingHarvestedCount] = useState(false);
  const [claimHistoryOpen, setClaimHistoryOpen] = useState(false);
  const [claimHistoryPage, setClaimHistoryPage] = useState(0);
  const [claimHistoryPageCount, setClaimHistoryPageCount] = useState(0);
  const [claimHistoryRows, setClaimHistoryRows] = useState<HarvesterClaimDisplay[]>([]);
  const [loadingClaimHistory, setLoadingClaimHistory] = useState(false);
  const claimHistoryCacheRef = useRef<HarvesterClaimsCache | null>(null);
  const harvestedCountRef = useRef<number | null>(null);
  harvestedCountRef.current = harvestedCount;

  // Subscription dialog
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subDialogMode, setSubDialogMode] = useState<"farm" | "manage">("manage");
  const [selectedStreams, setSelectedStreams] = useState<Address[]>([]);
  const [streamSearch, setStreamSearch] = useState("");
  const [customTokenInput, setCustomTokenInput] = useState("");
  const [maxStreams, setMaxStreams] = useState(1);
  /** Token id of designated basket NFT for Harvester subscribe limits (0 = standard / no NFT) */
  const [designatedNftId, setDesignatedNftId] = useState<bigint | null>(null);
  const [subscribeNftId, setSubscribeNftId] = useState<bigint>(0n);

  // Live wallet balances (viem reads)
  const [nativeBalance, setNativeBalance] = useState<bigint | null>(null);
  const [pennyBalance, setPennyBalance] = useState<bigint | null>(null);
  const [walletPennyDecimals, setWalletPennyDecimals] = useState(18);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Owned ProofOfAccess NFTs (basket)
  const [ownedNfts, setOwnedNfts] = useState<ProofOfAccessPlayer[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [selectedNft, setSelectedNft] = useState<ProofOfAccessPlayer | null>(null);
  const [nftDialogOpen, setNftDialogOpen] = useState(false);

  // Gift NFT (ERC-721 transferFrom)
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftStep, setGiftStep] = useState<"idle" | "sending">("idle");

  const tier = useMemo(() => getTier(tierId), [tierId]);
  const pennyDecimals =
    mintConfig?.pennyDecimals ??
    mintReadiness?.pennyDecimals ??
    farmReadiness?.pennyDecimals ??
    walletPennyDecimals ??
    18;

  const whitelistByCategory = useMemo(
    () => getWhitelistedTokensByCategory(selectedNetwork.chainId),
    [selectedNetwork.chainId],
  );

  const handleTierChange = useCallback((id: TierId) => {
    setTierId(id);
    writeCachedTierId(id);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!account?.address) {
      setNativeBalance(null);
      setPennyBalance(null);
      return;
    }
    setLoadingBalances(true);
    try {
      const bal = await fetchWalletStakingBalances(account.address as Address);
      setNativeBalance(bal.ethBalance);
      setPennyBalance(bal.pennyBalance);
      setWalletPennyDecimals(bal.pennyDecimals);
    } catch (err) {
      console.error("refreshBalances failed", err);
      setNativeBalance(null);
      setPennyBalance(null);
    } finally {
      setLoadingBalances(false);
    }
  }, [account?.address]);

  const refreshOwnedNfts = useCallback(async () => {
    if (!account?.address || !poaLive) {
      setOwnedNfts([]);
      return;
    }
    setLoadingNfts(true);
    try {
      const players = await getPlayerOwners(account.address as Address);
      setOwnedNfts(players);
    } catch (err) {
      console.error("refreshOwnedNfts failed", err);
      setOwnedNfts([]);
    } finally {
      setLoadingNfts(false);
    }
  }, [account?.address, poaLive]);

  /**
   * Pull Total Farm from Harvester.TotalPENNYSent and user stake from balances[user].
   * Safe to call before/after deposit or withdraw so the dashboard stays in sync.
   */
  const refreshFarmStats = useCallback(async () => {
    if (!harvesterLive) {
      setTotalFarmPennySent(null);
      setCurrentFarmBalance(null);
      setLiveSubscriptions([]);
      return;
    }
    setLoadingFarmStats(true);
    try {
      if (account?.address) {
        const stats = await fetchHarvesterFarmStats(account.address as Address);
        setTotalFarmPennySent(stats.totalFarmPennySent);
        setCurrentFarmBalance(stats.stakedBalance);
        setLiveSubscriptions(stats.subscriptions);
      } else {
        // Global TotalPENNYSent does not require a wallet
        const total = await fetchTotalPennySent();
        setTotalFarmPennySent(total);
        setCurrentFarmBalance(null);
        setLiveSubscriptions([]);
      }
    } catch (err) {
      console.error("refreshFarmStats failed", err);
      setTotalFarmPennySent(null);
      setCurrentFarmBalance(null);
      setLiveSubscriptions([]);
    } finally {
      setLoadingFarmStats(false);
    }
  }, [account?.address, harvesterLive]);

  /** entryMap + timeLock for withdraw countdown / button lock. */
  const refreshWithdrawLock = useCallback(async () => {
    if (!account?.address || !harvesterLive) {
      setWithdrawLock(null);
      setWithdrawCountdown(0);
      return;
    }
    setLoadingWithdrawLock(true);
    try {
      const lock = await fetchWithdrawTimelock(account.address as Address);
      setWithdrawLock(lock);
      setWithdrawCountdown(lock.remainingSeconds);
    } catch (err) {
      console.error("refreshWithdrawLock failed", err);
      setWithdrawLock(null);
      setWithdrawCountdown(0);
    } finally {
      setLoadingWithdrawLock(false);
    }
  }, [account?.address, harvesterLive]);

  /**
   * Staking page reward load path:
   * - Always re-read balances, subscriptions, globals, claimRewards, tokenEconomics, eras
   * - Run stored-era accrual math only when balances[user] > 0 (active stake)
   * - Display claimable amounts to the last token unit
   */
  const refreshClaimables = useCallback(async () => {
    if (!account?.address || !harvesterLive) {
      setClaimableStreams([]);
      setRewardSnapshot(null);
      return;
    }
    setLoadingClaimables(true);
    try {
      const snapshot = await loadUserRewardStreamsSnapshot(account.address as Address);
      setRewardSnapshot(snapshot);
      setClaimableStreams(snapshot.streams);
      // Keep Current Farm aligned with the same balances[] read used for era gate
      setCurrentFarmBalance(snapshot.stakedBalance);
      if (snapshot.subscriptions.length) {
        setLiveSubscriptions(snapshot.subscriptions);
      }
      setSelectedRewardAddress((prev) => {
        if (
          prev &&
          snapshot.streams.some((s) => normalizeAddr(s.address) === normalizeAddr(prev))
        ) {
          return prev;
        }
        return snapshot.streams[0]?.address ?? null;
      });
    } catch (err) {
      console.error("refreshClaimables failed", err);
      setClaimableStreams([]);
      setRewardSnapshot(null);
    } finally {
      setLoadingClaimables(false);
    }
  }, [account?.address, harvesterLive]);

  /** Total harvest claims — Harvester.userTotalClaimHistory (claims count). */
  const refreshHarvestedCount = useCallback(async () => {
    if (!account?.address || !harvesterLive) {
      setHarvestedCount(null);
      return;
    }
    setLoadingHarvestedCount(true);
    try {
      const count = await fetchHarvesterUserClaimsCount(account.address as Address);
      setHarvestedCount(count);
    } catch (err) {
      console.error("refreshHarvestedCount failed", err);
      setHarvestedCount(null);
    } finally {
      setLoadingHarvestedCount(false);
    }
  }, [account?.address, harvesterLive]);

  /**
   * Resolve a claim-history UI page from the local batch cache when possible.
   * userTotalClaimHistory tells us how many entries exist; getUserClaims only
   * runs when the needed ≤200 batch is missing (or forceRefresh is set).
   */
  const refreshClaimHistoryPage = useCallback(
    async (
      page: number,
      options?: { totalHint?: number | null; forceRefresh?: boolean },
    ) => {
      if (!account?.address || !harvesterLive) {
        claimHistoryCacheRef.current = null;
        setClaimHistoryRows([]);
        setClaimHistoryPageCount(0);
        setHarvestedCount(null);
        return;
      }

      const wallet = account.address as Address;
      const forceRefresh = options?.forceRefresh === true;
      const knownTotal = harvestedCountRef.current;

      try {
        let total: number;
        if (forceRefresh) {
          setLoadingClaimHistory(true);
          total = await fetchHarvesterUserClaimsCount(wallet);
        } else if (typeof options?.totalHint === "number" && options.totalHint >= 0) {
          total = options.totalHint;
        } else if (typeof knownTotal === "number" && knownTotal >= 0) {
          total = knownTotal;
        } else {
          setLoadingClaimHistory(true);
          total = await fetchHarvesterUserClaimsCount(wallet);
        }

        const walletKey = wallet.toLowerCase();
        let cache = claimHistoryCacheRef.current;
        if (
          forceRefresh ||
          !cache ||
          cache.wallet !== walletKey ||
          cache.total !== total
        ) {
          cache = createHarvesterClaimsCache(wallet, total);
          claimHistoryCacheRef.current = cache;
        }

        const pageCount = total === 0 ? 0 : Math.max(1, Math.ceil(total / HARVESTER_CLAIMS_PAGE_SIZE));
        const safePage =
          pageCount === 0 ? 0 : Math.min(Math.max(0, page), pageCount - 1);
        const { start, count } = harvesterClaimsPageRange(
          total,
          safePage,
          HARVESTER_CLAIMS_PAGE_SIZE,
        );
        const needsFetch =
          total > 0 &&
          count > 0 &&
          !isHarvesterClaimsRangeLoaded(cache, start, count);

        if (needsFetch) setLoadingClaimHistory(true);

        const result = await ensureHarvesterClaimsPage(
          wallet,
          cache,
          safePage,
          HARVESTER_CLAIMS_PAGE_SIZE,
        );
        claimHistoryCacheRef.current = cache;
        setHarvestedCount(result.total);
        setClaimHistoryPage(result.page);
        setClaimHistoryPageCount(result.pageCount);
        setClaimHistoryRows(result.claims);
      } catch (err) {
        console.error("refreshClaimHistoryPage failed", err);
        setClaimHistoryRows([]);
        setClaimHistoryPageCount(0);
      } finally {
        setLoadingClaimHistory(false);
      }
    },
    [account?.address, harvesterLive],
  );

  const openClaimHistory = useCallback(() => {
    if (!account?.address) {
      toast.error("Connect your wallet to view claim history");
      return;
    }
    if (!harvesterLive) {
      toast.error("Harvester not live yet");
      return;
    }
    setClaimHistoryPage(0);
    setClaimHistoryOpen(true);
  }, [account?.address, harvesterLive]);

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

  // Load / refresh balances when wallet or network changes
  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances, selectedNetwork.chainId]);

  // Load owned NFTs when wallet or network changes
  useEffect(() => {
    void refreshOwnedNfts();
  }, [refreshOwnedNfts, selectedNetwork.chainId]);

  // Live farm totals from Harvester
  useEffect(() => {
    void refreshFarmStats();
  }, [refreshFarmStats, selectedNetwork.chainId]);

  // Withdraw timelock after last deposit entry
  useEffect(() => {
    void refreshWithdrawLock();
  }, [refreshWithdrawLock, selectedNetwork.chainId]);

  // Tick withdraw countdown once per second while locked (strict > unlockAt)
  useEffect(() => {
    if (!withdrawLock?.unlockAt || withdrawLock.stakedBalance <= 0n) {
      setWithdrawCountdown(0);
      return;
    }
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      // Match contract: need now > unlockAt
      const remaining =
        now <= withdrawLock.unlockAt ? withdrawLock.unlockAt - now + 1 : 0;
      setWithdrawCountdown(remaining);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [withdrawLock?.unlockAt, withdrawLock?.stakedBalance]);

  // On every staking page load / wallet / network change: fresh contract data + estimates
  useEffect(() => {
    void refreshClaimables();
  }, [refreshClaimables, selectedNetwork.chainId]);

  // Harvested total from userTotalClaimHistory
  useEffect(() => {
    void refreshHarvestedCount();
  }, [refreshHarvestedCount, selectedNetwork.chainId]);

  // Drop claim-history batch cache when wallet or network changes
  useEffect(() => {
    claimHistoryCacheRef.current = null;
  }, [account?.address, selectedNetwork.chainId]);

  // While claim-history dialog is open, serve pages from the ≤200 batch cache;
  // only missing batches trigger getUserClaims.
  useEffect(() => {
    if (!claimHistoryOpen) return;
    void refreshClaimHistoryPage(claimHistoryPage);
  }, [
    claimHistoryOpen,
    claimHistoryPage,
    refreshClaimHistoryPage,
    account?.address,
    selectedNetwork.chainId,
  ]);

  // While user has active stake, re-read chain params + re-run era math on a cadence
  // (owner can change tax/timeLock; new ERAs complete over time)
  useEffect(() => {
    if (!account?.address || !harvesterLive) return;
    if (!rewardSnapshot?.hasActiveStake) return;
    const id = window.setInterval(() => {
      void refreshClaimables();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [account?.address, harvesterLive, rewardSnapshot?.hasActiveStake, refreshClaimables]);

  /**
   * Designated NFT for farm / subscribe limits:
   * - No NFTs → standard (1 stream, nftId 0)
   * - First load / invalid previous → highest NFT in basket
   * - Manual switch only via "Choose this Tier" (does not follow mint carousel)
   */
  useEffect(() => {
    const usable = ownedNfts.filter((n) => !n.BLACKLIST);
    if (usable.length === 0) {
      setDesignatedNftId(null);
      setMaxStreams(1);
      setSubscribeNftId(0n);
      return;
    }

    setDesignatedNftId((prev) => {
      const stillOwned = prev !== null && usable.some((n) => n.ID === prev);
      if (stillOwned) return prev;
      const highest = pickHighestBasketNft(usable);
      return highest?.ID ?? null;
    });
  }, [ownedNfts]);

  // Keep maxStreams + subscribeNftId aligned with designated basket NFT
  useEffect(() => {
    const { maxStreams: max, nftId } = resolveMaxRewardStreams(ownedNfts, designatedNftId);
    setMaxStreams(max);
    setSubscribeNftId(nftId);
  }, [ownedNfts, designatedNftId]);

  /** True until the user has at least one Harvester reward stream */
  const needsStreamSubscription = Boolean(
    account && harvesterLive && liveSubscriptions.length === 0,
  );

  // Red status: prompt stream subscription when none yet (standard or with NFTs)
  useEffect(() => {
    if (!account || !harvesterLive) return;
    if (farmStep !== "idle" || loadingFarmReadiness || isFarming) return;

    if (needsStreamSubscription) {
      setFarmStatus("Subscribe to at least 1 reward stream to farm");
    } else if (liveSubscriptions.length > 0) {
      setFarmStatus((prev) =>
        prev.toLowerCase().includes("subscribe") || prev.toLowerCase().includes("reward stream")
          ? "Ready to farm PENNY"
          : prev,
      );
    }
  }, [
    account,
    harvesterLive,
    needsStreamSubscription,
    liveSubscriptions.length,
    farmStep,
    loadingFarmReadiness,
    isFarming,
  ]);

  const selectedRewardData = useMemo(() => {
    if (!selectedRewardAddress) return null;
    return (
      claimableStreams.find(
        (s) => normalizeAddr(s.address) === normalizeAddr(selectedRewardAddress),
      ) ?? null
    );
  }, [claimableStreams, selectedRewardAddress]);

  const canWithdrawNow = useMemo(() => {
    if (!account || !harvesterLive) return false;
    if (!withdrawLock || withdrawLock.stakedBalance <= 0n) return false;
    if (loadingWithdrawLock || withdrawStep !== "idle" || isFarming) return false;
    // Live countdown: 0 means now is strictly past entryMap + timeLock
    return withdrawCountdown <= 0 && withdrawLock.entryTimestamp > 0;
  }, [
    account,
    harvesterLive,
    withdrawLock,
    loadingWithdrawLock,
    withdrawStep,
    isFarming,
    withdrawCountdown,
  ]);

  /** Live plan: skip approve when pre-approved; include subscribe when streams changed */
  const farmPlan = useMemo(() => {
    if (!farmReadiness || selectedStreams.length === 0) return null;
    return planFarmDepositSteps({
      allowance: farmReadiness.allowance,
      depositAmount: farmReadiness.depositAmount,
      priorSubscriptions: farmReadiness.subscriptions,
      nextSubscriptions: selectedStreams,
    });
  }, [farmReadiness, selectedStreams]);

  const preApprovedDisplay =
    farmReadiness != null
      ? formatPennyDisplay(farmReadiness.allowance, farmReadiness.pennyDecimals)
      : null;

  // Keep red status in sync with planned steps while dialog is open / amount ready
  useEffect(() => {
    if (farmStep !== "idle" || loadingFarmReadiness || isFarming) return;
    if (!farmReadiness || !farmPlan) return;
    if (subDialogMode === "farm" && subDialogOpen) {
      const steps = farmPlan.stepLabels.join(" → ");
      if (!farmPlan.needsApproval && farmReadiness.allowance > 0n) {
        setFarmStatus(
          `Pre-approved ${preApprovedDisplay} PENNY · next: ${steps || "deposit"}`,
        );
      } else if (farmPlan.needsApproval) {
        setFarmStatus(`Needs approve · next: ${steps}`);
      } else {
        setFarmStatus(`Ready · ${steps}`);
      }
    }
  }, [
    farmPlan,
    farmReadiness,
    farmStep,
    loadingFarmReadiness,
    isFarming,
    subDialogMode,
    subDialogOpen,
    preApprovedDisplay,
  ]);

  const filteredCategories = useMemo(() => {
    const q = streamSearch.trim().toLowerCase();
    const result: Partial<Record<RewardTokenCategory, WhitelistedRewardToken[]>> = {};
    for (const cat of CATEGORY_ORDER) {
      const list = whitelistByCategory[cat] ?? [];
      if (!list.length) continue;
      const filtered = q
        ? list.filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.address.toLowerCase().includes(q),
          )
        : list;
      if (filtered.length) result[cat] = filtered;
    }
    return result;
  }, [whitelistByCategory, streamSearch]);

  const nativeDisplay =
    !account
      ? "—"
      : loadingBalances && nativeBalance === null
        ? "…"
        : nativeBalance !== null
          ? formatNativeDisplay(nativeBalance)
          : "—";

  const pennyDisplay =
    !account
      ? "—"
      : loadingBalances && pennyBalance === null
        ? "…"
        : pennyBalance !== null
          ? formatPennyDisplay(pennyBalance, walletPennyDecimals)
          : "—";

  const totalFarmDisplay =
    !harvesterLive
      ? "—"
      : loadingFarmStats && totalFarmPennySent === null
        ? "…"
        : totalFarmPennySent !== null
          ? formatPennyDisplay(totalFarmPennySent, pennyDecimals)
          : "0";

  const currentFarmDisplay =
    !account || !harvesterLive
      ? "—"
      : loadingFarmStats && currentFarmBalance === null
        ? "…"
        : currentFarmBalance !== null
          ? formatPennyDisplay(currentFarmBalance, pennyDecimals)
          : "0";

  const walletPennyHuman =
    pennyBalance !== null ? formatPennyDisplay(pennyBalance, walletPennyDecimals) : "0";

  const parseFarmAmount = useCallback((): bigint | null => {
    const raw = farmAmount.trim();
    if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) return null;
    try {
      return toTokenSmallestUnit(raw, pennyDecimals);
    } catch {
      return null;
    }
  }, [farmAmount, pennyDecimals]);

  const setFarmAmountPercent = useCallback(
    (pct: "25%" | "50%" | "MAX") => {
      if (pennyBalance === null || pennyBalance <= 0n) {
        setFarmAmount("0");
        return;
      }
      const portion =
        pct === "MAX"
          ? pennyBalance
          : (pennyBalance * BigInt(pct === "25%" ? 25 : 50)) / 100n;
      setFarmAmount(fromTokenSmallestUnit(portion, walletPennyDecimals));
    },
    [pennyBalance, walletPennyDecimals],
  );

  /** Full unstake via Harvester.withdraw() after timelock. */
  const handleWithdrawNow = useCallback(async () => {
    if (!account) {
      toast.error("Connect your wallet to withdraw");
      return;
    }
    if (!harvesterLive) {
      toast.error("Harvester not live yet");
      return;
    }
    if (!canWithdrawNow) {
      toast.error("Withdraw locked", {
        description:
          withdrawCountdown > 0
            ? `Timelock remaining: ${formatDurationCountdown(withdrawCountdown)}`
            : "No stake available to withdraw.",
      });
      return;
    }

    setWithdrawStep("checking");
    try {
      await farmWithdraw({
        onStep: (step) => {
          setWithdrawStep(step === "idle" ? "idle" : step);
        },
      });
      toast.success("Withdraw complete", {
        description: "Your PENNY stake was returned to your wallet.",
      });
      await Promise.all([
        refreshFarmStats(),
        refreshWithdrawLock(),
        refreshBalances(),
        refreshClaimables(),
      ]);
    } catch (err) {
      console.error("withdraw failed", err);
      const msg = err instanceof Error ? err.message : "Withdraw failed";
      toast.error("Withdraw failed", { description: msg });
    } finally {
      setWithdrawStep("idle");
    }
  }, [
    account,
    harvesterLive,
    canWithdrawNow,
    withdrawCountdown,
    farmWithdraw,
    refreshFarmStats,
    refreshWithdrawLock,
    refreshBalances,
    refreshClaimables,
  ]);

  const openClaimDialog = useCallback(
    (preselectAll: boolean) => {
      if (!account) {
        toast.error("Connect your wallet to claim");
        return;
      }
      if (!harvesterLive) {
        toast.error("Harvester not live yet");
        return;
      }
      if (claimableStreams.length === 0) {
        toast.error("No reward streams", {
          description: "Subscribe to reward streams while farming first.",
        });
        return;
      }
      if (preselectAll) {
        setClaimSelection(claimableStreams.map((s) => s.address));
      } else if (selectedRewardAddress) {
        setClaimSelection([selectedRewardAddress]);
      } else {
        setClaimSelection(claimableStreams.map((s) => s.address));
      }
      setClaimDialogOpen(true);
    },
    [account, harvesterLive, claimableStreams, selectedRewardAddress],
  );

  const toggleClaimToken = useCallback((address: Address) => {
    setClaimSelection((prev) => {
      const exists = prev.some((a) => normalizeAddr(a) === normalizeAddr(address));
      if (exists) {
        return prev.filter((a) => normalizeAddr(a) !== normalizeAddr(address));
      }
      return [...prev, address];
    });
  }, []);

  const runClaim = useCallback(
    async (tokens: Address[], label: string) => {
      if (!account) {
        toast.error("Connect your wallet to claim");
        return;
      }
      if (!tokens.length) {
        toast.error("Select at least one reward stream");
        return;
      }
      setClaimStep("claiming");
      try {
        await farmClaim({
          tokens,
          wallet: account.address as Address,
          onStep: (step) => {
            if (step === "idle") setClaimStep("idle");
            else setClaimStep("claiming");
          },
        });
        toast.success(label, {
          description: `Claimed ${tokens.length} stream${tokens.length === 1 ? "" : "s"}.`,
        });
        setClaimDialogOpen(false);
        await Promise.all([
          refreshClaimables(),
          refreshFarmStats(),
          refreshBalances(),
          refreshHarvestedCount(),
        ]);
        // New claims land at the end of history — drop cache and show newest page
        claimHistoryCacheRef.current = null;
        setClaimHistoryPage(0);
        if (claimHistoryOpen) {
          await refreshClaimHistoryPage(0, { forceRefresh: true });
        }
      } catch (err) {
        console.error("claim failed", err);
        const msg = err instanceof Error ? err.message : "Claim failed";
        toast.error("Claim failed", { description: msg });
      } finally {
        setClaimStep("idle");
      }
    },
    [
      account,
      farmClaim,
      refreshClaimables,
      refreshFarmStats,
      refreshBalances,
      refreshHarvestedCount,
      claimHistoryOpen,
      refreshClaimHistoryPage,
    ],
  );

  const handleHarvestSelected = useCallback(async () => {
    await runClaim(claimSelection, "Rewards claimed");
  }, [runClaim, claimSelection]);

  const handleHarvestAll = useCallback(async () => {
    if (!account) {
      toast.error("Connect your wallet to claim");
      return;
    }
    if (!harvesterLive) {
      toast.error("Harvester not live yet");
      return;
    }
    if (claimableStreams.length === 0) {
      toast.error("No reward streams", {
        description: "Subscribe to reward streams while farming first.",
      });
      return;
    }
    await runClaim(
      claimableStreams.map((s) => s.address),
      "Harvested all streams",
    );
  }, [account, harvesterLive, claimableStreams, runClaim]);

  const openNftDialog = useCallback((nft: ProofOfAccessPlayer) => {
    setSelectedNft(nft);
    setNftDialogOpen(true);
  }, []);

  const isAlreadyDesignated = useCallback(
    (nft: ProofOfAccessPlayer | null | undefined) => {
      if (!nft || designatedNftId === null) return false;
      return nft.ID === designatedNftId;
    },
    [designatedNftId],
  );

  /** Manual tier switch — only way to change designated basket NFT (not mint carousel) */
  const switchToNftTier = useCallback(() => {
    if (!selectedNft || selectedNft.BLACKLIST) return;
    if (isAlreadyDesignated(selectedNft)) return;

    const mapped = getTierByContractName(selectedNft.TIER);
    setDesignatedNftId(selectedNft.ID);
    setMaxStreams(Math.max(1, Number(selectedNft.LISTS)));
    setSubscribeNftId(selectedNft.ID);
    // Sync farm / viewing art to the chosen basket tier (mint carousel still free to browse)
    handleTierChange(mapped.id);
    setNftDialogOpen(false);
    toast.success(`Designated ${mapped.title}`, {
      description: `Token #${selectedNft.ID.toString()} · up to ${Number(selectedNft.LISTS)} revenue streams`,
    });
  }, [selectedNft, isAlreadyDesignated, handleTierChange]);

  const openGiftDialog = useCallback(() => {
    if (!selectedNft) return;
    if (isAlreadyDesignated(selectedNft)) {
      toast.error("Switch off this tier first", {
        description: "You can’t gift the NFT that’s currently active for farming.",
      });
      return;
    }
    if (!account) {
      toast.error("Connect your wallet to gift an NFT");
      return;
    }
    if (!poaLive) {
      toast.error("Proof of Access is not live on this network yet");
      return;
    }
    setGiftRecipient("");
    setGiftStep("idle");
    setGiftDialogOpen(true);
  }, [selectedNft, isAlreadyDesignated, account, poaLive]);

  /** ERC-721 transferFrom: send selected PoA NFT to any wallet the user enters */
  const confirmGiftNft = useCallback(async () => {
    if (!account) {
      toast.error("Connect your wallet to gift an NFT");
      return;
    }
    if (!selectedNft) {
      toast.error("No NFT selected");
      return;
    }
    if (isAlreadyDesignated(selectedNft)) {
      toast.error("This NFT is your active tier — choose another tier before gifting it.");
      return;
    }

    const recipient = giftRecipient.trim();
    if (!isValidAddress(recipient)) {
      toast.error("Enter a valid wallet address", {
        description: "Addresses look like 0x followed by 40 hex characters.",
      });
      return;
    }
    if (normalizeAddr(recipient) === normalizeAddr(account.address)) {
      toast.error("Cannot gift to your own wallet");
      return;
    }

    const nftTier = getTierByContractName(selectedNft.TIER);
    const tokenId = selectedNft.ID;

    try {
      setGiftStep("sending");
      toast.loading("Confirm gift in your wallet…", {
        id: "gift-poa",
        description: `transferFrom → Token #${tokenId.toString()}`,
      });

      const result = await giftNft({
        from: account.address as Address,
        to: recipient,
        tokenId,
      });

      const shortTo = `${result.to.slice(0, 6)}…${result.to.slice(-4)}`;
      toast.success(`Gifted ${nftTier.title}`, {
        id: "gift-poa",
        description: `Token #${tokenId.toString()} sent to ${shortTo}`,
      });

      setGiftDialogOpen(false);
      setGiftRecipient("");
      setNftDialogOpen(false);
      setSelectedNft(null);
      // Basket refresh re-resolves designated tier (highest remaining, or standard if empty)
      void refreshOwnedNfts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gift failed";
      toast.error(message, { id: "gift-poa" });
    } finally {
      setGiftStep("idle");
    }
  }, [account, selectedNft, isAlreadyDesignated, giftRecipient, giftNft, refreshOwnedNfts]);

  const toggleStream = useCallback(
    (address: Address) => {
      setSelectedStreams((prev) => {
        const exists = prev.some((a) => normalizeAddr(a) === normalizeAddr(address));
        if (exists) {
          return prev.filter((a) => normalizeAddr(a) !== normalizeAddr(address));
        }
        if (prev.length >= maxStreams) {
          toast.error(`Max ${maxStreams} stream${maxStreams === 1 ? "" : "s"}`, {
            description:
              ownedNfts.filter((n) => !n.BLACKLIST).length === 0
                ? "Standard access (no NFT) — you can pick only 1 reward stream."
                : "Your designated NFT unlocks this many revenue streams.",
          });
          return prev;
        }
        return [...prev, address];
      });
    },
    [maxStreams, ownedNfts.length],
  );

  const addCustomToken = useCallback(() => {
    const raw = customTokenInput.trim();
    if (!isValidAddress(raw)) {
      toast.error("Enter a valid token contract address (0x…)");
      return;
    }
    const addr = raw as Address;
    toggleStream(addr);
    setCustomTokenInput("");
    setStreamSearch("");
  }, [customTokenInput, toggleStream]);

  const openSubscriptionDialog = useCallback(
    async (mode: "farm" | "manage") => {
      if (!account) {
        toast.error("Connect your wallet first");
        return;
      }
      if (!harvesterLive) {
        toast.error("Harvester not live yet", {
          description:
            "Using zero stand-in address. Deploy Harvester, then set harvester in networkData.",
        });
        return;
      }

      setSubDialogMode(mode);
      setStreamSearch("");
      setCustomTokenInput("");
      setSubDialogOpen(true);
      setFarmStatus(
        mode === "farm"
          ? "Pick reward streams, then confirm deposit…"
          : "Update your reward stream subscriptions…",
      );

      // Seed selection from on-chain subscriptions
      try {
        const subs = await fetchUserSubscriptions(account.address as Address);
        setSelectedStreams(subs.tokens.length ? [...subs.tokens] : []);
        setLiveSubscriptions(subs.tokens);
      } catch {
        setSelectedStreams([]);
      }
    },
    [account, harvesterLive],
  );

  /** Stake Now → readiness check + subscription dialog */
  const openFarmFlow = useCallback(async () => {
    if (!account) {
      toast.error("Connect your wallet to farm");
      return;
    }
    if (!harvesterLive) {
      toast.error("Harvester not live yet", {
        description:
          "Using zero stand-in address. Deploy Harvester, then set harvester in networkData.",
      });
      return;
    }

    const amount = parseFarmAmount();
    if (amount === null) {
      toast.error("Enter a valid PENNY amount to farm");
      return;
    }

    // Snapshot TotalPENNYSent before deposit flow
    void refreshFarmStats();

    setFarmStep("checking");
    setFarmStatus("Checking PENNY balance and gas…");
    setLoadingFarmReadiness(true);
    setFarmReadiness(null);

    try {
      const readiness = await checkHarvesterDepositReadiness(
        account.address as Address,
        amount,
        {
          ownedNfts,
          preferredNftId: subscribeNftId,
          expectedTxCount: 3,
        },
      );
      setFarmReadiness(readiness);
      setMaxStreams(readiness.maxStreams);
      setSubscribeNftId(readiness.nftId);

      if (!readiness.hasEnoughPenny) {
        setFarmStatus(
          `Not enough PENNY — need ${formatPennyDisplay(amount, readiness.pennyDecimals)}, have ${formatPennyDisplay(readiness.pennyBalance, readiness.pennyDecimals)}`,
        );
        toast.error("Not enough PENNY", {
          description: `You need ${formatPennyDisplay(amount, readiness.pennyDecimals)} PENNY in your wallet to deposit.`,
        });
      } else if (!readiness.hasEnoughGas) {
        setFarmStatus(
          `Not enough ${selectedNetwork.symbol} for gas (need ~${formatEther(readiness.ethNeeded)})`,
        );
        toast.error(`Not enough ${selectedNetwork.symbol} for gas`, {
          description: `Approve + subscribe + deposit need gas. Mint fee buffer ${formatEther(readiness.mintFee)} ${selectedNetwork.symbol} + est. gas ~${formatEther(readiness.ethGasReserve)}.`,
        });
      } else {
        setFarmStatus("Select reward streams, then confirm deposit");
      }

      await openSubscriptionDialog("farm");
      setFarmStep("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not prepare farm";
      setFarmStatus(message);
      toast.error(message);
      setFarmStep("idle");
    } finally {
      setLoadingFarmReadiness(false);
    }
  }, [
    account,
    harvesterLive,
    parseFarmAmount,
    ownedNfts,
    subscribeNftId,
    selectedNetwork.symbol,
    openSubscriptionDialog,
    refreshFarmStats,
  ]);

  const confirmFarmDeposit = useCallback(async () => {
    if (!account || !farmReadiness) {
      toast.error("Farm readiness not loaded");
      return;
    }
    if (selectedStreams.length === 0) {
      toast.error("Pick at least one reward stream");
      return;
    }
    if (selectedStreams.length > maxStreams) {
      toast.error(`Max ${maxStreams} stream(s) for your pass`);
      return;
    }
    if (!farmReadiness.hasEnoughPenny) {
      toast.error("Not enough PENNY for this deposit");
      return;
    }

    // Plan from dialog state (fresh on-chain re-check happens inside farmDeposit)
    const planned = planFarmDepositSteps({
      allowance: farmReadiness.allowance,
      depositAmount: farmReadiness.depositAmount,
      priorSubscriptions: farmReadiness.subscriptions,
      nextSubscriptions: selectedStreams,
    });

    try {
      // TotalPENNYSent snapshot before deposit txs
      await refreshFarmStats();

      toast.loading(
        planned.needsApproval
          ? "Preparing approve → …"
          : planned.needsSubscribe
            ? "Preparing subscribe → deposit…"
            : "Preparing deposit…",
        { id: "farm-harvester" },
      );
      const result = await farmDeposit({
        wallet: account.address as Address,
        amount: farmReadiness.depositAmount,
        selectedTokens: selectedStreams,
        nftId: subscribeNftId,
        readiness: farmReadiness,
        onStep: (step, detail) => {
          setFarmStep(step);
          if (detail) setFarmStatus(detail);
          if (step === "approving") {
            toast.loading("Approve PENNY in your wallet…", {
              id: "farm-harvester",
              description: `Allow Harvester to spend ${formatPennyDisplay(farmReadiness.depositAmount, farmReadiness.pennyDecimals)} PENNY`,
            });
          } else if (step === "subscribing") {
            toast.loading("Confirm reward streams in your wallet…", {
              id: "farm-harvester",
              description: `subscribeToToken · tokenId ${subscribeNftId.toString()} · ${selectedStreams.length} stream(s) (list changed)`,
            });
          } else if (step === "depositing") {
            toast.loading("Confirm deposit in your wallet…", {
              id: "farm-harvester",
              description: `deposit(${formatPennyDisplay(farmReadiness.depositAmount, farmReadiness.pennyDecimals)} PENNY)`,
            });
          } else if (step === "checking" && detail) {
            toast.loading(detail, { id: "farm-harvester" });
          }
        },
      });

      const ran: string[] = [];
      if (result.didApprove) ran.push("approved");
      if (result.didSubscribe) ran.push("subscribed");
      ran.push("deposited");
      toast.success("PENNY deposited to Harvester", {
        id: "farm-harvester",
        description: ran.join(" · "),
      });
      setFarmStatus(
        `Deposited ${formatPennyDisplay(farmReadiness.depositAmount, farmReadiness.pennyDecimals)} PENNY`,
      );
      setSubDialogOpen(false);
      setFarmAmount("");
      setFarmReadiness(null);
      void refreshBalances();
      // TotalPENNYSent + balances + timelock + claimables after successful deposit
      await Promise.all([
        refreshFarmStats(),
        refreshWithdrawLock(),
        refreshClaimables(),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Farm deposit failed";
      setFarmStatus(message);
      toast.error(message, { id: "farm-harvester" });
      // Still re-read TotalPENNYSent after a failed mid-flow attempt
      void refreshFarmStats();
    } finally {
      setFarmStep("idle");
    }
  }, [
    account,
    farmReadiness,
    selectedStreams,
    maxStreams,
    farmDeposit,
    subscribeNftId,
    refreshBalances,
    refreshFarmStats,
    refreshWithdrawLock,
    refreshClaimables,
  ]);

  const confirmManageSubscriptions = useCallback(async () => {
    if (!account) {
      toast.error("Connect your wallet");
      return;
    }
    if (selectedStreams.length === 0) {
      toast.error("Pick at least one reward stream");
      return;
    }
    if (selectedStreams.length > maxStreams) {
      toast.error(`Max ${maxStreams} stream(s) for your pass`);
      return;
    }

    // Unchanged list — nothing to send
    if (sameAddressSet(liveSubscriptions, selectedStreams)) {
      toast.message("No changes", { description: "Your streams already match this list." });
      setSubDialogOpen(false);
      return;
    }

    try {
      setFarmStep("subscribing");
      setFarmStatus("Confirm subscription list in your wallet…");
      toast.loading("Confirm subscriptions…", { id: "farm-subscribe" });
      let statusDetail = "";
      await updateSubscriptions({
        tokens: selectedStreams,
        nftId: subscribeNftId,
        maxStreams,
        wallet: account.address as Address,
        onStep: (step, detail) => {
          setFarmStep(step);
          if (detail) {
            setFarmStatus(detail);
            if (step === "idle") statusDetail = detail;
          }
        },
      });
      const keptPrior = /kept for claim/i.test(statusDetail);
      toast.success("Reward streams updated", {
        id: "farm-subscribe",
        description: keptPrior
          ? `${selectedStreams.length} stream(s) active · prior unclaimed streams stay in claim list`
          : `${selectedStreams.length} stream(s) active`,
      });
      setFarmStatus(
        keptPrior
          ? statusDetail
          : `Subscribed to ${selectedStreams.length} stream(s)`,
      );
      setSubDialogOpen(false);
      void refreshFarmStats();
      void refreshClaimables();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Subscription update failed";
      setFarmStatus(message);
      toast.error(message, { id: "farm-subscribe" });
    } finally {
      setFarmStep("idle");
    }
  }, [
    account,
    selectedStreams,
    maxStreams,
    liveSubscriptions,
    updateSubscriptions,
    subscribeNftId,
    refreshFarmStats,
    refreshClaimables,
  ]);

  /** Open confirm dialog + load gas / approval readiness for the chosen tier */
  const openMintDialog = useCallback(async () => {
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

    setActiveSidebarTab("mint");
    setMintDialogOpen(true);
    setLoadingReadiness(true);
    setMintReadiness(null);

    try {
      const readiness = await checkProofOfAccessMintReadiness(
        account.address as Address,
        tierId,
      );
      setMintReadiness(readiness);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not check mint requirements";
      toast.error(message);
      setMintDialogOpen(false);
    } finally {
      setLoadingReadiness(false);
    }
  }, [account, poaLive, mintConfig?.paused, tierId]);

  const confirmMint = useCallback(async () => {
    if (!account) {
      toast.error("Connect your wallet to mint");
      return;
    }
    if (!mintReadiness?.canMint) {
      if (mintReadiness && !mintReadiness.hasEnoughPenny) {
        toast.error("Not enough PENNY", {
          description: `You need ${formatPennyDisplay(mintReadiness.config.burnAmount, mintReadiness.pennyDecimals)} PENNY to burn for this tier.`,
        });
      } else if (mintReadiness && !mintReadiness.hasEnoughGas) {
        toast.error(`Not enough ${selectedNetwork.symbol} for gas`, {
          description: `Mint fee is ${formatEther(mintReadiness.config.mintFee)} ${selectedNetwork.symbol}, plus gas for approve + mint. Add more ${selectedNetwork.symbol} and try again.`,
        });
      }
      return;
    }

    try {
      setMintStep("checking");
      toast.loading("Preparing mint…", { id: "mint-poa" });
      await mintTier(tierId, {
        wallet: account.address as Address,
        readiness: mintReadiness,
        onStep: (step) => {
          setMintStep(step);
          if (step === "approving") {
            toast.loading("Approve PENNY burn in your wallet…", {
              id: "mint-poa",
              description: `Allow ProofOfAccess to spend ${formatPennyDisplay(mintReadiness.config.burnAmount, mintReadiness.pennyDecimals)} PENNY`,
            });
          } else if (step === "minting") {
            toast.loading("Confirm mint in your wallet…", {
              id: "mint-poa",
              description: `mint(${tierId}) · fee ${formatEther(mintReadiness.config.mintFee)} ${selectedNetwork.symbol}`,
            });
          }
        },
      });
      toast.success(`Minted ${tier.title} (${tier.contractName})`, {
        id: "mint-poa",
        description: `Tier level ${tierId} · ${tier.lists} revenue streams`,
      });
      setMintDialogOpen(false);
      setMintReadiness(null);
      // Refresh PENNY / native balances and NFT row after mint
      void refreshBalances();
      void refreshOwnedNfts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      toast.error(message, { id: "mint-poa" });
    } finally {
      setMintStep("idle");
    }
  }, [
    account,
    mintReadiness,
    mintTier,
    tierId,
    tier,
    selectedNetwork.symbol,
    refreshBalances,
    refreshOwnedNfts,
  ]);

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
    <div className="relative min-h-screen overflow-x-hidden textured-bg font-sora text-foreground lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden">
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

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-2 pb-3 pt-16 sm:px-4 sm:pt-[4.5rem] lg:h-[100dvh] lg:min-h-0 lg:max-h-[100dvh] lg:overflow-hidden lg:px-5 lg:pb-1.5 lg:pt-[4.25rem]">
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 lg:mb-1.5">
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
                {nativeDisplay} {selectedNetwork.symbol}
              </span>
              <InfinityIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-accent">{pennyDisplay} PENNY</span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border/60 theme-surface px-3 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                {account ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                  </>
                ) : (
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
                )}
              </span>
              <div className="leading-tight">
                <p className="font-jetbrains text-[10px] text-muted-foreground sm:text-xs">{shortWallet}</p>
                <p className="font-jetbrains text-[10px] font-medium text-success sm:text-xs">
                  {nativeDisplay} {selectedNetwork.symbol}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-2.5 lg:overflow-hidden">
          {/* Left rail — tier picker + mint */}
          <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-border/60 theme-surface-elevated shadow-xl lg:w-[240px] lg:max-h-full lg:shrink-0 xl:w-[260px]">
            <div className="border-b border-border/50 bg-muted/30 px-2.5 py-2 sm:px-3 sm:py-2.5 lg:py-2">
              <p className="mb-1.5 text-center font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground lg:mb-1">
                Pick your tier
              </p>
              <TierCarousel tierId={tierId} onChange={handleTierChange} />
            </div>

            <div className="flex shrink-0 items-center justify-center border-b border-border/50 px-3 py-2 lg:py-2">
              <button
                type="button"
                disabled={isMinting || loadingReadiness}
                onClick={() => {
                  void openMintDialog();
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary px-6 py-2 font-orbitron text-lg font-extrabold tracking-wide text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:text-xl lg:py-2",
                )}
              >
                {isMinting || loadingReadiness ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isMinting ? "minting…" : "checking…"}
                  </>
                ) : (
                  "mint"
                )}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5 sm:p-3 lg:gap-2 lg:overflow-hidden">
              <div className="flex shrink-0 gap-1 rounded-xl bg-muted/40 p-1">
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

              <div className="min-h-[100px] flex-1 overflow-y-auto rounded-xl border border-border/50 bg-card/60 p-2.5 font-sora text-sm lg:min-h-0 lg:p-2.5">
                <AnimatePresence mode="wait">
                  {activeSidebarTab === "mint" && (
                    <motion.div
                      key={`mint-${tierId}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="space-y-1.5"
                    >
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Proof of Access
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground lg:text-[11px]">
                        Mint a{" "}
                        <span className="font-bold text-foreground">{tier.title}</span>{" "}
                        <span className="font-jetbrains text-[10px] text-muted-foreground">
                          ({tier.contractName})
                        </span>{" "}
                        · tier{" "}
                        <span className="font-jetbrains font-bold text-foreground">{tierId}</span>
                      </p>
                      <div className="space-y-1 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 font-jetbrains text-[11px] text-muted-foreground">
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
                                  ? `${formatPennyDisplay(mintConfig.burnAmount, pennyDecimals)} PENNY`
                                  : `${tier.multiplier}× base`}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Mint fee</span>
                              <span className="font-semibold text-foreground">
                                {mintConfig
                                  ? `${formatEther(mintConfig.mintFee)} ${selectedNetwork.symbol}`
                                  : `0.00001 ${selectedNetwork.symbol}`}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Streams</span>
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
                        Subscribed {liveSubscriptions.length}/{maxStreams}
                        {ownedNfts.filter((n) => !n.BLACKLIST).length === 0 ? (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                            Standard access · max 1 stream
                          </span>
                        ) : designatedNftId !== null ? (
                          <span className="block text-[10px] text-muted-foreground">
                            Designated NFT #{designatedNftId.toString()}
                          </span>
                        ) : null}
                      </p>
                      <ul className="space-y-1.5">
                        {liveSubscriptions.length === 0 && (
                          <li className="rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 font-sora text-[11px] text-muted-foreground">
                            No streams yet — farm or open Subscriptions
                          </li>
                        )}
                        {liveSubscriptions.map((addr) => (
                          <li
                            key={addr}
                            className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 font-jetbrains text-xs font-semibold text-foreground"
                          >
                            <span className="truncate pr-2">
                              {resolveRewardTokenLabel(selectedNetwork.chainId, addr)}
                            </span>
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="mt-1 w-full rounded-lg bg-primary font-sora text-primary-foreground hover:opacity-90"
                        onClick={() => {
                          void openSubscriptionDialog("manage");
                        }}
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
                          <span className="text-muted-foreground">Stake token</span>
                          <span className="font-jetbrains font-semibold">PENNY</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Harvester</span>
                          <span
                            className={cn(
                              "font-semibold",
                              harvesterLive ? "text-success" : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {harvesterLive ? "live" : "stand-in"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max streams</span>
                          <span className="font-jetbrains font-semibold">{maxStreams}</span>
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

              {/* Owned NFT thumbnails — scroll/swipe; Subscriptions + Help pinned right */}
              <div className="mt-auto flex shrink-0 items-center gap-1.5 border-t border-border/50 pt-1.5 lg:pt-1">
                <div
                  className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ WebkitOverflowScrolling: "touch" }}
                  aria-label="Your Proof of Access NFTs"
                >
                  {loadingNfts && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/40">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!loadingNfts && !account && (
                    <p className="truncate px-1 font-sora text-[10px] text-muted-foreground">
                      Connect to see NFTs
                    </p>
                  )}
                  {!loadingNfts && account && ownedNfts.length === 0 && (
                    <p className="truncate px-1 font-sora text-[10px] text-muted-foreground">
                      No PoA NFTs yet
                    </p>
                  )}
                  {!loadingNfts &&
                    ownedNfts.map((nft) => {
                      const nftTier = getTierByContractName(nft.TIER);
                      const tokenId = nft.ID.toString();
                      const isDesignated = designatedNftId !== null && nft.ID === designatedNftId;
                      return (
                        <button
                          key={`${tokenId}-${nft.TIER}`}
                          type="button"
                          title={
                            isDesignated
                              ? `${nftTier.title} #${tokenId} · designated`
                              : `${nftTier.title} #${tokenId}`
                          }
                          onClick={() => openNftDialog(nft)}
                          className={cn(
                            "relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border shadow-sm transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            nft.BLACKLIST
                              ? "border-destructive/50 opacity-70"
                              : isDesignated
                                ? "border-primary ring-2 ring-primary/70"
                                : "border-border/60 hover:border-primary/60",
                          )}
                          style={{ boxShadow: `0 0 10px ${nftTier.glow}` }}
                        >
                          <img
                            src={nftTier.art.nft}
                            alt={`${nftTier.title} #${tokenId}`}
                            className="h-full w-full object-cover object-top"
                            draggable={false}
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-black/65 py-px text-center font-jetbrains text-[8px] font-bold leading-none text-white">
                            #{tokenId.length > 4 ? tokenId.slice(-3) : tokenId}
                          </span>
                          {isDesignated && (
                            <span className="absolute left-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary shadow" />
                          )}
                        </button>
                      );
                    })}
                </div>
                <motion.button
                  type="button"
                  title={
                    needsStreamSubscription
                      ? "Subscribe to a reward stream (required)"
                      : "Access your reward stream subscriptions"
                  }
                  onClick={() => {
                    void openSubscriptionDialog("manage");
                  }}
                  animate={
                    needsStreamSubscription
                      ? {
                          rotate: [0, -14, 14, -12, 12, -8, 8, 0],
                          scale: [1, 1.1, 1.1, 1.06, 1],
                        }
                      : subDialogOpen
                        ? { scale: [1, 1.04, 1] }
                        : { rotate: 0, scale: 1 }
                  }
                  transition={
                    needsStreamSubscription
                      ? { duration: 0.65, repeat: Infinity, repeatDelay: 0.85, ease: "easeInOut" }
                      : { duration: 0.25 }
                  }
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-md transition",
                    needsStreamSubscription
                      ? "border-amber-400 bg-amber-500 text-white shadow-[0_0_18px_rgba(245,158,11,0.65)]"
                      : subDialogOpen
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.55)]"
                        : "border-border/50 bg-emerald-600 text-white hover:opacity-90",
                  )}
                >
                  <Radio className="h-4 w-4" />
                  {liveSubscriptions.length > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 font-jetbrains text-[8px] font-bold text-primary-foreground">
                      {liveSubscriptions.length}
                    </span>
                  ) : needsStreamSubscription ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-200" />
                  ) : null}
                </motion.button>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 bg-accent text-accent-foreground shadow-md transition hover:opacity-90"
                  title="Help / Support"
                  onClick={() => setActiveSidebarTab("info")}
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* Main stage */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:overflow-hidden lg:gap-1.5">
            <div className="grid shrink-0 grid-cols-2 gap-1.5 lg:grid-cols-4 lg:gap-2">
              <StatCard
                label="Total Farm"
                value={totalFarmDisplay}
                unit={STAKE_TOKEN}
                accentClass="text-primary"
                delay={0.05}
              />
              <StatCard
                label="Current Farm"
                value={currentFarmDisplay}
                unit={STAKE_TOKEN}
                accentClass="text-accent"
                delay={0.1}
              />
              <StatCard
                label="Harvested"
                value={
                  !account || !harvesterLive
                    ? "—"
                    : loadingHarvestedCount && harvestedCount === null
                      ? "…"
                      : String(harvestedCount ?? 0)
                }
                unit={
                  !account || !harvesterLive
                    ? ""
                    : (harvestedCount ?? 0) === 1
                      ? "claim"
                      : "claims"
                }
                accentClass="text-amber-600 dark:text-amber-300"
                delay={0.15}
                onClick={account && harvesterLive ? openClaimHistory : undefined}
                title={
                  account && harvesterLive
                    ? "View claim history"
                    : undefined
                }
              />
              <StatCard
                label="Estimated Rewards"
                value={
                  !account || !harvesterLive
                    ? "—"
                    : loadingClaimables && claimableStreams.length === 0
                      ? "…"
                      : String(claimableStreams.length || liveSubscriptions.length || 0)
                }
                unit="streams"
                accentClass="text-success"
                delay={0.2}
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-border/50 theme-surface px-2.5 py-1.5 lg:px-3 lg:py-1"
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
              {claimableStreams.length === 0 ? (
                <span className="font-sora text-[11px] text-muted-foreground">
                  {account && harvesterLive
                    ? loadingClaimables
                      ? "Loading streams…"
                      : "No claimable streams yet"
                    : "Connect to view reward streams"}
                </span>
              ) : (
                claimableStreams.map((r, i) => (
                  <button
                    key={r.address}
                    type="button"
                    title={
                      r.isRetainedUnsubscribed
                        ? "Prior subscription — claim remaining rewards"
                        : undefined
                    }
                    onClick={() => setSelectedRewardAddress(r.address)}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-jetbrains text-xs font-semibold transition",
                      selectedRewardAddress &&
                        normalizeAddr(selectedRewardAddress) === normalizeAddr(r.address)
                        ? "bg-gradient-to-r text-white shadow-md " +
                            STREAM_CHIP_COLORS[i % STREAM_CHIP_COLORS.length]
                        : "theme-chip-secondary hover:opacity-90",
                      r.isRetainedUnsubscribed &&
                        !(
                          selectedRewardAddress &&
                          normalizeAddr(selectedRewardAddress) === normalizeAddr(r.address)
                        ) &&
                        "ring-1 ring-amber-500/50",
                    )}
                  >
                    {r.claimableDisplay} {r.symbol}
                    {r.isRetainedUnsubscribed ? " · claim" : ""}
                  </button>
                ))
              )}
            </motion.div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-3 md:gap-2.5 lg:min-h-0 lg:overflow-hidden">
              <ActionColumn
                title="Farm"
                subtitle="Stake PENNY · Serving"
                background={tier.art.farm}
                delay={0.15}
              >
                <div className="space-y-2 lg:space-y-1.5">
                  <div className="rounded-xl border border-destructive/40 bg-destructive/80 px-3 py-1.5 text-center backdrop-blur-sm sm:py-2">
                    <p className="font-sora text-[11px] font-medium tracking-wide text-destructive-foreground/90 sm:text-xs">
                      {farmStep !== "idle" || loadingFarmReadiness
                        ? "In progress"
                        : farmReadiness && !farmReadiness.needsApproval
                          ? "Pre-Approved"
                          : "Status"}
                    </p>
                    {farmReadiness && farmReadiness.allowance > 0n && farmStep === "idle" && !loadingFarmReadiness ? (
                      <p className="font-jetbrains text-base font-bold text-destructive-foreground sm:text-lg">
                        {preApprovedDisplay}{" "}
                        <span className="font-sora text-sm font-semibold text-destructive-foreground/80">
                          PENNY
                        </span>
                      </p>
                    ) : null}
                    <p className="font-sora text-xs font-semibold leading-snug text-destructive-foreground sm:text-sm">
                      {loadingFarmReadiness || farmStep === "checking" ? (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {farmStatus}
                        </span>
                      ) : farmStep === "approving" ||
                        farmStep === "subscribing" ||
                        farmStep === "depositing" ? (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {farmStatus}
                        </span>
                      ) : (
                        farmStatus
                      )}
                    </p>
                    {account && pennyBalance !== null && (
                      <p className="mt-0.5 font-jetbrains text-[10px] text-destructive-foreground/75">
                        Wallet {walletPennyHuman} PENNY
                        {farmPlan && farmStep === "idle" ? (
                          <span className="block opacity-90">
                            Flow: {farmPlan.stepLabels.join(" → ") || "—"}
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter PENNY amount"
                    value={farmAmount}
                    onChange={(e) => setFarmAmount(e.target.value)}
                    disabled={isFarming}
                    className="h-10 rounded-xl border border-border/50 theme-input-surface text-center font-jetbrains font-medium text-foreground placeholder:font-sora placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary lg:h-9"
                  />
                  <div className="flex gap-1.5">
                    {(["25%", "50%", "MAX"] as const).map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        disabled={isFarming}
                        onClick={() => setFarmAmountPercent(pct)}
                        className="flex-1 rounded-lg bg-white/15 py-1 font-orbitron text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-50"
                      >
                        {pct}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="h-11 w-full rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground shadow-lg hover:opacity-90 sm:text-base lg:h-10"
                    disabled={isFarming || loadingFarmReadiness}
                    onClick={() => {
                      void openFarmFlow();
                    }}
                  >
                    {isFarming || loadingFarmReadiness ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {farmStep === "approving"
                          ? "Approving…"
                          : farmStep === "subscribing"
                            ? "Subscribing…"
                            : farmStep === "depositing"
                              ? "Depositing…"
                              : "Checking…"}
                      </>
                    ) : (
                      <>
                        <Sprout className="h-4 w-4" />
                        Stake Now
                      </>
                    )}
                  </Button>
                </div>
              </ActionColumn>

              <ActionColumn
                title="Withdraw"
                subtitle="Unstake · Panicked"
                background={tier.art.withdraw}
                delay={0.25}
              >
                <div className="space-y-2 lg:space-y-1.5">
                  <div className="rounded-xl border border-white/20 bg-black/55 px-3 py-1.5 text-center backdrop-blur-sm sm:py-2">
                    <p className="font-sora text-[11px] font-medium tracking-wide text-amber-200/90 sm:text-xs">Your stake</p>
                    <p className="font-jetbrains text-base font-bold text-white sm:text-lg">
                      {currentFarmDisplay}{" "}
                      <span className="font-sora text-sm font-semibold text-white/70">{STAKE_TOKEN}</span>
                    </p>
                    {withdrawLock && withdrawLock.stakedBalance > 0n ? (
                      withdrawCountdown > 0 ? (
                        <p className="mt-0.5 font-sora text-[10px] text-amber-200/90">
                          Timelock{" "}
                          <span className="font-jetbrains font-semibold tabular-nums">
                            {formatDurationCountdown(withdrawCountdown)}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-0.5 font-sora text-[10px] text-emerald-300/90">
                          Ready to withdraw
                        </p>
                      )
                    ) : (
                      <p className="mt-0.5 font-sora text-[10px] text-white/50">
                        {loadingWithdrawLock
                          ? "Checking timelock…"
                          : "Timelock starts after your last deposit"}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border/50 theme-input-surface px-3 py-2 text-center lg:py-1.5">
                    <p className="font-sora text-[10px] text-muted-foreground">Full unstake</p>
                    <p className="font-jetbrains text-sm font-semibold text-foreground">
                      {currentFarmDisplay} {STAKE_TOKEN}
                    </p>
                  </div>
                  <Button
                    className={cn(
                      "h-11 w-full rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground shadow-lg sm:text-base lg:h-10",
                      !canWithdrawNow && "opacity-40 grayscale hover:opacity-40",
                    )}
                    disabled={!canWithdrawNow || withdrawStep !== "idle"}
                    onClick={() => {
                      void handleWithdrawNow();
                    }}
                  >
                    {withdrawStep !== "idle" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {withdrawStep === "withdrawing" ? "Withdrawing…" : "Checking…"}
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4" />
                        Withdraw Now
                      </>
                    )}
                  </Button>
                </div>
              </ActionColumn>

              <ActionColumn
                title="Harvest"
                subtitle="Claim · Epic glory"
                background={tier.art.harvest}
                delay={0.35}
              >
                <div className="space-y-2 lg:space-y-1.5">
                  <div className="rounded-xl border border-white/20 bg-black/55 px-3 py-1.5 backdrop-blur-sm sm:py-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowRewardPicker((v) => !v)}
                        disabled={claimableStreams.length === 0}
                        className="flex w-full items-center justify-between gap-2 text-left disabled:opacity-60"
                      >
                        <div>
                          <p className="font-sora text-[11px] font-medium tracking-wide text-emerald-200/90 sm:text-xs">
                            Claimable · {selectedRewardData?.symbol ?? "—"}
                          </p>
                          <p className="font-jetbrains text-base font-bold text-white sm:text-lg">
                            {loadingClaimables && !selectedRewardData ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                …
                              </span>
                            ) : (
                              <>
                                {selectedRewardData?.claimableDisplay ?? "0"}{" "}
                                <span className="font-sora text-sm font-semibold text-white/70">
                                  {selectedRewardData?.symbol ?? ""}
                                </span>
                              </>
                            )}
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
                        {showRewardPicker && claimableStreams.length > 0 && (
                          <motion.ul
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-48 overflow-y-auto rounded-xl border border-border/60 theme-surface-elevated shadow-xl"
                          >
                            {claimableStreams.map((r) => (
                              <li key={r.address}>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-sora text-sm text-foreground hover:bg-muted/50"
                                  onClick={() => {
                                    setSelectedRewardAddress(r.address);
                                    setShowRewardPicker(false);
                                  }}
                                >
                                  <span className="min-w-0 font-medium">
                                    {r.symbol}
                                    {r.isRetainedUnsubscribed ? (
                                      <span className="ml-1.5 font-sora text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                        prior
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="shrink-0 font-jetbrains text-success">
                                    {r.claimableDisplay}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                    <p className="mt-1 font-sora text-[10px] text-white/50">
                      {claimableStreams.length === 0
                        ? "Subscribe while farming to unlock streams"
                        : rewardSnapshot?.hasActiveStake
                          ? `${claimableStreams.length} stream${claimableStreams.length === 1 ? "" : "s"} · era math (active stake)${
                              (rewardSnapshot?.retainedUnsubscribed?.length ?? 0) > 0
                                ? ` · ${rewardSnapshot!.retainedUnsubscribed.length} prior to claim`
                                : ""
                            }`
                          : `${claimableStreams.length} stream${claimableStreams.length === 1 ? "" : "s"} · stake to accrue eras${
                              (rewardSnapshot?.retainedUnsubscribed?.length ?? 0) > 0
                                ? ` · ${rewardSnapshot!.retainedUnsubscribed.length} prior to claim`
                                : ""
                            }`}
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <Button
                      className="h-11 flex-1 rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground shadow-lg hover:opacity-90 sm:text-base lg:h-10"
                      disabled={
                        claimStep === "claiming" ||
                        isFarming ||
                        claimableStreams.length === 0
                      }
                      onClick={() => openClaimDialog(false)}
                    >
                      {claimStep === "claiming" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Claiming…
                        </>
                      ) : (
                        <>
                          <Leaf className="h-4 w-4" />
                          Harvest Now
                        </>
                      )}
                    </Button>
                  </div>
                  <button
                    type="button"
                    disabled={
                      claimStep === "claiming" ||
                      isFarming ||
                      claimableStreams.length === 0
                    }
                    onClick={() => {
                      void handleHarvestAll();
                    }}
                    className="w-full rounded-lg bg-white/10 py-1.5 font-sora text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 lg:py-1"
                  >
                    Harvest all streams
                  </button>
                </div>
              </ActionColumn>
            </div>
          </section>
        </div>

      </main>

      {/* Claim rewards — select streams (name, symbol, amount) then claim(address[]) */}
      <Dialog
        open={claimDialogOpen}
        onOpenChange={(open) => {
          if (claimStep === "claiming") return;
          setClaimDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md border-border/60 theme-surface-elevated font-sora sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl">Claim rewards</DialogTitle>
            <DialogDescription className="font-sora text-sm text-muted-foreground">
              Choose which reward streams to harvest. Amounts are estimated with the same
              era math the Harvester runs on claim — final on-chain accounting settles at
              transaction time. Streams you left after a subscription change stay here
              until their unclaimed rewards are harvested.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[min(50vh,360px)] pr-3">
            <ul className="space-y-2">
              {claimableStreams.map((stream) => {
                const checked = claimSelection.some(
                  (a) => normalizeAddr(a) === normalizeAddr(stream.address),
                );
                return (
                  <li key={stream.address}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                        checked
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/50 theme-surface hover:border-border",
                        stream.isRetainedUnsubscribed &&
                          "border-amber-500/40 bg-amber-500/5",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleClaimToken(stream.address)}
                        disabled={claimStep === "claiming"}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-sora text-sm font-semibold text-foreground">
                            {stream.name}
                          </p>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-orbitron text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {stream.symbol}
                          </span>
                        </div>
                        <p className="mt-0.5 font-jetbrains text-sm font-semibold text-success">
                          {stream.claimableDisplay}{" "}
                          <span className="font-sora text-xs font-medium text-muted-foreground">
                            {stream.symbol}
                          </span>
                          <span className="ml-1 font-sora text-[10px] font-medium text-muted-foreground/80">
                            est.
                          </span>
                        </p>
                        {stream.isRetainedUnsubscribed ? (
                          <p className="mt-0.5 font-sora text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            Prior subscription · claim remaining rewards
                          </p>
                        ) : null}
                        {stream.eraMathApplied && stream.erasProcessed > 0 ? (
                          <p className="mt-0.5 font-sora text-[10px] text-muted-foreground">
                            {stream.erasProcessed} era
                            {stream.erasProcessed === 1 ? "" : "s"} · ERA{" "}
                            {stream.eraAtBlock.toString()}→
                            {stream.simulatedCurrentERA.toString()}
                          </p>
                        ) : !stream.eraMathApplied ? (
                          <p className="mt-0.5 font-sora text-[10px] text-muted-foreground">
                            Stored bucket only · stake to accrue new eras
                          </p>
                        ) : null}
                        {stream.isClaimLocked ? (
                          <p className="mt-0.5 font-sora text-[10px] text-amber-600 dark:text-amber-400">
                            Per-token claim timelock may skip this stream
                          </p>
                        ) : null}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="font-sora text-xs font-semibold text-primary hover:underline"
              disabled={claimStep === "claiming"}
              onClick={() =>
                setClaimSelection(claimableStreams.map((s) => s.address))
              }
            >
              Select all
            </button>
            <button
              type="button"
              className="font-sora text-xs font-semibold text-muted-foreground hover:underline"
              disabled={claimStep === "claiming"}
              onClick={() => setClaimSelection([])}
            >
              Clear
            </button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={claimStep === "claiming"}
              onClick={() => setClaimDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={claimStep === "claiming" || claimSelection.length === 0}
              onClick={() => {
                void handleHarvestSelected();
              }}
            >
              {claimStep === "claiming" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Claiming…
                </>
              ) : (
                <>
                  <Leaf className="h-4 w-4" />
                  Claim selected ({claimSelection.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Harvested claim history — userTotalClaimHistory + paginated getUserClaims */}
      <Dialog open={claimHistoryOpen} onOpenChange={setClaimHistoryOpen}>
        <DialogContent className="max-w-md border-border/60 theme-surface-elevated font-sora sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl">Claim history</DialogTitle>
            <DialogDescription className="font-sora text-sm text-muted-foreground">
              Your harvest claims on this network, newest first. Shown{" "}
              {HARVESTER_CLAIMS_PAGE_SIZE} at a time; chain reads load up to{" "}
              {HARVESTER_CLAIMS_MAX_BATCH} claims per call so paging stays fast.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            <div>
              <p className="font-sora text-[11px] font-medium tracking-wide text-amber-700 dark:text-amber-300">
                Total claims
              </p>
              <p className="font-jetbrains text-lg font-bold text-foreground">
                {loadingClaimHistory && harvestedCount === null
                  ? "…"
                  : String(harvestedCount ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-sora text-[11px] text-muted-foreground">Page</p>
              <p className="font-jetbrains text-sm font-semibold text-foreground">
                {claimHistoryPageCount > 0
                  ? `${claimHistoryPage + 1} / ${claimHistoryPageCount}`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 theme-surface overflow-hidden">
            {loadingClaimHistory ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
                <p className="font-sora text-sm text-muted-foreground">Loading claims…</p>
              </div>
            ) : claimHistoryRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <Leaf className="h-8 w-8 text-muted-foreground/60" />
                <p className="font-sora text-sm font-medium text-foreground">No claims yet</p>
                <p className="font-sora text-xs text-muted-foreground max-w-xs">
                  Harvest reward streams while farming and your history will show up here.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[min(48vh,360px)]">
                <ul className="divide-y divide-border/50">
                  {claimHistoryRows.map((row, index) => (
                    <li
                      key={`${row.timestamp}-${row.token}-${row.amount}-${index}`}
                      className="flex items-start justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-sora text-sm font-semibold text-foreground">
                          {row.name}
                        </p>
                        <p className="font-sora text-[11px] text-muted-foreground">
                          {formatClaimWhen(row.timestamp)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-jetbrains text-sm font-bold text-amber-600 dark:text-amber-300">
                          +{row.displayAmount}{" "}
                          <span className="font-sora text-xs font-semibold text-muted-foreground">
                            {row.symbol}
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                loadingClaimHistory || claimHistoryPage <= 0 || claimHistoryPageCount <= 1
              }
              onClick={() => setClaimHistoryPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Newer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingClaimHistory}
              onClick={() => {
                void refreshClaimHistoryPage(claimHistoryPage, {
                  forceRefresh: true,
                });
              }}
            >
              {loadingClaimHistory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                loadingClaimHistory ||
                claimHistoryPageCount <= 1 ||
                claimHistoryPage >= claimHistoryPageCount - 1
              }
              onClick={() =>
                setClaimHistoryPage((p) =>
                  claimHistoryPageCount > 0
                    ? Math.min(claimHistoryPageCount - 1, p + 1)
                    : p,
                )
              }
            >
              Older
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owned NFT detail — large preview + revenue streams + switch tier */}
      <Dialog
        open={nftDialogOpen}
        onOpenChange={(open) => {
          setNftDialogOpen(open);
          if (!open) setSelectedNft(null);
        }}
      >
        <DialogContent className="max-w-md border-border/60 theme-surface-elevated font-sora sm:max-w-lg">
          {selectedNft && (() => {
            const nftTier = getTierByContractName(selectedNft.TIER);
            const tokenId = selectedNft.ID.toString();
            const streams = Number(selectedNft.LISTS);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-cinzel text-xl">
                    {nftTier.title}
                  </DialogTitle>
                  <DialogDescription className="font-sora text-sm text-muted-foreground">
                    {nftTier.tagline}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div
                    className="relative overflow-hidden rounded-xl border-2 border-border/60 shadow-lg"
                    style={{ boxShadow: `0 0 32px ${nftTier.glow}` }}
                  >
                    <img
                      src={nftTier.art.nft}
                      alt={`${nftTier.title} NFT #${tokenId}`}
                      className="aspect-square w-full object-cover object-top sm:aspect-[5/4]"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2.5 pt-10">
                      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                        Token #{tokenId} · {selectedNft.TIER}
                      </p>
                      <p className="font-cinzel text-lg font-bold text-white drop-shadow">
                        {nftTier.title}
                      </p>
                    </div>
                    {selectedNft.BLACKLIST && (
                      <div className="absolute left-2 top-2 rounded-full border border-destructive/60 bg-destructive/90 px-2 py-0.5 font-orbitron text-[9px] font-bold uppercase tracking-wider text-destructive-foreground">
                        Blacklisted
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-background/60 p-3 font-jetbrains text-xs">
                    <div>
                      <p className="font-sora text-[10px] uppercase tracking-wide text-muted-foreground">
                        Contract tier
                      </p>
                      <p className="font-semibold text-foreground">{selectedNft.TIER}</p>
                    </div>
                    <div>
                      <p className="font-sora text-[10px] uppercase tracking-wide text-muted-foreground">
                        Token ID
                      </p>
                      <p className="font-semibold text-foreground">#{tokenId}</p>
                    </div>
                    <div>
                      <p className="font-sora text-[10px] uppercase tracking-wide text-muted-foreground">
                        Revenue streams
                      </p>
                      <p className="font-semibold text-foreground">
                        {streams} list{streams === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div>
                      <p className="font-sora text-[10px] uppercase tracking-wide text-muted-foreground">
                        Multiplier
                      </p>
                      <p className="font-semibold text-foreground">{nftTier.multiplier}×</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-sora text-[10px] uppercase tracking-wide text-muted-foreground">
                        Income access
                      </p>
                      <p className="mt-0.5 font-sora text-xs leading-relaxed text-foreground">
                        This pass unlocks up to{" "}
                        <span className="font-jetbrains font-semibold">{streams}</span> concurrent
                        reward streams on the Harvester. Higher tiers allow more simultaneous income
                        subscriptions.
                      </p>
                    </div>
                    {selectedNft.BLACKLIST && (
                      <div className="col-span-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-2 font-sora text-xs text-destructive">
                        This NFT is blacklisted and cannot grant farm access until cleared.
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-stretch">
                  {(() => {
                    const already = isAlreadyDesignated(selectedNft);
                    const blocked = selectedNft.BLACKLIST;
                    const giftDisabled =
                      already || !account || !poaLive || isGifting;
                    return (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={giftDisabled}
                          className={cn(
                            "w-full rounded-xl font-orbitron text-sm font-bold tracking-wide sm:flex-1",
                            already || !account || !poaLive
                              ? "cursor-not-allowed border-border/40 bg-muted text-muted-foreground opacity-60 hover:bg-muted"
                              : "border-border/60",
                          )}
                          onClick={openGiftDialog}
                        >
                          <Gift className="mr-2 h-4 w-4" />
                          {already ? "Can't gift this NFT" : "Gift this NFT"}
                        </Button>
                        <Button
                          type="button"
                          disabled={already || blocked}
                          className={cn(
                            "w-full rounded-xl font-orbitron text-sm font-bold tracking-wide sm:flex-1",
                            already || blocked
                              ? "cursor-not-allowed bg-muted text-muted-foreground opacity-60 hover:bg-muted"
                              : "bg-primary text-primary-foreground hover:opacity-90",
                          )}
                          onClick={switchToNftTier}
                        >
                          {blocked
                            ? "Blacklisted"
                            : already
                              ? "You're already on this Tier"
                              : "Choose this Tier"}
                        </Button>
                      </>
                    );
                  })()}
                </DialogFooter>
              </>
            );
          })()}
          {!selectedNft && (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <ImageOff className="h-8 w-8" />
              <p className="text-sm">No NFT selected</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Gift NFT — transferFrom to any address */}
      <AlertDialog
        open={giftDialogOpen}
        onOpenChange={(open) => {
          if (isGifting || giftStep === "sending") return;
          setGiftDialogOpen(open);
          if (!open) {
            setGiftRecipient("");
            setGiftStep("idle");
          }
        }}
      >
        <AlertDialogContent className="max-w-md border-border/60 theme-surface-elevated font-sora">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cinzel text-xl">
              Gift this NFT
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                {selectedNft ? (
                  <>
                    <p>
                      Send{" "}
                      <span className="font-semibold text-foreground">
                        {getTierByContractName(selectedNft.TIER).title}
                      </span>{" "}
                      token{" "}
                      <span className="font-jetbrains font-semibold text-foreground">
                        #{selectedNft.ID.toString()}
                      </span>{" "}
                      to another wallet via ERC-721{" "}
                      <span className="font-jetbrains text-xs">transferFrom</span>.
                      This cannot be undone from the app.
                    </p>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="gift-recipient"
                        className="font-sora text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Recipient address
                      </label>
                      <Input
                        id="gift-recipient"
                        value={giftRecipient}
                        onChange={(e) => setGiftRecipient(e.target.value)}
                        placeholder="0x…"
                        disabled={isGifting || giftStep === "sending"}
                        spellCheck={false}
                        autoComplete="off"
                        className="font-jetbrains text-sm"
                      />
                      {giftRecipient.trim().length > 0 &&
                        !isValidAddress(giftRecipient) && (
                          <p className="text-xs text-destructive">
                            Enter a valid 0x address (40 hex characters).
                          </p>
                        )}
                      {isValidAddress(giftRecipient) &&
                        account &&
                        normalizeAddr(giftRecipient) ===
                          normalizeAddr(account.address) && (
                          <p className="text-xs text-destructive">
                            That is your own wallet — pick a different address.
                          </p>
                        )}
                    </div>
                    {designatedNftId !== null &&
                      designatedNftId === selectedNft.ID && (
                        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300">
                          This is your designated tier pass. After gifting, the app
                          will switch to your highest remaining NFT, or standard
                          access (1 stream) if the basket is empty.
                        </p>
                      )}
                  </>
                ) : (
                  <p>No NFT selected.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGifting || giftStep === "sending"}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !selectedNft ||
                !account ||
                !poaLive ||
                isGifting ||
                giftStep === "sending" ||
                !isValidAddress(giftRecipient) ||
                (account != null &&
                  normalizeAddr(giftRecipient) === normalizeAddr(account.address))
              }
              onClick={(e) => {
                e.preventDefault();
                void confirmGiftNft();
              }}
              className="bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground"
            >
              {isGifting || giftStep === "sending" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Confirm gift
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mint confirmation — gas + PENNY approval transparency */}
      <AlertDialog
        open={mintDialogOpen}
        onOpenChange={(open) => {
          if (isMinting) return;
          setMintDialogOpen(open);
          if (!open) {
            setMintReadiness(null);
            setMintStep("idle");
          }
        }}
      >
        <AlertDialogContent className="max-w-md border-border/60 theme-surface-elevated font-sora">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cinzel text-xl">
              Mint {tier.title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  This mints a{" "}
                  <span className="font-semibold text-foreground">
                    {tier.title} ({tier.contractName})
                  </span>{" "}
                  Proof of Access NFT via{" "}
                  <span className="font-jetbrains text-xs">mint({tierId})</span> on{" "}
                  {selectedNetwork.name}.
                </p>

                {loadingReadiness && (
                  <p className="flex items-center gap-2 text-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking balances and gas…
                  </p>
                )}

                {mintReadiness && (
                  <>
                    <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/60 p-3 font-jetbrains text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">PENNY to burn</span>
                        <span className="font-semibold text-foreground">
                          {formatPennyDisplay(
                            mintReadiness.config.burnAmount,
                            mintReadiness.pennyDecimals,
                          )}{" "}
                          PENNY
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Your PENNY</span>
                        <span
                          className={cn(
                            "font-semibold",
                            mintReadiness.hasEnoughPenny ? "text-success" : "text-destructive",
                          )}
                        >
                          {formatPennyDisplay(
                            mintReadiness.pennyBalance,
                            mintReadiness.pennyDecimals,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Mint fee</span>
                        <span className="font-semibold text-foreground">
                          {formatEther(mintReadiness.config.mintFee)} {selectedNetwork.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Est. gas reserve</span>
                        <span className="font-semibold text-foreground">
                          ~{formatEther(mintReadiness.ethGasReserve)} {selectedNetwork.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-border/40 pt-1.5">
                        <span className="text-muted-foreground">Your {selectedNetwork.symbol}</span>
                        <span
                          className={cn(
                            "font-semibold",
                            mintReadiness.hasEnoughGas ? "text-success" : "text-destructive",
                          )}
                        >
                          {formatEther(mintReadiness.ethBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Streams unlocked</span>
                        <span className="font-semibold text-foreground">{tier.lists}</span>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
                      <p className="flex items-start gap-2 font-sora">
                        <Fuel className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>
                          You need enough{" "}
                          <strong>{selectedNetwork.symbol}</strong> for the mint fee plus gas for
                          {mintReadiness.needsApproval
                            ? " two wallet popups (approve + mint)"
                            : " the mint transaction"}
                          . Keep a little extra so the txs don&apos;t fail.
                        </span>
                      </p>
                      {mintReadiness.needsApproval ? (
                        <p className="flex items-start gap-2 font-sora">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span>
                            First you&apos;ll <strong>approve</strong> the ProofOfAccess contract to
                            spend{" "}
                            <strong>
                              {formatPennyDisplay(
                                mintReadiness.config.burnAmount,
                                mintReadiness.pennyDecimals,
                              )}{" "}
                              PENNY
                            </strong>
                            . Those tokens are burned to mint this tier. Confirm the amount in your
                            wallet carefully.
                          </span>
                        </p>
                      ) : (
                        <p className="flex items-start gap-2 font-sora text-success">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            PENNY allowance is already set for this burn amount — only the mint
                            transaction is needed.
                          </span>
                        </p>
                      )}
                    </div>

                    {!mintReadiness.hasEnoughPenny && (
                      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        Not enough PENNY in this wallet for the selected tier burn.
                      </p>
                    )}
                    {!mintReadiness.hasEnoughGas && (
                      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        Not enough {selectedNetwork.symbol} for fee + gas. Add more and try again.
                      </p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMinting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isMinting ||
                loadingReadiness ||
                !mintReadiness?.canMint ||
                mintStep !== "idle"
              }
              onClick={(e) => {
                e.preventDefault();
                void confirmMint();
              }}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {isMinting || mintStep !== "idle" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mintStep === "approving"
                    ? "Approving…"
                    : mintStep === "minting"
                      ? "Minting…"
                      : "Working…"}
                </span>
              ) : mintReadiness?.needsApproval ? (
                "Approve & Mint"
              ) : (
                "Confirm Mint"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reward stream subscription + farm confirm */}
      <Dialog
        open={subDialogOpen}
        onOpenChange={(open) => {
          if (isFarming) return;
          setSubDialogOpen(open);
          if (!open) {
            setStreamSearch("");
            setCustomTokenInput("");
            if (subDialogMode === "farm" && farmStep === "idle") {
              setFarmStatus("Ready to farm PENNY");
            }
          }
        }}
      >
        <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden border-border/60 p-0 theme-surface-elevated font-sora sm:max-w-xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border/50 px-4 pb-3 pt-4 sm:px-5">
            <DialogTitle className="font-cinzel text-xl">
              {subDialogMode === "farm" ? "Farm PENNY · Streams" : "Reward streams"}
            </DialogTitle>
            <DialogDescription className="font-sora text-sm text-muted-foreground">
              Choose up to{" "}
              <span className="font-jetbrains font-semibold text-foreground">{maxStreams}</span>{" "}
              revenue stream{maxStreams === 1 ? "" : "s"}
              {ownedNfts.filter((n) => !n.BLACKLIST).length === 0
                ? " (standard access — no NFT, limit is 1)."
                : designatedNftId !== null
                  ? ` unlocked by designated NFT #${designatedNftId.toString()}.`
                  : " unlocked by your designated NFT."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
            {/* Search + custom address */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={streamSearch}
                  onChange={(e) => setStreamSearch(e.target.value)}
                  placeholder="Search name or paste 0x address…"
                  className="h-10 rounded-xl border-border/50 pl-9 font-sora text-sm"
                />
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  placeholder="Custom token contract address"
                  className="h-9 flex-1 rounded-xl border-border/50 font-jetbrains text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 shrink-0 rounded-xl"
                  onClick={addCustomToken}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* Selection chips */}
            <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-orbitron text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Your list · {selectedStreams.length}/{maxStreams}
                </p>
                {selectedStreams.length > 0 && (
                  <button
                    type="button"
                    className="font-sora text-[10px] font-semibold text-muted-foreground hover:text-destructive"
                    onClick={() => setSelectedStreams([])}
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedStreams.length === 0 ? (
                <p className="font-sora text-xs text-muted-foreground">
                  No streams selected yet
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedStreams.map((addr) => (
                    <button
                      key={addr}
                      type="button"
                      onClick={() => toggleStream(addr)}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-sora text-[11px] font-semibold text-foreground transition hover:bg-destructive/15"
                      title={addr}
                    >
                      <span className="truncate">
                        {resolveRewardTokenLabel(selectedNetwork.chainId, addr)}
                      </span>
                      <X className="h-3 w-3 shrink-0 opacity-70" />
                    </button>
                  ))}
                </div>
              )}
              {liveSubscriptions.length > 0 && (
                <p className="mt-2 font-sora text-[10px] text-muted-foreground">
                  On-chain now:{" "}
                  {liveSubscriptions
                    .map((a) => resolveRewardTokenLabel(selectedNetwork.chainId, a))
                    .join(", ")}
                </p>
              )}
            </div>

            {/* Farm readiness summary */}
            {subDialogMode === "farm" && (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed">
                {loadingFarmReadiness && (
                  <p className="flex items-center gap-2 text-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking balances and gas…
                  </p>
                )}
                {farmReadiness && (
                  <>
                    <div className="space-y-1 font-jetbrains text-[11px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Deposit</span>
                        <span className="font-semibold text-foreground">
                          {formatPennyDisplay(
                            farmReadiness.depositAmount,
                            farmReadiness.pennyDecimals,
                          )}{" "}
                          PENNY
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Pre-approved</span>
                        <span
                          className={cn(
                            "font-semibold",
                            farmReadiness.allowance >= farmReadiness.depositAmount
                              ? "text-success"
                              : "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {formatPennyDisplay(
                            farmReadiness.allowance,
                            farmReadiness.pennyDecimals,
                          )}{" "}
                          PENNY
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Your PENNY</span>
                        <span
                          className={cn(
                            "font-semibold",
                            farmReadiness.hasEnoughPenny ? "text-success" : "text-destructive",
                          )}
                        >
                          {formatPennyDisplay(
                            farmReadiness.pennyBalance,
                            farmReadiness.pennyDecimals,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Your {selectedNetwork.symbol}</span>
                        <span
                          className={cn(
                            "font-semibold",
                            farmReadiness.hasEnoughGas ? "text-success" : "text-destructive",
                          )}
                        >
                          {formatEther(farmReadiness.ethBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Wallet steps</span>
                        <span className="font-semibold text-foreground">
                          {farmPlan?.stepLabels.join(" → ") ?? "deposit"}
                        </span>
                      </div>
                    </div>
                    <p className="flex items-start gap-2 font-sora text-foreground">
                      <Fuel className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        You need enough <strong>{selectedNetwork.symbol}</strong> for{" "}
                        <strong>{farmPlan?.stepLabels.join(" → ") || "deposit"}</strong>
                        . Changing streams always adds a subscribe confirm. Extra pre-approval is
                        fine — we skip approve when allowance covers the deposit.
                      </span>
                    </p>
                    {farmPlan?.needsApproval ? (
                      <p className="flex items-start gap-2 font-sora text-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>
                          You&apos;ll <strong>approve</strong> Harvester for at least the deposit
                          amount
                          {farmPlan.needsSubscribe ? ", then subscribe, " : ", "}
                          then deposit. Approving more than needed is OK for future farms.
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-start gap-2 font-sora text-success">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Pre-approved{" "}
                          <strong>
                            {formatPennyDisplay(
                              farmReadiness.allowance,
                              farmReadiness.pennyDecimals,
                            )}{" "}
                            PENNY
                          </strong>{" "}
                          — pre-approve to skip.
                          {farmPlan?.needsSubscribe
                            ? " Stream list changed: subscribe then deposit."
                            : " Deposit only."}
                        </span>
                      </p>
                    )}
                    {farmPlan?.needsSubscribe && (
                      <p className="flex items-start gap-2 font-sora text-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>
                          Since reward streams differ from your on-chain list — a{" "}
                          <strong>subscribeToStream</strong> confirmation is included before deposit.
                        </span>
                      </p>
                    )}
                    {!farmReadiness.hasEnoughPenny && (
                      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                        Not enough PENNY in this wallet for the amount you entered.
                      </p>
                    )}
                    {!farmReadiness.hasEnoughGas && (
                      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                        Not enough {selectedNetwork.symbol} for gas. Add more and try again.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Categorized whitelist */}
            <ScrollArea className="h-[min(36vh,280px)] rounded-xl border border-border/50">
              <div className="space-y-3 p-2.5">
                {CATEGORY_ORDER.map((cat) => {
                  const list = filteredCategories[cat];
                  if (!list?.length) return null;
                  return (
                    <div key={cat}>
                      <p className="mb-1.5 px-1 font-orbitron text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      <ul className="space-y-1">
                        {list.map((token) => {
                          const checked = selectedStreams.some(
                            (a) => normalizeAddr(a) === normalizeAddr(token.address),
                          );
                          const wasFormer = liveSubscriptions.some(
                            (a) => normalizeAddr(a) === normalizeAddr(token.address),
                          );
                          return (
                            <li key={token.address}>
                              <label
                                className={cn(
                                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition",
                                  checked
                                    ? "border-primary/50 bg-primary/10"
                                    : "border-border/40 bg-background/40 hover:bg-muted/40",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleStream(token.address)}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-sora text-sm font-semibold text-foreground">
                                    {token.name}
                                    {wasFormer && (
                                      <span className="ml-1.5 font-jetbrains text-[10px] font-normal text-primary">
                                        active
                                      </span>
                                    )}
                                  </p>
                                  <p className="truncate font-jetbrains text-[10px] text-muted-foreground">
                                    {shortTokenLabel(token.address)}
                                  </p>
                                </div>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
                {Object.keys(filteredCategories).length === 0 && (
                  <p className="px-2 py-6 text-center font-sora text-xs text-muted-foreground">
                    {streamSearch.trim()
                      ? "No whitelist match — paste a custom 0x address above."
                      : "No whitelisted tokens on this network yet. Paste a custom address."}
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/50 px-4 py-3 sm:px-5 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={isFarming}
              onClick={() => setSubDialogOpen(false)}
            >
              Cancel
            </Button>
            {subDialogMode === "farm" ? (
              <Button
                type="button"
                className="rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground"
                disabled={
                  isFarming ||
                  loadingFarmReadiness ||
                  !farmReadiness?.canDeposit ||
                  selectedStreams.length === 0 ||
                  selectedStreams.length > maxStreams ||
                  farmStep !== "idle"
                }
                onClick={() => {
                  void confirmFarmDeposit();
                }}
              >
                {isFarming || farmStep !== "idle" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {farmStep === "approving"
                      ? "Approving…"
                      : farmStep === "subscribing"
                        ? "Subscribing…"
                        : farmStep === "depositing"
                          ? "Depositing…"
                          : "Working…"}
                  </span>
                ) : (
                  farmPlan?.ctaLabel ?? "Confirm Deposit"
                )}
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-xl bg-primary font-orbitron text-sm font-bold tracking-wide text-primary-foreground"
                disabled={
                  isFarming ||
                  selectedStreams.length === 0 ||
                  selectedStreams.length > maxStreams ||
                  farmStep !== "idle"
                }
                onClick={() => {
                  void confirmManageSubscriptions();
                }}
              >
                {isFarming || farmStep === "subscribing" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating…
                  </span>
                ) : (
                  "Update Streams"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
