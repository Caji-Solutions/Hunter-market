export interface ProductAnalysis {
  product: {
    id: string
    externalId: string
    title: string
    price: number
    originalPrice: number | null
    soldQuantity: number
    availableQuantity: number
    categoryId: string
    categoryName: string
    sellerId: string
    sellerName: string
    listingType: string
    freeShipping: boolean
    logisticType: string | null
    thumbnail: string
    url: string
  }
  commission: {
    pct: number
    value: number
    fixedFee: number
    total: number
  }
  estimates: {
    dailySales: number
    monthlySales: number
    monthlyRevenue: number
    score: number
  }
}

export interface ProfitResult {
  salePrice: number
  supplierCost: number
  commissionValue: number
  fixedFee: number
  shippingCost: number
  taxValue: number
  otherCosts: number
  totalCosts: number
  grossProfit: number
  netProfit: number
  marginPct: number
  roiPct: number
  breakEvenPrice: number
}

export interface Supplier {
  source: string
  label: string
  supplierTitle: string
  supplierUrl: string
  imageUrl: string | null
  estimatedCostMin: number | null
  estimatedCostMax: number | null
  estimatedMarginMin: number | null
  estimatedMarginMax: number | null
  estimatedProfitMin: number | null
  estimatedProfitMax: number | null
  shippingTimeDaysMin: number
  shippingTimeDaysMax: number
  shippingCost: number | null
  isFreeShipping: boolean
  sellerRating: number | null
  ordersCount: number | null
  isSearchLink: boolean
  isBestPick: boolean
  tip: string
}

export interface ShippingQuote {
  id: number
  name: string
  price: number
  deliveryDaysMin: number
  deliveryDaysMax: number
  company: string
}
