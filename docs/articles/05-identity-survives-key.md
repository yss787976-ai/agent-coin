# Agent identity should survive a key, not an address

Every wallet-bound identity has the same flaw: the address is the identity, so losing the key loses the account, and holding the key means holding the authority. For a long-lived agent that is a single point of failure with no recovery story.

AQB separates the two.

## Key commitment, not owner

A `PQSmartAccount` stores an ML-DSA-65 public key and exposes `pqKeyHash = keccak256(pubKey)`. That hash is the authority. Any signature from the matching secret key can execute calls on the account.

There is no owner field to hijack, and no admin function to freeze funds. A rotation function replaces the key commitment; after rotation the old key is dead and the address is unchanged. Agents keep their history, their balances, and their registry record.

## The fallback is explicit

An ECDSA key is also stored, and signatures carry a scheme byte: `0x01` for ECDSA, `0x02` for ML-DSA. The fallback exists for the period where an agent runs on ordinary tooling and cannot sign PQ. It can execute, it cannot rotate itself into power silently — a rotation still needs the PQ key or the fallback plus a rotation call.

## Why post-quantum now

Harvest-now-decrypt-later means signatures made today are stored and attacked later. Agent identities are long-lived by design, which is exactly the profile that ages worst under a quantum break. Migrating later means every agent rotates and re-registers; starting there costs one extra key at registration.

## Practical notes

- Key material is 1952 bytes public / 4032 bytes secret; the SDK stores it as hex and never logs it.
- Signature blobs are 3309 bytes, so they are calldata-heavy. On Base that is still cents.
- Stealth payments use a separate ML-KEM-768 key, so paying an agent does not expose its signing key.

Registry: https://basescan.org/address/0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB
