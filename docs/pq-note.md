
## 8 Implementation notes
8.1 `pq/pq.mjs` implements real FIPS-204 ML-DSA-65 and FIPS-203 ML-KEM-768 (noble primitives).
8.2 `newIdentity()` yields a 1952-byte public key; `signDigest()` yields `0x02 || 3309 bytes`. Both sizes are asserted in test/pq.mjs.
8.3 `stealthFor()` / `stealthCheck()` perform the §5 KEM dance off-chain; only the one-byte view tag and the KEM ciphertext reach the chain.
8.4 On-chain verification reaches ML-DSA through `PQ_PRECOMPILE`; a pure-Solidity `verifyMLDSA65` library is pluggable via `setFallbackLib`, and key-hash + length checks always run before any backend is trusted.
8.5 Base status: no ML-DSA precompile is live, but `0x02` works through the deployed `fallbackLib`: `MLDSAVerifier.verify()` → `MLDSA65Fallback` → skalenetwork/mldsa-solidity. Factory `0x9961a96B2F77B6D86d8a60607A90b3cAeECBe197`, verifier `0xa11eE20877a7618ff417f79A026186A9253C0b30`, adapter `0xeEbccD88DDb596860b33D0285294fF53cd83506B`. The founder key is registered (registerA/registerT); a `0x02` execute costs ~3.97M gas. The third-party verifier is unaudited; AQB checks key hash and lengths first. `0x01` remains the fallback.
