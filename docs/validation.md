# Validation plan

## 1. Decision correctness

Test valid and invalid choice indices, catalog reorder/version mismatch, low confidence, abstention, timeouts, missing results, and conflicting branch proposals. Compare the plan produced with and without a KV bank; it must be identical. Verify that permissions and user approvals cannot be bypassed by a decider result.

## 2. Prefix equivalence

For each candidate bank entry, compare the receiver's exact token IDs for a normal full prompt with the static prefix plus dynamic suffix after restore. Include changes to the model, tokenizer, template, tool schemas, instruction modules, reasoning settings, and runtime KV format. Every mismatch must cause a bank miss.

## 3. Worker safety

On an isolated worker, test concurrent conversations, slot exhaustion, cancellation during restore, corrupt or stale entries, worker restart, and fallback after a failed restore. No conversation may read another conversation's KV. Do not test slot mutation against a shared production worker.

## 4. Paired A/B performance

Use the same request set and receiver configuration for baseline full prefill and decision-selected receiver-native KV. Alternate request order and include warm-up. Record decision latency, lookup, slot wait, restore, end-to-end TTFT (p50/p95/p99), hit rate, fallback rate, decode tokens/s, and memory cost. Report both all-request and hit-only results; do not attribute a hit-only speedup to all traffic.

## 5. Semantic quality

Compare outputs under deterministic settings where possible, then evaluate task outcomes and tool plans. Investigate every unexplained divergence before claiming equivalence. A short byte-for-byte prefix match alone does not establish equal behavior on real tasks.

## 6. Rollout gate

Introduce the KV bank behind an opt-in flag with bounded memory and immediate rollback. Keep ordinary prefill as the default fallback. A real deployment requires representative workloads and end-to-end client testing; offline unit tests in this repository are only a starting point.
