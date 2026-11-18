export const usernamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$/
export function validUsername(value: unknown): value is string {
  return typeof value === 'string' && usernamePattern.test(value)
}
/** Account completion is independent of the onboarding questionnaire. */
export function needsAccountSetup(user: { app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> }) {
  const providers = user.app_metadata.providers
  const google = user.app_metadata.provider === 'google' || (Array.isArray(providers) && providers.includes('google'))
  return !validUsername(user.user_metadata.username) || (google && user.app_metadata.fitsync_credentials_ready !== true)
}
