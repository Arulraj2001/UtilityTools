/**
 * Seller Tools Calculation Hooks - Memoized calculation hooks for all seller tools
 */
import { useMemo } from 'react'
import {
  calculateAmazonFees,
  calculateFlipkartFees,
  calculateProfitOptimization,
  calculateCODAnalysis,
  calculateInventoryForecast,
  generateGSTInvoice,
  calculatePricingEngine,
  calculateROI,
  calculateSellerPerformance,
} from '@/lib/seller/premiumSellerMath'

export function useAmazonAnalysis(inputs) {
  return useMemo(() => {
    const { sellingPrice, listingPrice, weight, gstRate, fba, adsCost, returnRate } = inputs
    if (!sellingPrice || !listingPrice) return null
    return calculateAmazonFees({
      sellingPrice: Number(sellingPrice),
      listingPrice: Number(listingPrice),
      weight: Number(weight) || 0.5,
      gstRate: Number(gstRate) || 18,
      fba: fba === 'true' || fba === true,
      adsCost: Number(adsCost) || 0,
      returnRate: Number(returnRate) || 0,
    })
  }, [inputs.sellingPrice, inputs.listingPrice, inputs.weight, inputs.gstRate, inputs.fba, inputs.adsCost, inputs.returnRate])
}

export function useFlipkartAnalysis(inputs) {
  return useMemo(() => {
    const { sellingPrice, listingPrice, weight, shippingSlab, fixedFee, discount, gstRate } = inputs
    if (!sellingPrice || !listingPrice) return null
    return calculateFlipkartFees({
      sellingPrice: Number(sellingPrice),
      listingPrice: Number(listingPrice),
      weight: Number(weight) || 0.5,
      shippingSlab: shippingSlab || 'standard',
      fixedFee: Number(fixedFee) || 35,
      discount: Number(discount) || 0,
      gstRate: Number(gstRate) || 18,
    })
  }, [inputs.sellingPrice, inputs.listingPrice, inputs.weight, inputs.shippingSlab, inputs.fixedFee, inputs.discount, inputs.gstRate])
}

export function useProfitOptimization(inputs) {
  return useMemo(() => {
    const { costPrice, sellingPrice, quantity, operatingExpenses, adsSpend, competitorPrice, targetMargin } = inputs
    if (!costPrice || !sellingPrice) return null
    return calculateProfitOptimization({
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      quantity: Number(quantity) || 1,
      operatingExpenses: Number(operatingExpenses) || 0,
      adsSpend: Number(adsSpend) || 0,
      competitorPrice: Number(competitorPrice) || 0,
      targetMargin: Number(targetMargin) || 20,
    })
  }, [inputs.costPrice, inputs.sellingPrice, inputs.quantity, inputs.operatingExpenses, inputs.adsSpend, inputs.competitorPrice, inputs.targetMargin])
}

export function useCODAnalysis(inputs) {
  return useMemo(() => {
    const { codAmount, averageOrderValue, returnRate, courierCodFee, prepaidRatio } = inputs
    if (!codAmount) return null
    return calculateCODAnalysis({
      codAmount: Number(codAmount),
      averageOrderValue: Number(averageOrderValue) || 500,
      returnRate: Number(returnRate) || 10,
      courierCodFee: Number(courierCodFee) || 30,
      prepaidRatio: Number(prepaidRatio) || 40,
    })
  }, [inputs.codAmount, inputs.averageOrderValue, inputs.returnRate, inputs.courierCodFee, inputs.prepaidRatio])
}

export function useInventoryForecast(inputs) {
  return useMemo(() => {
    const { currentStock, monthlySales, leadTime, reorderPoint, safetyStock, price, cost } = inputs
    if (!currentStock || !monthlySales) return null
    return calculateInventoryForecast({
      currentStock: Number(currentStock),
      monthlySales: Number(monthlySales),
      leadTime: Number(leadTime) || 15,
      reorderPoint: Number(reorderPoint) || 50,
      safetyStock: Number(safetyStock) || 20,
      price: Number(price) || 0,
      cost: Number(cost) || 0,
    })
  }, [inputs.currentStock, inputs.monthlySales, inputs.leadTime, inputs.reorderPoint, inputs.safetyStock, inputs.price, inputs.cost])
}

export function useGSTInvoice(inputs) {
  return useMemo(() => {
    const { companyName, companyAddress, gstin, invoiceNo, customerName, customerGstin, items, date, placeOfSupply } = inputs
    if (!items && !companyName) return null
    let parsedItems = items
    if (typeof items === 'string') {
      try { parsedItems = JSON.parse(items) } catch { parsedItems = [{ name: 'Product', hsn: '1234', qty: 1, rate: Number(items) || 1000 }] }
    }
    return generateGSTInvoice({
      companyName,
      companyAddress,
      gstin,
      invoiceNo,
      customerName,
      customerGstin,
      items: parsedItems,
      date,
      placeOfSupply,
    })
  }, [inputs.companyName, inputs.companyAddress, inputs.gstin, inputs.invoiceNo, inputs.customerName, inputs.customerGstin, inputs.items, inputs.date, inputs.placeOfSupply])
}

export function usePricingEngine(inputs) {
  return useMemo(() => {
    const { costPrice, targetMargin, marketplaceFees, competitorPrice, discount, psychologicalPricing } = inputs
    if (!costPrice) return null
    return calculatePricingEngine({
      costPrice: Number(costPrice),
      targetMargin: Number(targetMargin) || 20,
      marketplaceFees: Number(marketplaceFees) || 15,
      competitorPrice: Number(competitorPrice) || 0,
      discount: Number(discount) || 0,
      psychologicalPricing: psychologicalPricing !== 'false',
    })
  }, [inputs.costPrice, inputs.targetMargin, inputs.marketplaceFees, inputs.competitorPrice, inputs.discount, inputs.psychologicalPricing])
}

export function useROIAnalysis(inputs) {
  return useMemo(() => {
    const { investment, monthlyReturn, months, compoundGrowth, marketingSpend, campaignRevenue } = inputs
    if (!investment || !monthlyReturn) return null
    return calculateROI({
      investment: Number(investment),
      monthlyReturn: Number(monthlyReturn),
      months: Number(months) || 12,
      compoundGrowth: compoundGrowth !== 'false',
      marketingSpend: Number(marketingSpend) || 0,
      campaignRevenue: Number(campaignRevenue) || 0,
    })
  }, [inputs.investment, inputs.monthlyReturn, inputs.months, inputs.compoundGrowth, inputs.marketingSpend, inputs.campaignRevenue])
}

export function useSellerPerformance(inputs) {
  return useMemo(() => {
    const { monthlyRevenue, monthlyCosts, returns, adSpend, operatingExpenses, months, taxRate } = inputs
    if (!monthlyRevenue || !monthlyCosts) return null
    return calculateSellerPerformance({
      monthlyRevenue: Number(monthlyRevenue),
      monthlyCosts: Number(monthlyCosts),
      returns: Number(returns) || 5,
      adSpend: Number(adSpend) || 0,
      operatingExpenses: Number(operatingExpenses) || 0,
      months: Number(months) || 12,
      taxRate: Number(taxRate) || 18,
    })
  }, [inputs.monthlyRevenue, inputs.monthlyCosts, inputs.returns, inputs.adSpend, inputs.operatingExpenses, inputs.months, inputs.taxRate])
}