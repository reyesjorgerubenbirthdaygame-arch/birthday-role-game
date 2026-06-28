import type { LeaderboardEntry, GlobalLeaderboardRow } from '@/lib/types/database'

export function computeGlobalLeaderboard(
  entries: LeaderboardEntry[],
  playerNames: Record<string, string | null>
): GlobalLeaderboardRow[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    totals.set(entry.player_id, (totals.get(entry.player_id) ?? 0) + entry.points)
  }
  return Array.from(totals.entries())
    .map(([player_id, total_points]) => ({
      player_id,
      character_name: playerNames[player_id] ?? null,
      total_points,
      rank: 0,
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .map((row, i) => ({ ...row, rank: i + 1 }))
}
