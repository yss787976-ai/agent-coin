# @aqb-foundation/agentkit-aqb

Coinbase AgentKit action provider for **AQB**, an agent-only, USD-pegged credit token on Base. It gives an AgentKit agent three actions:

| Action | Inputs | Result |
| --- | --- | --- |
| `aqb_pay` | `to`, `amount` | Sends AQB and returns the transaction hash |
| `aqb_balance` | `address` | Returns AQB and USDC balances on Base |
| `aqb_is_agent` | `address` | Checks AgentRegistry membership |

The provider reports support only for Base mainnet (`chainId` `8453`). AQB transfers are restricted on-chain to addresses registered in the AQB AgentRegistry, so call `aqb_is_agent` before paying an unknown recipient.

## Install

```bash
npm install @coinbase/agentkit @aqb-foundation/agentkit-aqb
```

`zod` and `@aqb-foundation/aqb-agent` are regular dependencies. `@coinbase/agentkit` is a peer dependency and must be installed by the host application.

Node.js 20 or newer is required.

## Usage

```ts
import { AgentKit } from "@coinbase/agentkit";
import { aqbActionProvider } from "@aqb-foundation/agentkit-aqb";

// walletProvider is any AgentKit wallet provider configured for Base.
const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    aqbActionProvider({
      privateKey: process.env.AQB_PRIVATE_KEY,
      rpc: process.env.BASE_RPC_URL,
    }),
  ],
});

const actions = agentKit.getActions();
```

The provider can also be constructed directly:

```ts
import { AqbActionProvider } from "@aqb-foundation/agentkit-aqb";

const provider = new AqbActionProvider({ privateKey: process.env.AQB_PRIVATE_KEY });
```

### Configuration

| Option | Default | Purpose |
| --- | --- | --- |
| `privateKey` | `AQB_PRIVATE_KEY` | Payer key used by `aqb_pay` |
| `rpc` | `https://mainnet.base.org` | Base JSON-RPC endpoint |
| `token` | `0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1` | AQB token override |
| `registry` | `0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB` | AgentRegistry override |

Read actions work without a key. `aqb_pay` throws a clear error when neither `privateKey` nor `AQB_PRIVATE_KEY` is set. The key is never read from the AgentKit wallet provider; provide it explicitly or through the environment.

All amounts are decimal AQB strings with up to 18 decimals, for example `0.25`.

### Action output

Each action returns a JSON string. Examples:

```json
{"action":"aqb_pay","chainId":8453,"to":"0x...","amount":"0.25","txHash":"0x..."}
{"action":"aqb_balance","chainId":8453,"address":"0x...","aqb":"12.5","aqbWei":"12500000000000000000","usdc":"12.5","usdcMicros":"12500000"}
{"action":"aqb_is_agent","chainId":8453,"address":"0x...","isAgent":true}
```

## Build and test

```bash
npm install
npm run build   # tsc -> dist
npm test        # manifest, source, and compiled-output checks
```

`dist/` is included in the published package, so consumers do not need to build it. `npm test` does not import the peer dependency; it verifies the manifest, the ActionProvider source, and runs `node --check` on the compiled ESM files.

## Addresses

Base mainnet:

- AQB token: `0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1`
- AgentRegistry: `0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB`
- Discovery: <https://agentqubit.pages.dev/.well-known/agent-coin.json>
- SDK: <https://www.npmjs.com/package/@aqb-foundation/aqb-agent>
