import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Brain, MessageCircle, History, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveAccount } from "thirdweb/react";
import { truncateAddress } from "@/tools/utils";

export function ProfileDropdown() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: "My Thots",
      description: "Markets you created",
      icon: Brain,
      path: "/my-thots",
      gradient: "from-primary to-secondary",
    },
    {
      label: "Your Thots",
      description: "Markets you voted on",
      icon: MessageCircle,
      path: "/your-thots",
      gradient: "from-secondary to-accent",
    },
    {
      label: "History",
      description: "Your claim history",
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
          className="group relative flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur-xl border border-white/60 px-4 py-2.5 font-outfit font-medium text-foreground shadow-[0_2px_12px_-2px_hsl(220_30%_15%/0.08)] transition-all hover:border-primary/30 hover:bg-white/80 hover:shadow-[0_4px_20px_-4px_hsl(220_30%_15%/0.12)] dark:bg-card/80 dark:backdrop-blur-sm dark:border-border/50 dark:shadow-none dark:hover:bg-card dark:hover:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 ring-2 ring-primary/30">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="hidden sm:inline font-syne font-semibold">Your Profile</span>
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
            className="w-72 rounded-2xl border-white/60 bg-white/90 backdrop-blur-xl p-2 shadow-[0_8px_40px_-12px_hsl(220_30%_15%/0.2)] dark:border-border/50 dark:bg-card/95 dark:shadow-2xl"
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
                    <span className="font-syne font-bold text-foreground">Your Profile</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {account ? truncateAddress(account.address) : "Not connected"}
                    </span>
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
            </motion.div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
