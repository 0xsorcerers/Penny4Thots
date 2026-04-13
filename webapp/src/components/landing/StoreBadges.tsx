import type { LanguageCode } from "@/tools/languages";

const GOOGLE_BADGE_MAP: Record<LanguageCode, string> = {
  EN: "/google/image/GetItOnGooglePlay_Badge_Web_color_1.svg",
  ES: "/google/image/GetItOnGooglePlay_Badge_Web_color_2.svg",
  FR: "/google/image/GetItOnGooglePlay_Badge_Web_color_3.svg",
  DE: "/google/image/GetItOnGooglePlay_Badge_Web_color_4.svg",
  PT: "/google/image/GetItOnGooglePlay_Badge_Web_color_5.svg",
  ZH: "/google/image/GetItOnGooglePlay_Badge_Web_color_6.svg",
  JA: "/google/image/GetItOnGooglePlay_Badge_Web_color_7.svg",
  KO: "/google/image/GetItOnGooglePlay_Badge_Web_color_8.svg",
  HI: "/google/image/GetItOnGooglePlay_Badge_Web_color_9.svg",
  AR: "/google/image/GetItOnGooglePlay_Badge_Web_color_10.svg",
  HE: "/google/image/GetItOnGooglePlay_Badge_Web_color_11.svg",
};

interface StoreBadgesProps {
  language: LanguageCode;
}

export function StoreBadges({ language }: StoreBadgesProps) {
  return (
    <div className="mb-4 flex items-center justify-center gap-2 sm:gap-3">
      <a href="/app-release-signed.apk" download aria-label="Download Android app">
        <img
          src={GOOGLE_BADGE_MAP[language]}
          alt="Get it on Google Play"
          className="h-9 w-auto sm:h-10"
        />
      </a>
      {/* <a href="/app-release-signed.apk" download aria-label="Download iOS app">
        <img
          src="/apple/image/apple-store-badge.webp"
          alt="Download on the App Store"
          className="h-9 w-auto sm:h-10"
        />
      </a> */}
    </div>
  );
}
