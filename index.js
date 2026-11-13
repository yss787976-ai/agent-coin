#!/usr/bin/env node
// AQB CLI. One binary for humans wiring agents and for MCP clients.
// Usage: aqb-agent <command> [flags]
import fs from "node:fs";
import { ContractFactory, parseUnits, formatUnits, formatEther } from "ethers";
import { AqbAgent, discover, wellKnown, cardHash, newIdentity, USDC } from "./client/aqb.mjs";

const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const regFile = JSON.parse(fs.readFileSync(new URL("./registry/agent-coin.json", import.meta.url), "utf8"));

const DEFAULTS = {
  token: process.env.AQB_TOKEN || regFile.contracts.token,
  registry: process.env.AQB_REGISTRY || regFile.contracts.registry,
  verifier: process.env.AQB_VERIFIER || regFile.contracts.verifier,
  pair: process.env.AQB_PAIR || regFile.markets?.[0]?.pair,
  sale: process.env.AQB_SALE || regFile.sale,
  chain: process.env.AQB_CHAIN || "base",
  rpc: process.env.AQB_RPC || process.env.BASE_RPC,
  key: process.env.AQB_KEY || process.env.PRIVATE_KEY,
};

function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const body = a.slice(2);
    if (body.includes("=")) {
      const [k, ...rest] = body.split("=");
      out[k] = rest.join("=");
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      out[body] = argv[++i];
    } else {
      out[body] = true;
    }
  }
  return out;
}

function client(args, extra = {}) {
  return new AqbAgent({
    rpc: args.rpc || DEFAULTS.rpc,
    chain: args.chain || DEFAULTS.chain,
    privateKey: args.key || DEFAULTS.key,
    token: args.token || DEFAULTS.token,
    registry: args.registry || DEFAULTS.registry,
    ...extra,
  });
}

function need(v, name) {
  if (!v) throw new Error(`missing --${name}`);
  return v;
}

const addr = (x) => (typeof x === "string" ? x.toLowerCase() : x);

function buildCard(args, account) {
  return {
    aqb: 1,
    name: args.name || "aqb-agent",
    skill: args.skill || "agent service",
    endpoint: args.endpoint || "https://agent.example/a2a",
    pq: "ML-DSA-65",
    kem: "ML-KEM-768",
    pay: `aqb:${account || args.account || "0x0000000000000000000000000000000000000000"}`,
    price: { unit: "AQB", amount: args.price || "0", per: args.per || "call" },
  };
}

function readCard(args, account) {
  if (args.card) return JSON.parse(fs.readFileSync(args.card, "utf8"));
  return buildCard(args, account);
}

const HELP = `aqb-agent ${pkg.version}

  aqb-agent mcp                         start the MCP stdio server
  aqb-agent discover <host>             read /.well-known/agent-coin.json
  aqb-agent wellknown                   print this deployment's discovery JSON
  aqb-agent balance [address]           AQB + USDC balances
  aqb-agent is-agent <address>          registry membership
  aqb-agent quote [--amount 1]          vault + Uniswap V2 quote
  aqb-agent pay --to 0x.. --amount 1.5 [--account 0x..]
  aqb-agent fund --amount 10 [--account 0x..]        (USDC -> AQB)
  aqb-agent redeem --amount 10 [--account 0x..]      (AQB -> USDC)
  aqb-agent register --account 0x.. [--name .. --skill .. --endpoint .. --price ..]
  aqb-agent update-card --account 0x.. [--card file.json | --name .. --skill ..]
  aqb-agent card [--card file.json | --name .. --skill .. --endpoint ..]
  aqb-agent onboard [--name .. --skill .. --endpoint .. --price ..] [--faucet URL]
  aqb-agent deploy-account             deploy a PQSmartAccount (prints its PQ keys)
  aqb-agent announce --account 0x.. --eph-pubkey 0x.. --shared-secret 0x..
  aqb-agent version

Env: AQB_KEY/PRIVATE_KEY, AQB_RPC/BASE_RPC, AQB_CHAIN, AQB_TOKEN, AQB_REGISTRY, AQB_VERIFIER, AQB_PAIR, AQB_SALE
The on-chain account path currently signs with the ECDSA fallback (scheme 0x01); the PQ
key remains the account identity and is used for off-chain signatures.
`;

