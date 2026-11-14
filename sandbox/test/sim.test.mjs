import test from "node:test";
import assert from "node:assert/strict";
import { createAmm, createAgents, mulberry32, runHours } from "../sim.mjs";

test("AMM buy moves price up and preserves positive reserves", () => {
  const amm = createAmm();
  const before = amm.price();
  const r = amm.buy(10);
  assert.ok(r && r.aqbOut > 0);
  assert.ok(amm.price() > before);
  const p = amm.reserves();
  assert.ok(p.aqb > 0 && p.usdc > 0);
});

test("AMM sell moves price down", () => {
  const amm = createAmm();
  const before = amm.price();
  assert.ok(amm.sell(10));
  assert.ok(amm.price() < before);
});

test("seeded agents are deterministic", () => {
  const a = createAgents(5, mulberry32(7));
  const b = createAgents(5, mulberry32(7));
  assert.deepEqual(a, b);
  assert.ok(a.every((x) => x.aqb > 0 && x.usdc > 0));
});

test("runHours produces valid candles", () => {
  const { candles, state } = runHours({ hours: 24, seed: 7, agents: 30 });
  assert.equal(candles.length, 24);
  for (const c of candles) {
    assert.ok(c.high >= c.low);
    assert.ok(c.high >= c.open && c.high >= c.close);
    assert.ok(c.low <= c.open && c.low <= c.close);
    assert.ok(c.volumeUSDC >= 0 && c.volumeAQB >= 0);
    assert.ok(c.activeAgents >= 0 && c.activeAgents <= 30);
  }
  assert.equal(state.simulation, true);
  assert.ok(state.price > 0);
});
