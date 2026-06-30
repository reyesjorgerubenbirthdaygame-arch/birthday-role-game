import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CharacterForm } from '@/components/character/CharacterForm'

export default async function CharacterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [
    { data: player },
    { data: positiveTraits },
    { data: negativeTraits },
    { data: backgrounds },
    { data: event },
  ] = await Promise.all([
    supabase.from('players').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('trait_options').select('*').eq('type', 'positive').order('name'),
    supabase.from('trait_options').select('*').eq('type', 'negative').order('name'),
    supabase.from('background_options').select('*').order('name'),
    supabase.from('event').select('event_start_at').single(),
  ])

  const isLocked = event ? new Date() >= new Date(event.event_start_at) : false

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-8">Tu personaje</h1>
        <CharacterForm
          player={player}
          userId={user.id}
          positiveTraits={positiveTraits ?? []}
          negativeTraits={negativeTraits ?? []}
          backgrounds={backgrounds ?? []}
          isLocked={isLocked}
        />
      </div>
    </main>
  )
}
