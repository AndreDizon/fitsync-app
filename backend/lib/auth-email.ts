import { randomUUID } from 'node:crypto'

export const fitsyncSender = 'andredizon2004@gmail.com'
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

type EmailEvent = {
  user?: { email?: unknown }
  email_data?: { email_action_type?: unknown; token_hash?: unknown; token?: unknown }
}

/** Only a server-configured origin can receive a credential-bearing link. */
function appOrigin() {
  const url = new URL(process.env.AUTH_EMAIL_SITE_URL || '')
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && url.hostname === 'localhost'))) {
    throw new Error('Invalid email site configuration')
  }
  return url.origin
}

export function renderAuthEmail(input: unknown) {
  const event = input as EmailEvent | null
  const recipient = event?.user?.email
  const data = event?.email_data
  if (typeof recipient !== 'string' || recipient.length > 254 || !emailPattern.test(recipient) || !data) throw new Error('Invalid email event')
  const action = data.email_action_type
  const origin = appOrigin()
  let subject: string, title: string, description: string, button = '', href = '', code = ''
  switch (action) {
    case 'signup':
      subject = 'Confirm your FitSync email'
      title = 'Your next chapter starts here.'
      description = 'Confirm your email address to finish creating your FitSync account and start building your workout and nutrition routine.'
      button = 'Confirm email'
      break
    case 'recovery':
      subject = 'Reset your FitSync password'
      title = 'Get back to your routine.'
      description = 'We received a request to reset your FitSync password. Use the button below to choose a new password.'
      button = 'Reset password'
      break
    case 'reauthentication':
      subject = 'Your FitSync verification code'
      title = 'One more check. Then you\u2019re set.'
      description = 'Enter this verification code in FitSync to confirm your account security change.'
      if (typeof data.token !== 'string' || !/^\d{6,10}$/.test(data.token)) throw new Error('Invalid verification code')
      code = data.token
      break
    case 'password_changed_notification':
    case 'password_changed':
      subject = 'Your FitSync password was changed'
      title = 'Your password is updated.'
      description = 'Your FitSync password was changed. If this was not you, open FitSync directly and request a password reset immediately.'
      break
    default:
      // Never acknowledge an unsupported security action as if a message was sent.
      throw new Error('Unsupported email action')
  }
  if (button) {
    if (typeof data.token_hash !== 'string' || !/^[A-Za-z0-9_-]{16,512}$/.test(data.token_hash)) throw new Error('Invalid email token')
    const url = new URL('/auth/confirm', origin)
    url.searchParams.set('token_hash', data.token_hash)
    url.searchParams.set('type', action === 'recovery' ? 'recovery' : 'email')
    href = url.href
  }
  const security = action === 'signup'
    ? 'If you did not create a FitSync account, you can ignore this email.'
    : action === 'password_changed' || action === 'password_changed_notification'
      ? 'Never share your password or verification codes. FitSync will never ask for your Google password.'
      : 'If you did not request this, do not share this email or use its link or code. You can ignore the request.'
  const expiry = button || code ? 'For your security, this link or code expires. Request a new one in FitSync if it is no longer valid.' : ''
  const text = ['FitSync', 'Move. Fuel. Feel good.', title, description, code ? `Verification code: ${code}` : '', href ? `${button}: ${href}` : '', expiry, security, `Sent by FitSync from ${fitsyncSender}.`].filter(Boolean).join('\n\n')
  // Tables and inline CSS keep the same visual hierarchy in Gmail and mobile mail clients.
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;background:#f2f3f4;color:#25292b;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escape(subject)}. ${escape(description)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e3e5e7;border-radius:24px;overflow:hidden">
<tr><td style="padding:26px 28px;background:#25292b;border-bottom:6px solid #ffe135"><a href="${escape(origin)}" style="font-size:30px;font-weight:800;letter-spacing:-1px;text-decoration:none;color:#ffe135">FitSync</a><p style="margin:7px 0 0;font-size:13px;color:#fff">Move. Fuel. Feel good.</p></td></tr>
<tr><td style="padding:32px 28px"><h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;letter-spacing:-.8px">${escape(title)}</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.65">${escape(description)}</p>
${href ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ffe135" style="border:1px solid #d5b923;border-bottom:4px solid #c6aa20;border-radius:12px"><a href="${escape(href)}" style="display:inline-block;padding:15px 24px;color:#25292b;font-weight:700;font-size:16px;text-decoration:none">${escape(button)}</a></td></tr></table>` : ''}
${code ? `<p style="padding:20px;background:#fff8cf;border-radius:12px;font-size:30px;font-weight:700;letter-spacing:6px;text-align:center">${escape(code)}</p>` : ''}
${expiry ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.65;color:#50575d">${escape(expiry)}</p>` : ''}
<p style="margin:24px 0 0;padding:16px;background:#fff8cf;border-left:3px solid #f58b30;border-radius:8px;font-size:13px;line-height:1.65">${escape(security)}</p>
${href ? `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#50575d">Button not opening? Copy this link into your browser:<br><a href="${escape(href)}" style="color:#343c43;overflow-wrap:anywhere;word-break:break-all">${escape(href)}</a></p>` : ''}
</td></tr><tr><td style="padding:20px 28px;border-top:1px solid #e3e5e7;font-size:12px;line-height:1.7;color:#50575d">FitSync account security<br>Sent by FitSync from ${fitsyncSender}.</td></tr></table>
</td></tr></table></body></html>`
  return { recipient, subject, html, text }
}

export async function sendAuthEmail(message: ReturnType<typeof renderAuthEmail>, signal: AbortSignal) {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Gmail is not configured')
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  if (!tokenResponse.ok) throw new Error('Gmail authorization failed')
  const token = await tokenResponse.json()
  if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('Gmail authorization failed')
  const boundary = 'fitsync-' + randomUUID()
  const encodeBody = (body: string) => Buffer.from(body).toString('base64').match(/.{1,76}/g)!.join('\r\n')
  const raw = [
    `From: FitSync <${fitsyncSender}>`, `To: ${message.recipient}`,
    `Subject: =?UTF-8?B?${Buffer.from(message.subject).toString('base64')}?=`,
    'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encodeBody(message.text),
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encodeBody(message.html),
    `--${boundary}--`, '',
  ].join('\r\n')
  const sent = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(fitsyncSender)}/messages/send`, {
    method: 'POST', cache: 'no-store', signal,
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url') }),
  })
  if (!sent.ok) throw new Error('Gmail delivery failed')
}
