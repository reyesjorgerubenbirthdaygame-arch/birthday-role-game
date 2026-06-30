'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { TraitOption, BackgroundOption } from '@/lib/types/database'

const EVENT_DATE = new Date('2026-08-01T10:00:00Z')

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number }

function calculateTimeLeft(): TimeLeft | null {
  const diff = EVENT_DATE.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function pad(n: number): string { return String(n).padStart(2, '0') }

type View = 'loading' | 'auth' | 'building' | 'complete'
type AuthMode = 'register' | 'login'

interface CharacterData {
  character_name: string
  positive_trait_1: string
  positive_trait_2: string
  negative_trait_1: string
  negative_trait_2: string
  background: string
}

interface PlayerRecord extends CharacterData {
  is_complete: boolean
}

const STEPS = [
  {
    key: '' as const,
    title: '¿Quién serás?',
    hint: 'El evento más épico se acerca',
    type: 'intro' as const,
  },
  {
    key: 'character_name',
    title: 'Nombre del personaje',
    hint: 'Dale un nombre a tu héroe',
    type: 'text' as const,
    placeholder: 'ej. Aria Sombrascura',
  },
  {
    key: 'positive_trait_1',
    title: 'Primera virtud',
    hint: 'Elige el rasgo que te define en la luz',
    type: 'select_positive' as const,
  },
  {
    key: 'positive_trait_2',
    title: 'Segunda virtud',
    hint: 'Nadie tiene un solo don…',
    type: 'select_positive' as const,
  },
  {
    key: 'negative_trait_1',
    title: 'Primera sombra',
    hint: 'Hasta el héroe más noble carga con una falla',
    type: 'select_negative' as const,
  },
  {
    key: 'negative_trait_2',
    title: 'Segunda sombra',
    hint: 'Las sombras nos hacen complejos, no débiles',
    type: 'select_negative' as const,
  },
  {
    key: 'background',
    title: 'Trasfondo',
    hint: 'Tu historia antes de que todo comience',
    type: 'select_background' as const,
  },
]

export default function HomePage() {
  const [view, setView] = useState<View>('auth')
  const [user, setUser] = useState<User | null>(null)
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft())

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // Builder state
  const [step, setStep] = useState(0)
  const [posTraits, setPosTraits] = useState<TraitOption[]>([])
  const [negTraits, setNegTraits] = useState<TraitOption[]>([])
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([])
  const [character, setCharacter] = useState<CharacterData>({
    character_name: '',
    positive_trait_1: '',
    positive_trait_2: '',
    negative_trait_1: '',
    negative_trait_2: '',
    background: '',
  })
  const [completedPlayer, setCompletedPlayer] = useState<PlayerRecord | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  // Countdown ticker
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auth state listener
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setView('auth')
        return
      }
      setUser(session.user)
      setView('loading')
      await loadBuilderData(session.user.id)
    }).catch(() => setView('auth'))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setUser(null)
        setView('auth')
        return
      }
      setUser(session.user)
      setView('loading')
      await loadBuilderData(session.user.id).catch(() => setView('auth'))
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBuilderData(userId: string) {
    try {
      const supabase = createClient()
      const locked = EVENT_DATE <= new Date()
      setIsLocked(locked)

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      )

      const [posRes, negRes, bgRes, playerRes] = await Promise.race([
        Promise.all([
          supabase.from('trait_options').select('id, name').eq('type', 'positive').order('name'),
          supabase.from('trait_options').select('id, name').eq('type', 'negative').order('name'),
          supabase.from('background_options').select('id, name').order('name'),
          supabase.from('players').select('*').eq('user_id', userId).maybeSingle(),
        ]),
        timeout,
      ])

      if (posRes.data) setPosTraits(posRes.data as TraitOption[])
      if (negRes.data) setNegTraits(negRes.data as TraitOption[])
      if (bgRes.data) setBackgrounds(bgRes.data as BackgroundOption[])

      const player = playerRes.data as PlayerRecord | null

      if (player?.is_complete) {
        setCompletedPlayer(player)
        setView('complete')
      } else {
        if (player) {
          setCharacter({
            character_name: player.character_name ?? '',
            positive_trait_1: player.positive_trait_1 ?? '',
            positive_trait_2: player.positive_trait_2 ?? '',
            negative_trait_1: player.negative_trait_1 ?? '',
            negative_trait_2: player.negative_trait_2 ?? '',
            background: player.background ?? '',
          })
        }
        setView('building')
      }
    } catch {
      setView('auth')
    }
  }

  // Auth handlers
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    setAuthMessage(null)
    try {
      const supabase = createClient()
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        })
        if (error) setAuthError(error.message)
        else setAuthMessage('Revisa tu correo para confirmar tu cuenta.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setAuthError(error.message)
      }
    } catch {
      setAuthError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/confirm` },
    })
  }

  // Builder handlers
  function getCurrentValue(): string {
    const s = STEPS[step]
    if (s.type === 'intro' || !s.key) return ''
    return character[s.key as keyof CharacterData] ?? ''
  }

  function setCurrentValue(val: string) {
    setStepError(null)
    const s = STEPS[step]
    if (s.type === 'intro' || !s.key) return
    setCharacter(prev => ({ ...prev, [s.key]: val }))
  }

  function validateStep(): boolean {
    const s = STEPS[step]
    if (s.type === 'intro') return true
    const val = character[s.key as keyof CharacterData]
    if (!val?.trim()) {
      setStepError('Este campo es obligatorio.')
      return false
    }
    return true
  }

  function handleNext() {
    if (!validateStep()) return
    setStepError(null)
    if (step < STEPS.length - 1) {
      const s = STEPS[step]
      if (s.key === 'positive_trait_1' && character.positive_trait_2 === character.positive_trait_1) {
        setCharacter(prev => ({ ...prev, positive_trait_2: '' }))
      }
      if (s.key === 'negative_trait_1' && character.negative_trait_2 === character.negative_trait_1) {
        setCharacter(prev => ({ ...prev, negative_trait_2: '' }))
      }
      setStep(s => s + 1)
    } else {
      handleSave()
    }
  }

  function handleBack() {
    setStepError(null)
    setStep(s => Math.max(0, s - 1))
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('players').upsert({
      user_id: user.id,
      character_name: character.character_name,
      positive_trait_1: character.positive_trait_1,
      positive_trait_2: character.positive_trait_2,
      negative_trait_1: character.negative_trait_1,
      negative_trait_2: character.negative_trait_2,
      background: character.background,
      is_complete: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) {
      setStepError(error.message)
    } else {
      setCompletedPlayer({ ...character, is_complete: true })
      setView('complete')
    }
  }

  // Helpers for display names
  function traitName(id: string, list: TraitOption[]): string {
    return list.find(t => t.id === id)?.name ?? id
  }
  function bgName(id: string): string {
    return backgrounds.find(b => b.id === id)?.name ?? id
  }

  const inputClass = 'w-full bg-bg-secondary text-text-primary border border-border rounded-md px-4 py-2 text-md focus:outline-none focus:border-accent'

  return (
    <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 gap-6">
      <div className="max-w-md w-full mx-auto flex flex-col gap-6">

        {/* Countdown — always visible */}
        <div className="bg-bg-card rounded-lg p-6 shadow-md text-center">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-3">El evento comienza en</p>
          {timeLeft ? (
            <div className="flex justify-center gap-4">
              {[
                { value: timeLeft.days, label: 'días' },
                { value: timeLeft.hours, label: 'horas' },
                { value: timeLeft.minutes, label: 'min' },
                { value: timeLeft.seconds, label: 'seg' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-4xl font-bold text-accent tabular-nums">{pad(value)}</span>
                  <span className="text-text-muted text-xs mt-1">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-2xl font-bold text-accent">¡El evento ha comenzado!</p>
          )}
        </div>

        {/* Panel — swaps by view */}
        <div className="bg-bg-card rounded-lg p-8 shadow-md w-full">

          {/* LOADING */}
          {view === 'loading' && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* AUTH */}
          {view === 'auth' && (
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-6">Birthday Role Game</h1>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setAuthMode('register')}
                  className={`text-sm font-medium pb-1 border-b-2 ${authMode === 'register' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'}`}
                >
                  Registrarse
                </button>
                <button
                  onClick={() => setAuthMode('login')}
                  className={`text-sm font-medium pb-1 border-b-2 ${authMode === 'login' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'}`}
                >
                  Iniciar sesión
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                />
                {authError && <p className="text-danger text-sm">{authError}</p>}
                {authMessage && <p className="text-success text-sm">{authMessage}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="bg-accent hover:bg-accent-hover text-white font-medium rounded-md px-4 py-2 disabled:opacity-50"
                >
                  {authLoading ? 'Cargando…' : authMode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-text-muted text-sm">o</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full border border-border text-text-primary font-medium rounded-md px-4 py-2 hover:bg-bg-secondary transition-colors"
              >
                Continuar con Google
              </button>
            </div>
          )}

          {/* BUILDING */}
          {view === 'building' && (() => {
            const s = STEPS[step]
            const progress = ((step + 1) / STEPS.length) * 100
            const val = getCurrentValue()
            const isLast = step === STEPS.length - 1

            const excludeId = s.key === 'positive_trait_2' ? character.positive_trait_1
              : s.key === 'negative_trait_2' ? character.negative_trait_1
              : null

            const selectOptions = (s.type === 'select_positive' ? posTraits
              : s.type === 'select_negative' ? negTraits
              : s.type === 'select_background' ? backgrounds
              : []).filter(opt => !excludeId || opt.id !== excludeId)

            return (
              <div>
                {isLocked && (
                  <p className="text-warning text-sm mb-4">El evento ha comenzado — tu personaje está bloqueado.</p>
                )}

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-text-muted mb-2">
                    <span>Paso {step + 1} de {STEPS.length}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Step content */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-text-primary mb-1">{s.title}</h2>
                  <p className="text-text-muted text-sm mb-5">{s.hint}</p>

                  {s.type === 'intro' ? (
                    <p className="text-text-secondary text-base leading-relaxed">
                      En este concurso tendrás que encarnar un personaje y disfrazarte como él el día del evento.
                      Puede ser alguien real o imaginario — un héroe, una figura histórica, un personaje de ficción...
                      ¡tú decides!
                    </p>
                  ) : s.type === 'text' ? (
                    <input
                      type="text"
                      value={val}
                      onChange={e => setCurrentValue(e.target.value)}
                      placeholder={s.placeholder}
                      disabled={isLocked}
                      className={inputClass}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNext() } }}
                      autoFocus
                    />
                  ) : (
                    <select
                      value={val}
                      onChange={e => setCurrentValue(e.target.value)}
                      disabled={isLocked}
                      className={inputClass}
                    >
                      <option value="">— elige —</option>
                      {(selectOptions as Array<{ id: string; name: string }>).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  )}

                  {stepError && <p className="text-danger text-sm mt-2">{stepError}</p>}
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  {step > 0 && (
                    <button
                      onClick={handleBack}
                      disabled={saving}
                      className="flex-1 border border-border text-text-primary font-medium rounded-md px-4 py-2 hover:bg-bg-secondary transition-colors disabled:opacity-50"
                    >
                      ← Anterior
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={saving || isLocked}
                    className="flex-1 bg-accent hover:bg-accent-hover text-white font-medium rounded-md px-4 py-2 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Guardando…' : isLast ? '¡Crear personaje!' : 'Siguiente →'}
                  </button>
                </div>
                <p className="text-text-muted text-xs text-center mt-3">Podrás cambiarlo más tarde</p>
              </div>
            )
          })()}

          {/* COMPLETE */}
          {view === 'complete' && completedPlayer && (
            <div className="text-center">
              <div className="text-success text-3xl mb-2">✓</div>
              <h2 className="text-xl font-bold text-text-primary mb-1">¡Personaje listo!</h2>
              <p className="text-2xl font-bold text-accent mb-4">{completedPlayer.character_name}</p>

              <div className="flex justify-center gap-2 flex-wrap mb-2">
                {completedPlayer.positive_trait_1 && (
                  <span className="text-sm text-text-secondary bg-bg-secondary px-3 py-1 rounded-full">
                    {traitName(completedPlayer.positive_trait_1, posTraits)}
                  </span>
                )}
                {completedPlayer.positive_trait_2 && (
                  <span className="text-sm text-text-secondary bg-bg-secondary px-3 py-1 rounded-full">
                    {traitName(completedPlayer.positive_trait_2, posTraits)}
                  </span>
                )}
              </div>

              {completedPlayer.background && (
                <p className="text-text-muted text-sm mb-6">{bgName(completedPlayer.background)}</p>
              )}

              <p className="text-text-secondary text-sm">El evento comienza pronto. ¡Prepárate!</p>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
