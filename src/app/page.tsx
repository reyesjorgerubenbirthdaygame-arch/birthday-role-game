'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const EVENT_DATE = new Date('2026-08-01T10:00:00Z') // Aug 1 at 12:00 Spain time (CEST = UTC+2)

type Mode = 'register' | 'login'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

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

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft)
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      })
      if (error) setError(error.message)
      else setMessage('Revisa tu correo para confirmar tu cuenta.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-8 gap-8">
      {/* Countdown section */}
      <div className="bg-bg-card rounded-lg p-8 w-full max-w-md shadow-md text-center">
        <p className="text-text-muted text-sm uppercase tracking-widest mb-4">El evento comienza en</p>
        {timeLeft ? (
          <div className="flex justify-center gap-6">
            {[
              { value: timeLeft.days, label: 'días' },
              { value: timeLeft.hours, label: 'horas' },
              { value: timeLeft.minutes, label: 'minutos' },
              { value: timeLeft.seconds, label: 'segundos' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-5xl font-bold text-accent tabular-nums">
                  {label === 'días' ? value : pad(value)}
                </span>
                <span className="text-text-muted text-xs mt-1 uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-2xl font-bold text-accent">¡El evento ha comenzado!</p>
        )}
      </div>

      {/* Auth form */}
      <div className="bg-bg-card rounded-lg p-8 w-full max-w-md shadow-md">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Birthday Role Game</h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMode('register')}
            className={`text-sm font-medium pb-1 border-b-2 ${mode === 'register' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'}`}
          >
            Registrarse
          </button>
          <button
            onClick={() => setMode('login')}
            className={`text-sm font-medium pb-1 border-b-2 ${mode === 'login' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'}`}
          >
            Iniciar sesión
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-bg-secondary text-text-primary border border-border rounded-md px-4 py-2 text-md focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-bg-secondary text-text-primary border border-border rounded-md px-4 py-2 text-md focus:outline-none focus:border-accent"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          {message && <p className="text-success text-sm">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-accent hover:bg-accent-hover text-white font-medium rounded-md px-4 py-2 text-md disabled:opacity-50"
          >
            {loading ? 'Cargando…' : mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </main>
  )
}
