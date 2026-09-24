import assert from 'node:assert/strict';
import { createPaymentHandler } from '../netlify/functions/betaalverzoek.mjs';
import { createWebhookHandler } from '../netlify/functions/mollie-webhook.mjs';
import { fields } from '../netlify/functions/lib/admin-core.mjs';
import { verifyPayment,applyStatus } from '../netlify/functions/lib/mollie.mjs';
process.env.ADMIN_TOKEN='local-fixture-strong-token';process.env.MOLLIE_MODE='test';process.env.MOLLIE_TEST_API_KEY='test_local_fixture_key';process.env.URL='https://example.netlify.app';
const db=new Map();let rev=0;
const store={
 async get(k){return db.get(k)?.data??null;},
 async getWithMetadata(k){return db.get(k)??null;},
 async setJSON(k,data,options={}){const old=db.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++rev);db.set(k,{data:structuredClone(data),etag});return {modified:true,etag};},
 async delete(k){db.delete(k);},
};
const id='11111111-1111-4111-8111-111111111111';
const record={id,createdAt:new Date().toISOString(),...Object.fromEntries(fields.map(f=>[f,'Gecontroleerde tekst'])),controlepunten:['Controleer beleid'],checked:[true],reviewed:true,customerApproved:true,finalPdfKey:'pdf/final.pdf',payment:'onbetaald'};
await store.setJSON('records/'+id+'.json',record);
let callCount=0,state='open',refunded='0.00';
const provider=async(mode,paymentId,body)=>{
 assert.equal(mode,'test');
 if(body){callCount++;assert.equal(body.amount.value,'49.00');assert.equal(body.metadata.recordId,id);assert.equal(body.redirectUrl,'https://example.netlify.app/betaling-terug.html');return {id:'tr_ABC12345',amount:body.amount,mode:'test',status:state,metadata:body.metadata,_links:{checkout:{href:'https://www.mollie.com/checkout/test/abc'}}};}
 assert.equal(paymentId,'tr_ABC12345');return {id:paymentId,amount:{currency:'EUR',value:'49.00'},mode:'test',status:state,metadata:{recordId:id},amountRefunded:{value:refunded},_links:{checkout:{href:'https://www.mollie.com/checkout/test/abc'}}};
};
const create=createPaymentHandler(()=>store,provider),webhook=createWebhookHandler(()=>store,provider);
const adminReq=()=>new Request('https://example.netlify.app/.netlify/functions/betaalverzoek',{method:'POST',headers:{'x-admin-token':process.env.ADMIN_TOKEN,'content-type':'application/json'},body:JSON.stringify({id})});
assert.equal((await create(new Request(adminReq().url,{method:'POST',headers:{'x-admin-token':'wrong','content-type':'application/json'},body:JSON.stringify({id})}))).status,401);
process.env.MOLLIE_MODE='live';
const blocked=await create(adminReq());assert.equal(blocked.status,500);assert.equal(callCount,0);
process.env.MOLLIE_MODE='test';
let result=await create(adminReq());assert.equal(result.status,200);assert.equal((await result.json()).mode,'test');
assert.equal((await create(adminReq())).status,200);assert.equal(callCount,1,'Dubbel klikken mag geen tweede betaling maken');
const notification=paymentId=>new Request('https://example.netlify.app/.netlify/functions/mollie-webhook',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'id='+encodeURIComponent(paymentId)});
await webhook(notification('tr_forged123'));
assert.equal((await store.get('records/'+id+'.json')).payment,'betaalverzoek');
assert(!verifyPayment({...await provider('test','tr_ABC12345'),amount:{currency:'EUR',value:'0.01'}},id,'tr_ABC12345','test'));
assert(!verifyPayment({...await provider('test','tr_ABC12345'),metadata:{recordId:'other'}},id,'tr_ABC12345','test'));
state='paid';await webhook(notification('tr_ABC12345'));
assert.equal((await store.get('records/'+id+'.json')).payment,'betaald');
assert.equal((await create(adminReq())).status,200);assert.equal(callCount,1);
refunded='49.00';await webhook(notification('tr_ABC12345'));
assert.equal((await store.get('records/'+id+'.json')).payment,'onbetaald');
const localPaid=applyStatus(record,{status:'paid',amountRefunded:{value:'0.00'}});assert.equal(localPaid.payment,'betaald');
console.log('Mollie tests geslaagd: €49, autorisatie, testmodus, dubbele aanvragen, nepwebhook, betaalstatus en terugbetaling.');
