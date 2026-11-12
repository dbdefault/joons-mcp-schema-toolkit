# Limitations

This is not full Draft 2020-12 meta-validation or a satisfiability checker. Only object schemas and the documented subset are analyzed. Unknown keywords make the result incomplete, including `pattern`, `format`, `$ref`, combinators and `multipleOf`. No pattern is executed, no reference resolved, and no format asserted. The subset can reject schemas valid under general JSON Schema.

Examples use one deterministic candidate without copying enum or const values, repair or retry. A valid schema may have no generated example. Generated fixtures do not establish output schema compliance. Reports use anonymized structural locators, not directly resolvable JSON pointers. Redaction is best effort, not a guarantee. Resource limits constrain but do not eliminate processing cost. Filesystem checks have residual races, rename behavior differs by OS, and multiple output files are not a transaction.

Example tool and required-property identifiers are limited to 128 characters. A run of 24 or more alphanumeric characters is refused if it has at least four digits comprising at least a quarter of the run, or less than 40% of its letters occur in recognizable word-like segments. Credential scan hits also make examples unavailable. Detection may produce false positives and does not prove a string is secret-free; see SECURITY.md for bounded scanning details.
