const $=id=>document.getElementById(id);
const fieldNames={opvangnaam:'Naam van de opvang',plaats:'Plaats',opvang:'Over de opvang',werkwijze:'Werkwijze en wennen',activiteiten:'Activiteiten en speelmaterialen',speelruimte:'Binnen- en buitenspeelruimte',emotionele_veiligheid:'Emotionele veiligheid',persoonlijke_competenties:'Persoonlijke competenties',sociale_competenties:'Sociale competenties',normen_waarden:'Normen en waarden',ontwikkeling:'Ontwikkeling volgen',bureau_beleid:'Beleid van het gastouderbureau',actualiseren:'Actueel houden'};
let token='', data={},current=null,version='',dirty=false,busy=false;
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
 data=await(await api()).json();$('login').classList.add('hidden');$('panel').classList.remove('hidden');$('editor').classList.add('hidden');current=null;render();
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
 for(const i of items){const card=node('article','','card'),info=node('div');info.append(node('h2',i.opvangnaam||'Opvang'),node('p',[i.naam,i.email,new Date(i.createdAt).toLocaleString('nl-NL')].filter(Boolean).join(' · '),'meta'),node('span',i.status+' · '+i.payment+' · '+i.controlepunten+' open controlepunten','badge'));card.append(info,button('Open werkplan',()=>openRecord(i.id)));list.append(card);}
}
async function openRecord(id){
 const result=await(await api('?id='+encodeURIComponent(id))).json();showRecord(result);msg('');
}
function showRecord(result){
 current=result.record;version=result.version;dirty=false;
 $('panel').classList.add('hidden');$('editor').classList.remove('hidden');
 $('editor-title').textContent=current.opvangnaam;$('editor-meta').textContent=[current.naam,current.email,current.status||'concept'].join(' · ');
 $('text-fields').replaceChildren();
 for(const [key,label] of Object.entries(fieldNames)){const l=node('label',label);l.htmlFor='field-'+key;const t=document.createElement('textarea');t.id='field-'+key;t.value=current[key]||'';t.required=true;t.maxLength=20000;if(['plaats','opvangnaam'].includes(key))t.style.minHeight='60px';$('text-fields').append(l,t);}
 $('checks').replaceChildren();
 for(const [i,text] of (current.controlepunten||[]).entries()){const l=node('label','','check'),c=document.createElement('input');c.type='checkbox';c.checked=!!current.checked?.[i];c.dataset.check=i;l.append(c,document.createTextNode(text));$('checks').append(l);}
 if(!current.controlepunten?.length)$('checks').append(node('p','Geen aanvullende controlepunten. Lees wel het hele werkplan na.'));
 $('mollie-state').textContent=current.mollie?.id?('Mollie '+(current.mollie.mode==='test'?'TEST (geen echt geld)':'LIVE')+' · Status: '+current.mollie.status+' · Bedrag: €49'):'Geen Mollie-betaling aan deze aanvraag gekoppeld.';
 $('copy-payment').disabled=!current.mollie?.checkoutUrl||current.payment==='betaald';
 $('payment').disabled=!!current.mollie?.id;
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
$('complete').onclick=()=>run(async()=>{savedOnly();if(confirm('Is de definitieve PDF aan de klant geleverd?'))await action('complete');});
$('archive').onclick=()=>run(async()=>{savedOnly();await action('archive',{archived:!current.archived});await load();});
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function pdf(final=false){savedOnly();const r=await api('?id='+current.id+'&format='+(final?'final':'pdf'));downloadBlob(await r.blob(),(final?'werkplan-':'concept-')+current.opvangnaam.replace(/[^a-z0-9]/gi,'-')+'.pdf');}
async function paymentRequest(){savedOnly();const response=await fetch('/.netlify/functions/betaalverzoek',{method:'POST',headers:{'x-admin-token':token,'content-type':'application/json'},body:JSON.stringify({id:current.id})});const result=await response.json();if(!response.ok)throw Error(result.error||'Betaalverzoek mislukt.');await openRecord(current.id);msg(result.mode==='test'?'TEST-link klaar. Hiermee wordt geen echt geld betaald.':'Betaallink klaar. Kopieer hem en stuur hem na uw schriftelijke opdrachtbevestiging.');}
$('create-payment').onclick=()=>run(paymentRequest);
$('check-payment').onclick=()=>run(paymentRequest);
$('copy-payment').onclick=()=>run(async()=>{savedOnly();if(!current.mollie?.checkoutUrl)throw Error('Maak eerst een betaalverzoek.');await navigator.clipboard.writeText(current.mollie.checkoutUrl);msg('Betaallink gekopieerd. Controleer eerst of TEST of LIVE bij de aanvraag staat en stuur hem daarna persoonlijk naar de klant.');});
$('concept-download').onclick=()=>run(()=>pdf());$('final-download').onclick=()=>run(()=>pdf(true));
$('export').onclick=()=>run(async()=>{savedOnly();downloadBlob(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}),'aanvraag-'+current.id+'.json');});
function mail(type){savedOnly();if(type==='delivery'&&!current.finalPdfKey)throw Error('Maak eerst een definitieve PDF.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email||''))throw Error('Controleer het e-mailadres van de klant.');
 const intro='Beste '+(current.naam||'gastouder')+',\n\n';
 const texts={review:'Bijgevoegd vindt u het conceptwerkplan voor '+current.opvangnaam+'. Wilt u controleren of dit uw eigen opvangpraktijk en het beleid van uw gastouderbureau goed beschrijft? Stuur uw aanvullingen of akkoord in een reactie.\n\n[Voeg de concept-PDF toe vóór verzending.]',payment:'Zoals besproken bedraagt de prijs voor uw werkplan €49 inclusief btw. Eén correctieronde is inbegrepen.\n\n[Voeg de juiste factuur of het betaalverzoek toe en bevestig de leverdatum en voorwaarden.]',delivery:'Bijgevoegd vindt u uw definitieve pedagogisch werkplan voor '+current.opvangnaam+'. Bewaar het document en werk het bij wanneer uw opvang of bureaubeleid verandert.\n\n[Voeg de definitieve PDF toe vóór verzending.]'};
 const subject={review:'Uw conceptwerkplan ter controle',payment:'Betaling en afspraken voor uw werkplan',delivery:'Uw definitieve pedagogisch werkplan'}[type];
 location.href='mailto:'+encodeURIComponent(current.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(intro+texts[type]+'\n\nMet vriendelijke groet,\nLuca\nOpvangWerkPlan');
}
$('mail-review').onclick=()=>run(async()=>mail('review'));$('mail-payment').onclick=()=>run(async()=>mail('payment'));$('mail-delivery').onclick=()=>run(async()=>mail('delivery'));
$('open').onclick=()=>run(async()=>{token=$('token').value;await load();$('token').value='';msg('');});
$('token').onkeydown=e=>{if(e.key==='Enter')$('open').click();};
$('refresh').onclick=()=>run(load);$('search').oninput=render;$('filter').onchange=render;
$('back').onclick=()=>run(async()=>{if(dirty&&!confirm('Niet-opgeslagen wijzigingen verlaten?'))return;dirty=false;await load();});
$('logout').onclick=()=>{token='';current=null;data={};dirty=false;$('login').classList.remove('hidden');$('panel').classList.add('hidden');$('editor').classList.add('hidden');$('list').replaceChildren();$('text-fields').replaceChildren();$('intake-view').replaceChildren();$('failures').replaceChildren();msg('Uitgelogd.');};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
