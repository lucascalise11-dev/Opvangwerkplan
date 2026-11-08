// Progressive dashboard layout. Existing actions and authenticated APIs remain in admin.js.
const captions=['Intake ontvangen','Werkplan gegenereerd','Werkplan controleren','Klantvragen en correcties','Betaling en klantakkoord','Definitief leveren'];
let activePane='document',pendingWrite=null,lastSavedResult=null;
const stage=document.createElement('section');stage.className='case-summary';stage.innerHTML='<ol id="case-steps" aria-label="Voortgang"></ol><div class="case-next"><div><p id="case-state"></p><h3 id="case-next-title"></h3><p id="case-missing"></p></div><button id="next-action" type="button"></button></div>';
$('editor-meta').after(stage);
const tabs=document.createElement('nav');tabs.className='case-tabs';tabs.setAttribute('aria-label','Aanvraagonderdelen');
const panes={};for(const [key,title]of Object.entries({document:'Werkplan',questions:'Klantvragen',feedback:'Klantreactie',finish:'Betaling en levering'})){const b=button(title,async()=>selectPane(key));b.dataset.pane=key;tabs.append(b);const s=document.createElement('section');s.id='pane-'+key;s.className='case-pane';s.hidden=key!==activePane;panes[key]=s;}
stage.after(tabs,...Object.values(panes));
const more=document.createElement('details');more.className='case-more';more.append(node('summary','Meer opties'));$('editor').append(more);
const docHead=node('div','','doc-toolbar');const versionLine=node('h3','','version-line');versionLine.id='current-version';docHead.append(versionLine);
const reading=document.createElement('article');reading.id='document-reading';reading.className='document-reading';
panes.document.append(docHead,reading,button('Werkplan bewerken',async()=>{const editing=$('edit-form').hidden;$('edit-form').hidden=!editing;reading.hidden=editing;}));
$('edit-form').hidden=true;panes.document.append($('edit-form'));
// Separate the document text editor from checks/payment settings without replacing IDs.
const checkArea=document.createElement('section');checkArea.className='review-checks';checkArea.append(node('h3','Inhoudelijke controle'));
checkArea.append($('checks'),$('reviewed').closest('label'));panes.document.append(checkArea,button('Controle vastleggen',confirmReview));
const saveButton=$('edit-form').querySelector('[type=submit]');saveButton.textContent='Wijzigingen opslaan';
// Preserve form structure; checks can live outside the editor because save uses their IDs.
for(const n of [$('approved').closest('label'),$('payment').previousElementSibling,$('payment'),$('mollie-state'),$('create-payment').parentElement,$('finalize'),$('complete')])if(n)more.append(n);
const downloads=node('div','','doc-toolbar');downloads.append($('concept-download'),$('word-download'),$('final-download'));panes.document.append(downloads);
const rev=$('revision-panel');rev.querySelectorAll('h2,h3').forEach(n=>n.hidden=true);
const privacy=$('review-privacy').closest('label');const privacyNote=node('p','Gebruik uitsluitend informatie zonder persoonsgegevens van kinderen. Controleer conceptmails en correctievoorstellen altijd zelf.','muted');
panes.questions.append(privacyNote,privacy,$('questions-generate'),$('question-text'),$('questions-edit'),$('questions-save'),$('questions-copy'),$('questions-send'),$('sent-questions'));
$('questions-generate').textContent='Genereer klantvragen';$('questions-send').textContent='Verstuur na bevestiging';
panes.feedback.append(node('h3','Reactie van de klant'),$('customer-feedback'),$('analyse-corrections'),$('answer-links'),$('correction-proposals'),$('round-kind'),$('manual-review').closest('label'),$('apply-corrections'));
const taskProgress=$('review-progress');stage.append(taskProgress);
const delivery=document.createElement('section');delivery.innerHTML='<h3>Betaling en klantakkoord</h3><dl class="confirmation-grid"><dt>Betaling</dt><dd id="simple-payment"></dd><dt>Klantakkoord</dt><dd id="simple-approval"></dd></dl><label for="approval-proof">Waar en wanneer ontving u het klantakkoord?</label><textarea id="approval-proof" maxlength="3000" placeholder="Bijvoorbeeld: akkoord per e-mail op 8 november, apart bewaard."></textarea><button type="button" id="register-approval">Klantakkoord registreren</button><div class="buttons" id="simple-pay-buttons"></div><details id="simulation-options"><summary>Alleen voor fictieve tests</summary><p>Dit registreert uitsluitend een testsimulatie. Er vindt geen betaling plaats.</p><button type="button" id="simulate-payment">Testbetaling bevestigen</button></details><h3>Definitieve documenten en levering</h3><p id="delivery-readiness"></p><button type="button" id="make-final">Maak definitieve Word/PDF</button><div class="buttons" id="delivery-downloads"></div><label for="delivery-proof">Hoe en wanneer heeft u beide bestanden geleverd?</label><textarea id="delivery-proof" maxlength="3000" placeholder="Bijvoorbeeld: Word en PDF per e-mail verzonden op …"></textarea><button type="button" id="confirm-delivery">Levering bevestigen</button>';
panes.finish.append(delivery);$('simple-pay-buttons').append(button('Maak betaallink',paymentRequest),button('Controleer betaalstatus',()=>paymentRequest(true)),button('Kopieer betaallink',async()=>{if(!current.mollie?.checkoutUrl)throw Error('Er is nog geen betaallink.');await navigator.clipboard.writeText(current.mollie.checkoutUrl);}));
more.append($('notes').previousElementSibling,$('notes'));for(const d of [...$('editor').querySelectorAll(':scope > details')])if(d!==more)more.append(d);$('edit-form').querySelectorAll('h2').forEach(h=>h.hidden=true);
$('delivery-downloads').append(button('Definitieve PDF downloaden',()=>pdf(true)),button('Definitieve Word downloaden',async()=>{savedOnly();const r=await api('?id='+current.id+'&format=final-docx');downloadBlob(await r.blob(),'werkplan-'+current.id+'.docx');}),button('Leveringsmail openen',async()=>mail('delivery')));
const intakeDetails=$('intake-view').closest('details');more.append(intakeDetails,rev,$('export'),$('archive'));
// Existing version downloads, workflow override and bureau agreements remain available.
rev.hidden=false;for(const child of [...rev.children])if(child.tagName==='LABEL'&&!child.contains($('workflow-state')))child.hidden=true;
const history=document.createElement('details');history.append(node('summary','Vorige versies'),$('version-history'));panes.document.append(history);
const originalShowRecord=showRecord;showRecord=function(result){originalShowRecord(result);lastSavedResult=result;renderCase();selectPane(activePane);};
function isTest(){return data.diagnostics?.environment?.production===false;}
function caseFlow(r){const open=(r.controlepunten||[]).filter((_,i)=>!r.checked?.[i]).length,paid=r.payment==='betaald'&&r.mollie?.mode==='live'&&r.mollie?.status==='paid'||isTest()&&r.simulation?.payment===true,reviewed=r.reviewed===true&&!open,approved=r.customerApproved===true,done=r.status==='afgerond'&&!!r.deliveredAt;return {open,paid,reviewed,approved,done,final:!!r.finalPdfKey};}
function selectPane(key){activePane=key;for(const [k,p]of Object.entries(panes))p.hidden=k!==key;for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-current',String(b.dataset.pane===key));}
function renderCase(){
 const r=current,f=caseFlow(r),versionNumber=r.revisionNumber||1;
 $('current-version').textContent='Versie '+versionNumber+' — '+(r.finalPdfKey?'Huidige definitieve versie':'Huidig concept');
 reading.replaceChildren(...Object.entries(fieldNames).map(([k,label])=>{const s=document.createElement('section');s.append(node('h3',label),node('p',r[k]||'Nog niet ingevuld.'));return s;}));
 $('edit-form').hidden=true;reading.hidden=false;
 $('case-state').textContent=f.done?'Afgerond':f.reviewed&&f.approved&&f.paid?'Klaar voor levering':r.workflowStatus==='Wachten op klant'?'Wachten op klant':r.workflowStatus==='Nieuwe versie gereed'?'Opnieuw controleren':'Controle vereist';
 const waiting=r.workflowStatus==='Wachten op klant',proposals=!!r.revisionProposal?.changes?.length;const next=f.done?'Bekijk definitieve documenten':proposals?'Beoordeel correcties':waiting?'Bekijk klantvragen':!f.reviewed?'Werkplan controleren':!f.approved?'Registreer klantakkoord':!f.paid?'Betaling controleren':!f.final?'Maak definitieve Word/PDF':'Levering bevestigen';
 $('case-next-title').textContent=next;$('next-action').textContent=next;$('next-action').onclick=()=>run(async()=>{selectPane(proposals?'feedback':waiting?'questions':f.done||f.reviewed?'finish':'document');panes[activePane].scrollIntoView({block:'start'});});
 $('case-missing').textContent=f.done?'Levering is door u bevestigd.':f.open?f.open+' controlepunt(en) vragen nog uw beoordeling.':'Openstaand: '+[!f.reviewed?'inhoudelijke controle':'',!f.approved?'klantakkoord':'',!f.paid?'betaling':'',!f.final?'definitieve bestanden':''].filter(Boolean).join(', ');
 const completed=[true,true,f.reviewed,!(r.controlepunten||[]).some((_,i)=>!r.checked?.[i])&&!r.revisionProposal,f.paid&&f.approved,f.done];
 $('case-steps').replaceChildren(...captions.map((t,i)=>{const li=node('li',t);li.className=completed[i]?'done':'';if(!completed[i]&&i===(f.reviewed?4:2))li.setAttribute('aria-current','step');return li;}));
 $('simple-payment').textContent=r.simulation?.payment&&isTest()?'TEST — betaling gesimuleerd, geen echt geld':f.paid?'Bevestigd via Mollie':r.mollie?.id?'Betaalverzoek: '+r.mollie.status:'Nog geen bevestigde betaling';$('simple-approval').textContent=f.approved?'Geregistreerd: '+(r.approvalEvidence||'apart bevestigd'):'Nog niet geregistreerd';
 $('approval-proof').value=r.approvalEvidence||'';$('delivery-proof').value=r.deliveryEvidence||'';$('simulation-options').hidden=!isTest();$('delivery-readiness').textContent=f.reviewed&&f.approved&&f.paid?'De noodzakelijke controles zijn bevestigd.':'Nog nodig: '+[!f.reviewed?'inhoudelijke controle':'',!f.approved?'klantakkoord':'',!f.paid?'betaling':''].filter(Boolean).join(', ');
 for(const [i,label]of [...$('version-history').querySelectorAll('article strong')].entries()){const v=[...(r.versionHistory||[])].reverse()[i];label.textContent='Versie '+v.number+' — Vorige versie · '+new Date(v.at).toLocaleString('nl-NL');}
 for(const p of $('version-history').querySelectorAll('article p'))p.textContent=p.textContent.replace('correction','correctie').replace('actualisatie','actualisatie');
}
async function writeCall(route,body){
 const id=current.id;const fingerprint=JSON.stringify({route,id,...body});if(!pendingWrite||pendingWrite.fingerprint!==fingerprint)pendingWrite={fingerprint,operationId:crypto.randomUUID(),body:{...body,version},route,id};
 const task=pendingWrite;let response;
 try{response=await fetch('/.netlify/functions/'+route+'?id='+id,{method:'POST',headers:{'x-admin-token':token,'content-type':'application/json'},body:JSON.stringify({...task.body,operationId:task.operationId,...(route==='afhandeling'?{id}: {})})});}catch{
  let check=null;try{check=await(await api('?id='+id)).json();}catch{}
  if(check?.record.operations?.some(o=>o.id===task.operationId)){pendingWrite=null;return check;}
  throw Error('De verbinding is onderbroken. Uw invoer blijft staan. Probeer dezelfde handeling opnieuw; er wordt geen tweede versie of ronde gemaakt.');
 }
 const result=await response.json().catch(()=>({}));if(!response.ok){if(response.status>=500){let check=null;try{check=await(await api('?id='+id)).json();}catch{}if(check?.record.operations?.some(o=>o.id===task.operationId)){pendingWrite=null;return check;}}if(response.status<500)pendingWrite=null;throw Error(result.error||'De server heeft deze handeling niet bevestigd. Uw invoer blijft staan.');}pendingWrite=null;return result;
}
// Stable operation IDs cover document saves and approved corrections.
action=async function(name,extra={}){const result=await writeCall('concepten',{action:name,...extra});showRecord(result);msg(name==='save'?'Versie '+(current.revisionNumber||1)+' is opgeslagen. Dit is de nieuwste conceptversie.':'Handeling bevestigd.');};
const originalRevisionCall=revisionCall;revisionCall=async function(action,extra={}){return action==='apply'?writeCall('revisies',{action,...extra}):originalRevisionCall(action,extra);};
async function confirmReview(){savedOnly();if(!confirm('Heeft u het hele werkplan en alle open punten inhoudelijk gecontroleerd?'))return;const result=await writeCall('afhandeling',{action:'review',confirmed:true,checks:[...$('checks').querySelectorAll('input')].map(x=>x.checked)});showRecord(result);msg('Inhoudelijke controle bevestigd.');}
$('register-approval').onclick=()=>run(async()=>{savedOnly();const evidence=$('approval-proof').value;if(!confirm('Bevestigt u dat de klant akkoord heeft gegeven en dat u dit bewijs bewaart?'))return;showRecord(await writeCall('afhandeling',{action:'approval',confirmed:true,evidence}));msg('Klantakkoord expliciet geregistreerd.');});
$('simulate-payment').onclick=()=>run(async()=>{savedOnly();if(!confirm('Alleen een fictieve betaling registreren in de testomgeving?'))return;showRecord(await writeCall('afhandeling',{action:'testPayment',confirmed:true}));msg('TESTbetaling gesimuleerd. Geen echte betaling uitgevoerd.');});
$('make-final').onclick=()=>run(async()=>{savedOnly();showRecord(await writeCall('afhandeling',{action:'final'}));msg('Definitieve Word en PDF zijn gereed. Levering is nog niet bevestigd.');});
$('confirm-delivery').onclick=()=>run(async()=>{savedOnly();const evidence=$('delivery-proof').value;if(!confirm('Heeft u de definitieve Word en PDF daadwerkelijk aan de klant geleverd? In de testomgeving bevestigt u uitsluitend fictieve levering.'))return;showRecord(await writeCall('afhandeling',{action:'delivered',confirmed:true,evidence}));msg('Levering bevestigd. Aanvraag afgerond.');});
// Keep the review checks inside the explicit document save, without allowing auto-approval.
$('checks').onchange=()=>{};$('reviewed').onchange=()=>{};
const attention=node('p','','attention');attention.id='attention-count';$('panel').prepend(attention);
$('filter').replaceChildren(...Object.entries({active:'Alle actieve aanvragen',new:'Nieuwe aanvragen',action:'Actie vereist',waiting:'Wachten op klant',ready:'Klaar voor levering',done:'Afgerond',archive:'Archief'}).map(([v,t])=>{const o=node('option',t);o.value=v;return o;}));
const oldRender=render;render=function(){
 const filter=$('filter').value,q=$('search').value.toLowerCase();const records=data.items||[];
 const bucket=i=>i.view?.done?'done':i.view?.status==='Klaar voor levering'?'ready':i.workflowStatus==='Wachten op klant'?'waiting':'action';
 $('attention-count').textContent=(records.filter(i=>!i.archived&&['action','ready'].includes(bucket(i))).length+(data.errors||[]).filter(e=>!e.archived).length)+' aanvragen vragen uw aandacht.';
 $('list').replaceChildren();$('failures').replaceChildren();
 for(const j of ['active','new','action'].includes(filter)?data.jobs||[]:[])$('failures').append(node('p',(j.opvangnaam||'Aanvraag')+' — '+(j.status==='wachtrij'?'Nieuw: intake ontvangen':'Werkplan wordt gemaakt')+'. De status wordt automatisch bijgewerkt.','notice'));
 for(const e of data.errors||[]){if(e.archived&&filter!=='archive')continue;$('failures').append(node('p',(e.opvangnaam||'Aanvraag')+' — '+e.error,'status'));}
 const items=records.filter(i=>(filter==='archive'?i.archived:!i.archived)&&(filter==='archive'||filter==='active'&&!i.view?.done||bucket(i)===filter)&&[i.opvangnaam,i.naam,i.email].join(' ').toLowerCase().includes(q));
 for(const i of items){const card=node('article','','card'),info=node('div');info.append(node('h2',i.opvangnaam),node('p',i.naam||'Klant','meta'),node('p',(i.packageName||'Starter')+' · '+new Date(i.createdAt).toLocaleString('nl-NL'),'meta'),node('p','Betaling: '+(i.testPayment?'TEST — gesimuleerd':i.payment==='betaald'?'Bevestigd':i.payment==='betaalverzoek'?'Betaalverzoek verstuurd':'Nog niet bevestigd'),'meta'),node('span',i.view?.status||i.workflowStatus||'Controle vereist','badge'));card.append(info,button('Open aanvraag',()=>openRecord(i.id)));$('list').append(card);}
 if(!items.length)$('list').append(node('p',filter==='new'?'Nieuwe intakes verschijnen hierboven tijdens het maken van het werkplan.':'Geen aanvragen in deze selectie.'));
};
$('search').oninput=render;$('filter').onchange=render;
setInterval(async()=>{if(!token||busy||dirty||current||$('panel').classList.contains('hidden'))return;try{data=await(await api()).json();render();}catch{}},15000);
