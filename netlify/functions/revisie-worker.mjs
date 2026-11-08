import {environmentInfo} from './lib/environment.mjs';
import {verifyReviewToken} from './lib/review-token.mjs';
import {getAppStore} from './lib/environment.mjs';
import {allowed} from './lib/admin-core.mjs';
import {analyseRecord} from './lib/revision-ai.mjs';
import {questionMail} from './lib/revision-core.mjs';
export const config={background:true};
export function createWorker(factory=()=>getAppStore(),analyse=analyseRecord){return async req=>{
 if(req.method!=='POST')return new Response('Methode niet toegestaan',{status:405});
 let b;try{const raw=await req.text();if(raw.length>6000)return new Response('Te groot',{status:413});b=JSON.parse(raw);}catch{return new Response('Ongeldige gegevens',{status:400});}
 const production=environmentInfo().production;
 if(production?!allowed(req):!verifyReviewToken(b,b.taskToken)){
  console.warn('REVIEW_AUTH_REJECTED');
  return Response.json({error:'Workerautorisatie ontbreekt, is verlopen of hoort niet bij deze taak.',code:'REVIEW_AUTH_REJECTED'},{status:401});
 }
if(!/^[0-9a-f-]{36}$/i.test(b.id||'')||!/^[0-9a-f-]{36}$/i.test(b.jobId||'')||!['questions','corrections'].includes(b.kind))return new Response('Ongeldig',{status:400});
 const store=factory(),jobKey=`review-jobs/${b.id}/${b.jobId}.json`,key=`records/${b.id}.json`;
 const task=await store.get(jobKey,{type:'json'});
 if(!production&&(!task||task.id!==b.id||task.jobId!==b.jobId||task.version!==b.version||task.kind!==b.kind))return Response.json({error:'Taak hoort niet bij deze aanvraag.'},{status:409});
 const claim=await store.setJSON(`review-claims/${b.id}/${b.jobId}.json`,{at:new Date().toISOString()},{onlyIfNew:true});if(!claim.modified)return;
 try{
 const entry=await store.getWithMetadata(key,{type:'json'});if(!entry||entry.etag!==b.version||entry.data.reviewJob!==b.jobId)throw Error('changed');
 await store.setJSON(jobKey,{...task,status:'bezig',startedAt:new Date().toISOString()});
 const r=entry.data,result=await analyse(r,r.clientFeedback||'',b.kind);
 const next={...r,answerLinks:result.answers,questionDraft:{id:b.jobId,questions:result.questions,text:result.questions.length?questionMail(r,result.questions):'Er zijn geen aanvullende vragen gevonden. Controleer dit persoonlijk.',createdAt:new Date().toISOString()},...(b.kind==='corrections'?{revisionProposal:{...result,feedback:r.clientFeedback,createdAt:new Date().toISOString()},workflowStatus:'Correcties ter goedkeuring'}:{})};
 const saved=await store.setJSON(key,next,{onlyIfMatch:entry.etag});if(!saved.modified)throw Error('changed');
 await store.setJSON(jobKey,{status:'gereed',at:new Date().toISOString()});
 }catch(e){await store.setJSON(jobKey,{status:'fout',at:new Date().toISOString(),error:e.message==='changed'?'De aanvraag is tijdens de analyse gewijzigd. Analyseer opnieuw.':'Analyse niet afgerond. Controleer AI-vrijgave, sleutel, model en tekstlengte. Er zijn geen correcties toegepast.'});}
 };}
export default createWorker();
