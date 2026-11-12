# JOONS MCP Schema Toolkit

Inspect a supported subset of tool schemas from one JOONS MCP Diff v1 snapshot without a live server or runtime dependencies. Node.js 20 or later is required. This repository is distributed through GitHub Releases, not npm publication.

```sh
node bin/joons-mcp-schema-toolkit.js validate --snapshot examples/snapshot.json --format json
node bin/joons-mcp-schema-toolkit.js lint --snapshot examples/snapshot.json
node bin/joons-mcp-schema-toolkit.js check --snapshot examples/snapshot.json --tool greet --arguments examples/arguments.json
node bin/joons-mcp-schema-toolkit.js example --snapshot examples/snapshot.json --tool greet --out example-output
node bin/joons-mcp-schema-toolkit.js subset --format json
node scripts/test.js
```

`validate` diagnoses schema keyword shapes, `lint` applies heuristics, and `check` evaluates one object under the supported subset. `example` tries one conservative candidate and creates a Mock Server fixture. It can fail even for a satisfiable schema. Review generated files before sharing: they contain the exact selected tool and required property identifiers. A fixture is a starting point, not a Contract Runner suite.

Example identifiers are refused if longer than 128 characters, if a run of 24 or more alphanumeric characters has a high digit density or insufficient recognizable word structure, or if credential detection flags them. Common short numeric tokens in names can be accepted. Encoded and fragmented credential checks are conservative and best effort; ordinary identifiers can be refused. See SECURITY.md for scan limits.

Unsupported keywords cause an incomplete result; acceptance is limited to the supported subset and is not full JSON Schema conformance. Boolean schemas are rejected. Reports omit input identifiers and values. Structural locators such as `<property-1>` are anonymized and are not directly resolvable JSON pointers. Tool ordinals follow sorted names and can change as the snapshot changes.

Probe checks a live server, Diff classifies changes between snapshots, Policy Gate applies a coarse shape rule, and Mock Server checks runtime arguments. They answer different questions and may disagree. This tool does not execute patterns, resolve references, assert formats, access the network, or prove server behavior. See [CLI](docs/CLI.md), [limitations](docs/LIMITATIONS.md), and [security](SECURITY.md).
