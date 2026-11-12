import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {redactText, unsafeIdentifier} from '../src/security/redact.js';
import {analyzeSchema} from '../src/core/schema.js';
import {lintSchema} from '../src/core/lint.js';
import {checkInstance} from '../src/core/check.js';
import {makeExample} from '../src/core/example.js';
import {validateSnapshot} from '../src/input/snapshot.js';
import {makeFixtures} from '../src/output/fixtures.js';

test('SRR3-01 encoded embedded credentials and identifier shape',()=>{
 const tokens=['AKIA','ASIA','AGPA'].map(x=>x+'1234567890123456');
 const bad=[];for(const token of tokens){const dec=[...token].map(c=>'&#'+c.charCodeAt(0)).join('');bad.push(dec+'7tail');for(const form of ['base64','base64url']){const enc=Buffer.from(token).toString(form);bad.push('pre'+enc+'post');for(const sep of ['a','7','_','-'])bad.push('head'+sep+enc);}}
 for(const s of bad)assert.equal(redactText(s),'[REDACTED]',s);
 bad.push('a'.repeat(129),'abcdefghijklmnopqrstuvwx9');for(const s of bad)assert.equal(unsafeIdentifier(s),true,s);
 const samples=[bad[0],bad[1],bad[4],bad[6],bad[10],...bad.slice(-2)];const dir=fs.mkdtempSync(path.join(os.tmpdir(),'joons-r3-'));try{const cli=path.resolve('bin/joons-mcp-schema-toolkit.js');for(const [i,name] of samples.entries())for(const mode of ['tool','property']){const snap=JSON.parse(fs.readFileSync('examples/snapshot.json'));const tool=snap.tools[0];tool.name=mode==='tool'?name:'tool';tool.inputSchema=mode==='tool'?{type:'object'}:{type:'object',required:[name]};const input=path.join(dir,'in.json'),out=path.join(dir,'out');fs.writeFileSync(input,JSON.stringify(snap));const r=spawnSync(process.execPath,[cli,'example','--snapshot',input,'--tool='+tool.name,'--out',out],{encoding:'utf8',windowsHide:true});assert.equal(r.status,2,`${i} ${mode}`);assert.equal(fs.existsSync(out),false);}}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('SRR3-01 ordinary identifiers remain accepted',()=>{
 const names=['listAllAvailableProjectsByOwner','getCurrentWeatherForecastForCity','snake_case_names_with_many_words_here','kebab-case-names','server.tool.v2'];
 for(const a of ['clear','daily','open','small','bright','local','simple','fresh','quick','green'])for(const b of ['search','reader','worker','report','status','window','folder','sample','result','query'])for(const sep of ['_','-','.'])names.push(a+sep+b);
 assert.ok(names.length>=300);for(const name of names){assert.equal(redactText(name),name,name);assert.equal(makeExample({type:'object',required:[name]}).status,'valid',name);}
});

test('SRR3-01 base64 windows cover credential prefix families and alignments',()=>{
 const prefixes=['AKIA','ASIA','AGPA','AIDA','AROA','AIPA','ANPA','ANVA','ghp_','gho_','ghu_','ghs_','ghr_','github_pat_','glpat-','sk-','xoxa-','xoxb-','xoxp-','xoxr-','xoxs-','AIza','ya29.','SG.','npm_','eyJ','Bearer','-----BEGIN '];
 for(const prefix of prefixes)for(let offset=0;offset<3;offset++)for(const encoding of ['base64','base64url']){const encoded=Buffer.from('q'.repeat(offset)+prefix+'abcdefghijklm').toString(encoding);for(const outer of ['pre','a','7','_','-'])assert.equal(redactText(outer+encoded+'tail'),'[REDACTED]',`${prefix} ${offset} ${encoding} ${outer}`);}
});

test('SRA-04 exact JSON guards reject malformed values without executing traps',()=>{
 const hole=Array(1);hole.extra=1;const extra=[1];extra.extra=2;const getter={};let calls=0;Object.defineProperty(getter,'x',{enumerable:true,get(){calls++;return 1;}});const sym={};sym[Symbol('x')]=1;
 const values=[hole,extra,Array(1),getter,sym,new Proxy({},{}),new Proxy([],{}),new (class X {})(),new Date(),new Map(),new Set(),()=>{},1n,NaN,Infinity];
 for(const value of values)for(const fn of [()=>analyzeSchema({enum:[value]}),()=>lintSchema({const:value}),()=>checkInstance({},value),()=>makeExample({const:value}),()=>validateSnapshot({extra:value}),()=>makeFixtures('tool',value)])assert.throws(fn,e=>e.kind==='invalid_json',String(value));
 assert.equal(calls,0);
});

test('SRA-04 dense 100000 element arrays stay linear',()=>{const a=Array.from({length:100000},(_,i)=>i),t=performance.now();assert.equal(analyzeSchema({enum:a}).status,'valid');assert.ok(performance.now()-t<300,`dense array ${Math.round(performance.now()-t)} ms`);});
