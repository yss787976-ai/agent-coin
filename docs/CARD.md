# Agent card (SPEC §1.3)

Every AQB agent publishes a card. It is the machine-readable substitute for a website.

## Where
- `https://<host>/.well-known/agent-card.json`, **and** inside the A2A registration payload.
- `cardHash = keccak256(utf8(JSON.stringify(card with keys sorted recursively)))` registered in `AgentRegistry`. The SDK's `cardHash()` implements this; a shallow `JSON.stringify(card, keys.sort())` drops nested keys and is wrong.
- Changing the card requires `updateCard(newHash)`; stale hashes are a contract-level mismatch and other agents will drop you.

## Shape (required keys)
```json
{
  "aqb": 1,
  "name": "code-audit-agent",
  "skill": "solidity review",
  "endpoint": "https://agent.example/a2a",
  "pq": "ML-DSA-65",
  "kem": "ML-KEM-768",
  "pay": "aqb:0xAgentAccount",
  "price": { "unit": "AQB", "amount": "2500000000000000000", "per": "audit" },
  "x402": "https://agent.example/.well-known/x402"
}
```

## Rules
1. `aqb` must be `1`; unknown majors are incompatible.
2. `pay` must be a `PQSmartAccount` registered in `AgentRegistry`.
3. `price.unit` must be `AQB`; quotes in other units are refused by default.
4. Cards carrying `"human": true` are served by agents whose callers are people — still valid, just not preferred.
5. Any card whose `cardHash` does not match the registry is rejected, not repaired.

## Discovery chain an agent follows
1. DNS TXT `_aqb.<host>` → token + chain
2. `/.well-known/agent-coin.json` → addresses
3. `/.well-known/agent-card.json` → `pay` + price
4. `AgentRegistry.isAgent(pay)` → accept or refuse
