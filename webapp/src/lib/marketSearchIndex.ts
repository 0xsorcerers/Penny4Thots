import type { Market } from "@/types/market";

const tokenize = (input: string): string[] =>
  input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

export class MarketSearchIndex {
  private readonly marketById = new Map<number, Market>();
  private readonly invertedIndex = new Map<string, Set<number>>();

  constructor(markets: Market[]) {
    markets.forEach((market) => {
      if (typeof market.indexer !== "number") return;

      this.marketById.set(market.indexer, market);

      const searchableTerms = [
        market.title,
        market.subtitle,
        market.description,
        ...market.tags,
      ];

      searchableTerms.forEach((term) => {
        tokenize(term).forEach((token) => {
          if (!this.invertedIndex.has(token)) {
            this.invertedIndex.set(token, new Set());
          }
          this.invertedIndex.get(token)?.add(market.indexer!);
        });
      });
    });
  }

  findById(id: number): number[] {
    return this.marketById.has(id) ? [id] : [];
  }

  search(query: string): number[] {
    const tokens = tokenize(query);
    if (!tokens.length) return [];

    const ranked = new Map<number, number>();

    tokens.forEach((token) => {
      this.invertedIndex.forEach((ids, indexedToken) => {
        if (!indexedToken.includes(token)) return;
        ids.forEach((id) => ranked.set(id, (ranked.get(id) || 0) + 1));
      });
    });

    return Array.from(ranked.entries())
      .sort((a, b) => b[1] - a[1] || b[0] - a[0])
      .map(([id]) => id);
  }
}

