(() => {
 const steps=[...document.querySelectorAll('.step')],progress=document.getElementById('progress'),form=document.getElementById('intakeForm'),status=document.getElementById('form-status');
 let current=0,submitting=false;
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
   const response=await fetch(form.action,{method:'POST',body:new FormData(form)});
   if(!response.ok)throw Error('De website heeft de inzending niet bevestigd.');
   location.assign('/intake-ontvangen.html');
  }catch{
   status.textContent='De verzending is niet bevestigd. Uw antwoorden staan nog in dit venster. Neem contact op als u twijfelt of de aanvraag is ontvangen, zodat u niet dubbel indient.';
   button.disabled=false;button.textContent='Opnieuw proberen';submitting=false;
  }
 };
})();
