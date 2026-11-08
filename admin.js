const $=id=>document.getElementById(id);
const fieldNames={opvangnaam:'Naam van de opvang',plaats:'Plaats',opvang:'Over de opvang',werkwijze:'Werkwijze en wennen',activiteiten:'Activiteiten en speelmaterialen',speelruimte:'Binnen- en buitenspeelruimte',emotionele_veiligheid:'Emotionele veiligheid',persoonlijke_competenties:'Persoonlijke competenties',sociale_competenties:'Sociale competenties',normen_waarden:'Normen en waarden',ontwikkeling:'Ontwikkeling volgen',bureau_beleid:'Beleid van het gastouderbureau',actualiseren:'Actueel houden'};
let token='', data={},current=null,version='',dirty=false,busy=false,pendingReview=null;
sessionStorage.removeItem('owp-admin');
function msg(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
async function api(path='',body){
 const r=await fetch('/.netlify/functions/concepten'+path,{method:body?'POST':'GET',headers:{'x-admin-token':token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok){let text='Verzoek mislukt.';try{text=(await r.json()).error||text;}catch{}throw Error(text);}
 return r;
}
function node(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,cls='secondary'){const b=node('button',text,cls);b.type='button';b.onclick=()=>run(fn);return b;}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){msg(e.message,true);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);if(current)$('final-download').disabled=!current.finalPdfKey;}}
async function load(){
 data=await(await api()).json();const env=data.diagnostics?.environment;document.getElementById('environment-banner').textContent=env?(env.production?'PRODUCTIE — echte klantgegevens':'TESTOMGEVING — gescheiden testopslag; alleen fictieve gegevens'):'Omgeving niet bevestigd';if(env)document.getElementById('environment-banner').textContent+=' · AI: '+(data.diagnostics.aiEnabled?'vrijgegeven':'uitgeschakeld');$('login').classList.add('hidden');$('panel').classList.remove('hidden');$('editor').classList.add('hidden');current=null;render();
}
function render(){
 const list=$('list'),fail=$('failures');list.replaceChildren();fail.replaceChildren();
 const archived=$('filter').value==='archive',q=$('search').value.toLowerCase();
 if(!data.diagnostics?.openAIConfigured)fail.append(node('p','De OpenAI-sleutel is niet beschikbaar. Controleer de Netlify-instellingen.','status'));
 if(!archived)for(const j of data.jobs||[]){
 const stale=Date.now()-Date.parse(j.createdAt)>16*60*1000;
 fail.append(node('p',(j.opvangnaam||'Aanvraag')+': '+(stale?'duurt langer dan verwacht. Controleer de achtergrondfunctielog voordat u opnieuw indient.':j.status==='wachtrij'?'staat in de wachtrij.':'werkplan wordt gemaakt. Vernieuw over een minuut.'),'notice'));
 }
 for(const e of data.errors||[]){if(!!e.archived!==archived)continue;const box=node('div','','status');box.append(node('strong','Generatie mislukt: '+(e.opvangnaam||'aanvraag')));
 const det=document.createElement('details');det.append(node('summary','Bekijk foutmelding'),node('p',e.error));box.append(det,button(archived?'Terugzetten':'Fout archiveren',async()=>{await api('?id='+encodeURIComponent(e.id),{action:'archiveError',archived:!archived});await load();}));fail.append(box);}
 const items=(data.items||[]).filter(i=>!!i.archived===archived&&(['active','archive'].includes($('filter').value)||i.status===$('filter').value)&&[i.opvangnaam,i.naam,i.email].join(' ').toLowerCase().includes(q));
 if(!items.length)list.append(node('p','Geen aanvragen in deze selectie.'));
 for(const i of items){const card=node('article','','card'),info=node('div');info.append(node('h2',i.opvangnaam||'Opvang'),node('p',[i.naam,i.email,new Date(i.createdAt).toLocaleString('nl-NL')].filter(Boolean).join(' · '),'meta'),node('span',(i.packageName||'Starter')+' · '+(i.workflowStatus||i.status)+' · '+i.payment+' · '+i.controlepunten+' open controlepunten','badge'));card.append(info,button('Open werkplan',()=>openRecord(i.id)));list.append(card);}
}
async function openRecord(id){
 const result=await(await api('?id='+encodeURIComponent(id))).json();showRecord(result);msg('');
}
function showRecord(result){
 current=result.record;version=result.version;dirty=false;
 renderRevisions();
 $('panel').classList.add('hidden');$('editor').classList.remove('hidden');
 $('editor-title').textContent=current.opvangnaam;$('editor-meta').textContent=[current.naam,current.email,current.packageName||'Starter',current.status||'concept'].join(' · ');
 $('text-fields').replaceChildren();
 for(const [key,label] of Object.entries(fieldNames)){const l=node('label',label);l.htmlFor='field-'+key;const t=document.createElement('textarea');t.id='field-'+key;t.value=current[key]||'';t.required=true;t.maxLength=20000;if(['plaats','opvangnaam'].includes(key))t.style.minHeight='60px';$('text-fields').append(l,t);}
 $('checks').replaceChildren();
 for(const [i,text] of (current.controlepunten||[]).entries()){const l=node('label','','check'),c=document.createElement('input');c.type='checkbox';c.checked=!!current.checked?.[i];c.dataset.check=i;l.append(c,document.createTextNode(text));$('checks').append(l);}
 if(!current.controlepunten?.length)$('checks').append(node('p','Geen aanvullende controlepunten. Lees wel het hele werkplan na.'));
 $('mollie-state').textContent=current.mollie?.id?('Mollie '+(current.mollie.mode==='test'?'TEST (geen echt geld)':'LIVE')+' · Status: '+current.mollie.status+' · Bedrag: €'+(current.totalAmount||'49.00').replace('.',',')):'Geen Mollie-betaling aan deze aanvraag gekoppeld.';
 $('copy-payment').disabled=!current.mollie?.checkoutUrl||current.payment==='betaald';
 $('payment').disabled=true;
 $('reviewed').checked=!!current.reviewed;$('approved').checked=!!current.customerApproved;$('payment').value=current.payment||'onbetaald';$('notes').value=current.notes||'';
 $('intake-view').replaceChildren();
 if(current.intake){for(const [k,v]of Object.entries(current.intake)){if(['generator-trigger','form-name','privacy-akkoord'].includes(k))continue;$('intake-view').append(node('h3',k.replaceAll('_',' ')),node('pre',String(v)));}}
 else $('intake-view').append(node('p','Deze oudere aanvraag bevat hier geen originele intake. Bekijk de inzending in Netlify Forms.'));
 if(current.policyUploaded)$('intake-view').append(node('p','Bij deze aanvraag is een beleidsbestand geüpload. Open de oorspronkelijke bijlage via Netlify Forms om die te vergelijken.'));
 $('archive').textContent=current.archived?'Terugzetten uit archief':'Archiveren';$('final-download').disabled=!current.finalPdfKey;
}
function savedOnly(){if(dirty)throw Error('Sla uw wijzigingen eerst op.');}
async function action(name,extra={}){const result=await(await api('?id='+current.id,{action:name,version,...extra})).json();showRecord(result);msg(name==='finalize'?'Definitieve PDF is klaar.':name==='complete'?'Aanvraag afgerond.':'Wijzigingen opgeslagen.');}
$('edit-form').oninput=e=>{dirty=true;if(e.target.id.startsWith('field-')){$('reviewed').checked=false;$('approved').checked=false;}};
$('edit-form').onsubmit=e=>{e.preventDefault();run(()=>action('save',{values:Object.fromEntries(Object.keys(fieldNames).map(k=>[k,$('field-'+k).value])),checks:[...$('checks').querySelectorAll('input')].map(c=>c.checked),reviewed:$('reviewed').checked,customerApproved:$('approved').checked,payment:$('payment').value,notes:$('notes').value}));};
$('finalize').onclick=()=>run(async()=>{savedOnly();await action('finalize');});
$('complete').onclick=()=>run(async()=>{savedOnly();const evidence=prompt('Hoe en wanneer heeft u de definitieve Word- en PDF-bestanden geleverd?');if(evidence?.trim())await action('complete',{confirmed:true,evidence});});
$('archive').onclick=()=>run(async()=>{savedOnly();await action('archive',{archived:!current.archived});await load();});
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function pdf(final=false){savedOnly();const r=await api('?id='+current.id+'&format='+(final?'final':'pdf'));downloadBlob(await r.blob(),(final?'werkplan-':'concept-')+current.opvangnaam.replace(/[^a-z0-9]/gi,'-')+'.pdf');}
async function paymentRequest(checkOnly=false){savedOnly();const response=await fetch('/.netlify/functions/betaalverzoek',{method:'POST',headers:{'x-admin-token':token,'content-type':'application/json'},body:JSON.stringify({id:current.id,...(checkOnly?{action:'status'}:{})})});const result=await response.json();if(!response.ok)throw Error(result.error||'Betaalverzoek mislukt.');await openRecord(current.id);msg(checkOnly?'Betaalstatus gecontroleerd: '+result.status+'.':result.mode==='test'?'TEST-link klaar. Hiermee wordt geen echt geld betaald.':'Betaallink klaar. Kopieer hem en stuur hem na uw schriftelijke opdrachtbevestiging.');}
$('create-payment').onclick=()=>run(paymentRequest);
$('check-payment').onclick=()=>run(()=>paymentRequest(true));
$('copy-payment').onclick=()=>run(async()=>{savedOnly();if(!current.mollie?.checkoutUrl)throw Error('Maak eerst een betaalverzoek.');await navigator.clipboard.writeText(current.mollie.checkoutUrl);msg('Betaallink gekopieerd. Controleer eerst of TEST of LIVE bij de aanvraag staat en stuur hem daarna persoonlijk naar de klant.');});
$('word-download').onclick=()=>run(async()=>{savedOnly();const r=await api('?id='+current.id+'&format='+(current.finalPdfKey?'final-docx':'docx'));downloadBlob(await r.blob(),'werkplan-'+current.id+'.docx');});
$('concept-download').onclick=()=>run(()=>pdf());$('final-download').onclick=()=>run(()=>pdf(true));
$('export').onclick=()=>run(async()=>{savedOnly();downloadBlob(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}),'aanvraag-'+current.id+'.json');});
function mail(type){savedOnly();if(type==='delivery'&&!current.finalPdfKey)throw Error('Maak eerst een definitieve PDF.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email||''))throw Error('Controleer het e-mailadres van de klant.');
 const intro='Beste '+(current.naam||'gastouder')+',\n\n';
 const texts={review:'Bijgevoegd vindt u het conceptwerkplan voor '+current.opvangnaam+'. Wilt u controleren of dit uw eigen opvangpraktijk en het beleid van uw gastouderbureau goed beschrijft? Stuur uw aanvullingen of akkoord in een reactie.\n\n[Voeg de concept-PDF toe vóór verzending.]',payment:'Zoals besproken bedraagt de prijs voor uw '+(current.packageName||'Starter')+' werkplan €'+(current.totalAmount||'49.00').replace('.',',')+' inclusief 21% btw. De inbegrepen correctierondes volgen uw pakket.\n\n[Voeg de juiste factuur of het betaalverzoek toe en bevestig de leverdatum en voorwaarden.]',delivery:'Bijgevoegd vindt u uw definitieve pedagogisch werkplan voor '+current.opvangnaam+'. Bewaar het document en werk het bij wanneer uw opvang of bureaubeleid verandert.\n\n[Voeg de definitieve PDF én het Word-bestand toe vóór verzending.]'};
 const subject={review:'Uw conceptwerkplan ter controle',payment:'Betaling en afspraken voor uw werkplan',delivery:'Uw definitieve pedagogisch werkplan'}[type];
 location.href='mailto:'+encodeURIComponent(current.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(intro+texts[type]+'\n\nMet vriendelijke groet,\nLuca\nOpvangWerkPlan');
}
$('mail-review').onclick=()=>run(async()=>mail('review'));$('mail-payment').onclick=()=>run(async()=>mail('payment'));$('mail-delivery').onclick=()=>run(async()=>mail('delivery'));
$('open').onclick=()=>run(async()=>{token=$('token').value;await load();$('token').value='';msg('');});
$('token').onkeydown=e=>{if(e.key==='Enter')$('open').click();};
$('refresh').onclick=()=>run(load);$('search').oninput=render;$('filter').onchange=render;
$('back').onclick=()=>run(async()=>{if(dirty&&!confirm('Niet-opgeslagen wijzigingen verlaten?'))return;dirty=false;await load();});
$('logout').onclick=()=>{pendingReview=null;token='';current=null;data={};dirty=false;$('login').classList.remove('hidden');$('panel').classList.add('hidden');$('editor').classList.add('hidden');$('list').replaceChildren();$('text-fields').replaceChildren();$('intake-view').replaceChildren();$('failures').replaceChildren();msg('Uitgelogd.');};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

async function revisionCall(action,extra={}){
 const r=await fetch('/.netlify/functions/revisies?id='+current.id,{method:'POST',headers:{'x-admin-token':token,'content-type':'application/json'},body:JSON.stringify({action,version,...extra})});const result=await r.json();if(!r.ok)throw Error(result.error||'Bewerking mislukt.');return result;
}
function renderRevisions(){
 const r=current;const states=['Nieuwe aanvraag','Concept gegenereerd','Controlepunten open','Wachten op klant','Correcties ontvangen','Correcties ter goedkeuring','Nieuwe versie gereed','Wachten op klantakkoord','Definitief afgerond'];
 $('workflow-state').replaceChildren(...states.map(s=>{const o=node('option',s);o.value=s;o.disabled=['Nieuwe versie gereed','Definitief afgerond'].includes(s);return o;}));$('workflow-state').value=r.workflowStatus||(r.status==='afgerond'?'Definitief afgerond':(r.controlepunten||[]).some((_,i)=>!r.checked?.[i])?'Controlepunten open':'Concept gegenereerd');
 $('revision-state').textContent='Versie '+(r.revisionNumber||1)+' · '+(r.correctionsUsed||0)+' correctieronde(s) verwerkt (inbegrepen: '+(r.packageId==='bureau'?(r.bureauCorrectionLimit??'volgens offerte'):r.packageId==='compleet'?2:1)+') · '+(r.updatesUsed||0)+' actualisatie(s) verwerkt. '+(r.status==='concept'||!r.finalPdfKey?'CONCEPT — nog ter controle.':'Definitieve versie beschikbaar.');
 $('question-text').value=r.questionDraft?.text||'';$('question-text').readOnly=true;$('customer-feedback').value=r.clientFeedback||'';$('review-privacy').checked=false;$('manual-review').checked=false;
 $('sent-questions').replaceChildren();for(const q of r.sentQuestions||[]){const d=document.createElement('details');d.append(node('summary','Verzonden vragen · '+new Date(q.at).toLocaleString('nl-NL')),node('pre',q.text));$('sent-questions').append(d);}
 $('answer-links').replaceChildren(node('h3','Antwoorden bij controlepunten'));
 for(const [i,text]of (r.controlepunten||[]).entries()){const a=r.answerLinks?.find(a=>a.checkIndex===i);const box=node('article');box.append(node('strong',text),node('p',a?a.status+' — '+a.explanation:'Nog geen gekoppeld antwoord.'));$('answer-links').append(box);}
 $('correction-proposals').replaceChildren();for(const c of r.revisionProposal?.changes||[]){const box=node('article');const l=node('label','','check'),check=document.createElement('input');check.type='checkbox';check.dataset.field=c.field;check.checked=false;l.append(check,document.createTextNode('Goedkeuren: '+(fieldNames[c.field]||c.field)));box.append(l,node('h4','Bestaande tekst'),node('pre',c.existing),node('h4','Voorgestelde tekst'),node('pre',c.proposed),node('p','Bron uit klantmail: '+c.evidence));if(c.manualReview)box.append(node('p','Handmatige controle nodig: onduidelijkheid of tegenstrijdigheid.','warning'));$('correction-proposals').append(box);}
 if(r.revisionProposal&&!r.revisionProposal.changes.length)$('correction-proposals').append(node('p','Geen concrete tekstwijzigingen gevonden. Bekijk de open punten en aanvullende vragen.'));
 $('bureau-rounds').value=r.bureauCorrectionLimit??'';$('bureau-agreement').value=r.bureauAgreement||'';
 $('version-history').replaceChildren();for(const v of [...(r.versionHistory||[])].reverse()){const box=node('article');box.append(node('strong','Versie '+v.number+' · '+new Date(v.at).toLocaleString('nl-NL')),node('p',v.reason));for(const format of ['pdf','docx'])box.append(button('Download '+format.toUpperCase(),async()=>{const response=await fetch('/.netlify/functions/revisies?id='+current.id+'&versionKey='+encodeURIComponent(v.key)+'&format='+format,{headers:{'x-admin-token':token}});if(!response.ok)throw Error('Versie kon niet worden geladen.');downloadBlob(await response.blob(),'versie-'+v.number+'.'+format);}));$('version-history').append(box);}
}
async function startReview(action){
 savedOnly();const id=current.id;
 if(pendingReview&&pendingReview.id!==id)pendingReview=null;
 let result=pendingReview?.result;
 if(result&&pendingReview.action!==action)throw Error('Er loopt al een analyse. Controleer eerst de status van die taak.');
 if(!result){result=await revisionCall(action,{privacyConfirmed:$('review-privacy').checked,feedback:$('customer-feedback').value});version=result.version;pendingReview={id,action,result,started:false};}
 if(result.worker&&!pendingReview.started){
  const started=await fetch('/.netlify/functions/revisie-worker',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({...result.task,taskToken:result.taskToken})});
  if(started.status!==202)throw Error('De analysetaak is opgeslagen, maar starten is geblokkeerd (HTTP '+started.status+'). Bij 401: open de preview via Netlify en meld u opnieuw aan. Klik daarna nogmaals op dezelfde analyseknop; er wordt geen nieuwe taak aangemaakt.');
  pendingReview.started=true;
 }
 $('review-progress').textContent='Analyse op de achtergrond gestart. Laat dit venster open. Taak: '+result.jobId;
 for(let i=0;i<180;i++){
  await new Promise(r=>setTimeout(r,2500));if(!current||current.id!==id)return;
  const response=await fetch('/.netlify/functions/revisies?id='+id+'&job='+result.jobId,{credentials:'same-origin',headers:{'x-admin-token':token}});
  if(!response.ok)throw Error('Taakstatus niet bereikbaar (HTTP '+response.status+'). Klik opnieuw op dezelfde analyseknop om deze taak te controleren.');
  const job=await response.json();
  if(job.status==='fout'){pendingReview=null;await openRecord(id);throw Error(job.error);}
  if(job.status==='gereed'){pendingReview=null;await openRecord(id);$('review-progress').textContent='Analyse gereed. Controleer de voorstellen; er is niets automatisch toegepast.';return;}
 }
 throw Error('De analyse duurt langer dan verwacht. Klik opnieuw op dezelfde analyseknop voor deze taak of heropen de aanvraag.');
}
$('questions-generate').onclick=()=>run(()=>startReview('questions'));
$('analyse-corrections').onclick=()=>run(()=>startReview('analyse'));
$('questions-edit').onclick=()=>{$('question-text').readOnly=false;$('question-text').focus();};
$('questions-copy').onclick=()=>run(async()=>{await navigator.clipboard.writeText($('question-text').value);msg('E-mail gekopieerd.');});
$('questions-save').onclick=()=>run(async()=>{savedOnly();showRecord(await revisionCall('saveMail',{text:$('question-text').value}));msg('E-mail opgeslagen.');});
$('questions-send').onclick=()=>run(async()=>{savedOnly();if(!confirm('De gecontroleerde e-mail nu naar '+current.email+' versturen?'))return;const saved=await revisionCall('saveMail',{text:$('question-text').value});version=saved.version;showRecord(await revisionCall('sendMail'));msg('E-mail door de mailserver geaccepteerd en bij deze aanvraag vastgelegd.');});
$('apply-corrections').onclick=()=>run(async()=>{savedOnly();const selected=[...$('correction-proposals').querySelectorAll('input:checked')].map(c=>c.dataset.field);const result=await revisionCall('apply',{selected,kind:$('round-kind').value,manualConfirmed:$('manual-review').checked});showRecord(result);msg('Nieuwe conceptversie gereed. Word en PDF zijn beschikbaar. Klantakkoord is niet geregistreerd.');});
$('workflow-save').onclick=()=>run(async()=>{savedOnly();showRecord(await revisionCall('setWorkflow',{status:$('workflow-state').value}));msg('Voortgang opgeslagen.');});

$('bureau-save').onclick=()=>run(async()=>{savedOnly();showRecord(await revisionCall('bureauLimit',{limit:Number($('bureau-rounds').value),agreement:$('bureau-agreement').value}));msg('Offerteafspraak opgeslagen.');});
