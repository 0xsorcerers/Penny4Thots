import { BarChart3 } from "lucide-react";

interface VoteStatsProps {
  aVotes: number;
  bVotes: number;
}

export function VoteStats({ aVotes, bVotes }: VoteStatsProps) {
  const totalVotes = aVotes + bVotes;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1.5 font-mono text-xs text-secondary">
      <BarChart3 className="h-3 w-3" />
      <span className="font-semibold">{totalVotes.toLocaleString()}</span>
      <span className="opacity-70">votes</span>
    </div>
  );
}
