// AQB agent SDK — the only client an agent needs.
// docs/SPEC.md is normative; this file is a thin, boring implementation of it.
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes, solidityPacked } from "ethers";
import { newIdentity, signDigest, stealthFor, stealthCheck } from "../pq/pq.mjs";
export { newIdentity, stealthFor, stealthCheck };

export const CHAINS = { base: 8453, "base-sepolia": 84532 };
export const USDC = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};
export const DEFAULT_RPC = {
  8453: "https://mainnet.base.org",
  84532: "https://sepolia.base.org",
};

const ABI_TOKEN = [
  "function mint(uint256 usd6) returns (uint256)",
  "function redeem(uint256 aqb18) returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function collateralRatio() view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function totalSupply() view returns (uint256)",
];
const ABI_REG = [
  "function register(bytes32 pqKeyHash, bytes32 cardHash)",
  "function isAgent(address) view returns (bool)",
  "function updateCard(bytes32 cardHash)",
  "function announce(address stealth, bytes ephPubKey, bytes1 viewTag, bytes32 meta)",
  "function agentCount() view returns (uint256)",
];
const ABI_USDC = ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"];
const ABI_ACCOUNT = [
  "function digest(address,uint256,bytes,uint256) view returns (bytes32)",
  "function nonce() view returns (uint256)",
  "function execute(address,uint256,bytes,bytes)",
  "function pqKeyHash() view returns (bytes32)",
];
const ABI_PAIR = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
];

/// ML-DSA-65 keypair stand-in: `pq` may be any FIPS-204 implementation.
/// pubKey must be 1952 bytes, sig 3309 bytes, scheme tag 0x02.
export function keyHash(pubKey) {
  return keccak256(pubKey);
}

/// Recursively sort object keys so a card has one deterministic JSON form.
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

/// Deterministic 32-byte agent card commitment (SPEC §1.4).
/// Nested objects are sorted too; a shallow JSON.stringify replacer is not enough.
export function cardHash(card) {
  return keccak256(toUtf8Bytes(JSON.stringify(canonicalize(card))));
}

/// Stealth address + one-byte view tag (SPEC §5.2).
/// Matches pq.stealthFor(): h = keccak256(sharedSecret || ephPubKey).
export function stealth(ephPubKey, sharedSecret) {
  const h = keccak256(solidityPacked(["bytes32", "bytes"], [sharedSecret, ephPubKey]));
  return {
    addr: ("0x" + h.slice(26)).toLowerCase(),
    viewTag: "0x" + h.slice(2, 4),
  };
}

export class AqbAgent {
  constructor({ rpc, chain = "base", privateKey, token, registry }) {
    this.chainId = typeof chain === "number" ? chain : CHAINS[chain];
    this.provider = new JsonRpcProvider(rpc || DEFAULT_RPC[this.chainId], this.chainId, { staticNetwork: true });
    this.signer = privateKey ? new Wallet(privateKey, this.provider) : null;
    this.tokenAddr = token;
    this.registryAddr = registry;
  }

  requireSigner() {
    if (!this.signer) throw new Error("read-only client: pass privateKey");
    return this.signer;
  }

  token(ro = false) {
    return new Contract(this.tokenAddr, ABI_TOKEN, ro ? this.provider : this.requireSigner());
  }
  registry(ro = false) {
    return new Contract(this.registryAddr, ABI_REG, ro ? this.provider : this.requireSigner());
  }

  // ---- read
  usdBalance(a = this.signer?.address) {
    if (!a) throw new Error("address required");
    return new Contract(USDC[this.chainId], ABI_USDC, this.provider).balanceOf(a);
  }
  isAgent(a = this.signer?.address) {
    if (!a) throw new Error("address required");
    return this.registry(true).isAgent(a);
  }
  balance(a = this.signer?.address) {
    if (!a) throw new Error("address required");
    return this.token(true).balanceOf(a);
  }
  ratio() { return this.token(true).collateralRatio(); }

  /// Uniswap V2 spot quote: how much USDC out for `amount` AQB (18dp).
  async poolQuote(pair, amount = 10n ** 18n) {
    const c = new Contract(pair, ABI_PAIR, this.provider);
    const [r0, r1] = await c.getReserves();
    const token0 = (await c.token0()).toLowerCase();
    const [rAqb, rUsd] = token0 === this.tokenAddr.toLowerCase() ? [r0, r1] : [r1, r0];
    if (rAqb === 0n || rUsd === 0n) return { amount, usdc: 0n, reserves: { aqb: 0n, usdc: 0n } };
    const inWithFee = amount * 997n;
    const out = (BigInt(rUsd) * inWithFee) / (BigInt(rAqb) * 1000n + inWithFee);
    return { amount, usdc: out, reserves: { aqb: rAqb, usdc: rUsd } };
  }

