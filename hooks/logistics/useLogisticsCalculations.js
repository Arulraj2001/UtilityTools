/**
 * useLogisticsCalculations - Memoized hook for premium logistics calculations
 * Provides real-time computation with React.memo, useMemo, and useCallback optimization
 */
import { useMemo, useCallback, useState } from 'react'
import {
  calcAllCouriers,
  calcDeliveryTime,
  calcCBMDetailed,
  calcChargeableWeightDetailed,
  calcPackagingCost,
  calcAirFreight,
  calcContainerLoad,
  calcParcelDimension,
  calcVolumetricWeightDetailed,
  calcShippingCostDetailed,
} from '@/lib/logistics/premiumLogisticsMath'

export function useCourierAnalysis(inputs) {
  return useMemo(() => {
    if (!inputs.weight || !inputs.distance) return null
    return calcAllCouriers({
      weight: parseFloat(inputs.weight),
      distance: parseFloat(inputs.distance),
      parcelType: inputs.parcelType || 'standard',
      deliverySpeed: inputs.deliverySpeed || 'standard',
      codAmount: parseFloat(inputs.codAmount) || 0,
      insurance: parseFloat(inputs.insurance) || 0,
    })
  }, [inputs.weight, inputs.distance, inputs.parcelType, inputs.deliverySpeed, inputs.codAmount, inputs.insurance])
}

export function useDeliveryIntelligence(inputs) {
  return useMemo(() => {
    if (!inputs.distance) return null
    return calcDeliveryTime({
      distance: parseFloat(inputs.distance),
      mode: inputs.mode || 'ground',
      origin: inputs.origin || '',
      destination: inputs.destination || '',
      weatherDelay: parseFloat(inputs.weatherDelay) || 0,
      holidayImpact: parseFloat(inputs.holidayImpact) || 0,
      peakSeason: parseFloat(inputs.peakSeason) || 0,
    })
  }, [inputs.distance, inputs.mode, inputs.origin, inputs.destination, inputs.weatherDelay, inputs.holidayImpact, inputs.peakSeason])
}

export function useCBMPlanner(parcels, unit) {
  return useMemo(() => {
    if (!parcels || parcels.length === 0 || !parcels[0]?.length) return null
    const valid = parcels.filter(p => p.length && p.width && p.height)
    if (valid.length === 0) return null
    return calcCBMDetailed({ parcels: valid, unit: unit || 'm' })
  }, [parcels, unit])
}

export function useChargeableWeight(inputs) {
  return useMemo(() => {
    if (!inputs.actualWeight || !inputs.length || !inputs.width || !inputs.height) return null
    return calcChargeableWeightDetailed({
      actualWeight: parseFloat(inputs.actualWeight),
      length: parseFloat(inputs.length),
      width: parseFloat(inputs.width),
      height: parseFloat(inputs.height),
      unit: inputs.unit || 'cm',
      divisor: parseFloat(inputs.divisor) || 5000,
      courierRules: inputs.courierRules || false,
    })
  }, [inputs.actualWeight, inputs.length, inputs.width, inputs.height, inputs.unit, inputs.divisor, inputs.courierRules])
}

export function usePackagingAnalysis(inputs) {
  return useMemo(() => {
    if (!inputs.quantity) return null
    return calcPackagingCost({
      boxCost: parseFloat(inputs.boxCost) || 0,
      tapeCost: parseFloat(inputs.tapeCost) || 0,
      fillerCost: parseFloat(inputs.fillerCost) || 0,
      labelCost: parseFloat(inputs.labelCost) || 0,
      laborCost: parseFloat(inputs.laborCost) || 0,
      quantity: parseInt(inputs.quantity) || 1,
      packagingType: inputs.packagingType || 'corrugated_box',
      monthlyShipments: parseInt(inputs.monthlyShipments) || 0,
    })
  }, [inputs.boxCost, inputs.tapeCost, inputs.fillerCost, inputs.labelCost, inputs.laborCost, inputs.quantity, inputs.packagingType, inputs.monthlyShipments])
}

