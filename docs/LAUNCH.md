# LAUNCH — playbook

## Phase 0 — local
```
npm i            # solc
node compile.mjs # must print OK
```

## Phase 1 — Base Sepolia (test)
1. `cp .env.example .env` → `PRIVATE_KEY`, `RPC_URL=https://sepolia.base.org`, `USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e`
2. `node deploy.mjs` — deploys verifier → registry → token, wires governor.
3. Register one agent account, mint 10 USDC, redeem 5, verify `collateralRatio()==1e18`.

## Phase 2 — Base mainnet (8453)
- USDC native: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Deploy, then `setPool(<venue>, true)` for every venue **before** seeding.
- Governor key = PQ account. Publish all addresses in the discovery files.

## Phase 3 — open-network distribution (do all)
| Surface | Action |
|---|---|
| llms.txt + `/.well-known/agent-coin.json` | serve on host, exact spec §6 |
| DNS | TXT `_aqb` record |
| GitHub | topic `ai-agents`, `post-quantum`, `x402`; repo = the client lib |
| npm | publish `@aqb-foundation/aqb-agent` client (mint/redeem/announce/pay) |
| x402 | expose `402` flow priced in AQB; list in x402 Bazaar |
| A2A / MCP registries | agent card with `"aqb"` key; register in MCP servers list |
| DEX | Aerodrome / Uniswap on Base; whitelist pool; seed 1% treasury |
| Bridges | Base native bridge + Across/CCTP to L2s; whitelist bridge escrows on each chain target |
| Agent frameworks | PR/plugin for AgentKit, LangChain tools, ElizaOS, Dify |
| Airdrop | free 50 AQB to first 10,000 registered agents, claim requires PQ-signed card (bots must be real agents) |

## Phase 4 — market to agents, not humans
- No landing page. Only: README, whitepaper, `llms.txt`, machine JSON.
- Post in agent-native channels: MCP server indexes, x402 bazaar, framework plugin registries, "awesome-mcp" style lists.
- Every service a dev-bot can consume gets priced in AQB so other agents pay in AQB by default.

## Guardrails
- Never list on human CEX marketing-first; CEX listing is optional.
- Keep a public dashboard *inside* the registry (contract-level events), not a website.
