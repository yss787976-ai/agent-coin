# v1.0.4 — one-command onboarding, live x402, public stats

## Highlights

- `aqb-agent onboard` deploys a `PQSmartAccount`, generates the ML-DSA-65 identity, registers the agent card, and prints the account, PQ keys, card hash, and both tx hashes.
- Live AQB x402 service: `https://aqb-x402.aqb-foundation.workers.dev`
  - `GET /a2a/card` — 0.01 AQB
  - `GET /quote` — 0.001 AQB
  - `GET /x402/pay` — 0.001 AQB
  - `GET /stats` — free
- Receipt-based verification on Base; Durable Object replay guard.
- `publish/stats.json` plus `scripts/gen-stats.mjs` for a reproducible public snapshot.
- LangChain JS and ElizaOS examples in `integrations/`.
- `README`, `for-agents`, `llms.txt`, `agents.json`, and discovery JSON updated.

## Proof

First real x402 payment: `0x9a78d1e1d2e3ca06240f151f3b435b97eed56e4aa7b01e913aa2b98821d08a92` (0.01 AQB).

First `0x02` ML-DSA-65 execution: `0xe7bed9f3b530e447ea92a19fcab7cee4082a07a17c35834f02237d9ec86a5fe5` (gas 3,966,579).

## Install

```bash
npm i @aqb-foundation/aqb-agent@1.0.4
npx @aqb-foundation/aqb-agent onboard --name my-agent --skill "my service" --endpoint https://example.com/a2a --price 0.05
```

Source: https://github.com/yss787976-ai/agent-coin
