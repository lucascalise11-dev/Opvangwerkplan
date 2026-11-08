import {environmentInfo} from './lib/environment.mjs';
import {issueReviewToken} from './lib/review-token.mjs';
import {backgroundUrl,liveMailAllowed,aiPolicy} from './lib/environment.mjs';
import {getAppStore} from './lib/environment.mjs';
import {randomUUID} from 'node:crypto';
import nodemailer from 'nodemailer';
import {allowed} from './lib/admin-core.mjs';
import {applyChanges,snapshot,workflow,STATES,questionMail,roundLimit} from './lib/revision-core.mjs';
import {buildConceptPdf} from './lib/pdf.mjs';
import {buildWord} from './lib/word.mjs';
const json=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
const uuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s||'');
const mailReady=()=>liveMailAllowed()&&process.env.MAIL_MODE==='live'&&!!process.env.GMAIL_APP_PASSWORD;
export function createRevisionHandler(factory=()=>getAppStore(),dispatch=async job=>{
 const origin=backgroundUrl('/').href;if(!origin?.startsWith('https://'))throw Error('Veilige Netlify URL ontbreekt.');
 const r=await fetch(new URL('/.netlify/functions/revisie-worker',origin),{method:'POST',headers:{'content-type':'application/json','x-admin-token':process.env.ADMIN_TOKEN},body:JSON.stringify(job),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Achtergrondanalyse kon niet starten.');
},send=async data=>{
 const client=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:'opvangwerkplan@gmail.com',pass:process.env.GMAIL_APP_PASSWORD.replace(/\s/g,'')},connectionTimeout:10000,socketTimeout:20000});
 const info=await client.sendMail({from:{name:'OpvangWerkPlan',address:'opvangwerkplan@gmail.com'},replyTo:'opvangwerkplan@gmail.com',...data,disableFileAccess:true,disableUrlAccess:true});
 if(!info.accepted?.length)throw Error('Niet door SMTP geaccepteerd.');
}){return async req=>{
 if(!allowed(req))return json({error:'Beheercode klopt niet.'},401);
 const url=new URL(req.url),id=url.searchParams.get('id');if(!uuid(id))return json({error:'Ongeldig aanvraagnummer.'},400);
 const store=factory(),key='records/'+id+'.json';
 try{
 let entry=await store.getWithMetadata(key,{type:'json'});if(!entry)return json({error:'Aanvraag niet gevonden.'},404);
 const r=entry.data;
 if(req.method==='GET'){
  const jobId=url.searchParams.get('job');if(jobId){if(!uuid(jobId))return json({error:'Ongeldige taak.'},400);const j=await store.get(`review-jobs/${id}/${jobId}.json`,{type:'json'});return j?json(j):json({error:'Taak niet gevonden.'},404);}
  const versionKey=url.searchParams.get('versionKey');if(versionKey){if(!(r.versionHistory||[]).some(v=>v.key===versionKey))return json({error:'Versie niet gevonden bij deze aanvraag.'},404);const old=await store.get(versionKey,{type:'json'});if(!old)return json({error:'Versie ontbreekt.'},404);const format=url.searchParams.get('format');if(format==='pdf'||format==='docx'){const bytes=format==='pdf'?await buildConceptPdf(old,{final:!!old.finalPdfKey}):await buildWord(old,{final:!!old.finalPdfKey});return new Response(bytes,{headers:{'cache-control':'no-store','content-type':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','content-disposition':`attachment; filename="versie-${old.revisionNumber||1}.${format}"`}});}return json({record:old});}
  return json({workflow:workflow(r),mailReady:mailReady(),limit:roundLimit(r),states:STATES});
 }
 if(req.method!=='POST')return json({error:'Methode niet toegestaan.'},405);
 if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'JSON vereist.'},415);
 const raw=await req.text();if(raw.length>180000)return json({error:'Te veel tekst. Maximaal 180.000 tekens per verzoek.'},413);
 let b;try{b=JSON.parse(raw);}catch{return json({error:'Ongeldige JSON.'},400);}
 if(b.version!==entry.etag)return json({error:'De aanvraag is gewijzigd. Open opnieuw voordat u doorgaat.'},409);
 let next={...r};
 if(['questions','analyse'].includes(b.action)){
  if(!aiPolicy()||!process.env.OPENAI_API_KEY)return json({error:'AI-verwerking niet ingesteld/vrijgegeven. Controleer de verwerkersafspraken en OPENAI_API_KEY. Productie vereist AI_PROCESSING_APPROVED=yes; test vereist AI_TEST_PROCESSING_APPROVED=yes.'},409);
  if(b.privacyConfirmed!==true)return json({error:'Controleer eerst dat de brontekst geen persoonsgegevens van kinderen bevat.'},400);
  const feedback=b.action==='analyse'?String(b.feedback||'').trim():String(r.clientFeedback||'');if(b.action==='analyse'&&(!feedback||feedback.length>100000))return json({error:'Plak klantfeedback van maximaal 100.000 tekens.'},400);
  if(r.reviewJob){const old=await store.get(`review-jobs/${id}/${r.reviewJob}.json`,{type:'json'});if(['bezig','wachtrij'].includes(old?.status)&&Date.now()-Date.parse(old.createdAt)<16*60*1000){
   if(!environmentInfo().production&&old.version===entry.etag&&old.kind===(b.action==='questions'?'questions':'corrections')&&(b.action==='questions'||feedback===r.clientFeedback)){
    const task={id,jobId:old.jobId,version:old.version,kind:old.kind};
    return json({jobId:old.jobId,version:entry.etag,task,taskToken:issueReviewToken(task),worker:'/.netlify/functions/revisie-worker',resumed:true},202);
   }
   return json({error:'Een analyse loopt al. Wacht tot deze klaar is.'},409);
  }}
  const jobId=randomUUID();next.reviewJob=jobId;if(b.action==='analyse'){next.clientFeedback=feedback;next.workflowStatus='Correcties ontvangen';}
  const saved=await store.setJSON(key,next,{onlyIfMatch:entry.etag});if(!saved.modified)return json({error:'Gewijzigd; laad opnieuw.'},409);
  const task={id,jobId,version:saved.etag,kind:b.action==='questions'?'questions':'corrections'};
  await store.setJSON(`review-jobs/${id}/${jobId}.json`,{...task,recordId:id,status:'wachtrij',createdAt:new Date().toISOString()},{onlyIfNew:true});
  if(!environmentInfo().production){
   return json({jobId,version:saved.etag,task,taskToken:issueReviewToken(task),worker:'/.netlify/functions/revisie-worker'},202);
  }
  try{await dispatch(task);}catch{await store.setJSON(`review-jobs/${id}/${jobId}.json`,{status:'fout',error:'Starten niet bevestigd. Controleer de functielog voordat u opnieuw analyseert.'});return json({error:'Starten van de achtergrondanalyse is niet bevestigd.'},503);}
  return json({jobId,version:saved.etag},202);
 }else if(b.action==='saveMail'){
  if(!r.questionDraft)return json({error:'Genereer eerst een e-mail.'},409);
  if(typeof b.text!=='string'||b.text.length>30000||!b.text.trim())return json({error:'Ongeldige e-mailtekst.'},400);
  next.questionDraft={...r.questionDraft,text:b.text};
 }else if(b.action==='sendMail'){
  if(!mailReady())return json({error:'Klantmail is niet ingesteld. Kopieer de e-mail of stel MAIL_MODE=live en het Gmail-appwachtwoord in.'},409);
  const d=r.questionDraft;if(!d?.questions?.length||!d.text?.trim())return json({error:'Geen klantvragen om te verzenden.'},409);
  if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(r.email||''))return json({error:'Ongeldig klantadres.'},400);
  const sendKey=`question-mail/${id}/${d.id}.json`,claim=await store.setJSON(sendKey,{status:'sending',at:new Date().toISOString()},{onlyIfNew:true});
  if(!claim.modified)return json({error:'Deze vragen zijn al verzonden of de verzendstatus is onzeker. Controleer Gmail; er wordt niet dubbel verstuurd.'},409);
  try{await send({to:r.email,subject:'Aanvullende vragen voor uw pedagogisch werkplan',text:d.text});}catch{await store.setJSON(sendKey,{status:'onzeker',at:new Date().toISOString(),text:d.text});return json({error:'Verzending niet bevestigd. Controleer Gmail vóór een nieuwe verzending.'},502);}
  const receipt={id:d.id,at:new Date().toISOString(),text:d.text,questions:d.questions,status:'sent'};await store.setJSON(sendKey,receipt);
  for(let i=0;i<5;i++){const latest=await store.getWithMetadata(key,{type:'json'});if(!latest)break;const saved=await store.setJSON(key,{...latest.data,sentQuestions:[...(latest.data.sentQuestions||[]),receipt],workflowStatus:'Wachten op klant'},{onlyIfMatch:latest.etag});if(saved.modified)return json({record:{...latest.data,sentQuestions:[...(latest.data.sentQuestions||[]),receipt],workflowStatus:'Wachten op klant'},version:saved.etag});}
  return json({error:'E-mail is verzonden; de ontvangstregistratie staat veilig opgeslagen. Laad de aanvraag opnieuw en controleer de mailhistorie.'},409);
 }else if(b.action==='apply'){
  if(!r.revisionProposal||r.revisionProposal.feedback!==r.clientFeedback)return json({error:'Analyseer eerst de actuele klantfeedback.'},409);
  next=applyChanges(r,r.revisionProposal,b.selected,{kind:b.kind,manualConfirmed:b.manualConfirmed===true});next=await snapshot(store,{...r},'Vóór goedgekeurde '+(b.kind||'correctie')).then(v=>({...next,versionHistory:v.versionHistory,revisionNumber:v.revisionNumber,updatedAt:v.updatedAt}));
  const keyBase=`pdf/${id}/${randomUUID()}`;next.pdfKey=keyBase+'.pdf';next.docxKey=keyBase+'.docx';
  await store.set(next.pdfKey,new Blob([await buildConceptPdf(next)],{type:'application/pdf'}));await store.set(next.docxKey,new Blob([await buildWord(next)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
 }else if(b.action==='setWorkflow'){
  if(!STATES.includes(b.status)||['Definitief afgerond','Nieuwe versie gereed'].includes(b.status))return json({error:'Deze status volgt uit een documenthandeling.'},400);next.workflowStatus=b.status;
 }else if(b.action==='bureauLimit'){
  if(!['bureau',undefined].includes(r.packageId)&&r.intake?.pakket!=='bureau')return json({error:'Alleen voor bureauoffertes.'},400);
  if(!Number.isInteger(b.limit)||b.limit<0||b.limit>100||!String(b.agreement||'').trim())return json({error:'Vul het aantal rondes en de offerteafspraak in.'},400);next.packageId='bureau';next.bureauCorrectionLimit=b.limit;next.bureauAgreement=String(b.agreement).slice(0,2000);
 }else return json({error:'Onbekende actie.'},400);
 const saved=await store.setJSON(key,next,{onlyIfMatch:entry.etag});if(!saved.modified)return json({error:'Gelijktijdige wijziging. Open de nieuwste versie; correctieronde niet verwerkt.'},409);
 return json({record:next,version:saved.etag});
 }catch{return json({error:'De bewerking is niet gelukt. Controleer de instellingen of probeer opnieuw na herladen.'},500);}
 };}
export default createRevisionHandler();
