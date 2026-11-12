import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {redactText} from '../src/security/redact.js';
import {analyzeSchema} from '../src/core/schema.js';

test('SRR-01 credential variants refused in tool and property identifiers',()=>{
 const variants=['sk-abcdef123456','s\u0301k-abcdef123456','ｓｋ－abcdef123456','sk&#45;abcdef123456','sk%2Dabcdef123456','sk\\u002dabcdef123456',Buffer.from('sk-abcdef123456').toString('base64'),...['AKIA','ASIA','AGPA','AIDA','AROA','AIPA','ANPA','ANVA'].map(x=>x+'1234567890123456'),'AIza'+'a'.repeat(35),'ya29.abcdef','xoxb-abcdef','SG.abcdef','npm_'+'a'.repeat(20),'Bearer abcdef','eyJabc.abcdef.abcdef','-----BEGIN PRIVATE KEY-----',...['sk_live_','pk_live_','rk_live_','ghp_','gho_','ghu_','ghs_','ghr_','github_pat_','glpat-'].map(x=>x+'abcdef123456')];
 const root=fs.mkdtempSync(path.join(process.cwd(),'round1-')); try{const input=path.join(root,'input.json'),cli=path.resolve('bin/joons-mcp-schema-toolkit.js'); let i=0; for(const value of variants){assert.notEqual(redactText(value),value,`display ${value}`); for(const mode of ['tool','property']){const snap=JSON.parse(fs.readFileSync('examples/snapshot.json')); const tool=snap.tools[0];if(mode==='tool'){tool.name=value;tool.inputSchema={type:'object'};}else tool.inputSchema={type:'object',required:[value]};fs.writeFileSync(input,JSON.stringify(snap));const out=path.join(root,'out-'+i++);const r=spawnSync(process.execPath,[cli,'example','--snapshot',input,'--tool='+tool.name,'--out',out],{encoding:'utf8',windowsHide:true});assert.equal(r.status,2,`${mode} ${value}`);assert.ok(!(r.stdout+r.stderr).includes(value));assert.equal(fs.existsSync(out),false);}} for(const value of ['ask-me','task-force','skeleton'])assert.equal(redactText(value),value);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('SRR-02 wide schema CLI stays within generous performance bound',()=>{
 const root=fs.mkdtempSync(path.join(process.cwd(),'round1-perf-'));try{const snap=JSON.parse(fs.readFileSync('examples/snapshot.json'));snap.tools[0].inputSchema={properties:Object.fromEntries(Array.from({length:300000},(_,i)=>['p'+i,{}]))};const input=path.join(root,'input.json');fs.writeFileSync(input,JSON.stringify(snap));const times=[];for(let i=0;i<3;i++){const start=performance.now();const r=spawnSync(process.execPath,['--max-old-space-size=256',path.resolve('bin/joons-mcp-schema-toolkit.js'),'validate','--snapshot',input,'--format','json'],{encoding:'utf8',windowsHide:true});times.push(performance.now()-start);assert.equal(r.status,0,r.stderr);}times.sort((a,b)=>a-b);console.log(`wide schema median ${times[1].toFixed(0)} ms`);assert.ok(times[1]<5000,`wide schema median ${times[1].toFixed(0)} ms`);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('SRA-02 signed zero enum fingerprints stay subquadratic',()=>{const values=Array.from({length:4000},(_,i)=>Array.from({length:12},(_,b)=>(i&(1<<b))?-0:0));const start=performance.now();assert.equal(analyzeSchema({enum:values}).status,'valid');assert.ok(performance.now()-start<700);});
