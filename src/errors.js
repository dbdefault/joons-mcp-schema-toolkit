const kinds = new Set(['input_unreadable','invalid_json','invalid_snapshot','limit_exceeded','tool_not_found','schema_invalid','unsupported_keyword','instance_invalid','lint_findings','example_unavailable','output_error','usage_error']);
export class ToolkitError extends Error {
  constructor(kind) { super(kinds.has(kind) ? kind : 'input_unreadable'); this.name = 'ToolkitError'; this.kind = this.message; }
}
