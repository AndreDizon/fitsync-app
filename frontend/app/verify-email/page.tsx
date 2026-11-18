import { redirect } from 'next/navigation'
import { readEmailVerification } from '@/lib/auth/email-verification'
import { AuthScreen } from '@/components/auth-screen'

export default async function VerifyEmailPage() {
  const pending = await readEmailVerification()
  if (!pending) redirect('/forgot-password?error=link')
  return <AuthScreen mode="verify" configured verifiedEmail={pending.email} verificationKind={pending.kind} />
}
