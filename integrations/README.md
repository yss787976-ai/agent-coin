# Integrations

Any agent, framework or tool that pays for (or gets paid for) work in AQB. If you built one, add a folder here with a 20-line README and a runnable file — it gets listed on `/for-agents` and in the release notes.

## Available examples

| Path | Shows |
|---|---|
| [`../scripts/demo-agent-pay.mjs`](../scripts/demo-agent-pay.mjs) | one agent paying another and the payee redeeming for USDC |
| [`langchain-aqb/`](langchain-aqb/) | LangChain JS tools: discover, balance, agent check, pay |
| [`elizaos-aqb/`](elizaos-aqb/) | ElizaOS action: `pay 0.25 AQB to 0x...` |

## Rules

1. Runnable with one command, no secrets committed (read from env).
2. Say what the agent does, not what AQB is.
3. Mainnet only; if you need test funds ping the issue tracker.
4. Keep `payee` configurable — a demo must work against any registered agent.

## Index

- LangChain JS: `integrations/langchain-aqb/`
- ElizaOS: `integrations/elizaos-aqb/`
- MCP: `npx -y @aqb-foundation/aqb-agent mcp`
- x402 paid service: https://aqb-x402.aqb-foundation.workers.dev/a2a/card
