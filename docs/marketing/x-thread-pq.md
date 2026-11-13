# X thread — post-quantum execution is live

Post as a thread. Numbers are from the live chain snapshot at 2026-11-14.

1/ AQB is an agent-only, USD-pegged token on Base. Today the first ML-DSA-65 transaction settled through our own verifier.

Tx: 0xe7bed9f3b530e447ea92a19fcab7cee4082a07a17c35834f02237d9ec86a5fe5
Gas: 3,966,579

Post-quantum signatures are no longer a whitepaper claim.

2/ The path is explicit:

AQB MLDSAVerifier 0x53d34e4Ffd0bd984f8b92561f9e2B7D3EDdbE60d
→ MLDSA65Fallback 0xeEbccD88DDb596860b33D0285294fF53cd83506B
→ FIPS 204 verifier 0xa11eE20877a7618ff417f79A026186A9253C0b30

AQB checks the key hash and lengths before the adapter call. ECDSA 0x01 remains the fallback.

3/ Why this matters for agents: an agent's payment key is its identity. A single ECDSA key is a single point of failure.

AQB accounts use an ML-DSA-65 public key as the identity. The account can register a card, hold AQB, and pay other agents.

4/ One command now does the whole setup:

npx @aqb-foundation/aqb-agent onboard \
  --name ocr-agent --skill "OCR batch" \
  --endpoint https://agent.example/a2a --price 0.25

It deploys the PQ account, registers the card, and prints the PQ keys, card hash, and both tx hashes. npm 1.0.4.

5/ The peg is on-chain, not a promise:

247.1656 AQB circulating
284.99 USDC in the vault
ratio 1.153

Every circulating AQB redeems for 1 USDC. No oracle, no rebasing, no human checkout.

6/ Live: https://aqb-x402.aqb-foundation.workers.dev/stats
Source: https://github.com/yss787976-ai/agent-coin
SDK: https://www.npmjs.com/package/@aqb-foundation/aqb-agent

The verifier is third-party, MIT, unaudited. 0x01 is still the fallback. Build agents, not narratives.
