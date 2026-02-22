import { chains } from "@/tools/networkData";

type ThemeMode = "light" | "dark";

type ThemeTokenMap = Partial<Record<ThemeToken, string>>;

type NetworkThemeModeConfig = {
  tokens: ThemeTokenMap;
};

type NetworkThemeConfig = {
  useLegacyTheme?: boolean;
  light: NetworkThemeModeConfig;
  dark: NetworkThemeModeConfig;
};

type ThemeToken =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "destructive-foreground"
  | "success"
  | "success-foreground"
  | "border"
  | "input"
  | "ring"
  | "yes"
  | "yes-foreground"
  | "no"
  | "no-foreground"
  | "sidebar-background"
  | "sidebar-foreground"
  | "sidebar-primary"
  | "sidebar-primary-foreground"
  | "sidebar-accent"
  | "sidebar-accent-foreground"
  | "sidebar-border"
  | "sidebar-ring"
  | "chalk"
  | "status-critical"
  | "status-urgent"
  | "status-warning"
  | "status-normal"
  | "status-inactive"
  | "modal-silver"
  | "modal-sky-blue"
  | "modal-bright-blue"
  | "surface-base"
  | "surface-border"
  | "surface-hover"
  | "surface-shadow"
  | "surface-highlight";

const THEME_TOKEN_KEYS: ThemeToken[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "success-foreground",
  "border",
  "input",
  "ring",
  "yes",
  "yes-foreground",
  "no",
  "no-foreground",
  "sidebar-background",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "chalk",
  "status-critical",
  "status-urgent",
  "status-warning",
  "status-normal",
  "status-inactive",
  "modal-silver",
  "modal-sky-blue",
  "modal-bright-blue",
  "surface-base",
  "surface-border",
  "surface-hover",
  "surface-shadow",
  "surface-highlight",
];

const BNB_CHAIN_ID = 56;
const OPBNB_CHAIN_ID = 204;
const BASE_CHAIN_ID = 8453;
const SCROLL_CHAIN_ID = 534352;
const MANTA_CHAIN_ID = 169;
const SEPOLIA_CHAIN_ID = 11155111;

const BASE_LIGHT_TOKENS: Record<ThemeToken, string> = {
  background: "220 20% 95%",
  foreground: "222 47% 11%",
  card: "38 25% 85%",
  "card-foreground": "222 47% 11%",
  popover: "0 0% 100%",
  "popover-foreground": "222 47% 11%",
  primary: "217 28% 19%",
  "primary-foreground": "0 0% 100%",
  secondary: "220 14% 93%",
  "secondary-foreground": "222 47% 11%",
  muted: "220 14% 90%",
  "muted-foreground": "220 9% 38%",
  accent: "42 92% 38%",
  "accent-foreground": "0 0% 100%",
  destructive: "0 84% 50%",
  "destructive-foreground": "0 0% 100%",
  success: "45 92% 42%",
  "success-foreground": "0 0% 100%",
  border: "220 13% 85%",
  input: "220 14% 92%",
  ring: "217 28% 19%",
  yes: "45 96% 42%",
  "yes-foreground": "0 0% 100%",
  no: "0 84% 50%",
  "no-foreground": "0 0% 100%",
  "sidebar-background": "220 14% 94%",
  "sidebar-foreground": "222 47% 11%",
  "sidebar-primary": "217 28% 19%",
  "sidebar-primary-foreground": "0 0% 100%",
  "sidebar-accent": "220 14% 90%",
  "sidebar-accent-foreground": "222 47% 11%",
  "sidebar-border": "220 13% 85%",
  "sidebar-ring": "217 28% 19%",
  chalk: "222 47% 11%",
  "status-critical": "0 84% 50%",
  "status-urgent": "42 92% 38%",
  "status-warning": "32 95% 40%",
  "status-normal": "45 92% 42%",
  "status-inactive": "217 28% 19%",
  "modal-silver": "220 13% 70%",
  "modal-sky-blue": "210 100% 50%",
  "modal-bright-blue": "210 100% 47%",
  "surface-base": "42 100% 96%",
  "surface-border": "48 96% 89%",
  "surface-hover": "42 100% 94%",
  "surface-shadow": "220 30% 15%",
  "surface-highlight": "38 25% 85%",
};

