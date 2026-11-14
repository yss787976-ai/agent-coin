import json
import os
import subprocess
import unittest
from unittest.mock import patch

from aqb_autogen import (
    AqbCliError,
    aqb_balance,
    aqb_is_agent,
    aqb_pay,
    make_tools,
)

ADDR = "0x" + "AB" * 20
OTHER = "0x" + "CD" * 20
KEY = "0x" + "11" * 32


def completed(stdout="", stderr="", returncode=0):
    return subprocess.CompletedProcess(
        args=["aqb-agent"], returncode=returncode, stdout=stdout, stderr=stderr
    )


class AqbAutogenTest(unittest.TestCase):
    def setUp(self):
        patcher = patch.dict(
            os.environ,
            {
                "AQB_CLI": "aqb-test-cli",
                "AQB_CLI_TIMEOUT": "",
                "AQB_KEY": KEY,
                "PRIVATE_KEY": "",
            },
            clear=False,
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def invoke(self, func, *args, **kwargs):
        with patch("aqb_autogen._cli.subprocess.run") as run:
            run.return_value = completed(json.dumps({"ok": True}))
            output = func(*args, **kwargs)
        return output, run

    def test_pay_builds_command_and_returns_json(self):
        output, run = self.invoke(aqb_pay, to=ADDR, amount="1.5")
        self.assertIsInstance(output, str)
        self.assertEqual(json.loads(output), {"ok": True})
        self.assertEqual(
            run.call_args.args[0],
            ["aqb-test-cli", "pay", "--to", ADDR.lower(), "--amount", "1.5"],
        )
        kwargs = run.call_args.kwargs
        self.assertEqual(kwargs["timeout"], 180.0)
        self.assertEqual(kwargs["env"]["AQB_KEY"], KEY)

    def test_pay_with_account(self):
        _, run = self.invoke(aqb_pay, to=ADDR, amount="0.25", account=OTHER)
        self.assertEqual(
            run.call_args.args[0],
            [
                "aqb-test-cli",
                "pay",
                "--to",
                ADDR.lower(),
                "--amount",
                "0.25",
                "--account",
                OTHER.lower(),
            ],
        )

    def test_pay_requires_key_before_running_cli(self):
        with patch.dict(os.environ, {"AQB_KEY": "", "PRIVATE_KEY": ""}):
            with patch("aqb_autogen._cli.subprocess.run") as run:
                with self.assertRaisesRegex(AqbCliError, "AQB_KEY"):
                    aqb_pay(ADDR, "1")
        run.assert_not_called()

    def test_balance_without_address(self):
        output, run = self.invoke(aqb_balance)
        self.assertEqual(json.loads(output), {"ok": True})
        self.assertEqual(run.call_args.args[0], ["aqb-test-cli", "balance"])

    def test_balance_with_address(self):
        _, run = self.invoke(aqb_balance, address=ADDR)
        self.assertEqual(
            run.call_args.args[0], ["aqb-test-cli", "balance", ADDR.lower()]
        )

    def test_is_agent(self):
        _, run = self.invoke(aqb_is_agent, address=ADDR)
        self.assertEqual(
            run.call_args.args[0], ["aqb-test-cli", "is-agent", ADDR.lower()]
        )

    def test_invalid_address_rejected(self):
        with patch("aqb_autogen._cli.subprocess.run") as run:
            with self.assertRaisesRegex(AqbCliError, "address"):
                aqb_is_agent("0x1234")
        run.assert_not_called()

    def test_invalid_amount_rejected(self):
        for amount in ("0", "-1", "1.2.3", "abc", ""):
            with self.subTest(amount=amount):
                with patch("aqb_autogen._cli.subprocess.run") as run:
                    with self.assertRaisesRegex(AqbCliError, "amount"):
                        aqb_pay(ADDR, amount)
                run.assert_not_called()

    def test_nonzero_exit_surfaces_stderr(self):
        with patch("aqb_autogen._cli.subprocess.run") as run:
            run.return_value = completed(stderr="insufficient AQB balance", returncode=1)
            with self.assertRaisesRegex(AqbCliError, "insufficient AQB balance"):
                aqb_balance(ADDR)

    def test_invalid_json_rejected(self):
        with patch("aqb_autogen._cli.subprocess.run") as run:
            run.return_value = completed(stdout="not json")
            with self.assertRaisesRegex(AqbCliError, "non-JSON"):
                aqb_is_agent(ADDR)

    def test_json_is_extracted_from_noisy_stdout(self):
        with patch("aqb_autogen._cli.subprocess.run") as run:
            run.return_value = completed(stdout='npm notice\n{"address":"0xabc","isAgent":true}\n')
            output = aqb_is_agent(ADDR)
        self.assertEqual(json.loads(output), {"address": "0xabc", "isAgent": True})

    def test_timeout_is_wrapped(self):
        with patch("aqb_autogen._cli.subprocess.run") as run:
            run.side_effect = subprocess.TimeoutExpired(cmd="aqb-test-cli", timeout=5)
            with self.assertRaisesRegex(AqbCliError, "timed out"):
                aqb_balance(ADDR)

    def test_missing_executable_is_wrapped(self):
        with patch("aqb_autogen._cli.subprocess.run") as run:
            run.side_effect = FileNotFoundError
            with self.assertRaisesRegex(AqbCliError, "not found"):
                aqb_balance(ADDR)

    def test_custom_timeout_is_passed(self):
        with patch.dict(os.environ, {"AQB_CLI_TIMEOUT": "12.5"}):
            _, run = self.invoke(aqb_balance, address=ADDR)
        self.assertEqual(run.call_args.kwargs["timeout"], 12.5)

    def test_make_tools_returns_plain_functions(self):
        tools = make_tools()
        self.assertEqual(
            [tool.__name__ for tool in tools],
            ["aqb_pay", "aqb_balance", "aqb_is_agent"],
        )
        for tool in tools:
            self.assertTrue(callable(tool))
            self.assertTrue(tool.__doc__)


if __name__ == "__main__":
    unittest.main()
