import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const button={disabled:false,textContent:''},status={textContent:''},choice={value:'starter',addEventListener(){}},summary={},extra={querySelectorAll:()=>[]};
const steps=Array.from({length:5},()=>({classList:{toggle(){}},querySelector:()=>({focus(){}}),querySelectorAll:()=>[]}));
const next=Array.from({length:4},()=>({}));const file={files:[],setCustomValidity(){}};
const form={action:'https://preview.example/.netlify/functions/test-intake',elements:{bureau_beleid_bestand:file},querySelectorAll:()=>[],querySelector:()=>button};
const elements={progress:{},intakeForm:form,'form-status':status,pakket:choice,'package-summary':summary,'extra-intake':extra};
let saved=0,started=0,redirect='';const fetch=async(url,options)=>{
 if(String(url).includes('test-process-background')){started++;assert.equal(options.credentials,'same-origin');assert.deepEqual(JSON.parse(options.body),{id:'test-id',token:'scoped-test-token'});return new Response(null,{status:started===1?401:202});}
 if(options.method==='POST'){saved++;return Response.json({id:'test-id',token:'scoped-test-token'},{status:201});}
 return Response.json({status:'gereed'});
};
const sandbox={document:{getElementById:id=>elements[id],querySelectorAll:s=>s==='.step'?steps:s==='.next'?next:[]},location:{search:'',assign:url=>{redirect=url;}},window:{scrollTo(){}},URL,URLSearchParams,FormData:class{},fetch,setTimeout,console};
vm.runInNewContext(await readFile(new URL('../intake.js',import.meta.url),'utf8'),sandbox);
for(const n of next)n.onclick();
await form.onsubmit({preventDefault(){}});assert(status.textContent.includes('HTTP 401'));assert.equal(button.textContent,'Status opnieuw controleren');assert.equal(redirect,'');
await form.onsubmit({preventDefault(){}});assert.equal(saved,1);assert.equal(started,2);assert.equal(redirect,'/intake-ontvangen.html?pakket=starter');
console.log('PASS intake controller: 401 worker error displayed; same-origin browser call; retry reuses saved id/token without second intake; success redirects only after generated status. DOM simulated.');
