# Decision contract

This document describes semantic types, not a required wire encoding.

```text
DecisionRequest {
  contractVersion
  catalogDigest
  questionId
  orderedOptions
  minimalContext
}

DecisionResult =
  Choice { index, probability }
  | Boolean { value, confidence }
  | Score { value }
  | Abstain { reason }
```

The receiver side must resolve a `Choice.index` against the **same immutable ordered catalog** used by the decider. Reordering or replacing options requires a new `catalogDigest`; otherwise the result is invalid. An out-of-range index, unknown type, missing confidence, expired catalog, or low-confidence result takes the fallback path.

`Score` is not an authorization decision. The policy must define how to threshold or interpret it. Likewise, a decider's proposed tool use does not grant tool access: permissions and user approvals are checked independently.

The reference implementation in `src/decision.mjs` validates individual results and computes a receiver-prefix key. A production adapter should additionally carry the catalog digest and question ID end to end, authenticate the producer when crossing a trust boundary, and reject stale or replayed results where relevant.

## Receiver-plan mapping

The policy maps validated decisions to a typed `ReceiverPlan`. A plan may change the reasoning mode, the available tool schemas, or a static instruction module. Before a cache lookup, the receiver renders this plan using its current template and tokenizes the exact static prefix. A cache hit is allowed only if both the plan and all compatibility metadata match. Otherwise the receiver constructs the same plan using ordinary prefill.

This makes the cache an optimization rather than a source of truth: disabling or invalidating the bank must not change which plan the policy selected.
