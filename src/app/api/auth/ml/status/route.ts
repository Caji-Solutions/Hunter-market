import { NextResponse } from 'next/server'
import { getMLToken, getMLServerToken } from '@/lib/ml-token'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/ml/status
 * Retorna o status da autenticação ML e o refresh_token (para configurar no Vercel).
 */
export async function GET() {
  const userToken   = await getMLToken()
  const serverToken = await getMLServerToken()

  let refreshToken: string | null = null
  try {
    const jar = await cookies()
    refreshToken = jar.get('ml_refresh_token')?.value ?? null
  } catch { /* ignorar */ }

  const hasServerRefresh = !!process.env.ML_REFRESH_TOKEN

  return NextResponse.json({
    status: {
      userOAuth:      !!userToken && !process.env.ML_ACCESS_TOKEN,
      serverToken:    !!serverToken,
      hasClientCreds: !!(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET),
      hasServerRefresh,
    },
    // Mostra o refresh_token do cookie para configurar no Vercel
    ...(refreshToken && {
      refresh_token: refreshToken,
      instructions: 'Copie o refresh_token acima e adicione como ML_REFRESH_TOKEN no Vercel → Settings → Environment Variables',
    }),
    ...(!refreshToken && !hasServerRefresh && {
      instructions: 'Clique em "Conectar ML" no site, faça login, depois acesse /api/auth/ml/status novamente para obter o refresh_token',
    }),
  })
}
