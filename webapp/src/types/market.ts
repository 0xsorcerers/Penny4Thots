export interface Market {
  id: string;
  indexer?: number; // Blockchain market index
  creator?: string; // Creator wallet address
  title: string;
  subtitle: string;
  description: string;
  posterImage: string;
  tags: string[];
  tradeOptions: boolean;
  yesVotes: number;
  noVotes: number;
  createdAt: string;
  marketBalance?: string; // ETH balance from blockchain
  status?: boolean; // Market status from blockchain
}

export interface CreateMarketData {
  title: string;
  subtitle: string;
  description: string;
  posterImage: string;
  tags: string[];
}
