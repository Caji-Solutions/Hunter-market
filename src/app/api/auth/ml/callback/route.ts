import { NextRequest, NextResponse } from 'next/server'

const ML_CLIENT_ID     = process.env.ML_CLIENT_ID!
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET!
const REDIRECT_URI     = process.env.ML_REDIRECT_URI!

// O ML redireciona para cá depois que o usuário autoriza o app
// GET /api/auth/ml/callback?code=XXX
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  // Usuário recusou o acesso
  if (error) {
    return NextResponse.redirect(
      new URL(`/?ml_auth=error&reason=${error}`, req.nextUrl.origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?ml_auth=error&reason=missing_code', req.nextUrl.origin)
    )
  }

  // Trocar o code pelo access_token
  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[ml/callback] Erro ao trocar code:', data)
      return NextResponse.redirect(
        new URL(`/?ml_auth=error&reason=${encodeURIComponent(data.message || 'token_error')}`, req.nextUrl.origin)
      )
    }

    // Salva o token em cookie seguro (HttpOnly) por 6h
    const response = NextResponse.redirect(
      new URL('/?ml_auth=success', req.nextUrl.origin)
    )

    const maxAge = (data.expires_in ?? 21600) - 300 // 5min de margem

    response.cookies.set('ml_access_token', data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    if (data.refresh_token) {
      response.cookies.set('ml_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 180, // 6 meses
        path: '/',
      })
    }

    if (data.user_id) {
      response.cookies.set('ml_user_id', String(data.user_id), {
        httpOnly: false, // acessível no frontend para exibir o usuário
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 180,
        path: '/',
      })
    }

    return response
  } catch (err) {
    console.error('[ml/callback] Exceção:', err)
    return NextResponse.redirect(
      new URL('/?ml_auth=error&reason=server_error', req.nextUrl.origin)
    )
  }
}
