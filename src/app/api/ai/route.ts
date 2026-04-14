import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getGenAI() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY não configurado')
  return new GoogleGenerativeAI(key)
}

function getModel() {
  return getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
}

// ─── insights: analisa lista de produtos do garimpo ────────────────────────────
async function handleInsights(data: {
  keyword: string
  products: Array<{
    id: string; title: string; price: number; soldQuantity: number
    marginEstimate: number; score: number; freeShipping: boolean
    logisticType: string; listingType: string; url: string
  }>
}) {
  const top = data.products.slice(0, 20).map((p, i) => ({
    rank: i + 1,
    id: p.id,
    titulo: p.title.slice(0, 80),
    preco: p.price,
    vendidos: p.soldQuantity,
    margem_estimada_pct: Math.round(p.marginEstimate),
    score: p.score,
    frete_gratis: p.freeShipping,
    full_ml: p.logisticType === 'fulfillment',
    tipo_anuncio: p.listingType,
  }))

  const prompt = `Você é um especialista em e-commerce e dropshipping no Brasil.
Analise esses ${top.length} produtos do Mercado Livre buscados por "${data.keyword}" e gere insights estratégicos para um revendedor iniciante.

Dados dos produtos (JSON):
${JSON.stringify(top, null, 2)}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "topPick": {
    "productId": "ID do produto escolhido",
    "titulo": "título resumido",
    "motivo": "explicação em 2-3 frases de por que este é o melhor produto para focar agora"
  },
  "resumo_mercado": "Análise geral do nicho em 2-3 frases: volume, competição, oportunidade",
  "insights": [
    "Insight 1 sobre padrão de preços ou vendas",
    "Insight 2 sobre competição ou logística",
    "Insight 3 sobre oportunidade identificada"
  ],
  "riscos": [
    "Risco principal deste mercado",
    "Segundo risco a considerar"
  ],
  "estrategia_entrada": "Como entrar neste mercado: precificação, tipo de anúncio recomendado, diferencial a explorar (máx 3 frases)",
  "faixa_preco_ideal": "Qual faixa de preço tem melhor custo-benefício neste nicho e por quê",
  "potencial_faturamento": "Estimativa de faturamento mensal realista para um novo vendedor neste nicho"
}`

  const result = await getModel().generateContent(prompt)
  const text = result.response.text()
  return NextResponse.json(JSON.parse(text))
}

// ─── describe: gera descrição otimizada para anúncio no ML ────────────────────
async function handleDescribe(data: {
  title: string; price: number; category?: string
  soldQuantity?: number; freeShipping?: boolean; logisticType?: string
  listingType?: string
}) {
  const prompt = `Você é especialista em criar anúncios de alta conversão no Mercado Livre Brasil.
Crie uma descrição otimizada para este produto:

Produto: ${data.title}
Preço: R$ ${data.price.toFixed(2)}
Categoria: ${data.category ?? 'não informada'}
Vendas totais: ${data.soldQuantity ?? 'desconhecido'}
Frete grátis: ${data.freeShipping ? 'Sim' : 'Não'}
Tipo de anúncio: ${data.listingType ?? 'gold_special'}

Retorne APENAS um JSON válido com esta estrutura:
{
  "titulo_otimizado": "Título com 60-80 caracteres com palavras-chave de busca do ML",
  "descricao": "Descrição completa do produto em português (400-600 caracteres), persuasiva e com palavras-chave. Mencione benefícios, não apenas características.",
  "bullet_points": [
    "✅ Benefício principal do produto",
    "✅ Segundo benefício importante",
    "✅ Terceiro ponto de venda",
    "✅ Garantia ou diferencial",
    "✅ Informação de entrega/suporte"
  ],
  "palavras_chave": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "dica_anuncio": "Uma dica específica para melhorar a performance deste anúncio no ML (ex: fotos, variações, perguntas frequentes)"
}`

  const result = await getModel().generateContent(prompt)
  const text = result.response.text()
  return NextResponse.json(JSON.parse(text))
}

// ─── product_analysis: análise profunda de um produto já analisado ─────────────
async function handleProductAnalysis(data: {
  product: {
    title: string; price: number; originalPrice?: number; soldQuantity: number
    availableQuantity: number; categoryName: string; sellerName: string
    listingType: string; freeShipping: boolean; logisticType: string
  }
  commission: { pct: number; total: number }
  estimates: { dailySales: number; monthlySales: number; monthlyRevenue: number; score: number }
}) {
  const p = data.product
  const e = data.estimates

  const prompt = `Você é consultor de e-commerce especializado no mercado brasileiro e no Mercado Livre.
Analise este produto e forneça uma consultoria completa:

Produto: ${p.title}
Preço atual: R$ ${p.price.toFixed(2)}${p.originalPrice ? ` (original: R$ ${p.originalPrice.toFixed(2)})` : ''}
Categoria: ${p.categoryName}
Vendedor: ${p.sellerName}
Vendas estimadas: ${e.dailySales}/dia · ${e.monthlySales}/mês
Faturamento estimado: R$ ${e.monthlyRevenue.toFixed(0)}/mês
Comissão ML: ${data.commission.pct}% (R$ ${data.commission.total.toFixed(2)})
Logística: ${p.logisticType === 'fulfillment' ? 'Full ML' : 'Envio próprio'}
Frete grátis: ${p.freeShipping ? 'Sim' : 'Não'}
Score de oportunidade: ${e.score}/100
Estoque disponível: ${p.availableQuantity} unidades
Tipo de anúncio: ${p.listingType}

Retorne APENAS um JSON válido:
{
  "posicionamento": "Como este produto se posiciona no mercado (competitivo, premium, popular?)",
  "nivel_competicao": "baixo | médio | alto",
  "analise_competicao": "Análise da competição e do vendedor atual em 2 frases",
  "precificacao": {
    "atual_adequado": true,
    "preco_sugerido_min": 0.00,
    "preco_sugerido_max": 0.00,
    "justificativa": "Por que este preço seria melhor"
  },
  "indicadores_positivos": ["Ponto positivo 1", "Ponto positivo 2"],
  "alertas": ["Alerta ou risco 1", "Alerta ou risco 2"],
  "recomendacao_final": "Deve ou não deve vender este produto? Justifique em 2-3 frases objetivas.",
  "proximos_passos": ["Ação 1 para começar", "Ação 2", "Ação 3"]
}`

  const result = await getModel().generateContent(prompt)
  const text = result.response.text()
  return NextResponse.json(JSON.parse(text))
}

// ─── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'IA não configurada. Adicione GEMINI_API_KEY nas variáveis de ambiente.' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const { mode, data } = body

    if (!mode || !data) {
      return NextResponse.json({ error: 'mode e data são obrigatórios' }, { status: 400 })
    }

    if (mode === 'insights') return await handleInsights(data)
    if (mode === 'describe') return await handleDescribe(data)
    if (mode === 'product_analysis') return await handleProductAnalysis(data)

    return NextResponse.json({ error: `Modo desconhecido: ${mode}` }, { status: 400 })
  } catch (err) {
    console.error('[AI route]', err)
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
