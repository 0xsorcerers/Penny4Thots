"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, ChevronDown, Globe, Languages } from "lucide-react";
import { Connector } from "../../tools/utils";
import { chains } from "../../tools/networkData";
import { availableLanguages, type LanguageCode, languageNativeNames } from "../../tools/languages";
import { useState, useEffect } from "react";
import { useNetworkStore } from "@/store/networkStore";
import { useLanguageStore } from "@/store/languageStore";
import { useMarketStore } from "@/store/marketStore";

interface HeaderProps {
  onConnect?: () => void;
  isConnected?: boolean;
  onNetworkChange?: () => void;
}

export function Header({ onConnect, isConnected = false, onNetworkChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { selectedNetwork, setSelectedNetwork } = useNetworkStore();
  const { selectedLanguage, setSelectedLanguage } = useLanguageStore();
  const { clearAllMarkets } = useMarketStore();
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const handleNetworkChange = (newNetwork: typeof chains[0]) => {
    setSelectedNetwork(newNetwork);
    // Clear markets on network switch so new data is fetched
    clearAllMarkets();
    setIsChainDropdownOpen(false);
    // Notify parent component if needed
    onNetworkChange?.();
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    setIsLanguageDropdownOpen(false);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed left-0 right-0 top-0 z-50 border-b theme-surface"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2 sm:px-4 lg:px-8">
        {/* Logo */}
        <motion.div
          className="flex max-w-[30%] items-center gap-2 sm:gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-yellow-600/30 to-cyan-600/30 p-1">
              <img
                src="/logo-white-no-bkg.webp"
                alt="Penny4Thots Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="absolute -inset-1 -z-10 rounded-xl bg-gradient-to-br from-yellow-600/60 to-cyan-600/60 opacity-50 blur-sm" />
          </div>
          <span className="hidden sm:inline-block font-syne text-xl font-bold tracking-tight text-foreground truncate">
            Penny4Thots
          </span>
        </motion.div>

        {/* Right side buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3">

          {/* Language Selector */}
          <div className="relative">
            <Button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              variant="ghost"
              size="sm"
              className="group flex items-center gap-2 rounded-full px-2 sm:px-3 py-1.5 text-xs font-light italic transition-all duration-200 hover:bg-muted/50"
            >
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline-block theme-option-a-gradient-text animate-shimmer-sweep">
                {selectedLanguage}
              </span>
              <ChevronDown
                className={`h-3 w-3.5 text-muted-foreground transition-transform duration-200 ${
                  isLanguageDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>

            <AnimatePresence>
              {isLanguageDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 overflow-hidden rounded-lg border bg-background/95 backdrop-blur-xl shadow-lg dark:shadow-xl"
                >
                  <div className="py-1">
                    {availableLanguages.map((lang) => (
                      <motion.button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
                        className={`w-full px-3 py-2 text-left text-xs font-light italic transition-colors ${
                          selectedLanguage === lang
                            ? "text-foreground bg-muted/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="inline-block theme-option-a-gradient-text animate-shimmer-sweep">
                          {languageNativeNames[lang]}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Blockchain Selector */}
          <div className="relative">
            <Button
              onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
              variant="ghost"
              size="sm"
              className="group flex items-center gap-2 rounded-full px-2 sm:px-3 py-1.5 text-xs font-light italic transition-all duration-200 hover:bg-muted/50"
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline-block theme-option-a-gradient-text animate-shimmer-sweep">
                {selectedNetwork.name}
              </span>
              <ChevronDown
                className={`h-3 w-3.5 text-muted-foreground transition-transform duration-200 ${
                  isChainDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>

            <AnimatePresence>
              {isChainDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 min-w-[140px] overflow-hidden rounded-lg border bg-background/95 backdrop-blur-xl shadow-lg dark:shadow-xl"
                >
                  <div className="py-1">
                    {chains.map((chain) => (
                      <motion.button
                        key={chain.chainId}
                        onClick={() => handleNetworkChange(chain)}
                        whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
                        className={`w-full px-3 py-2 text-left text-xs font-light italic transition-colors ${
                          selectedNetwork.chainId === chain.chainId
                            ? "text-foreground bg-muted/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="inline-block theme-option-a-gradient-text animate-shimmer-sweep">
                          {chain.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <Button
            onClick={toggleTheme}
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          {/* Connect Button */}
          <div className="scale-[0.8] sm:scale-100 origin-right">
            <Connector />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
