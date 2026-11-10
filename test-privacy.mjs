import assert from 'node:assert/strict';
import {analyseRecord} from '../netlify/functions/lib/revision-ai.mjs';
process.env.AI_TEST_PROCESSING_APPROVED='yes';process.env.OPENAI_API_KEY='local-fixture-only';
let calls=0;
await analyseRecord({intake:{naam:'PRIVATE_CONTACT',email:'private@example.invalid',kind_naam:'PRIVATE_CHILD_FIXTURE',arbitrary:{child:'PRIVATE_NESTED'},opvangdagen:'maandag t/m donderdag',wennen:'twee wenmomenten',bureau_beleid_bestand:'https://example.invalid/private.pdf'},controlepunten:[]},'', 'questions',async(url,options)=>{calls++;const b=JSON.parse(options.body);assert.equal(b.store,false);const data=JSON.parse(b.input[1].content[0].text);assert.deepEqual(data.intake,{opvangdagen:'maandag t/m donderdag',wennen:'twee wenmomenten'});assert(!JSON.stringify(b).includes('PRIVATE_'));return Response.json({status:'completed',output_text:JSON.stringify({questions:[],changes:[],answers:[]})});});
assert.equal(calls,1);console.log('PASS review data minimisation: unknown fields, nested values, contact fields and attachment URL excluded; intended intake preserved; store:false. No external call.');
