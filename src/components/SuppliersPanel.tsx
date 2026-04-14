'use client'

import { ExternalLink, Package, Star, Clock, Truck, CheckCircle, Lightbulb, TrendingUp, Info } from 'lucide-react'
import type { Supplier } from '@/types'
import { formatCurrency, formatPercent } from '@/lib/utils'

const SOURCE_STYLE: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  aliexpress:          { color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  aliexpress_product:  { color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  cjdropship:          { color: 'text-blue-300',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400'   },
  shopee:              { color: 'text-red-300',     bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400'    },
  mercadolivre_atacado:{ color: 'text-yellow-300',  bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  mercadoria:          { color: 'text-green-300',   bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400'  },
  brlink:              { color: 'text-purple-300',  bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-400' },
}

function getMarginBand(margin: number | null) {
  if (margin === null) return { color: 'text-gray-400', label: '–' }
  if (margin >= 30) return { color: 'text-green-400', label: 'Excelente' }
  if (margin >= 20) return { color: 'text-lime-400',  label: 'Boa' }
  if (margin >= 10) return { color: 'text-yellow-400', label: 'Regular' }
  return { color: 'text-red-400', label: 'Baixa' }
}

export function SuppliersPanel({
  suppliers,
  productTitle,
  mlPrice,
}: {
  suppliers: Supplier[]
  productTitle: string
  mlPrice?: number
}) {
  if (suppliers.length === 0) {
    return (
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl text-center">
        <Package className="w-8 h-8 mx-auto mb-2 text-gray-600" />
        <p className="text-gray-500 text-sm">Fornecedores não encontrados</p>
      </div>
    )
  }

  const bestPick = suppliers.find(s => s.isBestPick)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-400" />
          <h3 className="font-semibold text-white">Fornecedores para Dropshipping</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5" />
          Estimativas baseadas no preço ML{mlPrice ? ` (${formatCurrency(mlPrice)})` : ''}
        </div>
      </div>

      {/* Destaque: melhor opção */}
      {bestPick && (
        <div className="mx-6 mt-4 p-4 bg-green-950/40 border border-green-700/40 rounded-xl flex flex-col md:flex-row md:items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-0.5">Melhor opção encontrada</p>
            <p className="text-sm text-white font-medium truncate">{bestPick.label} — {bestPick.supplierTitle.slice(0, 60)}</p>
          </div>
          {bestPick.estimatedProfitMax !== null && (
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-gray-400">Lucro estimado até</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(bestPick.estimatedProfitMax)}</p>
            </div>
          )}
          <a
            href={bestPick.supplierUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition flex items-center gap-1.5"
          >
            Ver fornecedor <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Grid de fornecedores */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {suppliers.map((supplier, i) => (
          <SupplierCard key={i} supplier={supplier} mlPrice={mlPrice} />
        ))}
      </div>

      {/* Dica geral */}
      <div className="mx-6 mb-6 p-4 bg-blue-950/30 border border-blue-800/40 rounded-xl flex gap-3">
        <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300 space-y-1">
          <p><strong>Como validar um fornecedor:</strong></p>
          <p>1. Peça amostra antes de qualquer pedido em volume &nbsp;·&nbsp; 2. Verifique prazo de entrega real com 2–3 pedidos teste &nbsp;·&nbsp; 3. Confirme se aceita devolução/troca &nbsp;·&nbsp; 4. Calcule custo total (produto + frete + imposto de importação se aplicável)</p>
        </div>
      </div>
    </div>
  )
}

function SupplierCard({ supplier, mlPrice }: { supplier: Supplier; mlPrice?: number }) {
  const style = SOURCE_STYLE[supplier.source] ?? {
    color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-500/30', dot: 'bg-gray-400',
  }

  const marginBand = getMarginBand(supplier.estimatedMarginMax)

  return (
    <div className={`relative flex flex-col rounded-xl border bg-gray-800/60 overflow-hidden transition hover:border-gray-600 ${supplier.isBestPick ? 'border-green-600/50' : 'border-gray-700'}`}>
      {/* Best pick ribbon */}
      {supplier.isBestPick && (
        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
          MELHOR OPÇÃO
        </div>
      )}

      {/* Topo: plataforma + imagem */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
          <span className={`text-xs font-semibold ${style.color}`}>{supplier.label}</span>
          {!supplier.isSearchLink && (
            <span className="ml-auto text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">Produto real</span>
          )}
        </div>

        {/* Imagem (só quando tem) */}
        {supplier.imageUrl && (
          <div className="h-28 bg-white rounded-lg flex items-center justify-center mb-3 overflow-hidden">
            <img src={supplier.imageUrl} alt={supplier.supplierTitle} className="max-h-full max-w-full object-contain p-2" />
          </div>
        )}

        {/* Título */}
        <p className="text-sm text-gray-200 leading-snug line-clamp-2 mb-4">
          {supplier.supplierTitle}
        </p>

        {/* Custo estimado */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Custo estimado para você</p>
          {supplier.estimatedCostMin !== null ? (
            <p className="text-lg font-bold text-white">
              {formatCurrency(supplier.estimatedCostMin)}
              {supplier.estimatedCostMax !== supplier.estimatedCostMin && (
                <span className="text-sm text-gray-400"> – {formatCurrency(supplier.estimatedCostMax ?? 0)}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-500">Consultar no site</p>
          )}
        </div>

        {/* Métricas de margem e lucro */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 bg-gray-700/50 rounded-lg">
            <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Margem est.
            </p>
            {supplier.estimatedMarginMax !== null ? (
              <p className={`text-sm font-bold ${marginBand.color}`}>
                {supplier.estimatedMarginMin !== null && supplier.estimatedMarginMin < supplier.estimatedMarginMax
                  ? `${supplier.estimatedMarginMin}–${supplier.estimatedMarginMax}%`
                  : `${supplier.estimatedMarginMax}%`}
              </p>
            ) : (
              <p className="text-sm text-gray-500">–</p>
            )}
          </div>
          <div className="p-2 bg-gray-700/50 rounded-lg">
            <p className="text-[10px] text-gray-400 mb-0.5">Lucro/venda</p>
            {supplier.estimatedProfitMax !== null ? (
              <p className="text-sm font-bold text-white">
                {supplier.estimatedProfitMax > 0 ? formatCurrency(supplier.estimatedProfitMax) : <span className="text-red-400">Negativo</span>}
              </p>
            ) : (
              <p className="text-sm text-gray-500">–</p>
            )}
          </div>
        </div>

        {/* Logística */}
        <div className="space-y-1.5 text-xs text-gray-400 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Entrega em {supplier.shippingTimeDaysMin}–{supplier.shippingTimeDaysMax} dias úteis</span>
          </div>
          {supplier.isFreeShipping ? (
            <div className="flex items-center gap-1.5 text-green-400">
              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Frete grátis para você</span>
            </div>
          ) : supplier.shippingCost !== null ? (
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Frete ~{formatCurrency(supplier.shippingCost)}</span>
            </div>
          ) : null}
          {supplier.sellerRating !== null && (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span>{supplier.sellerRating.toFixed(1)} / 5.0</span>
              {supplier.ordersCount !== null && (
                <span className="text-gray-500">· {supplier.ordersCount.toLocaleString('pt-BR')} pedidos</span>
              )}
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="p-2.5 bg-gray-700/30 rounded-lg mb-4">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            <span className="text-yellow-400">💡 </span>{supplier.tip}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-auto px-4 pb-4">
        <a
          href={supplier.supplierUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition ${
            supplier.isBestPick
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : `${style.bg} ${style.border} border ${style.color} hover:opacity-80`
          }`}
        >
          {supplier.isSearchLink ? 'Buscar no' : 'Ver no'} {supplier.label}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
