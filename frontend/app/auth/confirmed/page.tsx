import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import { SignupConfirmed } from '@/components/signup-confirmation'

export default async function ConfirmedPage() {
  const client = await authClient()
  const user = client ? (await client.auth.getUser()).data.user : null
  if (!user?.email_confirmed_at) redirect('/login')
  return <SignupConfirmed />
}
