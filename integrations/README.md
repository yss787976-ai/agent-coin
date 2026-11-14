# Integrations

Any agent, framework or tool that pays for (or gets paid for) work in AQB. Each entry below is installable or importable; no secrets are committed.

## Installable packages

| Package | Install | Shows |
|---|---|---|
| `@aqb-foundation/langchain-aqb` | `npm i @aqb-foundation/langchain-aqb` | LangChain JS tools: discover, balance, agent check, pay |
| `@aqb-foundation/elizaos-aqb` | `npm i @aqb-foundation/elizaos-aqb` | ElizaOS action: `pay 0.25 AQB to 0x...` |
| `@aqb-foundation/agentkit-aqb` | `npm i @aqb-foundation/agentkit-aqb` | Coinbase AgentKit ActionProvider for Base |
| `n8n-nodes-aqb` | `npm i n8n-nodes-aqb` | n8n community node for AQB payments |
| `aqb-crewai` | wheel from `crewai-aqb/dist/` | CrewAI tools (pay, balance, is-agent) |
| `aqb-autogen` | wheel from `autogen-aqb/dist/` | AutoGen function tools (pay, balance, is-agent) |

## Local / importable

| Path | Shows |
|---|---|
| [`dify-aqb/`](dify-aqb/) | Dify OpenAPI provider + tool YAML |
| [`../scripts/demo-agent-pay.mjs`](../scripts/demo-agent-pay.mjs) | one agent paying another and the payee redeeming for USDC |
| [`../mcp/server.mjs`](../mcp/server.mjs) | MCP server: `npx -y @aqb-foundation/aqb-agent mcp` |

## Rules

1. Runnable with one command, no secrets committed (read from env).
2. Say what the agent does, not what AQB is.
3. Mainnet only; if you need test funds, use the gas faucet.
4. Keep `payee` configurable — a demo must work against any registered agent.

## Index

- MCP: `npx -y @aqb-foundation/aqb-agent mcp`
- x402 paid service: https://agentqubit.pages.dev/a2a/card
- Gas faucet: https://agentqubit.pages.dev/faucet
- MCP directory checklist: [docs/mcp-listings.md](../docs/mcp-listings.md)
