#!/usr/bin/env node
// AQB agent sandbox — a pure simulation. No RPC, no mainnet, no funds.
// Usage:
//   node sandbox/sim.mjs --hours 72 --seed 7
//   node sandbox/sim.mjs --hours 1 --live
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DATA_DIR = path.resolve("sandbox/data");

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createAmm({ aqb = 100_000, usdc = 100_000 } = {}) {
  let rA = aqb, rU = usdc, fees = 0;
  const price = () => rA <= 0 ? 0 : rU / rA;
  const buy = (usdcIn) => {
    if (!(usdcIn > 0) || rA <= 0 || rU <= 0) return null;
    const inFee = usdcIn * 0.997;
    const out = (rA * inFee) / (rU + inFee);
    if (!(out > 0) || out >= rA) return null;
    rA -= out; rU += usdcIn; fees += usdcIn * 0.003;
    return { aqbOut: out, usdcIn, price: price() };
  };
  const sell = (aqbIn) => {
    if (!(aqbIn > 0) || rA <= 0 || rU <= 0) return null;
    const inFee = aqbIn * 0.997;
    const out = (rU * inFee) / (rA + inFee);
    if (!(out > 0) || out >= rU) return null;
    rU -= out; rA += aqbIn; fees += out * 0.003;
    return { aqbIn, usdcOut: out, price: price() };
  };
  return {
    buy, sell, price,
    reserves: () => ({ aqb: rA, usdc: rU }),
    fees: () => fees,
  };
}

export function createAgents(count, rand, { aqb = 60, usdc = 60 } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `agent-${String(i + 1).padStart(2, "0")}`,
    aqb: aqb * (0.5 + rand()),
    usdc: usdc * (0.5 + rand()),
    active: false,
  }));
}

export function runHours({ hours = 72, seed = 7, agents = 30, now = Date.now() } = {}) {
  const rand = mulberry32(seed);
  const amm = createAmm();
  const wallets = createAgents(agents, rand);
  const candles = [];
  let servicePayments = 0;
  let tradeCount = 0;
  const start = now - hours * 3600_000;

  for (let h = 0; h < hours; h++) {
    for (const w of wallets) w.active = false;
    const open = amm.price();
    let high = open, low = open, volumeUSDC = 0, volumeAQB = 0, hourTrades = 0;

    const n = 18 + Math.floor(rand() * 23);
    for (let i = 0; i < n; i++) {
      const w = wallets[Math.floor(rand() * wallets.length)];
      const isBuy = rand() < 0.58;
      if (isBuy) {
        const spend = Math.min(w.usdc * 0.25, 0.5 + rand() * 8);
        if (spend < 0.01) continue;
        const res = amm.buy(spend);
        if (!res) continue;
        w.usdc -= spend; w.aqb += res.aqbOut;
        volumeUSDC += spend; volumeAQB += res.aqbOut; hourTrades++; tradeCount++;
        w.active = true;
      } else {
        const sell = Math.min(w.aqb * 0.25, 0.5 + rand() * 8);
        if (sell < 0.01) continue;
        const res = amm.sell(sell);
        if (!res) continue;
        w.aqb -= sell; w.usdc += res.usdcOut;
        volumeAQB += sell; volumeUSDC += res.usdcOut; hourTrades++; tradeCount++;
        w.active = true;
      }
      const p = amm.price();
      if (p > high) high = p;
      if (p < low) low = p;
    }

    // Simulated agent-to-agent service payments; they do not touch the AMM.
    const payers = 4 + Math.floor(rand() * 9);
    for (let i = 0; i < payers; i++) {
      const from = wallets[Math.floor(rand() * wallets.length)];
      const to = wallets[Math.floor(rand() * wallets.length)];
      if (from === to) continue;
      const amt = Math.min(from.aqb * 0.05, 0.05 + rand() * 0.45);
      if (amt < 0.01) continue;
      from.aqb -= amt; to.aqb += amt;
      servicePayments++; from.active = true; to.active = true;
    }

    const close = amm.price();
    candles.push({
      time: new Date(start + (h + 1) * 3600_000).toISOString(),
      hour: h + 1,
      open: round(open), high: round(high), low: round(low), close: round(close),
      volumeUSDC: round(volumeUSDC), volumeAQB: round(volumeAQB),
      trades: hourTrades,
      servicePayments: payers,
      activeAgents: wallets.filter((w) => w.active).length,
    });
  }

  const last = candles.at(-1);
  const state = {
    simulation: true,
    banner: "SIMULATION — NOT MAINNET, NOT REAL FUNDS",
    generatedAt: new Date().toISOString(),
    seed, agents, hours,
    pool: amm.reserves(),
    price: amm.price(),
    feesUSDC: amm.fees(),
    trades: tradeCount,
    servicePayments,
    candles: candles.length,
    lastCandle: last,
    activeAgents: last?.activeAgents ?? 0,
  };
  return { candles, state };
}

function round(n) { return Math.round(n * 1e6) / 1e6; }

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
    else out[k] = true;
  }
  return out;
}

function writeJson(name, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, `.${name}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(tmp, path.join(DATA_DIR, name));
}

function persist(result) {
  writeJson("candles.json", result.candles);
  writeJson("state.json", result.state);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const hours = Math.max(1, Math.min(24 * 365, Number(args.hours || 72)));
  const seed = Number(args.seed || 7);
  const agents = Math.max(1, Math.min(5000, Number(args.agents || 30)));
  if (args.live) {
    const run = () => {
      const r = runHours({ hours: 1, seed: seed + Math.floor(Date.now() / 3600_000), agents });
      persist(r);
      console.log(new Date().toISOString(), "price", r.state.price.toFixed(6), "trades", r.state.trades, "agents", agents);
    };
    run();
    setInterval(run, 3600_000);
    return;
  }
  const result = runHours({ hours, seed, agents });
  persist(result);
  console.log(JSON.stringify({ simulation: true, candles: result.candles.length, price: result.state.price, trades: result.state.trades, agents }, null, 2));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
