// Inventory-bounded AQB/USDC stabilizer. It only trades when the pool price
// leaves a band; it is not a volume generator and must never be used for wash trading.
export function decide({ price, target = 1, band = 0.01, usdc = 0, aqb = 0, maxTradeUSDC = 1.6, maxTradeAQB = 1.6, cooldownOk = true }) {
  if (!cooldownOk) return { action: "none", reason: "cooldown" };
  if (!(price > 0)) return { action: "none", reason: "bad price" };
  const lower = target * (1 - band), upper = target * (1 + band);
  if (price < lower) {
    const amountUSDC = Math.min(usdc, maxTradeUSDC);
    if (amountUSDC <= 0) return { action: "none", reason: "no USDC inventory" };
    return { action: "buy", amountUSDC, reason: `price ${price.toFixed(6)} < ${lower.toFixed(6)}` };
  }
  if (price > upper) {
    const amountAQB = Math.min(aqb, maxTradeAQB);
    if (amountAQB <= 0) return { action: "none", reason: "no AQB inventory" };
    return { action: "sell", amountAQB, reason: `price ${price.toFixed(6)} > ${upper.toFixed(6)}` };
  }
  return { action: "none", reason: "inside band" };
}

export function validateAction(action, { dailyUSDC = 0, maxDailyUSDC = 5, maxSlippageBps = 100 } = {}) {
  if (!action || action.action === "none") return { ok: true };
  if (action.action === "buy") {
    if (!(action.amountUSDC > 0)) return { ok: false, error: "bad amount" };
    if (dailyUSDC + action.amountUSDC > maxDailyUSDC) return { ok: false, error: "daily cap" };
    if (!(maxSlippageBps >= 0 && maxSlippageBps <= 500)) return { ok: false, error: "bad slippage" };
    return { ok: true };
  }
  if (action.action === "sell") {
    if (!(action.amountAQB > 0)) return { ok: false, error: "bad amount" };
    return { ok: true };
  }
  return { ok: false, error: "unknown action" };
}

export function uniswapBuyQuote({ usdcIn, reserveAQB, reserveUSDC, fee = 0.003 }) {
  const inFee = usdcIn * (1 - fee);
  return (reserveAQB * inFee) / (reserveUSDC + inFee);
}
export function uniswapSellQuote({ aqbIn, reserveAQB, reserveUSDC, fee = 0.003 }) {
  const inFee = aqbIn * (1 - fee);
  return (reserveUSDC * inFee) / (reserveAQB + inFee);
}
export function poolPrice({ reserveAQB, reserveUSDC }) {
  return reserveAQB > 0 ? reserveUSDC / reserveAQB : 0;
}
