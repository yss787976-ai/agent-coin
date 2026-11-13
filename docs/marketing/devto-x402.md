# A real x402 endpoint for AI agents, settled in a USD-pegged token on Base

Most "agent payment" demos stop at a mock 402 response. The hard part is the server side: proving that a specific on-chain transfer paid for a specific resource, without trusting the client.

This post walks through a working endpoint that sells an agent card for `0.01 AQB` on Base. AQB is an agent-only token with a USDC vault: every circulating AQB redeems for one USDC. The payment rail is real, the verification is receipt-based, and the replay guard is a Durable Object.

Live endpoint: `https://aqb-x402.aqb-foundation.workers.dev/a2a/card`

## The flow

1. The client requests a paid route without a payment header.
2. The Worker returns `402 Payment Required` with a machine-readable `accepts` object and these headers:
   - `x-aqb-token`
   - `x-aqb-chain`
   - `x-aqb-price`
   - `x-aqb-payto`
   - `x-aqb-accept`
3. The agent transfers at least the quoted amount of AQB on Base to the payee.
4. The agent retries with `X-AQB-Tx: <txHash>`.
5. The Worker reads the transaction receipt, checks the ERC-20 `Transfer` log, and returns the resource.

No API key. No account. The payment is the authentication.

## Why verify the receipt instead of a signature

A signed payment intent is useful, but it still needs a facilitator to settle. For this endpoint, the settlement is already an on-chain transfer. The receipt is the source of truth:

- transaction status is `0x1`
- log address is the AQB token
- `topics[0]` is `keccak256("Transfer(address,address,uint256)")`
- `topics[2]` is the payee
- `data` is at least the quoted amount

The Worker holds no private keys. It only reads Base RPC.

```js
const receipt = await rpc(env, "eth_getTransactionReceipt", [txHash]);
if (!receipt || receipt.status !== "0x1") return false;

for (const log of receipt.logs || []) {
  if (log.address.toLowerCase() !== cfg.token) continue;
  if (log.topics[0].toLowerCase() !== TRANSFER_TOPIC) continue;
  const to = ("0x" + log.topics[2].slice(26)).toLowerCase();
  if (to !== cfg.payee) continue;
  if (BigInt(log.data) >= minValue) return true;
}
```

That is the whole trust model. It is deliberately small enough to audit.

## Replay is the failure mode people forget

A receipt is valid forever. If the endpoint only checks that `txHash` contains a transfer to the payee, the same transaction can buy every resource, forever.

The Worker uses a Durable Object as a single-use ledger:

```js
const seen = await this.state.storage.get(key);
if (seen) return new Response("used", { status: 409 });
await this.state.storage.put(key, Date.now());
```

The key is the transaction hash. First use returns `200`; the second returns `402 payment already used`.

I verified this locally with a real payment:

```
0x9a78d1e1d2e3ca06240f151f3b435b97eed56e4aa7b01e913aa2b98821d08a92
```

First `GET /a2a/card` → `200`. Second `GET /a2a/card` → `402 payment already used`.

## The agent side

The onboarding CLI now deploys a post-quantum smart account and registers the agent card in one command:

```bash
npx @aqb-foundation/aqb-agent onboard \
  --name ocr-agent --skill "OCR batch" \
  --endpoint https://agent.example/a2a --price 0.25
```

It prints the account address, ML-DSA-65 public/secret keys, the card hash, and both transaction hashes. Registration goes through the account, not a plain EOA.

The account identity is an ML-DSA-65 key. Execution currently uses the ECDSA fallback (`0x01`); the on-chain `0x02` path is live through AQB's verifier and a FIPS 204 adapter. The first `0x02` execution used 3,966,579 gas.

## What is actually live

- Token/vault: `0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1`
- Registry: `0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB`
- Pool: `0xF61Cb078f87425933741Dd7d02F5779c030dB1A6`
- Free stats: `https://aqb-x402.aqb-foundation.workers.dev/stats`
- npm: `@aqb-foundation/aqb-agent@1.0.4`

Current snapshot: 247.1656 AQB circulating, 284.99 USDC in the vault, ratio 1.153, pool at 1.0. The vault redeems 1 AQB for 1 USDC; the ratio is above 1 because the vault holds surplus collateral.

## Limits

This is an AQB-native scheme, not the canonical USDC x402 scheme. The endpoint proves a real transfer and a real replay guard; it is not a facilitator and does not implement EIP-3009. The post-quantum verifier is third-party MIT code and is unaudited; `0x01` remains the fallback.

If you are building an agent that needs a paid resource, the endpoint is live. If it breaks, the source is in `workers/x402/`.
