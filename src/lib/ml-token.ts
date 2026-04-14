import { cookies } from 'next/headers'

/**
 * Retorna o ML access token mais atualizado disponível.
 * Prioridade:
 *   1. Cookie ml_access_token (OAuth do usuário no browser)
 *   2. Variável ML_ACCESS_TOKEN do .env (token manual)
 *   3. null
 */
export async function getMLToken(): Promise<string | null> {
  try {
    const jar = await cookies()
    const fromCookie = jar.get('ml_access_token')?.value
    if (fromCookie) return fromCookie
  } catch { /* contexto sem cookies */ }

  const fromEnv = process.env.ML_ACCESS_TOKEN
  if (fromEnv) return fromEnv

  return null
}

export async function getMLRefreshToken(): Promise<string | null> {
  try {
    const jar = await cookies()
    return jar.get('ml_refresh_token')?.value ?? null
  } catch {
    return null
  }
}

export async function hasMLSession(): Promise<boolean> {
  try {
    const jar = await cookies()
    return !!jar.get('ml_access_token')?.value
  } catch {
    return false
  }
}

// ─── Cache em memória (persiste entre warm invocations no Vercel) ─────────────
let _serverTokenCache: { token: string; expiresAt: number } | null = null

/**
 * Obtém access token usando o ML_REFRESH_TOKEN armazenado no Vercel.
 * Permite que TODOS os usuários usem a API oficial sem precisar fazer login.
 * O dono do app configura ML_REFRESH_TOKEN uma vez e ele dura 6 meses.
 */
export async function getMLServerToken(): Promise<string | null> {
  // Retorna cache se ainda válido (com 5 min de margem)
  if (_serverTokenCache && Date.now() < _serverTokenCache.expiresAt - 300_000) {
    return _serverTokenCache.token
  }

  const refreshToken = process.env.ML_REFRESH_TOKEN
  const clientId     = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) return null

  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn('[ml-token] refresh_token expirou ou inválido:', res.status)
      return null
    }

    const data = await res.json()
    if (!data.access_token) return null

    _serverTokenCache = {
      token:     data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 21600) * 1000,
    }

    console.log('[ml-token] server token renovado via refresh_token')
    return _serverTokenCache.token
  } catch (err) {
    console.warn('[ml-token] Erro ao renovar server token:', err instanceof Error ? err.message : err)
    return null
  }
}
