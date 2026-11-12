import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {redactText} from '../src/security/redact.js';
import {analyzeSchema} from '../src/core/schema.js';
import {checkInstance} from '../src/core/check.js';
import {validateArguments} from './vendor/mock/src/schema/arguments.js';

test('SRR2-01 embedded credentials in display and CLI identifiers',()=>{
 const tokens=[...['AKIA','ASIA','AGPA','AIDA','AROA','AIPA','ANPA','ANVA'].map(x=>x+'1234567890123456'),...['ghp_','gho_','ghu_','ghs_','ghr_'].map(x=>x+'a'.repeat(20)), 'sk-abcdef','sk_live_abcdef','pk_live_abcdef','rk_live_abcdef','github_pat_abcdef','glpat-abcdef',...['a','b','p','r','s'].map(x=>'xox'+x+'-abcdef'),'AIza'+'a'.repeat(35),'ya29.abcdef','SG.'+'a'.repeat(20),'npm_'+'a'.repeat(20),'eyJabc.def.ghi','Bearer abcdef','-----BEGIN PRIVATE KEY-----'];
 for(const token of tokens)for(const prefix of ['prefix','9','_','-','.','/','s\u0301\u200d'])assert.equal(redactText(prefix+token+'letters'),'[REDACTED]',`${prefix} ${token}`);
 const root=fs.mkdtempSync(path.join(process.cwd(),'round2-ident-'));try{const cli=path.resolve('bin/joons-mcp-schema-toolkit.js'),file=path.join(root,'input.json');for(const name of ['prefixAKIA1234567890123456','prefixsk-abcdef'])for(const mode of ['tool','property']){const snap=JSON.parse(fs.readFileSync('examples/snapshot.json'));const t=snap.tools[0];if(mode==='tool'){t.name=name;t.inputSchema={type:'object'};}else t.inputSchema={type:'object',required:[name]};fs.writeFileSync(file,JSON.stringify(snap));const out=path.join(root,'out');const r=spawnSync(process.execPath,[cli,'example','--snapshot',file,'--tool='+t.name,'--out',out],{encoding:'utf8',windowsHide:true});assert.equal(r.status,2);assert.equal(fs.existsSync(out),false);assert.ok(!(r.stdout+r.stderr).includes(name));}
 for(const name of ['task-force','ask-me','skeleton','aws_key_id','tokenizer','skate_park','masks-1','riskier']){assert.equal(redactText(name),name);const snap=JSON.parse(fs.readFileSync('examples/snapshot.json'));snap.tools[0].name=name;snap.tools[0].inputSchema={type:'object',required:[name]};fs.writeFileSync(file,JSON.stringify(snap));const out=path.join(root,name);const r=spawnSync(process.execPath,[cli,'example','--snapshot',file,'--tool='+name,'--out',out],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,name);}}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('SRA-03 prototype collision scale and 100000 distinct objects',()=>{
 const values=Array.from({length:4000},(_,i)=>Array.from({length:12},(_,j)=>Object.assign(i&(1<<j)?Object.create(null):{},{x:1})));let t=performance.now();assert.equal(analyzeSchema({enum:values}).status,'valid');assert.ok(performance.now()-t<1200,`collision ${Math.round(performance.now()-t)} ms`);
 const large=Array.from({length:100000},(_,i)=>({i}));t=performance.now();assert.equal(analyzeSchema({enum:large}).status,'valid');assert.ok(performance.now()-t<2000,`objects ${Math.round(performance.now()-t)} ms`);
});

test('SRA-03 enum decisions match Mock Server and deep equality',()=>{
 let state=20261113;const rand=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n;};for(let i=0;i<500;i++){const v=Array.from({length:1+rand(8)},()=>({a:rand(8),b:[rand(5),String(rand(6))]}));const arg={a:rand(8),b:[rand(5),String(rand(6))]};const duplicate=v.some((x,j)=>v.slice(0,j).some(y=>isDeepStrictEqual(x,y)));assert.equal(analyzeSchema({enum:v}).status,duplicate?'invalid':'valid');if(!duplicate)assert.equal(checkInstance({enum:v},arg).status==='valid',validateArguments({enum:v},arg).ok);}
 assert.equal(analyzeSchema({enum:[0,-0]}).status,'valid');assert.equal(analyzeSchema({enum:[{},Object.create(null)]}).status,'valid');
});

test('large required and properties use bounded work',()=>{const required=Array.from({length:100000},(_,i)=>'p'+i),properties=Object.fromEntries(required.map(x=>[x,{}])),instance=Object.fromEntries(required.map(x=>[x,0]));const t=performance.now();assert.equal(checkInstance({type:'object',required,properties},instance).status,'valid');assert.ok(performance.now()-t<4000,`required/properties ${Math.round(performance.now()-t)} ms`);});

test('reused enum membership stays bounded for many array items',()=>{const values=Array.from({length:50000},(_,i)=>i), t=performance.now();assert.equal(checkInstance({type:'array',items:{enum:values}},values).status,'valid');assert.ok(performance.now()-t<2000,`enum membership ${Math.round(performance.now()-t)} ms`);});
