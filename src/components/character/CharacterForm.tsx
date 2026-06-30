'use client'

import { useState } from 'react'
import type { Player, TraitOption, BackgroundOption } from '@/lib/types/database'
import { isPlayerComplete, validateTraitsNotDuplicate } from '@/lib/utils/character'
import { createClient } from '@/lib/supabase/client'

interface CharacterFormProps {
  player: Player | null
  userId: string
  positiveTraits: TraitOption[]
  negativeTraits: TraitOption[]
  backgrounds: BackgroundOption[]
  isLocked: boolean
}

export function CharacterForm({
  player,
  userId,
  positiveTraits,
  negativeTraits,
  backgrounds,
  isLocked,
}: CharacterFormProps) {
  const [characterName, setCharacterName] = useState(player?.character_name ?? '')
  const [creature, setCreature] = useState(player?.creature ?? '')
  const [positiveTrait1, setPositiveTrait1] = useState(player?.positive_trait_1 ?? '')
  const [positiveTrait2, setPositiveTrait2] = useState(player?.positive_trait_2 ?? '')
  const [negativeTrait1, setNegativeTrait1] = useState(player?.negative_trait_1 ?? '')
  const [negativeTrait2, setNegativeTrait2] = useState(player?.negative_trait_2 ?? '')
  const [background, setBackground] = useState(player?.background ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!validateTraitsNotDuplicate(positiveTrait1 || null, positiveTrait2 || null)) {
      setError('Los rasgos positivos deben ser diferentes.')
      return
    }
    if (!validateTraitsNotDuplicate(negativeTrait1 || null, negativeTrait2 || null)) {
      setError('Los rasgos negativos deben ser diferentes.')
      return
    }

    const data = {
      user_id: userId,
      character_name: characterName || null,
      creature: creature || null,
      positive_trait_1: positiveTrait1 || null,
      positive_trait_2: positiveTrait2 || null,
      negative_trait_1: negativeTrait1 || null,
      negative_trait_2: negativeTrait2 || null,
      background: background || null,
      updated_at: new Date().toISOString(),
    }

    const complete = isPlayerComplete(data)
    setLoading(true)

    const { error: dbError } = player
      ? await supabase.from('players').update({ ...data, is_complete: complete }).eq('id', player.id)
      : await supabase.from('players').insert({ ...data, is_complete: complete })

    setLoading(false)
    if (dbError) setError(dbError.message)
    else setSaved(true)
  }

  const inputClass = `w-full bg-bg-secondary text-text-primary border border-border rounded-md px-4 py-2 text-md
    focus:outline-none focus:border-accent ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {isLocked && (
        <p className="text-warning text-sm">El evento ha comenzado — tu personaje está bloqueado.</p>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Nombre del personaje</label>
        <input
          value={characterName}
          onChange={e => setCharacterName(e.target.value)}
          disabled={isLocked}
          placeholder="ej. Aria Sombrascura"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Tipo de criatura <span className="text-text-muted">(ej. humano, fantasma, dragón…)</span></label>
        <input
          value={creature}
          onChange={e => setCreature(e.target.value)}
          disabled={isLocked}
          placeholder="humano"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Rasgo positivo 1</label>
        <select value={positiveTrait1} onChange={e => setPositiveTrait1(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— elige —</option>
          {positiveTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Rasgo positivo 2</label>
        <select value={positiveTrait2} onChange={e => setPositiveTrait2(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— elige —</option>
          {positiveTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Rasgo negativo 1</label>
        <select value={negativeTrait1} onChange={e => setNegativeTrait1(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— elige —</option>
          {negativeTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Rasgo negativo 2</label>
        <select value={negativeTrait2} onChange={e => setNegativeTrait2(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— elige —</option>
          {negativeTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Trasfondo</label>
        <select value={background} onChange={e => setBackground(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— elige —</option>
          {backgrounds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {saved && <p className="text-success text-sm">¡Personaje guardado!</p>}

      {!isLocked && (
        <button
          type="submit"
          disabled={loading}
          className="bg-accent hover:bg-accent-hover text-white font-medium rounded-md px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Guardar personaje'}
        </button>
      )}
    </form>
  )
}
