import {getStore,getDeployStore} from '@netlify/blobs';
import {deployment} from './deployment-context.mjs';
export function environmentInfo(d=deployment){
 const production=d.context==='production'&&/^[a-f0-9]{24}$/i.test(d.id)&&validDeployUrl(d);
 if(d.context==='production'&&!production)throw Error('Productiecontext is niet betrouwbaar opgebouwd. Voer een Netlify-build uit.');
 return {production,context:d.context,storage:production?'opvangwerkplan-concepten':d.id?'deploy-specific-test':'opvangwerkplan-test-local',deployId:d.id};
}
function validDeployUrl(d){try{const u=new URL(d.url);return u.protocol==='https:'&&u.hostname.startsWith(d.id+'--')&&u.hostname.endsWith('.netlify.app')&&!u.username&&!u.password;}catch{return false;}}
export function openStore(d,clients={getStore,getDeployStore}){const e=environmentInfo(d);if(e.production)return clients.getStore({name:'opvangwerkplan-concepten',consistency:'strong'});if(d.id)return clients.getDeployStore('opvangwerkplan-test',{deployID:d.id,consistency:'strong'});return clients.getStore({name:'opvangwerkplan-test-local',consistency:'strong'});}
export function backgroundUrl(path){if(!validDeployUrl(deployment))throw Error('Deployment-specifieke HTTPS-URL ontbreekt. Achtergrondverwerking geblokkeerd.');return new URL(path,deployment.url);}
export function liveMailAllowed(){return environmentInfo().production;}
export function aiPolicy(env=process.env,d=deployment){const prod=environmentInfo(d).production;return prod?env.AI_PROCESSING_APPROVED==='yes':env.AI_TEST_PROCESSING_APPROVED==='yes';}
export function assertAiAllowed(){if(!aiPolicy())throw Error(environmentInfo().production?'AI-verwerking niet vrijgegeven voor productie.':'AI-testverwerking niet vrijgegeven. Gebruik uitsluitend fictieve gegevens en AI_TEST_PROCESSING_APPROVED=yes.');}

export function getAppStore(){return openStore(deployment);}
