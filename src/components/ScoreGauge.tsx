'use client'

import { getScoreLabel } from '@/lib/utils'

export function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const bgColor =
    score >= 70 ? '#dcfce7' : score >= 40 ? '#fef3c7' : '#fee2e2'

  const label = getScoreLabel(score)

  return (
    <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl h-full flex flex-col items-center justify-center gap-4">
      <h3 className="font-semibold text-white text-center">Score de Oportunidade</h3>

      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Fundo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1f2937"
            strokeWidth="8"
          />
          {/* Progresso */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{score}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>

      <div
        className="px-4 py-2 rounded-full text-sm font-semibold"
        style={{ backgroundColor: bgColor + '20', color, border: `1px solid ${color}40` }}
      >
        {label}
      </div>

      {/* Legenda */}
      <div className="w-full space-y-2 text-xs">
        {[
          { range: '70–100', label: 'Excelente', color: '#22c55e' },
          { range: '40–69', label: 'Regular', color: '#f59e0b' },
          { range: '0–39', label: 'Baixo', color: '#ef4444' },
        ].map(({ range, label, color }) => (
          <div key={range} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-400">{range} — {label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Score baseado em vendas, preço, frete grátis e tipo de anúncio
      </p>
    </div>
  )
}
