import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { buildConceptPdf } from "./lib/pdf.mjs";
import { allowed, sanitize, editRecord, canFinalize } from "./lib/admin-core.mjs";
const headers={"cache-control":"no-store","x-content-type-options":"nosniff"};
const json=(data,status=200)=>Response.json(data,{status,headers});
export function createHandler(getStorage=()=>getStore({name:"opvangwerkplan-concepten",consistency:"strong"}), makePdf=buildConceptPdf) {
 return async(req)=>{
 if(!allowed(req)) return json({error:"Beheercode klopt niet."},401);
 if(!["GET","POST"].includes(req.method)) return json({error:"Methode niet toegestaan."},405);
 try {
 const store=getStorage(),url=new URL(req.url),id=url.searchParams.get("id"),format=url.searchParams.get("format");
 if(id&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({error:"Ongeldig aanvraagnummer."},400);
 if(req.method==="GET"&&!id) {
  const readAll=async(prefix)=>{const {blobs}=await store.list({prefix}); const records=[]; for(let i=0;i<blobs.length;i+=20) records.push(...await Promise.all(blobs.slice(i,i+20).map(({key})=>store.get(key,{type:"json"})))); return records.filter(Boolean);};
  const [records,errors,jobs]=await Promise.all([readAll("records/"),readAll("errors/"),readAll("jobs/")]);
  const sort=(a,b)=>String(b.createdAt).localeCompare(String(a.createdAt));
  return json({items:records.map(r=>({id:r.id,createdAt:r.createdAt,naam:r.naam,email:r.email,opvangnaam:r.opvangnaam,status:r.status||"concept",payment:r.payment||"onbetaald",archived:!!r.archived,controlepunten:(r.controlepunten||[]).filter((_,i)=>!r.checked?.[i]).length})).sort(sort),
   errors:errors.filter(e=>!records.some(r=>r.id===e.id)).map(r=>({...r,error:sanitize(r.error)})).sort(sort),
   jobs:jobs.filter(j=>!records.some(r=>r.id===j.id)&&!errors.some(e=>e.id===j.id)).sort(sort),
   diagnostics:{openAIConfigured:!!process.env.OPENAI_API_KEY}});
 }
 if(!id) return json({error:"Aanvraagnummer ontbreekt."},400);
 const key="records/"+id+".json";
 if(req.method==="GET"){
  const entry=await store.getWithMetadata(key,{type:"json"});
  if(!entry) return json({error:"Niet gevonden."},404);
  const r=entry.data;
  if(format==="pdf"||format==="final"){
   if(format==="final"&&!r.finalPdfKey) return json({error:"Maak eerst een definitieve PDF."},409);
   const pdfKey=format==="final"?r.finalPdfKey:(r.pdfKey||"pdf/"+id+".pdf");
   const pdf=await store.get(pdfKey,{type:"arrayBuffer"});
   if(!pdf) return json({error:"PDF ontbreekt. Open het werkplan en sla het opnieuw op."},404);
   return new Response(pdf,{headers:{...headers,"content-type":"application/pdf","content-disposition":'attachment; filename="'+(format==="final"?"werkplan-":"concept-")+id+'.pdf"'}});
  }
  return json({record:r,version:entry.etag});
 }
 if(!req.headers.get("content-type")?.includes("application/json"))return json({error:"JSON vereist."},415);
 const raw=await req.text();
 if(raw.length>350000)return json({error:"Aanvraag is te groot."},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:"Ongeldige gegevens."},400);}
 if(body.action==="archiveError"){
  const errorKey="errors/"+id+".json",entry=await store.getWithMetadata(errorKey,{type:"json"});
  if(!entry)return json({error:"Niet gevonden."},404);
  const result=await store.setJSON(errorKey,{...entry.data,archived:body.archived===true},{onlyIfMatch:entry.etag});
  return result.modified?json({ok:true}):json({error:"Gewijzigd; laad opnieuw."},409);
 }
 const entry=await store.getWithMetadata(key,{type:"json"});
 if(!entry)return json({error:"Niet gevonden."},404);
 if(!body.version||body.version!==entry.etag)return json({error:"Deze aanvraag is intussen gewijzigd. Kopieer uw wijzigingen en open de nieuwste versie."},409);
 let next={...entry.data},newPdfKey;
 if(body.action==="save"){
  try{next=editRecord(next,body);}catch(e){return json({error:e.message},400);}
  newPdfKey="pdf/"+id+"/"+randomUUID()+".pdf";
  await store.set(newPdfKey,new Blob([await makePdf(next)],{type:"application/pdf"}));
  next.pdfKey=newPdfKey;
 }else if(body.action==="finalize"){
  if(!canFinalize(next))return json({error:"Werk alle controlepunten af en bevestig uw controle én het akkoord van de klant."},409);
  newPdfKey="pdf/"+id+"/"+randomUUID()+".pdf";
  await store.set(newPdfKey,new Blob([await makePdf(next,{final:true})],{type:"application/pdf"}));
  next.finalPdfKey=newPdfKey; next.status="definitief";next.finalizedAt=new Date().toISOString();
 }else if(body.action==="complete"){
  if(next.mollie?.mode==="test")return json({error:"Een TEST-betaling is geen echte betaling. Rond alleen een werkelijk betaalde opdracht af."},409);
  if(!next.finalPdfKey||next.payment!=="betaald")return json({error:"Een definitieve PDF en betaalstatus ‘betaald’ zijn nodig om af te ronden."},409);
  next.status="afgerond";next.completedAt=new Date().toISOString();
 }else if(body.action==="archive"){
  next.archived=body.archived===true;
 }else{return json({error:"Onbekende actie."},400);}
 next.updatedAt=new Date().toISOString();
 const result=await store.setJSON(key,next,{onlyIfMatch:entry.etag});
 if(!result.modified){if(newPdfKey)await store.delete(newPdfKey);return json({error:"Deze aanvraag is intussen gewijzigd. Open de nieuwste versie."},409);}
 // Remove superseded PDFs only after the new record is committed.
 const keep=new Set([next.pdfKey||"pdf/"+id+".pdf",next.finalPdfKey]);
 const oldKeys=[entry.data.pdfKey||"pdf/"+id+".pdf",entry.data.finalPdfKey].filter(k=>k&&!keep.has(k));
 for(const oldKey of oldKeys)try{await store.delete(oldKey);}catch{console.warn("Oude PDF opruimen niet gelukt");}
 return json({record:next,version:result.etag});
 }catch(e){console.error("Beheerfout",sanitize(e.message));return json({error:"Opslaan of laden is niet gelukt. Probeer opnieuw; controleer bij aanhoudende fouten de functielog."},500);}
 };
}
export default createHandler();
