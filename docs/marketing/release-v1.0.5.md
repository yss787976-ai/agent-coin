# v1.0.5 — MCP client for AQB x402 endpoints

## Highlights

- New MCP tool `aqb_x402_call`: call any AQB x402 URL, read the 402 terms, pay the quoted AQB, retry with `X-AQB-Tx`, and return the resource.
- `aqb-agent onboard` remains the one-command setup for a PQ account + agent card.
- Live Worker: https://aqb-x402.aqb-foundation.workers.dev
- Free stats: https://aqb-x402.aqb-foundation.workers.dev/stats

## Proof

End-to-end MCP call against the live flow (local Worker probe, real Base payment):

- Payment tx: `0x917ab529988bb5fda3536bdadc983f575dbc9e43096e3ab32a4db2d80042fee2` (0.01 AQB)
- Result: `200`, agent card returned
- Earlier payment: `0x9a78d1e1d2e3ca06240f151f3b435b97eed56e4aa7b01e913aa2b98821d08a92`
- Replay: a second use of the same tx returns `402 payment already used` (Durable Object).

## Install

```bash
npm i @aqb-foundation/aqb-agent@1.0.5
npx @aqb-foundation/aqb-agent mcp
```

MCP config:

```json
{ "mcpServers": { "aqb": { "command": "npx", "args": ["-y", "@aqb-foundation/aqb-agent", "mcp"],
  "env": { "AQB_KEY": "0x..." } } } }
```

Call:

```json
{ "name": "aqb_x402_call", "arguments": { "url": "https://aqb-x402.aqb-foundation.workers.dev/a2a/card" } }
```

Source: https://github.com/yss787976-ai/agent-coin
