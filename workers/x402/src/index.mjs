// AQB x402 endpoint — dependency-free Cloudflare Worker.
// A paid agent service: 402 -> AQB transfer -> retry with X-AQB-Tx -> 200.
//
// Endpoints:
//   GET /              free service metadata
//   GET /stats         free on-chain stats
//   GET /health        free
//   GET /a2a/card      paid 0.01 AQB  (agent card / discovery)
//   GET /quote         paid 0.001 AQB (vault + Uniswap V2 quote)
//   GET /x402/pay      paid 0.001 AQB (generic paid resource)

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const SEL_GET_RESERVES = "0x0902f1ac";
const SEL_TOKEN0 = "0x0dfe1681";
const SEL_TOTAL_SUPPLY = "0x18160ddd";
const SEL_BALANCE_OF = "0x70a08231";
const SEL_AGENT_COUNT = "0xb7dc1284";

const PRICE_CARD = 10_000_000_000_000_000n; // 0.01 AQB
const PRICE_QUOTE = 1_000_000_000_000_000n; // 0.001 AQB
const PRICE_PAY = 1_000_000_000_000_000n; // 0.001 AQB

const CFG = (env) => ({
  chainId: Number(env.AQB_CHAIN_ID || 8453),
  token: (env.AQB_TOKEN || "0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1").toLowerCase(),
  registry: (env.AQB_REGISTRY || "0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB").toLowerCase(),
  payee: (env.AQB_PAYEE || "0x9eA52810f31768b1886cba9eAf917F4152f53042").toLowerCase(),
  pool: (env.AQB_POOL || "0xF61Cb078f87425933741Dd7d02F5779c030dB1A6").toLowerCase(),
  rpc: env.BASE_RPC || "https://mainnet.base.org",
  founder: (env.AQB_FOUNDER || env.AQB_PAYEE || "0x9eA52810f31768b1886cba9eAf917F4152f53042").toLowerCase(),
});

async function rpc(env, method, params) {
  const res = await fetch(CFG(env).rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result;
}

const hexWord = (data, i) => data.slice(2 + i * 64, 2 + (i + 1) * 64);
const uintWord = (data, i) => BigInt("0x" + hexWord(data, i));
const addressWord = (data, i) => ("0x" + hexWord(data, i).slice(24)).toLowerCase();
const padAddr = (a) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");

async function ethCall(env, to, data) {
  return rpc(env, "eth_call", [{ to, data }, "latest"]);
}

async function verifyPayment(env, txHash, payee, minValue) {
  const cfg = CFG(env);
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash || "")) return false;
  const receipt = await rpc(env, "eth_getTransactionReceipt", [txHash]);
  if (!receipt || receipt.status !== "0x1") return false;
  for (const log of receipt.logs || []) {
    if ((log.address || "").toLowerCase() !== cfg.token) continue;
    if (!log.topics || log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;
    const to = ("0x" + log.topics[2].slice(26)).toLowerCase();
    if (to !== payee.toLowerCase()) continue;
    let value = 0n;
    try { value = BigInt(log.data); } catch { continue; }
    if (value >= minValue) return true;
  }
  return false;
}

async function poolState(env) {
  const cfg = CFG(env);
  const [reserves, token0] = await Promise.all([
    ethCall(env, cfg.pool, SEL_GET_RESERVES),
    ethCall(env, cfg.pool, SEL_TOKEN0),
  ]);
  const r0 = uintWord(reserves, 0);
  const r1 = uintWord(reserves, 1);
  const t0 = addressWord(token0, 0);
  return t0 === cfg.token
    ? { aqb: r0, usdc: r1 }
    : { aqb: r1, usdc: r0 };
}

async function quote(env, amountAqb) {
  const p = await poolState(env);
  if (p.aqb === 0n || p.usdc === 0n) return { poolUSDC: 0n, priceUSDC: 0, ...p };
  const inFee = amountAqb * 997n;
  const out = (p.usdc * inFee) / (p.aqb * 1000n + inFee);
  return {
    poolUSDC: out,
    priceUSDC: Number(p.usdc) * 1e12 / Number(p.aqb),
    reserves: p,
  };
}

