import {createHash,randomUUID} from 'node:crypto';
import {getAppStore,environmentInfo} from './lib/environment.mjs';
import {packageFor} from './lib/packages.mjs';
import {processIntake} from './verwerk-werkplan.mjs';

// Netlify verifies the platform event signature. No public intake bypass is added.
export const config={background:true};
export function createSubmissionHandler(factory=getAppStore,process=processIntake,isProduction=()=>environmentInfo().production){return async req=>{
 if(!isProduction())return;
 const {payload}=await req.json();const data=payload?.data||{};
 if(data['generator-trigger']!=='werkplan-intake-v1'&&!(data.opvangnaam&&data.email&&data.dagritme))return;
 data.pakket=packageFor(data.pakket).id;
 // Stable binding to the verified platform submission prevents repeated event delivery
 // from creating another workplan or sending another intake confirmation.
 const hex=typeof payload.id==='string'&&payload.id?createHash('sha256').update('netlify-submission:'+payload.id).digest('hex'):null;
 const id=hex?`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`:randomUUID();
 const store=factory();if(await store.get(`claims/${id}.json`,{type:'json'}))return;
 await store.setJSON(`jobs/${id}.json`,{id,createdAt:new Date().toISOString(),opvangnaam:data.opvangnaam||'',status:'wachtrij'},{onlyIfNew:true});
 await process(data,id);
};}
export default createSubmissionHandler();
