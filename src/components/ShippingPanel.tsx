'use client'

import { useState } from 'react'
import { Truck, Clock, Shield } from 'lucide-react'
import type { ShippingQuote } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  quotes: ShippingQuote[]
  productPrice: number
}

export function ShippingPanel({ quotes, productPrice }: Props) {
  const [fromCep, setFromCep] = useState('01310-100')
  const [toCep, setToCep] = useState('30130-010')
  const [loading, setLoading] = useState(false)
  const [localQuotes, setLocalQuotes] = useState<ShippingQuote[]>(quotes)

  async function recalcShipping() {
    if (!fromCep || !toCep) return
    setLoading(true)
    try {
      const res = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCep, toCep, insuranceValue: productPrice }),
      })
      const data = await res.json()
      if (res.ok) setLocalQuotes(data.quotes || [])
    } finally {
      setLoading(false)
    }
  }

  const displayQuotes = localQuotes.length > 0 ? localQuotes : quotes

  return (
    <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
      <div className="flex items-center gap-2 mb-5">
        <Truck className="w-4 h-4 text-orange-400" />
        <h3 className="font-semibold text-white">Cotação de Frete</h3>
      </div>

      {/* Campos de CEP */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1.5 block">CEP de Origem (seu endereço)</label>
          <input
            type="text"
            value={fromCep}
            onChange={(e) => setFromCep(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1.5 block">CEP de Destino (cliente)</label>
          <input
            type="text"
            value={toCep}
            onChange={(e) => setToCep(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={recalcShipping}
            disabled={loading}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition whitespace-nowrap"
          >
            {loading ? 'Calculando...' : 'Calcular'}
          </button>
        </div>
      </div>

      {/* Cotações */}
      {displayQuotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {displayQuotes.map((quote, i) => (
            <ShippingQuoteCard key={i} quote={quote} isCheapest={i === 0} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Preencha os CEPs e clique em Calcular</p>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg">
        <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400">
          Valores estimados. Para cotação exata, configure o token do{' '}
          <strong>Melhor Envio</strong> nas variáveis de ambiente.
        </p>
      </div>
    </div>
  )
}

function ShippingQuoteCard({ quote, isCheapest }: { quote: ShippingQuote; isCheapest: boolean }) {
  return (
    <div className={`p-4 rounded-xl border transition ${
      isCheapest
        ? 'bg-green-950/30 border-green-800 ring-1 ring-green-700'
        : 'bg-gray-800 border-gray-700'
    }`}>
      {isCheapest && (
        <span className="text-xs text-green-400 font-medium mb-2 block">Mais barato</span>
      )}
      <div className="font-bold text-white text-lg">{formatCurrency(quote.price)}</div>
      <div className="text-sm text-gray-300 mt-1">{quote.company}</div>
      <div className="text-xs text-gray-500">{quote.name}</div>
      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        <span>{quote.deliveryDaysMin}–{quote.deliveryDaysMax} dias úteis</span>
      </div>
    </div>
  )
}
