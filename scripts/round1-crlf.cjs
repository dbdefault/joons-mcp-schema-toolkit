const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {includeInCleanCopy}=require('../tests/helpers/clean-copy.cjs');
const root=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'joons-matrix-'));
try {
 for(const mode of ['no-ref','crlf']) {
  const copy=path.join(temp,mode);
  fs.cpSync(root,copy,{recursive:true,filter:src=>includeInCleanCopy(root,src)});
  let converted=0;
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(item.isFile()){const b=fs.readFileSync(p);if(b.includes(0))continue;let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(b);}catch{continue;}const next=s.replace(/\r?\n/g,'\r\n');if(next!==s){fs.writeFileSync(p,next,'utf8');converted++;}}}}
  if(mode==='crlf')walk(copy);
  const env={...process.env,JOONS_COPY_CHECK:'1'};delete env.NODE_TEST_CONTEXT;
  const r=cp.spawnSync(process.execPath,['scripts/test.js'],{cwd:copy,encoding:'utf8',windowsHide:true,env,maxBuffer:4*1024*1024});
  const counts=(r.stdout+'\n'+r.stderr).split(/\r?\n/).filter(s=>/^(?:ℹ|#) (?:tests|pass|fail|skipped) /.test(s));
  console.log(JSON.stringify({mode,converted,exit:r.status,counts}));
  if(r.status!==0){console.log((r.stdout+'\n'+r.stderr).slice(-8000));process.exitCode=1;}
 }
} finally {fs.rmSync(temp,{recursive:true,force:true});}
