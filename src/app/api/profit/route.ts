import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const {
      productId,
      supplierCost,
      salePrice,
      commissionPct,
      commissionVal,
      fixedFee = 0,
      shippingCost = 0,
      taxRate = 6,
      otherCosts = 0,
    } = await req.json()

    if (!salePrice || !supplierCost) {
      return NextResponse.json(
        { error: 'Preço de venda e custo do fornecedor são obrigatórios' },
        { status: 400 }
      )
    }

    const sale = Number(salePrice)
    const cost = Number(supplierCost)
    const commission = Number(commissionVal ?? sale * (Number(commissionPct) / 100))
    const fixed = Number(fixedFee)
    const shipping = Number(shippingCost)
    const tax = Number(taxRate)
    const other = Number(otherCosts)

    const taxValue = sale * (tax / 100)
    const totalCosts = cost + commission + fixed + shipping + taxValue + other
    const grossProfit = sale - cost
    const netProfit = sale - totalCosts
    const marginPct = (netProfit / sale) * 100
    const roiPct = (netProfit / cost) * 100
    const breakEvenPrice = (cost + fixed + other) / (1 - commissionPct / 100 - tax / 100)

    const result = {
      salePrice: sale,
      supplierCost: cost,
      commissionValue: commission,
      fixedFee: fixed,
      shippingCost: shipping,
      taxValue,
      otherCosts: other,
      totalCosts,
      grossProfit,
      netProfit,
      marginPct,
      roiPct,
      breakEvenPrice,
    }

    // Salvar análise se tiver productId
    if (productId) {
      await prisma.profitabilityAnalysis.create({
        data: {
          productId,
          supplierCost: cost,
          salePrice: sale,
          marketplaceCommissionPct: Number(commissionPct),
          marketplaceCommissionVal: commission,
          marketplaceFixedFee: fixed,
          shippingCost: shipping,
          taxRate: tax,
          taxValue,
          otherCosts: other,
          grossProfit,
          netProfit,
          marginPct,
          roiPct,
          breakEvenPrice,
        },
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[profit]', err)
    return NextResponse.json({ error: 'Erro ao calcular rentabilidade' }, { status: 500 })
  }
}
