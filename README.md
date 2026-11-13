# AgentQubit (AQB)

USD-pegged, agent-only credit token. Post-quantum identity. Base L2. 900B hard cap. 1 AQB = 1 real USDC-backed dollar for circulating supply.

Telegram: https://t.me/agentqubit  |  Bot: https://t.me/AqbAgentPayBot  |  X: https://x.com/yss6060

## Why agents
Card rails need humans. ECDSA wallets die to Shor. AQB gives: ML-DSA identity, sub-cent settlement, self-discovery, stealth payers, and a vault that redeems 1:1 in USDC.

## Discovery (canonical)

- https://agentqubit.pages.dev/.well-known/agent-coin.json
- https://agentqubit.pages.dev/.well-known/agent-card.json (cardHash committed on chain)
- https://agentqubit.pages.dev/llms.txt
- https://agentqubit.pages.dev/agents.json

Install: `npm i @aqb-foundation/aqb-agent`

## CLI

```bash
npx @aqb-foundation/aqb-agent --help
npx @aqb-foundation/aqb-agent balance 0xAGENT
npx @aqb-foundation/aqb-agent quote
npx @aqb-foundation/aqb-agent pay --to 0xAGENT --amount 0.25
npx @aqb-foundation/aqb-agent redeem --amount 10
npx @aqb-foundation/aqb-agent onboard --name ocr --skill "OCR batch" --endpoint https://agent.example/a2a --price 0.25
```

`onboard` deploys a `PQSmartAccount`, generates the ML-DSA-65 identity, registers the card through the account, and prints the account address, PQ keys, card hash, and both transaction hashes. It needs Base ETH for gas. `deploy-account` + `register` remain available as separate steps.

### Paid x402 endpoint (live)

`GET https://aqb-x402.aqb-foundation.workers.dev/a2a/card` returns `402` with AQB payment terms; pay `0.01 AQB` on Base to the advertised `payTo`, then retry with `X-AQB-Tx: <txHash>`. The Worker verifies the ERC-20 `Transfer` receipt on Base and returns the resource. Free: `/stats`. Also paid: `/quote` (0.001 AQB) and `/x402/pay` (0.001 AQB).

```bash
curl -i https://aqb-x402.aqb-foundation.workers.dev/a2a/card
# 402, read x-aqb-payto / x-aqb-price
curl -s -H "X-AQB-Tx: 0xYOUR_TX" https://aqb-x402.aqb-foundation.workers.dev/a2a/card
```

MCP clients can use `aqb_x402_call` with a `url`; it reads the 402 terms, pays AQB, retries with `X-AQB-Tx`, and returns the resource.

Source: `workers/x402/`. Live stats: https://aqb-x402.aqb-foundation.workers.dev/stats · static snapshot: https://agentqubit.pages.dev/stats.json (regenerate with `node scripts/gen-stats.mjs --write`).

## Verification

All deployed contracts are source-verified on BaseScan (MIT): token, registry, verifier, sale, account — see `registry/agent-coin.json`.

## Read first
- Spec (normative): [docs/SPEC.md](docs/SPEC.md)
- Paper: [WHITEPAPER.md](WHITEPAPER.md)
- Discovery: [registry/agent-coin.json](registry/agent-coin.json)
- Launch playbook: [docs/LAUNCH.md](docs/LAUNCH.md)
- Agent card: [docs/CARD.md](docs/CARD.md)
- PQ note: [docs/pq-note.md](docs/pq-note.md)

## Live on Base mainnet (chainId 8453)

- Token / vault **$AQB**: https://basescan.org/token/0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1
- Genesis sale (74B @ $1): https://basescan.org/address/0xeDBD6B860c37C411aeeA513cbc0656e3135f59c1
- Registry: https://basescan.org/address/0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB
- Founder account: 0x9eA52810f31768b1886cba9eAf917F4152f53042
- Trading pair (AQB/USDC): https://basescan.org/address/0xF61Cb078f87425933741Dd7d02F5779c030dB1A6
- Deployed: 2026-11-11T18:45:48.901Z

## Contracts
- `AgentQuantumCredit` — ERC-20, 18dp, cap 900e9, mint/redeem 1:1 USDC, agent-gated transfers
- `AgentRegistry` — PQ-key registration + stealth announcer
- `MLDSAVerifier` — FIPS 204 verify shell (precompile path + pluggable library fallback)
- `PQSmartAccount` — account whose identity is a PQ key; ECDSA only fallback for execution

## Build and test
```bash
npm i
node compile.mjs
node test/pq.mjs      # real ML-DSA-65 + ML-KEM-768
node test/e2e.mjs     # peg, gates, cap, transfer rules
```

## Use as an agent (SDK)
```js
import { AqbAgent, discover } from "@aqb-foundation/aqb-agent/client";
const d = await discover("agentqubit.pages.dev");
const me = new AqbAgent({ chain: "base", privateKey: process.env.AQB_KEY, token: d.token, registry: d.registry });
if (!(await me.isAgent(target))) throw new Error("not an agent");
await me.pay(target, 25n * 10n ** 18n);
```
Buying is only ever with real dollars: `await me.fund(10_000_000n)` pulls 10 USDC and mints 10 AQB.

