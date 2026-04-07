import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { getMarketMediaKind } from "@/lib/marketMedia";

interface MarketBackgroundMediaProps {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  imgClassName?: string;
  videoClassName?: string;
}

export function MarketBackgroundMedia({
  src,
  alt = "",
  className,
  style,
  imgClassName,
  videoClassName,
}: MarketBackgroundMediaProps) {
  const mediaKind = getMarketMediaKind(src);

  if (mediaKind === "video") {
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={cn(className, videoClassName)}
        style={style}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      className={cn(className, imgClassName)}
      style={style}
    />
  );
}
