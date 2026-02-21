import { chains } from "@/tools/networkData";

type ThemeMode = "light" | "dark";

type NetworkThemePalette = {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  ring?: string;
};

type NetworkThemeConfig = {
  useLegacyTheme?: boolean;
  light: NetworkThemePalette;
  dark: NetworkThemePalette;
};

const BNB_CHAIN_ID = 56;
const OPBNB_CHAIN_ID = 204;
const BASE_CHAIN_ID = 8453;
const SCROLL_CHAIN_ID = 534352;
const MANTA_CHAIN_ID = 169;
const SEPOLIA_CHAIN_ID = 11155111;

const DEFAULT_NETWORK_THEME: NetworkThemeConfig = {
  useLegacyTheme: true,
  light: {
    primary: "#1A2F4C",
    accent: "#2C6DA3",
    background: "#F1F4F8",
    foreground: "#121A24",
  },
  dark: {
    primary: "#F3CA5E",
    accent: "#4CC9B3",
    background: "#090A0C",
    foreground: "#F6F4EC",
  },
};

export const NETWORK_THEMES: Record<number, NetworkThemeConfig> = {
  [SEPOLIA_CHAIN_ID]: {
    light: {
      primary: "#E0F0FF",
      accent: "#0F2A4A",
      background: "#EEF5FF",
      foreground: "#0F2A4A",
      ring: "#4D9FFF",
    },
    dark: {
      primary: "#4D9FFF",
      accent: "#C4E0FF",
      background: "#0A0B0D",
      foreground: "#FFFFFF",
    },
  },
  [BNB_CHAIN_ID]: {
    ...DEFAULT_NETWORK_THEME,
    useLegacyTheme: true,
  },
  [BASE_CHAIN_ID]: {
    light: {
      primary: "#E6F0FF",
      accent: "#001F3F",
      background: "#F4F8FF",
      foreground: "#001F3F",
      ring: "#3C8AFF",
    },
    dark: {
      primary: "#0000FF",
      accent: "#3C8AFF",
      background: "#0A0B0D",
      foreground: "#FFFFFF",
    },
  },
  [SCROLL_CHAIN_ID]: {
    light: {
      primary: "#FAF4E8",
      accent: "#00332E",
      background: "#FDF9F2",
      foreground: "#2C2C2C",
      ring: "#D8BA8A",
    },
    dark: {
      primary: "#FFF0DD",
      accent: "#F5E8C7",
      background: "#111111",
      foreground: "#FFF8EE",
    },
  },
  [MANTA_CHAIN_ID]: {
    light: {
      primary: "#B0FFF0",
      accent: "#1A2A4C",
      background: "#EEFDF9",
      foreground: "#1A2A4C",
      ring: "#00E5CC",
    },
    dark: {
      primary: "#00E5CC",
      accent: "#5BA8FF",
      background: "#0F0F1A",
      foreground: "#E9F5FF",
    },
  },
  [OPBNB_CHAIN_ID]: {
    ...DEFAULT_NETWORK_THEME,
    useLegacyTheme: true,
  },
};

const CHAIN_COUNT = chains.length;

export const NETWORK_LIGHT_BACKGROUND_IMAGES: string[] = Array(CHAIN_COUNT).fill("");
export const NETWORK_DARK_BACKGROUND_IMAGES: string[] = Array(CHAIN_COUNT).fill("");

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

const getThemeConfig = (chainId: number): NetworkThemeConfig =>
  NETWORK_THEMES[chainId] ?? DEFAULT_NETWORK_THEME;

const getBackgroundImage = (chainId: number, mode: ThemeMode): string => {
  const chainIndex = chains.findIndex((chain) => chain.chainId === chainId);
  if (chainIndex < 0) return "";
  const image = mode === "light" ? NETWORK_LIGHT_BACKGROUND_IMAGES[chainIndex] : NETWORK_DARK_BACKGROUND_IMAGES[chainIndex];
  return image?.trim() ?? "";
};

const unsetThemeOverrides = (root: HTMLElement) => {
  root.style.removeProperty("--background");
  root.style.removeProperty("--foreground");
  root.style.removeProperty("--primary");
  root.style.removeProperty("--accent");
  root.style.removeProperty("--ring");
};

export const applyNetworkTheme = (chainId: number, mode: ThemeMode) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const config = getThemeConfig(chainId);
  const palette = config[mode];

  if (config.useLegacyTheme) {
    unsetThemeOverrides(root);
  } else {
    root.style.setProperty("--background", hexToHslChannels(palette.background));
    root.style.setProperty("--foreground", hexToHslChannels(palette.foreground));
    root.style.setProperty("--primary", hexToHslChannels(palette.primary));
    root.style.setProperty("--accent", hexToHslChannels(palette.accent));
    root.style.setProperty("--ring", hexToHslChannels(palette.ring ?? palette.primary));
  }

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

  root.style.setProperty(
    "--network-light-bg-color",
    hexToHslChannels(config.light.background),
  );
  root.style.setProperty(
    "--network-dark-bg-color",
    hexToHslChannels(config.dark.background),
  );
};
