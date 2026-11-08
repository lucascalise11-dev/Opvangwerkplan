import {randomUUID} from 'node:crypto';
import {getAppStore,environmentInfo,aiPolicy} from './lib/environment.mjs';
import {issueToken,verifyToken} from './lib/intake-token.mjs';
import {packageFor} from './lib/packages.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export function createTestIntake(factory=getAppStore){return async req=>{
 if(environmentInfo().production)return json({error:'Testroute niet beschikbaar in productie.'},404);
 try{
 if(req.method==='GET'){
  const id=new URL(req.url).searchParams.get('id');if(!/^[0-9a-f-]{36}$/i.test(id||'')||!verifyToken(id,req.headers.get('x-intake-token')))return json({error:'Uw tijdelijke testtoegang is ongeldig of verlopen.'},401);
  const store=factory();if(await store.get(`records/${id}.json`,{type:'json'}))return json({id,status:'gereed'});
  const error=await store.get(`errors/${id}.json`,{type:'json'});if(error)return json({id,status:'fout',error:error.error||'Generatie mislukt.'});
  const job=await store.get(`jobs/${id}.json`,{type:'json'});return json({id,status:job?.status||'opgeslagen'});
 }
 if(req.method!=='POST')return json({error:'Methode niet toegestaan.'},405);
 if(Number(req.headers.get('content-length')||0)>150000)return json({error:'Testtekst te groot.'},413);
 const form=await req.formData(),data={};let size=0;
 for(const [k,v]of form){if(typeof v!=='string'){if(v.size)return json({error:'Gebruik in previews beleidstekst, geen bijlage.'},400);continue;}size+=v.length;if(size>100000)return json({error:'Maximaal 100.000 tekens testtekst.'},413);data[k]=v;}
 if(data['bot-field'])return json({received:true});
 const intake=data['generator-trigger']==='werkplan-intake-v1';
 if(intake){if(!data.naam?.trim()||!data.opvangnaam?.trim()||!data.dagritme?.trim()||!data.email?.includes('@'))return json({error:'Naam, e-mailadres, opvangnaam en dagritme zijn verplicht.'},400);packageFor(data.pakket);if(!aiPolicy())return json({error:'AI_TEST_PROCESSING_APPROVED=yes ontbreekt voor Deploy Previews. Er is nog niets ingediend.'},409);if(!process.env.OPENAI_API_KEY)return json({error:'OPENAI_API_KEY ontbreekt voor deze preview. Er is nog niets ingediend.'},409);}
 const id=randomUUID(),token=intake?issueToken(id):null,createdAt=new Date().toISOString(),store=factory();
 await store.setJSON(`test-submissions/${id}.json`,{id,createdAt,data},{onlyIfNew:true});
 if(intake){await store.setJSON(`jobs/${id}.json`,{id,createdAt,opvangnaam:data.opvangnaam,status:'wachtrij'},{onlyIfNew:true});return json({id,token,status:'opgeslagen',worker:'/.netlify/functions/test-process-background'},201);}
 return new Response(null,{status:303,headers:{location:'/bedankt.html'}});
 }catch(e){return json({error:e.message?.includes('Testbeheercode')?e.message:'Testinzending kon niet veilig worden opgeslagen. Controleer de previewinstellingen.'},500);}
};}
export default createTestIntake();
