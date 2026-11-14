# AQB agent sandbox

**SIMULATION ONLY — NOT MAINNET, NOT REAL FUNDS.**

A self-contained Uniswap V2-style AMM + 30 simulated agents. It generates hourly candles, volume, agent-to-agent service payments, and a dashboard. It never connects to Base, never uses a key, and never moves funds.

## Run

```bash
node sandbox/sim.mjs --hours 72 --seed 7
node sandbox/sim.mjs --agents 100 --hours 168 --seed 11
node sandbox/sim.mjs --hours 1 --live     # repeats every hour
node sandbox/server.mjs                   # http://127.0.0.1:8792
```

Outputs:

- `sandbox/data/candles.json` — OHLCV + active agents + service payments per hour
- `sandbox/data/state.json` — pool, price, fees, totals
- `sandbox/dashboard.html` — canvas chart + live table

Tests:

```bash
node --test sandbox/test/*.test.mjs
```

## Boundaries

- The dashboard and JSON include `"simulation": true` and a visible banner.
- Do **not** publish these candles as real AQB market data, use them in CoinGecko/DEX listing applications, or present them as organic volume.
- The sandbox exists for demos, integration testing, and strategy research. For mainnet, use real external agents and real funds.
