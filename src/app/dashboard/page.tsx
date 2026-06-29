import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-text-secondary">Welcome, {user.email}</p>
    </main>
  )
}
