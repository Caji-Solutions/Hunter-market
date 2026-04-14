'use client'

import { useState } from 'react'
import {
  Search, Gem, Star, TrendingUp, Package, ExternalLink,
  Loader2, SlidersHorizontal, ChevronDown, ChevronUp,
  Truck, Award, AlertCircle, Sparkles,
} from 'lucide-react'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

interface GarimpoProduct {
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

interface GarimpoResult {
  keyword: string
  deepSearch: boolean
  total: number
  rawCount: number
  enrichedCount: number
  stats: { avgScore: number; topScore: number; withSales: number; withFulfillment: number }
  products: GarimpoProduct[]
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

export function GarimpoTab({ onSelectProduct }: { onSelectProduct: (url: string) => void }) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GarimpoResult | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)

  // Filtros
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [minScore, setMinScore] = useState('')

  async function handleGarimpar(kw?: string) {
    const q = kw ?? keyword
    if (!q.trim()) return
    if (kw) setKeyword(kw)
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: q.trim(),
          deepSearch,
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
          Digite uma categoria ou palavra-chave e encontre os produtos com maior potencial de lucro no Mercado Livre.
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
              3 páginas do ML (~150 produtos) · dados de vendas para top 25 · leva ~20s
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
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Preço máximo (R$)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="999"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Avaliação mínima</label>
              <input
                type="number"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                placeholder="4.0"
                min="0"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Score mínimo (0-100)</label>
              <input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="30"
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
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
            <p className="text-gray-400 text-sm">
              {deepSearch
                ? 'Consultando 5 ordenações do ML e analisando todos os produtos únicos'
                : 'Buscando e analisando os melhores resultados'}
            </p>
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
                {!result.deepSearch && result.stats.withSales === 0 && (
                  <span className="text-orange-400/70"> · Ative "Busca Profunda" para dados de vendas</span>
                )}
              </p>
              {/* Stats rápidas */}
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
            <button
              onClick={() => handleGarimpar()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" /> Refazer busca
            </button>
          </div>

          {/* Grid de produtos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={idx + 1}
                onAnalyze={() => onSelectProduct(product.url)}
              />
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
    </div>
  )
}

function ProductCard({
  product,
  rank,
  onAnalyze,
}: {
  product: GarimpoProduct
  rank: number
  onAnalyze: () => void
}) {
  const scoreClasses = getScoreColor(product.score)
  const marginColor = getMarginColor(product.marginEstimate)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition group flex flex-col">
      {/* Rank + Score badge */}
      <div className="relative">
        {product.image ? (
          <div className="h-44 bg-white flex items-center justify-center overflow-hidden">
            <img
              src={product.image}
              alt={product.title}
              className="max-h-full max-w-full object-contain p-3"
            />
          </div>
        ) : (
          <div className="h-44 bg-gray-800 flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-600" />
          </div>
        )}

        {/* Rank badge */}
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-gray-900/90 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </div>

        {/* Score badge */}
        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${scoreClasses}`}>
          <Award className="w-3 h-3" />
          {product.score}
        </div>

        {/* Frete grátis */}
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

        {/* Preço */}
        <div className="text-xl font-bold text-orange-400 mb-3">
          {formatCurrency(product.price)}
        </div>

        {/* Métricas */}
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
            <div className="text-sm font-bold text-white">
              {product.commissionPct}%
            </div>
          </div>
        </div>

        {/* Avaliação */}
        {product.rating && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < Math.round(product.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {product.rating.toFixed(1)}
              {product.reviewCount ? ` (${formatNumber(product.reviewCount)})` : ''}
            </span>
          </div>
        )}

        {/* Score label */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden`}>
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
          <button
            onClick={onAnalyze}
            className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Analisar
          </button>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-sm rounded-lg transition flex items-center justify-center"
            title="Ver no Mercado Livre"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
