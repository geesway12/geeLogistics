// Shared helpers
export const store = {
  rmbRate: parseFloat(localStorage.getItem('rmbRate') || '2'),
  usdRate: parseFloat(localStorage.getItem('usdRate') || '16')
};

export function saveRates(rmb, usd) {
  store.rmbRate = rmb;
  store.usdRate = usd;
  localStorage.setItem('rmbRate', rmb);
  localStorage.setItem('usdRate', usd);
}

/**
 * Compute totals.
 * Required fields: unitpriceRmb, chinaShipRmb, cbm, usdRateCbm, margin
 * Optional: totalPriceRmb (if not provided we compute it = unit + ship)
 */
export function calcTotals(item) {
  const {
    unitpriceRmb,
    chinaShipRmb,
    totalPriceRmb = unitpriceRmb + chinaShipRmb,
    cbm,
    usdRateCbm,
    margin
  } = item;

  const shippingUsd   = cbm * usdRateCbm;
  const totalCostGhs  =
    totalPriceRmb * store.rmbRate +
    shippingUsd  * store.usdRate;

  const saleGhs   = Math.round(totalCostGhs * (1 + margin / 100));
  const profitGhs = Math.round(saleGhs - totalCostGhs);

  return {
    totalPriceRmb,
    shippingUsd: +shippingUsd.toFixed(2),
    totalCostGhs: Math.round(totalCostGhs),
    saleGhs,
    profitGhs
  };
}
