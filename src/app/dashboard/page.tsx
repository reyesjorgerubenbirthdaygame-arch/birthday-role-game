import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: player } = await supabase
    .from('players')
    .select('character_name, is_complete')
    .eq('user_id', user.id)
    .maybeSingle()

  const isComplete = player?.is_complete === true

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-8">
      <h1 className="text-3xl font-bold mb-2">Panel</h1>
      <p className="text-text-secondary mb-8">Bienvenido/a, {user.email}</p>

      <div className="max-w-lg">
        <div className="bg-bg-card border border-border rounded-md shadow-md p-6">
          <h2 className="text-xl font-semibold mb-1">Tu personaje</h2>

          {isComplete ? (
            <>
              <p className="text-text-secondary mb-4">
                Personaje creado:{' '}
                <span className="text-success font-medium">{player!.character_name}</span>
              </p>
              <Link
                href="/character"
                className="text-accent underline hover:text-accent-hover text-sm"
              >
                Editar personaje
              </Link>
            </>
          ) : (
            <>
              <p className="text-text-muted mb-4">
                Aún no has creado tu personaje. ¡Hazlo antes de que empiece el evento!
              </p>
              <Link
                href="/character"
                className="inline-block bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-md transition-colors"
              >
                Crear mi personaje →
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
