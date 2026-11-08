import {randomUUID} from 'node:crypto';
import {getAppStore,environmentInfo,backgroundUrl,aiPolicy} from './lib/environment.mjs';
export default async req=>{
 if(environmentInfo().production)return new Response('Testroute niet beschikbaar in productie',{status:404});
 if(req.method!=='POST')return new Response('Methode niet toegestaan',{status:405});
 if(Number(req.headers.get('content-length')||0)>150000)return new Response('Testtekst te groot',{status:413});
 try{
 const form=await req.formData(),data={};let size=0;
 for(const [k,v]of form){if(typeof v!=='string'){if(v.size)return new Response('Gebruik in previews beleidstekst, geen bijlage. Upload alleen fictieve gegevens.',{status:400});continue;}size+=v.length;if(size>100000)return new Response('Testtekst te groot',{status:413});data[k]=v;}
 if(data['bot-field'])return new Response('OK');
 const store=getAppStore(),id=randomUUID(),createdAt=new Date().toISOString();
 await store.setJSON(`test-submissions/${id}.json`,{id,createdAt,data},{onlyIfNew:true});
 if(data['generator-trigger']==='werkplan-intake-v1'){
  if(!aiPolicy())return new Response('Testintake bewaard. AI_TEST_PROCESSING_APPROVED ontbreekt; er is geen generatie gestart.',{status:409});
  if(!process.env.ADMIN_TOKEN||process.env.ADMIN_TOKEN.length<12)return new Response('Beheercode ontbreekt voor de testworker',{status:409});
  const response=await fetch(backgroundUrl('/.netlify/functions/verwerk-werkplan'),{method:'POST',headers:{'content-type':'application/json','x-internal-token':process.env.ADMIN_TOKEN},body:JSON.stringify({id,data}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)return new Response('Test opgeslagen; achtergrondtaak niet bevestigd',{status:503});
 }
 return new Response(null,{status:303,headers:{location:data['generator-trigger']?'/intake-ontvangen.html':'/bedankt.html'}});
 }catch{return new Response('Testinzending kon niet worden verwerkt',{status:400});}
};
