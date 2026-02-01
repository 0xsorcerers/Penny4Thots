"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";
import { Connector } from "../../tools/utils";

interface HeaderProps {
  onConnect?: () => void;
  isConnected?: boolean;
}

export function Header({ onConnect, isConnected = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-1">
              <img
                src="/white-on-background.png"
                alt="Penny4Thots Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="absolute -inset-1 -z-10 rounded-xl bg-gradient-to-br from-primary/50 to-accent/50 opacity-50 blur-sm" />
          </div>
          <span className="font-syne text-xl font-bold tracking-tight text-foreground">
            Penny4Thots
          </span>
        </motion.div>

        {/* Right side buttons */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            onClick={toggleTheme}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Connect Button */}
          {/* <Button
            onClick={onConnect}
            variant={isConnected ? "secondary" : "default"}
            className="group relative overflow-hidden rounded-full font-outfit"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {isConnected ? "Connected" : "Connect"}
            </span>
            {!isConnected && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-0 transition-opacity group-hover:opacity-30"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </Button> */}
          <Connector />
        </div>
      </div>
    </motion.header>
  );
}
