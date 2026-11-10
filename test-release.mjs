import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),temp=await mkdtemp(join(tmpdir(),'owp-release-'));
try{
 await cp(join(root,'netlify'),join(temp,'netlify'),{recursive:true});
 await cp(join(root,'scripts'),join(temp,'scripts'),{recursive:true});
 await symlink(join(root,'node_modules'),join(temp,'node_modules'),'dir');
 await writeFile(join(temp,'package.json'),'{"type":"module"}');
 const id='abcdef0123456789abcdef01';
 await writeFile(join(temp,'netlify/functions/lib/deployment-context.mjs'),'export const deployment='+JSON.stringify({context:'production',id,url:`https://${id}--fixture.netlify.app`})+';');
 for(const script of ['test-review-chain.mjs','test-production-intake.mjs']){
 const r=spawnSync(process.execPath,[join(temp,'scripts',script)],{cwd:temp,env:{...process.env,AI_PROCESSING_APPROVED:'yes',MAIL_MODE:'off'},encoding:'utf8'});
 process.stdout.write(r.stdout);process.stderr.write(r.stderr);assert.equal(r.status,0,script);
 }
 console.log('PASS isolated production-context regression: direct signed-event processing, stable submission ID, scoped review worker, no internal HTTP or live providers. No production storage used.');
}finally{await rm(temp,{recursive:true,force:true});}
