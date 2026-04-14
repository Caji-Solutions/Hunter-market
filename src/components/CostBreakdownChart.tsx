'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ProfitResult } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  profit: ProfitResult
}

export function CostBreakdownChart({ profit }: Props) {
  const data = [
    { name: 'Custo produto', value: profit.supplierCost, color: '#f97316' },
    { name: 'Comissão ML', value: profit.commissionValue + profit.fixedFee, color: '#ef4444' },
    { name: 'Frete', value: profit.shippingCost, color: '#a855f7' },
    { name: 'Imposto', value: profit.taxValue, color: '#f59e0b' },
    { name: 'Outros', value: profit.otherCosts, color: '#6b7280' },
    { name: 'Lucro líquido', value: Math.max(0, profit.netProfit), color: '#22c55e' },
  ].filter((d) => d.value > 0)

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{name: string; value: number; payload: {color: string}}> }) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      const pct = ((item.value / profit.salePrice) * 100).toFixed(1)
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white text-sm font-medium">{item.name}</p>
          <p className="text-orange-400 text-sm">{formatCurrency(item.value)}</p>
          <p className="text-gray-400 text-xs">{pct}% do preço de venda</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
      <h3 className="font-semibold text-white mb-5">Composição do Preço de Venda</h3>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Tabela resumo */}
      <div className="mt-4 space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-gray-400">{item.name}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-300">{formatCurrency(item.value)}</span>
              <span className="text-gray-500 w-12 text-right">
                {((item.value / profit.salePrice) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
