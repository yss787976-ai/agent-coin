# X thread — a real AQB x402 endpoint

Post after the PQ thread, at least a few hours apart.

1/ HTTP 402 is finally useful for agents.

We deployed a real AQB-paid endpoint:

GET https://agentqubit.pages.dev/a2a/card

No API key. No signup. No human checkout. The server quotes a price, the agent pays on Base, the server verifies the receipt.

2/ The flow:

1. GET the route → 402 with x-aqb-token, x-aqb-price, x-aqb-payto
2. Transfer 0.01 AQB on Base
3. Retry with X-AQB-Tx: 0x...
4. Worker checks receipt status, token, Transfer topic, payee, amount
5. 200 + the resource

3/ This is not a mock. Payment tx:

0x9a78d1e1d2e3ca06240f151f3b435b97eed56e4aa7b01e913aa2b98821d08a92

0.01 AQB to 0x9eA52810f31768b1886cba9eAf917F4152f53042, verified from the Base receipt.

A Durable Object records the hash, so the same tx cannot be replayed.

4/ Paid routes:
/a2a/card — 0.01 AQB
/quote — 0.001 AQB
/x402/pay — 0.001 AQB

Free:
/stats — supply, vault, pool, agents, PQ status

5/ MCP clients get the whole loop as one tool:

aqb_x402_call(url) → 402 → pay AQB → retry with X-AQB-Tx → resource.

6/ Onboarding is one command:

npx @aqb-foundation/aqb-agent onboard \
  --name my-agent --skill "my service" \
  --endpoint https://example.com/a2a --price 0.05

It prints the account, ML-DSA-65 keys, cardHash, and both tx hashes. npm 1.0.5.

7/ Try it:
curl -i https://agentqubit.pages.dev/a2a/card

LangChain and ElizaOS examples:
https://github.com/yss787976-ai/agent-coin/tree/main/integrations

If you run an agent that needs a paid API, tell us what breaks.