  // ---- write (EOA; the EOA must already be an agent to mint/redeem)
  async register() {
    throw new Error(
      "AgentRegistry.register must be called by a PQSmartAccount; use registerFromAccount(account, card) or `aqb-agent register --account 0x...`"
    );
  }

  async fund(usd) {
    const usdc = new Contract(USDC[this.chainId], ABI_USDC, this.requireSigner());
    await (await usdc.approve(this.tokenAddr, usd)).wait();
    return (await (await this.token().mint(usd)).wait()).hash;
  }

  async cashOut(aqb) {
    return (await (await this.token().redeem(aqb)).wait()).hash;
  }

  async pay(to, aqb) {
    return (await (await this.token().transfer(to, aqb)).wait()).hash;
  }

  // ---- PQ smart-account path
  account(addr, identity = null) {
    const c = new Contract(addr, ABI_ACCOUNT, this.requireSigner());
    return { c, identity, addr };
  }

  _account(acc) {
    return typeof acc === "string" ? this.account(acc) : acc;
  }

  /// Execute through a PQSmartAccount. `scheme` is "ecdsa" (0x01, current
  /// on-chain path) or "pq" (0x02, requires a live ML-DSA verifier).
  async exec(acc, target, data, scheme = "ecdsa", value = 0n) {
    const a = this._account(acc);
    const nonce = await a.c.nonce();
    const digest = await a.c.digest(target, value, data, nonce);
    let sig;
    if (scheme === "pq") {
      if (!a.identity) throw new Error("pq scheme needs an identity");
      sig = signDigest(a.identity, digest);
    } else {
      const s = this.requireSigner().signingKey.sign(digest);
      sig = "0x01" + s.r.slice(2) + s.s.slice(2) + s.v.toString(16).padStart(2, "0");
    }
    const tx = await a.c.execute(target, value, data, sig);
    return (await tx.wait()).hash;
  }

  async execPQ(acc, target, data, value = 0n) {
    return this.exec(acc, target, data, "pq", value);
  }

  async registerFromAccount(acc, card, scheme = "ecdsa") {
    const a = this._account(acc);
    const pqKeyHash = await a.c.pqKeyHash();
    const data = this.registry(true).interface.encodeFunctionData("register", [pqKeyHash, cardHash(card)]);
    return this.exec(a, this.registryAddr, data, scheme);
  }

  async registerViaAccount(accountAddr, card, scheme = "ecdsa") {
    return this.registerFromAccount(accountAddr, card, scheme);
  }

  async updateCardFromAccount(acc, card, scheme = "ecdsa") {
    const data = this.registry(true).interface.encodeFunctionData("updateCard", [cardHash(card)]);
    return this.exec(acc, this.registryAddr, data, scheme);
  }

  async fundFromAccount(acc, usd, scheme = "ecdsa") {
    const usdc = new Contract(USDC[this.chainId], ABI_USDC, this.provider);
    await this.exec(acc, USDC[this.chainId], usdc.interface.encodeFunctionData("approve", [this.tokenAddr, usd]), scheme);
    return this.exec(acc, this.tokenAddr, this.token().interface.encodeFunctionData("mint", [usd]), scheme);
  }

  async payFromAccount(acc, to, aqb, scheme = "ecdsa") {
    return this.exec(acc, this.tokenAddr, this.token().interface.encodeFunctionData("transfer", [to, aqb]), scheme);
  }

  async redeemFromAccount(acc, aqb, scheme = "ecdsa") {
    return this.exec(acc, this.tokenAddr, this.token().interface.encodeFunctionData("redeem", [aqb]), scheme);
  }

  async cashOutFromAccount(acc, aqb, scheme = "ecdsa") {
    return this.redeemFromAccount(acc, aqb, scheme);
  }

  async announceFromAccount(acc, ephPubKey, sharedSecret, metaHash = "0x" + "00".repeat(32), scheme = "ecdsa") {
    const { addr, viewTag } = stealth(ephPubKey, sharedSecret);
    const data = this.registry(true).interface.encodeFunctionData("announce", [addr, ephPubKey, viewTag, metaHash]);
    return this.exec(acc, this.registryAddr, data, scheme);
  }
}

/// Discovery: read /.well-known/agent-coin.json from a host, or emit your own.
export async function discover(host) {
  const base = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const r = await fetch(`https://${base}/.well-known/agent-coin.json`);
  if (!r.ok) throw new Error(`no AQB discovery at ${host}`);
  return r.json();
}

export function wellKnown({ token, registry, verifier, chainId = 8453, vault, pool, sale }) {
  return {
    aqb: 1, chainId, token, registry, verifier,
    vault: vault || token, pool, sale,
    pq: "ML-DSA-65", kem: "ML-KEM-768",
  };
}
