import { NextRequest, NextResponse } from 'next/server'

export interface DropSupplier {
  source: string
  label: string
  supplierTitle: string
  supplierUrl: string
  imageUrl: string | null
  estimatedCostMin: number | null
  estimatedCostMax: number | null
  estimatedMarginMin: number | null
  estimatedMarginMax: number | null
  estimatedProfitMin: number | null
  estimatedProfitMax: number | null
  shippingTimeDaysMin: number
  shippingTimeDaysMax: number
  shippingCost: number | null
  isFreeShipping: boolean
  sellerRating: number | null
  ordersCount: number | null
  isSearchLink: boolean
  isBestPick: boolean
  tip: string
}

// Custo estimado como % do preço ML por categoria de fornecedor
const COST_RANGES: Record<string, { min: number; max: number }> = {
  // Importação China
  aliexpress:  { min: 0.15, max: 0.28 },
  cjdropship:  { min: 0.18, max: 0.32 },
  // Atacado nacional
  fujioka:     { min: 0.40, max: 0.58 },  // Distribuidor de eletrônicos/eletrodomésticos
  mirao:       { min: 0.35, max: 0.55 },  // Atacadista geral
  eletrogate:  { min: 0.38, max: 0.56 },  // Eletrônicos/componentes
  kalunga:     { min: 0.42, max: 0.60 },  // Papelaria/escritório/tech
  goldentech:  { min: 0.36, max: 0.52 },  // Informática/acessórios
  shopee_atac: { min: 0.28, max: 0.45 },  // Shopee sellers atacado
}

function buildEstimates(mlPrice: number, source: string, overrideMin?: number, overrideMax?: number) {
  const r = COST_RANGES[source] ?? { min: 0.30, max: 0.45 }
  const costMin = Math.round((overrideMin ?? mlPrice * r.min) * 100) / 100
  const costMax = Math.round((overrideMax ?? mlPrice * r.max) * 100) / 100

  // Lucro = preço ML - custo - comissão(12%) - frete aprox(R$15) - imposto(6%)
  const deductions = mlPrice * (0.12 + 0.06) + 15
  const profitMin = Math.round((mlPrice - costMax - deductions) * 100) / 100
  const profitMax = Math.round((mlPrice - costMin - deductions) * 100) / 100

  const marginMin = Math.round((profitMin / mlPrice) * 100 * 10) / 10
  const marginMax = Math.round((profitMax / mlPrice) * 100 * 10) / 10

  return { costMin, costMax, profitMin, profitMax, marginMin, marginMax }
}

