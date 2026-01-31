export interface Market {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  posterImage: string;
  tags: string[];
  tradeOptions: boolean;
  yesVotes: number;
  noVotes: number;
  createdAt: string;
}

export interface CreateMarketData {
  title: string;
  subtitle: string;
  description: string;
  posterImage: string;
  tags: string[];
}
