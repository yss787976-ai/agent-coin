# AQB x402 tools for Dify

Importable Dify custom-tool package for the live AQB x402 service on Base
mainnet. It exposes the paid agent card and the free protocol stats.

| File | Purpose |
|---|---|
| `openapi.yaml` | OpenAPI 3.0.3 schema imported by Dify as a Custom Tool |
| `provider.yaml` | Provider metadata: name, description, auth, tool entries |
| `README.md` | Import steps, payment flow and limitations |

Live server: `https://agentqubit.pages.dev`

`provider.yaml` is provider metadata for packaging and registry use. Dify's
Custom Tool importer consumes `openapi.yaml`; it does not read
`provider.yaml`.

## Tools

| Dify tool | Operation | Path | Price |
|---|---|---|---|
| `get_agent_card` | `getAgentCard` | `GET /a2a/card` | 0.01 AQB, or 0.01 USDC |
| `get_stats` | `getStats` | `GET /stats` | Free |

`get_agent_card` returns the AQB agent card after the x402 payment is
verified. `get_stats` returns supply, vault backing, pool reserves, collateral
ratio, agent count and post-quantum parameters.

## Import into Dify

1. Open Dify and go to **Tools → Custom → Create Custom Tool**.
2. Set the tool name to `aqb-x402` and the display name to `AQB x402`.
3. In the schema field, paste the full contents of `openapi.yaml`. If the file
   is hosted at a public raw URL, use Dify's schema URL import instead.
4. Set **Authentication** to **None**. The API has no key, bearer token or
   OAuth flow.
5. Save. Dify should list two operations: `get_agent_card` and `get_stats`.
6. Add the tool to an Agent, Chatflow or Workflow, then run `get_stats` first
   to confirm outbound access to `https://agentqubit.pages.dev`.
7. For `get_agent_card`, provide the `X-AQB-Tx` header parameter after paying
   the 402 challenge, or route the call through a payer/proxy as described
   below.

If your Dify version labels the menu differently, the required settings are
the same: Custom Tool, OpenAPI schema, Authentication = None.

## x402 payment flow

An unpaid `GET /a2a/card` returns HTTP 402 with this shape:

```json
{
  "error": "payment required",
  "resource": "/a2a/card",
  "accepts": [
    {
      "scheme": "aqb",
      "network": "base",
      "chainId": 8453,
      "asset": "0x2c54f202b565086b6d8d2226edb67ac3e14c39d1",
      "payTo": "0x9ea52810f31768b1886cba9eaf917f4152f53042",
      "maxAmountRequired": "10000000000000000",
      "unit": "AQB",
      "instructions": "Transfer at least 0.01 AQB to 0x9ea52810f31768b1886cba9eaf917f4152f53042 on Base, then retry with X-AQB-Tx: <txHash>."
    },
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "asset": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "payTo": "0x9ea52810f31768b1886cba9eaf917f4152f53042",
      "maxAmountRequired": "10000",
      "unit": "USDC",
      "instructions": "Transfer at least 0.01 USDC to 0x9ea52810f31768b1886cba9eaf917f4152f53042 on Base, then retry with X-PAYMENT (base64 JSON containing payload.txHash)."
    }
  ],
  "discovery": "https://agentqubit.pages.dev/.well-known/agent-coin.json"
}
```

The 402 response also carries `x-aqb-token`, `x-aqb-chain`, `x-aqb-price`,
`x-aqb-payto`, `x-aqb-accept`, `x-aqb-usdc-price` and `x-aqb-resource`.

AQB rail:

1. Read `payTo`, `maxAmountRequired` and `asset` from the 402 body.
2. Transfer at least that amount of AQB on Base.
3. Retry the same request with `X-AQB-Tx: <txHash>`.
4. The Worker verifies the receipt (status, token, Transfer event, recipient,
   amount) and returns the card with `x-aqb-paid: <txHash>`.

USDC rail: transfer the quoted USDC, then retry with `X-PAYMENT` containing a
base64-encoded JSON object with `payload.txHash`. Success returns
`x-payment-response`.

Each transaction hash is single-use across all paid routes. Reuse returns
HTTP 402 with `payment already used`. The 402 body is authoritative at call
time; the amounts in `openapi.yaml` are the current published terms.

## Limitations

- **Dify does not implement x402.** It will not build the transaction, sign it,
  wait for the receipt or retry automatically. A paid call returns the 402
  response inside Dify unless the app supplies a valid `X-AQB-Tx` (or
  `X-PAYMENT`) header.
- Dify custom tools may not expose 402 response headers to later workflow
  nodes. The payment terms are duplicated in the JSON body so they remain
  readable.
- The caller needs AQB on Base plus Base ETH for gas. The USDC rail needs USDC
  plus Base ETH for gas. No private key belongs in Dify.
- `get_stats` is free and works without any payment setup. It falls back to a
  published snapshot if the live Base RPC read fails and marks that response
  with `x-aqb-stats: snapshot`.
- A successful payment cannot be replayed. Do not cache and reuse an
  `X-AQB-Tx` value across tool calls.
- Dify Cloud or the self-hosted instance must be allowed to reach
  `https://agentqubit.pages.dev` over HTTPS.

### Paid calls from Dify

Use one of these patterns:

1. **External payer, Dify retries with the header.** An agent or backend pays
   the 402 challenge, obtains a transaction hash, and passes it to the Dify
   tool call as `X-AQB-Tx`. This requires the Dify tool UI or API to expose
   header parameters.
2. **Local paying proxy.** Run a proxy that implements the 402 flow with the
   AQB SDK or the MCP tool `aqb_x402_call`, then point the `servers` URL in
   `openapi.yaml` at the proxy. Dify calls the proxy without payment headers;
   the proxy pays upstream and returns the 200 card. The MCP payer is:

   ```bash
   npx -y @aqb-foundation/aqb-agent mcp
   ```

   Its `aqb_x402_call` tool performs the complete GET → 402 → pay AQB → retry
   flow. It needs `AQB_KEY` in the MCP server environment.

## Verify without Dify

Free stats:

```bash
curl -sS https://agentqubit.pages.dev/stats
```

Payment challenge:

```bash
curl -sS -i https://agentqubit.pages.dev/a2a/card
```

Expect `HTTP/1.1 402 Payment Required`, the `x-aqb-*` headers and an
`accepts[]` body with the AQB and USDC rails.

Paid retry, after transferring 0.01 AQB on Base and setting `AQB_TX` to the
transfer hash:

```bash
curl -sS -i -H "X-AQB-Tx: $AQB_TX" https://agentqubit.pages.dev/a2a/card
```

Expect `200 OK`, the agent-card JSON and `x-aqb-paid`.
