#!/usr/bin/env node
// AQB MCP server (stdio JSON-RPC 2.0, no deps). Tools every agent can call.
import fs from "node:fs";
import { parseUnits, formatUnits, formatEther } from "ethers";
import { AqbAgent, discover, wellKnown, cardHash } from "../client/aqb.mjs";

const regFile = JSON.parse(fs.readFileSync(new URL("../registry/agent-coin.json", import.meta.url), "utf8"));
const TOKEN = process.env.AQB_TOKEN || regFile.contracts.token;
const REGISTRY = process.env.AQB_REGISTRY || regFile.contracts.registry;
const VERIFIER = process.env.AQB_VERIFIER || regFile.contracts.verifier;
const PAIR = process.env.AQB_PAIR || regFile.markets?.[0]?.pair;
const SALE = process.env.AQB_SALE || regFile.sale;

const cfg = () => new AqbAgent({
  rpc: process.env.AQB_RPC || process.env.BASE_RPC,
  chain: process.env.AQB_CHAIN || "base",
  privateKey: process.env.AQB_KEY || process.env.PRIVATE_KEY,
  token: TOKEN,
  registry: REGISTRY,
});

const TOOLS = [
  { name: "aqb_discover", description: "Fetch AQB discovery doc from an agent host", inputSchema: { type: "object", properties: { host: { type: "string" } }, required: ["host"] } },
  { name: "aqb_balance", description: "Get AQB and USDC balances for an address (read-only)", inputSchema: { type: "object", properties: { address: { type: "string" } } } },
  { name: "aqb_is_agent", description: "Check whether an address is a registered agent", inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] } },
  { name: "aqb_quote", description: "Quote 1 AQB in USDC from the vault (1.0) and the Uniswap V2 pool", inputSchema: { type: "object", properties: { amount: { type: "string" }, pair: { type: "string" } } } },
  { name: "aqb_register", description: "Register a PQSmartAccount as an agent (caller must be the account)", inputSchema: { type: "object", properties: { account: { type: "string" }, card: { type: "object" }, scheme: { type: "string", enum: ["ecdsa", "pq"] } }, required: ["account", "card"] } },
  { name: "aqb_update_card", description: "Publish a new agent card hash from a PQSmartAccount", inputSchema: { type: "object", properties: { account: { type: "string" }, card: { type: "object" }, scheme: { type: "string", enum: ["ecdsa", "pq"] } }, required: ["account", "card"] } },
  { name: "aqb_fund", description: "Mint AQB against USDC, 1:1 (usd in human units, e.g. 10.5)", inputSchema: { type: "object", properties: { usd: { type: "string" }, account: { type: "string" } }, required: ["usd"] } },
  { name: "aqb_pay", description: "Pay AQB to another agent (amount in human units, e.g. 1.5)", inputSchema: { type: "object", properties: { to: { type: "string" }, aqb: { type: "string" }, account: { type: "string" } }, required: ["to", "aqb"] } },
  { name: "aqb_redeem", description: "Redeem AQB for USDC, 1:1 (amount in human units)", inputSchema: { type: "object", properties: { aqb: { type: "string" }, account: { type: "string" } }, required: ["aqb"] } },
  { name: "aqb_cash_out", description: "Alias for aqb_redeem", inputSchema: { type: "object", properties: { aqb: { type: "string" }, account: { type: "string" } }, required: ["aqb"] } },
  { name: "aqb_announce_stealth", description: "Publish a stealth address for a payer from a PQSmartAccount", inputSchema: { type: "object", properties: { account: { type: "string" }, ephPubKey: { type: "string" }, sharedSecret: { type: "string" }, metaHash: { type: "string" } }, required: ["account", "ephPubKey", "sharedSecret"] } },
  { name: "aqb_wellknown", description: "Generate your own /.well-known/agent-coin.json", inputSchema: { type: "object", properties: { token: { type: "string" }, registry: { type: "string" }, verifier: { type: "string" }, pool: { type: "string" } } } },
  { name: "aqb_x402_call", description: "Call an AQB x402 endpoint: GET, read the 402 terms, pay AQB, retry with X-AQB-Tx, return the resource", inputSchema: { type: "object", properties: { url: { type: "string" }, method: { type: "string", enum: ["GET", "POST"] }, body: { type: "string" }, account: { type: "string" } }, required: ["url"] } },
];

function requireArg(a, name) {
  if (!a[name]) throw new Error(`missing argument: ${name}`);
  return a[name];
}

const addr = (x) => (typeof x === "string" ? x.toLowerCase() : x);

function accountOf(c, a) {
  return a.account ? c.account(addr(a.account)) : null;
}

