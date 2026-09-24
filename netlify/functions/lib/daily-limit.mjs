export async function reserveGeneration(store) {
 const configured=Number(process.env.MAX_DAILY_GENERATIONS||20);
 if(!Number.isInteger(configured)||configured<1||configured>1000)throw Error("MAX_DAILY_GENERATIONS moet een geheel getal tussen 1 en 1000 zijn.");
 const key="usage/"+new Date().toISOString().slice(0,10)+".json";
 for(let attempt=0;attempt<8;attempt++){
  const entry=await store.getWithMetadata(key,{type:"json"});
  const count=entry?.data?.count||0;
  if(count>=configured)throw Error("Daglimiet voor automatische werkplannen bereikt. Bekijk de aanvraag in Netlify Forms; pas MAX_DAILY_GENERATIONS aan of verwerk de aanvraag op een volgende dag.");
  const result=await store.setJSON(key,{count:count+1},{...(entry?{onlyIfMatch:entry.etag}:{onlyIfNew:true})});
  if(result.modified)return;
 }
 throw Error("Te veel gelijktijdige aanvragen. Bekijk deze aanvraag in Netlify Forms.");
}
