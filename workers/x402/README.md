# aqb-x402

A dependency-free Cloudflare Worker that sells agent resources for AQB on Base using a real HTTP 402 flow.

Live: https://aqb-x402.aqb-foundation.workers.dev

## Endpoints

| Route | Price | Description |
|---|---|---|
| `GET /` | free | service metadata |
| `GET /health` | free | liveness |
| `GET /stats` | free | on-chain supply, vault, pool, agents, PQ status |
| `GET /a2a/card` | 0.01 AQB | agent card / discovery payload |
| `GET /quote?amount=1` | 0.001 AQB | vault + Uniswap V2 quote |
| `GET /x402/pay` | 0.001 AQB | generic paid resource |

## Flow

1. Request a paid route without `X-AQB-Tx`.
2. The Worker replies `402 Payment Required` with:
   - `x-aqb-token`, `x-aqb-chain`, `x-aqb-price`, `x-aqb-payto`, `x-aqb-accept`, `x-aqb-resource`
   - a JSON `accepts` object with the same terms.
3. Transfer at least `x-aqb-price` AQB on Base to `x-aqb-payto`.
4. Retry the same route with `X-AQB-Tx: <txHash>`.
5. The Worker reads the transaction receipt, checks status, token address, `Transfer` topic, recipient, and amount, then returns the resource.

The payment tx is single-use across all paid routes. A Durable Object (`Replay`) records the hash; a second use returns `402` with `payment already used`.

## Proof

A real payment of `0.01 AQB` from a registered agent to the payee:

```
0x9a78d1e1d2e3ca06240f151f3b435b97eed56e4aa7b01e913aa2b98821d08a92
```

Local `wrangler dev` verification with this tx:

- first `GET /a2a/card` → `200 OK`
- second `GET /a2a/card` → `402 payment already used`
- `GET /stats` → `200` with live supply/vault/pool data

## Config

`wrangler.toml`:

- `AQB_CHAIN_ID=8453`
- `AQB_TOKEN=0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1`
- `AQB_REGISTRY=0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB`
- `AQB_PAYEE=0x9eA52810f31768b1886cba9eAf917F4152f53042`
- `AQB_POOL=0xF61Cb078f87425933741Dd7d02F5779c030dB1A6`
- `BASE_RPC=https://mainnet.base.org`
- Durable Object binding `REPLAY` → class `Replay`

The Worker holds **no private keys**. It only reads Base RPC and verifies receipts.

## Deploy

```bash
cd workers/x402
npx wrangler deploy
```

## Test

```bash
npx wrangler dev --local --port 8789
curl -i -H "X-AQB-Tx: 0x9a78d1e1d2e3ca06240f151f3b435b97eed56e4aa7b01e913aa2b98821d08a92" \
  http://127.0.0.1:8789/a2a/card
```

Note: some networks block `*.workers.dev`. The deployment is public; if you need a custom domain, add a Cloudflare zone and a Worker route.
