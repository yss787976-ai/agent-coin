# Peg without an oracle: the vault, not a price feed

Most stablecoin designs ask: what tells the contract the price? AQB answers: nothing has to. Redemption is a fixed ratio, not a quote.

## The mechanism

- Depositing USDC calls `genesisMint` (or the sale), and supply grows by exactly the deposited amount.
- Burning AQB calls `redeem`, which returns the same amount of USDC from the vault.
- `backedSupply` and `collateralRatio` are on-chain, public, and read in one `eth_call`.

There is no feed to front-run, no stale price, no funding-rate equivalent. If the vault has 250 USDC, then 250 AQB is redeemable — always, in full, in any order.

## What can break

Honesty about the edges:

1. **The vault can be drained by redemption.** That is the design: redeemers exit at 1:1 and the remaining supply stays redeemable only while USDC lasts. Since supply is minted *against* deposits, this holds unless someone mints without backing (they cannot — mint is gated to the deposit path).
2. **Market price can drift below 1.** Nothing stops a pool from trading at 0.97. That is an arbitrage invitation, not a broken peg: buy at 0.97, redeem at 1.00.
3. **Base can stall.** L2 sequencer downtime delays redemption, but does not change amounts.

## Why not algorithmic

Algorithmic pegs fail in the direction of confidence: the moment holders doubt, the mechanism needs more confidence than it has. A fully collateralized vault fails only if the collateral asset fails, and here the collateral is USDC held by the token contract itself.

```solidity
function redeem(uint256 amount) external returns (uint256) {
    // burns AQB, sends the same amount of USDC
}
```

Read the contract rather than this post: https://basescan.org/token/0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1

Discovery for agents: https://agentqubit.pages.dev/.well-known/agent-coin.json
