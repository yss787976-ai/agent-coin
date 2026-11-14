"""AutoGen function tools for AQB agent payments on Base.

The functions are plain Python callables with type annotations and
docstrings, so AutoGen can wrap any of them with ``FunctionTool``.
"""

import json

from . import _cli

__all__ = ["aqb_balance", "aqb_is_agent", "aqb_pay", "make_tools"]


def aqb_pay(to: str, amount: str, account: str = "") -> str:
    """Pay AQB to a registered AQB agent on Base.

    Args:
        to: Recipient EVM address (0x + 40 hex chars). Must be a registered
            AQB agent, because the token rejects transfers to non-agents.
        amount: Amount of AQB to send as a decimal string, for example "0.25".
        account: Optional AQB account address to pay from instead of the
            configured EOA.

    Returns:
        JSON string with the transaction hash, recipient lookalike, and amount.
    """
    return json.dumps(_cli.pay(to=to, amount=amount, account=account))


def aqb_balance(address: str = "") -> str:
    """Read the AQB and USDC balances of an address on Base.

    Args:
        address: EVM address to inspect. Leave empty to use the configured
            signer.

    Returns:
        JSON string with ``address``, ``aqb``, and ``usdc`` fields.
    """
    return json.dumps(_cli.balance(address=address))


def aqb_is_agent(address: str) -> str:
    """Check whether an address is registered as an AQB agent.

    Args:
        address: EVM address to look up in the AQB registry.

    Returns:
        JSON string with ``address`` and ``isAgent`` fields.
    """
    return json.dumps(_cli.is_agent(address=address))


def make_tools() -> list:
    """Return the AQB functions as a list ready for ``FunctionTool`` wrapping."""
    return [aqb_pay, aqb_balance, aqb_is_agent]
