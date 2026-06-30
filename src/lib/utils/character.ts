import type { Player } from '@/lib/types/database'

export function isPlayerComplete(player: Partial<Player>): boolean {
  return !!(
    player.character_name?.trim() &&
    player.positive_trait_1 &&
    player.positive_trait_2 &&
    player.negative_trait_1 &&
    player.negative_trait_2 &&
    player.background
  )
}

export function validateTraitsNotDuplicate(
  trait1: string | null,
  trait2: string | null
): boolean {
  if (!trait1 || !trait2) return true
  return trait1 !== trait2
}
