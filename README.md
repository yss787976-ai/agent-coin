# AgentQubit (AQB)

USD-pegged, agent-only credit token. Post-quantum signed. Base L2. 900B hard cap. 1 AQB = 1 real USDC-backed dollar, always.

Telegram: https://t.me/agentqubit  |  X: https://x.com/yss6060

## Why agents
Card rails need humans. ECDSA wallets die to Shor. AQB gives: ML-DSA identity, sub-cent settlement, self-discovery, stealth payers.

## Discovery (canonical)

- https://yss787976-ai.github.io/agent-coin/.well-known/agent-coin.json
- https://yss787976-ai.github.io/agent-coin/.well-known/agent-card.json (cardHash committed on chain)
- https://yss787976-ai.github.io/agent-coin/llms.txt

Install: `npm i @aqb-foundation/aqb-agent`

## Verification

All deployed contracts are source-verified on BaseScan (MIT license): token, registry, verifier, sale, account � see `registry/agent-coin.json`.

## Read first
- Spec (normative): [docs/SPEC.md](docs/SPEC.md)
- Paper: [WHITEPAPER.md](WHITEPAPER.md)
- Discovery: [registry/agent-coin.json](registry/agent-coin.json)
- Launch playbook: [docs/LAUNCH.md](docs/LAUNCH.md)
- Agent card: [docs/CARD.md](docs/CARD.md)
- PQ note: [docs/pq-note.md](docs/pq-note.md)

## Live on Base mainnet (chainId 8453)

- Token **$AQB**: https://basescan.org/token/0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1
- Genesis sale (74B @ $1): https://basescan.org/address/0xeDBD6B860c37C411aeeA513cbc0656e3135f59c1
- Registry: https://basescan.org/address/0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB
- Founder wallet: 0x9eA52810f31768b1886cba9eAf917F4152f53042
- Trading pair (AQB/USDC): https://basescan.org/address/0xF61Cb078f87425933741Dd7d02F5779c030dB1A6
- Deployed: 2026-11-11T18:45:48.901Z

## Contracts
- `AgentQuantumCredit` — ERC-20, 18dp, cap 900e9, mint/redeem 1:1 USDC, agent-gated transfers
- `AgentRegistry` — PQ-key registration + stealth announcer
- `MLDSAVerifier` — FIPS 204 verify (precompile path + lib fallback)
- `PQSmartAccount` — account whose authority is a PQ key; ECDSA only fallback

## Build and test
```
npm i
node compile.mjs
node test/pq.mjs      # real ML-DSA-65 + ML-KEM-768
node test/e2e.mjs     # peg, gates, cap, transfer rules
```

## Use as an agent (SDK)
```js
import { AqbAgent, discover } from "aqb-agent/client";
const d = await discover("agent.example");
const me = new AqbAgent({ chain: "base", privateKey: process.env.PK, token: d.token, registry: d.registry });
if (!(await me.isAgent(target))) throw new Error("not an agent");
await me.pay(target, 25n * 10n ** 18n);
```
Buying is only ever with real dollars: `await me.fund(10_000_000n)` pulls 10 USDC and mints 10 AQB.

## Use as an MCP server
```json
{ "mcpServers": { "aqb": { "command": "node", "args": ["mcp/server.mjs"],
  "env": { "AQB_CHAIN": "base", "AQB_TOKEN": "0x…", "AQB_REGISTRY": "0x…", "AQB_KEY": "0x…" } } } }
```
Tools: `aqb_discover`, `aqb_is_agent`, `aqb_balance`, `aqb_register`, `aqb_fund`, `aqb_pay`, `aqb_cash_out`, `aqb_announce_stealth`, `aqb_wellknown`.

## Post-quantum keys
Real ML-DSA-65 + ML-KEM-768 live in `pq/pq.mjs` (noble primitives). The account, not an EOA, is the authority: `registerFromAccount`, `fundFromAccount`, `payFromAccount` sign with the PQ key.

## Deploy
`node deploy.mjs` — needs `PRIVATE_KEY` and gas. Deployer wallet: `0x1464BA077e5752F0F8a1264391a19E00c1392958`.

## Invariants
1. `totalSupply <= usdc.balanceOf(token) * 1e12`
2. `totalSupply <= MAX_SUPPLY`
3. no mint without a USDC pull; no redeem without a burn
4. transfers only to agents or governor-whitelisted pools

## Listings & PRs (open)
- CoinGecko request: CL1111260050 (submitted, under review)
- CoinMarketCap new-asset request: submitted (Zendesk)
- Uniswap default token list: https://github.com/Uniswap/default-token-list/pull/2648
- awesome-x402: https://github.com/xpaysh/awesome-x402/pull/2205
- awesome-agentic-commerce: https://github.com/xpaysh/awesome-agentic-commerce/pull/41
- awesome-mcp-servers: https://github.com/punkpeye/awesome-mcp-servers/pull/19336
- Superchain token list: https://github.com/ethereum-optimism/ethereum-optimism.github.io/pull/1394
- Verification post: https://github.com/yss787976-ai/agent-coin/issues/1
- X post: https://x.com/yss6060/status/2120901091282014578
- Announcement release: https://github.com/yss787976-ai/agent-coin/releases/tag/v1.0.0
