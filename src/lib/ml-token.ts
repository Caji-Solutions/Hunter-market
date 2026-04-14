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
