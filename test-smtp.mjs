import assert from 'node:assert/strict';
import {sanitize} from '../netlify/functions/lib/admin-core.mjs';
import {smtpOptions,smtpReady} from '../netlify/functions/lib/smtp.mjs';
import {mailTemplate,CONTACT} from '../netlify/functions/lib/customer-mail.mjs';
import nodemailer from 'nodemailer';
import tls from 'node:tls';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const env={SMTP_HOST:'web0175.zxcs.nl',SMTP_PORT:'465',SMTP_USER:'info@opvangwerkplan.nl',SMTP_PASSWORD:' fixture with spaces '};
process.env.SMTP_PASSWORD=env.SMTP_PASSWORD;assert.equal(sanitize('Error:'+env.SMTP_PASSWORD),'Error:[verborgen]');delete process.env.SMTP_PASSWORD;
const options=smtpOptions(env);assert.equal(options.auth.pass,env.SMTP_PASSWORD);assert.equal(options.secure,true);assert.equal(options.tls.rejectUnauthorized,true);
for(const patch of [{SMTP_PASSWORD:''},{SMTP_PORT:'25'},{SMTP_HOST:'smtp.gmail.com'},{SMTP_USER:'other@example.invalid'}])assert.throws(()=>smtpOptions({...env,...patch}));
assert.equal(smtpReady(),false);assert.equal(CONTACT,env.SMTP_USER);
assert(mailTemplate('intake',{naam:'Fictieve gastouder',pakket:'starter'}).text.includes(CONTACT));
const dir=mkdtempSync(join(tmpdir(),'owp-smtp-'));let server;
try{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
 const cert=readFileSync(join(dir,'cert.pem'));let message='',authenticated=false;
 server=tls.createServer({key:readFileSync(join(dir,'key.pem')),cert},socket=>{
  socket.write('220 localhost test SMTP\r\n');let buffer='',data=false;
  socket.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
   if(data){if(line==='.') {data=false;socket.write('250 queued locally\r\n');}else message+=line+'\n';continue;}
   if(line.startsWith('EHLO'))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
   else if(line.startsWith('AUTH PLAIN ')){const parts=Buffer.from(line.slice(11),'base64').toString().split('\0');authenticated=parts[1]===env.SMTP_USER&&parts[2]===env.SMTP_PASSWORD;socket.write(authenticated?'235 authenticated\r\n':'535 rejected\r\n');}
   else if(line==='DATA'){data=true;socket.write('354 send data\r\n');}
   else if(line==='QUIT'){socket.end('221 bye\r\n');}
   else socket.write('250 OK\r\n');
  }});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 // Test-only local socket; production options remain pinned to Vimexx.
 const transport=nodemailer.createTransport({...options,host:'127.0.0.1',port:server.address().port,tls:{...options.tls,ca:cert,servername:'localhost'}});
 const sent=await transport.sendMail({from:CONTACT,to:'fictief@example.invalid',...mailTemplate('intake',{naam:'Bij Abuela'}),disableFileAccess:true,disableUrlAccess:true});
 assert(authenticated);assert.deepEqual(sent.accepted,['fictief@example.invalid']);assert(message.includes('info@opvangwerkplan.nl'));transport.close();
 console.log('PASS SMTP: real Nodemailer connection to isolated local TLS SMTP server, certificate validation, exact password, authentication, MIME message and accepted recipient; invalid config rejected. No external delivery.');
}finally{if(server)await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
