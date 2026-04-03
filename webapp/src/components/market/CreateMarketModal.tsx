import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Image as ImageIcon, ArrowLeft, ArrowRight, Calendar, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getPublicClient, isZeroAddress, ZERO_ADDRESS, fetchDataConstants, calculatePlatformFeePercentage, readTokenDecimals, toTokenSmallestUnit, formatTokenAmount } from "@/tools/utils";
import { useNetworkStore } from "@/store/networkStore";
import { useLanguageStore } from "@/store/languageStore";
import { t } from "@/tools/languages";
import { useTheme } from "@/hooks/useTheme";
import blackLogo from "@/assets/images/black-no-bkg.webp";
import type { CreateMarketData } from "@/types/market";
import type { Address } from "viem";
import erc20 from "@/abi/ERC20.json";
import { Abi } from "viem";

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMarketData & { marketBalance: string; initialVote: "YES" | "NO" | null; useToken: boolean; tokenAddress: Address; endTime: number; signal: boolean; feetype: boolean }) => Promise<void>;
  isLoading?: boolean;
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
  "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
];

export function CreateMarketModal({ isOpen, onClose, onSubmit, isLoading = false }: CreateMarketModalProps) {
  const { theme } = useTheme();
  const selectedNetwork = useNetworkStore((state) => state.selectedNetwork);
  const selectedLanguage = useLanguageStore((state) => state.selectedLanguage);
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    posterImage: "",
    tagInput: "",
    tags: [] as string[],
    optionA: "Yes",
    optionB: "No",
  });
  const [marketBalance, setMarketBalance] = useState("");
  const [initialVote, setInitialVote] = useState<"YES" | "NO" | null>(null);
  const [useToken, setUseToken] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18); // Default to 18
  const [tokenInputError, setTokenInputError] = useState(false);
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number | null>(null);
  const [posterImageError, setPosterImageError] = useState<string | null>(null);

  // End time state for countdown timer
  const [endDate, setEndDate] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [endTimeError, setEndTimeError] = useState<string | null>(null);
  const [isForgoingTime, setIsForgoingTime] = useState(false);

  // Calculate minimum date/time (1 hour from now)
  const getMinDateTime = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return {
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().slice(0, 5),
      timestamp: Math.floor(now.getTime() / 1000),
    };
  }, []);

  // Validate end time (must be at least 1 hour from when the call is made)
  const validateEndTime = useCallback((customDate?: string, customTime?: string) => {
    const dateToUse = customDate ?? endDate;
    const timeToUse = customTime ?? endTimeInput;

    if (!dateToUse || !timeToUse) {
      setEndTimeError(null);
      return 0;
    }

    const selectedDateTime = new Date(`${dateToUse}T${timeToUse}`);
    const nowPlusOneHour = new Date();
    nowPlusOneHour.setHours(nowPlusOneHour.getHours() + 1);

    if (selectedDateTime < nowPlusOneHour) {
      setEndTimeError(t(selectedLanguage, "createMarket.endTimeError"));
      return 0;
    }

    setEndTimeError(null);
    return Math.floor(selectedDateTime.getTime() / 1000);
  }, [endDate, endTimeInput]);

  // Get current end time as unix timestamp
  const endTimeTimestamp = useMemo(() => validateEndTime(), [validateEndTime]);

  // Fetch token symbol and decimals from blockchain
  const fetchTokenInfo = useCallback(async (address: string) => {
    try {
      const client = getPublicClient(selectedNetwork);
      const erc20ABI = erc20.abi as Abi;
      
      // Fetch both symbol and decimals in parallel
      const [symbol, decimals] = await Promise.all([
        client.readContract({
          address: address as Address,
          abi: erc20ABI,
          functionName: "symbol",
        }),
        readTokenDecimals(address as Address)
      ]);
      
      setTokenSymbol(symbol as string);
      setTokenDecimals(decimals);
      setTokenInputError(false);
    } catch (err) {
      console.error("Failed to fetch token info:", err);
      setTokenSymbol(null);
      setTokenDecimals(18); // Reset to default
      setTokenInputError(true);
    }
  }, [selectedNetwork]);

  // Validate image URL
  const validateImageUrl = useCallback((url: string) => {
    if (!url.trim()) {
      setPosterImageError(t(selectedLanguage, "createMarket.imageRequired"));
      return;
    }

    try {
      const urlObj = new URL(url);
      const isValidImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlObj.pathname);

      if (!isValidImageExtension) {
        setPosterImageError(t(selectedLanguage, "createMarket.invalidImageUrl"));
      } else {
        setPosterImageError(null);
      }
    } catch {
      setPosterImageError(t(selectedLanguage, "createMarket.invalidImageUrl"));
    }
  }, []);

  // Fetch platform fee on modal open
  useEffect(() => {
    if (isOpen) {
      const fetchFee = async () => {
        try {
          const dataConstants = await fetchDataConstants();
          const feePercentage = calculatePlatformFeePercentage(dataConstants.platformFee);
          setPlatformFeePercentage(feePercentage);
        } catch (err) {
          console.error("Failed to fetch platform fee:", err);
        }
      };
      fetchFee();
    }
  }, [isOpen]);


  // Handle token address input
  const handleTokenAddressChange = (value: string) => {
    setTokenAddress(value);
    setTokenSymbol(null);
    setTokenDecimals(18); // Reset to default
    setTokenInputError(false);

    // Validate address format (42 characters including 0x)
    if (value.length === 42 && value.startsWith("0x")) {
      fetchTokenInfo(value);
    } else if (value.length > 0) {
      setTokenInputError(true);
    }
  };

  // Handle forgo time - sets date/time to 1.5 hours from now
  const handleForgoTime = () => {
    const futureTime = new Date();
    futureTime.setHours(futureTime.getHours() + 1);
    futureTime.setMinutes(futureTime.getMinutes() + 30);

    const date = futureTime.toISOString().split("T")[0];
    const time = futureTime.toTimeString().slice(0, 5);

    setEndDate(date);
    setEndTimeInput(time);
    setIsForgoingTime(true);
    setEndTimeError(null);
  };

  // Handle payment method toggle
  const handleTogglePayment = () => {
    setUseToken(!useToken);
    setTokenAddress("");
    setTokenSymbol(null);
    setTokenDecimals(18); // Reset to default
    setTokenInputError(false);
  };

  const handleAddTag = () => {
    const tag = formData.tagInput.trim();
    if (tag && formData.tags.length < 7 && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
        tagInput: "",
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const isDetailsValid =
    formData.title.trim() &&
    formData.subtitle.trim() &&
    formData.description.trim() &&
    formData.tags.length > 0 &&
    !posterImageError &&
    formData.posterImage.trim() &&
    endDate &&
    endTimeInput &&
    !endTimeError;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDetailsValid) {
      setStep("confirm");
    }
  };

  const handleSubmit = async (e: React.FormEvent, voteChoice?: "YES" | "NO") => {
    e.preventDefault();
    const finalVote = voteChoice || initialVote;
    if (!marketBalance || !finalVote) return;
    if (useToken && !tokenAddress) return;

    // Calculate endTime at submission time to ensure accuracy
    const finalEndTime = validateEndTime();

    const posterImage =
      formData.posterImage ||
      PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];

    try {
      await onSubmit({
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        posterImage,
        tags: formData.tags,
        marketBalance,
        initialVote,
        optionA: formData.optionA,
        optionB: formData.optionB,
        useToken,
        feetype: useToken, // true for token payment, false for ETH payment
        signal: finalVote === "YES", // true for Option A, false for Option B
        tokenAddress: (useToken ? tokenAddress : ZERO_ADDRESS) as Address,
        endTime: finalEndTime,
      });

      // Only reset form on successful submission
      // The parent component (Index.tsx) will call onClose() on success
      setFormData({
        title: "",
        subtitle: "",
        description: "",
        posterImage: "",
        tagInput: "",
        tags: [],
        optionA: "Yes",
        optionB: "No",
      });
      setMarketBalance("");
      setInitialVote(null);
      setUseToken(false);
      setTokenAddress("");
      setTokenSymbol(null);
      setTokenDecimals(18); // Reset to default
      setEndDate("");
      setEndTimeInput("");
      setEndTimeError(null);
      setIsForgoingTime(false);
      setStep("details");
    } catch {
      // Don't reset form or close modal on error
      // User can retry the transaction or manually close
    }
  };

  const handleClose = () => {
    setStep("details");
    setMarketBalance("");
    setInitialVote(null);
    setUseToken(false);
    setTokenAddress("");
    setTokenSymbol(null);
    setTokenDecimals(18); // Reset to default
    setTokenInputError(false);
    setEndDate("");
    setEndTimeInput("");
    setEndTimeError(null);
    setIsForgoingTime(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg"
            >
              <div
                className={`relative overflow-hidden rounded-2xl border border-border/50 shadow-2xl ${
                  theme === "light" ? "bg-[#f5f5f5]" : "bg-card"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 p-1">
                      <img
                        src={theme === "dark" ? "/logo-white-no-bkg.webp" : blackLogo}
                        alt={t(selectedLanguage, "createMarket.createMarketButton")}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="font-syne text-xl font-bold text-foreground">
                        {step === "details"
                          ? t(selectedLanguage, "createMarket.createMarketButton")
                          : t(selectedLanguage, "createMarket.confirmStep")}
                      </h2>
                      <p className="font-outfit text-sm text-muted-foreground">
                        {step === "details"
                          ? t(selectedLanguage, "createMarket.detailsStep")
                          : t(selectedLanguage, "createMarket.initialVote")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form Content */}
                <form onSubmit={step === "details" ? handleNextStep : handleSubmit}>
                  {step === "details" ? (
                    // Step 1: Market Details
                    <div className="max-h-[60vh] overflow-y-auto p-6">
                      <div className="space-y-5">
                        {/* Title */}
                        <div className="space-y-2">
                          <Label htmlFor="title" className="font-outfit text-foreground">
                            {t(selectedLanguage, "createMarket.marketTitle")} *
                          </Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder={t(selectedLanguage, "createMarket.marketTitlePlaceholder")}
                            className="rounded-xl border-border/50 bg-background font-outfit"
                            required
                          />
                        </div>

                        {/* Subtitle */}
                        <div className="space-y-2">
                          <Label htmlFor="subtitle" className="font-outfit text-foreground">
                            {t(selectedLanguage, "createMarket.marketSubtitle")} *
                          </Label>
                          <Input
                            id="subtitle"
                            value={formData.subtitle}
                            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                            placeholder={t(selectedLanguage, "createMarket.marketSubtitlePlaceholder")}
                            className="rounded-xl border-border/50 bg-background font-outfit"
                            required
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label htmlFor="description" className="font-outfit text-foreground">
                            {t(selectedLanguage, "createMarket.marketDescription")} *
                          </Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder={t(selectedLanguage, "createMarket.marketDescriptionPlaceholder")}
                            rows={3}
                            className="resize-none rounded-xl border-border/50 bg-background font-outfit"
                            required
                          />
                        </div>

                        {/* Poster Image URL */}
                        <div className="space-y-2">
                          <Label htmlFor="posterImage" className="font-outfit text-foreground">
                            <span className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              {t(selectedLanguage, "createMarket.posterImage")} *
                            </span>
                          </Label>
                          <Input
                            id="posterImage"
                            value={formData.posterImage}
                            onChange={(e) => {
                              setFormData({ ...formData, posterImage: e.target.value });
                              validateImageUrl(e.target.value);
                            }}
                            placeholder="https://example.com/image.jpg"
                            className={`rounded-xl border-border/50 bg-background font-outfit ${
                              posterImageError ? "border-destructive/50" : ""
                            }`}
                            required
                          />
                          {posterImageError && (
                            <p className="text-xs text-destructive font-semibold">{posterImageError}</p>
                          )}
                          {formData.posterImage && !posterImageError && (
                            <p className="text-xs text-success font-semibold">{t(selectedLanguage, "common.confirm")} ✓</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Try Pinterest for lots of free images. (HINT: copy image address, not page URL 😉)
                          </p>
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                          <Label className="font-outfit text-foreground">
                            {t(selectedLanguage, "createMarket.tags")} ({formData.tags.length}/7) *
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              value={formData.tagInput}
                              onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                              onKeyDown={handleKeyDown}
                              placeholder={t(selectedLanguage, "createMarket.tags")}
                              disabled={formData.tags.length >= 7}
                              className="rounded-xl border-border/50 bg-background font-outfit theme-text-positive placeholder:text-muted-foreground"
                            />
                            <Button
                              type="button"
                              onClick={handleAddTag}
                              disabled={!formData.tagInput.trim() || formData.tags.length >= 7}
                              variant="secondary"
                              className="rounded-xl"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          {formData.tags.length === 0 && (
                            <p className="text-xs text-destructive font-semibold">{t(selectedLanguage, "createMarket.tags")} *</p>
                          )}

                          {/* Tag list */}
                          {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {formData.tags.map((tag) => (
                                <motion.span
                                  key={tag}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="theme-option-a-chip flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-xs"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1 rounded-full p-0.5 hover:bg-yes/20"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Voting Options */}
                        <div className="space-y-3">
                          <Label className="font-outfit text-foreground">{t(selectedLanguage, "voteModal.selectOption")}</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="optionA" className="text-xs font-outfit text-muted-foreground">
                                {t(selectedLanguage, "createMarket.optionAYes")} (max 25)
                              </Label>
                              <Input
                                id="optionA"
                                value={formData.optionA}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    optionA: e.target.value.slice(0, 25),
                                  })
                                }
                                placeholder={t(selectedLanguage, "common.yes")}
                                maxLength={25}
                                className="rounded-xl border-border/50 bg-background font-outfit text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                {formData.optionA.length}/25
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="optionB" className="text-xs font-outfit text-muted-foreground">
                                {t(selectedLanguage, "createMarket.optionBNo")} (max 25)
                              </Label>
                              <Input
                                id="optionB"
                                value={formData.optionB}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    optionB: e.target.value.slice(0, 25),
                                  })
                                }
                                placeholder={t(selectedLanguage, "common.no")}
                                maxLength={25}
                                className="rounded-xl border-border/50 bg-background font-outfit text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                {formData.optionB.length}/25
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Market End Time */}
                        <div className="space-y-3">
                          <Label className="font-outfit text-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t(selectedLanguage, "createMarket.endTime")} *
                          </Label>
                          <p className="text-xs text-muted-foreground -mt-1">
                            {t(selectedLanguage, "createMarket.endTimeError")}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="endDate" className="text-xs font-outfit text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Date
                              </Label>
                              <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                  setEndDate(e.target.value);
                                  setIsForgoingTime(false);
                                }}
                                onFocus={(e) => e.currentTarget.showPicker?.()}
                                min={getMinDateTime.date}
                                className={`rounded-xl border-border/50 bg-background font-outfit text-sm cursor-pointer ${
                                  endTimeError ? "border-destructive/50" : ""
                                }`}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="endTime" className="text-xs font-outfit text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Time
                              </Label>
                              <Input
                                id="endTime"
                                type="time"
                                value={endTimeInput}
                                onChange={(e) => {
                                  setEndTimeInput(e.target.value);
                                  setIsForgoingTime(false);
                                }}
                                onFocus={(e) => e.currentTarget.showPicker?.()}
                                className={`rounded-xl border-border/50 bg-background font-outfit text-sm cursor-pointer ${
                                  endTimeError ? "border-destructive/50" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {/* Forgo Button */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleForgoTime}
                            className="w-full rounded-xl border-border/50 font-outfit text-sm"
                          >
                            {t(selectedLanguage, "createMarket.forgoTimeButton")}
                          </Button>

                          {/* Error/Info Display */}
                          <AnimatePresence>
                            {endTimeError && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="flex items-center gap-2 text-xs text-destructive"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                {endTimeError}
                              </motion.div>
                            )}
                            {endDate && endTimeInput && !endTimeError && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="flex items-center gap-2 text-xs text-foreground"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                {isForgoingTime
                                  ? t(selectedLanguage, "createMarket.forgoTimeButton")
                                  : `${t(selectedLanguage, "createMarket.endTime")}: ${new Date(`${endDate}T${endTimeInput}`).toLocaleString()}`}
                              </motion.div>
                            )}
                            {!endDate && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="flex items-center gap-2 text-xs text-destructive"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                {t(selectedLanguage, "createMarket.endTime")} *
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Step 2: Confirm & Fund
                    <div className="max-h-[60vh] overflow-y-auto p-6">
                      <div className="space-y-6">
                        {/* Market Summary */}
                        <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">{t(selectedLanguage, "createMarket.marketTitle")}</p>
                            <p className="font-outfit font-semibold text-foreground">{formData.title}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t(selectedLanguage, "createMarket.marketSubtitle")}</p>
                            <p className="font-outfit text-sm text-foreground">{formData.subtitle}</p>
                          </div>
                          {formData.tags.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">{t(selectedLanguage, "createMarket.tags")}</p>
                              <div className="flex flex-wrap gap-1">
                                {formData.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="theme-option-a-chip text-xs rounded-full border px-2 py-1"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="pt-2 border-t border-border/30">
                            <p className="text-xs text-muted-foreground mb-2">{t(selectedLanguage, "voteModal.selectOption")}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded bg-primary/5 px-2 py-1.5">
                                <p className="text-muted-foreground">{t(selectedLanguage, "createMarket.optionAYes")}</p>
                                <p className="font-semibold text-foreground">{formData.optionA}</p>
                              </div>
                              <div className="rounded bg-destructive/5 px-2 py-1.5">
                                <p className="text-muted-foreground">{t(selectedLanguage, "createMarket.optionBNo")}</p>
                                <p className="font-semibold text-foreground">{formData.optionB}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment Method Toggle & Spending Amount */}
                        <div className="space-y-3">
                          {/* Payment Toggle Switch */}
                          <div className="flex items-center justify-between gap-3">
                            <Label className="font-outfit text-foreground text-sm">{t(selectedLanguage, "createMarket.marketBalance")}</Label>
                            <motion.button
                              type="button"
                              onClick={handleTogglePayment}
                              className={`relative inline-flex h-8 w-16 items-center rounded-full border transition-colors shadow-sm ${
                                useToken 
                                  ? "bg-accent/20 border-accent/40" 
                                  : "bg-primary/15 border-primary/40"
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <motion.div
                                className="absolute h-6 w-6 rounded-full bg-background border-border shadow-md"
                                animate={{
                                  x: useToken ? 32 : 4,
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              />
                              <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                                <span className={`text-xs font-semibold transition-opacity theme-option-a-gradient-text animate-shimmer-sweep ${
                                  useToken
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}>
                                  {selectedNetwork.symbol}
                                </span>
                                <span className={`text-xs font-semibold transition-opacity theme-option-a-gradient-text animate-shimmer-sweep ${
                                  useToken 
                                    ? "opacity-0" 
                                    : "opacity-100"
                                }`}>
                                  TOKEN
                                </span>
                              </div>
                            </motion.button>
                          </div>

                          {/* Payment Label with 3D Animation */}
                          <div className="perspective">
                            <motion.div
                              className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 px-3 py-2 text-center"
                              animate={{
                                borderColor: useToken ? "hsl(var(--accent) / 0.3)" : "hsl(var(--primary) / 0.3)",
                                backgroundColor: useToken
                                  ? "hsl(var(--accent) / 0.05) to hsl(var(--accent) / 0.1)"
                                  : "hsl(var(--primary) / 0.05) to hsl(var(--primary) / 0.1)",
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                animate={{
                                  rotateX: useToken ? 5 : -5,
                                }}
                                transition={{ duration: 0.3 }}
                                style={{
                                  transformStyle: "preserve-3d" as const,
                                }}
                              >
                                <p className="font-syne text-sm font-bold">
                                  {t(selectedLanguage, "createMarket.useToken")}{" "}
                                  <span className="theme-option-a-gradient-text animate-shimmer-sweep">
                                    {useToken && tokenSymbol ? tokenSymbol : useToken ? "Token" : selectedNetwork.symbol}
                                  </span>
                                </p>
                              </motion.div>
                            </motion.div>
                          </div>

                          {/* Token Address Input */}
                          <AnimatePresence>
                            {useToken && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-2"
                              >
                                <Label htmlFor="token-address" className="font-outfit text-foreground">
                                  {t(selectedLanguage, "createMarket.tokenAddress")}
                                </Label>
                                <Input
                                  id="token-address"
                                  type="text"
                                  value={tokenAddress}
                                  onChange={(e) => handleTokenAddressChange(e.target.value)}
                                  placeholder={ZERO_ADDRESS}
                                  className={`rounded-xl border-border/50 bg-background font-mono text-sm ${
                                    tokenInputError ? "border-destructive/50" : ""
                                  }`}
                                />
                                {tokenInputError && tokenAddress.length > 0 && (
                                  <p className="text-xs text-destructive font-semibold">{t(selectedLanguage, "createMarket.tokenError")}</p>
                                )}
                                {tokenSymbol && (
                                  <p className="text-xs text-success font-semibold">
                                    Token verified: {tokenSymbol}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {t(selectedLanguage, "createMarket.tokenAddress")}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Spending Amount */}
                          <div className="space-y-2">
                            <Label htmlFor="balance" className="font-outfit text-foreground">
                              {t(selectedLanguage, "createMarket.marketBalance")}{" "}
                              <span className="theme-option-a-gradient-text animate-shimmer-sweep">
                                ({useToken && tokenSymbol ? tokenSymbol : useToken ? "Token" : selectedNetwork.symbol})
                              </span>{" "}
                              *
                            </Label>
                            <Input
                              id="balance"
                              type="number"
                              step="0.001"
                              min="0"
                              value={marketBalance}
                              onChange={(e) => setMarketBalance(e.target.value)}
                              placeholder={useToken ? "1.0" : "0.1"}
                              className="rounded-xl border-border/50 bg-background font-outfit"
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              {t(selectedLanguage, "createMarket.marketBalance")}
                            </p>
                            {/* Platform Fee Display */}
                            {platformFeePercentage !== null && (
                              <p className="text-xs mt-2">
                                <span className="text-muted-foreground">{t(selectedLanguage, "createMarket.platformFee")}: </span>
                                <span
                                  style={{
                                    color: useToken ? "hsl(var(--accent))" : "hsl(var(--primary))",
                                  }}
                                  className="font-semibold"
                                >
                                  {platformFeePercentage.toFixed(4)}%
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Initial Vote */}
                        <div className="space-y-2">
                          <Label className="font-outfit text-foreground">
                            {t(selectedLanguage, "createMarket.initialVote")} *
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <motion.button
                              type="button"
                              onClick={() => {
                                const choice = "YES";
                                setInitialVote(choice);
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative rounded-xl border-2 p-4 transition-colors ${
                                initialVote === "YES"
                                  ? "border-yes bg-yes/10"
                                  : "border-border/50 bg-muted/50 hover:border-yes/50"
                              }`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <ArrowLeft
                                  className={`h-5 w-5 ${
                                    initialVote === "YES" ? "text-yes" : "text-muted-foreground"
                                  }`}
                                />
                                <span className="font-outfit font-semibold text-foreground">{formData.optionA}</span>
                              </div>
                            </motion.button>

                            <motion.button
                              type="button"
                              onClick={() => {
                                const choice = "NO";
                                setInitialVote(choice);
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative rounded-xl border-2 p-4 transition-colors ${
                                initialVote === "NO"
                                  ? "border-destructive bg-destructive/10"
                                  : "border-border/50 bg-muted/50 hover:border-destructive/50"
                              }`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <ArrowRight
                                  className={`h-5 w-5 ${
                                    initialVote === "NO" ? "text-destructive" : "text-muted-foreground"
                                  }`}
                                />
                                <span className="font-outfit font-semibold text-foreground">{formData.optionB}</span>
                              </div>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-border/50 p-6">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={step === "confirm" ? () => setStep("details") : handleClose}
                      disabled={isLoading}
                      className="rounded-xl font-outfit"
                    >
                      {step === "confirm" ? t(selectedLanguage, "nav.back") : t(selectedLanguage, "common.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isLoading ||
                        (step === "details"
                          ? !isDetailsValid
                          : !marketBalance || !initialVote || (useToken && !tokenAddress))
                      }
                      className="rounded-xl bg-primary font-outfit font-semibold"
                    >
                      {isLoading
                        ? step === "confirm"
                          ? `${t(selectedLanguage, "createMarket.createMarketButton")}...`
                          : t(selectedLanguage, "nav.next")
                        : step === "details"
                        ? t(selectedLanguage, "nav.next")
                        : t(selectedLanguage, "createMarket.createMarketButton")}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
