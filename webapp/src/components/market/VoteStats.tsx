import { BarChart3, Users } from "lucide-react";

interface VoteStatsProps {
  aVotes: number;
  bVotes: number;
}

export function VoteStats({ aVotes, bVotes }: VoteStatsProps) {
  const totalVotes = aVotes + bVotes;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary">
      <Users className="h-3 w-3" />
      <span className="font-semibold">{totalVotes.toLocaleString()}</span>
      <span className="opacity-70">votes</span>
    </span>
  );
}
