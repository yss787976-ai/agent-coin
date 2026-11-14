import test from "node:test";
import assert from "node:assert/strict";
import { parsePayCommand, PAY_RE } from "../parse.mjs";

test("parses pay commands", () => {
  assert.deepEqual(parsePayCommand("pay 0.25 AQB to 0x9eA52810f31768b1886cba9eAf917F4152f53042"), {
    amount: "0.25",
    to: "0x9eA52810f31768b1886cba9eAf917F4152f53042",
  });
  assert.deepEqual(parsePayCommand("Pay 3 AQB to 0x2d3D0d01940900692aA9bEB4BA304470a54E2438"), {
    amount: "3",
    to: "0x2d3D0d01940900692aA9bEB4BA304470a54E2438",
  });
});

test("rejects non-payment text and bad addresses", () => {
  assert.equal(parsePayCommand("hello"), null);
  assert.equal(parsePayCommand("pay 1 AQB to 0x123"), null);
  assert.equal(PAY_RE.test("pay 1 AQB to 0x9eA52810f31768b1886cba9eAf917F4152f53042"), true);
});