const BASE_DARK_TOKENS: Record<ThemeToken, string> = {
  background: "220 20% 3%",
  foreground: "60 10% 95%",
  card: "220 15% 8%",
  "card-foreground": "60 10% 95%",
  popover: "220 15% 10%",
  "popover-foreground": "60 10% 95%",
  primary: "45 100% 55%",
  "primary-foreground": "220 20% 3%",
  secondary: "220 15% 15%",
  "secondary-foreground": "60 10% 95%",
  muted: "220 15% 12%",
  "muted-foreground": "220 10% 50%",
  accent: "45 100% 55%",
  "accent-foreground": "220 20% 3%",
  destructive: "0 75% 55%",
  "destructive-foreground": "60 10% 95%",
  success: "43 95% 56%",
  "success-foreground": "220 20% 3%",
  border: "220 15% 18%",
  input: "220 15% 12%",
  ring: "45 100% 55%",
  yes: "43 95% 56%",
  "yes-foreground": "220 20% 3%",
  no: "0 80% 55%",
  "no-foreground": "60 10% 95%",
  "sidebar-background": "220 15% 6%",
  "sidebar-foreground": "60 10% 95%",
  "sidebar-primary": "45 100% 55%",
  "sidebar-primary-foreground": "220 20% 3%",
  "sidebar-accent": "220 15% 12%",
  "sidebar-accent-foreground": "60 10% 95%",
  "sidebar-border": "220 15% 18%",
  "sidebar-ring": "45 100% 55%",
  chalk: "60 10% 95%",
  "status-critical": "0 80% 55%",
  "status-urgent": "45 100% 55%",
  "status-warning": "38 92% 58%",
  "status-normal": "43 95% 56%",
  "status-inactive": "220 10% 50%",
  "modal-silver": "220 10% 68%",
  "modal-sky-blue": "210 100% 62%",
  "modal-bright-blue": "210 100% 58%",
  "surface-base": "220 15% 8%",
  "surface-border": "220 15% 18%",
  "surface-hover": "220 15% 12%",
  "surface-shadow": "220 30% 1%",
  "surface-highlight": "220 15% 22%",
};

// Keep BNB/opBNB exactly aligned with current app theme.
const LEGACY_BNB_THEME: NetworkThemeConfig = {
  useLegacyTheme: true,
  light: { tokens: {} },
  dark: { tokens: {} },
};

