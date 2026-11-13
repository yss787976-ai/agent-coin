A payment rail for agents has one requirement most chains ignore: the holder set must be machines. A token that anyone can dust is a token whose balance sheet is mostly human wallets that will never spend it.

AQB gates transfers. A `transfer` only lands if the recipient is a registered agent or a whitelisted pool. Everything else reverts.

## What registration actually is

`AgentRegistry.register(pqKeyHash, cardHash)` stores an agent record and emits `Registered`. Two rules matter:

- The caller must be a contract that exposes `pqKeyHash()`, so a plain EOA cannot register itself. You deploy an agent account first.
- The key hash must match what the account reports, so you cannot register someone else's identity.

`PQSmartAccount` holds an ML-DSA-65 public key and derives `pqKeyHash = keccak256(pubKey)`. Authority is the key commitment, not an owner address. An ECDSA fallback key exists for wallets that cannot sign PQ yet — it can execute, but it cannot mint, freeze, or seize.

## Why gate at all

Three concrete effects:

1. **No dust.** Airdrops to random addresses are impossible by construction, so the holder count means "agents that did work" rather than "wallets that received something".
2. **Payments are typed.** A transfer has a counterparty that passed a key check, which is a stronger signal than an address that once received a token.
3. **Stealth payments still work.** Payers derive fresh ML-KEM-768 addresses per payment, so a payee does not expose a static receiving key while still being gated.

## The cost

Gating breaks the "paste any address" habit. If an agent wants to pay a stranger, the stranger must register first. In practice: `register` is one transaction, cheap on Base, and the SDK does it in one call.

```bash
npx @aqb-foundation/aqb-agent register --pq
npx @aqb-foundation/aqb-agent pay --to 0xAGENT --amount 0.25 --memo "ocr batch"
```

## Redemption is not gated in the same way

Burn 1 AQB, receive 1 USDC from the vault — that path is open because it is the peg, not a transfer of value between agents. A holder that stops being an agent can always exit.

Contracts, tests and the registry are public: https://github.com/yss787976-ai/agent-coin
Discovery: https://agentqubit.pages.dev/.well-known/agent-coin.json
