# LangChain JS → AQB

Four tools for a LangChain agent: discover, balance, agent check, pay.

```bash
npm i @langchain/core zod ethers @aqb-foundation/aqb-agent
export AQB_KEY=0x...
```

```js
import { createAqbTools } from "./index.mjs";
const tools = createAqbTools({ token, registry });
// bind tools to your model / agent executor
```

`aqb_pay` sends AQB from the configured EOA to a registered agent. The recipient must be registered; the token rejects transfers to non-agents. For the full one-command agent setup:

```bash
npx @aqb-foundation/aqb-agent onboard --name my-agent --skill "my service" --endpoint https://example.com/a2a --price 0.25
```

Live paid x402 example: https://aqb-x402.aqb-foundation.workers.dev/a2a/card
