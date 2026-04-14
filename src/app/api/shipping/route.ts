import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const {
      fromCep = '01310-100',
      toCep = '30130-010',
      weight = 0.5,
      width = 15,
      height = 10,
      length = 20,
      insuranceValue = 100,
    } = await req.json()

    // Normalizar CEPs
    const cleanFrom = fromCep.replace(/\D/g, '')
    const cleanTo = toCep.replace(/\D/g, '')

    // Tentativa de cotação via Melhor Envio (requer token em produção)
    // Para MVP, usar estimativas baseadas em distância/peso
    const quotes = await getShippingQuotes({
      fromCep: cleanFrom,
      toCep: cleanTo,
      weight: Number(weight),
      width: Number(width),
      height: Number(height),
      length: Number(length),
      insuranceValue: Number(insuranceValue),
    })

    return NextResponse.json({ quotes, fromCep: cleanFrom, toCep: cleanTo })
  } catch (err) {
    console.error('[shipping]', err)
    return NextResponse.json({ error: 'Erro ao calcular frete' }, { status: 500 })
  }
}

async function getShippingQuotes(params: {
  fromCep: string
  toCep: string
  weight: number
  width: number
  height: number
  length: number
  insuranceValue: number
}) {
  const melhorEnvioToken = process.env.MELHOR_ENVIO_TOKEN

  if (melhorEnvioToken) {
    try {
      const res = await fetch('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${melhorEnvioToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'ProductHunter/1.0 (contact@producthunter.com)',
        },
        body: JSON.stringify({
          from: { postal_code: params.fromCep },
          to: { postal_code: params.toCep },
          products: [
            {
              id: '1',
              width: params.width,
              height: params.height,
              length: params.length,
              weight: params.weight,
              insurance_value: params.insuranceValue,
              quantity: 1,
            },
          ],
          options: { receipt: false, own_hand: false },
        }),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          return data
            .filter((q) => !q.error)
            .map((q) => ({
              id: q.id,
              name: q.name,
              price: parseFloat(q.price),
              deliveryDaysMin: q.delivery_range?.min ?? q.delivery_time,
              deliveryDaysMax: q.delivery_range?.max ?? q.delivery_time + 2,
              company: q.company?.name ?? q.name,
            }))
        }
      }
    } catch {
      // Fallback para estimativas
    }
  }

  // Estimativas baseadas em peso (fallback sem token)
  return generateShippingEstimates(params.weight, params.insuranceValue)
}

function generateShippingEstimates(weight: number, insuranceValue: number) {
  const baseByWeight = weight <= 0.3 ? 12 : weight <= 1 ? 18 : weight <= 5 ? 28 : 45
  const insuranceFee = insuranceValue * 0.015

  return [
    {
      id: 1,
      name: 'PAC',
      price: +(baseByWeight + insuranceFee).toFixed(2),
      deliveryDaysMin: 5,
      deliveryDaysMax: 10,
      company: 'Correios',
    },
    {
      id: 2,
      name: 'SEDEX',
      price: +(baseByWeight * 1.8 + insuranceFee).toFixed(2),
      deliveryDaysMin: 1,
      deliveryDaysMax: 3,
      company: 'Correios',
    },
    {
      id: 3,
      name: '.Package',
      price: +(baseByWeight * 0.9 + insuranceFee).toFixed(2),
      deliveryDaysMin: 4,
      deliveryDaysMax: 8,
      company: 'Jadlog',
    },
    {
      id: 4,
      name: 'Mini Envios',
      price: +(baseByWeight * 0.7).toFixed(2),
      deliveryDaysMin: 5,
      deliveryDaysMax: 12,
      company: 'Correios',
    },
  ]
}
