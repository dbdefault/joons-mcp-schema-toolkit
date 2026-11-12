import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {unsafeIdentifier,redactText} from '../src/security/redact.js';
import {runExampleForTool} from './helpers/example-cli.js';
import {includeInCleanCopy} from './helpers/clean-copy.cjs';

test('SRR5-01 600 realistic identifiers and example CLI',()=>{
 const verbs=['get','list','create','update','delete','find','read','fetch','search','count'],nouns=['Project','Workspace','Resource','Document','Repository','Customer','Account','Report','Session','Connection'],suffix=['ByOwner','ForUser','WithDetails','V2Report'];
 const ids=[];for(const v of verbs)for(const n of nouns)for(const s of suffix)ids.push(v+n+s);
 ids.splice(0,8,'getV2Report','sha256Hash','uuid4Generator','base64Encode','awsS3ListBuckets','listAllAvailableProjectsByOwner','retrieveAllAvailableProjectsForEveryWorkspace','getOAuth2AuthorizationStatus');
 for(const v of verbs)for(const n of nouns)for(const s of ['V2ReportSummary','S3BucketsV2'])ids.push(v+n+s);
 for(const a of ['clear','daily','open','small','bright','local','simple','fresh','quick','green'])for(const b of ['search','reader','worker','report','status','window','folder','sample','result','query'])for(const sep of ['_','-','.',''])ids.push(a+sep+b);
 ids.push('getV2ReportSummary','listS3BucketsV2','oauth2TokenExchangeEndpointV3','createK8sPodFromTemplate','create_pull_request_review_comment_thread','searchRepositoryIssuesByLabelAndState','getCurrentWeatherForecastForCity');
 const name='getOAuth2AuthorizationStatus', result=runExampleForTool(name);assert.equal(result.status,0,result.stderr);assert.ok(Object.hasOwn(result.fixture.tools,name));
 assert.ok(ids.length>=600);for(const id of ids)assert.equal(unsafeIdentifier(id),false,id);
});

test('SRA-07 every redaction branch normalizes and caps output',()=>{
 for(const s of ['safe\u0001 token=abcdef','!'.repeat(300)+' token=abcdef','a\u200db','(AKIA1234567890123456)\u0001','x'.repeat(9000)]){const out=redactText(s);assert.ok([...out].length<=200);assert.doesNotMatch(out,/[\u0000-\u001f\u007f-\u009f\p{Cf}]/u);assert.equal(out,out.normalize('NFC'));}
});

test('SRA-06 CLI documents all source finding definitions exactly',()=>{
 const source=fs.readFileSync('src/output/report.js','utf8'),docs=fs.readFileSync('docs/CLI.md','utf8');const block=source.match(/const definitions = \{([\s\S]*?)\n\};/)[1];const entries=[...block.matchAll(/([A-Z_]+): \['(error|warn|info)', '([^']+)'\]/g)];assert.ok(entries.length>20);const lines=docs.split(/\r?\n/).filter(x=>/^\| `[A-Z_]+` \|/.test(x));assert.equal(lines.length,entries.length);for(const [,code,level,message] of entries)assert.ok(lines.includes(`| \`${code}\` | ${level} | ${message} |`),code);
});

test('tests have no external review script references',()=>{const needle='review'+'_scripts';function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile())assert.ok(!fs.readFileSync(file,'utf8').includes(needle),file);}}walk('tests');});

test('clean-copy filter excludes non-product materials',()=>{const root=path.resolve('dummy-root'),excluded=['ref','review'+'_scripts5','REVIEW'+'_SRR.md','FAILURES.txt','CASE_INTERNAL.md','INTEGRATION_NOTES.md','INTERFACE_NOTES.md','.git'];for(const name of excluded)assert.equal(includeInCleanCopy(root,path.join(root,name)),false,name);assert.equal(includeInCleanCopy(root,path.join(root,'tests','round5.test.js')),true);});
