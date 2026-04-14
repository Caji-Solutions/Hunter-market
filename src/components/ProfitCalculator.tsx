'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Calculator, Info } from 'lucide-react'
import type { ProfitResult, ShippingQuote } from '@/types'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface Props {
  defaultSupplierCost: number
  salePrice: number
  shippingQuotes: ShippingQuote[]
  profit: ProfitResult | null
  onRecalculate: (supplierCost: number, shippingCost: number, taxRate: number, otherCosts: number) => void
}

export function ProfitCalculator({ defaultSupplierCost, salePrice, shippingQuotes, profit, onRecalculate }: Props) {
  const [supplierCost, setSupplierCost] = useState(defaultSupplierCost.toFixed(2))
  const [shippingCost, setShippingCost] = useState(
    shippingQuotes.length > 0 ? shippingQuotes[0].price.toFixed(2) : '0'
  )
  const [taxRate, setTaxRate] = useState('6')
  const [otherCosts, setOtherCosts] = useState('0')

  useEffect(() => {
    if (shippingQuotes.length > 0 && shippingCost === '0') {
      setShippingCost(shippingQuotes[0].price.toFixed(2))
    }
  }, [shippingQuotes])

  function handleRecalc() {
    onRecalculate(
      parseFloat(supplierCost) || 0,
      parseFloat(shippingCost) || 0,
      parseFloat(taxRate) || 0,
      parseFloat(otherCosts) || 0
    )
  }

  const isProfit = profit && profit.netProfit > 0

  return (
    <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
      <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-orange-400" />
        Calculadora de Lucro
      </h3>

      <div className="space-y-4 mb-5">
        <InputField
          label="Custo do Fornecedor (R$)"
          value={supplierCost}
          onChange={setSupplierCost}
          onBlur={handleRecalc}
          hint="Quanto você paga pelo produto no fornecedor"
        />

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Preço de Venda (R$)</label>
          <div className="px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-medium">
            {formatCurrency(salePrice)}
            <span className="text-gray-400 font-normal ml-2">(preço atual do ML)</span>
          </div>
        </div>

        <InputField
          label="Frete ao Comprador (R$)"
          value={shippingCost}
          onChange={setShippingCost}
          onBlur={handleRecalc}
          hint="Custo do frete que você pagará"
          select={shippingQuotes.length > 0 ? shippingQuotes.map(q => ({
            value: q.price.toFixed(2),
            label: `${q.company} ${q.name} — ${formatCurrency(q.price)} (${q.deliveryDaysMin}-${q.deliveryDaysMax}d)`,
          })) : undefined}
          onSelectChange={(v) => { setShippingCost(v); setTimeout(handleRecalc, 50) }}
        />

        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Imposto (%)"
            value={taxRate}
            onChange={setTaxRate}
            onBlur={handleRecalc}
            hint="Ex: 6% Simples Nacional"
          />
          <InputField
            label="Outros Custos (R$)"
            value={otherCosts}
            onChange={setOtherCosts}
            onBlur={handleRecalc}
            hint="Embalagem, mão de obra, etc"
          />
        </div>
      </div>

      {profit && (
        <div className={`p-4 rounded-xl border ${isProfit ? 'bg-green-950/30 border-green-800' : 'bg-red-950/30 border-red-800'}`}>
          <div className="flex items-center gap-2 mb-4">
            {isProfit
              ? <TrendingUp className="w-5 h-5 text-green-400" />
              : <TrendingDown className="w-5 h-5 text-red-400" />
            }
            <span className={`font-bold text-lg ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              Lucro Líquido: {formatCurrency(profit.netProfit)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <ResultRow label="Receita" value={formatCurrency(profit.salePrice)} neutral />
            <ResultRow label="Custo produto" value={`-${formatCurrency(profit.supplierCost)}`} bad />
            <ResultRow label="Comissão ML" value={`-${formatCurrency(profit.commissionValue)}`} bad />
            <ResultRow label="Taxa fixa" value={`-${formatCurrency(profit.fixedFee)}`} bad />
            <ResultRow label="Frete" value={`-${formatCurrency(profit.shippingCost)}`} bad />
            <ResultRow label="Imposto" value={`-${formatCurrency(profit.taxValue)}`} bad />
            {profit.otherCosts > 0 && (
              <ResultRow label="Outros" value={`-${formatCurrency(profit.otherCosts)}`} bad />
            )}
            <div className="col-span-2 border-t border-gray-600 pt-2 mt-1" />
            <ResultRow label="Margem" value={formatPercent(profit.marginPct)} good={profit.marginPct > 0} />
            <ResultRow label="ROI" value={formatPercent(profit.roiPct)} good={profit.roiPct > 0} />
            <ResultRow label="Break-even" value={formatCurrency(profit.breakEvenPrice)} neutral />
          </div>
        </div>
      )}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  onBlur,
  hint,
  select,
  onSelectChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  hint?: string
  select?: { value: string; label: string }[]
  onSelectChange?: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
        {label}
        {hint && (
          <span title={hint} className="cursor-help">
            <Info className="w-3 h-3 text-gray-500" />
          </span>
        )}
      </label>
      {select ? (
        <div className="space-y-1.5">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          />
          <select
            onChange={(e) => onSelectChange?.(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-xs focus:outline-none focus:border-orange-500"
            defaultValue=""
          >
            <option value="" disabled>Escolher transportadora...</option>
            {select.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
        />
      )}
    </div>
  )
}

function ResultRow({
  label,
  value,
  good,
  bad,
  neutral,
}: {
  label: string
  value: string
  good?: boolean
  bad?: boolean
  neutral?: boolean
}) {
  const valueColor = good ? 'text-green-400' : bad ? 'text-red-400' : 'text-gray-300'
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`font-medium text-xs ${valueColor}`}>{value}</span>
    </div>
  )
}
