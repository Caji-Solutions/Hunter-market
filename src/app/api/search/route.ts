import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// ─── Tipos ────────────────────────────────────────────────────────────────────
const COMMISSION: Record<string, number> = {
  gold_pro: 16, gold_premium: 16, gold_special: 12,
  gold: 12, silver: 10, bronze: 5, free: 0,
}

export type Platform = 'mercadolivre' | 'shopee' | 'aliexpress'

export interface GarimpoProduct {
  id: string
  title: string
  price: number
  image: string
  url: string
  brand: string
  platform: Platform
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

// ─── Headers para simular browser ─────────────────────────────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
}

// ─── Score de oportunidade ────────────────────────────────────────────────────
function calcScore(p: {
  soldQuantity: number; price: number; freeShipping: boolean
  commissionPct: number; logisticType: string; margin: number
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

  if (p.price >= 50 && p.price <= 250)      score += 15
  else if (p.price >= 30 && p.price <= 400) score += 10
  else if (p.price >= 15 && p.price <= 600) score += 5

  if (p.logisticType === 'fulfillment') score += 10
  if (p.freeShipping)                   score += 5

  return Math.min(100, Math.max(0, score))
}

function buildMLProduct(p: {
  id: string; title: string; price: number; image: string; url: string
  rating: number | null; reviewCount: number | null; soldQuantity: number
  availableQuantity: number; listingType: string; freeShipping: boolean; logisticType: string
}): GarimpoProduct {
  const commissionPct   = COMMISSION[p.listingType] ?? 12
  const estimatedCost   = p.price * 0.35
  const commissionVal   = p.price * (commissionPct / 100)
  const estimatedShipping = p.freeShipping ? 0 : 15
  const tax             = p.price * 0.06
  const netProfit       = p.price - estimatedCost - commissionVal - estimatedShipping - tax
  const marginEstimate  = p.price > 0 ? (netProfit / p.price) * 100 : 0
  const score = calcScore({
    soldQuantity: p.soldQuantity, price: p.price, freeShipping: p.freeShipping,
    commissionPct, logisticType: p.logisticType, margin: marginEstimate,
  })
  return {
    id: p.id, title: p.title, price: p.price, image: p.image, url: p.url,
    brand: '', platform: 'mercadolivre', rating: p.rating, reviewCount: p.reviewCount,
    soldQuantity: p.soldQuantity, availableQuantity: p.availableQuantity,
    listingType: p.listingType, freeShipping: p.freeShipping, logisticType: p.logisticType,
    commissionPct, score, profitEstimate: netProfit, marginEstimate,
  }
}

// Para Shopee/AliExpress: produto de fornecimento — calcula margem de revenda no ML
function buildSourceProduct(p: {
  id: string; title: string; sourcePrice: number; image: string; url: string
  rating: number | null; reviewCount: number | null; soldQuantity: number
  freeShipping: boolean; platform: Platform
}): GarimpoProduct {
  const price = p.sourcePrice
  // Estima preço de venda no ML baseado no preço de compra
  const multiplier = price < 20 ? 3.5 : price < 50 ? 3.0 : price < 100 ? 2.5 : 2.0
  const mlPrice         = price * multiplier
  const commissionPct   = 12
  const commissionVal   = mlPrice * 0.12
  const shippingCost    = p.freeShipping ? 0 : 18
  const tax             = mlPrice * 0.06
  const netProfit       = mlPrice - price - commissionVal - shippingCost - tax
  const marginEstimate  = mlPrice > 0 ? (netProfit / mlPrice) * 100 : 0
  const score = calcScore({
    soldQuantity: p.soldQuantity, price: mlPrice, freeShipping: p.freeShipping,
    commissionPct, logisticType: 'self_service', margin: marginEstimate,
  })
  return {
    id: p.id, title: p.title, price, image: p.image, url: p.url,
    brand: '', platform: p.platform, rating: p.rating, reviewCount: p.reviewCount,
    soldQuantity: p.soldQuantity, availableQuantity: 0,
    listingType: 'gold_special', freeShipping: p.freeShipping, logisticType: 'self_service',
    commissionPct, score, profitEstimate: Math.round(netProfit * 100) / 100,
    marginEstimate: Math.round(marginEstimate * 10) / 10,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MERCADO LIVRE: Scraping ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

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
      else if (ch === '}' || ch === ']') { depth--; if (depth === 0) { end = i; break } }
    }
  }
  if (end === -1) return null
  try { return JSON.parse(html.slice(start, end + 1)) } catch { return null }
}

