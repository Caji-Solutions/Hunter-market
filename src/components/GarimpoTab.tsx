'use client'

import { useState } from 'react'
import {
  Search, Gem, Star, TrendingUp, Package, ExternalLink,
  Loader2, SlidersHorizontal, ChevronDown, ChevronUp,
  Truck, Award, AlertCircle, Sparkles, Brain, Trophy,
  Lightbulb, ShieldAlert, Target, Copy, Check,
} from 'lucide-react'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

type SearchPlatform = 'mercadolivre' | 'shopee' | 'aliexpress' | 'todos'

interface GarimpoProduct {
  id: string
  title: string
  price: number
  image: string
  url: string
  brand: string
  platform: 'mercadolivre' | 'shopee' | 'aliexpress'
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

interface GarimpoResult {
  keyword: string
  deepSearch: boolean
  total: number
  rawCount: number
  enrichedCount: number
  stats: { avgScore: number; topScore: number; withSales: number; withFulfillment: number }
  products: GarimpoProduct[]
  strategy?: string
  platforms?: { mercadolivre: number; shopee: number; aliexpress: number }
}

interface AIInsights {
  topPick: { productId: string; titulo: string; motivo: string }
  resumo_mercado: string
  insights: string[]
  riscos: string[]
  estrategia_entrada: string
  faixa_preco_ideal: string
  potencial_faturamento: string
}

interface AIDescription {
  titulo_otimizado: string
  descricao: string
  bullet_points: string[]
  palavras_chave: string[]
  dica_anuncio: string
}

const TRENDING_CATEGORIES = [
  { label: 'Capinha iPhone', emoji: '📱' },
  { label: 'Suporte Celular Carro', emoji: '🚗' },
  { label: 'Relógio Smartwatch', emoji: '⌚' },
  { label: 'Luminária LED', emoji: '💡' },
  { label: 'Fone Bluetooth', emoji: '🎧' },
  { label: 'Kit Manicure', emoji: '💅' },
  { label: 'Organizador Gaveta', emoji: '🗂️' },
  { label: 'Squeeze Termica', emoji: '🧃' },
]

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-400 bg-green-500/10 border-green-500/30'
  if (score >= 40) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
  return 'text-red-400 bg-red-500/10 border-red-500/30'
}

function getScoreLabel(score: number) {
  if (score >= 70) return 'Excelente'
  if (score >= 50) return 'Bom'
  if (score >= 30) return 'Regular'
  return 'Baixo'
}

function getMarginColor(margin: number) {
  if (margin >= 25) return 'text-green-400'
  if (margin >= 10) return 'text-yellow-400'
  return 'text-red-400'
}

