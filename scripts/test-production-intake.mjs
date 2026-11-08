import assert from 'node:assert/strict';
import {createSubmissionHandler} from '../netlify/functions/submission-created.mjs';
import {processIntake} from '../netlify/functions/verwerk-werkplan.mjs';
import {fields} from '../netlify/functions/lib/admin-core.mjs';
import {sendCustomerMail} from '../netlify/functions/lib/customer-mail.mjs';
process.env.ADMIN_TOKEN='fictitious-local-admin-token';process.env.OPENAI_API_KEY='fixture-only-not-a-real-key';
const db=new Map();let seq=0,aiCalls=0;
const store={get:async k=>db.get(k)?.data??null,getWithMetadata:async k=>db.get(k),setJSON:async(k,data,o={})=>{if(o.onlyIfNew&&db.has(k)||o.onlyIfMatch&&db.get(k)?.etag!==o.onlyIfMatch)return {modified:false};db.set(k,{data:structuredClone(data),etag:String(++seq)});return {modified:true};},set:async(k,data)=>db.set(k,{data}),delete:async k=>db.delete(k)};
const oldFetch=globalThis.fetch;globalThis.fetch=async(url,opts)=>{assert.equal(String(url),'https://api.openai.com/v1/responses','No internal HTTP request');aiCalls++;const b=JSON.parse(opts.body);assert.equal(b.store,false);return Response.json({status:'completed',output_text:JSON.stringify({...Object.fromEntries(fields.filter(f=>!['opvangnaam','plaats'].includes(f)).map(f=>[f,'Fictieve praktijk bij Abuela.'])),controlepunten:['Beleid nog nodig']})});};
const handler=createSubmissionHandler(()=>store,(data,id)=>processIntake(data,id,store));
const request=()=>new Request('https://fixture.test/event',{method:'POST',body:JSON.stringify({payload:{id:'fictitious-platform-submission-id',data:{'generator-trigger':'werkplan-intake-v1',pakket:'starter',naam:'Fictieve gastouder',email:'test@example.invalid',opvangnaam:'Bij Abuela',plaats:'Utrecht',dagritme:'Spelen, zingen en rusten'}}})});
try{await handler(request());await handler(request());assert.equal(aiCalls,1);assert.equal([...db.keys()].filter(k=>k.startsWith('records/')).length,1);assert.equal([...db.keys()].filter(k=>k.startsWith('jobs/')).length,0);const r=[...db.entries()].find(([k])=>k.startsWith('records/'))[1].data;assert.equal(r.payment,'onbetaald');assert(!r.customerApproved);assert(db.has('pdf/'+r.id+'.pdf'));
 // Actual SMTP response handling, with a deterministic fake transport and isolated records.
 process.env.MAIL_MODE='live';
 await assert.rejects(()=>sendCustomerMail(store,'rejected','intake',r,[],{sendMail:async()=>({accepted:[]})}),/niet bevestigd/);
 assert.equal((await store.get('mail/rejected.json')).status,'needs-review');
 assert.equal((await sendCustomerMail(store,'accepted','intake',r,[],{sendMail:async()=>({accepted:['test@example.invalid']})})).status,'sent');
 assert.equal((await sendCustomerMail(store,'accepted','intake',r,[],{sendMail:async()=>{throw Error('No duplicate send');}})).status,'already-claimed');
 console.log('PASS production event: one AI call/record/PDF for repeated signed event, payment/approval unchanged; SMTP reject/accept/duplicate handling. Providers simulated.');
}finally{globalThis.fetch=oldFetch;}