export function useAirFreightPricing(inputs) {
  return useMemo(() => {
    if (!inputs.actualWeight) return null
    return calcAirFreight({
      actualWeight: parseFloat(inputs.actualWeight),
      length: parseFloat(inputs.length) || 0,
      width: parseFloat(inputs.width) || 0,
      height: parseFloat(inputs.height) || 0,
      unit: inputs.unit || 'cm',
      airline: inputs.airline || 'emirates',
      ratePerKg: parseFloat(inputs.ratePerKg) || 0,
      customsFee: parseFloat(inputs.customsFee) || 0,
      dangerousGoods: inputs.dangerousGoods || false,
      cargoClass: inputs.cargoClass || '',
    })
  }, [inputs.actualWeight, inputs.length, inputs.width, inputs.height, inputs.unit, inputs.airline, inputs.ratePerKg, inputs.customsFee, inputs.dangerousGoods, inputs.cargoClass])
}

export function useContainerOptimization(packages, containerType) {
  return useMemo(() => {
    if (!packages || packages.length === 0 || !containerType) return null
    const valid = packages.filter(p => p.length && p.width && p.height)
    if (valid.length === 0) return null
    return calcContainerLoad({ packages: valid, containerType })
  }, [packages, containerType])
}

export function useParcelIntelligence(inputs) {
  return useMemo(() => {
    if (!inputs.length && !inputs.width && !inputs.height) return null
    return calcParcelDimension({
      length: parseFloat(inputs.length) || 0,
      width: parseFloat(inputs.width) || 0,
      height: parseFloat(inputs.height) || 0,
      unit: inputs.unit || 'cm',
      targetVolume: parseFloat(inputs.targetVolume) || 0,
      targetWeight: parseFloat(inputs.targetWeight) || 0,
      divisor: parseFloat(inputs.divisor) || 5000,
    })
  }, [inputs.length, inputs.width, inputs.height, inputs.unit, inputs.targetVolume, inputs.targetWeight, inputs.divisor])
}

export function useVolumetricAnalyzer(inputs) {
  return useMemo(() => {
    if (!inputs.length || !inputs.width || !inputs.height) return null
    return calcVolumetricWeightDetailed({
      length: parseFloat(inputs.length),
      width: parseFloat(inputs.width),
      height: parseFloat(inputs.height),
      unit: inputs.unit || 'cm',
      actualWeight: parseFloat(inputs.actualWeight) || 0,
      presets: inputs.presets || null,
    })
  }, [inputs.length, inputs.width, inputs.height, inputs.unit, inputs.actualWeight, inputs.presets])
}

export function useShippingEstimator(inputs) {
  return useMemo(() => {
    const packages = inputs.packages
    if (!packages || packages.length === 0 || !inputs.distance) return null
    const valid = packages.filter(p => p.length && p.width && p.height && p.weight)
    if (valid.length === 0) return null
    return calcShippingCostDetailed({
      packages: valid,
      distance: parseFloat(inputs.distance),
      mode: inputs.mode || 'ground',
      insurance: inputs.insurance || false,
      cod: inputs.cod || false,
      gst: inputs.gst !== false,
      fuelAdjustment: inputs.fuelAdjustment || false,
      peakPricing: inputs.peakPricing || false,
    })
  }, [inputs.packages, inputs.distance, inputs.mode, inputs.insurance, inputs.cod, inputs.gst, inputs.fuelAdjustment, inputs.peakPricing])
}

/**
 * useShippingState - Manages input state for multi-package tools
 */
export function useShippingState(initialPackages = []) {
  const [packages, setPackages] = useState(initialPackages.length > 0 ? initialPackages : [
    { length: 50, width: 40, height: 30, weight: 5, quantity: 1, unit: 'cm' },
  ])

  const addPackage = useCallback(() => {
    setPackages(prev => [...prev, { length: 50, width: 40, height: 30, weight: 5, quantity: 1, unit: 'cm' }])
  }, [])

  const removePackage = useCallback((index) => {
    setPackages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updatePackage = useCallback((index, field, value) => {
    setPackages(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }, [])

  return { packages, setPackages, addPackage, removePackage, updatePackage }
}

/**
 * useLogisticsHistory - Saves calculation results to localStorage
 */
export function useLogisticsHistory(toolSlug, maxEntries = 10) {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(`logistics_history_${toolSlug}`)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const addEntry = useCallback((entry) => {
    setHistory(prev => {
      const updated = [{ ...entry, timestamp: Date.now() }, ...prev].slice(0, maxEntries)
      localStorage.setItem(`logistics_history_${toolSlug}`, JSON.stringify(updated))
      return updated
    })
  }, [toolSlug, maxEntries])

  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(`logistics_history_${toolSlug}`)
  }, [toolSlug])

  return { history, addEntry, clearHistory }
}