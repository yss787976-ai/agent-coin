// Full live snapshot: peg, sale, pool, balances, registry. Read-only.
// Usage: node --env-file=.env scripts/state-full.mjs
import { JsonRpcProvider, Contract, formatEther, formatUnits } from "ethers";
import fs from "node:fs";

const d = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
const p = new JsonRpcProvider(process.env.RPC_URL || "https://mainnet.base.org", undefined, { staticNetwork: true });
const PAIR = "0xF61Cb078f87425933741Dd7d02F5779c030dB1A6";
const EOA = "0x2d3D0d01940900692aA9bEB4BA304470a54E2438";

const t = new Contract(d.token, [
  "function totalSupply() view returns(uint256)", "function genesisSupply() view returns(uint256)",
  "function genesisUnsold() view returns(uint256)", "function backing() view returns(uint256)",
  "function saleOpen() view returns(bool)", "function balanceOf(address) view returns(uint256)",
  "function pool(address) view returns(bool)", "function collateralRatio() view returns(uint256)",
  "function governor() view returns(address)",
], p);
const u = new Contract(d.usdc, ["function balanceOf(address) view returns(uint256)"], p);
const s = new Contract(d.sale, ["function sold() view returns(uint256)", "function remaining() view returns(uint256)", "function closed() view returns(bool)"], p);
const r = new Contract(d.registry, ["function agentCount() view returns(uint256)", "function isAgent(address) view returns(bool)"], p);
const q = new Contract(PAIR, ["function getReserves() view returns(uint112,uint112,uint32)", "function totalSupply() view returns(uint256)"], p);
const [r0, r1] = await q.getReserves();

const totalSupply = await t.totalSupply();
const founderBal = await t.balanceOf(d.agent);
const saleBal = await t.balanceOf(d.sale);
const vaultUSDC = await u.balanceOf(d.token);
const trueCirculating = totalSupply - founderBal - saleBal;
// vaultUSDC is 6dp, trueCirculating is 18dp; scale the dollar side to 18dp.
const trueRatio = trueCirculating === 0n ? 1 : Number(vaultUSDC * 10n ** 12n) / Number(trueCirculating);

const out = {
  at: new Date().toISOString(),
  chainId: (await p.getNetwork()).chainId.toString(),
  supply: formatEther(totalSupply),
  genesisSupply: formatEther(await t.genesisSupply()),
  genesisUnsold: formatEther(await t.genesisUnsold()),
  backing: formatUnits(await t.backing(), 6),
  vaultUSDC: formatUnits(vaultUSDC, 6),
  ratio: formatEther(await t.collateralRatio()),
  // The on-chain collateralRatio() subtracts genesisUnsold, which does not shrink
  // when the founder transfers allotment coins out. True circulating is therefore
  // supply minus the founder + sale wallets, and the real ratio is vault / that.
  trueCirculating: formatEther(trueCirculating),
  trueRatio: trueRatio.toFixed(6),
  sale: {
    sold: formatEther(await s.sold()), remaining: formatEther(await s.remaining()),
    closed: await s.closed(), tokenSaleOpen: await t.saleOpen(),
  },
  agents: (await r.agentCount()).toString(),
  founder: {
    address: d.agent, aqb: formatEther(await t.balanceOf(d.agent)),
    isAgent: await r.isAgent(d.agent), poolWhitelisted: await t.pool(d.agent),
  },
  pool: {
    pair: PAIR, aqb: formatEther(r0), usdc: formatUnits(r1, 6),
    lpSupply: formatEther(await q.totalSupply()), whitelisted: await t.pool(PAIR),
    tokenAQB: formatEther(await t.balanceOf(PAIR)), tokenUSDC: formatUnits(await u.balanceOf(PAIR), 6),
  },
  eoa: {
    address: EOA, eth: formatEther(await p.getBalance(EOA)),
    usdc: formatUnits(await u.balanceOf(EOA), 6),
  },
  account: {
    address: d.agent, eth: formatEther(await p.getBalance(d.agent)),
    usdc: formatUnits(await u.balanceOf(d.agent), 6),
  },
  governor: await t.governor(),
};
fs.writeFileSync("state-full.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
