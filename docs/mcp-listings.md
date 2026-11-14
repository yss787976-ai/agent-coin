# AQB MCP directory listings

Snapshot: 2026-11-14. This file tracks what exists, what is pending and what
each directory needs. No new submission was made while preparing this file.

## Canonical listing data

| Field | Value |
|---|---|
| Display name | AQB Agent |
| Directory name | `aqb-agent` |
| npm package | `@aqb-foundation/aqb-agent` (current: 1.0.5) |
| MCP command | `npx -y @aqb-foundation/aqb-agent mcp` |
| Repository | https://github.com/yss787976-ai/agent-coin |
| Homepage | https://agentqubit.pages.dev |
| npm | https://www.npmjs.com/package/@aqb-foundation/aqb-agent |
| Official registry name | `io.github.yss787976-ai/aqb-agent` |
| License | MIT |
| Author | AgentQubit / AQB Foundation |
| Category | Finance, blockchain, cryptocurrency, payments |
| Transport | stdio |
| Optional env | `AQB_KEY` (secret, only for write tools), `AQB_RPC` (Base RPC URL) |
| Short description | Agent-only settlement rail on Base: pay, quote and redeem AQB (1 AQB = 1 USDC vault) from an MCP client, with post-quantum identities. |

The MCP server currently exposes 13 tools: `aqb_discover`, `aqb_balance`,
`aqb_is_agent`, `aqb_quote`, `aqb_register`, `aqb_update_card`, `aqb_fund`,
`aqb_pay`, `aqb_redeem`, `aqb_cash_out`, `aqb_announce_stealth`,
`aqb_wellknown`, `aqb_x402_call`.

## Status

| Directory | Status | Existing URL |
|---|---|---|
| Glama | Listed. Approved; build passed in 56.3s; score B at approval. | https://glama.ai/mcp/servers/yss787976-ai/agent-coin |
| mcpservers.org | Listed. Approved 2026-11-14. Free plan, no sponsorship. | https://mcpservers.org/servers/yss787976-ai/agent-coin |
| Smithery | Unknown. No submission or listing URL is recorded; `smithery.yaml` exists in the repo. | None claimed |
| PulseMCP | No submission made. Submissions and listing changes are paused. | None |
| awesome-mcp-servers | PR open, not merged. Not yet in the list. | https://github.com/punkpeye/awesome-mcp-servers/pull/19336 |

## Glama

URL: https://glama.ai/mcp/servers/yss787976-ai/agent-coin

Status: approved and listed. Glama builds the server from the repository and
introspects the tools. The badge is
`https://glama.ai/mcp/servers/yss787976-ai/agent-coin/badges/score.svg`.

Fields Glama consumes:

| Field | Source / value |
|---|---|
| Repository | `https://github.com/yss787976-ai/agent-coin` |
| Name | `aqb-agent` |
| Description | Root `glama.json` → `description` |
| Maintainers | Root `glama.json` → `["yss787976-ai"]` |
| License | Repository `LICENSE` (MIT) |
| Dockerfile | Root `Dockerfile`; build steps `npm ci --omit=dev --no-audit --no-fund`; command `mcp-proxy -- node mcp/server.mjs` |
| Environment | `AQB_KEY` (secret, optional for read-only tools), `AQB_RPC` (optional) |
| Tools | Introspected from `mcp/server.mjs` |

To refresh after a release: push the repo, then use the Glama Admin page for
this server and rebuild. The live page currently shows 12 tools; the 13th,
`aqb_x402_call`, was added in 1.0.5, so a rebuild is needed to refresh the
cached tool list.

## mcpservers.org

URL: https://mcpservers.org/servers/yss787976-ai/agent-coin

Status: approved and listed. The submission used the Free plan (review within
two weeks); no Premium payment was made.

The current submission form asks for exactly:

| Field | AQB value |
|---|---|
| Server Name | `aqb-agent` |
| Category | `Finance` |
| Short Description | Agent-only settlement rail on Base: pay, quote and redeem AQB (1 AQB = 1 USDC vault) from an MCP client. |
| Repository, Website or Documentation | `https://github.com/yss787976-ai/agent-coin` |
| Official MCP Registry Name (optional) | `io.github.yss787976-ai/aqb-agent` |
| This server supports remote connections | Unchecked: the package is stdio; the x402 HTTP endpoint is a separate service. |
| Contact Email | A valid operator address; not stored in this repo |
| Submission plan | Free |

