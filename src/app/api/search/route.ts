import { NextRequest, NextResponse } from 'next/server'
import { getMLToken, getMLAppToken } from '@/lib/ml-token'

// ─── Tipos ──────────────────────────────────────────────────────────────────
const COMMISSION: Record<string, number> = {
  gold_pro: 16, gold_premium: 16, gold_special: 12,
  gold: 12, silver: 10, bronze: 5, free: 0,
}

export interface GarimpoProduct {
  id: string
  title: string
  price: number
  image: string
  url: string
  brand: string
  rating: number | null
  reviewCount: number | null
  soldQuantity: number
  availableQuantity: number
  listingType: string
  freeShipping: boolean
  logisticType: string
  commissionPct: number
  score: number
  profitEstimate: number
  marginEstimate: number
}

// ─── Headers que simulam navegador para não ser bloqueado ─────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
}

// ─── Score de oportunidade (0-100) ───────────────────────────────────────────
function calcScore(p: {
  soldQuantity: number; price: number; freeShipping: boolean
  commissionPct: number; listingType: string; logisticType: string; margin: number
}): number {
  let score = 0

  if (p.soldQuantity > 50000) score += 35
  else if (p.soldQuantity > 10000) score += 30
  else if (p.soldQuantity > 5000)  score += 25
  else if (p.soldQuantity > 1000)  score += 20
  else if (p.soldQuantity > 500)   score += 15
  else if (p.soldQuantity > 100)   score += 10
  else if (p.soldQuantity > 10)    score += 5

  if (p.margin >= 35)      score += 25
  else if (p.margin >= 25) score += 20
  else if (p.margin >= 15) score += 12
  else if (p.margin >= 5)  score += 5

  if (p.price >= 50 && p.price <= 250)       score += 15
  else if (p.price >= 30 && p.price <= 400)  score += 10
  else if (p.price >= 15 && p.price <= 600)  score += 5

  if (p.logisticType === 'fulfillment') score += 10
  if (p.freeShipping)                   score += 5

  return Math.min(100, Math.max(0, score))
}

