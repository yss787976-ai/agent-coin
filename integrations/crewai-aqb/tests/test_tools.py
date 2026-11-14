import json
import os
import subprocess
import unittest
from unittest.mock import patch

from aqb_crewai import (
    AqbBalanceTool,
    AqbCliError,
    AqbIsAgentTool,
    AqbPayTool,
    get_tools,
)
from aqb_crewai import _cli

ADDR = "0x" + "AB" * 20
OTHER = "0x" + "CD" * 20
KEY = "0x" + "11" * 32


def completed(stdout="", stderr="", returncode=0):
    return subprocess.CompletedProcess(
        args=["aqb-agent"], returncode=returncode, stdout=stdout, stderr=stderr
    )


class AqbCrewAiTest(unittest.TestCase):
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

    def invoke(self, tool, **kwargs):
        with patch("aqb_crewai._cli.subprocess.run") as run:
            run.return_value = completed(json.dumps({"ok": True}))
            output = tool.run(**kwargs)
        return output, run

    def test_pay_builds_command_and_returns_json(self):
        output, run = self.invoke(AqbPayTool(), to=ADDR, amount="1.5")
        self.assertEqual(json.loads(output), {"ok": True})
        command = run.call_args.args[0]
        self.assertEqual(
            command,
            ["aqb-test-cli", "pay", "--to", ADDR.lower(), "--amount", "1.5"],
        )
        kwargs = run.call_args.kwargs
        self.assertEqual(kwargs["timeout"], 180.0)
        self.assertEqual(kwargs["env"]["AQB_KEY"], KEY)
        self.assertFalse(kwargs["check"])

    def test_pay_with_account(self):
        _, run = self.invoke(AqbPayTool(), to=ADDR, amount="0.25", account=OTHER)
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
            with patch("aqb_crewai._cli.subprocess.run") as run:
                with self.assertRaisesRegex(AqbCliError, "AQB_KEY"):
                    AqbPayTool().run(to=ADDR, amount="1")
        run.assert_not_called()

    def test_balance_without_address(self):
        output, run = self.invoke(AqbBalanceTool())
        self.assertEqual(json.loads(output), {"ok": True})
        self.assertEqual(run.call_args.args[0], ["aqb-test-cli", "balance"])

    def test_balance_with_address(self):
        _, run = self.invoke(AqbBalanceTool(), address=ADDR)
        self.assertEqual(
            run.call_args.args[0], ["aqb-test-cli", "balance", ADDR.lower()]
        )

    def test_is_agent(self):
        _, run = self.invoke(AqbIsAgentTool(), address=ADDR)
        self.assertEqual(
            run.call_args.args[0], ["aqb-test-cli", "is-agent", ADDR.lower()]
        )

    def test_invalid_address_rejected(self):
        with patch("aqb_crewai._cli.subprocess.run") as run:
            with self.assertRaisesRegex(AqbCliError, "address"):
                AqbIsAgentTool().run(address="0x1234")
        run.assert_not_called()

    def test_invalid_amount_rejected(self):
        for amount in ("0", "-1", "1.2.3", "abc", ""):
            with self.subTest(amount=amount):
                with patch("aqb_crewai._cli.subprocess.run") as run:
                    with self.assertRaisesRegex(AqbCliError, "amount"):
                        AqbPayTool().run(to=ADDR, amount=amount)
                run.assert_not_called()

    def test_nonzero_exit_surfaces_stderr(self):
        with patch("aqb_crewai._cli.subprocess.run") as run:
            run.return_value = completed(stderr="insufficient AQB balance", returncode=1)
            with self.assertRaisesRegex(AqbCliError, "insufficient AQB balance"):
                AqbBalanceTool().run(address=ADDR)

    def test_invalid_json_rejected(self):
        with patch("aqb_crewai._cli.subprocess.run") as run:
            run.return_value = completed(stdout="not json")
            with self.assertRaisesRegex(AqbCliError, "non-JSON"):
                AqbIsAgentTool().run(address=ADDR)

    def test_json_is_extracted_from_noisy_stdout(self):
        with patch("aqb_crewai._cli.subprocess.run") as run:
            run.return_value = completed(stdout='npm notice\n{"address":"0xabc","isAgent":true}\n')
            output = AqbIsAgentTool().run(address=ADDR)
        self.assertEqual(json.loads(output), {"address": "0xabc", "isAgent": True})

    def test_timeout_is_wrapped(self):
        with patch("aqb_crewai._cli.subprocess.run") as run:
            run.side_effect = subprocess.TimeoutExpired(cmd="aqb-test-cli", timeout=5)
            with self.assertRaisesRegex(AqbCliError, "timed out"):
                AqbBalanceTool().run(address=ADDR)

    def test_missing_executable_is_wrapped(self):
        with patch("aqb_crewai._cli.subprocess.run") as run:
            run.side_effect = FileNotFoundError
            with self.assertRaisesRegex(AqbCliError, "not found"):
                AqbBalanceTool().run(address=ADDR)

    def test_custom_timeout_is_passed(self):
        with patch.dict(os.environ, {"AQB_CLI_TIMEOUT": "12.5"}):
            _, run = self.invoke(AqbBalanceTool(), address=ADDR)
        self.assertEqual(run.call_args.kwargs["timeout"], 12.5)

    def test_default_command_uses_npx(self):
        with patch.dict(os.environ, {"AQB_CLI": ""}), patch(
            "aqb_crewai._cli.shutil.which", return_value=r"C:\node\npx.cmd"
        ):
            self.assertEqual(
                _cli.base_command(),
                [r"C:\node\npx.cmd", "-y", "@aqb-foundation/aqb-agent"],
            )

    def test_get_tools_returns_three_tools(self):
        tools = get_tools()
        self.assertEqual(len(tools), 3)
        self.assertEqual(
            [tool.name for tool in tools],
            ["aqb_pay", "aqb_balance", "aqb_is_agent"],
        )
        self.assertEqual(len({tool.name for tool in tools}), 3)


if __name__ == "__main__":
    unittest.main()