export const NETWORK_THEMES: Record<number, NetworkThemeConfig> = {
  [SEPOLIA_CHAIN_ID]: {
    light: {
      tokens: {
        background: "#EAF3FF",
        foreground: "#0F2A4A",
        card: "#F3F8FF",
        "card-foreground": "#0F2A4A",
        primary: "#E0F0FF",
        "primary-foreground": "#0F2A4A",
        secondary: "#D9E9FF",
        "secondary-foreground": "#16365B",
        muted: "#E6F1FF",
        "muted-foreground": "#355272",
        accent: "#4D9FFF",
        "accent-foreground": "#FFFFFF",
        border: "#C5DDFD",
        input: "#DCEBFF",
        ring: "#4D9FFF",
        "sidebar-background": "#EDF5FF",
        "sidebar-primary": "#0F2A4A",
        "sidebar-ring": "#4D9FFF",
        chalk: "#0F2A4A",
        "status-urgent": "#4D9FFF",
        "status-normal": "#3B7EFF",
        "modal-sky-blue": "#4D9FFF",
        "modal-bright-blue": "#3B7EFF",
        "surface-base": "#E0F0FF",
        "surface-border": "#C5DDFD",
        "surface-hover": "#DCEBFF",
        "surface-shadow": "#0F2A4A",
        "surface-highlight": "#EAF3FF",
      },
    },
    dark: {
      tokens: {
        background: "#0A0B0D",
        foreground: "#FFFFFF",
        card: "#111820",
        "card-foreground": "#EAF4FF",
        primary: "#4D9FFF",
        "primary-foreground": "#03101F",
        secondary: "#101A24",
        "secondary-foreground": "#DCEAFF",
        muted: "#111722",
        "muted-foreground": "#9AB4D3",
        accent: "#80BDFF",
        "accent-foreground": "#03101F",
        border: "#1D2B3A",
        input: "#111C28",
        ring: "#4D9FFF",
        "sidebar-background": "#0C1119",
        "sidebar-primary": "#4D9FFF",
        "sidebar-primary-foreground": "#03101F",
        "sidebar-accent": "#121E2B",
        "sidebar-border": "#1B2A39",
        "sidebar-ring": "#4D9FFF",
        chalk: "#F3F8FF",
        "status-urgent": "#4D9FFF",
        "status-normal": "#80BDFF",
        "modal-sky-blue": "#4D9FFF",
        "modal-bright-blue": "#80BDFF",
        "surface-base": "#111820",
        "surface-border": "#1D2B3A",
        "surface-hover": "#121E2B",
        "surface-shadow": "#04090F",
        "surface-highlight": "#203248",
      },
    },
  },
  [BNB_CHAIN_ID]: LEGACY_BNB_THEME,
  [BASE_CHAIN_ID]: {
    light: {
      tokens: {
        background: "#F4F7FF",
        foreground: "#001F3F",
        card: "#EEF4FF",
        "card-foreground": "#001F3F",
        primary: "#E6F0FF",
        "primary-foreground": "#001F3F",
        secondary: "#DFE9FC",
        "secondary-foreground": "#0B2C52",
        muted: "#E6EEFF",
        "muted-foreground": "#3A5370",
        accent: "#001F3F",
        "accent-foreground": "#EAF3FF",
        border: "#C8D8FF",
        input: "#DFE9FF",
        ring: "#3C8AFF",
        yes: "#2962FF",
        no: "#FF4C6A",
        "sidebar-background": "#F0F5FF",
        "sidebar-primary": "#001F3F",
        "sidebar-primary-foreground": "#EAF3FF",
        "sidebar-accent": "#E2EBFF",
        "sidebar-ring": "#3C8AFF",
        chalk: "#001F3F",
        "status-urgent": "#3C8AFF",
        "status-normal": "#3C8AFF",
        "status-inactive": "#001F3F",
        "modal-silver": "#9FB9E3",
        "modal-sky-blue": "#3C8AFF",
        "modal-bright-blue": "#0000FF",
        "surface-base": "#E6F0FF",
        "surface-border": "#C8D8FF",
        "surface-hover": "#DFE9FF",
        "surface-shadow": "#001F3F",
        "surface-highlight": "#EAF3FF",
      },
    },
    dark: {
      tokens: {
        background: "#0A0B0D",
        foreground: "#FFFFFF",
        card: "#11131A",
        "card-foreground": "#F7FBFF",
        primary: "#0000FF",
        "primary-foreground": "#FFFFFF",
        secondary: "#141923",
        "secondary-foreground": "#D9E7FF",
        muted: "#111722",
        "muted-foreground": "#A8B8D1",
        accent: "#3C8AFF",
        "accent-foreground": "#041027",
        border: "#1E2636",
        input: "#141C2A",
        ring: "#3C8AFF",
        yes: "#3C8AFF",
        no: "#FF5B77",
        "sidebar-background": "#0C1018",
        "sidebar-primary": "#0000FF",
        "sidebar-primary-foreground": "#FFFFFF",
        "sidebar-accent": "#161E2B",
        "sidebar-ring": "#3C8AFF",
        chalk: "#F3F8FF",
        "status-urgent": "#3C8AFF",
        "status-normal": "#3C8AFF",
        "status-inactive": "#8EA2C2",
        "modal-silver": "#7F91AD",
        "modal-sky-blue": "#3C8AFF",
        "modal-bright-blue": "#0000FF",
        "surface-base": "#11131A",
        "surface-border": "#1E2636",
        "surface-hover": "#141C2A",
        "surface-shadow": "#05070D",
        "surface-highlight": "#222B3B",
      },
    },
  },
  [SCROLL_CHAIN_ID]: {
    light: {
      tokens: {
        background: "#FCF7EE",
        foreground: "#2C2C2C",
        card: "#FAF4E8",
        "card-foreground": "#2C2C2C",
        primary: "#FAF4E8",
        "primary-foreground": "#2C2C2C",
        secondary: "#F4EADA",
        "secondary-foreground": "#3B3B3B",
        muted: "#F8EFE2",
        "muted-foreground": "#655D52",
        accent: "#00332E",
        "accent-foreground": "#F8F3EA",
        border: "#E5D6BF",
        input: "#F3EBDD",
        ring: "#D8BA8A",
        yes: "#2E7D63",
        no: "#C4514F",
        "sidebar-background": "#F9F1E5",
        "sidebar-primary": "#00332E",
        "sidebar-primary-foreground": "#F8F3EA",
        "sidebar-accent": "#F4E9D8",
        "sidebar-ring": "#D8BA8A",
        chalk: "#2C2C2C",
        "status-urgent": "#A96A2D",
        "status-normal": "#00332E",
        "status-inactive": "#655D52",
        "modal-silver": "#B7A58A",
        "modal-sky-blue": "#CFA36A",
        "modal-bright-blue": "#A47745",
        "surface-base": "#FAF4E8",
        "surface-border": "#E5D6BF",
        "surface-hover": "#F3EBDD",
        "surface-shadow": "#2C2C2C",
        "surface-highlight": "#FFF5E7",
      },
    },
    dark: {
      tokens: {
        background: "#111111",
        foreground: "#FFF0DD",
        card: "#1A1A1A",
        "card-foreground": "#FFF0DD",
        primary: "#FFF0DD",
        "primary-foreground": "#1A1A1A",
        secondary: "#23211E",
        "secondary-foreground": "#F2E5D4",
        muted: "#1E1C1A",
        "muted-foreground": "#BDAE98",
        accent: "#F5E8C7",
        "accent-foreground": "#2D2A24",
        border: "#2E2A25",
        input: "#22201D",
        ring: "#FFF0DD",
        yes: "#85D2B1",
        no: "#FF847A",
        "sidebar-background": "#151412",
        "sidebar-primary": "#FFF0DD",
        "sidebar-primary-foreground": "#1A1A1A",
        "sidebar-accent": "#24211E",
        "sidebar-ring": "#FFF0DD",
        chalk: "#FFF0DD",
        "status-urgent": "#F5E8C7",
        "status-normal": "#B2DCC8",
        "status-inactive": "#BDAE98",
        "modal-silver": "#9D927F",
        "modal-sky-blue": "#E9D3A9",
        "modal-bright-blue": "#FFF0DD",
        "surface-base": "#1A1A1A",
        "surface-border": "#2E2A25",
        "surface-hover": "#24211E",
        "surface-shadow": "#070605",
        "surface-highlight": "#36312B",
      },
    },
  },
  [MANTA_CHAIN_ID]: {
    light: {
      tokens: {
        background: "#EEFDF9",
        foreground: "#1A2A4C",
        card: "#E3FBF4",
        "card-foreground": "#1A2A4C",
        primary: "#B0FFF0",
        "primary-foreground": "#1A2A4C",
        secondary: "#D8F6EE",
        "secondary-foreground": "#203762",
        muted: "#DFF8F2",
        "muted-foreground": "#4A6387",
        accent: "#1A2A4C",
        "accent-foreground": "#E8F7FF",
        border: "#BFE9DF",
        input: "#D7F5EE",
        ring: "#00E5CC",
        yes: "#00BFA6",
        no: "#D5568B",
        "sidebar-background": "#EAFBF7",
        "sidebar-primary": "#1A2A4C",
        "sidebar-primary-foreground": "#E8F7FF",
        "sidebar-accent": "#D4F5ED",
        "sidebar-ring": "#00E5CC",
        chalk: "#1A2A4C",
        "status-urgent": "#00E5CC",
        "status-normal": "#2A74D6",
        "status-inactive": "#425A81",
        "modal-silver": "#90B9C1",
        "modal-sky-blue": "#2EA7E0",
        "modal-bright-blue": "#00E5CC",
        "surface-base": "#E3FBF4",
        "surface-border": "#BFE9DF",
        "surface-hover": "#D7F5EE",
        "surface-shadow": "#1A2A4C",
        "surface-highlight": "#ECFFF9",
      },
    },
    dark: {
      tokens: {
        background: "#0F0F1A",
        foreground: "#E9F5FF",
        card: "#151A28",
        "card-foreground": "#E9F5FF",
        primary: "#00E5CC",
        "primary-foreground": "#041B19",
        secondary: "#1A2233",
        "secondary-foreground": "#D7EAFF",
        muted: "#141C2B",
        "muted-foreground": "#93A9C6",
        accent: "#5BA8FF",
        "accent-foreground": "#051A33",
        border: "#243047",
        input: "#1A2537",
        ring: "#00E5CC",
        yes: "#00E5CC",
        no: "#F56AAE",
        "sidebar-background": "#121827",
        "sidebar-primary": "#00E5CC",
        "sidebar-primary-foreground": "#041B19",
        "sidebar-accent": "#1A2336",
        "sidebar-ring": "#00E5CC",
        chalk: "#E9F5FF",
        "status-urgent": "#00E5CC",
        "status-normal": "#5BA8FF",
        "status-inactive": "#93A9C6",
        "modal-silver": "#7D92B2",
        "modal-sky-blue": "#5BA8FF",
        "modal-bright-blue": "#00E5CC",
        "surface-base": "#151A28",
        "surface-border": "#243047",
        "surface-hover": "#1A2233",
        "surface-shadow": "#05070F",
        "surface-highlight": "#2B3652",
      },
    },
  },
  [OPBNB_CHAIN_ID]: LEGACY_BNB_THEME,
};

