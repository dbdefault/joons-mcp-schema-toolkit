# CLI

```text
joons-mcp-schema-toolkit validate --snapshot FILE [--format terminal|json|markdown] [--strict]
joons-mcp-schema-toolkit lint --snapshot FILE [--format terminal|json|markdown] [--strict]
joons-mcp-schema-toolkit check --snapshot FILE --tool NAME --arguments FILE [--format terminal|json|markdown] [--strict]
joons-mcp-schema-toolkit example --snapshot FILE --tool NAME --out DIR [--force] [--format terminal|json|markdown] [--strict]
joons-mcp-schema-toolkit subset [--format terminal|json|markdown]
joons-mcp-schema-toolkit --help | --version
```

Options accept `--key=value` or `--key value`. There are no positionals, aliases, stdin, globs, configuration or `--` terminator. Duplicate, unknown, inappropriate or empty options are usage errors. Default format is terminal. Tool names are exact and case-sensitive. Reports go to stdout and fixed error kinds to stderr. Input failures do not produce reports. Input commands accept `--strict`; because every rejection already exits 2, it does not change this release's rejection threshold.

| Exit | Meaning |
| --- | --- |
| 0 | Clean result |
| 2 | Input or analysis rejection, including findings and unavailable examples |
| 3 | Usage error |
| 4 | Output or stdout failure |

Usage is checked first; output failures override an analysis rejection if reporting fails. Stderr errors have the form `joons-mcp-schema-toolkit: <kind>` and a newline. Kinds are `input_unreadable`, `invalid_json`, `invalid_snapshot`, `limit_exceeded`, `tool_not_found`, `schema_invalid`, `unsupported_keyword`, `instance_invalid`, `lint_findings`, `example_unavailable`, `output_error`, and `usage_error`.

The JSON report has ordered fields `format`, `schemaVersion`, `tool`, `command`, `status`, `summary`, `results`, and `exampleWritten`. Status is `valid`, `invalid`, `incomplete`, or `unavailable`. Locators are anonymized structural positions, not directly resolvable JSON pointers. `tool-1` and property ordinals are based on sorted names; item indices are zero-based. No input names or values appear in reports.

Supported assertions: `type`, `enum`, `const`, `required`, `properties`, `additionalProperties`, `items`, `minItems`, `maxItems`, `minLength`, `maxLength`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`. Annotations: `title`, `description`, `default`, `examples`. All other keywords are unsupported and make analysis incomplete. `subset` lists the exact supported and annotation sets and illustrative unsupported keywords.

Finding codes, levels, and fixed messages:

| Code | Level | Message |
| --- | --- | --- |
| `SCHEMA_NOT_OBJECT` | error | Schema must be an object. |
| `TYPE_INVALID` | error | Invalid type keyword. |
| `ENUM_INVALID` | error | Invalid enum keyword. |
| `REQUIRED_INVALID` | error | Invalid required keyword. |
| `PROPERTIES_INVALID` | error | Invalid properties keyword. |
| `ADDITIONAL_PROPERTIES_INVALID` | error | Invalid additionalProperties keyword. |
| `ITEMS_INVALID` | error | Invalid items keyword. |
| `LENGTH_INVALID` | error | Invalid length or item limit. |
| `BOUND_INVALID` | error | Invalid numeric bound. |
| `BOUNDS_CONTRADICT` | error | Bounds contradict. |
| `UNSUPPORTED_KEYWORD` | warn | Unsupported keyword. |
| `EMPTY_SCHEMA` | warn | Empty schema. |
| `TYPE_MISSING` | warn | Type is missing. |
| `ADDITIONAL_PROPERTIES_UNDECIDED` | warn | Additional properties are undecided. |
| `PROPERTY_DESCRIPTION_MISSING` | info | Property description is missing. |
| `NON_OBJECT_INPUT_SCHEMA` | warn | Input schema does not include object. |
| `UNKNOWN_KEYWORD` | warn | Unknown keyword. |
| `TYPE_MISMATCH` | error | Type mismatch. |
| `ENUM_MISMATCH` | error | Enum mismatch. |
| `CONST_MISMATCH` | error | Const mismatch. |
| `MIN_LENGTH` | error | Minimum length not met. |
| `MAX_LENGTH` | error | Maximum length exceeded. |
| `MINIMUM` | error | Minimum not met. |
| `MAXIMUM` | error | Maximum exceeded. |
| `EXCLUSIVE_MINIMUM` | error | Exclusive minimum not met. |
| `EXCLUSIVE_MAXIMUM` | error | Exclusive maximum exceeded. |
| `MIN_ITEMS` | error | Minimum item count not met. |
| `MAX_ITEMS` | error | Maximum item count exceeded. |
| `REQUIRED_MISSING` | error | Required property is missing. |
| `ADDITIONAL_PROPERTY` | error | Additional property is not allowed. |
| `DEPTH_EXCEEDED` | error | Maximum depth exceeded. |

The example command writes `example.json`, `fixtures.json`, then the zero-byte `.joons-schema-toolkit-output` marker. A nonempty directory requires the marker or `--force`. Force does not bypass path safety or delete unrelated files. Writes are not a multi-file transaction.
