import {randomUUID} from 'node:crypto';
import {fields} from './admin-core.mjs';
import {recordPackage} from './packages.mjs';
export const STATES=['Nieuwe aanvraag','Concept gegenereerd','Controlepunten open','Wachten op klant','Correcties ontvangen','Correcties ter goedkeuring','Nieuwe versie gereed','Wachten op klantakkoord','Definitief afgerond'];
export const workflow=r=>r.workflowStatus||(r.status==='afgerond'?'Definitief afgerond':(r.controlepunten||[]).some((_,i)=>!r.checked?.[i])?'Controlepunten open':'Concept gegenereerd');
export async function snapshot(store,r,reason){
 const key=`versions/${r.id}/${randomUUID()}.json`,number=r.revisionNumber||1,at=new Date().toISOString();
 await store.setJSON(key,{...r,snapshotReason:reason},{onlyIfNew:true});
 return {...r,revisionNumber:number+1,versionHistory:[...(r.versionHistory||[]),{key,number,at,reason}],updatedAt:at};
}
export function roundLimit(r){if(r.packageId==='bureau'||r.intake?.pakket==='bureau'){if(!Number.isInteger(r.bureauCorrectionLimit))return null;return r.bureauCorrectionLimit;}return recordPackage(r).corrections;}
export function validateAnalysis(result,record,feedback=''){
 if(!result||!Array.isArray(result.questions)||!Array.isArray(result.changes)||!Array.isArray(result.answers))throw Error('Ongeldig analyseantwoord.');
 if(result.questions.length>40||result.changes.length>30||result.answers.length>80)throw Error('Te veel analysepunten.');
 const ids=new Set();
 for(const q of result.questions){if(typeof q.id!=='string'||ids.has(q.id)||typeof q.question!=='string'||!q.question.trim()||q.question.length>1500||!Array.isArray(q.checkIndices)||q.checkIndices.some(i=>!Number.isInteger(i)||i<0||i>=(record.controlepunten||[]).length))throw Error('Ongeldige klantvraag.');ids.add(q.id);}
 const seen=new Set();
 for(const c of result.changes){if(!fields.includes(c.field)||seen.has(c.field)||typeof c.proposed!=='string'||!c.proposed.trim()||c.proposed.length>20000||typeof c.evidence!=='string'||!c.evidence.trim()||!feedback.includes(c.evidence)||typeof c.manualReview!=='boolean')throw Error('Correctie mist geldige bron of bevat een ongeldig veld.');seen.add(c.field);c.existing=String(record[c.field]||'');}
 for(const a of result.answers){if(!Number.isInteger(a.checkIndex)||a.checkIndex<0||a.checkIndex>=(record.controlepunten||[]).length||!['beantwoord','onvoldoende','tegenstrijdig','ontbreekt'].includes(a.status)||typeof a.explanation!=='string'||a.explanation.length>2000)throw Error('Ongeldige koppeling aan controlepunt.');}
 return result;
}
export function questionMail(r,questions){
 return `Beste ${String(r.naam||'gastouder').replace(/[\r\n]/g,' ')},\n\nBedankt voor het invullen van de intake voor uw pedagogisch werkplan. Om uw werkplan zorgvuldig af te ronden, hebben wij nog enkele aanvullende vragen.\n\n${questions.map((q,i)=>`${i+1}. ${q.question}`).join('\n\n')}\n\nAlvast hartelijk dank voor uw reactie.\n\nMet vriendelijke groet,\n\nLuca\nopvangwerkplan@gmail.com`;
}
export function applyChanges(record,proposal,selected,{kind='correction',manualConfirmed=false}={}){
 if(!['correction','actualisatie'].includes(kind))throw Error('Kies correctie of actualisatie.');
 if(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length)throw Error('Selecteer minstens één wijziging.');
 const changes=selected.map(f=>proposal.changes.find(c=>c.field===f));if(changes.some(c=>!c))throw Error('Onbekende wijziging.');
 if(changes.some(c=>c.manualReview)&&!manualConfirmed)throw Error('Bevestig eerst uw handmatige controle van tegenstrijdigheden.');
 const next={...record};
 if(kind==='actualisatie'){
  const date=record.deliveredAt||record.completedAt;
  if(record.packageId!=='compleet'||!date)throw Error('Actualisatie vereist Compleet en een geregistreerde opleverdatum.');
  const end=new Date(date);end.setUTCFullYear(end.getUTCFullYear()+1);
  if(Date.now()>end.getTime()||!Number.isFinite(end.getTime())||(record.updatesUsed||0)>=1)throw Error('De inbegrepen actualisatie is niet beschikbaar.');
  next.updatesUsed=(record.updatesUsed||0)+1;
 }else{const max=roundLimit(record);if(max===null)throw Error('Leg eerst het aantal correctierondes volgens de bureauofferte vast.');if((record.correctionsUsed||0)>=max)throw Error('De inbegrepen correctierondes zijn gebruikt. Leg eventueel meerwerk afzonderlijk vast.');next.correctionsUsed=(record.correctionsUsed||0)+1;}
 for(const c of changes){if(String(record[c.field]||'')!==c.existing)throw Error('De bestaande tekst is intussen gewijzigd. Analyseer opnieuw.');next[c.field]=c.proposed;}
 return {...next,status:'concept',workflowStatus:'Nieuwe versie gereed',reviewed:false,customerApproved:false,checked:(record.controlepunten||[]).map(()=>false),finalPdfKey:null,finalizedAt:null,completedAt:null,deliveredAt:record.deliveredAt||record.completedAt||null,revisionProposal:null,lastChanges:changes.map(c=>({field:c.field,before:c.existing,after:c.proposed,evidence:c.evidence})),payment:record.payment};
}
