import { getStore } from '@netlify/blobs';
import { sanitize } from './lib/admin-core.mjs';
import { mollieCall,verifyPayment,applyStatus } from './lib/mollie.mjs';
const ok=new Response('OK',{status:200,headers:{'content-type':'text/plain','cache-control':'no-store'}});
export function createWebhookHandler(storeFactory=()=>getStore({name:'opvangwerkplan-concepten',consistency:'strong'}),provider=mollieCall){
 return async req=>{
  if(req.method!=='POST')return new Response('Methode niet toegestaan',{status:405});
  try{
   if(Number(req.headers.get('content-length')||0)>1000)return new Response('Te groot',{status:413});
   const raw=await req.text();if(raw.length>1000)return new Response('Te groot',{status:413});
   const paymentId=new URLSearchParams(raw).get('id');if(!/^tr_[A-Za-z0-9]{5,50}$/.test(paymentId||''))return new Response('Ongeldig id',{status:400});
   const store=storeFactory(),mapping=await store.get('payments/'+paymentId+'.json',{type:'json'});
   if(!mapping)return ok;
   const payment=await provider(mapping.mode,paymentId);
   if(!verifyPayment(payment,mapping.recordId,paymentId,mapping.mode))throw Error('Betaalgegevens komen niet overeen.');
   const key='records/'+mapping.recordId+'.json';
   for(let i=0;i<6;i++){
    const entry=await store.getWithMetadata(key,{type:'json'});if(!entry)return ok;
    if(entry.data.mollie?.id!==paymentId)return ok;
    const next=applyStatus(entry.data,payment);
    if(entry.data.mollie.status===next.mollie.status&&entry.data.payment===next.payment)return ok;
    const result=await store.setJSON(key,next,{onlyIfMatch:entry.etag});if(result.modified)return ok;
   }
   throw Error('Gelijktijdige update verhinderde de statuswijziging.');
  }catch(e){console.error('Mollie webhook',sanitize(e.message));return new Response('Tijdelijk niet verwerkt',{status:503});}
 };
}
export default createWebhookHandler();
