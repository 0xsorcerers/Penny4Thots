export const MAX_MARKET_MEDIA_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogg", "ogv"];

export type MarketMediaKind = "image" | "video" | "unknown";

const getExtensionFromPath = (path: string): string => {
  const cleanPath = path.split("?")[0].split("#")[0];
  const extension = cleanPath.split(".").pop();
  return extension?.toLowerCase() ?? "";
};

export const getMarketMediaKind = (url: string): MarketMediaKind => {
  try {
    const parsedUrl = new URL(url);
    const extension = getExtensionFromPath(parsedUrl.pathname);

    if (VIDEO_EXTENSIONS.includes(extension)) {
      return "video";
    }

    if (IMAGE_EXTENSIONS.includes(extension)) {
      return "image";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
};

export const isSupportedMarketMediaUrl = (url: string): boolean => {
  const kind = getMarketMediaKind(url);
  return kind === "image" || kind === "video";
};

const parseContentLength = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const tryGetContentLengthFromResponse = (response: Response): number | null => {
  return parseContentLength(response.headers.get("content-length"));
};

export const validateMarketMediaSize = async (
  url: string,
  maxBytes: number = MAX_MARKET_MEDIA_BYTES,
): Promise<{ withinLimit: boolean; sizeBytes: number | null; unknown: boolean }> => {
  const requestInit: RequestInit = {
    method: "HEAD",
    mode: "cors",
  };

  try {
    const headResponse = await fetch(url, requestInit);
    const headSize = tryGetContentLengthFromResponse(headResponse);

    if (headSize !== null) {
      return {
        withinLimit: headSize <= maxBytes,
        sizeBytes: headSize,
        unknown: false,
      };
    }
  } catch {
    // ignored - fallback below
  }

  try {
    const rangeResponse = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      mode: "cors",
    });

    const rangeHeader = rangeResponse.headers.get("content-range");
    if (rangeHeader) {
      const totalSizeMatch = rangeHeader.match(/\/(\d+)$/);
      const rangeSize = totalSizeMatch ? Number.parseInt(totalSizeMatch[1], 10) : null;
      if (rangeSize !== null && Number.isFinite(rangeSize)) {
        return {
          withinLimit: rangeSize <= maxBytes,
          sizeBytes: rangeSize,
          unknown: false,
        };
      }
    }

    const getSize = tryGetContentLengthFromResponse(rangeResponse);
    if (getSize !== null) {
      return {
        withinLimit: getSize <= maxBytes,
        sizeBytes: getSize,
        unknown: false,
      };
    }
  } catch {
    // ignored - returns unknown below
  }

  return {
    withinLimit: true,
    sizeBytes: null,
    unknown: true,
  };
};
