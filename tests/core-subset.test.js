import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSubset } from '../src/core/subset.js';
import { analyzeSchema } from '../src/core/schema.js';

test('subset lists are sorted and independent', () => {
  const a=getSubset(), b=getSubset();
  for(const key of ['supported','annotations','unsupported']) assert.deepEqual(a[key],a[key].slice().sort());
  a.supported.pop(); assert.notDeepEqual(a.supported,b.supported);
});
test('basic schema verdicts', () => {
  assert.equal(analyzeSchema({type:'object'}).status,'valid');
  assert.equal(analyzeSchema({pattern:'x'}).status,'incomplete');
  assert.equal(analyzeSchema({type:'wat',pattern:'x'}).status,'invalid');
});
