/** ProofOfAccess NFT tiers — indices match on-chain mint(uint256 _tierLevel) 0..5 */

export type TierId = 0 | 1 | 2 | 3 | 4 | 5;

export interface StakingTier {
  id: TierId;
  /** On-chain TierByName */
  contractName: string;
  /** Fantasy display title for GameFi UI */
  title: string;
  tagline: string;
  /** On-chain TierByLadder list weight (from contract defaults) */
  lists: number;
  /** PENNY burn multiplier (from contract defaults) */
  multiplier: number;
  accent: string;
  glow: string;
  /** Public asset paths under /staking/tiers/{id}-{slug}/ */
  art: {
    nft: string;
    farm: string;
    withdraw: string;
    harvest: string;
  };
}

const tierArt = (id: number, slug: string) => ({
  nft: `/staking/tiers/${id}-${slug}/nft.jpg`,
  farm: `/staking/tiers/${id}-${slug}/farm.jpg`,
  withdraw: `/staking/tiers/${id}-${slug}/withdraw.jpg`,
  harvest: `/staking/tiers/${id}-${slug}/harvest.jpg`,
});

/** Six tiers matching ProofOfAccess.sol TierByName / multipliers / TierByLadder */
export const STAKING_TIERS: StakingTier[] = [
  {
    id: 0,
    contractName: "Marble",
    title: "Deckhand",
    tagline: "Humble marble servant of the fleet",
    lists: 2,
    multiplier: 1,
    accent: "from-slate-300 to-stone-500",
    glow: "rgba(203,213,225,0.45)",
    art: tierArt(0, "marble"),
  },
  {
    id: 1,
    contractName: "Bronze",
    title: "Pirate",
    tagline: "Storm-born bronze freebooter",
    lists: 4,
    multiplier: 2,
    accent: "from-amber-600 to-orange-800",
    glow: "rgba(217,119,6,0.5)",
    art: tierArt(1, "bronze"),
  },
  {
    id: 2,
    contractName: "Silver",
    title: "Corsair",
    tagline: "Moonlit silver captain of the deep",
    lists: 8,
    multiplier: 4,
    accent: "from-slate-200 to-sky-500",
    glow: "rgba(148,163,184,0.55)",
    art: tierArt(2, "silver"),
  },
  {
    id: 3,
    contractName: "Gold",
    title: "Admiral",
    tagline: "Gilded privateer of the golden armada",
    lists: 12,
    multiplier: 8,
    accent: "from-yellow-300 to-amber-600",
    glow: "rgba(251,191,36,0.55)",
    art: tierArt(3, "gold"),
  },
  {
    id: 4,
    contractName: "Platinum",
    title: "Dragonlord",
    tagline: "Ice-scale rider of the platinum wyrm",
    lists: 15,
    multiplier: 16,
    accent: "from-cyan-200 to-indigo-500",
    glow: "rgba(103,232,249,0.5)",
    art: tierArt(4, "platinum"),
  },
  {
    id: 5,
    contractName: "Emerald",
    title: "Emperor",
    tagline: "Sovereign of emerald dragons",
    lists: 20,
    multiplier: 32,
    accent: "from-emerald-300 to-green-700",
    glow: "rgba(52,211,153,0.55)",
    art: tierArt(5, "emerald"),
  },
];

export function getTier(id: number): StakingTier {
  return STAKING_TIERS[Math.max(0, Math.min(5, id))] ?? STAKING_TIERS[0];
}

/** Format PENNY burn display using 6 decimals (contract requiredAmount uses 10**6) */
export function formatPennyBurn(requiredAmount: bigint, multiplier: number): string {
  const burn = requiredAmount * BigInt(multiplier);
  const whole = burn / 1_000_000n;
  return whole.toLocaleString();
}
