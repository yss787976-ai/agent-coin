"""CrewAI tools for AQB agent payments.

The real ``crewai.tools.BaseTool`` is used when CrewAI is installed; a tiny
fallback keeps the package importable and testable without it.
"""

from __future__ import annotations

import json
from typing import Any

from . import _cli
from ._shim import BaseTool as _FallbackBaseTool

try:  # CrewAI is an optional peer dependency.
    from crewai.tools import BaseTool as _CrewaiBaseTool
except ImportError:
    _CrewaiBaseTool = None

if _CrewaiBaseTool is not None:
    from pydantic import BaseModel, Field

    class PayInput(BaseModel):
        to: str = Field(
            ...,
            description="Recipient EVM address (0x + 40 hex chars). Must be a registered AQB agent.",
        )
        amount: str = Field(..., description="Amount of AQB to send, for example '0.25'.")
        account: str = Field(
            "",
            description="Optional AQB account address to pay from instead of the configured EOA.",
        )

    class BalanceInput(BaseModel):
        address: str = Field(
            "",
            description="EVM address to inspect. Leave empty to use the configured signer.",
        )

    class IsAgentInput(BaseModel):
        address: str = Field(..., description="EVM address to check in the AQB registry.")

    _PAY_SCHEMA: Any = PayInput
    _BALANCE_SCHEMA: Any = BalanceInput
    _IS_AGENT_SCHEMA: Any = IsAgentInput
    _BASE = _CrewaiBaseTool
else:
    _PAY_SCHEMA = None
    _BALANCE_SCHEMA = None
    _IS_AGENT_SCHEMA = None
    _BASE = _FallbackBaseTool


class AqbPayTool(_BASE):
    """Send AQB to another registered agent on Base."""

    name: str = "aqb_pay"
    description: str = (
        "Pay AQB to a registered AQB agent on Base. Provide the recipient EVM address "
        "and the amount in AQB (for example '0.25'). Requires AQB_KEY or PRIVATE_KEY "
        "in the environment."
    )
    args_schema: Any = _PAY_SCHEMA

    def _run(self, to: str, amount: str, account: str = "") -> str:
        return json.dumps(_cli.pay(to=to, amount=amount, account=account))


class AqbBalanceTool(_BASE):
    """Read AQB and USDC balances for an address."""

    name: str = "aqb_balance"
    description: str = (
        "Read the AQB and USDC balances of an EVM address on Base. Leave address "
        "empty to use the configured signer."
    )
    args_schema: Any = _BALANCE_SCHEMA

    def _run(self, address: str = "") -> str:
        return json.dumps(_cli.balance(address=address))


class AqbIsAgentTool(_BASE):
    """Check whether an address is a registered AQB agent."""

    name: str = "aqb_is_agent"
    description: str = (
        "Check whether an address is registered as an AQB agent. Only registered "
        "agents can receive AQB."
    )
    args_schema: Any = _IS_AGENT_SCHEMA

    def _run(self, address: str) -> str:
        return json.dumps(_cli.is_agent(address=address))


def get_tools() -> list[Any]:
    """Return one instance of every AQB tool, ready for ``Agent(tools=...)``."""
    return [AqbPayTool(), AqbBalanceTool(), AqbIsAgentTool()]
