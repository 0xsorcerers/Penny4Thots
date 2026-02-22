import { useState, useEffect } from "react";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "penny4thots-theme-change";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: theme }));
  }, [theme]);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<Theme>).detail;
      if (nextTheme !== "light" && nextTheme !== "dark") return;
      setTheme((prev) => (prev === nextTheme ? prev : nextTheme));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const nextTheme = event.newValue as Theme | null;
      if (nextTheme !== "light" && nextTheme !== "dark") return;
      setTheme((prev) => (prev === nextTheme ? prev : nextTheme));
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, setTheme, toggleTheme };
}
