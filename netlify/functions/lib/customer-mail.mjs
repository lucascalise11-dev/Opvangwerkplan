import nodemailer from 'nodemailer';
export const CONTACT='opvangwerkplan@gmail.com';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mailTemplate(kind,data){
 const paid=kind==='payment', title=paid?'Bedankt voor uw betaling':'Uw intake is ontvangen';
 const intro=paid?'Uw betaling voor het pedagogisch werkplan is bevestigd.':'Bedankt voor uw vertrouwen in Opvangwerkplan. We hebben uw antwoorden ontvangen.';
 const next=paid?'We ronden uw werkplan af volgens de gemaakte afspraken.':'We gebruiken uw antwoorden om een concept voor te bereiden. U krijgt bericht zodra het klaarstaat voor controle. Uw intake is vrijblijvend en is nog geen bestelling.';
 const text=`Beste ${data.naam||'gastouder'},\n\n${intro}\nOpvang: ${data.opvangnaam||'Uw opvang'}\n${paid?'Bedrag: €49,00\n':''}\n${next}\n\nHeeft u een vraag of aanvulling? Antwoord gerust op deze e-mail.\n\nMet vriendelijke groet,\nOpvangwerkplan\n${CONTACT}`;
 const html=`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f0e5;font-family:Arial,sans-serif;color:#243025"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fffdf7;border:1px solid #d8d0bd"><tr><td style="padding:28px 32px;background:#233c2c;color:white;font:700 27px Georgia,serif">Opvangwerkplan<div style="font:12px Arial,sans-serif;color:#dbe5d8;margin-top:8px">Pedagogische werkplannen met aandacht</div></td></tr><tr><td style="padding:36px 32px"><div style="font-size:11px;letter-spacing:2px;color:#a45b36">${paid?'BETALINGSBEVESTIGING':'ONTVANGSTBEVESTIGING'}</div><h1 style="font:700 30px Georgia,serif;color:#233c2c;margin:12px 0 24px">${title}</h1><p style="line-height:1.7">Beste ${esc(data.naam||'gastouder')},</p><p style="line-height:1.7">${intro}</p><table role="presentation" width="100%"><tr><td style="background:#edf0e5;padding:18px;font-size:14px;line-height:1.8"><strong>Uw opvang</strong><br>${esc(data.opvangnaam||'Uw opvang')}${paid?'<br><strong>Betaald: €49,00</strong>':''}</td></tr></table><h2 style="font:700 21px Georgia,serif;margin-top:28px">Hoe gaat het verder?</h2><p style="line-height:1.7">${next}</p><p style="line-height:1.7">Heeft u een vraag of aanvulling? Antwoord gerust op deze e-mail.</p><p style="line-height:1.7;margin-top:28px">Met vriendelijke groet,<br><strong>Opvangwerkplan</strong></p></td></tr><tr><td style="padding:22px 32px;border-top:1px solid #d8d0bd;color:#687066;font-size:12px;line-height:1.8"><a href="https://opvangwerkplan.nl" style="color:#314f3b">opvangwerkplan.nl</a><br>${CONTACT}</td></tr></table></td></tr></table></body></html>`;
 return {subject:title+' | Opvangwerkplan',html,text};
}
export async function sendCustomerMail(store,key,kind,data,attachments=[],transport){
 const mode=process.env.MAIL_MODE||'off';
 if(mode==='off')return {status:'disabled'};
 if(!['test','live'].includes(mode))throw Error('MAIL_MODE moet off, test of live zijn.');
 const isTest=mode==='test'||data.testPayment===true;
 const to=isTest?CONTACT:String(data.email||'').trim();
 if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to))throw Error('Ongeldig klantadres.');
 const password=process.env.GMAIL_APP_PASSWORD?.replace(/\s/g,'');
 if(!transport&&!password)throw Error('GMAIL_APP_PASSWORD ontbreekt.');
 const claimKey='mail/'+key+'.json';
 const claim=await store.setJSON(claimKey,{status:'sending',kind,at:new Date().toISOString()},{onlyIfNew:true});
 if(!claim.modified)return {status:'already-claimed'};
 const client=transport||nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:CONTACT,pass:password},connectionTimeout:10000,socketTimeout:20000});
 try{
  const content=mailTemplate(kind,data);
  if(isTest){content.subject='[TEST] '+content.subject;content.text='TESTBERICHT — alleen voor de beheerder.\n\n'+content.text;content.html=content.html.replace('<body ', '<body ').replace('<h1 ', '<p style="color:#a45b36;font-weight:bold">TESTBERICHT — alleen voor de beheerder</p><h1 ');}
  await client.sendMail({from:{name:'Opvangwerkplan',address:CONTACT},replyTo:CONTACT,to,...content,attachments,disableFileAccess:true,disableUrlAccess:true});
  await store.setJSON(claimKey,{status:'sent',kind,at:new Date().toISOString()});
  return {status:'sent'};
 }catch(error){
  // Only allow known error codes and numeric SMTP status; never log raw SMTP replies.
  const allowed = new Set(['EAUTH','ETIMEDOUT','ECONNECTION','ECONNRESET','ECONNREFUSED','EDNS','ENOTFOUND','EENVELOPE','EMESSAGE','ESOCKET','ETLS']);
  const code = allowed.has(error?.code) ? error.code : 'UNKNOWN';
  const smtp = Number.isInteger(error?.responseCode) && error.responseCode >= 400 && error.responseCode <= 599 ? error.responseCode : null;
  const stage = ['CONN','AUTH','MAIL FROM','RCPT TO','DATA'].includes(error?.command) ? error.command : 'UNKNOWN';
  const diagnostic = `code=${code}; smtp=${smtp ?? 'unknown'}; stage=${stage}`;
  // Do not retry blindly: SMTP may have accepted a message before the connection failed.
  await store.setJSON(claimKey,{status:'needs-review',kind,at:new Date().toISOString(),error:'Verzending niet bevestigd; '+diagnostic});
  throw Error('E-mailverzending niet bevestigd. '+diagnostic);
 }
}
