// Repairs the genesis-allotment accounting gap without changing contracts.
//
// The gap: genesisUnsold only shrinks on GenesisSale.buy. Coins transferred
// directly from the founder wallet to the pool / seed agents still circulate,
// but are not counted as backed.
//
// Fix: founder buys B USDC worth of AQB from GenesisSale (self-transfer), which
// deposits B USDC into the vault and shrinks genesisUnsold by B. Seed agents
// return R AQB to the founder. Choose B + R = circulating - vault, so that
// afterwards: founderBalance == genesisUnsold and vault == circulating.
//
// Usage:
//   node --env-file=.env scripts/repair-peg.mjs          # dry run
//   node --env-file=.env scripts/repair-peg.mjs --send   # broadcast
import { JsonRpcProvider, Wallet, Contract, formatEther, formatUnits } from "ethers";
import fs from "node:fs";

const SEND = process.argv.includes("--send");
const B = 35_000_000n; // 35.000000 USDC
const d = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
const founderSecret = JSON.parse(fs.readFileSync("founder/wallet.secret.json", "utf8"));
const seeds = JSON.parse(fs.readFileSync("seed/wallets.json", "utf8"));

const p = new JsonRpcProvider(process.env.RPC_URL || "https://mainnet.base.org", 8453, { staticNetwork: true });
const founder = new Wallet(founderSecret.eoaPrivateKey || process.env.PRIVATE_KEY, p);

const ABI_ACCOUNT = [
  "function digest(address,uint256,bytes,uint256) view returns(bytes32)",
  "function nonce() view returns(uint256)",
  "function execute(address,uint256,bytes,bytes) returns(bytes)",
];
const token = new Contract(d.token, [
  "function balanceOf(address) view returns(uint256)",
  "function allowance(address,address) view returns(uint256)",
  "function totalSupply() view returns(uint256)",
  "function genesisUnsold() view returns(uint256)",
  "function transfer(address,uint256) returns(bool)",
], p);
const usdc = new Contract(d.usdc, [
  "function balanceOf(address) view returns(uint256)",
  "function allowance(address,address) view returns(uint256)",
  "function approve(address,uint256) returns(bool)",
], p);
const sale = new Contract(d.sale, ["function buy(uint256) returns(uint256)", "function sold() view returns(uint256)"], p);
const account = new Contract(d.agent, ABI_ACCOUNT, p);

const SCALE = 10n ** 12n;

async function execEcdsa(owner, accountAddr, target, data) {
  const acc = new Contract(accountAddr, ABI_ACCOUNT, owner);
  const nonce = await acc.nonce();
  const digest = await acc.digest(target, 0n, data, nonce);
  const sig = owner.signingKey.sign(digest).serialized;
  const tx = await acc.execute(target, 0n, data, "0x01" + sig.slice(2));
  const rc = await tx.wait();
  return { hash: tx.hash, status: rc.status };
}

async function snapshot() {
  const total = await token.totalSupply();
  const founderBal = await token.balanceOf(d.agent);
  const saleBal = await token.balanceOf(d.sale);
  const vault = await usdc.balanceOf(d.token);
  const unsold = await token.genesisUnsold();
  const seedTotal = (await Promise.all(seeds.map((w) => token.balanceOf(w.address)))).reduce((a, b) => a + b, 0n);
  const circulating = total - founderBal - saleBal;
  return { total, founderBal, saleBal, vault, unsold, seedTotal, circulating };
}

const before = await snapshot();
const R = before.circulating - ((before.vault + B) * SCALE);

console.log("mode", SEND ? "SEND" : "DRY-RUN");
console.log("vault USDC", formatUnits(before.vault, 6));
console.log("circulating AQB", formatEther(before.circulating));
console.log("genesisUnsold", formatEther(before.unsold));
console.log("founder AQB", formatEther(before.founderBal));
console.log("seed AQB total", formatEther(before.seedTotal));
console.log("plan B USDC", formatUnits(B, 6), "-> AQB", formatEther(B * SCALE));
console.log("plan R AQB", formatEther(R));
console.log("expected final vault", formatUnits(before.vault + B, 6));
console.log("expected final circulating", formatEther(before.circulating - R));
console.log("expected final founder", formatEther(before.founderBal + R));
console.log("expected final genesisUnsold", formatEther(before.unsold - B * SCALE));

const accountUSDC = await usdc.balanceOf(d.agent);
if (R <= 0n) { console.log("nothing to repair"); process.exit(0); }
if (B > accountUSDC) { console.error("ABORT: account USDC insufficient"); process.exit(1); }
if (R > before.seedTotal) { console.error("ABORT: seed AQB insufficient"); process.exit(1); }
if (before.founderBal + R !== before.unsold - B * SCALE) {
  console.error("ABORT: arithmetic mismatch");
  process.exit(1);
}
if (!SEND) { console.log("dry run ok; pass --send to broadcast"); process.exit(0); }

console.log("\n1/3 approve USDC to sale");
const approve = await execEcdsa(founder, d.agent, d.usdc, usdc.interface.encodeFunctionData("approve", [d.sale, B]));
console.log("approve", approve.hash, "status", approve.status);
if (approve.status !== 1) process.exit(1);

console.log("2/3 GenesisSale.buy", formatUnits(B, 6), "USDC");
const buy = await execEcdsa(founder, d.agent, d.sale, sale.interface.encodeFunctionData("buy", [B]));
console.log("buy", buy.hash, "status", buy.status);
if (buy.status !== 1) process.exit(1);

console.log("3/3 return", formatEther(R), "AQB from seed agents");
let remaining = R;
for (const w of seeds) {
  if (remaining === 0n) break;
  const bal = await token.balanceOf(w.address);
  if (bal === 0n) continue;
  const amount = bal < remaining ? bal : remaining;
  const owner = new Wallet(w.key, p);
  const tx = await execEcdsa(owner, w.address, d.token, token.interface.encodeFunctionData("transfer", [d.agent, amount]));
  remaining -= amount;
  console.log("seed", w.address.slice(0, 10), formatEther(amount), tx.hash, "status", tx.status);
  if (tx.status !== 1) process.exit(1);
}
if (remaining !== 0n) { console.error("ABORT: seed return incomplete", formatEther(remaining)); process.exit(1); }

const after = await snapshot();
const afterCirculating = after.total - after.founderBal - after.saleBal;
const ratio = afterCirculating === 0n ? 1 : Number(after.vault * SCALE) / Number(afterCirculating);
console.log("\nfinal");
console.log("vault USDC", formatUnits(after.vault, 6));
console.log("circulating AQB", formatEther(afterCirculating));
console.log("genesisUnsold", formatEther(after.unsold));
console.log("founder AQB", formatEther(after.founderBal));
console.log("seed AQB total", formatEther(after.seedTotal));
console.log("true ratio", ratio.toFixed(6));
console.log("founder == genesisUnsold", after.founderBal === after.unsold);
console.log("vault == circulating", after.vault * SCALE === afterCirculating);
if (after.founderBal !== after.unsold || after.vault * SCALE !== afterCirculating) process.exit(1);