const CHAIN_COUNT = chains.length;

// Put your per-network floral backgrounds here, by chain index.
export const NETWORK_LIGHT_BACKGROUND_IMAGES: string[] = [
  "/assets/images/lightblue-flora.webp",
  "/assets/images/light-flora.webp",
  "/assets/images/lightblue-flora.webp",
  "/assets/images/light-flora.webp",
  "/assets/images/seagreen-flora.webp",
  "/assets/images/light-flora.webp",
];

export const NETWORK_DARK_BACKGROUND_IMAGES: string[] = [
  "/assets/images/blue-flora.webp",
  "/assets/images/dark-flora.webp",
  "/assets/images/blue-flora.webp",
  "/assets/images/dark-flora.webp",
  "/assets/images/oceanblue-flora.webp",
  "/assets/images/dark-flora.webp",
];

const hexToHslChannels = (hexColor: string): string => {
  const hex = hexColor.replace("#", "").trim();
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((ch) => `${ch}${ch}`)
          .join("")
      : hex;

  if (normalized.length !== 6) return "220 20% 95%";

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const toHslChannels = (value: string): string =>
  value.trim().startsWith("#") ? hexToHslChannels(value) : value.trim();

const getThemeConfig = (chainId: number): NetworkThemeConfig =>
  NETWORK_THEMES[chainId] ?? LEGACY_BNB_THEME;

const getBackgroundImage = (chainId: number, mode: ThemeMode): string => {
  const chainIndex = chains.findIndex((chain) => chain.chainId === chainId);
  if (chainIndex < 0) return "";
  const image =
    mode === "light"
      ? NETWORK_LIGHT_BACKGROUND_IMAGES[chainIndex]
      : NETWORK_DARK_BACKGROUND_IMAGES[chainIndex];
  return image?.trim() ?? "";
};

const unsetThemeOverrides = (root: HTMLElement) => {
  THEME_TOKEN_KEYS.forEach((token) => {
    root.style.removeProperty(`--${token}`);
  });
};

const getModeTokens = (config: NetworkThemeConfig, mode: ThemeMode): Record<ThemeToken, string> => {
  const base = mode === "light" ? BASE_LIGHT_TOKENS : BASE_DARK_TOKENS;
  const overrides = config[mode].tokens;
  const merged = { ...base };

  (Object.keys(overrides) as ThemeToken[]).forEach((key) => {
    const value = overrides[key];
    if (value) merged[key] = toHslChannels(value);
  });

  return merged;
};

export const applyNetworkTheme = (chainId: number, mode: ThemeMode) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const config = getThemeConfig(chainId);

  if (config.useLegacyTheme) {
    unsetThemeOverrides(root);
  } else {
    const modeTokens = getModeTokens(config, mode);
    THEME_TOKEN_KEYS.forEach((token) => {
      root.style.setProperty(`--${token}`, modeTokens[token]);
    });
  }

  const lightTokens = getModeTokens(config, "light");
  const darkTokens = getModeTokens(config, "dark");

  const lightBackground = getBackgroundImage(chainId, "light");
  const darkBackground = getBackgroundImage(chainId, "dark");

  if (lightBackground) {
    root.style.setProperty("--network-bg-image-light", `url('${lightBackground}')`);
  } else {
    root.style.removeProperty("--network-bg-image-light");
  }

  if (darkBackground) {
    root.style.setProperty("--network-bg-image-dark", `url('${darkBackground}')`);
  } else {
    root.style.removeProperty("--network-bg-image-dark");
  }

  root.style.setProperty("--network-light-bg-color", lightTokens.background);
  root.style.setProperty("--network-dark-bg-color", darkTokens.background);
};
