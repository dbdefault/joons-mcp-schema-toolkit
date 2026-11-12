import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redactText,unsafeIdentifier} from '../src/security/redact.js';
import {makeExample} from '../src/core/example.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('SRR4-01 and matrix encoded display credentials',()=>{
 for(const p of ['sk_live_','pk_live_','rk_live_']){const b=Buffer.from(p+'abcdefghijklmnopqrstuv').toString('base64url');for(const sep of ['','a','7','_','-','.'])for(const s of [b+sep+'tail','pre'+sep+b+'post','head'+sep+b])assert.notEqual(redactText(s),s,s);}
 assert.notEqual(redactText('prec2tfbGl2ZV9hYmNkZWZnaGlqa2xtbm9wcXJzdHV2post'),'prec2tfbGl2ZV9hYmNkZWZnaGlqa2xtbm9wcXJzdHV2post');
 assert.equal(redactText('(prec2tfbGl2ZV9hYmNkZWZnaGlqa2xtbm9wcXJzdHV2post)'),'([REDACTED])');
});

test('SRR4-03 fragmented and transformed credential identifiers',()=>{
 const raw='AKIA1234567890123456', b64=Buffer.from(raw).toString('base64url');
 const base32=s=>{let bits=0,n=0,out='';for(const b of Buffer.from(s)){n=(n<<8)|b;bits+=8;while(bits>=5){bits-=5;out+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[(n>>>bits)&31];}}if(bits)out+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[(n<<(5-bits))&31];return out;};
 const samples=['QUtJQT.EyMzQ1.Njc4OT.AxMjM0.NTY',...['.','_','-','/',' '].map(s=>b64.match(/.{1,6}/g).join(s)),Buffer.from(raw).toString('hex'),[...raw].reverse().join(''),...['AKIA1234567890123456','ghp_abcdefghijklmnopqrst','sk-abcdefghi'].map(base32),Buffer.from([...raw].map(c=>'%'+c.charCodeAt(0).toString(16)).join('')).toString('base64url'),[...b64].map(c=>'%'+c.charCodeAt(0).toString(16)).join('')];
 for(const s of samples){assert.equal(unsafeIdentifier(s),true,s);assert.notEqual(redactText(s),s,s);assert.equal(makeExample({type:'object',required:[s]}).status,'unavailable',s);}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'joons-r4-cli-'));try{for(const mode of ['tool','property']){const snap=JSON.parse(fs.readFileSync('examples/snapshot.json')),tool=snap.tools[0];tool.name=mode==='tool'?samples[0]:'tool';tool.inputSchema=mode==='tool'?{type:'object'}:{type:'object',required:[samples[0]]};const input=path.join(dir,'in.json'),out=path.join(dir,'out');fs.writeFileSync(input,JSON.stringify(snap));const r=spawnSync(process.execPath,['bin/joons-mcp-schema-toolkit.js','example','--snapshot',input,'--tool='+tool.name,'--out',out],{encoding:'utf8',windowsHide:true});assert.equal(r.status,2,mode);assert.equal(fs.existsSync(out),false);}}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('SRR4-02 realistic camelCase and 400 ordinary identifiers',()=>{
 const names=['retrieveAllAvailableProjectsForEveryWorkspace','getCurrentWeatherForecastForCity','listAllAvailableProjectsByOwner','create_pull_request_review_comment_thread','searchRepositoryIssuesByLabelAndState','snake_case_names_with_many_words_here','server.tool.v2'];for(const a of ['clear','daily','open','small','bright','local','simple','fresh','quick','green'])for(const b of ['search','reader','worker','report','status','window','folder','sample','result','query'])for(const sep of ['_','-','.',''])names.push(a+sep+b);
 assert.ok(names.length>=400);for(const s of names){assert.equal(unsafeIdentifier(s),false,s);assert.equal(redactText(s),s,s);}
});

test('SRR4 bounded million character inputs',()=>{for(const s of ['a'.repeat(1000000),'QUFB'.repeat(250000)]){const start=performance.now();redactText(s);assert.ok(performance.now()-start<500);const t=performance.now();assert.equal(unsafeIdentifier(s),true);assert.ok(performance.now()-t<500);}});

test('SRR4 10000 tools times 100 properties reject at the node limit promptly',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'joons-wide-'));try{const snap=JSON.parse(fs.readFileSync('examples/snapshot.json'));const properties=Object.fromEntries(Array.from({length:100},(_,i)=>[String.fromCharCode(33+i),0]));snap.tools=Array.from({length:10000},(_,i)=>({name:'t'+i,title:null,description:null,inputSchema:{properties},outputSchema:null,annotations:null}));snap.stats.toolCount=snap.tools.length;const input=path.join(dir,'snapshot.json');fs.writeFileSync(input,JSON.stringify(snap));assert.ok(fs.statSync(input).size<8*1024*1024);const start=performance.now(),r=spawnSync(process.execPath,['bin/joons-mcp-schema-toolkit.js','validate','--snapshot',input],{encoding:'utf8',windowsHide:true});assert.equal(r.status,2);assert.match(r.stderr,/limit_exceeded/);assert.ok(performance.now()-start<2000,`wide ${Math.round(performance.now()-start)} ms`);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
