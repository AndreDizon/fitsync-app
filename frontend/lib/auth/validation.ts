export const passwordLimits = { min: 12, max: 128 } as const
export type AuthField = 'name' | 'email' | 'password' | 'confirmPassword'
export type FieldErrors = Partial<Record<AuthField, string>>
export const formText = (form: FormData, key: string) => { const value = form.get(key); return typeof value === 'string' ? value : '' }
export const emailFrom = (form: FormData) => formText(form, 'email').trim().toLowerCase()
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
export function newPasswordErrors(password: string, confirmation: string): FieldErrors {
  if (password.length < passwordLimits.min || password.length > passwordLimits.max) return { password: `Use ${passwordLimits.min}–${passwordLimits.max} characters.` }
  if (password !== confirmation) return { confirmPassword: 'Passwords must match.' }
  return {}
}
