import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Brain, MessageCircle, History, ChevronDown, Copy, Check, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { truncateAddress } from "@/tools/utils";
import { useLanguageStore } from "@/store/languageStore";
import { t } from "@/tools/languages";
import { toast } from "sonner";

export function ProfileDropdown() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const selectedLanguage = useLanguageStore((state) => state.selectedLanguage);
  const [isOpen, setIsOpen] = useState(false);
  const [didCopyAddress, setDidCopyAddress] = useState(false);

  const handleCopyAddress = async () => {
    if (!account?.address) return;

    try {
      await navigator.clipboard.writeText(account.address);
      setDidCopyAddress(true);
      setTimeout(() => setDidCopyAddress(false), 1500);
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast.error("Failed to copy address");
    }
  };

  const handleDisconnect = async () => {
    if (!activeWallet) return;

    try {
      await disconnect(activeWallet);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  const menuItems = [
    {
      label: t(selectedLanguage, "myThots.title"),
      description: t(selectedLanguage, "myThots.subtitle"),
      icon: Brain,
      path: "/my-thots",
      gradient: "from-primary to-secondary",
    },
    {
      label: t(selectedLanguage, "yourThots.title"),
      description: t(selectedLanguage, "yourThots.subtitle"),
      icon: MessageCircle,
      path: "/your-thots",
      gradient: "from-secondary to-accent",
    },
    {
      label: t(selectedLanguage, "history.title"),
      description: t(selectedLanguage, "history.subtitle"),
      icon: History,
      path: "/history",
      gradient: "from-accent to-primary",
    },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative flex items-center gap-2 rounded-xl border px-4 py-2.5 font-outfit font-medium text-foreground transition-all theme-surface theme-surface-hover"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 ring-2 ring-primary/30">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="hidden sm:inline font-syne font-semibold">{t(selectedLanguage, "profileMenu.profile")}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </motion.button>
      </DropdownMenuTrigger>

      <AnimatePresence>
        {isOpen && (
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-72 rounded-2xl border p-2 theme-surface-elevated"
            asChild
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {/* Header */}
              <DropdownMenuLabel className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-syne font-bold text-foreground">{t(selectedLanguage, "profileMenu.profile")}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {account ? truncateAddress(account.address) : t(selectedLanguage, "profileMenu.notConnected")}
                      </span>
                      {account?.address && (
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Copy wallet address"
                        >
                          {didCopyAddress ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border/30 my-1" />

              {/* Menu Items */}
              <div className="space-y-1 py-1">
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="group/item cursor-pointer rounded-xl p-0 focus:bg-transparent"
                  >
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-primary/5"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} opacity-80 transition-all group-hover/item:opacity-100 group-hover/item:scale-110`}>
                        <item.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-syne font-semibold text-foreground group-hover/item:text-primary transition-colors">
                          {item.label}
                        </span>
                        <span className="font-outfit text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </motion.div>
                  </DropdownMenuItem>
                ))}
              </div>

              <DropdownMenuSeparator className="bg-border/30 my-1" />

              <DropdownMenuItem
                onClick={handleDisconnect}
                disabled={!activeWallet}
                className="group/item cursor-pointer rounded-xl p-0 focus:bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <motion.div
                  whileHover={{ x: 4 }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-destructive/80 to-destructive opacity-80 transition-all group-hover/item:opacity-100 group-hover/item:scale-110">
                    <LogOut className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-syne font-semibold text-foreground group-hover/item:text-primary transition-colors">
                      {t(selectedLanguage, "profileMenu.disconnect")}
                    </span>
                  </div>
                </motion.div>
              </DropdownMenuItem>
            </motion.div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
