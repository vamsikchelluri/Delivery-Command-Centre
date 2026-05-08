export function computeGrossMarginPercent(revenue, cost) {
  if (!revenue) return 0;
  return Number((((revenue - cost) / revenue) * 100).toFixed(2));
}

export function weightedValue(estimatedRevenue, probability) {
  return Number(((estimatedRevenue * probability) / 100).toFixed(2));
}
