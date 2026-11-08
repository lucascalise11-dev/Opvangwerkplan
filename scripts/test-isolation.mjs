import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {openStore,environmentInfo,aiPolicy,liveMailAllowed,backgroundUrl} from '../netlify/functions/lib/environment.mjs';
const prod={context:'production',id:'111111111111111111111111',url:'https://111111111111111111111111--example.netlify.app'};
const preview={context:'deploy-preview',id:'222222222222222222222222',url:'https://222222222222222222222222--example.netlify.app'};
const branch={...preview,context:'branch-deploy',id:'333333333333333333333333',url:'https://333333333333333333333333--example.netlify.app'};
const local={context:'local',id:'',url:''};const pools=new Map();
const pool=k=>{if(!pools.has(k))pools.set(k,new Map());return pools.get(k);};const clients={getStore:o=>pool('site/'+o.name),getDeployStore:(name,o)=>pool('deploy/'+o.deployID+'/'+name)};
const real=openStore(prod,clients);real.set('records/customer.json',{text:'Echte aanvraag behouden',rounds:0});real.set('pdf/customer.pdf','original');
for(const d of [preview,branch,local]){const test=openStore(d,clients);assert(!test.has('records/customer.json'));test.set('records/customer.json',{text:'Testcorrectie',rounds:1});test.delete('pdf/customer.pdf');assert.equal(real.get('records/customer.json').text,'Echte aanvraag behouden');assert.equal(real.get('pdf/customer.pdf'),'original');}
assert.notEqual(openStore(preview,clients),openStore(branch,clients));assert.equal(openStore({...prod,id:'444444444444444444444444',url:'https://444444444444444444444444--example.netlify.app'},clients),real,'Production data must survive redeploy');
assert.throws(()=>environmentInfo({...prod,id:''}));assert.throws(()=>environmentInfo({...prod,url:'https://opvangwerkplan.nl'}));
assert(!aiPolicy({AI_PROCESSING_APPROVED:'yes'},preview));assert(aiPolicy({AI_TEST_PROCESSING_APPROVED:'yes'},preview));assert(!aiPolicy({AI_TEST_PROCESSING_APPROVED:'yes'},prod));assert(aiPolicy({AI_PROCESSING_APPROVED:'yes'},prod));
process.env.CONTEXT='production';process.env.MAIL_MODE='live';assert.equal(liveMailAllowed(),false,'Runtime variable cannot promote local checkout');assert.throws(()=>backgroundUrl('/.netlify/functions/revisie-worker'));
for(const name of await readdir(new URL('../netlify/functions/',import.meta.url))){if(!name.endsWith('.mjs'))continue;const s=await readFile(new URL('../netlify/functions/'+name,import.meta.url),'utf8');assert(!/from ["']@netlify\/blobs/.test(s),name+' bypasses storage wrapper');}
const build=await readFile(new URL('./build.mjs',import.meta.url),'utf8');assert(build.includes('test-intake'));assert(build.includes("context!=='production'"));
console.log('PASS storage isolation: preview/branch/local cannot see or change seeded production record/PDF; production redeploy preserves legacy namespace; unknown production fails closed; separate AI gates; runtime context spoof ignored; all handlers use wrapper. No real Blobs or AI calls.');