function buildProduct(p: {
  id: string; title: string; price: number; image: string; url: string
  rating: number | null; reviewCount: number | null; soldQuantity: number
  availableQuantity: number; listingType: string; freeShipping: boolean; logisticType: string
}): GarimpoProduct {
  const commissionPct = COMMISSION[p.listingType] ?? 12
  const estimatedCost = p.price * 0.35
  const commissionVal = p.price * (commissionPct / 100)
  const estimatedShipping = p.freeShipping ? 0 : 15
  const tax = p.price * 0.06
  const netProfit = p.price - estimatedCost - commissionVal - estimatedShipping - tax
  const marginEstimate = p.price > 0 ? (netProfit / p.price) * 100 : 0
  const score = calcScore({
    soldQuantity: p.soldQuantity, price: p.price, freeShipping: p.freeShipping,
    commissionPct, listingType: p.listingType, logisticType: p.logisticType,
    margin: marginEstimate,
  })
  return {
    id: p.id, title: p.title, price: p.price, image: p.image, url: p.url,
    brand: '', rating: p.rating, reviewCount: p.reviewCount,
    soldQuantity: p.soldQuantity, availableQuantity: p.availableQuantity,
    listingType: p.listingType, freeShipping: p.freeShipping, logisticType: p.logisticType,
    commissionPct, score, profitEstimate: netProfit, marginEstimate,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CAMINHO 1: API OFICIAL DO ML (quando autenticado via OAuth) ──────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface MLAPIResult {
  id: string
  title: string
  price: number
  thumbnail: string
  permalink: string
  listing_type_id: string
  available_quantity: number
  sold_quantity: number
  shipping: { free_shipping: boolean; logistic_type: string }
  reviews?: { rating_average: number; total: number }
  seller?: { id: number; nickname: string }
}

function fromAPIResult(r: MLAPIResult): GarimpoProduct {
  return buildProduct({
    id: r.id,
    title: r.title,
    price: r.price,
    image: (r.thumbnail ?? '').replace('http://', 'https://'),
    url: r.permalink ?? '',
    rating: r.reviews?.rating_average ?? null,
    reviewCount: r.reviews?.total ?? null,
    soldQuantity: r.sold_quantity ?? 0,
    availableQuantity: r.available_quantity ?? 0,
    listingType: r.listing_type_id ?? 'gold_special',
    freeShipping: r.shipping?.free_shipping ?? false,
    logisticType: r.shipping?.logistic_type ?? 'self_service',
  })
}

async function fetchMLAPIPage(
  token: string, keyword: string, offset: number
): Promise<{ items: GarimpoProduct[]; total: number; tokenInvalid: boolean }> {
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(keyword)}&limit=50&offset=${offset}`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    })
    if (res.status === 401 || res.status === 403) {
      console.warn('[ML API] Token inválido ou expirado', res.status)
      return { items: [], total: 0, tokenInvalid: true }
    }
    if (!res.ok) return { items: [], total: 0, tokenInvalid: false }
    const data = await res.json()
    return {
      items: (data.results ?? []).map(fromAPIResult),
      total: data.paging?.total ?? 0,
      tokenInvalid: false,
    }
  } catch (err) {
    console.error('[ML API] fetchMLAPIPage offset', offset, err instanceof Error ? err.message : err)
    return { items: [], total: 0, tokenInvalid: false }
  }
}

async function searchViaAPI(token: string, keyword: string, deep: boolean): Promise<GarimpoProduct[] | null> {
  if (deep) {
    const [r1, r2, r3] = await Promise.all([
      fetchMLAPIPage(token, keyword, 0),
      fetchMLAPIPage(token, keyword, 50),
      fetchMLAPIPage(token, keyword, 100),
    ])
    if (r1.tokenInvalid) return null // sinaliza fallback para scraping
    const seen = new Set<string>()
    const all: GarimpoProduct[] = []
    for (const item of [...r1.items, ...r2.items, ...r3.items]) {
      if (!seen.has(item.id)) { seen.add(item.id); all.push(item) }
    }
    return all
  } else {
    const { items, tokenInvalid } = await fetchMLAPIPage(token, keyword, 0)
    if (tokenInvalid) return null
    return items
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CAMINHO 2: WEB SCRAPING (fallback sem autenticação) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Extrai o JSON principal embutido na página de busca do ML ────────────────
// IMPORTANTE: O contador de chaves deve ser string-aware para evitar falsos positivos
// com { } dentro de strings JSON (ex: URLs com chaves escapadas)
function extractPageJson(html: string): unknown | null {
  const marker = '_n.ctx.r='
  const idx = html.indexOf(marker)
  if (idx === -1) return null

  const start = idx + marker.length
  let depth = 0, inString = false, escape = false, end = -1

  for (let i = start; i < Math.min(start + 3_000_000, html.length); i++) {
    const ch = html[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (!inString) {
      if (ch === '{' || ch === '[') depth++
      else if (ch === '}' || ch === ']') {
        depth--
        if (depth === 0) { end = i; break }
      }
    }
  }
  if (end === -1) return null

  try {
    return JSON.parse(html.slice(start, end + 1))
  } catch {
    return null
  }
}

// ─── Extrai o array de resultados do JSON da página ──────────────────────────
function extractResults(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>

  try {
    const results = (
      (d?.appProps as Record<string, unknown>)
      ?.pageProps as Record<string, unknown>
    )?.initialState as Record<string, unknown>
    const arr = results?.results
    if (Array.isArray(arr) && arr.length > 0) return arr
  } catch { /* ignorar */ }

  return findKey<unknown[]>(data, 'results') ?? []
}

function findKey<T>(obj: unknown, key: string, depth = 0): T | null {
  if (depth > 6) return null
  if (!obj || typeof obj !== 'object') return null
  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 5)) {
      const r = findKey<T>(item, key, depth + 1)
      if (r !== null) return r
    }
    return null
  }
  const record = obj as Record<string, unknown>
  if (key in record) return record[key] as T
  for (const v of Object.values(record)) {
    const r = findKey<T>(v, key, depth + 1)
    if (r !== null) return r
  }
  return null
}

interface PolyComponent {
  type: string
  title?: { text?: string }
  price?: { current_price?: { value?: number }; previous_price?: { value?: number } }
  shipping?: { text?: string; icon?: { key?: string; alt_text?: string }; values?: Array<{ key?: string; label?: { text?: string } }> }
  review_compacted?: { values?: Array<{ key: string; label?: { text?: string } }> }
  sold_and_available?: { values?: Array<{ key: string; label?: { text?: string } }> }
}

interface PolyPicture {
  pictures?: Array<{ id?: string }>
}

interface PolyMeta {
  id?: string
  url?: string
  category_id?: string
  domain_id?: string
}

interface PolyCard {
  metadata?: PolyMeta
  components?: PolyComponent[]
  pictures?: PolyPicture
}

interface ScrapedItem {
  id: string
  title: string
  price: number
  image: string
  url: string
  freeShipping: boolean
  logisticType: string
  rating: number | null
  soldQuantity: number
  availableQuantity: number
  categoryId: string
}

function parsePolycards(results: unknown[]): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  for (const r of results) {
    const entry = r as Record<string, unknown>
    if (entry.id !== 'POLYCARD') continue

    const poly = (entry.polycard ?? {}) as PolyCard
    const meta = poly.metadata ?? {}
    const components = poly.components ?? []
    const pictures = poly.pictures

    const id = meta.id
    if (!id?.startsWith('MLB') || seen.has(id)) continue
    seen.add(id)

    const titleComp  = components.find(c => c.type === 'title')
    const priceComp  = components.find(c => c.type === 'price')
    const shipComp   = components.find(c => c.type === 'shipping')
    const reviewComp = components.find(c => c.type === 'review_compacted')
    const soldComp   = components.find(c => c.type === 'sold_and_available')

    const title = titleComp?.title?.text ?? ''
    const price = priceComp?.price?.current_price?.value ?? 0
    if (!title || price === 0) continue

    const shippingText    = (shipComp?.shipping?.text ?? '').toLowerCase()
    const shippingIconKey = (shipComp?.shipping?.icon?.key ?? '').toLowerCase()
    const shippingIconAlt = (shipComp?.shipping?.icon?.alt_text ?? '').toLowerCase()
    const freeShipping    = shippingText.includes('grátis') || shippingText.includes('gratis') || shippingText.includes('free')
    const isFullML        = shippingIconKey.includes('full') || shippingIconAlt.includes('full') || shippingText.includes('full')
    const logisticType    = isFullML ? 'fulfillment' : 'self_service'

    const ratingVal = reviewComp?.review_compacted?.values?.find(v => v.key === 'label')
    const rating    = ratingVal?.label?.text ? parseFloat(ratingVal.label.text) : null

    let soldQuantity = 0
    if (soldComp?.sold_and_available?.values) {
      const soldLabel = soldComp.sold_and_available.values.find(v =>
        v.key?.includes('sold') || v.label?.text?.toLowerCase().includes('vendidos')
      )
      if (soldLabel?.label?.text) {
        const m = soldLabel.label.text.replace(/\./g, '').match(/(\d+)/)
        if (m) soldQuantity = parseInt(m[1], 10)
      }
    }

    const picId = pictures?.pictures?.[0]?.id
    const image = picId ? `https://http2.mlstatic.com/D_NQ_NP_${picId}-O.jpg` : ''

    const rawUrl = meta.url ?? ''
    const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`

    items.push({
      id, title, price, image, url,
      freeShipping, logisticType, rating,
      soldQuantity, availableQuantity: 0,
      categoryId: meta.category_id ?? '',
    })
  }

  return items
}

async function scrapeProductSoldQty(itemId: string): Promise<number> {
  const url = `https://produto.mercadolivre.com.br/${itemId.replace('MLB', 'MLB-')}`
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return 0
    const html = await res.text()
    const numbers: number[] = []
    const regex = /(\d[\d.]*)\+?\s*vendidos?/gi
    let m: RegExpExecArray | null
    while ((m = regex.exec(html)) !== null) {
      const n = parseInt(m[1].replace(/\./g, ''), 10)
      if (!isNaN(n)) numbers.push(n)
    }
    return numbers.length > 0 ? Math.max(...numbers) : 0
  } catch {
    return 0
  }
}

