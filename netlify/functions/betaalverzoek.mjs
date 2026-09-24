import { getStore } from '@netlify/blobs';
import { allowed,sanitize,canFinalize } from './lib/admin-core.mjs';
import { PRICE,paymentMode,assertMollieCredentials,mollieCall,verifyPayment,applyStatus } from './lib/mollie.mjs';
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const response=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export function createPaymentHandler(storeFactory=()=>getStore({name:'opvangwerkplan-concepten',consistency:'strong'}),provider=mollieCall){
 return async req=>{
  if(!allowed(req))return response({error:'Beheercode klopt niet.'},401);
  if(req.method!=='POST')return response({error:'Methode niet toegestaan.'},405);
  let input;try{if(Number(req.headers.get('content-length')||0)>2000)throw Error();input=await req.json();}catch{return response({error:'Ongeldige aanvraag.'},400);}
  const id=input?.id;if(!idPattern.test(id||''))return response({error:'Ongeldig aanvraagnummer.'},400);
  try{
   const mode=paymentMode();if(mode==='off')return response({error:'Mollie is nog niet ingesteld. Gebruik eerst de testmodus.'},409);
   assertMollieCredentials(mode);
   const store=storeFactory(),key='records/'+id+'.json',entry=await store.getWithMetadata(key,{type:'json'});
   if(!entry)return response({error:'Aanvraag niet gevonden.'},404);
   const record=entry.data;
   if(!canFinalize(record)||!record.finalPdfKey||record.archived)return response({error:'Controleer de tekst en het klantakkoord, maak een definitieve PDF en sla de aanvraag op voordat u een betaalverzoek maakt.'},409);
   if(record.mollie?.id){
    const latest=await provider(record.mollie.mode,record.mollie.id);
    if(!verifyPayment(latest,id,record.mollie.id,record.mollie.mode))throw Error('De betaalgegevens van Mollie komen niet overeen.');
    const synced=applyStatus(record,latest);
    if(['open','pending','authorized','paid'].includes(latest.status)&&synced.payment!=='onbetaald'){
     if(latest.status!==record.mollie.status||synced.payment!==record.payment){const update=await store.setJSON(key,synced,{onlyIfMatch:entry.etag});if(!update.modified)return response({error:'Aanvraag intussen gewijzigd. Laad opnieuw.'},409);}
     return response({id:latest.id,mode:record.mollie.mode,status:latest.status,checkoutUrl:synced.payment==='betaald'?null:latest._links?.checkout?.href||record.mollie.checkoutUrl});
    }
   }
   if(record.payment==='betaald')return response({error:'Deze aanvraag is al als betaald vastgelegd.'},409);
   const attempt=(record.mollie?.attempt||0)+1;
   const lock='payment-locks/'+id+'/'+attempt+'.json';
   const reserved=await store.setJSON(lock,{createdAt:new Date().toISOString()},{onlyIfNew:true});
   if(!reserved.modified)return response({error:'Betaalverzoek wordt al aangemaakt. Laad opnieuw.'},409);
   let created=false;
   try{
    const origin=process.env.URL;if(!origin||!/^https:\/\//i.test(origin))throw Error('Veilige Netlify-site-URL ontbreekt.');
    // Once the request has been sent, a timeout is ambiguous: keep the lock to prevent duplicate charges.
    created=true;
    const p=await provider(mode,null,{amount:{currency:'EUR',value:PRICE},description:'Pedagogisch werkplan - '+id.slice(0,8),redirectUrl:new URL('/betaling-terug.html',origin).href,webhookUrl:new URL('/.netlify/functions/mollie-webhook',origin).href,metadata:{recordId:id}});
    if(!p.id||!p._links?.checkout?.href||p.amount?.value!==PRICE||p.amount?.currency!=='EUR')throw Error('Mollie gaf geen geldig betaalverzoek terug.');
    const paymentRecord={recordId:id,mode,createdAt:new Date().toISOString()};
    await store.setJSON('payments/'+p.id+'.json',paymentRecord,{onlyIfNew:true});
    const next={...record,payment:'betaalverzoek',mollie:{id:p.id,mode,status:p.status||'open',attempt,checkoutUrl:p._links.checkout.href},updatedAt:new Date().toISOString()};
    const update=await store.setJSON(key,next,{onlyIfMatch:entry.etag});
    if(!update.modified)throw Error('Aanvraag intussen gewijzigd. Controleer in Mollie of een betaalverzoek is aangemaakt.');
    return response({id:p.id,mode,status:p.status||'open',checkoutUrl:p._links.checkout.href});
   }catch(e){if(!created)await store.delete(lock);throw e;}
  }catch(e){console.error('Betaalverzoek',sanitize(e.message));return response({error:sanitize(e.message)},500);}
 };
}
export default createPaymentHandler();
