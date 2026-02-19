import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Clock, Flame, AlertTriangle, CheckCircle2 } from "lucide-react";
import { readAdjudicators, renderParsedAdjudicators } from "../../tools/utils";

interface CountdownTimerProps {
  endTime: number; // Unix timestamp in seconds
  closed?: boolean;
  sharesFinalized?: boolean | null; // For market page - null = loading, false = resolving, true = finalized
  compact?: boolean; // For market cards
  className?: string;
  marketId?: number; // Market ID for fetching adjudicators
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeRemaining = (endTime: number): TimeRemaining => {
  const now = Math.floor(Date.now() / 1000);
  const total = Math.max(0, endTime - now);

  return {
    days: Math.floor(total / (60 * 60 * 24)),
    hours: Math.floor((total % (60 * 60 * 24)) / (60 * 60)),
    minutes: Math.floor((total % (60 * 60)) / 60),
    seconds: total % 60,
    total,
  };
};

export function CountdownTimer({ endTime, closed, compact = false, className = "" }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => calculateTimeRemaining(endTime));

  useEffect(() => {
    if (endTime === 0 || closed) return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, closed]);

  // Determine urgency level for styling
  const urgencyLevel = useMemo(() => {
    if (closed || timeRemaining.total === 0) return "ended";
    if (timeRemaining.total <= 60 * 60) return "critical"; // < 1 hour
    if (timeRemaining.total <= 60 * 60 * 24) return "urgent"; // < 24 hours
    if (timeRemaining.total <= 60 * 60 * 24 * 3) return "warning"; // < 3 days
    return "normal";
  }, [timeRemaining.total, closed]);

