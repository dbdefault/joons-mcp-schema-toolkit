# JOONS MCP Schema Toolkit

Inspect the input schemas of MCP (Model Context Protocol) tools **offline**, from a saved snapshot, without starting a server.

- `validate` – are the schema keywords well-formed?
- `lint` – heuristic warnings (missing descriptions, loose objects, …)
- `check` – does one argument object satisfy a tool's schema?
- `example` – generate one conservative example argument and a Mock Server fixture
- `subset` – print exactly which JSON Schema keywords are supported

Zero runtime dependencies. Node.js 20 or later. Status: **0.1.0 preview**.

## Why

MCP clients send arguments that must match each tool's `inputSchema`. When a schema is malformed or too loose, the failure usually shows up late – inside an agent run. This toolkit lets you catch those problems in CI or on your laptop, from a JSON snapshot, with no network access.

## Install

The package is distributed through [GitHub Releases](https://github.com/dbdefault/joons-mcp-schema-toolkit/releases), not npm.

```sh
git clone https://github.com/dbdefault/joons-mcp-schema-toolkit
cd joons-mcp-schema-toolkit
node bin/joons-mcp-schema-toolkit.js --help
```

## Quick start

The repository ships a small snapshot in `examples/`.

```sh
node bin/joons-mcp-schema-toolkit.js validate --snapshot examples/snapshot.json
```

```text
Format: joons-mcp-schema-toolkit/report; schema version: 1
Tool: joons-mcp-schema-toolkit 0.1.0
validate: valid
Tools: 1; schemas: 1; invalid: 0; incomplete: 0; findings: 0
Example written: false
tool-1 input: valid
```

More commands:

```sh
# Heuristic lint
node bin/joons-mcp-schema-toolkit.js lint --snapshot examples/snapshot.json

# Check one argument object against the "greet" tool
node bin/joons-mcp-schema-toolkit.js check --snapshot examples/snapshot.json \
  --tool greet --arguments examples/arguments.json

# Generate an example argument and a Mock Server fixture
node bin/joons-mcp-schema-toolkit.js example --snapshot examples/snapshot.json \
  --tool greet --out example-output

# Machine-readable output for CI
node bin/joons-mcp-schema-toolkit.js validate --snapshot examples/snapshot.json --format json
```

Input is a JOONS MCP Diff v1 snapshot (a JSON list of tools with their schemas). See [examples/README.md](examples/README.md) and [docs/CLI.md](docs/CLI.md) for every option and exit code.

## Supported schema subset

| Group | Keywords |
|---|---|
| Supported (15) | `type`, `properties`, `required`, `additionalProperties`, `items`, `enum`, `const`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `minLength`, `maxLength`, `minItems`, `maxItems` |
| Annotations (4) | `title`, `description`, `default`, `examples` |
| Unsupported (13) | `$ref`, `$defs`, `$id`, `$schema`, `allOf`, `anyOf`, `oneOf`, `not`, `format`, `pattern`, `patternProperties`, `multipleOf`, `uniqueItems` |

A schema that uses an unsupported keyword gets an **incomplete** result instead of a false "valid".

## Limitations

- Not full JSON Schema (Draft 2020-12) validation and not a satisfiability checker.
- No pattern execution, no `$ref` resolution, no format assertion; boolean schemas are rejected.
- `example` tries one deterministic candidate; a valid schema may still produce no example.
- Reports anonymize identifiers (`<property-1>`), so locators are not directly resolvable JSON pointers.
- Generated fixtures contain the selected tool and required property names – review before sharing.

Details: [docs/LIMITATIONS.md](docs/LIMITATIONS.md) and [SECURITY.md](SECURITY.md).

## Related JOONS tools

| Tool | Question it answers |
|---|---|
| [joons-mcp-probe](https://github.com/dbdefault/joons-mcp-probe) | Does a live server respond correctly? |
| [joons-mcp-diff](https://github.com/dbdefault/joons-mcp-diff) | What changed between two snapshots? |
| [joons-mcp-policy-gate](https://github.com/dbdefault/joons-mcp-policy-gate) | Does a contract follow coarse policy rules? |
| [joons-mcp-mock-server](https://github.com/dbdefault/joons-mcp-mock-server) | Do runtime arguments match at call time? |

These tools answer different questions and may disagree.

## Development

```sh
node scripts/test.js   # 131 tests, no dependencies
```

CI runs the suite on Ubuntu, Windows and macOS with Node.js 20, 22 and 24. See [CONTRIBUTING.md](CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## License

[Apache-2.0](LICENSE)