function extractResults(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>
  try {
    const results = ((d?.appProps as Record<string, unknown>)?.pageProps as Record<string, unknown>)?.initialState as Record<string, unknown>
    const arr = results?.results
    if (Array.isArray(arr) && arr.length > 0) return arr
  } catch { /* ignorar */ }
  return findKey<unknown[]>(data, 'results') ?? []
}

function findKey<T>(obj: unknown, key: string, depth = 0): T | null {
  if (depth > 6 || !obj || typeof obj !== 'object') return null
  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 5)) { const r = findKey<T>(item, key, depth + 1); if (r !== null) return r }
    return null
  }
  const record = obj as Record<string, unknown>
  if (key in record) return record[key] as T
  for (const v of Object.values(record)) { const r = findKey<T>(v, key, depth + 1); if (r !== null) return r }
  return null
}

interface PolyComponent {
  type: string
  title?: { text?: string }
  price?: { current_price?: { value?: number } }
  shipping?: { text?: string; icon?: { key?: string; alt_text?: string } }
  review_compacted?: { values?: Array<{ key: string; label?: { text?: string } }> }
  sold_and_available?: { values?: Array<{ key: string; label?: { text?: string } }> }
}

interface PolyCard {
  metadata?: { id?: string; url?: string; category_id?: string }
  components?: PolyComponent[]
  pictures?: { pictures?: Array<{ id?: string }> }
}

interface ScrapedMLItem {
  id: string; title: string; price: number; image: string; url: string
  freeShipping: boolean; logisticType: string; rating: number | null; soldQuantity: number
}

function parsePolycards(results: unknown[]): ScrapedMLItem[] {
  const items: ScrapedMLItem[] = []
  const seen = new Set<string>()
  for (const r of results) {
    const entry = r as Record<string, unknown>
    if (entry.id !== 'POLYCARD') continue
    const poly = (entry.polycard ?? {}) as PolyCard
    const meta = poly.metadata ?? {}
    const components = poly.components ?? []
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
    const picId = poly.pictures?.pictures?.[0]?.id
    const image = picId ? `https://http2.mlstatic.com/D_NQ_NP_${picId}-O.jpg` : ''
    const rawUrl = meta.url ?? ''
    const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    items.push({ id, title, price, image, url, freeShipping, logisticType, rating, soldQuantity })
  }
  return items
}

async function scrapeMLPage(keyword: string, offset: number): Promise<{ items: ScrapedMLItem[]; blocked: boolean }> {
  const slug = keyword.trim().replace(/\s+/g, '-')
  const url = offset === 0
    ? `https://lista.mercadolivre.com.br/${encodeURIComponent(slug)}`
    : `https://lista.mercadolivre.com.br/${encodeURIComponent(slug)}_Desde_${offset}_NoIndex_True`
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15000), redirect: 'follow' })
    if (!res.ok) return { items: [], blocked: false }
    const finalUrl = res.url ?? ''
    const html = await res.text()
    if (finalUrl.includes('account-verification') || html.includes('account-verification'))
      return { items: [], blocked: true }
    const data = extractPageJson(html)
    if (!data) return { items: [], blocked: false }
    return { items: parsePolycards(extractResults(data)), blocked: false }
  } catch (err) {
    console.error('[ML scrape] offset', offset, err instanceof Error ? err.message : err)
    return { items: [], blocked: false }
  }
}

async function scrapeProductSoldQty(itemId: string): Promise<number> {
  const url = `https://produto.mercadolivre.com.br/${itemId.replace('MLB', 'MLB-')}`
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) })
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
  } catch { return 0 }
}

