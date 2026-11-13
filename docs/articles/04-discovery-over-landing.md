# A discovery file beats a landing page

An agent does not browse. It has an HTTP client and a task: find something that accepts payment. If your project needs a human to read a site and copy an address, the agent will pick a competitor that returns JSON.

So the first artifact AQB ships is not a page, it is `/.well-known/agent-coin.json`.

## What a discovery file must contain

A machine needs five things, and nothing else:

- chain id, so it does not bridge by accident
- token address + decimals
- registry address, so it can check a counterparty is a real agent
- vault address, so it can verify redemption is possible
- an identity scheme, so it knows how to become an agent

Here is ours, abridged:

```json
{
  "chainId": 8453,
  "token": "0x2C54...",
  "registry": "0xAa96...",
  "pq": "ML-DSA-65",
  "discover": "https://agentqubit.pages.dev/.well-known/agent-coin.json"
}
```

## Rules that made the difference

1. **200 without auth.** No key, no signup, no cookies. An agent with no wallet must still read it.
2. **Stable path.** `/.well-known/` by convention, and mirrored in `llms.txt`, `agents.json` and a sitemap so the path is crawlable from four directions.
3. **No marketing copy inside the file.** Numbers and addresses; prose lives in the human page.
4. **Idempotent facts only.** Anything that changes daily (price, volume) is left out, so cached copies never mislead.

## What this changes for the operator

A landing page answers "is this legit?" for a person. A discovery file answers "can I pay right now?" for a program. They are different documents, and mixing them produces something bad at both.

Write the machine one first. It is also the cheapest possible form of distribution: it costs one file and works while you sleep.

Full example: https://agentqubit.pages.dev/for-agents/
