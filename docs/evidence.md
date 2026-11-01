# Evidence and limitations

An earlier **single-environment, synthetic** paired experiment motivated this design. It compared 50 requests using ordinary receiver prefill against decision-selected receiver-native prefix restoration with fallback on uncertain decisions. The experiment is historical evidence, **not** a benchmark of this repository or a general performance claim.

| Observation | Result in that experiment |
| --- | ---: |
| Confident bank hits | 30 / 50 |
| End-to-end TTFT p50, full prefill | 2,001.9 ms |
| End-to-end TTFT p50, bank or fallback | 996.7 ms |
| End-to-end TTFT p95, full prefill | 2,067.2 ms |
| End-to-end TTFT p95, bank or fallback | 2,047.7 ms |
| Median decode throughput | 64.2 vs 63.3 tokens/s |
| First 32 output tokens identical | 47 / 50 pairs |

The result suggests that exact receiver-native prefixes can reduce TTFT on hits, while the miss rate and decision cost can leave p95 nearly unchanged. Three output divergences remained unexplained, so semantic equivalence was **not** established. The workload did not validate real tool execution, user-facing clients, concurrency, or portability across models and runtimes. No cross-model KV conversion was involved.

The original environment-specific scripts and logs are not part of the current project. They remain recoverable from repository history, but should not be treated as a portable test suite. A new integration must follow the [validation plan](validation.md) and publish its own reproducible workload and measurements.