  // Format time display
  const formatTime = () => {
    if (timeRemaining.total === 0 && !closed) {
      return "Closing";
    }
    if (closed || timeRemaining.total === 0) {
      return "Ended";
    }

    const { days, hours, minutes, seconds } = timeRemaining;

    if (compact) {
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m ${seconds}s`;
    }

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Get icon based on urgency
  const getIcon = () => {
    switch (urgencyLevel) {
      case "ended":
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "critical":
        return (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Flame className="h-3.5 w-3.5" />
          </motion.div>
        );
      case "urgent":
        return (
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </motion.div>
        );
      case "warning":
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return <Timer className="h-3.5 w-3.5" />;
    }
  };

  // Get styles based on urgency
  const getStyles = () => {
    const baseStyles = "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-semibold transition-all";

    switch (urgencyLevel) {
      case "ended":
        return `${baseStyles} bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400`;
      case "critical":
        return `${baseStyles} bg-red-500/15 text-red-600 dark:bg-red-500/25 dark:text-red-400 animate-pulse`;
      case "urgent":
        return `${baseStyles} bg-orange-500/15 text-orange-700 dark:bg-orange-500/25 dark:text-orange-400`;
      case "warning":
        return `${baseStyles} bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-400`;
      default:
        return `${baseStyles} bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400`;
    }
  };

  // Don't render if endTime is 0 (no timer set)
  if (endTime === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={urgencyLevel}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`${getStyles()} ${className}`}
      >
        {getIcon()}
        <span>{formatTime()}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// Larger version for MarketPage
export function CountdownTimerLarge({ endTime, closed, sharesFinalized, className = "", marketId }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => calculateTimeRemaining(endTime));
  const [adjudicators, setAdjudicators] = useState<string>("");
  const [isLoadingAdjudicators, setIsLoadingAdjudicators] = useState(false);

  useEffect(() => {
    if (endTime === 0 || closed) return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, closed]);

  // Fetch adjudicators data when marketId is available
  useEffect(() => {
    console.log('Adjudicators useEffect triggered, marketId:', marketId);
    if (!marketId && marketId !== 0) return;

    const fetchAdjudicators = async () => {
      console.log('Starting to fetch adjudicators for marketId:', marketId);
      setIsLoadingAdjudicators(true);
      try {
        const adjudicatorsData = await readAdjudicators(marketId);
        console.log('Adjudicators data received:', adjudicatorsData);
        setAdjudicators(adjudicatorsData);
      } catch (error) {
        console.error('Error fetching adjudicators:', error);
        setAdjudicators("");
      } finally {
        setIsLoadingAdjudicators(false);
      }
    };

    fetchAdjudicators();
  }, [marketId]);

  const urgencyLevel = useMemo(() => {
    if (closed || timeRemaining.total === 0) return "ended";
    if (timeRemaining.total <= 60 * 60) return "critical";
    if (timeRemaining.total <= 60 * 60 * 24) return "urgent";
    if (timeRemaining.total <= 60 * 60 * 24 * 3) return "warning";
    return "normal";
  }, [timeRemaining.total, closed]);

  // Don't render if endTime is 0
  if (endTime === 0) {
    return null;
  }

  const isEnded = closed || timeRemaining.total === 0;

  const getGradient = () => {
    switch (urgencyLevel) {
      case "ended":
        return "from-slate-500/10 to-gray-500/10 border-slate-500/20";
      case "critical":
        return "from-red-500/15 to-rose-500/15 border-red-500/30";
      case "urgent":
        return "from-orange-500/15 to-amber-500/15 border-orange-500/30";
      case "warning":
        return "from-amber-500/10 to-yellow-500/10 border-amber-500/25";
      default:
        return "from-cyan-500/10 to-teal-500/10 border-cyan-500/20";
    }
  };

  const getTextColor = () => {
    switch (urgencyLevel) {
      case "ended":
        return "text-slate-600 dark:text-slate-400";
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "urgent":
        return "text-orange-700 dark:text-orange-400";
      case "warning":
        return "text-amber-700 dark:text-amber-400";
      default:
        return "text-cyan-700 dark:text-cyan-400";
    }
  };

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`font-syne text-2xl font-bold ${getTextColor()}`}
      >
        {String(value).padStart(2, "0")}
      </motion.span>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );

  // Determine the status text based on market state
  const getStatusText = () => {
    if (!isEnded) return "Time Remaining";

    // Market timer has ended, check closed and sharesFinalized status
    if (!closed) {
      // Timer ended but market not yet closed
      return "Penalty Window.";
    } else if (!sharesFinalized) {
      // Market is closed but shares not finalized (resolving)
      return "Market Resolving.";
    } else {
      // Market is closed and shares are finalized
      return "Market Closed.";
    }
  };

  const getStatusMessage = (adjudicatorsMessage: string) => {
    console.log('getStatusMessage called with:', { adjudicatorsMessage, isEnded, closed, sharesFinalized });
    if (!isEnded) return null;

    // Market timer has ended, check closed and sharesFinalized status
    if (!closed) {
      // Timer ended but market not yet closed
      return "Voting is wrapping up.";
    } else if (!sharesFinalized) {
      // Market is closed but shares not finalized
      return "Voting is now closed.";
    } else {
      // Market is closed and shares are finalized
      console.log('Returning adjudicators message:', adjudicatorsMessage);
      return adjudicatorsMessage;
    }
  };

  // Debug: Log current state during render
  console.log('CountdownTimerLarge render state:', { adjudicators, isLoadingAdjudicators, marketId });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-gradient-to-r ${getGradient()} p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {urgencyLevel === "critical" ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
            <Flame className={`h-5 w-5 ${getTextColor()}`} />
          </motion.div>
        ) : (
          <Timer className={`h-5 w-5 ${getTextColor()}`} />
        )}
        <span className={`font-outfit text-sm font-semibold ${getTextColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {!isEnded ? (
        <div className="flex justify-center gap-4">
          {timeRemaining.days > 0 && <TimeBlock value={timeRemaining.days} label="Days" />}
          <TimeBlock value={timeRemaining.hours} label="Hours" />
          <TimeBlock value={timeRemaining.minutes} label="Mins" />
          <TimeBlock value={timeRemaining.seconds} label="Secs" />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          {adjudicators ? (
            <span className="font-outfit text-lg text-slate-600 dark:text-slate-400">
              {renderParsedAdjudicators(getStatusMessage(adjudicators))}
            </span>
          ) : (
            <span className="font-outfit text-lg text-slate-600 dark:text-slate-400">{getStatusMessage("Loading adjudicators...")}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
