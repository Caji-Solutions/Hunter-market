import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractMLId, isMLCatalogUrl } from '@/lib/utils'
import { getMLToken, getMLServerToken } from '@/lib/ml-token'

// ─── Comissões do ML por tipo de anúncio (tabela local — sem precisar de API auth)
// Fonte: https://www.mercadolivre.com.br/ajuda/Custos-de-vender_1338
const COMMISSION_TABLE: Record<string, { pct: number; fixedFee: number }> = {
  gold_pro: { pct: 16, fixedFee: 0 },       // Premium
  gold_special: { pct: 12, fixedFee: 0 },   // Clássico
  free: { pct: 0, fixedFee: 0 },            // Gratuito
  gold_premium: { pct: 16, fixedFee: 0 },
  bronze: { pct: 5, fixedFee: 0 },
  silver: { pct: 10, fixedFee: 0 },
  gold: { pct: 12, fixedFee: 0 },
}

function getCommission(listingType: string, price: number) {
  const rule = COMMISSION_TABLE[listingType] ?? { pct: 13, fixedFee: 0 }
  // Taxa fixa para produtos abaixo de R$79 no Clássico
  const fixedFee = (listingType === 'gold_special' && price < 79) ? 2 : rule.fixedFee
  const commissionVal = price * (rule.pct / 100)
  return { pct: rule.pct, value: commissionVal, fixedFee }
}