async function stats(env) {
  const cfg = CFG(env);
  const [supply, agentCount, vault, founderBal, pool] = await Promise.all([
    ethCall(env, cfg.token, SEL_TOTAL_SUPPLY),
    ethCall(env, cfg.registry, SEL_AGENT_COUNT),
    ethCall(env, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", SEL_BALANCE_OF + padAddr(cfg.token)),
    ethCall(env, cfg.token, SEL_BALANCE_OF + padAddr(cfg.founder)),
    poolState(env),
  ]);
  const total = BigInt(supply);
  const founder = BigInt(founderBal);
  const vaultUsd = BigInt(vault);
  const circulating = total - founder;
  const ratio = circulating === 0n ? 1 : Number(vaultUsd) * 1e12 / Number(circulating);
  return {
    aqb: 1,
    chainId: cfg.chainId,
    asOf: new Date().toISOString(),
    token: cfg.token,
    registry: cfg.registry,
    pool: cfg.pool,
    payee: cfg.payee,
    decimals: 18,
    totalSupplyAQB: fmt(total, 18),
    founderAQB: fmt(founder, 18),
    circulatingAQB: fmt(circulating, 18),
    vaultUSDC: fmt(vaultUsd, 6),
    collateralRatio: ratio.toFixed(6),
    agents: BigInt(agentCount).toString(),
    poolReserves: { aqb: fmt(pool.aqb, 18), usdc: fmt(pool.usdc, 6) },
    poolPriceUSDC: (Number(pool.usdc) * 1e12 / Number(pool.aqb || 1n)).toFixed(6),
    pq: {
      signature: "ML-DSA-65",
      kem: "ML-KEM-768",
      mode: "0x02",
      verifier: "0xa11eE20877a7618ff417f79A026186A9253C0b30",
    },
  };
}

function fmt(v, decimals) {
  const s = v.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,x-aqb-tx",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-expose-headers": "x-aqb-token,x-aqb-chain,x-aqb-price,x-aqb-payto,x-aqb-accept,x-aqb-paid",
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS, ...extra },
  });
}

function paymentRequired(env, request, price, resource) {
  const cfg = CFG(env);
  const origin = new URL(request.url).origin;
  return json(
    {
      error: "payment required",
      resource,
      accepts: {
        scheme: "aqb",
        network: "base",
        chainId: cfg.chainId,
        token: cfg.token,
        payTo: cfg.payee,
        price: price.toString(),
        priceHuman: fmt(price, 18),
        unit: "AQB",
        instructions: `Transfer at least ${fmt(price, 18)} AQB to ${cfg.payee} on Base, then retry with X-AQB-Tx: <txHash>.`,
      },
      discovery: `${origin}/.well-known/agent-coin.json`,
    },
    402,
    {
      "x-aqb-token": cfg.token,
      "x-aqb-chain": String(cfg.chainId),
      "x-aqb-price": price.toString(),
      "x-aqb-payto": cfg.payee,
      "x-aqb-accept": "aqb",
      "x-aqb-resource": resource,
    }
  );
}

async function markUsed(env, tx) {
  if (!env.REPLAY) return true;
  const id = env.REPLAY.idFromName("aqb-x402");
  const stub = env.REPLAY.get(id);
  const res = await stub.fetch("https://replay/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: tx.toLowerCase() }),
  });
  return res.ok;
}

async function paid(request, env, price, resource) {
  const cfg = CFG(env);
  const tx = request.headers.get("x-aqb-tx");
  if (!tx) return null;
  const ok = await verifyPayment(env, tx, cfg.payee, price);
  if (!ok) return { error: "payment not verified", tx };
  if (!(await markUsed(env, tx))) return { error: "payment already used", tx };
  return { tx };
}

export class Replay {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/check") return new Response("not found", { status: 404 });
    const { key } = await request.json();
    if (!key) return new Response("bad key", { status: 400 });
    const seen = await this.state.storage.get(key);
    if (seen) return new Response("used", { status: 409 });
    await this.state.storage.put(key, Date.now());
    return new Response("ok");
  }
}

async function telegramReply(env, chatId, text) {
  if (!env.TG_TOKEN) return { ok: false, error: "TG_TOKEN not configured" };
  const res = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  return { ok: res.ok, status: res.status };
}

async function telegramUpdate(env, update) {
  const msg = update.message;
  if (!msg || !msg.chat?.id) return { ignored: true };
  const text = (msg.text || "").trim();
  const chatId = msg.chat.id;
  const origin = "https://aqb-x402.aqb-foundation.workers.dev";
  let reply;

  if (text.startsWith("/start")) {
    reply = [
      "AQB — agent payments on Base.",
      "1 AQB = 1 USDC from an on-chain vault. ML-DSA-65 identities.",
      "",
      "Commands:",
      "/stats — live supply, vault, pool, agents",
      "/card — paid x402 agent card (0.01 AQB)",
      "/pay — one-command onboarding and payment",
      "/help — links",
    ].join("\n");
  } else if (text.startsWith("/stats")) {
    const s = await stats(env);
    reply = [
      `AQB live stats (${s.asOf})`,
      `Circulating: ${s.circulatingAQB} AQB`,
      `Vault: ${s.vaultUSDC} USDC`,
      `Collateral ratio: ${s.collateralRatio}`,
      `Agents: ${s.agents}`,
      `Pool: ${s.poolReserves.aqb} AQB / ${s.poolReserves.usdc} USDC`,
      `Price: ${s.poolPriceUSDC} USDC`,
      "",
      `${origin}/stats`,
    ].join("\n");
  } else if (text.startsWith("/card")) {
    reply = [
      "Paid AQB x402 resource",
      `${origin}/a2a/card`,
      "Price: 0.01 AQB on Base",
      `Pay to: ${CFG(env).payee}`,
      "Then retry with header X-AQB-Tx: <txHash>.",
      "The Worker verifies the Base receipt and rejects reuse.",
      "",
      `Free stats: ${origin}/stats`,
    ].join("\n");
  } else if (text.startsWith("/pay")) {
    reply = [
      "Onboard an agent:",
      "npx @aqb-foundation/aqb-agent onboard --name my-agent --skill \"my service\" --endpoint https://example.com/a2a --price 0.05",
      "",
      "Pay an agent:",
      "npx @aqb-foundation/aqb-agent pay --to 0xPAYEE --amount 0.25",
      "",
      "MCP x402: aqb_x402_call(url)",
      "npm 1.0.5",
    ].join("\n");
  } else if (text.startsWith("/help") || text.startsWith("/")) {
    reply = [
      "AQB links:",
      "Site: https://agentqubit.pages.dev",
      "Stats: https://agentqubit.pages.dev/stats.json",
      "npm: https://www.npmjs.com/package/@aqb-foundation/aqb-agent",
      "Repo: https://github.com/yss787976-ai/agent-coin",
      "",
      "Commands: /start /stats /card /pay /help",
    ].join("\n");
  } else {
    reply = "Use /help for commands.";
  }

  const sent = await telegramReply(env, chatId, reply);
  return { chatId, sent };
}

