import {getStore} from '@netlify/blobs';
import {allowed} from './lib/admin-core.mjs';
import {analyseRecord} from './lib/revision-ai.mjs';
import {questionMail} from './lib/revision-core.mjs';
export const config={background:true};
export function createWorker(factory=()=>getStore({name:'opvangwerkplan-concepten',consistency:'strong'}),analyse=analyseRecord){return async req=>{
 if(req.method!=='POST'||!allowed(req))return new Response('Niet toegestaan',{status:401});
 const b=await req.json();if(!/^[0-9a-f-]{36}$/i.test(b.id||'')||!/^[0-9a-f-]{36}$/i.test(b.jobId||'')||!['questions','corrections'].includes(b.kind))return new Response('Ongeldig',{status:400});
 const store=factory(),jobKey=`review-jobs/${b.id}/${b.jobId}.json`,key=`records/${b.id}.json`;
 const claim=await store.setJSON(`review-claims/${b.id}/${b.jobId}.json`,{at:new Date().toISOString()},{onlyIfNew:true});if(!claim.modified)return;
 try{
 const entry=await store.getWithMetadata(key,{type:'json'});if(!entry||entry.etag!==b.version||entry.data.reviewJob!==b.jobId)throw Error('changed');
 const r=entry.data,result=await analyse(r,r.clientFeedback||'',b.kind);
 const next={...r,answerLinks:result.answers,questionDraft:{id:b.jobId,questions:result.questions,text:result.questions.length?questionMail(r,result.questions):'Er zijn geen aanvullende vragen gevonden. Controleer dit persoonlijk.',createdAt:new Date().toISOString()},...(b.kind==='corrections'?{revisionProposal:{...result,feedback:r.clientFeedback,createdAt:new Date().toISOString()},workflowStatus:'Correcties ter goedkeuring'}:{})};
 const saved=await store.setJSON(key,next,{onlyIfMatch:entry.etag});if(!saved.modified)throw Error('changed');
 await store.setJSON(jobKey,{status:'gereed',at:new Date().toISOString()});
 }catch(e){await store.setJSON(jobKey,{status:'fout',at:new Date().toISOString(),error:e.message==='changed'?'De aanvraag is tijdens de analyse gewijzigd. Analyseer opnieuw.':'Analyse niet afgerond. Controleer AI-vrijgave, sleutel, model en tekstlengte. Er zijn geen correcties toegepast.'});}
 };}
export default createWorker();
