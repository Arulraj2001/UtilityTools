function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function calculateROI(inputs) {
  const investment = toNumber(inputs.investment)
  const revenue = toNumber(inputs.revenue)
  const expenses = toNumber(inputs.expenses)

  const netReturn = revenue - investment - expenses
  const roiPct = investment > 0 ? (netReturn / investment) * 100 : 0
  const assessment = roiPct >= 20 ? 'Strong return' : roiPct >= 0 ? 'Positive ROI' : 'Negative ROI'

  return {
    type: 'cards',
    cards: [
      { label: 'Investment', value: `₹${investment.toFixed(2)}`, raw: investment },
      { label: 'Revenue', value: `₹${revenue.toFixed(2)}`, raw: revenue },
      { label: 'Expenses', value: `₹${expenses.toFixed(2)}`, raw: expenses },
      { label: 'Net Return', value: `₹${netReturn.toFixed(2)}`, raw: netReturn, highlight: true },
      { label: 'ROI', value: `${roiPct.toFixed(2)}%`, raw: roiPct },
      { label: 'Profitability', value: assessment, raw: assessment },
    ],
  }
}