// ─── Resolve catálogo /p/MLB... → primeiro produto individual MLB... ───────
async function resolveCatalogToItemId(catalogId: string): Promise<string | null> {
  // A página de catálogo lista produtos individuais; o primeiro link com padrão
  // /MLB\d+-  no href é o produto mais relevante (mais vendido / melhor oferta).
  const catalogUrl = `https://www.mercadolivre.com.br/p/${catalogId}`
  try {
    const res = await fetch(catalogUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const html = await res.text()

    // Tenta 1: JSON embutido com lista de itens do catálogo
    const catalogItemsMatch = html.match(/"items":\s*\[\s*\{[^\]]*"id":\s*"(MLB\d+)"/)
    if (catalogItemsMatch) return catalogItemsMatch[1]

    // Tenta 2: Primeiro href com padrão de produto individual (/MLB\d+-)
    const hrefMatch = html.match(/href="https:\/\/www\.mercadolivre\.com\.br\/[^"]*\/(MLB\d+)[_-]/)
    if (hrefMatch) return hrefMatch[1]

    // Tenta 3: Busca via API de catálogo do ML (pública, sem auth)
    const apiRes = await fetch(
      `https://api.mercadolibre.com/products/${catalogId}/items?limit=1`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (apiRes.ok) {
      const apiData = await apiRes.json()
      const firstId = apiData?.results?.[0]?.id ?? apiData?.[0]?.id ?? null
      if (firstId) return firstId
    }

    // Tenta 4: Padrão "itemId" dentro do HTML do catálogo
    const idInHtml = html.match(/"itemId":\s*"(MLB\d+)"/)
    if (idInHtml) return idInHtml[1]

    return null
  } catch {
    return null
  }
}

// ─── API oficial do ML: /items/{id} (quando autenticado via OAuth) ────────────
interface MLAPIItem {
  id: string
  title: string
  price: number
  original_price: number | null
  sold_quantity: number
  available_quantity: number
  seller_id: number
  category_id: string
  listing_type_id: string
  shipping: { free_shipping: boolean; logistic_type: string }
  thumbnail: string
  permalink: string
}

async function fetchItemViaAPI(token: string, itemId: string): Promise<MLScrapedData | null> {
  try {
    // Busca item + vendedor + categoria em paralelo
    const itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!itemRes.ok) return null
    const item: MLAPIItem = await itemRes.json()

    const [sellerRes, catRes] = await Promise.allSettled([
      fetch(`https://api.mercadolibre.com/users/${item.seller_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.mercadolibre.com/categories/${item.category_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.ok ? r.json() : null),
    ])

    const sellerName: string = sellerRes.status === 'fulfilled' && sellerRes.value
      ? (sellerRes.value.nickname ?? 'Vendedor ML')
      : 'Vendedor ML'

    const categoryName: string = catRes.status === 'fulfilled' && catRes.value
      ? (catRes.value.name ?? item.category_id)
      : item.category_id

    return {
      id: item.id,
      title: item.title,
      price: item.price,
      originalPrice: item.original_price,
      soldQuantity: item.sold_quantity ?? 0,
      availableQuantity: item.available_quantity ?? 0,
      sellerId: String(item.seller_id),
      sellerName,
      categoryId: item.category_id,
      categoryName,
      listingType: item.listing_type_id ?? 'gold_special',
      freeShipping: item.shipping?.free_shipping ?? false,
      logisticType: item.shipping?.logistic_type ?? 'self_service',
      thumbnail: (item.thumbnail ?? '').replace('http://', 'https://'),
      sourceUrl: item.permalink ?? `https://www.mercadolivre.com.br/p/${itemId}`,
    }
  } catch (err) {
    console.error('[analyze] fetchItemViaAPI erro:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Scraper da página de produto do ML (sem API auth)
async function scrapeMLProduct(itemId: string): Promise<MLScrapedData | null> {
  const url = `https://produto.mercadolivre.com.br/${itemId.replace('MLB', 'MLB-')}`

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) return null
  const html = await res.text()

  // 1) Melidata: ID, preço, sellerId, categoryId, listingType (fonte mais confiável)
  const meliMatch = html.match(
    /"itemId":"(MLB\d+)"[^}]*"sellerId":(\d+)[^}]*"categoryId":"([^"]+)"[^}]*(?:pathToRoot":"[^"]*","[^"]*",)*[^}]*"localItemPrice":([\d.]+)[^}]*"listingType":"([^"]+)"/
  ) || html.match(
    /"itemId":"(MLB\d+)".*?"sellerId":(\d+).*?"categoryId":"([^"]+)".*?"localItemPrice":([\d.]+).*?"listingType":"([^"]+)"/
  )

  // 2) Título
  const titleMatch = html.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([^<]+)<\/h1>/) ||
    html.match(/<title>([^|<]{10,200})/)

  // 3) Preço original (desconto)
  const originalPriceMatch = html.match(/"original_price":([\d.]+)/)

  // 4) Vendas: "500+ vendidos" → número
  const soldNumbers: number[] = []
  const soldRegex = /(\d[\d.]*)\+?\s*vendidos?/gi
  let soldM: RegExpExecArray | null
  while ((soldM = soldRegex.exec(html)) !== null) {
    const n = parseInt(soldM[1].replace(/\./g, ''), 10)
    if (!isNaN(n)) soldNumbers.push(n)
  }
  const soldQuantity = soldNumbers.length > 0 ? Math.max(...soldNumbers) : 0

  // 5) Estoque disponível
  const availMatch = html.match(/"available_quantity":(\d+)/)

  // 6) Frete grátis
  const freeShippingMatch = html.match(/"free_shipping":(true|false)/)

  // 7) Thumbnail (maior resolução)
  const thumbMatch = html.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP[^"'\s]+\.(?:jpg|webp)/)

  // 8) Nome da categoria — padrão correto encontrado nos testes
  const catNameMatch = html.match(/categoryId[^,]+,\"categoryName\":\"([^"]+)\"/) ||
    html.match(/class="andes-breadcrumb__item"[^>]*>[^<]*<a[^>]*>([^<]+)<\/a>/)

  // 9) Nome do vendedor — padrão correto encontrado nos testes
  const sellerNameMatch = html.match(/"seller":\{"id":\d+,"name":"([^"]+)"/) ||
    html.match(/vendor_name":"([^"]+)"/) ||
    html.match(/class="[^"]*ui-pdp-seller__header__title[^"]*"[^>]*>([^<]+)</)

  // 10) Schema.org para preço e nome (fallback confiável)
  let schemaPrice: number | null = null
  let schemaName: string | null = null
  const schemaScripts = html.match(/<script>([\s\S]*?)<\/script>/g) ?? []
  for (const s of schemaScripts) {
    if (s.includes('"offers"') && s.includes('priceCurrency')) {
      try {
        const jsonStr = s.replace(/<\/?script>/g, '').trim()
        const data = JSON.parse(jsonStr)
        schemaPrice = data?.offers?.price ?? null
        schemaName = data?.name ?? null
        break
      } catch { /* continue */ }
    }
  }

  // 11) Logistic type
  const logisticMatch = html.match(/"logistic_type":"([^"]+)"/) ||
    html.match(/"fulfillment":\s*\{[^}]*"status":"([^"]+)"/)

  if (!meliMatch && !schemaPrice) return null

  const id = meliMatch?.[1] ?? itemId
  const price = meliMatch ? parseFloat(meliMatch[4]) : (schemaPrice ?? 0)
  const title = titleMatch ? titleMatch[1].trim().replace(/ \| MercadoLivre$/, '').replace(/ \| Parcelamento.*$/, '') : (schemaName ?? id)

  return {
    id,
    title,
    price,
    originalPrice: originalPriceMatch ? parseFloat(originalPriceMatch[1]) : null,
    soldQuantity,
    availableQuantity: availMatch ? parseInt(availMatch[1], 10) : 0,
    sellerId: meliMatch?.[2] ?? '0',
    sellerName: sellerNameMatch?.[1]?.trim() ?? 'Vendedor ML',
    categoryId: meliMatch?.[3] ?? 'MLB0000',
    categoryName: catNameMatch?.[1]?.trim() ?? meliMatch?.[3] ?? 'Geral',
    listingType: meliMatch?.[5] ?? 'gold_special',
    freeShipping: freeShippingMatch?.[1] === 'true',
    logisticType: logisticMatch?.[1] ?? 'self_service',
    thumbnail: thumbMatch?.[0] ?? '',
    sourceUrl: url,
  }
}

