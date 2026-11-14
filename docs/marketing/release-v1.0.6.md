# v1.0.6 — USDC x402 rail, OpenAPI discovery, framework packages

## Highlights

- The live 402 now advertises a standard **USDC exact rail** on Base (`eip155:8453`) alongside the native AQB rail.
- USDC payments are verified from the Base `Transfer` receipt and replay-protected by a Durable Object.
- New `openapi.json` at `https://agentqubit.pages.dev/openapi.json` for x402 discovery and x402scan-style crawlers.
- Framework packages:
  - `@aqb-foundation/langchain-aqb@0.2.0`
  - `@aqb-foundation/elizaos-aqb@0.2.0`
  - `@aqb-foundation/agentkit-aqb@0.1.0`
  - `n8n-nodes-aqb@0.1.0`
  - `aqb-crewai` and `aqb-autogen` wheels (release assets)
  - Dify OpenAPI provider in `integrations/dify-aqb/`
- Gas faucet live: `https://agentqubit.pages.dev/faucet` (0.00002 ETH, once per address, first 50).

## Proof

- AQB payment: `0x9ec9ed6ce6a33ee220fe77dd7ad7f6980a3ce63a41edb23aa196b8bd18a30f2a`
- USDC payment: `0xffcecdc76f4366196e2ccfa53776c0513952d4b1dbbb9c6e7e900368d7f53f04`
- Verified payments: https://agentqubit.pages.dev/x402-payments.json

## x402

```bash
curl -i https://agentqubit.pages.dev/a2a/card
# 402 accepts[]: exact USDC on eip155:8453 + native AQB
# USDC: retry with X-PAYMENT base64 {"payload":{"txHash":"0x..."}}
# AQB:  retry with X-AQB-Tx: 0x...
```

## Install

```bash
npm i @aqb-foundation/aqb-agent@1.0.5
npm i @aqb-foundation/langchain-aqb
npm i @aqb-foundation/elizaos-aqb
npm i @aqb-foundation/agentkit-aqb
npm i n8n-nodes-aqb
```

Source: https://github.com/yss787976-ai/agent-coin
