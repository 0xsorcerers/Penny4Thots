import { motion, useMotionValue, useTransform } from "framer-motion";
import { Sparkles, TrendingUp, Zap, Brain, Coins, Users } from "lucide-react";
import { Connector } from "@/tools/utils";
import { useActiveAccount } from "thirdweb/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const account = useActiveAccount();
  const navigate = useNavigate();

  // Redirect to main app when connected
  useEffect(() => {
    if (account) {
      navigate("/app");
    }
  }, [account, navigate]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Animated mesh gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.08),transparent_40%)]" />
      </div>

      {/* 3D Floating cubes */}
      <div className="pointer-events-none absolute inset-0 [perspective:1000px]">
        {/* Large rotating cube */}
        <motion.div
          className="absolute left-[10%] top-[20%]"
          style={{
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="relative h-16 w-16" style={{ transformStyle: "preserve-3d" }}>
            <div className="absolute inset-0 border-2 border-primary/20 bg-primary/5 backdrop-blur-sm" style={{ transform: "translateZ(32px)" }} />
            <div className="absolute inset-0 border-2 border-primary/20 bg-primary/5 backdrop-blur-sm" style={{ transform: "rotateY(180deg) translateZ(32px)" }} />
            <div className="absolute inset-0 border-2 border-primary/20 bg-primary/5 backdrop-blur-sm" style={{ transform: "rotateY(90deg) translateZ(32px)" }} />
            <div className="absolute inset-0 border-2 border-primary/20 bg-primary/5 backdrop-blur-sm" style={{ transform: "rotateY(-90deg) translateZ(32px)" }} />
            <div className="absolute inset-0 border-2 border-primary/20 bg-primary/5 backdrop-blur-sm" style={{ transform: "rotateX(90deg) translateZ(32px)" }} />
            <div className="absolute inset-0 border-2 border-primary/20 bg-primary/5 backdrop-blur-sm" style={{ transform: "rotateX(-90deg) translateZ(32px)" }} />
          </div>
        </motion.div>

        {/* Medium rotating cube */}
        <motion.div
          className="absolute right-[15%] top-[35%]"
          style={{
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateX: [360, 0],
            rotateY: [0, 360],
            rotateZ: [0, 180],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="relative h-12 w-12" style={{ transformStyle: "preserve-3d" }}>
            <div className="absolute inset-0 border border-accent/30 bg-accent/5 backdrop-blur-sm" style={{ transform: "translateZ(24px)" }} />
            <div className="absolute inset-0 border border-accent/30 bg-accent/5 backdrop-blur-sm" style={{ transform: "rotateY(180deg) translateZ(24px)" }} />
            <div className="absolute inset-0 border border-accent/30 bg-accent/5 backdrop-blur-sm" style={{ transform: "rotateY(90deg) translateZ(24px)" }} />
            <div className="absolute inset-0 border border-accent/30 bg-accent/5 backdrop-blur-sm" style={{ transform: "rotateY(-90deg) translateZ(24px)" }} />
          </div>
        </motion.div>

        {/* Small floating cube */}
        <motion.div
          className="absolute bottom-[30%] left-[20%]"
          style={{
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateX: [0, 180, 360],
            rotateY: [360, 180, 0],
            y: [-20, 20, -20],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative h-8 w-8" style={{ transformStyle: "preserve-3d" }}>
            <div className="absolute inset-0 border border-primary/25 bg-primary/5" style={{ transform: "translateZ(16px)" }} />
            <div className="absolute inset-0 border border-primary/25 bg-primary/5" style={{ transform: "rotateY(90deg) translateZ(16px)" }} />
          </div>
        </motion.div>

        {/* Bottom right cube */}
        <motion.div
          className="absolute bottom-[20%] right-[10%]"
          style={{
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateX: [45, 225, 45],
            rotateY: [0, 360],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="relative h-10 w-10" style={{ transformStyle: "preserve-3d" }}>
            <div className="absolute inset-0 border border-accent/20 bg-accent/5" style={{ transform: "translateZ(20px)" }} />
            <div className="absolute inset-0 border border-accent/20 bg-accent/5" style={{ transform: "rotateY(180deg) translateZ(20px)" }} />
            <div className="absolute inset-0 border border-accent/20 bg-accent/5" style={{ transform: "rotateY(90deg) translateZ(20px)" }} />
            <div className="absolute inset-0 border border-accent/20 bg-accent/5" style={{ transform: "rotateY(-90deg) translateZ(20px)" }} />
          </div>
        </motion.div>
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary/40"
            style={{
              left: `${10 + (i * 7) % 80}%`,
              top: `${15 + (i * 11) % 70}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
        {/* 3D Logo Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: -20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            perspective: "1000px",
          }}
          className="mb-8"
        >
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            transition={{ type: "spring", stiffness: 100, damping: 30 }}
            className="relative"
          >
            {/* Logo container with 3D depth effect */}
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-primary/20 bg-gradient-to-br from-card/80 to-card/40 p-4 shadow-2xl backdrop-blur-xl sm:h-36 sm:w-36"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Back shadow layer */}
              <div
                className="absolute inset-0 rounded-3xl bg-primary/10"
                style={{ transform: "translateZ(-20px)" }}
              />
              {/* Logo */}
              <img
                src="/logo-white-no-bkg.png"
                alt="Penny4Thots Logo"
                className="h-full w-full object-contain drop-shadow-lg"
                style={{ transform: "translateZ(20px)" }}
              />
              {/* Glow effect */}
              <div className="absolute -inset-4 -z-10 rounded-full bg-primary/20 blur-2xl" />
            </div>
          </motion.div>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm text-primary">Web3 Prediction Market</span>
          </div>
        </motion.div>

        {/* Main heading with 3D text effect */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-4 text-center font-syne text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl"
        >
          <motion.span
            className="relative inline-block text-foreground"
            style={{
              textShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            Penny4
          </motion.span>
          <motion.span
            className="relative ml-2 inline-block bg-clip-text text-transparent sm:ml-4"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--primary)) 100%)",
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              animation: "gradient-shift 4s ease infinite",
            }}
          >
            Thots
          </motion.span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-8 max-w-md text-center font-outfit text-lg text-muted-foreground sm:max-w-xl sm:text-xl"
        >
          <span className="italic text-foreground/80">"If you can think it, it's important."</span>
          <br />
          <span className="mt-2 block text-base text-muted-foreground">
            Trade predictions on any topic. Powered by blockchain.
          </span>
        </motion.p>

        {/* Feature cards with 3D hover */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
        >
          {[
            { icon: Brain, label: "Any Topic", desc: "Create markets" },
            { icon: TrendingUp, label: "Trade", desc: "Yes or No" },
            { icon: Coins, label: "Earn", desc: "Win rewards" },
            { icon: Zap, label: "Fast", desc: "Instant settlement" },
            { icon: Users, label: "Social", desc: "Community driven" },
            { icon: Sparkles, label: "Web3", desc: "Decentralized" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                rotateX: -5,
                z: 20,
              }}
              className="group flex cursor-default flex-col items-center gap-1 rounded-xl border border-border/50 bg-card/50 p-3 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/80 hover:shadow-lg sm:p-4"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              <item.icon className="h-5 w-5 text-accent transition-transform duration-300 group-hover:scale-110 sm:h-6 sm:w-6" />
              <span className="font-outfit text-sm font-medium text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Connect Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
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
          transition={{ delay: 1.6, duration: 0.5 }}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          Connect your wallet or sign in to get started
        </motion.p>

        {/* Decorative bottom line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
          className="absolute bottom-8 h-px w-32 bg-gradient-to-r from-transparent via-primary/40 to-transparent sm:w-48"
        />
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