async function run(name, a) {
  const c = cfg();
  switch (name) {
    case "aqb_discover":
      return await discover(requireArg(a, "host"));
    case "aqb_balance": {
      const address = addr(a.address || c.signer?.address);
      if (!address) throw new Error("address required");
      return {
        address,
        aqb: formatEther(await c.balance(address)),
        usdc: formatUnits(await c.usdBalance(address), 6),
      };
    }
    case "aqb_is_agent":
      return { isAgent: await c.isAgent(addr(requireArg(a, "address"))) };
    case "aqb_quote": {
      const amount = parseUnits(a.amount || "1", 18);
      const q = await c.poolQuote(addr(a.pair || PAIR), amount);
      return {
        pool: addr(a.pair || PAIR),
        aqb: formatEther(amount),
        vaultUSDC: formatUnits(amount / 10n ** 12n, 6),
        poolUSDC: formatUnits(q.usdc, 6),
        reserves: { aqb: formatEther(q.reserves.aqb), usdc: formatUnits(q.reserves.usdc, 6) },
      };
    }
    case "aqb_register": {
      const account = addr(requireArg(a, "account"));
      const tx = await c.registerViaAccount(account, requireArg(a, "card"), a.scheme || "ecdsa");
      return { tx, account, cardHash: cardHash(a.card) };
    }
    case "aqb_update_card": {
      const account = addr(requireArg(a, "account"));
      const tx = await c.updateCardFromAccount(account, requireArg(a, "card"), a.scheme || "ecdsa");
      return { tx, account, cardHash: cardHash(a.card) };
    }
    case "aqb_fund": {
      const usd = parseUnits(requireArg(a, "usd"), 6);
      const acc = accountOf(c, a);
      return { tx: acc ? await c.fundFromAccount(acc, usd) : await c.fund(usd), usdc: formatUnits(usd, 6) };
    }
    case "aqb_pay": {
      const aqb = parseUnits(requireArg(a, "aqb"), 18);
      const acc = accountOf(c, a);
      const to = addr(requireArg(a, "to")); return { tx: acc ? await c.payFromAccount(acc, to, aqb) : await c.pay(to, aqb), aqb: formatEther(aqb) };
    }
    case "aqb_redeem":
    case "aqb_cash_out": {
      const aqb = parseUnits(requireArg(a, "aqb"), 18);
      const acc = accountOf(c, a);
      return { tx: acc ? await c.redeemFromAccount(acc, aqb) : await c.cashOut(aqb), aqb: formatEther(aqb) };
    }
    case "aqb_announce_stealth": {
      const tx = await c.announceFromAccount(
        c.account(addr(requireArg(a, "account"))),
        requireArg(a, "ephPubKey"),
        requireArg(a, "sharedSecret"),
        a.metaHash || "0x" + "00".repeat(32)
      );
      return { tx };
    }
    case "aqb_wellknown":
      return wellKnown({
        token: a.token || TOKEN,
        registry: a.registry || REGISTRY,
        verifier: a.verifier || VERIFIER,
        chainId: Number(process.env.AQB_CHAIN_ID || 8453),
        pool: a.pool || PAIR,
        sale: SALE,
      });
    case "aqb_x402_call": {
      const url = requireArg(a, "url");
      const method = a.method || "GET";
      const first = await fetch(url, { method, body: a.body });
      if (first.status !== 402) {
        return { status: first.status, paid: false, body: await first.text() };
      }
      const price = first.headers.get("x-aqb-price");
      const payTo = first.headers.get("x-aqb-payto");
      if (!price || !payTo) throw new Error("402 without x-aqb-price/x-aqb-payto");
      const amount = BigInt(price);
      const acc = accountOf(c, a);
      const tx = acc
        ? await c.payFromAccount(acc, addr(payTo), amount)
        : await c.pay(addr(payTo), amount);
      const second = await fetch(url, {
        method,
        body: a.body,
        headers: { "x-aqb-tx": tx },
      });
      return {
        status: second.status,
        paid: true,
        tx,
        aqb: formatEther(amount),
        payTo: addr(payTo),
        body: await second.text(),
      };
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}

const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
let buf = "";
process.stdin.on("data", async (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    try {
      if (m.method === "initialize") {
        send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "aqb", version: "1.0.5" } } });
      } else if (m.method === "tools/list") {
        send({ jsonrpc: "2.0", id: m.id, result: { tools: TOOLS } });
      } else if (m.method === "tools/call") {
        const out = await run(m.params.name, m.params.arguments || {});
        send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify(out) }] } });
      } else if (m.id !== undefined) {
        send({ jsonrpc: "2.0", id: m.id, result: {} });
      }
    } catch (e) {
      const msg = String(e.shortMessage || e.message || e);
      if (m.id !== undefined) {
        send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: msg }], isError: true } });
      }
    }
  }
});