async function searchML(keyword: string, deep: boolean): Promise<{ products: GarimpoProduct[]; blocked: boolean }> {
  if (deep) {
    const [r1, r2, r3] = await Promise.all([
      scrapeMLPage(keyword, 0), scrapeMLPage(keyword, 49), scrapeMLPage(keyword, 98),
    ])
    if (r1.blocked) return { products: [], blocked: true }
    const seen = new Set<string>()
    const all: ScrapedMLItem[] = []
    for (const item of [...r1.items, ...r2.items, ...r3.items]) {
      if (!seen.has(item.id)) { seen.add(item.id); all.push(item) }
    }
    if (all.length === 0) return { products: [], blocked: false }
    const needSold = all.filter(i => i.soldQuantity === 0).slice(0, 25)
    if (needSold.length > 0) {
      const results = await Promise.allSettled(needSold.map(i => scrapeProductSoldQty(i.id)))
      results.forEach((r, idx) => { if (r.status === 'fulfilled') needSold[idx].soldQuantity = r.value })
    }
    return { products: all.map(i => buildMLProduct({ ...i, reviewCount: null, availableQuantity: 0, listingType: 'gold_special' })), blocked: false }
  } else {
    const { items, blocked } = await scrapeMLPage(keyword, 0)
    if (blocked) return { products: [], blocked: true }
    return { products: items.map(i => buildMLProduct({ ...i, reviewCount: null, availableQuantity: 0, listingType: 'gold_special' })), blocked: false }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SHOPEE: Scraping via Googlebot (SSR JSON-LD) ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

function parseScriptJsonLD(html: string): unknown[] {
  const results: unknown[] = []
  const regex = /<script[^>]*>([\s\S]*?)<\/script>/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    const content = m[1].trim()
    if (!content.startsWith('{')) continue
    try {
      results.push(JSON.parse(content))
    } catch { /* ignorar */ }
  }
  return results
}

async function fetchShopeeProductData(url: string): Promise<GarimpoProduct | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': GOOGLEBOT_UA, 'Accept': 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    for (const data of parseScriptJsonLD(html)) {
      const d = data as Record<string, unknown>
      if (d['@type'] !== 'Product') continue
      const offersObj = (d.offers as Record<string, unknown>) ?? {}
      // Shopee usa "Offer" (price) ou "AggregateOffer" (lowPrice) dependendo do produto
      const price = parseFloat(String(offersObj.price ?? offersObj.lowPrice ?? offersObj.highPrice ?? 0))
      if (!price || price <= 0 || price > 50000) continue
      const rating = parseFloat(String((d.aggregateRating as Record<string, unknown>)?.ratingValue ?? 0)) || null
      const reviewCount = parseInt(String((d.aggregateRating as Record<string, unknown>)?.ratingCount ?? 0), 10) || null
      const idMatch = url.match(/i\.(\d+)\.(\d+)/)
      const id = idMatch ? `shopee-${idMatch[1]}-${idMatch[2]}` : `shopee-${Math.random().toString(36).slice(2)}`
      return buildSourceProduct({
        id, title: String(d.name ?? '').trim(), sourcePrice: price,
        image: String(d.image ?? ''), url: String(d.url ?? url),
        rating: rating && rating > 0 ? Math.min(5, rating) : null,
        reviewCount: reviewCount && reviewCount > 0 ? reviewCount : null,
        soldQuantity: 0, freeShipping: false, platform: 'shopee',
      })
    }
    return null
  } catch { return null }
}