No account is required. The listing page and README badge are already live.

## Smithery

URL: none recorded.

Status: unknown. The repository contains `smithery.yaml`, but there is no
confirmed submission, review or listing URL. Do not describe AQB as listed on
Smithery until that is verified.

Fields Smithery uses:

| Field | AQB value |
|---|---|
| Repository / source | `https://github.com/yss787976-ai/agent-coin` |
| Qualified name | A namespace owned on Smithery plus `aqb-agent`; the exact namespace is not assigned yet. |
| Transport | `stdio` |
| Start command | `npx -y @aqb-foundation/aqb-agent mcp` |
| Config schema | Root `smithery.yaml`: object with `AQB_KEY` (string, currently required) |
| Display name | `AQB Agent` |
| Description | Same short description as above |
| Homepage | `https://agentqubit.pages.dev` |
| License | MIT |
| Tags | `finance`, `blockchain`, `payments`, `x402`, `base`, `post-quantum` |

Publish through Smithery's web **Add Server** flow or its CLI
(`smithery mcp publish`), pointing at the GitHub repository or the local
package. Smithery reads `smithery.yaml` from the repository root.

Before submitting, change `AQB_KEY` in `smithery.yaml` from required to
optional: the read-only tools (`aqb_balance`, `aqb_quote`, `aqb_is_agent`,
`aqb_discover`, `aqb_wellknown`) work without it, and a required secret raises
setup friction.

## PulseMCP

URL: none.

Status: paused. The submission page states that new server submissions and
changes to existing listings are paused; the notice was last updated
2026-09-03. No AQB submission was made and there is no form to fill in.

Fields: none accepted while paused. PulseMCP's own notice recommends publishing
to the Official MCP Registry, from which it can ingest later. AQB already has a
registry manifest at `server.json` with name
`io.github.yss787976-ai/aqb-agent`, npm package
`@aqb-foundation/aqb-agent`, stdio transport and optional `AQB_KEY`/`AQB_RPC`.
That manifest still says version `1.0.3`; bump it to `1.0.5` before any
registry publication. Do not claim a PulseMCP listing.
## awesome-mcp-servers

PR: https://github.com/punkpeye/awesome-mcp-servers/pull/19336

Status: open, not merged. The entry is in the **Finance & Fintech** section.
It has the `has-glama`, `valid-name` and `has-emoji` labels. Awaiting
maintainer review.

Entry format currently in the PR:

```markdown
- [yss787976-ai/agent-coin](https://github.com/yss787976-ai/agent-coin) [![yss787976-ai/agent-coin MCP server](https://glama.ai/mcp/servers/yss787976-ai/agent-coin/badges/score.svg)](https://glama.ai/mcp/servers/yss787976-ai/agent-coin) 📇 ☁️ - AgentQubit (AQB) wallet and payment tools for agents on Base: balance, transfer, quote, redeem 1:1 for USDC, post-quantum ML-DSA signing.
```

Requirements enforced by the repo bot:

| Field | Requirement |
|---|---|
| Hosting | GitHub repository URL, not npm-only; a remote-only server belongs in `awesome-remote-mcp-servers`. |
| Entry name | Full `owner/repo`, i.e. `yss787976-ai/agent-coin`. |
| Glama | Server must be listed on Glama and pass its checks; add the Glama score badge after the link. |
| Category | Finance & Fintech for AQB. |
| Markers | Language/runtime and hosting emoji (`📇` for Node, `☁️` for cloud/remote-capable). |
| Description | One line, factual, no marketing claims. |
| Duplicates | No duplicate entry; keep the existing PR instead of opening another. |

## Pre-submission checks

- npm `@aqb-foundation/aqb-agent` is at 1.0.5 and installs with
  `npx -y @aqb-foundation/aqb-agent mcp`.
- `server.json` version is 1.0.3 and needs a bump to 1.0.5.
- `smithery.yaml` makes `AQB_KEY` required; make it optional for read-only use.
- Glama's cached tool list shows 12 tools; rebuild after 1.0.5 to show
  `aqb_x402_call`.
- Reuse the same description and links everywhere; do not claim Smithery or
  PulseMCP listings.
