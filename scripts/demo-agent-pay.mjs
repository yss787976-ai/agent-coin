#!/usr/bin/env node
// 60-second demo: one agent pays another agent in AQB, the payee redeems for USDC.
// Read-only until --send is passed. Usage:
//   node scripts/demo-agent-pay.mjs                 # quote + plan only
//   PRIVATE_KEY=0x... node scripts/demo-agent-pay.mjs --send
import { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits } from "ethers";
import * as PQ from "../pq/pq.mjs";

const RPC = process.env.BASE_RPC || "https://mainnet.base.org";
const TOKEN = "0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1";
const VAULT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function redeem(uint256) returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];
const AMOUNT = process.env.AMOUNT || "0.25";

const provider = new JsonRpcProvider(RPC);
const key = process.env.PRIVATE_KEY;
const payer = key ? new Wallet(key, provider) : null;
const payee = process.env.PAYEE || "0x9eA52810f31768b1886cba9eAf917F4152f53042"; // PQ agent account

console.log("1. chain      ", (await provider.getNetwork()).chainId.toString());
console.log("2. amount     ", AMOUNT, "AQB  (= ", AMOUNT, "USDC redeemable )");
if (payer) {
  const token = new Contract(TOKEN, VAULT_ABI, payer);
  const bal = await token.balanceOf(payer.address);
  console.log("3. payer      ", payer.address, "balance", formatUnits(bal, 18));
  console.log("4. payee      ", payee);
  if (process.argv.includes("--send")) {
    const pqKey = await PQ.generate();
    console.log("5. pq key     ", pqKey.hash.slice(0, 18) + "…  (ML-DSA-65)");
    const tx = await token.transfer(payee, parseUnits(AMOUNT, 18));
    console.log("6. sent       ", tx.hash);
    console.log("7. explorer   ", "https://basescan.org/tx/" + tx.hash);
  } else {
    console.log("5. dry run — pass --send with PRIVATE_KEY to broadcast");
  }
} else {
  console.log("3. payer       (set PRIVATE_KEY to sign)");
  console.log("4. payee      ", payee);
  console.log("5. dry run");
}
