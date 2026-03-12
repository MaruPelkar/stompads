import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold">Stompads</span>
        <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">Dashboard</a>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
