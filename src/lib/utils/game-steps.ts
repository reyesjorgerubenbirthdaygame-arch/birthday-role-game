import type { GameStep } from '@/lib/types/database'

function sortedByOrder(steps: GameStep[]): GameStep[] {
  return [...steps].sort((a, b) => a.order_index - b.order_index)
}

export function getNextStep(steps: GameStep[], currentStepId: string | null): GameStep | null {
  const sorted = sortedByOrder(steps)
  if (!currentStepId) return sorted[0] ?? null
  const idx = sorted.findIndex(s => s.id === currentStepId)
  return sorted[idx + 1] ?? null
}

export function getPreviousStep(steps: GameStep[], currentStepId: string | null): GameStep | null {
  if (!currentStepId) return null
  const sorted = sortedByOrder(steps)
  const idx = sorted.findIndex(s => s.id === currentStepId)
  return idx > 0 ? sorted[idx - 1] : null
}

export function isLastStep(steps: GameStep[], currentStepId: string | null): boolean {
  if (!currentStepId || steps.length === 0) return false
  const sorted = sortedByOrder(steps)
  return sorted[sorted.length - 1].id === currentStepId
}

export function getCurrentStep(steps: GameStep[], currentStepId: string | null): GameStep | null {
  if (!currentStepId) return null
  return steps.find(s => s.id === currentStepId) ?? null
}
