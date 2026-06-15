/**
 * Premium Seller Tool Router - Maps all seller tool slugs to their premium components
 */
import React, { lazy, Suspense, memo } from 'react'
import { CardSkeleton } from './PremiumSellerCharts'

// Premium seller tool components (lazy loaded for performance)
const AmazonSellerProfitIntelligence = lazy(() => import('./tools/AmazonSellerProfitIntelligence'))
const FlipkartSellerEarningsAnalyzer = lazy(() => import('./tools/FlipkartSellerEarningsAnalyzer'))
const ProfitOptimizer = lazy(() => import('./tools/ProfitOptimizer'))
const CODRiskFeeAnalyzer = lazy(() => import('./tools/CODRiskFeeAnalyzer'))
const ShippingLabelStudio = lazy(() => import('./tools/ShippingLabelStudio'))
const InventoryForecastDashboard = lazy(() => import('./tools/InventoryForecastDashboard'))
const SmartGSTInvoiceBuilder = lazy(() => import('./tools/SmartGSTInvoiceBuilder'))
const SmartProductPricingEngine = lazy(() => import('./tools/SmartProductPricingEngine'))
const BusinessROIIntelligence = lazy(() => import('./tools/BusinessROIIntelligence'))
const SellerBusinessPerformanceDashboard = lazy(() => import('./tools/SellerBusinessPerformanceDashboard'))

/**
 * Complete map of seller tool slugs to their premium components
 */
const SELLER_TOOL_MAP = {
  // Premium upgrades (new names)
  'amazon-seller-profit-intelligence': AmazonSellerProfitIntelligence,
  'flipkart-seller-earnings-analyzer': FlipkartSellerEarningsAnalyzer,
  'ecommerce-profit-optimizer': ProfitOptimizer,
  'cod-risk-fee-analyzer': CODRiskFeeAnalyzer,
  'advanced-shipping-label-studio': ShippingLabelStudio,
  'inventory-forecast-dashboard': InventoryForecastDashboard,
  'smart-gst-invoice-builder': SmartGSTInvoiceBuilder,
  'smart-product-pricing-engine': SmartProductPricingEngine,
  'business-roi-intelligence': BusinessROIIntelligence,
  'seller-business-performance-dashboard': SellerBusinessPerformanceDashboard,

  // Backward compatibility with original slugs
  'amazon-fee-calculator': AmazonSellerProfitIntelligence,
  'flipkart-fee-calculator': FlipkartSellerEarningsAnalyzer,
  'profit-margin-calculator': ProfitOptimizer,
  'cod-charge-calculator': CODRiskFeeAnalyzer,
  'shipping-label-generator': ShippingLabelStudio,
  'inventory-calculator': InventoryForecastDashboard,
  'gst-invoice-generator': SmartGSTInvoiceBuilder,
  'product-pricing-calculator': SmartProductPricingEngine,
  'roi-calculator': BusinessROIIntelligence,
  'seller-profit-estimator': SellerBusinessPerformanceDashboard,
}

const LoadingFallback = () => (
  <div className="p-4 space-y-4">
    <CardSkeleton lines={4} />
    <CardSkeleton lines={3} />
  </div>
)

const SellerToolRouter = memo(({ tool }) => {
  if (!tool?.slug) return null

  const Component = SELLER_TOOL_MAP[tool.slug]
  
  if (!Component) return null

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component tool={tool} />
    </Suspense>
  )
})

export default SellerToolRouter

export const SELLER_TOOL_SLUGS = Object.keys(SELLER_TOOL_MAP)