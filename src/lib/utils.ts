import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function extractMLId(url: string): string | null {
  // Suporta todos os formatos de URL do Mercado Livre:
  // https://www.mercadolivre.com.br/.../MLB4086732385-titulo-_JM
  // https://produto.mercadolivre.com.br/MLB-4086732385-titulo
  // https://www.mercadolivre.com.br/.../p/MLB39073428 (catálogo)
  // MLB4086732385 (ID direto)
  const match = url.match(/MLB[-]?(\d{8,})/i)
  if (match) return `MLB${match[1]}`
  return null
}

// Detecta se URL é de catálogo (/p/MLB...) vs produto individual
export function isMLCatalogUrl(url: string): boolean {
  return /\/p\/MLB\d+/i.test(url)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-500'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}

export function getScoreLabel(score: number): string {
  if (score >= 70) return 'Excelente'
  if (score >= 50) return 'Bom'
  if (score >= 30) return 'Regular'
  return 'Baixo'
}
