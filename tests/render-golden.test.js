import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cases} from './render-cases.js';
import {renderJson} from '../src/render/json.js';
import {renderTerminal} from '../src/render/terminal.js';
import {renderMarkdown} from '../src/render/markdown.js';
const renderers={json:renderJson,terminal:renderTerminal,markdown:renderMarkdown};
for (const [command,value] of Object.entries(cases())) for (const [format,render] of Object.entries(renderers)) {
  test(`${command} ${format} golden bytes`,()=>{
    const expected=readFileSync(new URL(`./golden/${command}.${format}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    const actual=render(value);
    assert.equal(actual,expected); assert.equal(render(value),actual);
    assert.ok(actual.endsWith('\n')); assert.ok(!actual.includes('\r')); assert.ok(!actual.includes('PLANTED_MARKER'));
  });
}
test('all lint codes use fixed messages and levels',()=>{
  const f=cases().lint.results[0].findings;
  assert.deepEqual(f.map(x=>x.code),['ADDITIONAL_PROPERTIES_UNDECIDED','EMPTY_SCHEMA','NON_OBJECT_INPUT_SCHEMA','PROPERTY_DESCRIPTION_MISSING','TYPE_MISSING','UNKNOWN_KEYWORD']);
  assert.deepEqual(f.map(x=>x.level),['warn','warn','warn','info','warn','warn']);
  assert.deepEqual(f.map(x=>x.message),['Additional properties are undecided.','Empty schema.','Input schema does not include object.','Property description is missing.','Type is missing.','Unknown keyword.']);
});
test('renderer projection rejects or removes planted input from every format',()=>{
  const value=cases().validate;
  value.results[0].findings[0].message='<script>PLANTED_MARKER</script>\u001b[31m\u202e'+'x'.repeat(10000);
  value.extra='PLANTED_MARKER'; value.tool.name='PLANTED_MARKER';
  for (const render of Object.values(renderers)) assert.ok(!render(value).includes('PLANTED_MARKER'));
  value.results[0].findings[0].path='/PLANTED_MARKER';
  for (const render of Object.values(renderers)) assert.throws(()=>render(value), e=>!e.message.includes('PLANTED_MARKER'));
});