async function scrapeMLPage(keyword: string, offset: number): Promise<{ items: ScrapedItem[]; blocked: boolean }> {
  const slug = keyword.trim().replace(/\s+/g, '-')
  const url = offset === 0
    ? `https://lista.mercadolivre.com.br/${encodeURIComponent(slug)}`
    : `https://lista.mercadolivre.com.br/${encodeURIComponent(slug)}_Desde_${offset}_NoIndex_True`

  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) { console.error('[ML page]', res.status, url); return { items: [], blocked: false } }

    const finalUrl = res.url ?? ''
    const html = await res.text()

    if (finalUrl.includes('account-verification') || html.includes('account-verification')) {
      console.warn('[ML page] Bot detection ativado')
      return { items: [], blocked: true }
    }

    const data = extractPageJson(html)
    if (!data) return { items: [], blocked: false }

    return { items: parsePolycards(extractResults(data)), blocked: false }
  } catch (err) {
    console.error('[scrapeMLPage] offset', offset, err instanceof Error ? err.message : err)
    return { items: [], blocked: false }
  }
}

function toGarimpoProduct(item: ScrapedItem): GarimpoProduct {
  return buildProduct({
    id: item.id, title: item.title, price: item.price, image: item.image, url: item.url,
    rating: item.rating, reviewCount: null,
    soldQuantity: item.soldQuantity, availableQuantity: item.availableQuantity,
    listingType: 'gold_special', // estimativa padrão (scraping não expõe listingType)
    freeShipping: item.freeShipping, logisticType: item.logisticType,
  })
}

