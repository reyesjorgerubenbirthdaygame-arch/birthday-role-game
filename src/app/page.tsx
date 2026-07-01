'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { TraitOption, BackgroundOption } from '@/lib/types/database'
import CharacterWidget from '@/components/CharacterWidget'

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
  positive_trait_3?: string
}

interface PlayerRecord extends CharacterData {
  is_complete: boolean
  positive_trait_3?: string
}

const STEPS = [
  {
    key: '' as const,
    title: '¿Quién serás?',
    hint: 'La herencia del tio George está por decidirse',
    type: 'intro' as const,
    body: 'En este concurso tendrás que encarnar un personaje y disfrazarte como él el día del evento. Puede ser alguien real o imaginario, un héroe, una figura histórica, un personaje de ficción... ¡tú decides!',
  },
  {
    key: '' as const,
    title: 'Tu personaje',
    hint: '',
    type: 'intro' as const,
    body: 'Además del personaje (disfraz) escogido, tendrás que dar un poco de profundidad a tu protagonista. Escoger un par de puntos fuertes, débiles y un pasado. Estas características influirán en el concurso, pero tú decides si las escoges para crear un personaje interesante o desde un punto de vista estratégico. Lo importante es que la decisión es tuya, puedes reescribir la historia, ¿Quién dijo que Blancanieves no puede ser intimidante?',
  },
  {
    key: 'character_name',
    title: 'Nombra a tu personaje',
    hint: 'Dale un nombre a tu héroe',
    type: 'text' as const,
    placeholder: 'ej. Aria Sombrascura',
  },
  {
    key: 'positive_trait_1',
    title: 'Primera virtud',
    hint: 'Algo de lo que puedes estar orgulloso',
    type: 'select_positive' as const,
  },
  {
    key: 'positive_trait_2',
    title: 'Segunda virtud',
    hint: 'Venga te dejo otra más pero no te vengas arriba...',
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
    hint: 'Piensa en la historia que vas a contar y asegurate que es buena, luego tendrás que ser convincente de que todas las piezas cuadran.',
    type: 'select_background' as const,
  },
]

