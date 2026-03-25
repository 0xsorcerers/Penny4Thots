const LANGUAGE_TAGS_BASE_URL = "https://sonicsweethearts.art";

export interface LanguageTagsFetchResult {
  tagsByMarketId: Record<number, string>;
  count: number;
}

const normalizeLanguageTag = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

export const fetchLanguageTagsForChain = async (
  chainId: number
): Promise<LanguageTagsFetchResult> => {
  const response = await fetch(
    `${LANGUAGE_TAGS_BASE_URL}/allLanguageTags_${chainId}.json`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch language tags for chain ${chainId}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const tagsByMarketId: Record<number, string> = {};

  Object.entries(payload).forEach(([marketIdRaw, languageTagRaw]) => {
    const marketId = Number(marketIdRaw);
    if (!Number.isInteger(marketId) || marketId < 0) return;

    const languageTag = normalizeLanguageTag(languageTagRaw);
    if (!languageTag) return;

    tagsByMarketId[marketId] = languageTag;
  });

  return {
    tagsByMarketId,
    count: Object.keys(tagsByMarketId).length,
  };
};
