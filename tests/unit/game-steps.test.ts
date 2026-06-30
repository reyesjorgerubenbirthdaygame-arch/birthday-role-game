import { getNextStep, getPreviousStep, isLastStep, getCurrentStep } from '@/lib/utils/game-steps'
import type { GameStep } from '@/lib/types/database'

const steps: GameStep[] = [
  { id: 'a', game_id: 'g1', step_type: 'instructions', order_index: 0, content: {} },
  { id: 'b', game_id: 'g1', step_type: 'status',       order_index: 1, content: { label: 'Status' } },
  { id: 'c', game_id: 'g1', step_type: 'results',      order_index: 2, content: { label: 'Results' } },
]

describe('getNextStep', () => {
  it('returns first step when currentStepId is null', () => {
    expect(getNextStep(steps, null)?.id).toBe('a')
  })
  it('returns next step', () => {
    expect(getNextStep(steps, 'a')?.id).toBe('b')
  })
  it('returns null after last step', () => {
    expect(getNextStep(steps, 'c')).toBeNull()
  })
})

describe('getPreviousStep', () => {
  it('returns null when currentStepId is null', () => {
    expect(getPreviousStep(steps, null)).toBeNull()
  })
  it('returns null for first step', () => {
    expect(getPreviousStep(steps, 'a')).toBeNull()
  })
  it('returns previous step', () => {
    expect(getPreviousStep(steps, 'b')?.id).toBe('a')
  })
})

describe('isLastStep', () => {
  it('returns false for first step', () => {
    expect(isLastStep(steps, 'a')).toBe(false)
  })
  it('returns true for last step', () => {
    expect(isLastStep(steps, 'c')).toBe(true)
  })
  it('returns false for null', () => {
    expect(isLastStep(steps, null)).toBe(false)
  })
})

describe('getCurrentStep', () => {
  it('returns the matching step', () => {
    expect(getCurrentStep(steps, 'b')?.id).toBe('b')
  })
  it('returns null when not found', () => {
    expect(getCurrentStep(steps, 'x')).toBeNull()
  })
})
