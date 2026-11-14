# aqb-autogen

AutoGen function tools for paying and inspecting [AQB](https://agentqubit.pages.dev) agents on Base.

| Function | Does |
|---|---|
| `aqb_pay(to, amount, account="")` | Sends AQB from the configured signer (or an AQB account) to a registered agent |
| `aqb_balance(address="")` | Reads AQB and USDC balances; empty address means the configured signer |
| `aqb_is_agent(address)` | Checks whether an address is registered in the AQB registry |

Each function has type annotations and a docstring so AutoGen can derive a schema, and
returns a JSON string. Execution goes through the official Node CLI, so there is no
Python web3 dependency and no second chain implementation.

## Requirements

- Python 3.10+
- Node.js 20+ (the tools run `npx -y @aqb-foundation/aqb-agent`)

## Install

```bash
pip install -e .
# with AutoGen for the example below:
pip install -e ".[autogen]"
```

The package imports without AutoGen; the functions are plain Python callables.

## Configure

```bash
export AQB_KEY=0x...          # or PRIVATE_KEY; required for aqb_pay
export AQB_CHAIN=base         # optional, CLI default is base
export AQB_RPC=https://...    # optional, or BASE_RPC
```

Optional package variables:

- `AQB_CLI` — full command prefix, for example `aqb-agent` or
  `npx -y @aqb-foundation/aqb-agent@1.0.5`. Defaults to `npx -y @aqb-foundation/aqb-agent`.
- `AQB_CLI_TIMEOUT` — subprocess timeout in seconds. Default `180`.

The CLI additionally reads `AQB_TOKEN`, `AQB_REGISTRY`, `AQB_VERIFIER`, and `AQB_PAIR`.

## Usage

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_core.tools import FunctionTool
from aqb_autogen import make_tools

tools = [FunctionTool(fn) for fn in make_tools()]

treasury = AssistantAgent(
    name="treasury",
    model_client=model_client,
    tools=tools,
    system_message="You settle agent invoices in AQB on Base.",
)
```

Or register the functions directly and call them like normal Python:

```python
from aqb_autogen import aqb_balance, aqb_is_agent, aqb_pay

print(aqb_balance("0x0000000000000000000000000000000000000001"))
print(aqb_is_agent("0x..."))
print(aqb_pay("0x...", "0.25"))
```

Example results:

```json
{"tx": "0x...", "to": "0x...", "aqb": "0.25"}
{"address": "0x...", "aqb": "12.5", "usdc": "25.0"}
{"address": "0x...", "isAgent": true}
```

Failures raise `aqb_autogen.AqbCliError` with the CLI's stderr. Invalid addresses and
amounts are rejected before the CLI runs. `amount` is AQB, not wei.

## Notes

- The recipient must be a registered AQB agent; the token rejects transfers to anything else.
- `aqb_pay(..., account="0x...")` pays from a deployed AQB account via `--account`.
- Default network is Base mainnet. Set `AQB_CHAIN`/`AQB_RPC` to target another deployment.

## Tests

No network and no AutoGen installation required — `subprocess.run` is mocked:

```bash
python -m unittest discover -s tests -v
```
