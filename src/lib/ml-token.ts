import { cookies } from 'next/headers'

/**
 * Retorna o ML access token mais atualizado disponível.
 * Prioridade:
 *   1. Cookie ml_access_token (OAuth Authorization Code — token do usuário)
 *   2. Variável de ambiente ML_ACCESS_TOKEN (token manual do .env.local)
 *   3. null (sem token configurado)
 */
export async function getMLToken(): Promise<string | null> {
  // 1) Cookie do fluxo OAuth (usuário autenticou via /api/auth/ml)
  try {
    const jar = await cookies()
    const fromCookie = jar.get('ml_access_token')?.value
    if (fromCookie) return fromCookie
  } catch {
    // Em contextos sem cookies (ex: cron jobs), ignora silenciosamente
  }

  // 2) Token do .env.local (fallback manual)
  const fromEnv = process.env.ML_ACCESS_TOKEN
  if (fromEnv) return fromEnv

  return null
}

/**
 * Retorna o refresh token do usuário (cookie), se existir.
 */
export async function getMLRefreshToken(): Promise<string | null> {
  try {
    const jar = await cookies()
    return jar.get('ml_refresh_token')?.value ?? null
  } catch {
    return null
  }
}

/**
 * Verifica se o usuário tem uma sessão ML ativa (cookie presente).
 */
export async function hasMLSession(): Promise<boolean> {
  try {
    const jar = await cookies()
    return !!jar.get('ml_access_token')?.value
  } catch {
    return false
  }
}

// ─── App Token (Client Credentials) ─────────────────────────────────────────
// Token de aplicação — não requer login do usuário.
// Permite acessar a API pública do ML (busca, produtos) de qualquer servidor.
// Cache em memória: persiste durante warm invocations no Vercel.

let _appTokenCache: { token: string; expiresAt: number } | null = null

/**
 * Retorna um token de aplicação via Client Credentials.
 * Não requer login do usuário — ideal para buscas server-side em produção.
 * Retorna null se ML_CLIENT_ID ou ML_CLIENT_SECRET não estiverem configurados.
 */
export async function getMLAppToken(): Promise<string | null> {
  // Retorna do cache se ainda válido (margem de 5 min)
  if (_appTokenCache && Date.now() < _appTokenCache.expiresAt - 300_000) {
    return _appTokenCache.token
  }

  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn('[ml-token] client_credentials falhou:', res.status)
      return null
    }

    const data = await res.json()
    if (!data.access_token) return null

    _appTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 21600) * 1000,
    }

    return _appTokenCache.token
  } catch (err) {
    console.warn('[ml-token] Erro ao buscar app token:', err instanceof Error ? err.message : err)
    return null
  }
}