function card(env, request) {
  const cfg = CFG(env);
  const origin = new URL(request.url).origin;
  return {
    aqb: 1,
    name: "aqb-x402",
    skill: "paid agent discovery, quote, and x402 settlement demo",
    endpoint: `${origin}/a2a/card`,
    x402: `${origin}/x402/pay`,
    pq: "ML-DSA-65",
    kem: "ML-KEM-768",
    pay: `aqb:${cfg.payee}`,
    price: { unit: "AQB", amount: PRICE_CARD.toString(), per: "card" },
    accepts: ["aqb"],
    network: "base",
    chainId: cfg.chainId,
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const cfg = CFG(env);

    try {
      if (url.pathname === "/tg/webhook") {
        if (request.method !== "POST") return json({ error: "POST only" }, 405, CORS);
        if (!env.TG_WEBHOOK_SECRET) return json({ error: "webhook not configured" }, 503, CORS);
        if (request.headers.get("x-telegram-bot-api-secret-token") !== env.TG_WEBHOOK_SECRET) {
          return json({ error: "forbidden" }, 403, CORS);
        }
        const update = await request.json();
        const result = await telegramUpdate(env, update);
        return json({ ok: true, result }, 200, CORS);
      }

      if (url.pathname === "/" || url.pathname === "/health") {
        return json({
          ok: true,
          service: "aqb-x402",
          chainId: cfg.chainId,
          paid: {
            "/a2a/card": { price: PRICE_CARD.toString(), unit: "AQB" },
            "/quote": { price: PRICE_QUOTE.toString(), unit: "AQB" },
            "/x402/pay": { price: PRICE_PAY.toString(), unit: "AQB" },
          },
          free: ["/stats"],
        });
      }

      if (url.pathname === "/stats") return json(await stats(env));

      const paidCheck = async (price, resource) => {
        const p = await paid(request, env, price, resource);
        if (p === null) return paymentRequired(env, request, price, resource);
        if (p.error) return json({ error: p.error, tx: p.tx }, 402, { ...CORS, "x-aqb-paid": p.tx });
        return p;
      };

      if (url.pathname === "/a2a/card") {
        const p = await paidCheck(PRICE_CARD, "/a2a/card");
        if (p instanceof Response) return p;
        return json(card(env, request), 200, { ...CORS, "x-aqb-paid": p.tx });
      }

      if (url.pathname === "/quote") {
        const p = await paidCheck(PRICE_QUOTE, "/quote");
        if (p instanceof Response) return p;
        const amount = BigInt(url.searchParams.get("amount") || "1") * 10n ** 18n;
        if (amount <= 0n) return json({ error: "bad amount" }, 400, CORS);
        const q = await quote(env, amount);
        return json(
          {
            aqb: fmt(amount, 18),
            vaultUSDC: fmt(amount / 10n ** 12n, 6),
            poolUSDC: fmt(q.poolUSDC, 6),
            poolPriceUSDC: q.priceUSDC.toFixed(6),
            reserves: { aqb: fmt(q.reserves.aqb, 18), usdc: fmt(q.reserves.usdc, 6) },
          },
          200,
          { ...CORS, "x-aqb-paid": p.tx }
        );
      }

      if (url.pathname === "/x402/pay") {
        const p = await paidCheck(PRICE_PAY, "/x402/pay");
        if (p instanceof Response) return p;
        return json(
          { ok: true, resource: "x402", paidWith: "AQB", tx: p.tx, note: "Replace this demo resource with your own paid agent service." },
          200,
          { ...CORS, "x-aqb-paid": p.tx }
        );
      }

      return json({ error: "not found", endpoints: ["/", "/stats", "/a2a/card", "/quote", "/x402/pay"] }, 404, CORS);
    } catch (e) {
      return json({ error: String(e.message || e) }, 500, CORS);
    }
  },
};
