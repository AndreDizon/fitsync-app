import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import Dashboard from '@/components/dashboard'
import { currentTester } from '@/lib/auth/tester'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (await currentTester()) return <Dashboard userName="Test Admin" userEmail={process.env.DEV_TEST_ADMIN_EMAIL!} />
  const client = await authClient()
  if (!client) redirect('/login')
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login')
  return <Dashboard userName={String(user.user_metadata.display_name || user.user_metadata.full_name || 'You')} userEmail={user.email ?? ''} />
}
