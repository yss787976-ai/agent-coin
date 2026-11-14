import test from "node:test";
import assert from "node:assert/strict";
import { createAqbTools } from "../index.mjs";

const fake = {
  async balance() { return 1_500_000_000_000_000_000n; },
  async usdBalance() { return 2_000_000n; },
  async isAgent() { return true; },
  async pay() { return "0xpay"; },
};

test("creates four tools", () => {
  const tools = createAqbTools({ agent: fake });
  assert.deepEqual(tools.map((t) => t.name), ["aqb_discover", "aqb_balance", "aqb_is_agent", "aqb_pay"]);
});

test("balance tool formats AQB and USDC", async () => {
  const [, balance] = createAqbTools({ agent: fake });
  const out = JSON.parse(await balance.invoke({ address: "0x9eA52810f31768b1886cba9eAf917F4152f53042" }));
  assert.equal(out.aqb, "1.5");
  assert.equal(out.usdc, "2000000");
});

test("is-agent and pay tools", async () => {
  const [, , isAgent, pay] = createAqbTools({ agent: fake });
  assert.equal(JSON.parse(await isAgent.invoke({ address: "0x9eA52810f31768b1886cba9eAf917F4152f53042" })).isAgent, true);
  const out = JSON.parse(await pay.invoke({ to: "0x9eA52810f31768b1886cba9eAf917F4152f53042", amount: "0.25" }));
  assert.equal(out.tx, "0xpay");
});