From a PQ account:
```js
await me.payFromAccount(me.account("0xACCOUNT"), target, 25n * 10n ** 18n);
await me.registerFromAccount(me.account("0xACCOUNT"), card);
```

## Use as an MCP server
```json
{ "mcpServers": { "aqb": { "command": "npx", "args": ["-y", "@aqb-foundation/aqb-agent", "mcp"],
  "env": { "AQB_KEY": "0x…" } } } }
```
Tools: `aqb_discover`, `aqb_balance`, `aqb_is_agent`, `aqb_quote`, `aqb_register`, `aqb_update_card`, `aqb_fund`, `aqb_pay`, `aqb_redeem`, `aqb_cash_out`, `aqb_announce_stealth`, `aqb_wellknown`, `aqb_x402_call`.

## Post-quantum keys
Real ML-DSA-65 + ML-KEM-768 live in `pq/pq.mjs` (noble primitives). The account, not an EOA, is the identity: `registerFromAccount`, `fundFromAccount`, `payFromAccount` accept the account path.

`0x02` is live on Base through AQB's `MLDSAVerifier` → `MLDSA65Fallback` → [skalenetwork/mldsa-solidity](https://github.com/skalenetwork/mldsa-solidity) (FIPS 204, MIT, unaudited):

- AQB verifier: `0x53d34e4Ffd0bd984f8b92561f9e2B7D3EDdbE60d`
- Adapter: `0xeEbccD88DDb596860b33D0285294fF53cd83506B`
- ML-DSA verifier: `0xa11eE20877a7618ff417f79A026186A9253C0b30`
- Key factory: `0x9961a96B2F77B6D86d8a60607A90b3cAeECBe197`

The founder key is registered for the fast path (registerA `0x7235b1d3…`, registerT `0x0c0ab4b5…`). First `0x02` execute: `0xe7bed9f3b530e447ea92a19fcab7cee4082a07a17c35834f02237d9ec86a5fe5`, gas `3,966,579`. `0x01` remains the fallback. AQB's verifier checks the key hash and lengths before calling the adapter; the third-party verifier is unaudited.

Deploy/register/test everything with `node --env-file=.env scripts/pq-onchain.mjs --send`.

Sign with the PQ key from the SDK:
```js
const id = { publicKey, secretKey, keyHash }; // 1952 / 4032 bytes
await me.payFromAccount(me.account("0xACCOUNT", id), target, 10n ** 18n, "pq");
```

## Peg accounting (important)
`contracts/AgentQuantumCredit.sol` reports `backedSupply() = totalSupply - genesisUnsold`, but `genesisUnsold` only shrinks on `GenesisSale.buy`. A direct transfer from the founder wallet to a pool or agent creates circulating coins that are still counted as "unsold". The operational invariant is therefore:

```
vaultUSDC * 1e12 == totalSupply - founderBalance - saleBalance
```

Check it with `node --env-file=.env scripts/state-full.mjs`. Genesis coins must leave the founder wallet only through `GenesisSale`, which deposits one real USDC per coin into the vault. The founder wallet must not redeem its own allotment; that would withdraw backing without reducing circulating supply.

`scripts/repair-peg.mjs` repairs a gap by having the founder buy B USDC from the sale (self-transfer) and seed agents return R AQB, with `B + R = circulating - vault`.

## Demo
`node --env-file=.env scripts/demo-agent-pay.mjs` shows a registered agent paying another and the payee redeeming for USDC. Pass `--send` to broadcast.

## Deploy
`node deploy.mjs` — needs `PRIVATE_KEY` and gas. Deployer wallet: `0x1464BA077e5752F0F8a1264391a19E00c1392958`.

## Invariants
1. `backedSupply <= usdc.balanceOf(token) * 1e12` (with the circulating definition above)
2. `totalSupply <= MAX_SUPPLY`
3. no mint without a USDC pull; no redeem without a burn
4. transfers only to agents or governor-whitelisted pools
5. `genesisUnsold == founderBalance` when every circulating coin is backed

## Listings & PRs (open)
- CoinGecko request: CL1111260050 (reapply after 2026-11-26)
- CoinMarketCap new-asset request: submitted (Zendesk)
- Uniswap default token list: https://github.com/Uniswap/default-token-list/pull/2648
- awesome-x402: https://github.com/xpaysh/awesome-x402/pull/2205
- awesome-agentic-commerce: https://github.com/xpaysh/awesome-agentic-commerce/pull/41
- awesome-mcp-servers: https://github.com/punkpeye/awesome-mcp-servers/pull/19336
- Superchain token list: https://github.com/ethereum-optimism/ethereum-optimism.github.io/pull/1394
- Verification post: https://github.com/yss787976-ai/agent-coin/issues/1
- X post: https://x.com/yss6060/status/2120901091282014578
- Announcement release: https://github.com/yss787976-ai/agent-coin/releases/tag/v1.0.0
- x402 release: https://github.com/yss787976-ai/agent-coin/releases/tag/v1.0.5
- x402 discussion: https://github.com/yss787976-ai/agent-coin/discussions/3
- x402 payment proof: https://agentqubit.pages.dev/x402-payments.json
