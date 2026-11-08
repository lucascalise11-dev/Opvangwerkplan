export function paymentConfirmed(r){return r.payment==='betaald'&&r.mollie?.mode==='live'&&r.mollie?.status==='paid';}
export function flow(r,test=false){
 const open=(r.controlepunten||[]).filter((_,i)=>!r.checked?.[i]).length;
 const paid=paymentConfirmed(r)||(test&&r.simulation?.payment===true);
 const reviewed=r.reviewed===true&&!open,approved=r.customerApproved===true,final=!!r.finalPdfKey;
 const done=!!r.deliveredAt&&r.status==='afgerond';
 const step=done?6:!reviewed?3:!approved||!paid?5:6;
 const status=done?'Afgerond':reviewed&&approved&&paid?'Klaar voor levering':r.workflowStatus==='Wachten op klant'?'Wachten op klant':r.workflowStatus==='Nieuwe versie gereed'?'Opnieuw controleren':'Controle vereist';
 return {open,paid,reviewed,approved,final,done,step,status,testPayment:!paymentConfirmed(r)&&paid,next:done?'Bekijken':!reviewed?'Werkplan controleren':!approved?'Registreer klantakkoord':!paid?'Betaling controleren':!final?'Maak definitieve Word/PDF':'Levering bevestigen'};
}
