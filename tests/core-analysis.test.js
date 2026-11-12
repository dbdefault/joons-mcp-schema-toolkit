import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSchema} from '../src/core/schema.js';
import {lintSchema} from '../src/core/lint.js';
import {checkInstance} from '../src/core/check.js';
import {makeExample} from '../src/core/example.js';
import {validateArguments} from './vendor/mock/src/schema/arguments.js';
import {validateFixtures} from './vendor/mock/src/input/fixtures.js';
const codes=r=>r.findings.map(f=>f.code);
test('schema diagnoses keyword shapes and contradictions',()=>{
 for(const [s,c] of [[{type:[]},'TYPE_INVALID'],[{enum:[1,1]},'ENUM_INVALID'],[{required:['a','a']},'REQUIRED_INVALID'],[{properties:{a:false}},'PROPERTIES_INVALID'],[{items:true},'ITEMS_INVALID'],[{additionalProperties:2},'ADDITIONAL_PROPERTIES_INVALID'],[{minItems:-1},'LENGTH_INVALID'],[{maximum:'1'},'BOUND_INVALID'],[{minimum:1,exclusiveMaximum:1},'BOUNDS_CONTRADICT']])assert.ok(codes(analyzeSchema(s)).includes(c));
 assert.equal(analyzeSchema({pattern:'x'}).status,'incomplete'); assert.equal(checkInstance({pattern:'x'},{}).status,'incomplete');
});
test('lint rules and output root behavior',()=>{
 const a=codes(lintSchema({type:'object',properties:{x:{},y:{description:'ok'}},pattern:'x'},'input'));
 for(const code of ['ADDITIONAL_PROPERTIES_UNDECIDED','PROPERTY_DESCRIPTION_MISSING','UNKNOWN_KEYWORD','EMPTY_SCHEMA','TYPE_MISSING'])assert.ok(a.includes(code));
 assert.ok(codes(lintSchema({type:'string'},'input')).includes('NON_OBJECT_INPUT_SCHEMA'));
 assert.ok(!codes(lintSchema({type:'string'},'output')).includes('NON_OBJECT_INPUT_SCHEMA'));
});
test('checks limits, unicode, equality and required paths',()=>{
 assert.equal(checkInstance({type:'string',minLength:2},'😀').status,'invalid');
 assert.equal(checkInstance({enum:[{a:1}]},{a:1}).status,'valid');
 assert.equal(checkInstance({type:'object',required:['secret']},{}).findings[0].path,'');
 const r=checkInstance({type:'object',required:Array.from({length:20},(_,i)=>'k'+i)},{});assert.equal(r.findings.length,10);
});
test('example self-check and conservative refusal',()=>{
 const s={type:'object',properties:{a:{type:'string'}}};
 const r=makeExample(s); assert.equal(r.status,'valid');assert.deepEqual(r.example,{});assert.equal(validateArguments(s,r.example).ok,true);
 const fixture={format:'joons-mcp-mock-server/fixtures',fixtureVersion:1,missingFixture:'error',scenarios:{},tools:{sample:{match:[{arguments:r.example,response:{content:[{type:'text',text:'example'}]}}]}}};assert.equal(validateFixtures(fixture).errors.length,0);
 assert.equal(makeExample({type:'object',required:['a'],properties:{a:{enum:['z']}}}).status,'unavailable');
 assert.equal(makeExample({type:'object',required:['a']}).status,'valid'); // Safe identifier and empty child schema produce a valid candidate.
 assert.equal(makeExample({type:'object',required:['a\u200bb']}).status,'unavailable');
});
test('deterministic differential 2000 overlapping pairs',()=>{
 let seed=0x31415926; const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)%n;};
 for(let i=0;i<2000;i++){const a=rnd(4), b=a+rnd(5), schemas=[{type:'string',minLength:a,maxLength:b},{type:'integer',minimum:-a,maximum:b},{type:'array',minItems:a,maxItems:b,items:{type:'number',minimum:-a}},{type:'object',required:rnd(2)?['a']:[],properties:{a:{type:['string','integer'],minLength:a,maximum:b}},additionalProperties:!!rnd(2)},{enum:[null,i,'a']},{}];const values=[null,0,2,3,'','a','😀😀',[],[0,2],{}, {a:1},{a:'x',extra:true}]; const s=schemas[rnd(schemas.length)],v=values[rnd(values.length)];assert.equal(checkInstance(s,v).status==='valid',validateArguments(s,v).ok,`case ${i}`);}
});
test('hostile large and deep inputs reject quickly without getters',()=>{
 const big=Array(1000000).fill(0);let t=performance.now();assert.throws(()=>analyzeSchema({enum:big}),{kind:'limit_exceeded'});assert.ok(performance.now()-t<2000);
 t=performance.now();assert.throws(()=>analyzeSchema({required:big}),{kind:'limit_exceeded'});assert.ok(performance.now()-t<2000);
 const p={};for(let i=0;i<300000;i++)p['k'+i]={};t=performance.now();assert.throws(()=>lintSchema({properties:p}),{kind:'limit_exceeded'});assert.ok(performance.now()-t<2000);
 let deep={};for(let i=0;i<70;i++)deep={items:deep};assert.throws(()=>analyzeSchema(deep),{kind:'limit_exceeded'});
 const x={};Object.defineProperty(x,'type',{enumerable:true,get(){throw Error('getter invoked');}});assert.throws(()=>analyzeSchema(x),{kind:'invalid_json'});
 const cycle={};cycle.items=cycle;assert.throws(()=>analyzeSchema(cycle),{kind:'invalid_json'});
});
