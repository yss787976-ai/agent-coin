// Real FIPS-204 ML-DSA-65 signatures + FIPS-203 ML-KEM-768 key encapsulation.
// Noble is audited and constant-time; this module is the only crypto an AQB agent needs.
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { randomBytes } from "node:crypto";
import { keccak256, solidityPacked } from "ethers";

export const PK_LEN = 1952;
export const SIG_LEN = 3309;

/// Agent identity. Keep `secretKey` local; only `publicKey` is published.
export function newIdentity(seed = randomBytes(32)) {
  const { publicKey, secretKey } = ml_dsa65.keygen(seed);
  return { publicKey, secretKey, keyHash: keccak256(publicKey) };
}

/// Sign a 32-byte account digest → 0x02-tagged blob accepted by PQSmartAccount.
export function signDigest(identity, digest) {
  const d = digest.startsWith?.("0x") ? hexToBytes(digest) : digest;
  const sig = ml_dsa65.sign(new Uint8Array(d), identity.secretKey);
  if (sig.length !== SIG_LEN) throw new Error("bad sig length");
  return "0x02" + Buffer.from(sig).toString("hex");
}

export function verifyDigest(publicKey, digest, sigBlob) {
  const d = hexToBytes(digest);
  const sig = hexToBytes(sigBlob.startsWith("0x02") ? "0x" + sigBlob.slice(4) : sigBlob);
  return ml_dsa65.verify(sig, new Uint8Array(d), publicKey);
}

/// Stealth: encapsulate to the recipient's KEM key, derive the address + view tag.
/// Only the recipient, holding the KEM secret, can find and spend it.
export function newKemIdentity(seed = randomBytes(64)) {
  const { publicKey, secretKey } = ml_kem768.keygen(seed);
  return { publicKey, secretKey };
}

export function stealthFor(recipientKemPubKey) {
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(recipientKemPubKey);
  const h = keccak256(solidityPacked(["bytes32", "bytes"], [sharedSecret, cipherText]));
  return {
    ephPubKey: cipherText,          // ML-KEM ciphertext, published on chain
    viewTag: "0x" + h.slice(2, 4),  // 1-byte filter for the recipient
    addr: ("0x" + h.slice(26)).toLowerCase(),
    sharedSecret,
  };
}

export function stealthCheck(kemIdentity, ephPubKey, viewTag, addr) {
  const ss = ml_kem768.decapsulate(ephPubKey, kemIdentity.secretKey);
  const h = keccak256(solidityPacked(["bytes32", "bytes"], [ss, ephPubKey]));
  if (h.slice(2, 4) !== viewTag.slice(2, 4)) return null;
  const derived = ("0x" + h.slice(26)).toLowerCase();
  return derived === addr.toLowerCase() ? ss : null;
}

function hexToBytes(h) {
  return Buffer.from(h.replace(/^0x/, ""), "hex");
}
