# aqb-crewai

CrewAI tools for paying and inspecting [AQB](https://agentqubit.pages.dev) agents on Base.

| Tool | Does |
|---|---|
| `aqb_pay` | Sends AQB from the configured signer (or an AQB account) to a registered agent |
| `aqb_balance` | Reads AQB and USDC balances for an address |
| `aqb_is_agent` | Checks whether an address is registered in the AQB registry |

Everything goes through the official Node CLI, so the Python package stays small and the
chain logic has one implementation. No Python network or web3 dependency.

## Requirements

- Python 3.10+
- Node.js 20+ (the tool runs `npx -y @aqb-foundation/aqb-agent`)

## Install

```bash
pip install -e .
# with CrewAI as a peer dependency:
pip install -e ".[crewai]"
```

Without CrewAI the package still imports and uses a small `BaseTool` fallback, which is
what the tests exercise. Install the extra to use the tools in an actual crew.

## Configure

```bash
export AQB_KEY=0x...          # or PRIVATE_KEY; required for aqb_pay
export AQB_CHAIN=base         # optional, CLI default is base
export AQB_RPC=https://...    # optional, or BASE_RPC
```

The CLI also reads `AQB_TOKEN`, `AQB_REGISTRY`, `AQB_VERIFIER`, and `AQB_PAIR`; see
`npx @aqb-foundation/aqb-agent help`.

Optional package variables:

- `AQB_CLI` — full command prefix, for example `aqb-agent` or
  `npx -y @aqb-foundation/aqb-agent@1.0.5`. Defaults to `npx -y @aqb-foundation/aqb-agent`.
- `AQB_CLI_TIMEOUT` — subprocess timeout in seconds. Default `180`.

## Usage

```python
from crewai import Agent
from aqb_crewai import get_tools

treasury = Agent(
    role="Treasury agent",
    goal="Pay other agents for completed work in AQB",
    backstory="You settle agent invoices on Base.",
    tools=get_tools(),
)
```

Individual tools are exported too:

```python
from aqb_crewai import AqbBalanceTool, AqbIsAgentTool, AqbPayTool

print(AqbBalanceTool().run(address="0x0000000000000000000000000000000000000001"))
print(AqbIsAgentTool().run(address="0x..."))
print(AqbPayTool().run(to="0x...", amount="0.25"))
```

Tools return compact JSON strings:

```json
{"tx": "0x...", "to": "0x...", "aqb": "0.25"}
{"address": "0x...", "aqb": "12.5", "usdc": "25.0"}
{"address": "0x...", "isAgent": true}
```

Failures raise `aqb_crewai.AqbCliError` with the CLI's stderr. Invalid addresses and
amounts are rejected before the CLI runs. `amount` is AQB, not wei.

## Notes

- The recipient must be a registered AQB agent; the token rejects transfers to anything else.
- `aqb_pay` with an `account` argument pays from a deployed AQB account via `--account`.
- Default network is Base mainnet. Set `AQB_CHAIN`/`AQB_RPC` to target another deployment.

## Tests

No network and no CrewAI installation required — `subprocess.run` is mocked:

```bash
python -m unittest discover -s tests -v
```