async function searchShopee(keyword: string, deep: boolean): Promise<GarimpoProduct[]> {
  const limit = deep ? 15 : 8
  try {
    // 1. Busca na página de resultados com Googlebot (Shopee entrega SSR com JSON-LD)
    const searchUrl = `https://shopee.com.br/search?keyword=${encodeURIComponent(keyword)}&sortBy=sales`
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': GOOGLEBOT_UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return []
    const html = await res.text()

    // 2. Extrai URLs de produtos do JSON-LD (ItemList + Product featured)
    const productUrls: string[] = []
    const seen = new Set<string>()
    for (const data of parseScriptJsonLD(html)) {
      const d = data as Record<string, unknown>
      if (d['@type'] === 'Product' && typeof d.url === 'string') {
        if (!seen.has(d.url)) { seen.add(d.url); productUrls.unshift(d.url) }
      } else if (d['@type'] === 'ItemList' && Array.isArray(d.itemListElement)) {
        for (const item of d.itemListElement as Record<string, unknown>[]) {
          if (typeof item.url === 'string' && !seen.has(item.url)) {
            seen.add(item.url); productUrls.push(item.url)
          }
        }
      }
    }
    if (productUrls.length === 0) return []

    // 3. Busca páginas de produto em paralelo para obter preços
    const toFetch = productUrls.slice(0, limit)
    const settled = await Promise.allSettled(toFetch.map(url => fetchShopeeProductData(url)))
    return settled.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : [])
  } catch (err) {
    console.error('[Shopee]', err instanceof Error ? err.message : err)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ALIEXPRESS: Bloqueado por CAPTCHA server-side ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchAliExpress(_keyword: string, _deep: boolean): Promise<GarimpoProduct[]> {
  // AliExpress bloqueia todas as requisições server-side com CAPTCHA/bot detection.
  // Requer navegador com JavaScript para funcionar.
  return []
}


// ─── GET handler: health check ────────────────────────────────────────────────
export async function GET() {
  try {
    const { items, blocked } = await scrapeMLPage('fone-bluetooth', 0)
    if (blocked) return NextResponse.json({ status: 'limited', message: 'ML anti-bot ativado.' }, { status: 429 })
    if (items.length === 0) return NextResponse.json({ status: 'error', message: 'ML sem produtos' }, { status: 502 })
    return NextResponse.json({ status: 'ok', strategy: 'scraping', sampleCount: items.length })
  } catch (err) {
    return NextResponse.json({ status: 'error', message: err instanceof Error ? err.message : 'Erro' }, { status: 502 })
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { keyword, deepSearch: doDeep = false, platform = 'mercadolivre', minPrice, maxPrice, minScore } = await req.json()

    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'Palavra-chave é obrigatória' }, { status: 400 })
    }

    const q = keyword.trim()
    let products: GarimpoProduct[] = []
    const platforms: Record<Platform, number> = { mercadolivre: 0, shopee: 0, aliexpress: 0 }

    if (platform === 'mercadolivre') {
      const { products: ml, blocked } = await searchML(q, doDeep)
      if (blocked) {
        return NextResponse.json({ error: 'Busca bloqueada pelo Mercado Livre. Tente novamente em alguns minutos.' }, { status: 429 })
      }
      products = ml
      platforms.mercadolivre = ml.length

    } else if (platform === 'shopee') {
      const shopee = await searchShopee(q, doDeep)
      products = shopee
      platforms.shopee = shopee.length

    } else if (platform === 'aliexpress') {
      const ali = await searchAliExpress(q, doDeep)
      products = ali
      platforms.aliexpress = ali.length

    } else if (platform === 'todos') {
      const [mlResult, shopeeResult, aliResult] = await Promise.allSettled([
        searchML(q, doDeep),
        searchShopee(q, doDeep),
        searchAliExpress(q, doDeep),
      ])

      if (mlResult.status === 'fulfilled' && !mlResult.value.blocked) {
        products.push(...mlResult.value.products)
        platforms.mercadolivre = mlResult.value.products.length
      }
      if (shopeeResult.status === 'fulfilled') {
        products.push(...shopeeResult.value)
        platforms.shopee = shopeeResult.value.length
      }
      if (aliResult.status === 'fulfilled') {
        products.push(...aliResult.value)
        platforms.aliexpress = aliResult.value.length
      }
    }

    // Filtros
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
      keyword: q,
      deepSearch: doDeep,
      platform,
      total: filtered.length,
      rawCount: products.length,
      enrichedCount: filtered.length,
      platforms,
      stats: { avgScore, topScore, withSales, withFulfillment },
      products: filtered,
    })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
