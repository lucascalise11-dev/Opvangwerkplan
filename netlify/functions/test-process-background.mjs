import {getAppStore,environmentInfo,aiPolicy} from './lib/environment.mjs';
import {verifyToken} from './lib/intake-token.mjs';
import {processTestIntake} from './lib/process-test-intake.mjs';
export const config={background:true};
export function createTestWorker(factory=getAppStore,process=processTestIntake){return async req=>{
 if(environmentInfo().production||req.method!=='POST')return;
 let body;try{const raw=await req.text();if(raw.length>3000)return;body=JSON.parse(raw);}catch{return;}
 if(!/^[0-9a-f-]{36}$/i.test(body.id||'')||!verifyToken(body.id,body.token))return;
 const store=factory(),submission=await store.get(`test-submissions/${body.id}.json`,{type:'json'});
 if(!submission||submission.data?.['generator-trigger']!=='werkplan-intake-v1')return;
 if(!aiPolicy()){await store.setJSON(`errors/${body.id}.json`,{id:body.id,createdAt:submission.createdAt,opvangnaam:submission.data.opvangnaam||'',error:'AI_TEST_PROCESSING_APPROVED is niet ingesteld voor deze preview.'});return;}
 try{await process(submission.data,body.id,{store});}
 catch{await store.setJSON(`errors/${body.id}.json`,{id:body.id,createdAt:submission.createdAt,error:'Testverwerking niet afgerond. Controleer de achtergrondfunctielog en AI-instellingen.'});}
};}
export default createTestWorker();
