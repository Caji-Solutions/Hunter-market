'use client'

import { useState, useEffect } from 'react'
import { Search, TrendingUp, Package, DollarSign, Star, ExternalLink, Loader2, BarChart3, ShoppingCart, Zap, AlertCircle, Gem, CheckCircle2, LogIn, X } from 'lucide-react'
import type { ProductAnalysis, ProfitResult, Supplier, ShippingQuote } from '@/types'
import { formatCurrency, formatNumber, formatPercent, getScoreLabel } from '@/lib/utils'
import { ScoreGauge } from '@/components/ScoreGauge'
import { ProfitCalculator } from '@/components/ProfitCalculator'
import { SuppliersPanel } from '@/components/SuppliersPanel'
import { ShippingPanel } from '@/components/ShippingPanel'
import { CostBreakdownChart } from '@/components/CostBreakdownChart'
import { GarimpoTab } from '@/components/GarimpoTab'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'garimpo'>('analyze')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null)
  const [profit, setProfit] = useState<ProfitResult | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([])

  const [mlUserId, setMlUserId] = useState<string | null>(null)
  const [mlConnecting, setMlConnecting] = useState(false)
  const [mlNotification, setMlNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    // Lê o cookie ml_user_id (não HttpOnly, acessível no client)
    const match = document.cookie.match(/(?:^|;\s*)ml_user_id=([^;]*)/)
    if (match) setMlUserId(decodeURIComponent(match[1]))

    // Verifica resultado do OAuth na URL
    const params = new URLSearchParams(window.location.search)
    const mlAuth = params.get('ml_auth')
    if (mlAuth === 'success') {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)ml_user_id=([^;]*)/)
      if (cookieMatch) setMlUserId(decodeURIComponent(cookieMatch[1]))
      setMlNotification({ type: 'success', msg: 'Mercado Livre conectado com sucesso! Buscas agora usam a API oficial.' })
      window.history.replaceState({}, '', '/')
    } else if (mlAuth === 'error') {
      const reason = params.get('reason') ?? 'erro desconhecido'
      setMlNotification({ type: 'error', msg: `Erro ao conectar ao ML: ${reason}` })
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    if (!mlNotification) return
    const t = setTimeout(() => setMlNotification(null), 6000)
    return () => clearTimeout(t)
  }, [mlNotification])

  async function handleMLConnect() {
    setMlConnecting(true)
    try {
      const res = await fetch('/api/auth/ml')
      const data = await res.json()
      if (data.authUrl) window.location.href = data.authUrl
      else setMlNotification({ type: 'error', msg: 'Não foi possível obter a URL de autorização.' })
    } catch {
      setMlNotification({ type: 'error', msg: 'Erro ao iniciar conexão com o Mercado Livre.' })
    } finally {
      setMlConnecting(false)
    }
  }

  async function handleMLDisconnect() {
    await fetch('/api/auth/ml/logout', { method: 'POST' })
    setMlUserId(null)
    setMlNotification({ type: 'success', msg: 'Desconectado do Mercado Livre. Buscas voltam ao modo scraping.' })
  }

  async function handleAnalyze(directUrl?: string) {
    const targetUrl = (directUrl ?? url).trim()
    if (!targetUrl) return
    setLoading(true)
    setError('')
    setAnalysis(null)
    setProfit(null)
    setSuppliers([])
    setShippingQuotes([])

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar produto')
      setAnalysis(data)

      const keywords = data.product.title.split(' ').slice(0, 6).join(' ')
      const [suppliersRes, shippingRes] = await Promise.allSettled([
        fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: keywords, productId: data.product.id, mlPrice: data.product.price }),
        }).then((r) => r.json()),
        fetch('/api/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insuranceValue: data.product.price }),
        }).then((r) => r.json()),
      ])

      if (suppliersRes.status === 'fulfilled') setSuppliers(suppliersRes.value.suppliers || [])
      if (shippingRes.status === 'fulfilled') setShippingQuotes(shippingRes.value.quotes || [])

      const defaultSupplierCost = data.product.price * 0.35
      await calcProfit({
        productId: data.product.id,
        supplierCost: defaultSupplierCost,
        salePrice: data.product.price,
        commissionPct: data.commission.pct,
        commissionVal: data.commission.value,
        fixedFee: data.commission.fixedFee,
        shippingCost:
          shippingRes.status === 'fulfilled'
            ? (shippingRes.value.quotes?.[0]?.price ?? 0)
            : 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function calcProfit(params: Record<string, number | string>) {
    const res = await fetch('/api/profit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (res.ok) setProfit(data)
  }

  function handleRecalcProfit(
    supplierCost: number,
    shippingCost: number,
    taxRate: number,
    otherCosts: number
  ) {
    if (!analysis) return
    calcProfit({
      productId: analysis.product.id,
      supplierCost,
      salePrice: analysis.product.price,
      commissionPct: analysis.commission.pct,
      commissionVal: analysis.commission.value,
      fixedFee: analysis.commission.fixedFee,
      shippingCost,
      taxRate,
      otherCosts,
    })
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white">Product Hunter</span>
            </div>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">
              Beta
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notificação OAuth */}
            {mlNotification && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                mlNotification.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {mlNotification.type === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                }
                <span className="max-w-xs truncate">{mlNotification.msg}</span>
                <button onClick={() => setMlNotification(null)} className="opacity-60 hover:opacity-100 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Botão conectar/desconectar ML */}
            {mlUserId ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ML Conectado</span>
                </div>
                <button
                  onClick={handleMLDisconnect}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={handleMLConnect}
                disabled={mlConnecting}
                title="Conectar ao Mercado Livre para usar a API oficial (buscas mais precisas)"
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mlConnecting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <LogIn className="w-4 h-4" />
                }
                <span className="hidden sm:inline">Conectar ML</span>
              </button>
            )}
          </div>
        </div>

        {/* Banner de notificação mobile */}
        {mlNotification && (
          <div className={`sm:hidden px-4 py-2 text-xs flex items-center gap-2 border-t ${
            mlNotification.type === 'success'
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {mlNotification.type === 'success'
              ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            }
            <span>{mlNotification.msg}</span>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-900 border border-gray-800 rounded-xl p-1 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab('analyze')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === 'analyze'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" /> Analisar URL
          </button>
          <button
            onClick={() => setActiveTab('garimpo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === 'garimpo'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gem className="w-4 h-4" /> Garimpar
          </button>
        </div>

        {/* Aba Garimpo */}
        {activeTab === 'garimpo' && (
          <GarimpoTab
            onSelectProduct={(productUrl) => {
              setActiveTab('analyze')
              setUrl(productUrl)
              handleAnalyze(productUrl)
            }}
          />
        )}

        {/* Aba Analisar URL */}
        {activeTab === 'analyze' && <>
        {/* Hero + Search */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            Analise qualquer produto do{' '}
            <span className="text-orange-400">Mercado Livre</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Cole o link do produto e descubra: fornecedores, margem de lucro, frete, comissão e
            potencial de vendas — tudo em segundos.
          </p>

          {/* Barra de busca */}
          <div className="max-w-3xl mx-auto flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="Cole o link do produto aqui... ex: https://www.mercadolivre.com.br/..."
                className="w-full pl-10 pr-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
              />
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !url.trim()}
              className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analisando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Analisar
                </>
              )}
            </button>
          </div>

          <p className="text-gray-500 text-xs mt-3">
            Funciona com qualquer link do Mercado Livre Brasil (MLB)
          </p>

          {error && (
            <div className="max-w-3xl mx-auto mt-4 p-4 bg-red-950/50 border border-red-800 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Estado vazio */}
        {!analysis && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: 'Volume de Vendas',
                desc: 'Veja quantas unidades são vendidas por dia e por mês',
              },
              {
                icon: DollarSign,
                title: 'Margem de Lucro',
                desc: 'Calcule o lucro real depois de comissão, frete e impostos',
              },
              {
                icon: Package,
                title: 'Fornecedores',
                desc: 'Encontre fornecedores no AliExpress e atacado nacional',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 bg-gray-900 border border-gray-800 rounded-xl text-left">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-gray-800 rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-64 bg-gray-800 rounded-xl" />
              <div className="h-64 bg-gray-800 rounded-xl" />
            </div>
          </div>
        )}

        {/* Resultado da análise */}
        {analysis && !loading && (
          <div className="space-y-6">
            <ProductCard analysis={analysis} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                icon={ShoppingCart}
                label="Vendas Estimadas/Mês"
                value={formatNumber(analysis.estimates.monthlySales)}
                sub={`${formatNumber(analysis.estimates.dailySales)}/dia`}
                color="blue"
              />
              <KpiCard
                icon={DollarSign}
                label="Faturamento/Mês"
                value={formatCurrency(analysis.estimates.monthlyRevenue)}
                sub="estimativa"
                color="green"
              />
              <KpiCard
                icon={TrendingUp}
                label="Comissão ML"
                value={formatPercent(analysis.commission.pct)}
                sub={formatCurrency(analysis.commission.total)}
                color="orange"
              />
              <KpiCard
                icon={Star}
                label="Score de Oportunidade"
                value={`${analysis.estimates.score}/100`}
                sub={getScoreLabel(analysis.estimates.score)}
                color={
                  analysis.estimates.score >= 70
                    ? 'green'
                    : analysis.estimates.score >= 40
                    ? 'yellow'
                    : 'red'
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <ScoreGauge score={analysis.estimates.score} />
              </div>
              <div className="lg:col-span-2">
                <ProductDetails analysis={analysis} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProfitCalculator
                defaultSupplierCost={analysis.product.price * 0.35}
                salePrice={analysis.product.price}
                shippingQuotes={shippingQuotes}
                onRecalculate={handleRecalcProfit}
                profit={profit}
              />
              {profit && <CostBreakdownChart profit={profit} />}
            </div>

            <SuppliersPanel suppliers={suppliers} productTitle={analysis.product.title} mlPrice={analysis.product.price} />

            <ShippingPanel quotes={shippingQuotes} productPrice={analysis.product.price} />
          </div>
        )}
        </>}
      </div>
    </main>
  )
}

function ProductCard({ analysis }: { analysis: ProductAnalysis }) {
  const p = analysis.product
  const discount =
    p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0

  return (
    <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl flex flex-col md:flex-row gap-6">
      {p.thumbnail && (
        <img
          src={p.thumbnail.replace('http://', 'https://')}
          alt={p.title}
          className="w-32 h-32 object-contain rounded-lg bg-white p-2 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start gap-2 mb-2">
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
            {p.categoryName}
          </span>
          {p.listingType === 'gold_pro' && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">
              Premium
            </span>
          )}
          {p.freeShipping && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">
              Frete Grátis
            </span>
          )}
          {p.logisticType === 'fulfillment' && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
              Full ML
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold text-white mb-3 line-clamp-2">{p.title}</h2>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-bold text-orange-400">{formatCurrency(p.price)}</span>
          {p.originalPrice && p.originalPrice > p.price && (
            <>
              <span className="text-gray-500 line-through text-lg">
                {formatCurrency(p.originalPrice)}
              </span>
              <span className="text-green-400 text-sm font-medium">-{discount}%</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
          <span>
            Vendedor: <span className="text-gray-300">{p.sellerName}</span>
          </span>
          <span>
            Total vendido: <span className="text-gray-300">{formatNumber(p.soldQuantity)} un</span>
          </span>
          <span>
            Em estoque: <span className="text-gray-300">{formatNumber(p.availableQuantity)}</span>
          </span>
        </div>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-xs text-orange-400 hover:text-orange-300 transition"
        >
          Ver no Mercado Livre <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  }

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
      <div
        className={`w-8 h-8 rounded-lg border flex items-center justify-center mb-3 ${colorMap[color]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  )
}

function ProductDetails({ analysis }: { analysis: ProductAnalysis }) {
  const { product: p, commission: c } = analysis

  const details = [
    { label: 'ID do Produto', value: p.externalId },
    {
      label: 'Tipo de Anúncio',
      value:
        p.listingType === 'gold_pro'
          ? 'Premium (Gold Pro)'
          : p.listingType === 'gold_special'
          ? 'Clássico (Gold Special)'
          : 'Gratuito',
    },
    {
      label: 'Logística',
      value:
        p.logisticType === 'fulfillment'
          ? 'Full Mercado Livre'
          : p.logisticType === 'xd_drop_off'
          ? 'Flex'
          : 'Envio pelo vendedor',
    },
    { label: 'Frete Grátis', value: p.freeShipping ? 'Sim' : 'Não' },
    { label: 'Comissão (%)', value: formatPercent(c.pct) },
    { label: 'Comissão (R$)', value: formatCurrency(c.value) },
    { label: 'Taxa Fixa', value: formatCurrency(c.fixedFee) },
    { label: 'Total Taxas ML', value: formatCurrency(c.total) },
  ]

  return (
    <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl h-full">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-orange-400" />
        Detalhes do Produto
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {details.map(({ label, value }) => (
          <div key={label} className="p-3 bg-gray-800/50 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-sm font-medium text-white">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
