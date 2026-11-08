(() => {
 const steps=[...document.querySelectorAll('.step')],progress=document.getElementById('progress'),form=document.getElementById('intakeForm'),status=document.getElementById('form-status');
 const choice=document.getElementById('pakket'),summary=document.getElementById('package-summary'),extra=document.getElementById('extra-intake');
 const query=new URLSearchParams(location.search).get('pakket');
 if(['starter','compleet'].includes(query))choice.value=query;
 function syncPackage(){const full=choice.value==='compleet';summary.textContent=full?'Compleet: persoonlijke intake, extra uitwerking, Word en PDF, twee correctierondes in totaal en één beperkte actualisatie binnen twaalf maanden.':'Starter: persoonlijk gecontroleerd werkplan, Word en PDF en één correctieronde.';extra.hidden=!full;extra.querySelectorAll('textarea').forEach(t=>t.disabled=!full);}
 choice.addEventListener('change',syncPackage);syncPackage();
 let current=0,submitting=false,pendingTest=null;
 form.noValidate=true;
 form.querySelectorAll('textarea').forEach(t=>t.maxLength=6000);
 form.querySelectorAll('input[type=text],input[type=email]').forEach(t=>t.maxLength=250);
 function show(n){current=n;steps.forEach((s,i)=>s.classList.toggle('active',i===n));progress.value=n+1;steps[n].querySelector('h2').tabIndex=-1;steps[n].querySelector('h2').focus();window.scrollTo({top:0,behavior:'smooth'});}
 function validate(n){for(const field of steps[n].querySelectorAll('input,textarea,select'))if(!field.checkValidity()){show(n);field.reportValidity();return false;}return true;}
 document.querySelectorAll('.next').forEach(b=>b.onclick=()=>{if(validate(current))show(Math.min(current+1,4));});
 document.querySelectorAll('.prev').forEach(b=>b.onclick=()=>show(Math.max(current-1,0)));
 const file=form.elements.bureau_beleid_bestand;
 file.onchange=()=>{const f=file.files[0];file.setCustomValidity(f&&(!f.name.toLowerCase().endsWith('.pdf')||f.size>6*1024*1024)?'Kies een PDF van maximaal 6 MB. U kunt de belangrijke beleidstekst ook in het tekstvak plakken.':'');};
 form.onsubmit=async e=>{
  e.preventDefault();if(submitting)return;
  for(let i=0;i<steps.length;i++)if(!validate(i))return;
  if(current<4){show(current+1);return;}
  submitting=true;const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Intake versturen…';status.textContent='Uw intake wordt verstuurd. Laat deze pagina even open.';
  try{
   const testMode=new URL(form.action).pathname==='/.netlify/functions/test-intake';
   if(testMode){
    if(!pendingTest){const response=await fetch(form.action,{method:'POST',body:new FormData(form),credentials:'same-origin'});const payload=await response.json().catch(()=>({}));if(!response.ok)throw Error(payload.error||'De testintake kon niet worden opgeslagen (HTTP '+response.status+').');pendingTest=payload;}
    const job=pendingTest;
    if(!job.started){const started=await fetch('/.netlify/functions/test-process-background',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:job.id,token:job.token})});if(started.status!==202)throw Error('Testintake '+job.id+' is opgeslagen, maar de achtergrondtaak is geblokkeerd (HTTP '+started.status+'). Bij 401: open de preview opnieuw via Netlify en meld u aan. Gebruik daarna Status opnieuw controleren.');job.started=true;}
    let complete=false;
    for(let i=0;i<180;i++){status.textContent='Testaanvraag '+job.id+' is opgeslagen. Concept wordt gemaakt…';const response=await fetch('/.netlify/functions/test-intake?id='+encodeURIComponent(job.id),{credentials:'same-origin',headers:{'x-intake-token':job.token}});const info=await response.json().catch(()=>({}));if(!response.ok)throw Error(info.error||'Status niet bereikbaar (HTTP '+response.status+'). Uw aanvraag is al opgeslagen.');if(info.status==='fout')throw Error('Testaanvraag '+job.id+': '+info.error+' Bekijk deze aanvraag in het testdashboard.');if(info.status==='gereed'){complete=true;break;}await new Promise(r=>setTimeout(r,2000));}
    if(!complete)throw Error('Testaanvraag '+job.id+' duurt langer dan verwacht. Controleer de status opnieuw of open het testdashboard; dien niet opnieuw in.');
   }else{
    const response=await fetch(form.action,{method:'POST',body:new FormData(form)});
    if(!response.ok)throw Error('De website heeft de inzending niet bevestigd (HTTP '+response.status+').');
   }
   location.assign('/intake-ontvangen.html?pakket='+encodeURIComponent(choice.value));
  }catch(error){
   status.textContent=error.message+' Uw antwoorden blijven in dit venster staan.';
   button.disabled=false;button.textContent=pendingTest?'Status opnieuw controleren':'Opnieuw proberen';submitting=false;
  }
 };
})();
