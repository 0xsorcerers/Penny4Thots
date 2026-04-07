import { isVideoUrl } from "@/tools/media";

interface MarketMediaProps {
  src: string;
  alt: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
}

export function MarketMedia({
  src,
  alt,
  className,
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
}: MarketMediaProps) {
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        className={className}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        preload="metadata"
      />
    );
  }

  return <img src={src} alt={alt} className={className} loading="eager" decoding="async" />;
}
