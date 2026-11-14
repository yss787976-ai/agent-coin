import test from "node:test";
import assert from "node:assert/strict";
import { decide, validateAction, uniswapBuyQuote, uniswapSellQuote } from "../core.mjs";

test("no trade inside band", () => {
  assert.equal(decide({ price: 1.0, usdc: 10, aqb: 10 }).action, "none");
  assert.equal(decide({ price: 1.005, usdc: 10, aqb: 10 }).action, "none");
});

test("buys below band with USDC inventory", () => {
  const a = decide({ price: 0.98, usdc: 10, aqb: 0, maxTradeUSDC: 1.6 });
  assert.equal(a.action, "buy"); assert.equal(a.amountUSDC, 1.6);
});

test("sells above band with AQB inventory", () => {
  const a = decide({ price: 1.03, usdc: 0, aqb: 10, maxTradeAQB: 1.6 });
  assert.equal(a.action, "sell"); assert.equal(a.amountAQB, 1.6);
});

test("respects cooldown and daily cap", () => {
  assert.equal(decide({ price: 0.98, usdc: 10, aqb: 10, cooldownOk: false }).action, "none");
  const a = decide({ price: 0.98, usdc: 10, aqb: 10, maxTradeUSDC: 1.6 });
  assert.equal(validateAction(a, { dailyUSDC: 4.5, maxDailyUSDC: 5 }).ok, false);
});

test("quotes are positive and monotonic", () => {
  assert.ok(uniswapBuyQuote({ usdcIn: 1, reserveAQB: 100, reserveUSDC: 100 }) > 0);
  assert.ok(uniswapSellQuote({ aqbIn: 1, reserveAQB: 100, reserveUSDC: 100 }) > 0);
});
