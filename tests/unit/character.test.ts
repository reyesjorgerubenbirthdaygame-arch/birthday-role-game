import { isPlayerComplete, validateTraitsNotDuplicate } from '@/lib/utils/character'

const base = {
  character_name: 'Aria',
  creature: 'Elf',
  positive_trait_1: 'uuid-1',
  positive_trait_2: 'uuid-2',
  negative_trait_1: 'uuid-3',
  negative_trait_2: 'uuid-4',
  background: 'uuid-5',
}

describe('isPlayerComplete', () => {
  it('returns true when all fields are set', () => {
    expect(isPlayerComplete(base)).toBe(true)
  })
  it('returns false when character_name is missing', () => {
    expect(isPlayerComplete({ ...base, character_name: null })).toBe(false)
  })
  it('returns false when character_name is empty string', () => {
    expect(isPlayerComplete({ ...base, character_name: '  ' })).toBe(false)
  })
  it('returns false when any trait is missing', () => {
    expect(isPlayerComplete({ ...base, positive_trait_2: null })).toBe(false)
  })
  it('returns false when background is missing', () => {
    expect(isPlayerComplete({ ...base, background: null })).toBe(false)
  })
})

describe('validateTraitsNotDuplicate', () => {
  it('returns true when traits are different', () => {
    expect(validateTraitsNotDuplicate('uuid-1', 'uuid-2')).toBe(true)
  })
  it('returns false when traits are the same', () => {
    expect(validateTraitsNotDuplicate('uuid-1', 'uuid-1')).toBe(false)
  })
  it('returns true when either trait is null', () => {
    expect(validateTraitsNotDuplicate(null, 'uuid-1')).toBe(true)
    expect(validateTraitsNotDuplicate('uuid-1', null)).toBe(true)
  })
})