export default function HomePage() {
  const [view, setView] = useState<View>('loading')
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
  const [curiosoUnlocked, setCuriosoUnlocked] = useState(false)

  // Countdown ticker
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auth state listener — rely solely on onAuthStateChange (fires INITIAL_SESSION
  // immediately with the current session from cookies, avoiding a race with getSession())
  useEffect(() => {
    const supabase = createClient()

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
          supabase.from('trait_options').select('id, name').eq('type', 'positive').eq('is_selectable', true).order('name'),
          supabase.from('trait_options').select('id, name').eq('type', 'negative').eq('is_selectable', true).order('name'),
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
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

  async function handleCuriosoUnlocked() {
    if (curiosoUnlocked || !user) return
    setCuriosoUnlocked(true)
    const supabase = createClient()
    const { data: trait } = await supabase
      .from('trait_options')
      .select('id')
      .eq('name', 'Curioso')
      .single()
    if (trait) {
      await supabase.from('players').upsert({
        user_id: user.id,
        positive_trait_3: trait.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      setCompletedPlayer(prev => prev ? { ...prev, positive_trait_3: trait.id } : prev)
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

        {/* Countdown — shown unless in building view */}
        {view === 'building' ? (
          <CharacterWidget onEasterEggUnlocked={handleCuriosoUnlocked} />
        ) : (
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
        )}

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
                  <div className="text-xs text-text-muted mb-2">
                    <span>Paso {step + 1} de {STEPS.length}</span>
                  </div>
                  <div style={{ paddingLeft: '5%', paddingRight: '12%' }}>
                  <svg
                    className="w-full"
                    viewBox="0 0 1900 240"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <clipPath id="progress-clip">
                        <rect x="0" y="-10" width={`${progress}%`} height="240" style={{ transition: 'width 0.5s ease' }} />
                      </clipPath>
                    </defs>
                    {/* Track — full dashed path, always visible, dimmed */}
                    <path
                      d="M2.5 164.94C130 85 257 6 303 2.5 349 -1 228 122 277 143 326 164 506 116 596 128 686 140 743 221 816 216 889 211 944 116 1036 98 1128 80 1285 118 1370 109 1455 100 1485 48 1546 46 1606 44 1669 69 1732.5 94"
                      fill="none"
                      stroke="#2a2a3e"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="27.5 20.625"
                    />
                    {/* Active — same dashed path, clipped to progress width */}
                    <path
                      d="M2.5 164.94C130 85 257 6 303 2.5 349 -1 228 122 277 143 326 164 506 116 596 128 686 140 743 221 816 216 889 211 944 116 1036 98 1128 80 1285 118 1370 109 1455 100 1485 48 1546 46 1606 44 1669 69 1732.5 94"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="27.5 20.625"
                      clipPath="url(#progress-clip)"
                      style={{ transition: 'clip-path 0.5s ease' }}
                    />
                    {/* Flag icon at end of path */}
                    <g transform="translate(1750, -22) scale(2)">
                      <path
                        d="M14.678 57.95 1.068-.298a1.931 1.931 0 0 0 1.34-2.38L4.878 11.585a2.414 2.414 0 0 0-2.975-1.675l-.138.038A2.414 2.414 0 0 0 .09 12.922L12.299 56.61a1.931 1.931 0 0 0 2.379 1.34zM57.67 27.42a46.256 46.256 0 0 1-10.64-7.32.95.95 0 0 1-.27-.97A136.854 136.854 0 0 0 50.27.95c.12-1.02-.43-1.32-1.01-.62-11.38 13.61-31.07-2.49-42.79 9.88.14.263.251.542.33.83l7.92 28.36c11.74-12.22 31.36 3.78 42.72-9.8.58-.7.69-1.98.23-2.18z"
                        fill="#7c3aed"
                      />
                    </g>
                  </svg>
                  </div>
                </div>

                {/* Step content */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-text-primary mb-1">{s.title}</h2>
                  <p className="text-text-muted text-sm mb-5">{s.hint}</p>

                  {s.type === 'intro' ? (
                    <p className="text-text-secondary text-base leading-relaxed">
                      {s.body ?? 'En este concurso tendrás que encarnar un personaje y disfrazarte como él el día del evento. Puede ser alguien real o imaginario, un héroe, una figura histórica, un personaje de ficción... ¡tú decides!'}
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
                <p className="text-text-muted text-xs text-center mt-3">
                  {completedPlayer ? 'Los cambios reemplazarán tu personaje guardado' : 'Podrás cambiarlo más tarde'}
                </p>
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
                {completedPlayer.positive_trait_3 && (
                  <span className="text-sm text-accent bg-bg-secondary border border-accent/30 px-3 py-1 rounded-full">
                    ✨ Curioso/a
                  </span>
                )}
              </div>

              <div className="flex justify-center gap-2 flex-wrap mb-4">
                {completedPlayer.negative_trait_1 && (
                  <span className="text-sm text-white bg-negative px-3 py-1 rounded-full">
                    {traitName(completedPlayer.negative_trait_1, negTraits)}
                  </span>
                )}
                {completedPlayer.negative_trait_2 && (
                  <span className="text-sm text-white bg-negative px-3 py-1 rounded-full">
                    {traitName(completedPlayer.negative_trait_2, negTraits)}
                  </span>
                )}
              </div>

              {completedPlayer.background && (
                <p className="text-text-muted text-sm mb-6">{bgName(completedPlayer.background)}</p>
              )}

              <p className="text-text-secondary text-sm">El evento comienza pronto. ¡Prepárate!</p>
              <button
                onClick={() => { setStep(0); setView('building') }}
                className="mt-4 text-sm text-text-muted hover:text-text-secondary underline underline-offset-2 transition-colors"
              >
                Cambiar el personaje?
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
