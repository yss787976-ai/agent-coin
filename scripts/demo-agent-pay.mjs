#!/usr/bin/env node
// End-to-end agent payment demo on Base mainnet:
//   payer agent -> payee agent -> payee redeems to USDC.
//
// Dry run:
//   node --env-file=.env scripts/demo-agent-pay.mjs
// Broadcast (defaults to two funded seed agents):
//   node --env-file=.env scripts/demo-agent-pay.mjs --send
//
// Env:
//   PAYER_ACCOUNT / PRIVATE_KEY   explicit payer account + its ECDSA fallback
//   PAYEE / PAYEE_KEY / PAYEE_ACCOUNT
//   AMOUNT                        AQB amount, default 0.01
//
// The default payer is a funded seed agent, not the founder wallet: coins in the
// founder wallet are unsold allotment and must not enter circulation without a
// GenesisSale dollar behind them.
import fs from "node:fs";
import { parseUnits, formatEther, formatUnits } from "ethers";
import { AqbAgent } from "../client/aqb.mjs";

const SEND = process.argv.includes("--send");
const d = fs.existsSync("deployment.json") ? JSON.parse(fs.readFileSync("deployment.json", "utf8")) : null;
const seeds = fs.existsSync("seed/wallets.json") ? JSON.parse(fs.readFileSync("seed/wallets.json", "utf8")) : [];
const amount = parseUnits(process.env.AMOUNT || "0.01", 18);

const rpc = process.env.BASE_RPC || process.env.AQB_RPC;
const token = process.env.AQB_TOKEN || d?.token;
const registry = process.env.AQB_REGISTRY || d?.registry;
if (!token || !registry) throw new Error("set AQB_TOKEN and AQB_REGISTRY");

const reader = new AqbAgent({ rpc, token, registry });

const funded = [];
for (const s of seeds) {
  if ((await reader.balance(s.address)) >= amount) funded.push(s);
}

let payerAccount = process.env.PAYER_ACCOUNT;
let payerKey;
if (payerAccount) {
  payerKey = process.env.PRIVATE_KEY || process.env.PAYER_KEY;
} else {
  const s = funded[0];
  if (!s) throw new Error("no funded seed payer; set PAYER_ACCOUNT + PRIVATE_KEY");
  payerAccount = s.address;
  payerKey = process.env.PAYER_KEY || s.key;
}

let payee = process.env.PAYEE;
let payeeKey = process.env.PAYEE_KEY;
let payeeAccount = process.env.PAYEE_ACCOUNT;
if (!payee) {
  const s = funded.find((x) => x.address.toLowerCase() !== payerAccount.toLowerCase());
  if (!s) throw new Error("no funded seed payee; set PAYEE");
  payee = s.address;
  payeeKey = payeeKey || s.key;
  payeeAccount = payeeAccount || s.address;
}

console.log("chain      ", (await reader.provider.getNetwork()).chainId.toString());
console.log("payer      ", payerAccount, "agent:", await reader.isAgent(payerAccount));
console.log("payee      ", payee, "agent:", await reader.isAgent(payee));
console.log("amount     ", formatEther(amount), "AQB =", formatUnits(amount / 10n ** 12n, 6), "USDC");
console.log("payer AQB  ", formatEther(await reader.balance(payerAccount)));
console.log("payee AQB  ", formatEther(await reader.balance(payee)));
console.log("payee USDC ", formatUnits(await reader.usdBalance(payee), 6));

if (!SEND) {
  console.log("dry run — pass --send to broadcast");
  process.exit(0);
}
if (!payerKey) throw new Error("payer key required for --send");

const payer = new AqbAgent({ rpc, privateKey: payerKey, token, registry });
const before = await reader.balance(payee);
const payTx = await payer.payFromAccount(payer.account(payerAccount), payee, amount);
const after = await reader.balance(payee);
console.log("pay tx     ", payTx);
console.log("received   ", formatEther(after - before), "AQB");

if (payeeKey) {
  const payeeClient = new AqbAgent({ rpc, privateKey: payeeKey, token, registry });
  const usdcAddress = payeeAccount || payeeClient.signer.address;
  const usdcBefore = await reader.usdBalance(usdcAddress);
  const redeemTx = payeeAccount
    ? await payeeClient.redeemFromAccount(payeeClient.account(payeeAccount), amount)
    : await payeeClient.cashOut(amount);
  const usdcAfter = await reader.usdBalance(usdcAddress);
  console.log("redeem tx  ", redeemTx);
  console.log("redeemed   ", formatUnits(usdcAfter - usdcBefore, 6), "USDC");
} else {
  console.log("payee key not set — redeem skipped");
}
