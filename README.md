# kv-decider

`kv-decider` is a model-agnostic design for handing a small model's decisions to a larger **receiver model** before the receiver finishes prefill. The objective is to reduce time to first token (TTFT) without giving the decider control over tool permissions or requiring a learned cross-model KV converter.

The key distinction is simple: **transfer the decision, not the decider's KV cache**. A decision can select a receiver-native prefix whose KV cache was produced earlier by the receiver model itself. If no compatible cache entry exists, the same decision still works through ordinary prefill.

```text
request + versioned choices
         │
         ▼
      decider ──► typed decision ──► policy ──► receiver plan
                                                 │
                              exact receiver-native KV hit?
                                 yes │              │ no
                                     ▼              ▼
                              restore prefix    normal prefill
                                     └──────┬───────┘
                                            ▼
                                  receiver continues
```

## What this repository contains

- [Architecture](docs/architecture.md): components, handoff modes, cache compatibility, and failure behavior.
- [Decision contract](docs/decision-contract.md): typed results and catalog-version requirements.
- [Validation plan](docs/validation.md): correctness, concurrency, and latency gates for a real integration.
- [Evidence and limitations](docs/evidence.md): a narrowly scoped, anonymized earlier experiment; not a benchmark of this library.
- `src/decision.mjs`: small, dependency-free reference functions for decision resolution and receiver-prefix keys.
- `test/decision.test.mjs`: offline unit tests. They do not connect to a model server or change any inference slots.

## Quick start

Node.js 20 or newer is required. No installation step or external dependency is needed.

```sh
npm test
npm run example
```

The repository is an **architecture and reference-contract project**, not a drop-in inference server, a trained KV mapper, or a claim of production-ready cache restoration. The example uses fabricated decisions and version digests; it does not call an inference service. The project is not tied to a particular model family, runtime, network transport, UI, tool catalog, or deployment.

## Core invariants

1. A low-confidence or invalid decision falls back safely; it never silently becomes the first option.
2. The receiver's KV entry is used only after an exact compatibility check on model/runtime versions and token IDs of the static prefix.
3. User content, credentials, tool results, and another conversation's state are never stored in a shared prefix bank.
4. Restore and continuation must hold one exclusive worker-slot lease. A sequence of independent public slot operations is not atomic.
5. Tool permissions and user approvals remain outside the decider.

See [the validation plan](docs/validation.md) before adapting the approach to a live system.
