import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../admin.js',import.meta.url),'utf8');assert(source.includes('busy=false,pendingReview=null'));
const code=source.slice(source.indexOf('async function startReview(action)'),source.indexOf("$('questions-generate').onclick"));
let preparations=0,starts=0,opened=0;const elements={'review-privacy':{checked:true},'customer-feedback':{value:''},'review-progress':{textContent:''}};
const sandbox={current:{id:'request-id'},version:'old',token:'private-admin-token',pendingReview:null,$:id=>elements[id],savedOnly(){},revisionCall:async()=>{preparations++;return {jobId:'job-id',version:'new',worker:'/.netlify/functions/revisie-worker',task:{id:'request-id',jobId:'job-id',kind:'questions',version:'new'},taskToken:'scoped-task-token'};},openRecord:async()=>{opened++;},setTimeout:fn=>fn(),fetch:async(url,options)=>{
 if(url==='/.netlify/functions/revisie-worker'){starts++;assert.equal(options.credentials,'same-origin');assert(!JSON.stringify(options).includes('private-admin-token'));assert.equal(JSON.parse(options.body).taskToken,'scoped-task-token');return new Response(null,{status:starts===1?401:202});}
 return Response.json({status:'gereed'});
}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);await assert.rejects(sandbox.startReview('questions'),/HTTP 401/);assert.equal(preparations,1);assert(sandbox.pendingReview);await sandbox.startReview('questions');assert.equal(preparations,1);assert.equal(starts,2);assert.equal(opened,1);assert.equal(sandbox.pendingReview,null);assert(elements['review-progress'].textContent.includes('Analyse gereed'));
console.log('PASS dashboard controller: same-origin worker start; 401 shown; retry reuses task; no admin token in worker payload; polls and loads generated result. DOM simulated.');
