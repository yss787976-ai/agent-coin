# n8n-nodes-aqb

n8n community node for **AQB**, an agent-only, USD-pegged credit token on Base. The node pays a registered AQB agent from a credential EOA or from an optional PQ smart account.

## Install

From the n8n UI: **Settings → Community nodes → Install** and enter `n8n-nodes-aqb`.

From a shell, inside the n8n installation:

```bash
npm install n8n-nodes-aqb
```

The package declares `n8n-workflow` as a peer dependency, so n8n supplies the workflow runtime. `ethers` and `@aqb-foundation/aqb-agent` are installed as package dependencies.

## Credentials

Create an **AQB API** credential:

| Field | Required | Description |
| --- | --- | --- |
| Private Key | Yes | `0x`-prefixed 32-byte key of the paying EOA or the owner of the PQ smart account |
| RPC URL | Yes | Base mainnet JSON-RPC endpoint; defaults to `https://mainnet.base.org` |

The key is stored as a password field. It must control AQB on Base and, for the EOA path, the EOA must hold the AQB being spent.

## Node operation

Add **AQB Pay** to a workflow and configure:

| Field | Required | Description |
| --- | --- | --- |
| Resource | Yes | `Payment` |
| Operation | Yes | `Pay Agent` |
| Recipient | Yes | Registered AQB agent address |
| Amount | Yes | Decimal AQB amount with up to 18 decimals, for example `0.25` |
| Account | No | PQ smart-account address. Empty pays directly from the credential EOA |

The node processes every input item. Each output item merges the input JSON with:

```json
{
  "success": true,
  "chainId": 8453,
  "to": "0x...",
  "amount": "0.25",
  "from": "0x...",
  "txHash": "0x..."
}
```

AQB transfers are restricted on-chain to registered agents. If the recipient is not registered, the transaction reverts; check membership with the AQB SDK or the `@aqb-foundation/agentkit-aqb` action provider before paying an unknown address.

The node is Base mainnet only (`chainId` `8453`). The AQB token address is `0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1` and the AgentRegistry is `0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB`.

## Build

The source is plain CommonJS, so the build copies node and credential sources into `dist/` and validates them with `node --check`. No TypeScript compiler is required.

```bash
npm install
npm run build
npm test
```

`npm run build` creates:

```text
dist/
  nodes/Aqb/Aqb.node.js
  nodes/Aqb/Aqb.node.json
  nodes/Aqb/aqb.svg
  credentials/AqbApi.credentials.js
```

`npm test` runs the build, loads the compiled node and credential with a stubbed `n8n-workflow`, checks the n8n manifest and codex, and syntax-checks every JavaScript file. It does not need a running n8n instance.

### Local development

```bash
npm install
npm run build
mkdir -p ~/.n8n/custom
ln -s "$PWD" ~/.n8n/custom/n8n-nodes-aqb
```

Restart n8n after linking. On Windows, use `mklink /D "%USERPROFILE%\.n8n\custom\n8n-nodes-aqb" "%CD%"` from an elevated Command Prompt. Alternatively, install the package into `~/.n8n/custom` with npm:

```bash
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
npm install /path/to/integrations/n8n-aqb
```

`tsconfig.json` is provided for editors and optional type checking of the CommonJS sources; the build does not depend on it.

## Package layout

- `nodes/Aqb/AqbPay.node.js` — source for the node; built as `dist/nodes/Aqb/Aqb.node.js`
- `nodes/Aqb/Aqb.node.json` — n8n codex
- `credentials/AqbApi.credentials.js` — credential type
- `build.mjs` — zero-dependency build and syntax check
- `test/package.test.mjs` — manifest, load, and syntax tests
