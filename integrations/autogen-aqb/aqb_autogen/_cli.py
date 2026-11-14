"""Subprocess bridge to the AQB agent CLI.

Every function shells out to ``npx -y @aqb-foundation/aqb-agent`` (or the
executable named by ``AQB_CLI``) and parses the JSON document the CLI
prints on stdout. No blockchain or network logic lives in Python.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import subprocess
from typing import Any, Sequence

DEFAULT_PACKAGE = "@aqb-foundation/aqb-agent"
DEFAULT_TIMEOUT = 180.0

_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
_AMOUNT_RE = re.compile(r"^\d+(?:\.\d+)?$")


class AqbCliError(RuntimeError):
    """The AQB CLI could not be executed or reported a failure."""


def validate_address(value: str, field: str = "address") -> str:
    """Return a lower-cased EVM address or raise :class:`AqbCliError`."""
    value = (value or "").strip()
    if not _ADDRESS_RE.match(value):
        raise AqbCliError(
            f"{field} must be a 0x-prefixed 20-byte hex address, got {value!r}"
        )
    return value.lower()


def validate_amount(value: str) -> str:
    """Return a positive decimal AQB amount or raise :class:`AqbCliError`."""
    value = (value or "").strip()
    if not _AMOUNT_RE.match(value):
        raise AqbCliError(f"amount must be a decimal AQB value, got {value!r}")
    if float(value) <= 0:
        raise AqbCliError(f"amount must be greater than zero, got {value!r}")
    return value


def require_key() -> str:
    """Return the signing key from the environment, or raise."""
    key = os.environ.get("AQB_KEY") or os.environ.get("PRIVATE_KEY")
    if not key:
        raise AqbCliError(
            "AQB_KEY or PRIVATE_KEY must be set to send AQB from an EOA"
        )
    return key


def _timeout() -> float:
    raw = os.environ.get("AQB_CLI_TIMEOUT", "").strip()
    if not raw:
        return DEFAULT_TIMEOUT
    try:
        timeout = float(raw)
    except ValueError as exc:
        raise AqbCliError(f"AQB_CLI_TIMEOUT must be a number, got {raw!r}") from exc
    if timeout <= 0:
        raise AqbCliError("AQB_CLI_TIMEOUT must be greater than zero")
    return timeout


def base_command() -> list[str]:
    """Build the CLI prefix, honouring ``AQB_CLI`` and finding ``npx`` on Windows."""
    override = os.environ.get("AQB_CLI", "").strip()
    if override:
        parts = shlex.split(override, posix=os.name != "nt")
        if not parts:
            raise AqbCliError("AQB_CLI is set but contains no executable")
        parts[0] = shutil.which(parts[0]) or parts[0]
        return parts

    npx = shutil.which("npx")
    if npx is None:
        # Let subprocess raise FileNotFoundError, which run_json translates.
        return ["npx", "-y", DEFAULT_PACKAGE]
    return [npx, "-y", DEFAULT_PACKAGE]


def _extract_json(payload: str) -> dict[str, Any]:
    start = payload.find("{")
    end = payload.rfind("}")
    if start == -1 or end < start:
        raise AqbCliError(f"AQB CLI returned non-JSON output: {payload[:200]!r}")
    try:
        data = json.loads(payload[start : end + 1])
    except json.JSONDecodeError as exc:
        raise AqbCliError(
            f"AQB CLI returned invalid JSON: {payload[:200]!r}"
        ) from exc
    if not isinstance(data, dict):
        raise AqbCliError(
            f"AQB CLI returned a JSON {type(data).__name__}, expected an object"
        )
    return data


def run_json(args: Sequence[str], *, timeout: float | None = None) -> dict[str, Any]:
    """Run one CLI subcommand and return its JSON object."""
    command = [*base_command(), *args]
    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout if timeout is not None else _timeout(),
            env=os.environ.copy(),
            check=False,
        )
    except FileNotFoundError as exc:
        raise AqbCliError(
            f"AQB CLI executable not found: {command[0]!r}. "
            "Install Node.js 20+ or point AQB_CLI at the aqb-agent binary."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise AqbCliError(
            f"AQB CLI timed out after {exc.timeout}s: {' '.join(command)}"
        ) from exc

    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise AqbCliError(
            f"AQB CLI failed with exit code {proc.returncode}: "
            f"{detail or 'no error output'}"
        )

    payload = (proc.stdout or "").strip()
    if not payload:
        raise AqbCliError("AQB CLI returned no output")
    return _extract_json(payload)


def pay(to: str, amount: str, account: str = "") -> dict[str, Any]:
    """Send AQB from the configured EOA (or an AQB account) to ``to``."""
    to = validate_address(to, "to")
    amount = validate_amount(amount)
    command = ["pay", "--to", to, "--amount", amount]
    if account.strip():
        command += ["--account", validate_address(account, "account")]
    require_key()
    return run_json(command)


def balance(address: str = "") -> dict[str, Any]:
    """Read AQB and USDC balances; an empty address uses the configured signer."""
    command = ["balance"]
    if (address or "").strip():
        command.append(validate_address(address))
    return run_json(command)


def is_agent(address: str) -> dict[str, Any]:
    """Check whether an address is registered in the AQB agent registry."""
    return run_json(["is-agent", validate_address(address)])
