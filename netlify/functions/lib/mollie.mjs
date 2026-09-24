const BASE='https://api.mollie.com/v2/payments';
export const PRICE='49.00';
export function paymentMode(){const mode=process.env.MOLLIE_MODE||'off';if(!['off','test','live'].includes(mode))throw Error('MOLLIE_MODE is ongeldig.');return mode;}
function keyFor(mode){
 const key=mode==='test'?process.env.MOLLIE_TEST_API_KEY:mode==='live'?process.env.MOLLIE_LIVE_API_KEY:'';
 if(mode==='live'&&process.env.LIVE_PAYMENTS_APPROVED!=='yes')throw Error('Live betalingen zijn nog niet vrijgegeven.');
 if(!key||!key.startsWith(mode+'_'))throw Error('De Mollie '+mode+'-sleutel ontbreekt of hoort bij een andere modus.');
 return key;
}
export function assertMollieCredentials(mode){return keyFor(mode);}
export async function mollieCall(mode,id,body,fetcher=fetch){
 const key=keyFor(mode),url=id?BASE+'/'+encodeURIComponent(id):BASE;
 const response=await fetcher(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}) ,signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Mollie reageerde niet succesvol ('+response.status+'). Controleer account, sleutel en betaalmethoden.');
 return response.json();
}
export function verifyPayment(payment,recordId,paymentId,mode){
 return Boolean(payment&&payment.id===paymentId&&payment.metadata?.recordId===recordId&&payment.amount?.currency==='EUR'&&payment.amount?.value===PRICE&&payment.mode===mode);
}
export function applyStatus(record,payment){
 const next={...record,mollie:{...record.mollie,status:payment.status,updatedAt:new Date().toISOString()}};
 const reversed=Number(payment.amountRefunded?.value||0)>0||Number(payment.amountChargedBack?.value||0)>0;
 if(payment.status==='paid'&&!reversed)next.payment='betaald';
 else if(['refunded','charged_back','canceled','expired','failed'].includes(payment.status)||reversed)next.payment='onbetaald';
 else next.payment='betaalverzoek';
 return next;
}