interface MLScrapedData {
  id: string
  title: string
  price: number
  originalPrice: number | null
  soldQuantity: number
  availableQuantity: number
  sellerId: string
  sellerName: string
  categoryId: string
  categoryName: string
  listingType: string
  freeShipping: boolean
  logisticType: string
  thumbnail: string
  sourceUrl: string
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })

    let itemId = extractMLId(url)
    if (!itemId) {
      return NextResponse.json(
        { error: 'URL do Mercado Livre inválida. Cole uma URL como: https://www.mercadolivre.com.br/...' },
        { status: 400 }
      )
    }

    // ── Resolução de catálogo (/p/MLB...) ──────────────────────────────────
    // URLs de catálogo têm estrutura HTML completamente diferente dos produtos
    // individuais — os regex de scraping não funcionam lá. Buscamos o primeiro
    // produto individual listado no catálogo e scrapeamos ele.
    if (isMLCatalogUrl(url)) {
      const resolvedId = await resolveCatalogToItemId(itemId)
      if (resolvedId) {
        itemId = resolvedId
      } else {
        return NextResponse.json(
          { error: 'Este é um link de catálogo do ML e não foi possível encontrar um produto individual para analisar. Tente abrir o produto de um vendedor específico e cole esse link.' },
          { status: 404 }
        )
      }
    }

    // ── Tenta API oficial (usuário OAuth > server token > scraping) ──────────
    const token = await getMLToken() ?? await getMLServerToken()
    let item: MLScrapedData | null = null

    if (token) {
      item = await fetchItemViaAPI(token, itemId)
    }

    // ── Fallback: scraping da página do produto ──────────────────────────
    if (!item) {
      item = await scrapeMLProduct(itemId)
    }

    if (!item || item.price === 0) {
      return NextResponse.json(
        { error: 'Não foi possível extrair os dados deste produto. Verifique se o link está correto e o produto está ativo.' },
        { status: 404 }
      )
    }

    // Calcular comissão via tabela local (não precisa de API)
    const commission = getCommission(item.listingType, item.price)

    // Salvar no banco — operação opcional (SQLite não funciona em Vercel/serverless)
    // Se o banco estiver indisponível, a análise continua normalmente sem persistência.
    let persistedId = item.id
    try {
      const product = await prisma.product.upsert({
        where: { marketplace_externalId: { marketplace: 'mercadolivre', externalId: item.id } },
        update: { title: item.title, updatedAt: new Date() },
        create: {
          marketplace: 'mercadolivre',
          externalId: item.id,
          url,
          title: item.title,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          listingType: item.listingType,
          thumbnail: item.thumbnail,
        },
      })
      await prisma.productSnapshot.create({
        data: {
          productId: product.id,
          price: item.price,
          originalPrice: item.originalPrice,
          soldQuantity: item.soldQuantity,
          availableQuantity: item.availableQuantity,
          freeShipping: item.freeShipping,
          logisticType: item.logisticType,
        },
      })
      persistedId = product.id
    } catch (dbErr) {
      console.warn('[analyze] DB indisponível, continuando sem persistência:', dbErr instanceof Error ? dbErr.message : dbErr)
    }

    const score = calcOpportunityScore({
      soldQuantity: item.soldQuantity,
      price: item.price,
      freeShipping: item.freeShipping,
      commissionPct: commission.pct,
      listingType: item.listingType,
    })

    const dailySales = Math.max(1, item.soldQuantity > 0 ? Math.round(item.soldQuantity / 365) : 1)
    const monthlySales = dailySales * 30
    const monthlyRevenue = monthlySales * item.price

    return NextResponse.json({
      product: {
        id: persistedId,
        externalId: item.id,
        title: item.title,
        price: item.price,
        originalPrice: item.originalPrice,
        soldQuantity: item.soldQuantity,
        availableQuantity: item.availableQuantity,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        listingType: item.listingType,
        freeShipping: item.freeShipping,
        logisticType: item.logisticType,
        thumbnail: item.thumbnail,
        url,
      },
      commission: {
        pct: commission.pct,
        value: commission.value,
        fixedFee: commission.fixedFee,
        total: commission.value + commission.fixedFee,
      },
      estimates: { dailySales, monthlySales, monthlyRevenue, score },
    })
  } catch (err) {
    console.error('[analyze]', err)
    return NextResponse.json({ error: 'Erro interno ao analisar produto' }, { status: 500 })
  }
}

function calcOpportunityScore(params: {
  soldQuantity: number; price: number; freeShipping: boolean
  commissionPct: number; listingType: string
}): number {
  let score = 0
  if (params.soldQuantity > 10000) score += 40
  else if (params.soldQuantity > 1000) score += 30
  else if (params.soldQuantity > 100) score += 20
  else if (params.soldQuantity > 10) score += 10
  if (params.price >= 50 && params.price <= 300) score += 20
  else if (params.price >= 30 && params.price <= 500) score += 10
  if (params.freeShipping) score += 15
  if (params.listingType === 'gold_pro') score += 15
  else if (params.listingType === 'gold_special') score += 10
  if (params.commissionPct <= 12) score += 10
  else if (params.commissionPct <= 15) score += 5
  return Math.min(100, score)
}
