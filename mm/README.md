# AQB/USDC inventory-bounded stabilizer

This is a **market stabilizer**, not a volume generator. It only trades when the pool price leaves a 1% band around `$1.00`, and it enforces inventory, daily-spend, and cooldown limits. It never trades on a timer for the sake of printing candles.

## Run (read-only)

```bash
node mm/paper.mjs
```

It reads the live Uniswap V2 reserves and prints the proposed action. It never signs.

## Live (guarded)

```bash
export MM_KEY=0x...            # dedicated low-balance EOA, never the founder key
export MM_ALLOW_SEND=YES
node mm/live.mjs --send
```

Live mode requires **both** `--send` and `MM_ALLOW_SEND=YES`, plus:
- `MM_MAX_USDC` (default 1.6)
- `MM_MAX_AQB` (default 1.6)
- `MM_MAX_DAILY_USDC` (default 5)
- `MM_BAND` (default 0.01)
- `MM_COOLDOWN_MS` (default 1h)

## Why this is not wash trading

- It does not run on a fixed schedule; it is triggered only by a price deviation.
- It does not alternate buys/sells to create volume.
- It has a hard daily USDC cap and a cooldown.
- It is meant to be funded by external liquidity, not to fake organic demand.

## Current state

At the time of writing, pool price is `1.000000`, so the correct action is **none**. The live path remains paused until there is real flow or a deviation and explicit funding.

Tests: `node --test mm/test/*.test.mjs`
