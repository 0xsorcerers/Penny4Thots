import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Connector } from "@/tools/utils";
import { useActiveAccount } from "thirdweb/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface GetStartedPageProps {
  onGetStarted?: () => void;
}

export function GetStartedPage({ onGetStarted }: GetStartedPageProps) {
  const account = useActiveAccount();
  const navigate = useNavigate();

  // Redirect to main app when connected
  useEffect(() => {
    if (account) {
      if (onGetStarted) {
        onGetStarted();
      }
      navigate("/app");
    }
  }, [account, navigate, onGetStarted]);
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        {/* Primary glow orb */}
        <motion.div
          className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Accent glow orb */}
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-accent/15 blur-[100px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        {/* Third decorative orb */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Floating geometric shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[10%] top-[20%] h-4 w-4 rotate-45 border-2 border-primary/30"
          animate={{ y: [-20, 20, -20], rotate: [45, 90, 45] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[15%] top-[30%] h-3 w-3 rounded-full bg-accent/40"
          animate={{ y: [0, -30, 0], x: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className="absolute bottom-[25%] left-[20%] h-6 w-6 border-2 border-accent/20"
          style={{ borderRadius: "30% 70% 70% 30%/30% 30% 70% 70%" }}
          animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-[35%] right-[25%] h-2 w-2 rounded-full bg-primary/50"
          animate={{ y: [0, 25, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute right-[10%] top-[60%] h-5 w-5 rotate-12 border border-primary/25"
          animate={{ rotate: [12, 180, 12], y: [-10, 10, -10] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm text-primary">Next Generation Prediction Market</span>
          </div>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <div className="relative mx-auto h-24 w-24 sm:h-32 sm:w-32">
            <img
              src="/logo-white-no-bkg.webp"
              alt="Penny4Thots Logo"
              className="h-full w-full object-contain drop-shadow-lg"
            />
            <div className="absolute -inset-4 -z-10 rounded-full bg-primary/20 blur-2xl" />
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-6 text-center font-syne text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
        >
          <span className="block text-foreground">Penny4</span>
          <span
            className="block animate-shimmer-sweep bg-clip-text text-transparent"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--primary)) 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            Thots
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12 max-w-xl text-center font-outfit text-xl text-muted-foreground sm:text-2xl"
        >
          <span className="italic text-foreground/90">"If you can think it, it's important."</span>
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-12 flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: TrendingUp, label: "Trade Predictions" },
            { icon: Zap, label: "Real-time Markets" },
            { icon: Sparkles, label: "Any Topic" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2 backdrop-blur-sm"
            >
              <item.icon className="h-4 w-4 text-accent" />
              <span className="font-outfit text-sm text-foreground/80">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="relative"
        >
          {/* Glow behind button */}
          <div className="pointer-events-none absolute -inset-4 rounded-full bg-primary/20 blur-xl" />
          <Connector />
        </motion.div>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          Connect your wallet to get started
        </motion.p>

        {/* Decorative bottom line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="absolute bottom-12 h-px w-48 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
      </div>
    </div>
  );
}
