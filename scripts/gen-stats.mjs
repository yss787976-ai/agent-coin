#!/usr/bin/env node
// Generate the public, machine-readable AQB stats snapshot.
// Usage: node scripts/gen-stats.mjs [--write]
import fs from "node:fs";
import { JsonRpcProvider, Contract } from "ethers";

const RPC = process.env.AQB_RPC || process.env.BASE_RPC || "https://mainnet.base.org";
const TOKEN = process.env.AQB_TOKEN || "0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1";
const REGISTRY = process.env.AQB_REGISTRY || "0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const POOL = process.env.AQB_PAIR || "0xF61Cb078f87425933741Dd7d02F5779c030dB1A6";
const FOUNDER = "0x9eA52810f31768b1886cba9eAf917F4152f53042";
const SALE = "0xeDBD6B860c37C411aeeA513cbc0656e3135f59c1";
const OUT = "publish/stats.json";

const provider = new JsonRpcProvider(RPC, 8453, { staticNetwork: true });
const token = new Contract(TOKEN, [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
], provider);
const usdc = new Contract(USDC, ["function balanceOf(address) view returns (uint256)"], provider);
const registry = new Contract(REGISTRY, ["function agentCount() view returns (uint256)"], provider);
const pool = new Contract(POOL, [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
], provider);

const proofCount = (() => {
  try {
    return JSON.parse(fs.readFileSync("publish/x402-payments.json", "utf8")).payments.length;
  } catch {
    return 0;
  }
})();

const [total, founderBal, saleBal, vault, agents, reserves, token0, block] = await Promise.all([
  token.totalSupply(),
  token.balanceOf(FOUNDER),
  token.balanceOf(SALE),
  usdc.balanceOf(TOKEN),
  registry.agentCount(),
  pool.getReserves(),
  pool.token0(),
  provider.getBlockNumber(),
]);

const circulating = total - founderBal - saleBal;
const ratio = circulating === 0n ? 1 : Number(vault) * 1e12 / Number(circulating);
const aqbReserve = token0.toLowerCase() === TOKEN.toLowerCase() ? reserves[0] : reserves[1];
const usdcReserve = token0.toLowerCase() === TOKEN.toLowerCase() ? reserves[1] : reserves[0];
const price = aqbReserve === 0n ? 0 : Number(usdcReserve) * 1e12 / Number(aqbReserve);

const stats = {
  aqb: 1,
  chainId: 8453,
  asOf: new Date().toISOString(),
  block,
  token: TOKEN,
  registry: REGISTRY,
  pool: POOL,
  sale: SALE,
  founder: FOUNDER,
  decimals: 18,
  totalSupplyAQB: fmt(total, 18),
  founderAQB: fmt(founderBal, 18),
  saleAQB: fmt(saleBal, 18),
  circulatingAQB: fmt(circulating, 18),
  vaultUSDC: fmt(vault, 6),
  collateralRatio: ratio.toFixed(6),
  agents: agents.toString(),
  poolReserves: { aqb: fmt(aqbReserve, 18), usdc: fmt(usdcReserve, 6) },
  poolPriceUSDC: price.toFixed(6),
  pq: {
    signature: "ML-DSA-65",
    kem: "ML-KEM-768",
    mode: "0x02",
    verifier: "0xa11eE20877a7618ff417f79A026186A9253C0b30",
  },
  x402: {
    paid: "https://agentqubit.pages.dev/a2a/card",
    free: "https://agentqubit.pages.dev/stats",
    price: "0.01",
    unit: "AQB",
    verifiedPayments: proofCount,
  },
};

function fmt(v, decimals) {
  const s = v.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

const text = JSON.stringify(stats, null, 2) + "\n";
if (process.argv.includes("--write")) {
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${OUT}`);
} else {
  process.stdout.write(text);
}