// ─── Painel de Insights IA ────────────────────────────────────────────────────
function AIInsightsPanel({
  insights,
  products,
  onHighlightProduct,
}: {
  insights: AIInsights
  products: GarimpoProduct[]
  onHighlightProduct: (id: string) => void
}) {
  const topProduct = products.find(p => p.id === insights.topPick?.productId)

  return (
    <div className="mb-6 bg-gradient-to-br from-purple-950/60 via-gray-900 to-gray-900 border border-purple-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-purple-500/20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Análise Inteligente · Gemini AI</h3>
          <p className="text-xs text-gray-500">Insights estratégicos gerados por IA para este mercado</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Top Pick */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-semibold text-sm">Top Pick IA</span>
            </div>
            <p className="text-white text-sm font-medium mb-1 line-clamp-2">
              {insights.topPick?.titulo ?? topProduct?.title ?? 'N/A'}
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">{insights.topPick?.motivo}</p>
            {topProduct && (
              <button
                onClick={() => onHighlightProduct(insights.topPick.productId)}
                className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition"
              >
                Ver produto ↓
              </button>
            )}
          </div>

          <div className="flex-1 p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 font-semibold text-sm">Estratégia de Entrada</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">{insights.estrategia_entrada}</p>
          </div>
        </div>

        {/* Resumo mercado + Faturamento */}
        <div className="p-4 bg-gray-800/40 border border-gray-700/50 rounded-xl">
          <p className="text-gray-300 text-sm leading-relaxed">{insights.resumo_mercado}</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">Faixa ideal:</span>
              <span className="text-green-400 font-medium">{insights.faixa_preco_ideal}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">Potencial:</span>
              <span className="text-blue-400 font-medium">{insights.potencial_faturamento}</span>
            </div>
          </div>
        </div>

        {/* Insights + Riscos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">Insights</span>
            </div>
            <ul className="space-y-1.5">
              {insights.insights?.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-medium text-red-400 uppercase tracking-wide">Riscos</span>
            </div>
            <ul className="space-y-1.5">
              {insights.riscos?.map((risco, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                  {risco}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de descrição gerada por IA ─────────────────────────────────────────
function DescribeModal({
  description,
  onClose,
}: {
  description: AIDescription
  onClose: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-white">Anúncio Gerado por IA</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Título otimizado */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">Título Otimizado</label>
              <button
                onClick={() => copy(description.titulo_otimizado, 'titulo')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
              >
                {copied === 'titulo' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied === 'titulo' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-sm text-white font-medium">
              {description.titulo_otimizado}
            </div>
            <div className="text-xs text-gray-500 mt-1">{description.titulo_otimizado.length} caracteres</div>
          </div>

          {/* Descrição */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">Descrição</label>
              <button
                onClick={() => copy(description.descricao, 'desc')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
              >
                {copied === 'desc' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied === 'desc' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-sm text-gray-300 leading-relaxed">
              {description.descricao}
            </div>
          </div>

          {/* Bullet points */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">Pontos de Venda</label>
              <button
                onClick={() => copy(description.bullet_points.join('\n'), 'bullets')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
              >
                {copied === 'bullets' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied === 'bullets' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <ul className="space-y-1.5">
              {description.bullet_points.map((bp, i) => (
                <li key={i} className="p-2.5 bg-gray-800 rounded-lg text-sm text-gray-300">{bp}</li>
              ))}
            </ul>
          </div>

          {/* Palavras-chave */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5 block">Palavras-chave para SEO</label>
            <div className="flex flex-wrap gap-1.5">
              {description.palavras_chave.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs rounded-full">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Dica */}
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-orange-300 text-xs leading-relaxed">{description.dica_anuncio}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const PLATFORM_CONFIG: Record<SearchPlatform, { label: string; emoji: string; color: string; activeColor: string }> = {
  todos:         { label: 'Todos',          emoji: '🌐', color: 'text-gray-400 border-gray-700 bg-gray-800',          activeColor: 'text-blue-400 border-blue-500/50 bg-blue-500/10' },
  mercadolivre:  { label: 'Mercado Livre',  emoji: '🛒', color: 'text-gray-400 border-gray-700 bg-gray-800',          activeColor: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' },
  shopee:        { label: 'Shopee',         emoji: '🟠', color: 'text-gray-400 border-gray-700 bg-gray-800',          activeColor: 'text-orange-400 border-orange-500/50 bg-orange-500/10' },
  aliexpress:    { label: 'AliExpress',     emoji: '📦', color: 'text-gray-400 border-gray-700 bg-gray-800',          activeColor: 'text-red-400 border-red-500/50 bg-red-500/10' },
}

const PLATFORM_BADGE: Record<string, { label: string; classes: string }> = {
  mercadolivre: { label: 'ML', classes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  shopee:       { label: 'Shopee', classes: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  aliexpress:   { label: 'AliExp', classes: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export function GarimpoTab({ onSelectProduct }: { onSelectProduct: (url: string) => void }) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GarimpoResult | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)
  const [platform, setPlatform] = useState<SearchPlatform>('todos')

  // Filtros
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [minScore, setMinScore] = useState('')

  // IA
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null)
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)

  // Descrição IA
  const [describeLoading, setDescribeLoading] = useState<string | null>(null)
  const [describeResult, setDescribeResult] = useState<AIDescription | null>(null)

  async function handleGarimpar(kw?: string) {
    const q = kw ?? keyword
    if (!q.trim()) return
    if (kw) setKeyword(kw)
    setLoading(true)
    setError('')
    setResult(null)
    setAIInsights(null)
    setHighlightId(null)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: q.trim(),
          deepSearch,
          platform,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          minRating: minRating ? parseFloat(minRating) : undefined,
          minScore: minScore ? parseFloat(minScore) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao garimpar produtos')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleAIInsights() {
    if (!result || result.products.length === 0) return
    setAILoading(true)
    setAIError('')
    setAIInsights(null)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'insights',
          data: { keyword: result.keyword, products: result.products },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar insights')
      setAIInsights(data)
      // Scroll up para mostrar os insights
      window.scrollTo({ top: 300, behavior: 'smooth' })
    } catch (err) {
      setAIError(err instanceof Error ? err.message : 'Erro na IA')
    } finally {
      setAILoading(false)
    }
  }

  async function handleDescribe(product: GarimpoProduct) {
    setDescribeLoading(product.id)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'describe',
          data: {
            title: product.title,
            price: product.price,
            soldQuantity: product.soldQuantity,
            freeShipping: product.freeShipping,
            logisticType: product.logisticType,
            listingType: product.listingType,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar descrição')
      setDescribeResult(data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar descrição')
    } finally {
      setDescribeLoading(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header do Garimpo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="text-sm text-orange-400 font-medium">Descoberta Automática de Produtos</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Garimpe os <span className="text-orange-400">melhores produtos</span>
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          Digite uma categoria e encontre os produtos com maior potencial de lucro. Use a IA para análise estratégica do mercado.
        </p>
      </div>

      {/* Barra de busca */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Gem className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGarimpar()}
              placeholder="Ex: suporte celular, capinha iphone, fone bluetooth..."
              className="w-full pl-10 pr-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
            />
          </div>
          <button
            onClick={() => handleGarimpar()}
            disabled={loading || !keyword.trim()}
            className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Garimpando...</>
            ) : (
              <><Gem className="w-4 h-4" /> Garimpar</>
            )}
          </button>
        </div>

        {/* Seletor de Plataformas */}
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
          {(Object.keys(PLATFORM_CONFIG) as SearchPlatform[]).map((p) => {
            const cfg = PLATFORM_CONFIG[p]
            const isActive = platform === p
            return (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition ${isActive ? cfg.activeColor : cfg.color + ' hover:text-white hover:border-gray-600'}`}
              >
                <span>{cfg.emoji}</span>
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            )
          })}
        </div>

        {/* Busca Profunda toggle */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => setDeepSearch(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
              deepSearch
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Busca Profunda
            {deepSearch && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full ml-1">ON</span>}
          </button>
          {deepSearch && (
            <span className="text-xs text-gray-500">
              {platform === 'todos' ? 'Busca em 3 plataformas · leva ~40s' : '3 páginas · leva ~20s'}
            </span>
          )}
        </div>

        {/* Filtros toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className="mt-3 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mx-auto"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros avançados
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showFilters && (
          <div className="mt-3 p-4 bg-gray-900 border border-gray-800 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Preço mínimo (R$)</label>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Preço máximo (R$)</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="999"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Avaliação mínima</label>
              <input type="number" value={minRating} onChange={(e) => setMinRating(e.target.value)} placeholder="4.0" min="0" max="5" step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Score mínimo (0-100)</label>
              <input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="30" min="0" max="100"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        )}
      </div>

      {/* Categorias rápidas */}
      {!result && !loading && (
        <div className="mb-8">
          <p className="text-center text-xs text-gray-500 mb-3 uppercase tracking-wider">Buscas populares</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRENDING_CATEGORIES.map(({ label, emoji }) => (
              <button
                key={label}
                onClick={() => handleGarimpar(label)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-full text-sm text-gray-300 hover:text-white transition"
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-950/50 border border-red-800 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            <p className="text-white font-medium">
              {deepSearch ? 'Busca profunda em andamento...' : 'Garimpando produtos...'}
            </p>
            <p className="text-gray-400 text-sm">Buscando e analisando os melhores resultados</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(deepSearch ? 9 : 6)].map((_, i) => (
              <div key={i} className="h-56 bg-gray-800 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Resultados */}
      {result && !loading && (
        <div>
          {/* Cabeçalho dos resultados */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                {result.total} produtos encontrados
                <span className="text-gray-400 font-normal">para "{result.keyword}"</span>
                {result.deepSearch && (
                  <span className="text-xs bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-full">Busca Profunda</span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {result.rawCount} coletados · {result.enrichedCount} analisados · Ordenados por score
              </p>
              {result.platforms && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {result.platforms.mercadolivre > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                      🛒 ML: {result.platforms.mercadolivre}
                    </span>
                  )}
                  {result.platforms.shopee > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20">
                      🟠 Shopee: {result.platforms.shopee}
                    </span>
                  )}
                  {result.platforms.aliexpress > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                      📦 AliExpress: {result.platforms.aliexpress}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Award className="w-3 h-3 text-orange-400" />
                  Score médio: <strong className="text-white ml-0.5">{result.stats.avgScore}</strong>
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  Com vendas: <strong className="text-white ml-0.5">{result.stats.withSales}</strong>
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Package className="w-3 h-3 text-purple-400" />
                  Full ML: <strong className="text-white ml-0.5">{result.stats.withFulfillment}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão IA */}
              <button
                onClick={handleAIInsights}
                disabled={aiLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                  aiInsights
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-purple-600 hover:bg-purple-700 border-purple-500 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {aiLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
                ) : (
                  <><Brain className="w-4 h-4" /> {aiInsights ? 'Reanalisar IA' : 'Analisar com IA'}</>
                )}
              </button>

              <button
                onClick={() => handleGarimpar()}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" /> Refazer
              </button>
            </div>
          </div>

          {/* Erro IA */}
          {aiError && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {aiError}
            </div>
          )}

          {/* Painel de Insights IA */}
          {aiInsights && (
            <AIInsightsPanel
              insights={aiInsights}
              products={result.products}
              onHighlightProduct={(id) => {
                setHighlightId(id)
                // Scroll até o produto
                setTimeout(() => {
                  document.getElementById(`product-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 100)
              }}
            />
          )}

          {/* Grid de produtos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.products.map((product, idx) => (
              <div key={product.id} id={`product-${product.id}`}
                className={highlightId === product.id ? 'ring-2 ring-yellow-400 rounded-xl' : ''}
              >
                <ProductCard
                  product={product}
                  rank={idx + 1}
                  isTopPick={aiInsights?.topPick?.productId === product.id}
                  describeLoading={describeLoading === product.id}
                  onAnalyze={() => onSelectProduct(product.url)}
                  onDescribe={() => handleDescribe(product)}
                />
              </div>
            ))}
          </div>

          {result.products.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum produto encontrado com esses filtros.</p>
              <button
                onClick={() => { setMinPrice(''); setMaxPrice(''); setMinRating(''); setMinScore(''); handleGarimpar() }}
                className="mt-3 text-sm text-orange-400 hover:text-orange-300 transition"
              >
                Limpar filtros e tentar novamente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal descrição IA */}
      {describeResult && (
        <DescribeModal description={describeResult} onClose={() => setDescribeResult(null)} />
      )}
    </div>
  )
}

function ProductCard({
  product,
  rank,
  isTopPick,
  describeLoading,
  onAnalyze,
  onDescribe,
}: {
  product: GarimpoProduct
  rank: number
  isTopPick: boolean
  describeLoading: boolean
  onAnalyze: () => void
  onDescribe: () => void
}) {
  const scoreClasses = getScoreColor(product.score)
  const marginColor = getMarginColor(product.marginEstimate)
  const badge = PLATFORM_BADGE[product.platform]
  const isML = product.platform === 'mercadolivre'

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden hover:border-gray-700 transition group flex flex-col ${
      isTopPick ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10' : 'border-gray-800'
    }`}>
      {isTopPick && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-3 py-1.5 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs text-yellow-400 font-medium">Top Pick IA · Melhor oportunidade</span>
        </div>
      )}

      {/* Rank + Score badge */}
      <div className="relative">
        {product.image ? (
          <div className="h-44 bg-white flex items-center justify-center overflow-hidden">
            <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain p-3" />
          </div>
        ) : (
          <div className="h-44 bg-gray-800 flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-600" />
          </div>
        )}

        <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-gray-900/90 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </div>

        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${scoreClasses}`}>
          <Award className="w-3 h-3" />
          {product.score}
        </div>

        {badge && (
          <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded border text-xs font-semibold ${badge.classes}`}>
            {badge.label}
          </div>
        )}

        {product.freeShipping && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-400">
            <Truck className="w-3 h-3" /> Frete grátis
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col flex-1">
        <h4 className="text-sm font-medium text-white line-clamp-2 mb-3 leading-snug">
          {product.title}
        </h4>

        <div className="text-xl font-bold text-orange-400 mb-3">
          {formatCurrency(product.price)}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 bg-gray-800/60 rounded-lg">
            <div className="text-xs text-gray-400 mb-0.5">Margem est.</div>
            <div className={`text-sm font-bold ${marginColor}`}>
              {product.marginEstimate > 0 ? formatPercent(product.marginEstimate) : '–'}
            </div>
          </div>
          <div className="p-2 bg-gray-800/60 rounded-lg">
            <div className="text-xs text-gray-400 mb-0.5">Lucro est.</div>
            <div className="text-sm font-bold text-white">
              {product.profitEstimate > 0 ? formatCurrency(product.profitEstimate) : '–'}
            </div>
          </div>
          <div className="p-2 bg-gray-800/60 rounded-lg">
            <div className="text-xs text-gray-400 mb-0.5">Vendidos</div>
            <div className="text-sm font-bold text-white">
              {product.soldQuantity > 0 ? `${formatNumber(product.soldQuantity)}+` : '–'}
            </div>
          </div>
          <div className="p-2 bg-gray-800/60 rounded-lg">
            <div className="text-xs text-gray-400 mb-0.5">Comissão</div>
            <div className="text-sm font-bold text-white">{product.commissionPct}%</div>
          </div>
        </div>

        {product.rating && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.round(product.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {product.rating.toFixed(1)}
              {product.reviewCount ? ` (${formatNumber(product.reviewCount)})` : ''}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${product.score >= 70 ? 'bg-green-500' : product.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${product.score}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${product.score >= 70 ? 'text-green-400' : product.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {getScoreLabel(product.score)}
          </span>
        </div>

        {/* Ações */}
        <div className="flex gap-2 mt-auto">
          {isML ? (
            <button
              onClick={onAnalyze}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Analisar
            </button>
          ) : (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver Produto
            </a>
          )}
          <button
            onClick={onDescribe}
            disabled={describeLoading}
            title="Gerar descrição otimizada com IA"
            className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 text-sm rounded-lg transition flex items-center justify-center disabled:opacity-50"
          >
            {describeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          </button>
          {isML && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-sm rounded-lg transition flex items-center justify-center"
              title="Ver no Mercado Livre"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
