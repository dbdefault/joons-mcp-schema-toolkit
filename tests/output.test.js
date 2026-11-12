import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeReport} from '../src/output/report.js';
import {makeFixtures} from '../src/output/fixtures.js';
import {renderJson} from '../src/render/json.js';

test('report exact shape and fixed finding vocabulary', () => {
  const r = makeReport('validate', [{name:'private',kind:'input',status:'invalid',findings:[{code:'TYPE_INVALID',path:'/type',message:'SECRET'}]}]);
  assert.equal(renderJson(r), readFileSync(new URL('./output-golden.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
  assert.equal(renderJson(r), '{\n  "format": "joons-mcp-schema-toolkit/report",\n  "schemaVersion": 1,\n  "tool": {\n    "name": "joons-mcp-schema-toolkit",\n    "version": "0.1.0"\n  },\n  "command": "validate",\n  "status": "invalid",\n  "summary": {\n    "tools": 1,\n    "schemas": 1,\n    "invalid": 1,\n    "incomplete": 0,\n    "findings": 1\n  },\n  "results": [\n    {\n      "tool": "tool-1",\n      "kind": "input",\n      "status": "invalid",\n      "findings": [\n        {\n          "code": "TYPE_INVALID",\n          "level": "error",\n          "path": "/type",\n          "message": "Invalid type keyword."\n        }\n      ]\n    }\n  ],\n  "exampleWritten": false\n}\n');
});
test('sorts and deduplicates findings, independently of tool order', () => {
  const a={name:'z',kind:'output',status:'invalid',findings:[{code:'TYPE_INVALID',path:'/type'},{code:'TYPE_INVALID',path:'/type'}]};
  const b={name:'a',kind:'input',status:'valid',findings:[]};
  assert.deepEqual(makeReport('validate',[a,b]),makeReport('validate',[b,a]));
  assert.equal(makeReport('validate',[a,b]).summary.findings,1);
});
test('counts cap before deduplication and rejects unsafe paths and codes', () => {
  assert.throws(()=>makeReport('lint',[{name:'a',kind:'input',status:'valid',findings:Array(10001).fill({code:'TYPE_INVALID',path:'/type'})}]), {kind:'limit_exceeded'});
  for (const finding of [{code:'TYPE_INVALID',path:'/properties/SECRET'}, {code:'SECRET',path:''}]) assert.throws(()=>makeReport('validate',[{name:'a',kind:'input',status:'invalid',findings:[finding]}]));
});
test('fixtures retain exact selected identifier and generated object', () => {
  assert.equal(JSON.stringify(makeFixtures('tool', {x:''})), '{"format":"joons-mcp-mock-server/fixtures","fixtureVersion":1,"missingFixture":"error","scenarios":{},"tools":{"tool":{"match":[{"arguments":{"x":""},"response":{"content":[{"type":"text","text":"example"}]}}]}}}');
});
test('status precedence, empty tools, and artifact completion', () => {
  assert.equal(makeReport('validate',[]).status,'valid');
  const rows=[{name:'x',kind:'input',status:'unavailable',findings:[]}];
  assert.equal(makeReport('example',rows).status,'unavailable');
  const done=[{name:'x',kind:'input',status:'valid',findings:[]}]; done.exampleWritten=true;
  assert.equal(makeReport('example',done).exampleWritten,true);
  assert.throws(()=>makeReport('example',Object.assign(rows,{exampleWritten:true})));
});
