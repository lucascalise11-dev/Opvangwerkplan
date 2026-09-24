import assert from "node:assert/strict";
import { createHandler } from "../netlify/functions/concepten.mjs";
import { fields } from "../netlify/functions/lib/admin-core.mjs";
import { reserveGeneration } from "../netlify/functions/lib/daily-limit.mjs";
import { buildConceptPdf } from "../netlify/functions/lib/pdf.mjs";
import { writeFile } from "node:fs/promises";
process.env.ADMIN_TOKEN="fixture-only-not-a-real-secret";
const db=new Map();let revision=0;
const store={
 async get(k){return db.get(k)?.data??null;},
 async getWithMetadata(k){return db.get(k)??null;},
 async setJSON(k,data,options={}){const old=db.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++revision);db.set(k,{data:structuredClone(data),etag});return {modified:true,etag};},
 async set(k,data){db.set(k,{data,etag:String(++revision)});return {modified:true};},
 async delete(k){db.delete(k);},
 async list({prefix}){return {blobs:[...db.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}
};
const id="11111111-1111-4111-8111-111111111111";
const record={id,createdAt:new Date().toISOString(),naam:"Test",email:"test@example.invalid",...Object.fromEntries(fields.map(f=>[f,"Dit is de gecontroleerde inhoud voor "+f+"."])),controlepunten:["Controleer het beleid."],status:"concept"};
await store.setJSON("records/"+id+".json",record);await store.set("pdf/"+id+".pdf",new Blob(["OLD PDF"]));
const handler=createHandler(()=>store,async(r,options)=>Buffer.from(options?.final?"FINAL PDF":"CONCEPT PDF"));
const request=(method="GET",body,secret=process.env.ADMIN_TOKEN,path="?id="+id)=>handler(new Request("https://site.example/.netlify/functions/concepten"+path,{method,headers:{"x-admin-token":secret,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})}));
assert.equal((await request("GET",null,"wrong")).status,401);
assert.equal((await request("PUT")).status,405);
let current=await(await request()).json();
assert.equal((await request("POST",{action:"finalize",version:current.version})).status,409);
assert.equal((await request("POST",{action:"archive",version:"stale"})).status,409);
let r=await request("POST",{action:"archive",version:current.version,archived:true});assert.equal(r.status,200);
assert(db.has("pdf/"+id+".pdf"),"Archiveren mag oude PDF niet verwijderen");
current=await r.json();
assert.equal((await request("GET",null,process.env.ADMIN_TOKEN,"?id="+id+"&format=pdf")).status,200);
const values=Object.fromEntries(fields.map(f=>[f,record[f]]));
const save={action:"save",values,checks:[true],reviewed:true,customerApproved:true,payment:"betaald",notes:"Akkoord ontvangen."};
r=await request("POST",{...save,version:current.version});assert.equal(r.status,200);current=await r.json();
const savedVersion=current.version;
r=await request("POST",{action:"finalize",version:current.version});assert.equal(r.status,200);current=await r.json();
assert(current.record.finalPdfKey);
assert.equal((await request("GET",null,process.env.ADMIN_TOKEN,"?id="+id+"&format=final")).status,200);
assert.equal((await request("POST",{...save,version:savedVersion})).status,409);
r=await request("POST",{action:"complete",version:current.version});assert.equal(r.status,200);current=await r.json();
r=await request("POST",{...save,version:current.version});assert.equal(r.status,200);current=await r.json();
assert.equal(current.record.finalPdfKey,null,"Tekstbewerking moet definitief akkoord ongeldig maken");
assert.equal((await request("GET",null,process.env.ADMIN_TOKEN,"?id="+id+"&format=final")).status,409);
const oldPdf=current.record.pdfKey;
const bad={...values,opvang:""};
assert.equal((await request("POST",{...save,values:bad,version:current.version})).status,400);
assert(db.has(oldPdf),"Ongeldige invoer mag PDF niet verwijderen");
// Atomic compare-and-swap rejects a race without losing the winning PDF.
const responses=await Promise.all([request("POST",{...save,version:current.version}),request("POST",{...save,version:current.version})]);
assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
const latest=await store.get("records/"+id+".json");assert(db.has(latest.pdfKey));
// Source list remains available for legacy data; errors are sanitized on read.
await store.setJSON("errors/22222222-2222-4222-8222-222222222222.json",{id:"22222222-2222-4222-8222-222222222222",error:"Incorrect API key provided: old-password-value"});
const listing=await(await request("GET",null,process.env.ADMIN_TOKEN,"")).json();
assert(!JSON.stringify(listing).includes("old-password-value"));
process.env.MAX_DAILY_GENERATIONS="2";await reserveGeneration(store);await reserveGeneration(store);await assert.rejects(()=>reserveGeneration(store),/Daglimiet/);
const long={...record,controlepunten:Array.from({length:28},(_,i)=>"Controlepunt "+i+": Controleer samen met het gastouderbureau of de praktijkbeschrijving overeenkomt met het actuele beleid. ".repeat(3))};
await writeFile("tmp-test-long.pdf",await buildConceptPdf(long));
await writeFile("tmp-test-final.pdf",await buildConceptPdf({...record,checked:[true]},{final:true}));
console.log("Beheertests geslaagd: authenticatie, oude records, validatie, finaliseren, gelijktijdige wijzigingen, archief, foutafscherming, daglimiet en PDF's.");
