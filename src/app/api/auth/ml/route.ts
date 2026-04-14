import { NextRequest, NextResponse } from 'next/server'

const ML_CLIENT_ID     = process.env.ML_CLIENT_ID!
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET!
const REDIRECT_URI     = process.env.ML_REDIRECT_URI!

// GET → retorna a URL de autorização OAuth do ML
export async function GET() {
  if (!ML_CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.json(
      { error: 'ML_CLIENT_ID e ML_REDIRECT_URI não configurados no .env.local' },
      { status: 500 }
    )
  }

  const url = new URL('https://auth.mercadolivre.com.br/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', ML_CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)

  return NextResponse.json({ authUrl: url.toString() })
}

// POST → troca o code por access_token + refresh_token
export async function POST(req: NextRequest) {
  const { code, refresh_token } = await req.json()

  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET || !REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Credenciais ML não configuradas no .env.local' },
      { status: 500 }
    )
  }

  // Refresh token flow
  if (refresh_token && !code) {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        refresh_token,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || 'Falha ao renovar token' },
        { status: 400 }
      )
    }
    return NextResponse.json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in,
      user_id:       data.user_id,
    })
  }

  // Authorization code flow
  if (!code) {
    return NextResponse.json({ error: 'code ou refresh_token é obrigatório' }, { status: 400 })
  }

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
    return NextResponse.json(
      { error: data.message || 'Falha na autenticação ML' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_in:    data.expires_in,
    user_id:       data.user_id,
  })
}
