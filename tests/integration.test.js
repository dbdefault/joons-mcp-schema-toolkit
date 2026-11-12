import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateArguments} from './vendor/mock/src/schema/arguments.js';
import {validateFixtures} from './vendor/mock/src/input/fixtures.js';
import {includeInCleanCopy} from './helpers/clean-copy.cjs';

test('real examples: all commands and formats are deterministic and anonymous',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'joons-integration-'));
 try {
  const snapshot=path.resolve('examples/snapshot.json'), args=path.resolve('examples/arguments.json'), cli=path.resolve('bin/joons-mcp-schema-toolkit.js');
  const run=a=>spawnSync(process.execPath,[cli,...a],{encoding:'utf8',windowsHide:true});
  for(const format of ['terminal','json','markdown']) for(const command of ['validate','lint','check','example','subset']) {
   const base=[command,...(command==='subset'?[]:['--snapshot',snapshot]),...(command==='check'?['--tool','greet','--arguments',args]:[]),...(command==='example'?['--tool','greet','--out',path.join(dir,format)]:[]),'--format',format];
   const a=run(base),b=run(base); assert.equal(a.status,0,`${command} ${format}: ${a.stderr}`); assert.equal(b.status,0); assert.equal(a.stdout,b.stdout); assert.equal(a.stderr,b.stderr); assert.doesNotMatch(a.stdout+a.stderr,/\x1b|\r/);
   if(command==='example'){const out=path.join(dir,format), value=JSON.parse(fs.readFileSync(path.join(out,'example.json'))), fixture=JSON.parse(fs.readFileSync(path.join(out,'fixtures.json'))), snap=JSON.parse(fs.readFileSync(snapshot)); assert.equal(validateArguments(snap.tools[0].inputSchema,value).ok,true); assert.equal(validateFixtures(fixture,{snapshot:snap}).ok,true);}
  }
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('clean copy without references, package and documentation boundaries',()=>{
 const pkg=JSON.parse(fs.readFileSync('package.json')); assert.deepEqual(Object.keys(pkg.dependencies||{}),[]); assert.deepEqual(Object.keys(pkg.devDependencies||{}),[]);
 for(const entry of pkg.files) assert.doesNotMatch(entry,/test|vendor|internal|ref\//i);
 const korean=fs.readFileSync('README.ko.md','utf8'); assert.ok((korean.match(/[가-힣]/g)||[]).length>1000); assert.doesNotMatch(korean,/\?{3}|\ufffd/);
 for(const name of ['README.md','README.ko.md','ARCHITECTURE.md','SECURITY.md','CHANGELOG.md',...fs.readdirSync('docs').map(x=>'docs/'+x),...fs.readdirSync('examples').filter(x=>x.endsWith('.md')).map(x=>'examples/'+x)]) assert.doesNotMatch(fs.readFileSync(name,'utf8'),/CONTRACT\.md|OPEN_QUESTIONS\.md/);
 if(process.env.JOONS_COPY_CHECK==='1')return;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'joons-copy-'));
 try {
  const root=process.cwd(), copy=path.join(dir,'copy');
  fs.cpSync(root,copy,{recursive:true,filter:src=>includeInCleanCopy(root,src)});
  const digest=()=>{const hash=createHash('sha256');function walk(p){for(const entry of fs.readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){const file=path.join(p,entry.name), rel=path.relative(copy,file); hash.update(rel+'\0');if(entry.isDirectory())walk(file);else if(entry.isFile())hash.update(fs.readFileSync(file));else hash.update('special');}}walk(copy);return hash.digest('hex');};
  const before=digest(); const env={...process.env,JOONS_COPY_CHECK:'1'}; delete env.NODE_TEST_CONTEXT; const result=spawnSync(process.execPath,['scripts/test.js'],{cwd:copy,encoding:'utf8',windowsHide:true,env,maxBuffer:4*1024*1024}); assert.equal(result.status,0,result.stdout+result.stderr); assert.match(result.stdout,/skipped 0/); assert.equal(digest(),before);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('input strings stay out of reports and strict rejections exit two',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'joons-secret-'));
 try {
  const cli=path.resolve('bin/joons-mcp-schema-toolkit.js'), marker='SECRET-MARKER', snap=JSON.parse(fs.readFileSync('examples/snapshot.json'));
  snap.label=marker; snap.tool.name=marker; snap.tool.version=marker; snap.server.name=marker; snap.server.version=marker; snap.server.protocolVersion=marker; const tool=snap.tools[0]; tool.title=marker; tool.description=marker; tool.annotations={note:marker}; tool.inputSchema.description=marker; tool.inputSchema.properties.name.description=marker; tool.inputSchema.properties.name.default=marker; tool.inputSchema.properties.name.examples=[marker];
  const input=path.join(dir,'input.json'), arg=path.join(dir,'arguments.json'); fs.writeFileSync(input,JSON.stringify(snap)); fs.writeFileSync(arg,JSON.stringify({name:marker}));
  const run=a=>spawnSync(process.execPath,[cli,...a],{encoding:'utf8',windowsHide:true});
  for(const format of ['terminal','json','markdown']) for(const command of ['validate','lint','check','example']) {const a=[command,'--snapshot',input,'--strict','--format',format,...(command==='check'?['--tool','greet','--arguments',arg]:[]),...(command==='example'?['--tool','greet','--out',path.join(dir,format)]:[])];const r=run(a); assert.equal(r.status,0); assert.ok(!(r.stdout+r.stderr).includes(marker)); if(command==='example')for(const file of ['example.json','fixtures.json'])assert.ok(!fs.readFileSync(path.join(dir,format,file),'utf8').includes(marker));}
  const variants=[['invalid_json','{'],['invalid_snapshot','{}'],['schema_invalid',JSON.stringify({...snap,tools:[{...tool,inputSchema:{type:'wrong'}}]})],['unsupported_keyword',JSON.stringify({...snap,tools:[{...tool,inputSchema:{pattern:marker}}]})]];
  for(const [kind,contents] of variants){fs.writeFileSync(input,contents);const r=run(['validate','--snapshot',input,'--strict']);assert.equal(r.status,2,kind);assert.ok(!(r.stdout+r.stderr).includes(marker));}
  fs.writeFileSync(input,JSON.stringify(snap)); for(const a of [['check','--snapshot',input,'--tool','missing','--arguments',arg],['check','--snapshot',input,'--tool','greet','--arguments',input],['example','--snapshot',input,'--tool','missing','--out',path.join(dir,'none')]]) assert.equal(run([...a,'--strict']).status,2);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