function buildSuppliers(keyword: string, mlPrice: number): DropSupplier[] {
  const enc = encodeURIComponent(keyword)

  const ali    = buildEstimates(mlPrice, 'aliexpress')
  const cj     = buildEstimates(mlPrice, 'cjdropship')
  const fuji   = buildEstimates(mlPrice, 'fujioka')
  const mirao  = buildEstimates(mlPrice, 'mirao')
  const eg     = buildEstimates(mlPrice, 'eletrogate')
  const kal    = buildEstimates(mlPrice, 'kalunga')
  const gt     = buildEstimates(mlPrice, 'goldentech')
  const shop   = buildEstimates(mlPrice, 'shopee_atac')

  const suppliers: DropSupplier[] = [
    // ── Importação ──────────────────────────────────────────────────────────
    {
      source: 'aliexpress',
      label: 'AliExpress',
      supplierTitle: `${keyword} — AliExpress Wholesale`,
      supplierUrl: `https://www.aliexpress.com/wholesale?SearchText=${enc}&shipCountry=br&SortType=total_tranpro_desc`,
      imageUrl: null,
      estimatedCostMin: ali.costMin,
      estimatedCostMax: ali.costMax,
      estimatedMarginMin: ali.marginMin,
      estimatedMarginMax: ali.marginMax,
      estimatedProfitMin: ali.profitMin,
      estimatedProfitMax: ali.profitMax,
      shippingTimeDaysMin: 15,
      shippingTimeDaysMax: 35,
      shippingCost: 0,
      isFreeShipping: true,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: true,
      isBestPick: false,
      tip: 'Maior margem possível. Use filtro "Ship from Brazil" para entregas em 7-15 dias e peça amostra antes de escalar.',
    },
    {
      source: 'cjdropship',
      label: 'CJ Dropshipping',
      supplierTitle: `${keyword} — CJ Dropshipping`,
      supplierUrl: `https://cjdropshipping.com/list.html#search=${enc}`,
      imageUrl: null,
      estimatedCostMin: cj.costMin,
      estimatedCostMax: cj.costMax,
      estimatedMarginMin: cj.marginMin,
      estimatedMarginMax: cj.marginMax,
      estimatedProfitMin: cj.profitMin,
      estimatedProfitMax: cj.profitMax,
      shippingTimeDaysMin: 7,
      shippingTimeDaysMax: 20,
      shippingCost: 0,
      isFreeShipping: true,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: true,
      isBestPick: false,
      tip: 'Integra com Shopify/WooCommerce. Tem estoque no Brasil para envios em até 7 dias.',
    },
    // ── Atacado Nacional ────────────────────────────────────────────────────
    {
      source: 'fujioka',
      label: 'Fujioka Distribuidor',
      supplierTitle: `${keyword} — Fujioka Atacado`,
      supplierUrl: `https://www.fujiokadistribuidor.com.br/consumo`,
      imageUrl: null,
      estimatedCostMin: fuji.costMin,
      estimatedCostMax: fuji.costMax,
      estimatedMarginMin: fuji.marginMin,
      estimatedMarginMax: fuji.marginMax,
      estimatedProfitMin: fuji.profitMin,
      estimatedProfitMax: fuji.profitMax,
      shippingTimeDaysMin: 3,
      shippingTimeDaysMax: 8,
      shippingCost: 20,
      isFreeShipping: false,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: false,
      isBestPick: false,
      tip: 'Distribuidor nacional de eletrônicos e eletrodomésticos. Requer CNPJ para cadastro. Nota fiscal inclusa.',
    },
    {
      source: 'mirao',
      label: 'Mirao Atacado',
      supplierTitle: `${keyword} — Mirao`,
      supplierUrl: `https://www.mirao.com.br/`,
      imageUrl: null,
      estimatedCostMin: mirao.costMin,
      estimatedCostMax: mirao.costMax,
      estimatedMarginMin: mirao.marginMin,
      estimatedMarginMax: mirao.marginMax,
      estimatedProfitMin: mirao.profitMin,
      estimatedProfitMax: mirao.profitMax,
      shippingTimeDaysMin: 3,
      shippingTimeDaysMax: 7,
      shippingCost: 18,
      isFreeShipping: false,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: false,
      isBestPick: false,
      tip: 'Atacadista brasileiro com variedade de categorias. Acesse o site e busque o produto manualmente.',
    },
    {
      source: 'eletrogate',
      label: 'Eletrogate',
      supplierTitle: `${keyword} — Eletrogate Atacado`,
      supplierUrl: `https://www.eletrogate.com/busca?q=${enc}`,
      imageUrl: null,
      estimatedCostMin: eg.costMin,
      estimatedCostMax: eg.costMax,
      estimatedMarginMin: eg.marginMin,
      estimatedMarginMax: eg.marginMax,
      estimatedProfitMin: eg.profitMin,
      estimatedProfitMax: eg.profitMax,
      shippingTimeDaysMin: 2,
      shippingTimeDaysMax: 7,
      shippingCost: 15,
      isFreeShipping: false,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: true,
      isBestPick: false,
      tip: 'Especializado em eletrônicos, módulos e acessórios tech. Bom para produtos de nicho tecnológico.',
    },
    {
      source: 'goldentech',
      label: 'Golden Tech',
      supplierTitle: `${keyword} — Golden Tech Atacado`,
      supplierUrl: `https://www.goldentech.com.br/busca?q=${enc}`,
      imageUrl: null,
      estimatedCostMin: gt.costMin,
      estimatedCostMax: gt.costMax,
      estimatedMarginMin: gt.marginMin,
      estimatedMarginMax: gt.marginMax,
      estimatedProfitMin: gt.profitMin,
      estimatedProfitMax: gt.profitMax,
      shippingTimeDaysMin: 3,
      shippingTimeDaysMax: 8,
      shippingCost: 15,
      isFreeShipping: false,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: true,
      isBestPick: false,
      tip: 'Atacadista de informática e acessórios. Nota fiscal e garantia de fábrica incluídas.',
    },
    {
      source: 'kalunga',
      label: 'Kalunga Atacado',
      supplierTitle: `${keyword} — Kalunga B2B`,
      supplierUrl: `https://www.kalunga.com.br/busca/${enc}`,
      imageUrl: null,
      estimatedCostMin: kal.costMin,
      estimatedCostMax: kal.costMax,
      estimatedMarginMin: kal.marginMin,
      estimatedMarginMax: kal.marginMax,
      estimatedProfitMin: kal.profitMin,
      estimatedProfitMax: kal.profitMax,
      shippingTimeDaysMin: 2,
      shippingTimeDaysMax: 6,
      shippingCost: 12,
      isFreeShipping: false,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: true,
      isBestPick: false,
      tip: 'Para papelaria, escritório e tech. Tem canal B2B com preço de atacado para CNPJ.',
    },
    {
      source: 'shopee_atacado',
      label: 'Shopee Atacado',
      supplierTitle: `${keyword} — Shopee atacadista`,
      supplierUrl: `https://shopee.com.br/search?keyword=${enc}+atacado&order=sales`,
      imageUrl: null,
      estimatedCostMin: shop.costMin,
      estimatedCostMax: shop.costMax,
      estimatedMarginMin: shop.marginMin,
      estimatedMarginMax: shop.marginMax,
      estimatedProfitMin: shop.profitMin,
      estimatedProfitMax: shop.profitMax,
      shippingTimeDaysMin: 3,
      shippingTimeDaysMax: 10,
      shippingCost: 8,
      isFreeShipping: false,
      sellerRating: null,
      ordersCount: null,
      isSearchLink: true,
      isBestPick: false,
      tip: 'Busca sellers atacadistas na Shopee. Filtre por "Mais Vendidos" e verifique avaliações antes de comprar.',
    },
  ]

  return suppliers
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, productId, mlPrice } = await req.json()

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword é obrigatória' }, { status: 400 })
    }

    // Limpar keyword: remover stopwords, pegar palavras principais
    const cleanKeyword = keyword
      .replace(/\b(para|com|de|do|da|em|no|na|e|ou|the|for|with|and|original|kit|jogo|conjunto|par|unidade|peça)\b/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
      .slice(0, 5)
      .join(' ')

    const price = typeof mlPrice === 'number' && mlPrice > 0 ? mlPrice : 100

    // Tentar buscar produtos reais no AliExpress via API pública
    let aliProducts: DropSupplier[] = []
    try {
      const enc = encodeURIComponent(cleanKeyword)
      const res = await fetch(
        `https://www.aliexpress.com/glosearch/api/product?keywords=${enc}&categoryId=&origin=y&locale=pt_BR&currency=BRL&isdirected=y&shipCountry=br`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
            Referer: 'https://www.aliexpress.com/',
          },
          signal: AbortSignal.timeout(5000),
        }
      )

      if (res.ok) {
        const data = await res.json()
        if (data?.result?.resultList?.length > 0) {
          const ali = buildEstimates(price, 'aliexpress')
          aliProducts = data.result.resultList.slice(0, 3).map((p: AliItem) => {
            const rawPrice = parseFloat((p.price || p.salePrice || '').replace(/[^\d.]/g, '')) || null
            return {
              source: 'aliexpress_product',
              label: 'AliExpress',
              supplierTitle: (p.title || p.subject || cleanKeyword).slice(0, 80),
              supplierUrl: `https://www.aliexpress.com/item/${p.productId || p.id}.html`,
              imageUrl: (p.imageUrl || p.img || '').replace('http://', 'https://') || null,
              estimatedCostMin: rawPrice ?? ali.costMin,
              estimatedCostMax: rawPrice ?? ali.costMax,
              estimatedMarginMin: rawPrice ? Math.round(((price - rawPrice - price * 0.18 - 15) / price) * 100 * 10) / 10 : ali.marginMin,
              estimatedMarginMax: rawPrice ? Math.round(((price - rawPrice - price * 0.18 - 15) / price) * 100 * 10) / 10 : ali.marginMax,
              estimatedProfitMin: rawPrice ? Math.round((price - rawPrice - price * 0.18 - 15) * 100) / 100 : ali.profitMin,
              estimatedProfitMax: rawPrice ? Math.round((price - rawPrice - price * 0.18 - 15) * 100) / 100 : ali.profitMax,
              shippingTimeDaysMin: 15,
              shippingTimeDaysMax: 35,
              shippingCost: 0,
              isFreeShipping: true,
              sellerRating: p.evaluationStar ? parseFloat(p.evaluationStar) : null,
              ordersCount: p.tradeCount || null,
              isSearchLink: false,
              isBestPick: false,
              tip: 'Produto encontrado no AliExpress. Confirme qualidade pedindo amostra antes de escalar.',
            }
          })
        }
      }
    } catch {
      // silencioso
    }

    const baseSuppliers = buildSuppliers(cleanKeyword, price)
    const allSuppliers = [...aliProducts, ...baseSuppliers]

    // Marcar melhor opção baseada na maior margem estimada
    let bestIdx = 0
    let bestMargin = -Infinity
    allSuppliers.forEach((s, i) => {
      if ((s.estimatedMarginMax ?? 0) > bestMargin) {
        bestMargin = s.estimatedMarginMax ?? 0
        bestIdx = i
      }
    })
    if (allSuppliers.length > 0) {
      allSuppliers[bestIdx].isBestPick = true
    }

    return NextResponse.json({
      keyword: cleanKeyword,
      originalKeyword: keyword,
      mlPrice: price,
      suppliers: allSuppliers,
      productId,
    })
  } catch (err) {
    console.error('[suppliers]', err)
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
  }
}

interface AliItem {
  title?: string
  subject?: string
  productId?: string
  id?: string
  price?: string
  salePrice?: string
  imageUrl?: string
  img?: string
  evaluationStar?: string
  tradeCount?: number
}
