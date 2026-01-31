import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CreateMarketData } from "@/types/market";

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMarketData) => void;
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
  "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
];

export function CreateMarketModal({ isOpen, onClose, onSubmit }: CreateMarketModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    posterImage: "",
    tagInput: "",
    tags: [] as string[],
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const posterImage =
      formData.posterImage ||
      PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];

    onSubmit({
      title: formData.title,
      subtitle: formData.subtitle,
      description: formData.description,
      posterImage,
      tags: formData.tags,
    });

    // Reset form
    setFormData({
      title: "",
      subtitle: "",
      description: "",
      posterImage: "",
      tagInput: "",
      tags: [],
    });
    onClose();
  };

  const isValid = formData.title.trim() && formData.subtitle.trim() && formData.description.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-syne text-xl font-bold text-foreground">Create Market</h2>
                    <p className="font-outfit text-sm text-muted-foreground">
                      Start a new prediction
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="max-h-[60vh] overflow-y-auto p-6">
                <div className="space-y-5">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="font-outfit text-foreground">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Will Bitcoin reach $100k?"
                      className="rounded-xl border-border/50 bg-background font-outfit"
                      required
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-2">
                    <Label htmlFor="subtitle" className="font-outfit text-foreground">
                      Subtitle *
                    </Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Crypto price prediction for 2025"
                      className="rounded-xl border-border/50 bg-background font-outfit"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-outfit text-foreground">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide more context about this prediction market..."
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
                        Poster Image URL (optional)
                      </span>
                    </Label>
                    <Input
                      id="posterImage"
                      value={formData.posterImage}
                      onChange={(e) => setFormData({ ...formData, posterImage: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="rounded-xl border-border/50 bg-background font-outfit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for a random image
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="font-outfit text-foreground">
                      Tags ({formData.tags.length}/7)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.tagInput}
                        onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a tag..."
                        disabled={formData.tags.length >= 7}
                        className="rounded-xl border-border/50 bg-background font-outfit"
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

                    {/* Tag list */}
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {formData.tags.map((tag) => (
                          <motion.span
                            key={tag}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-border/50 p-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-xl font-outfit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid}
                  className="rounded-xl bg-primary font-outfit font-semibold"
                >
                  Create Market
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