async function searchViaScraping(keyword: string, deep: boolean): Promise<{ products: GarimpoProduct[]; blocked: boolean }> {
  if (deep) {
    const [r1, r2, r3] = await Promise.all([
      scrapeMLPage(keyword, 0),
      scrapeMLPage(keyword, 49),
      scrapeMLPage(keyword, 98),
    ])
    if (r1.blocked) return { products: [], blocked: true }

    const seen = new Set<string>()
    const all: ScrapedItem[] = []
    for (const item of [...r1.items, ...r2.items, ...r3.items]) {
      if (!seen.has(item.id)) { seen.add(item.id); all.push(item) }
    }
    if (all.length === 0) return { products: [], blocked: false }

    // Busca sold_quantity para os top 25 sem dado
    const needSold = all.filter(i => i.soldQuantity === 0).slice(0, 25)
    if (needSold.length > 0) {
      const soldResults = await Promise.allSettled(needSold.map(i => scrapeProductSoldQty(i.id)))
      soldResults.forEach((r, idx) => {
        if (r.status === 'fulfilled') needSold[idx].soldQuantity = r.value
      })
    }

    return { products: all.map(toGarimpoProduct), blocked: false }
  } else {
    const { items, blocked } = await scrapeMLPage(keyword, 0)
    if (blocked) return { products: [], blocked: true }
    return { products: items.map(toGarimpoProduct), blocked: false }
  }
}

// ─── GET handler: diagnóstico de conexão ─────────────────────────────────────
export async function GET() {
  const token = await getMLToken()
  if (token) {
    try {
      const res = await fetch('https://api.mercadolibre.com/sites/MLB/search?q=fone-bluetooth&limit=1', {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        return NextResponse.json({ status: 'ok', message: 'API oficial do ML OK (autenticado)', strategy: 'ml-api-oauth' })
      }
    } catch { /* cai no scraping abaixo */ }
  }

  try {
    const { items, blocked } = await scrapeMLPage('fone-bluetooth', 0)
    if (blocked) {
      return NextResponse.json({ status: 'limited', message: 'ML ativou proteção anti-bot. Aguarde alguns minutos.' }, { status: 429 })
    }
    if (items.length === 0) {
      return NextResponse.json({ status: 'error', message: 'ML acessível mas sem produtos retornados' }, { status: 502 })
    }
    return NextResponse.json({ status: 'ok', message: 'Conexão com ML OK (scraping)', sampleProducts: items.length, strategy: 'web-scraping' })
  } catch (err) {
    return NextResponse.json({ status: 'error', message: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 502 })
  }
}

// ─── POST handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { keyword, deepSearch: doDeep = false, minPrice, maxPrice, minScore } = await req.json()

    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'Palavra-chave é obrigatória' }, { status: 400 })
    }

    const cleanKeyword = keyword.trim()

    // Prioridade: token do usuário (OAuth) > app token (client_credentials) > scraping
    const userToken = await getMLToken()
    const token = userToken ?? await getMLAppToken()

    let products: GarimpoProduct[] = []
    let strategy = 'scraping'

    // ── Tenta API oficial (usuário autenticado ou app token) ───────────────
    if (token) {
      const apiResult = await searchViaAPI(token, cleanKeyword, doDeep)
      if (apiResult !== null) {
        products = apiResult
        strategy = userToken ? 'ml-api-oauth' : 'ml-api-app'
      }
      // Se token inválido, cai no scraping abaixo
    }

    // ── Fallback: scraping (sem credenciais ou API falhou) ────────────────
    if (products.length === 0 && strategy === 'scraping') {
      const { products: scraped, blocked } = await searchViaScraping(cleanKeyword, doDeep)
      if (blocked) {
        return NextResponse.json({
          error: 'O Mercado Livre bloqueou a busca. Configure ML_CLIENT_ID e ML_CLIENT_SECRET no Vercel para resolver definitivamente.',
        }, { status: 429 })
      }
      products = scraped
    }

    if (products.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto encontrado. Tente uma palavra-chave diferente.' }, { status: 404 })
    }

    // ── Filtros de preço e score ──────────────────────────────────────────
    let filtered = products.filter(p => {
      if (minPrice && p.price < minPrice) return false
      if (maxPrice && p.price > maxPrice) return false
      return true
    })
    if (minScore) filtered = filtered.filter(p => p.score >= minScore)

    filtered.sort((a, b) => b.score - a.score)

    const avgScore        = filtered.length > 0 ? Math.round(filtered.reduce((s, p) => s + p.score, 0) / filtered.length) : 0
    const topScore        = filtered[0]?.score ?? 0
    const withSales       = filtered.filter(p => p.soldQuantity > 0).length
    const withFulfillment = filtered.filter(p => p.logisticType === 'fulfillment').length

    return NextResponse.json({
      keyword: cleanKeyword,
      deepSearch: doDeep,
      total: filtered.length,
      rawCount: products.length,
      enrichedCount: filtered.length,
      strategy,
      stats: { avgScore, topScore, withSales, withFulfillment },
      products: filtered,
    })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Erro interno ao garimpar produtos' }, { status: 500 })
  }
}
