import {getAppStore,environmentInfo} from './lib/environment.mjs';
import {allowed,canFinalize} from './lib/admin-core.mjs';
import {flow} from './lib/flow.mjs';
import {operation,remember} from './lib/operation.mjs';
import {buildConceptPdf} from './lib/pdf.mjs';
import {buildWord} from './lib/word.mjs';
import {randomUUID} from 'node:crypto';
const json=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
export function createFlowHandler(factory=getAppStore,production=()=>environmentInfo().production){return async req=>{
 if(!allowed(req))return json({error:'Beheercode klopt niet.'},401);
 if(req.method!=='POST')return json({error:'Methode niet toegestaan.'},405);
 try{const raw=await req.text();if(raw.length>12000)return json({error:'Uw toelichting is te lang.'},413);const b=JSON.parse(raw);if(!/^[a-f0-9-]{36}$/i.test(b.id||''))return json({error:'Ongeldige aanvraag.'},400);
 const store=factory(),key='records/'+b.id+'.json',entry=await store.getWithMetadata(key,{type:'json'});if(!entry)return json({error:'Aanvraag niet gevonden.'},404);
 const op=operation(b,entry.data);if(op?.replayed)return json({record:entry.data,version:entry.etag,replayed:true});
 if(b.version!==entry.etag)return json({error:'Deze aanvraag is gewijzigd. Vernieuw de serverstatus; uw tekst blijft bewaard.'},409);
 let r={...entry.data};const test=!production();
 if(b.action==='review'){
  if(b.checks!==undefined){if(!Array.isArray(b.checks)||b.checks.length!==(r.controlepunten||[]).length||b.checks.some(x=>typeof x!=='boolean'))return json({error:'Controlepunten kloppen niet.'},400);r.checked=b.checks;}
  if((r.controlepunten||[]).some((_,i)=>!r.checked?.[i]))return json({error:'Controleer eerst de open punten en sla uw beoordeling op.'},409);
  if(b.confirmed!==true)return json({error:'Bevestig uw inhoudelijke controle.'},400);r.reviewed=true;
 }else if(b.action==='approval'){
  if(b.confirmed!==true||typeof b.evidence!=='string'||!b.evidence.trim())return json({error:'Vermeld waar en wanneer u het klantakkoord heeft ontvangen.'},400);
  r.customerApproved=true;r.approvalEvidence=b.evidence.trim().slice(0,3000);r.approvedAt=new Date().toISOString();
 }else if(b.action==='testPayment'){
  if(!test)return json({error:'Een testsimulatie is niet beschikbaar in productie.'},403);
  if(b.confirmed!==true)return json({error:'Bevestig de fictieve betalingssimulatie.'},400);r.simulation={...r.simulation,payment:true,at:new Date().toISOString()};
 }else if(b.action==='final'){
  if(!canFinalize(r)||!flow(r,test).paid)return json({error:'Inhoudelijke controle, alle controlepunten, klantakkoord en bevestigde betaling zijn vereist.'},409);
  const base='pdf/'+r.id+'/'+randomUUID();r.finalPdfKey=base+'.pdf';r.finalDocxKey=base+'.docx';
  const doc={...r,opvangnaam:test?'[TEST] '+r.opvangnaam:r.opvangnaam};
  await store.set(r.finalPdfKey,new Blob([await buildConceptPdf(doc,{final:true})],{type:'application/pdf'}));await store.set(r.finalDocxKey,new Blob([await buildWord(doc,{final:true})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));r.status='definitief';r.finalizedAt=new Date().toISOString();
 }else if(b.action==='delivered'){
  const f=flow(r,test);if(!f.reviewed||!f.approved||!f.paid||!f.final)return json({error:'Rond controle, betaling, akkoord en definitieve bestanden eerst af.'},409);
  if(b.confirmed!==true||!String(b.evidence||'').trim())return json({error:'Bevestig de levering en noteer de wijze van levering.'},400);
  r.deliveredAt=new Date().toISOString();r.deliveryEvidence=String(b.evidence).slice(0,3000);r.status='afgerond';r.completedAt=r.deliveredAt;
 }else return json({error:'Onbekende actie.'},400);
 const f=flow(r,test);r.workflowStatus=f.status;r.updatedAt=new Date().toISOString();r=remember(r,op);const saved=await store.setJSON(key,r,{onlyIfMatch:entry.etag});if(!saved.modified)return json({error:'Intussen gewijzigd. Controleer de laatste serverstatus.'},409);return json({record:r,version:saved.etag});
 }catch{return json({error:'De handeling kon niet worden bevestigd. Controleer de serverstatus voordat u opnieuw probeert.'},500);}
};}
export default createFlowHandler();
