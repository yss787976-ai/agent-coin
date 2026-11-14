#!/usr/bin/env node
// Guarded mainnet stabilizer. It requires BOTH --send and MM_ALLOW_SEND=YES,
// trades only outside the band, and enforces a daily USDC cap and cooldown.
// Never use it to generate volume or trade in a loop for its own sake.
import fs from "node:fs";
import { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits } from "ethers";
import { decide, validateAction, poolPrice } from "./core.mjs";

if (!process.argv.includes("--send") || process.env.MM_ALLOW_SEND !== "YES") {
  console.error("Refusing live trades. Pass --send and set MM_ALLOW_SEND=YES. Run mm/paper.mjs first.");
  process.exit(2);
}
const key = process.env.MM_KEY;
if (!key) { console.error("MM_KEY is required"); process.exit(2); }
const RPC = process.env.AQB_RPC || "https://mainnet.base.org";
const PAIR = "0xF61Cb078f87425933741Dd7d02F5779c030dB1A6";
const ROUTER = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
const TOKEN = "0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const provider = new JsonRpcProvider(RPC, 8453, { staticNetwork: true });
const wallet = new Wallet(key, provider);
const pair = new Contract(PAIR, ["function getReserves() view returns(uint112,uint112,uint32)", "function token0() view returns(address)"], provider);
const token = new Contract(TOKEN, ["function balanceOf(address) view returns(uint256)", "function approve(address,uint256) returns(bool)"], wallet);
const usdc = new Contract(USDC, ["function balanceOf(address) view returns(uint256)", "function approve(address,uint256) returns(bool)"], wallet);
const router = new Contract(ROUTER, ["function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns(uint256[])"], wallet);
const [r0, r1, token0] = await Promise.all([pair.getReserves().then((r) => r[0]), pair.getReserves().then((r) => r[1]), pair.token0()]);
const aqbR = token0.toLowerCase() === TOKEN.toLowerCase() ? r0 : r1;
const usdcR = token0.toLowerCase() === TOKEN.toLowerCase() ? r1 : r0;
const price = poolPrice({ reserveAQB: Number(aqbR), reserveUSDC: Number(usdcR) * 1e12 });
const statePath = "mm/state.json";
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : { day: "", spentUSDC: 0, lastTradeAt: 0 };
const day = new Date().toISOString().slice(0, 10);
if (state.day !== day) { state.day = day; state.spentUSDC = 0; }
const cooldownOk = Date.now() - (state.lastTradeAt || 0) > Number(process.env.MM_COOLDOWN_MS || 3600_000);
const maxUSDC = Number(process.env.MM_MAX_USDC || 1.6);
const maxDaily = Number(process.env.MM_MAX_DAILY_USDC || 5);
const action = decide({
  price, band: Number(process.env.MM_BAND || 0.01),
  usdc: Number(formatUnits(await usdc.balanceOf(wallet.address), 6)),
  aqb: Number(formatUnits(await token.balanceOf(wallet.address), 18)),
  maxTradeUSDC: maxUSDC, maxTradeAQB: Number(process.env.MM_MAX_AQB || 1.6), cooldownOk,
});
const check = validateAction(action, { dailyUSDC: state.spentUSDC, maxDailyUSDC: maxDaily, maxSlippageBps: Number(process.env.MM_SLIPPAGE_BPS || 100) });
if (!check.ok || action.action === "none") { console.log(JSON.stringify({ price, action, check, skipped: true }, null, 2)); process.exit(0); }
const deadline = Math.floor(Date.now() / 1000) + 900;
if (action.action === "buy") {
  const amount = parseUnits(action.amountUSDC.toFixed(6), 6);
  await (await usdc.approve(ROUTER, amount)).wait();
  const tx = await router.swapExactTokensForTokens(amount, 0n, [USDC, TOKEN], wallet.address, deadline);
  await tx.wait();
  state.spentUSDC += action.amountUSDC; state.lastTradeAt = Date.now();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  console.log(JSON.stringify({ tx: tx.hash, side: "buy", usdc: action.amountUSDC, price }, null, 2));
} else {
  const amount = parseUnits(action.amountAQB.toFixed(18), 18);
  await (await token.approve(ROUTER, amount)).wait();
  const tx = await router.swapExactTokensForTokens(amount, 0n, [TOKEN, USDC], wallet.address, deadline);
  await tx.wait();
  state.lastTradeAt = Date.now();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  console.log(JSON.stringify({ tx: tx.hash, side: "sell", aqb: action.amountAQB, price }, null, 2));
}
