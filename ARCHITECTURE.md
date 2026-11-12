# Architecture

```mermaid
flowchart LR
  A[Snapshot and arguments] --> B[Bounded input and safety checks]
  B --> C[Subset analysis and checking]
  C --> D[Allowlisted report]
  C --> E[Conservative example]
  E --> F[Safe output directory]
```

The CLI coordinates input, analysis, rendering, and opt-in artifact writes. Runtime has no network access or subprocess use. Reports use fixed vocabulary; artifacts contain necessary identifiers. File checks and atomic renames reduce risk but do not make multi-file writes transactional.
