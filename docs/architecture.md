# Architecture

## Problem

A decider can choose a tool set, a skill/instruction module, a reasoning mode, or another execution branch before a larger model answers. A conventional integration sends the choice to an orchestrator, which then builds a prompt and makes the receiver prefill the entire static prefix. For frequently repeated branches, that prefill is avoidable.

KV caches from different model families are generally not interchangeable. This design does **not** try to load the decider's KV tensors into the receiver. Instead, the decider's compact result selects a cache entry created by the receiver for an exact, reusable prefix. This is a no-training alternative to a learned KV mapper, with a narrower scope: it accelerates only prefixes that can be enumerated and verified.

## Components

| Component | Responsibility |
| --- | --- |
| `DecisionContext` | Minimal request features needed for routing; excludes credentials and private tool results. |
| `CatalogSnapshot` | Immutable ordered options and a digest binding indices to their meanings. |
| `DecisionEngine` | Produces a typed choice, boolean, or score with uncertainty where applicable. |
| `PolicyResolver` | Validates the decision, applies thresholds and permissions, and produces a `ReceiverPlan` or fallback. |
| `PrefixRenderer` | Renders and tokenizes the receiver's **exact static prefix** for the chosen plan. |
| `PrefixBank` | Finds immutable receiver-native KV entries by a compatibility key. |
| `SlotLease` | Owns a receiver worker slot throughout verification, restore, and continuation. |
| `Receiver` | Continues inference with the request suffix, or runs an ordinary full prefill. |

The `ReceiverPlan` is an internal typed value, for example `{ reasoningMode, toolSet, instructionModule }`. It is not a free-form decider message that the receiver must interpret. A permission check can remove or reject a proposed tool even when the decider is confident.

## Three handoff modes

1. **Control-plane handoff:** the policy applies the decision to model parameters, enabled tools, and prompt construction. No KV bank is needed. This is the required correctness baseline.
2. **In-band handoff:** the receiver sees a short rendered decision marker or instruction in its prompt. This costs some prefill and must use the receiver's normal tokenizer and chat template.
3. **Receiver-native KV selection:** the decision selects a precomputed static receiver prefix. The worker restores that prefix and prefills only the dynamic suffix. A bank miss degrades to mode 1 or 2, not to a failed request.

These modes are alternatives, not claims that a decider can directly alter the receiver's hidden state. A system may combine control-plane settings with a receiver-native cache entry, provided the cached prefix exactly reflects the same plan.

## Exact compatibility

A bank key must cover at least the receiver weights, tokenizer, chat template, runtime KV format/configuration, and the full ordered token-ID sequence of the static prefix. That sequence implicitly includes system instructions, tool schemas, instruction modules, special tokens, and branch-specific reasoning markers. The reference `makeBankKey` function models this rule with version digests and token IDs; a real implementation must also verify the entry's metadata and checksum before restore.

Matching a model name, a human-readable prompt, or a decision index is insufficient. Any change to a tool schema, template, model, quantization/runtime format, or prefix token invalidates the entry. Never concatenate independently produced KV states.

## Worker boundary

The worker must reserve a slot and perform `verify → restore → continue` as one task. Independent requests such as `erase`, `restore`, and `generate` against a shared live slot allow another conversation to interleave between steps. Cancellation releases the lease; errors trigger a clean full-prefill retry only when the request has not already produced user-visible output.

The bank contains static prefixes only. It must have a bounded memory budget, an explicit eviction policy, integrity checks, and no cross-user mutable state. A dynamic or rare branch can simply miss the bank.

## Critical path and measurement

The latency to optimize is measured from the **user request** to the first receiver token. It includes decider inference, catalog lookup, policy resolution, bank lookup, slot wait, restore, and receiver continuation. Decode throughput and semantic quality are separate metrics. A fast cache hit with a slow decider or a high miss rate may not improve end-to-end p95.

The transport between decider and receiver can be an in-process value, a compact binary frame, or another versioned protocol. Its format is secondary to preserving catalog identity, decision type, uncertainty, and fallback semantics. JSON is not required on the internal critical path.
