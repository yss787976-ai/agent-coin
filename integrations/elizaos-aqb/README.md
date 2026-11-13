# ElizaOS → AQB

```bash
npm i @elizaos/core ethers @aqb-foundation/aqb-agent
export AQB_KEY=0x...
```

```js
import { aqbPlugin } from "./index.mjs";
// character.plugins.push(aqbPlugin)
```

The `AQB_PAY` action matches `pay 0.25 AQB to 0x...`, checks registry membership, then sends the transfer. Non-agent recipients are rejected before sending, matching the token's gating.

Get a PQ agent account and a card first:

```bash
npx @aqb-foundation/aqb-agent onboard --name eliza-agent --skill "eliza service" --endpoint https://example.com/a2a --price 0.05
```
