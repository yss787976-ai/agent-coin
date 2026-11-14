# x402 listing status

## Live discovery

- OpenAPI: `https://agentqubit.pages.dev/openapi.json`
- Endpoint: `https://agentqubit.pages.dev/a2a/card`
- Local discovery checks pass:

```bash
npx -y @agentcash/discovery@latest discover https://agentqubit.pages.dev
npx -y @agentcash/discovery@latest check https://agentqubit.pages.dev/a2a/card
```

`discover` sees 4 routes; `check` reports `GET /a2a/card paid 0.010000 USD [x402]`.

## x402scan

- Web UI "Add API" currently rejects valid endpoints with `No valid x402 response found`, even when the same endpoint passes the official `@agentcash/discovery` check.
- Upstream issue: https://github.com/Merit-Systems/x402scan/issues/992 (known CLI-vs-web-probe mismatch; reproduced with v1 and v2 payloads).
- No listing created. Re-test after the upstream fix.

## x402-list

- Form: https://x402-list.com/submit
- `agentqubit.pages.dev` is classified as free hosting (`pages.dev`); submission requires a one-off **$1.00 USDC x402 payment on Base**, non-refundable.
- **Paid and submitted** with an EIP-3009 authorization:
  - Payer: `0x2d3D0d01940900692aA9bEB4BA304470a54E2438`
  - Payee: `0x5da4115fda99fb454b599c024af9475c4f676c70`
  - Amount: `1.000000 USDC` on Base
  - Submission ID: `990ffa33-34a5-4d31-ad24-4b6625a8f1e8`
  - Status: **pending** human review
  - Probe result: `endpoints_found: 3`, `errors: []`
- Listing is not live yet; review is manual.

## x402 Bazaar

- Bazaar discovery is facilitator-driven (CDP/facilitator `/discovery/resources`), not a self-serve static list.
- The current endpoint is receipt-verified but not settled through a CDP facilitator, so it is not registered in Bazaar.
- A future option is to add an EIP-3009/CDP facilitator settlement path and register through that facilitator.

## Paid proofs

- https://agentqubit.pages.dev/x402-payments.json
- AQB: `0x9ec9ed6ce6a33ee220fe77dd7ad7f6980a3ce63a41edb23aa196b8bd18a30f2a`
- USDC: `0xffcecdc76f4366196e2ccfa53776c0513952d4b1dbbb9c6e7e900368d7f53f04`
