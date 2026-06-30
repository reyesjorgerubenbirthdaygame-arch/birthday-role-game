import { computeGlobalLeaderboard } from '@/lib/utils/leaderboard'
import type { LeaderboardEntry } from '@/lib/types/database'

const entries: LeaderboardEntry[] = [
  { id: '1', game_id: 'g1', player_id: 'p1', points: 10 },
  { id: '2', game_id: 'g2', player_id: 'p1', points: 5 },
  { id: '3', game_id: 'g1', player_id: 'p2', points: 20 },
]

const names: Record<string, string | null> = { p1: 'Aria', p2: 'Zephyr' }

describe('computeGlobalLeaderboard', () => {
  it('sums points per player', () => {
    const result = computeGlobalLeaderboard(entries, names)
    const p1 = result.find(r => r.player_id === 'p1')!
    expect(p1.total_points).toBe(15)
  })
  it('sorts by total descending', () => {
    const result = computeGlobalLeaderboard(entries, names)
    expect(result[0].player_id).toBe('p2')
    expect(result[1].player_id).toBe('p1')
  })
  it('assigns rank starting at 1', () => {
    const result = computeGlobalLeaderboard(entries, names)
    expect(result[0].rank).toBe(1)
    expect(result[1].rank).toBe(2)
  })
  it('includes character name from playerNames map', () => {
    const result = computeGlobalLeaderboard(entries, names)
    expect(result.find(r => r.player_id === 'p1')?.character_name).toBe('Aria')
  })
})