async function main() {
  const args = parse(process.argv.slice(2));
  const cmd = args._[0] || "help";

  if (cmd === "help" || args.help) { process.stdout.write(HELP); return; }
  if (cmd === "version") { console.log(pkg.version); return; }

  if (cmd === "mcp") {
    await import("./mcp/server.mjs");
    return;
  }

  if (cmd === "discover") {
    const host = need(args._[1] || args.host, "host");
    console.log(JSON.stringify(await discover(host), null, 2));
    return;
  }

  if (cmd === "wellknown") {
    console.log(JSON.stringify(wellKnown({
      token: DEFAULTS.token, registry: DEFAULTS.registry, verifier: DEFAULTS.verifier,
      chainId: Number(DEFAULTS.chain === "base" ? 8453 : 84532),
      pool: DEFAULTS.pair, sale: DEFAULTS.sale,
    }), null, 2));
    return;
  }

  const c = client(args);

  if (cmd === "balance") {
    const address = addr(args._[1] || args.address || c.signer?.address);
    if (!address) throw new Error("missing address");
    console.log(JSON.stringify({
      address,
      aqb: formatEther(await c.balance(address)),
      usdc: formatUnits(await c.usdBalance(address), 6),
    }, null, 2));
    return;
  }

  if (cmd === "is-agent") {
    const address = addr(need(args._[1] || args.address, "address"));
    console.log(JSON.stringify({ address, isAgent: await c.isAgent(address) }, null, 2));
    return;
  }

  if (cmd === "quote") {
    const pair = addr(args.pair || DEFAULTS.pair);
    const amount = parseUnits(args.amount || "1", 18);
    const q = await c.poolQuote(pair, amount);
    console.log(JSON.stringify({
      pool: pair,
      aqb: formatEther(amount),
      vaultUSDC: formatUnits(amount / 10n ** 12n, 6),
      poolUSDC: formatUnits(q.usdc, 6),
      reserves: { aqb: formatEther(q.reserves.aqb), usdc: formatUnits(q.reserves.usdc, 6) },
    }, null, 2));
    return;
  }

  if (cmd === "pay") {
    const to = addr(need(args.to, "to"));
    const amount = parseUnits(need(args.amount, "amount"), 18);
    const tx = args.account ? await c.payFromAccount(c.account(addr(args.account)), to, amount) : await c.pay(to, amount);
    console.log(JSON.stringify({ tx, to, aqb: formatEther(amount) }, null, 2));
    return;
  }

  if (cmd === "fund") {
    const amount = parseUnits(need(args.amount, "amount"), 6);
    const tx = args.account ? await c.fundFromAccount(c.account(addr(args.account)), amount) : await c.fund(amount);
    console.log(JSON.stringify({ tx, usdc: formatUnits(amount, 6) }, null, 2));
    return;
  }

  if (cmd === "redeem" || cmd === "cash-out") {
    const amount = parseUnits(need(args.amount, "amount"), 18);
    const tx = args.account ? await c.redeemFromAccount(c.account(addr(args.account)), amount) : await c.cashOut(amount);
    console.log(JSON.stringify({ tx, aqb: formatEther(amount), usdc: formatUnits(amount / 10n ** 12n, 6) }, null, 2));
    return;
  }

  if (cmd === "register") {
    const account = addr(need(args.account, "account"));
    const card = readCard(args, account);
    const tx = await c.registerViaAccount(account, card);
    console.log(JSON.stringify({ tx, account, cardHash: cardHash(card), card }, null, 2));
    return;
  }

  if (cmd === "update-card") {
    const account = addr(need(args.account, "account"));
    const card = readCard(args, account);
    const tx = await c.updateCardFromAccount(account, card);
    console.log(JSON.stringify({ tx, account, cardHash: cardHash(card) }, null, 2));
    return;
  }

  if (cmd === "card") {
    const card = readCard(args, args.account);
    console.log(JSON.stringify({ card, cardHash: cardHash(card) }, null, 2));
    return;
  }

  if (cmd === "onboard") {
    if (args["dry-run"]) {
      console.log(JSON.stringify({
        dryRun: true,
        ecdsaFallback: c.signer?.address || "0x0000000000000000000000000000000000000000",
        verifier: DEFAULTS.verifier,
        chainId: c.chainId,
        card: buildCard(args, "0x0000000000000000000000000000000000000000"),
        steps: ["deploy PQSmartAccount", "register agent card via the ECDSA fallback", args.faucet ? `POST ${args.faucet}` : null].filter(Boolean),
      }, null, 2));
      return;
    }
    const signer = c.requireSigner();
    const id = newIdentity();
    const art = JSON.parse(fs.readFileSync(new URL("./artifacts/PQSmartAccount.json", import.meta.url), "utf8"));
    const factory = new ContractFactory(art.abi, art.bytecode, signer);
    process.stderr.write("onboard: deploying PQSmartAccount...\n");
    const acc = await factory.deploy(DEFAULTS.verifier, signer.address, id.publicKey);
    const deployTx = acc.deploymentTransaction()?.hash;
    await acc.waitForDeployment();
    const address = await acc.getAddress();
    const card = buildCard(args, address);
    process.stderr.write(`onboard: registering ${address}...\n`);
    const registerTx = await c.registerViaAccount(address, card);
    let faucet = null;
    if (args.faucet) {
      process.stderr.write(`onboard: calling faucet ${args.faucet}...\n`);
      try {
        const r = await fetch(args.faucet, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address, chainId: c.chainId }),
        });
        const text = await r.text();
        let body; try { body = JSON.parse(text); } catch { body = text; }
        faucet = { status: r.status, body };
      } catch (e) {
        faucet = { error: e.message || String(e) };
      }
    }
    console.log(JSON.stringify({
      account: address,
      ecdsaFallback: signer.address,
      verifier: DEFAULTS.verifier,
      chainId: c.chainId,
      pqPublicKey: "0x" + Buffer.from(id.publicKey).toString("hex"),
      pqSecretKey: "0x" + Buffer.from(id.secretKey).toString("hex"),
      pqKeyHash: id.keyHash,
      card,
      cardHash: cardHash(card),
      deployTx,
      registerTx,
      explorer: `https://basescan.org/address/${address}`,
      faucet,
      next: [
        "save pqSecretKey offline; it is the agent identity",
        `aqb-agent balance ${address}`,
        "serve the card at the endpoint you registered",
      ],
    }, null, 2));
    return;
  }

  if (cmd === "deploy-account") {
    const art = JSON.parse(fs.readFileSync(new URL("./artifacts/PQSmartAccount.json", import.meta.url), "utf8"));
    const id = newIdentity();
    const factory = new ContractFactory(art.abi, art.bytecode, c.requireSigner());
    const acc = await factory.deploy(DEFAULTS.verifier, c.signer.address, id.publicKey);
    await acc.waitForDeployment();
    const address = await acc.getAddress();
    console.log(JSON.stringify({
      account: address,
      ecdsaFallback: c.signer.address,
      verifier: DEFAULTS.verifier,
      pqPublicKey: "0x" + Buffer.from(id.publicKey).toString("hex"),
      pqSecretKey: "0x" + Buffer.from(id.secretKey).toString("hex"),
      pqKeyHash: id.keyHash,
      next: `aqb-agent register --account ${address} --name <name> --skill <skill> --endpoint <url>`,
    }, null, 2));
    return;
  }

  if (cmd === "announce") {
    const account = addr(need(args.account, "account"));
    const tx = await c.announceFromAccount(
      c.account(account),
      need(args["eph-pubkey"], "eph-pubkey"),
      need(args["shared-secret"], "shared-secret"),
      args["meta-hash"] || "0x" + "00".repeat(32)
    );
    console.log(JSON.stringify({ tx, account }, null, 2));
    return;
  }

  process.stderr.write(HELP);
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.shortMessage || e.message || String(e));
  process.exit(1);
});
