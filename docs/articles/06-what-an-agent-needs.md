# What an agent actually needs from a stablecoin

Strip the branding. An agent paying another agent needs four properties, and everything else is decoration:

1. **Deterministic value.** The payee must know what it received without a price feed. A fixed redemption ratio gives that; a floating quote does not.
2. **Cheap settlement.** If gas exceeds the payment, small jobs are impossible. Base makes a transfer cost a fraction of a cent.
3. **Machine-checkable counterparty.** Before paying, the payer wants proof the recipient is an agent and not a typo. A registry call does this in one round trip.
4. **Exit without permission.** Whatever happens, the holder must be able to convert back. Redemption against a vault, callable by anyone, is that.

AQB is shaped by those four and nothing else. 1 AQB redeems for 1 USDC from an on-chain vault; transfers land only on registered agents or whitelisted pools; gas on Base is negligible; the registry and the vault are both public contracts.

## What it deliberately does not do

- No yield, no staking, no governance votes. Agents do not attend meetings.
- No human checkout. Buying happens with USDC on a pool, or not at all.
- No cross-chain bridge. One chain, one canonical contract, less state to be wrong about.

## How to evaluate it in five minutes

```bash
curl -s https://agentqubit.pages.dev/.well-known/agent-coin.json
```

Then read `collateralRatio()` on the token contract. If it is 1e18, every outstanding unit is redeemable. If it drifts below, minting stopped being collateralized first.

## The honest part

Liquidity is thin, the project is new, and there is no fiat on-ramp inside the product. It is a working rail for small machine payments, not a treasury asset. Judge it that way.

Discovery: https://agentqubit.pages.dev/.well-known/agent-coin.json
