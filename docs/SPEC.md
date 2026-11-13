# AQB — normative spec (v1)

Machine-first. Section numbers are stable; agents may cite them.

## 1 Identity
1.1 An *agent* is an address registered in `AgentRegistry` with `active == true`.
1.2 Registration requires the caller to be a `PQSmartAccount` whose `pqKeyHash()` equals the announced key hash, plus a non-zero `cardHash` (keccak256 of the agent card).
1.3 The agent card is a JSON object served by the agent itself:
```json
{ "aqb": 1, "name": "…", "skill": "…", "endpoint": "https://…", "pq": "ML-DSA-65", "kem": "ML-KEM-768", "pay": "aqb:0x…" }
```
1.4 `cardHash = keccak256(utf8(JSON.stringify(card with keys sorted recursively)))`; a changed card must be re-published via `updateCard`. Nested objects are sorted too, so the commitment covers `price` and every other nested field.

## 2 Peg
2.1 `mint(usd)` — pulls `usd` USDC (6dp) from a registered agent, mints `usd * 1e12` AQB (18dp).
2.2 `redeem(aqb)` — burns `aqb`, which must be a multiple of `1e12`, pays `aqb / 1e12` USDC.
2.3 No fee, no spread, no oracle. Deposited USDC is the sole backing.
2.4 `MAX_SUPPLY = 900e9 * 1e18`. Mint reverts with `CapExceeded` at the cap.

## 2b Genesis allotment
2b.1 genesisMint(to, amount) — governor, once. Sets genesisSupply and genesisUnsold.
2b.2 GenesisSale.buy(usd) — 1 USDC -> 1 AQB from the allotment; dollars go to the vault via depositBacking; noteSold shrinks genesisUnsold.
2b.3 Public mint reverts SaleStillOpen until the sale closes (exhausted, or closeSale by governor/Sale).
2b.4 backedSupply() = totalSupply - genesisUnsold; collateralRatio() divides by it.
2b.5 `backedSupply()` is only a true circulating measure when genesis coins leave the founder wallet exclusively through `GenesisSale.buy`. A direct transfer from the founder wallet to a pool or agent creates circulating coins that are still counted in `genesisUnsold`. The operational invariant is `vaultUSDC * 1e12 == totalSupply - founderBalance - saleBalance` (see `scripts/state-full.mjs`). The founder wallet must not redeem its own allotment.

## 3 Transfers
3.1 A transfer succeeds only if the recipient is a registered agent or a governor-whitelisted `pool`.
3.2 So venues must be whitelisted before listing; retail addresses cannot receive AQB directly.

## 4 Signatures
4.1 Account identity is an ML-DSA-65 key commitment. PQ signature blobs are `0x02 || sig(3309)`.
4.2 `0x01 || r || s || v` is the ECDSA fallback. `0x02` is live on Base through `MLDSAVerifier.fallbackLib` → `MLDSA65Fallback` → skalenetwork/mldsa-solidity (FIPS 204, MIT, unaudited): factory `0x9961a96B2F77B6D86d8a60607A90b3cAeECBe197`, verifier `0xa11eE20877a7618ff417f79A026186A9253C0b30`, adapter `0xeEbccD88DDb596860b33D0285294fF53cd83506B`. A registered key costs ~3.97M gas per `execute`; an unregistered key takes the full path (~9.15M). `0x01` remains the fallback.
4.3 Signed digest: `keccak256(abi.encode(chainId, account, nonce, target, value, keccak256(data)))`; nonce increments per execution.
4.4 Verification runs through `IPQVerifier`; ML-DSA-65 pk len 1952, sig len 3309. `MLDSAVerifier` always checks key hash and lengths, then tries the precompile and the deployed `fallbackLib`.

## 5 Privacy
5.1 `announce(stealth, ephPubKey, viewTag, metadataHash)`, agents only.
5.2 `viewTag = first byte of keccak256(sharedSecret || ephPubKey)`.
5.3 Amounts stay public; payer identity is the stealth address.

## 6 Discovery (all required)
6.1 `https://<host>/.well-known/agent-coin.json` — `{"aqb":1,"chainId":8453,"token":"0x…","registry":"0x…","verifier":"0x…","pq":"ML-DSA-65"}`
6.2 DNS TXT `_aqb.<host>` = `v=aqb1;token=0x…;chain=8453`
6.3 Card key `"aqb"` present in the A2A agent card.
6.4 `llms.txt` entry on the host root.
6.5 Chain ids: 8453 Base · 84532 Base Sepolia.

## 7 Non-goals
No admin freeze. No rebase. No governance vote on price. No human UI requirement.
