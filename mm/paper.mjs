#!/usr/bin/env node
// Read-only paper run against the live pool. No keys, no transactions.
import fs from "node:fs";
import { JsonRpcProvider, Contract } from "ethers";
import { decide, validateAction, poolPrice, uniswapBuyQuote } from "./core.mjs";

const RPC = process.env.AQB_RPC || process.env.BASE_RPC || "https://mainnet.base.org";
const PAIR = process.env.AQB_PAIR || "0xF61Cb078f87425933741Dd7d02F5779c030dB1A6";
const provider = new JsonRpcProvider(RPC, 8453, { staticNetwork: true });
const pair = new Contract(PAIR, [
  "function getReserves() view returns(uint112,uint112,uint32)",
  "function token0() view returns(address)",
], provider);
const TOKEN = "0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1";
const [r0, r1, token0] = await Promise.all([pair.getReserves().then((r) => r[0]), pair.getReserves().then((r) => r[1]), pair.token0()]);
const aqb = token0.toLowerCase() === TOKEN.toLowerCase() ? r0 : r1;
const usdc = token0.toLowerCase() === TOKEN.toLowerCase() ? r1 : r0;
const price = poolPrice({ reserveAQB: Number(aqb), reserveUSDC: Number(usdc) * 1e12 });
const cfg = { price, target: 1, band: Number(process.env.MM_BAND || 0.01), usdc: Number(process.env.MM_USDC || 10), aqb: Number(process.env.MM_AQB || 10), maxTradeUSDC: Number(process.env.MM_MAX_USDC || 1.6), maxTradeAQB: Number(process.env.MM_MAX_AQB || 1.6) };
const action = decide(cfg);
const check = validateAction(action, { dailyUSDC: 0, maxDailyUSDC: Number(process.env.MM_MAX_DAILY_USDC || 5) });
const result = { simulation: false, readOnly: true, pair: PAIR, price, action, check };
if (action.action === "buy") result.expectedAQB = uniswapBuyQuote({ usdcIn: action.amountUSDC, reserveAQB: Number(aqb), reserveUSDC: Number(usdc) * 1e12 });
console.log(JSON.stringify(result, null, 2));
fs.writeFileSync("mm/paper-state.json", JSON.stringify(result, null, 2) + "\n");
