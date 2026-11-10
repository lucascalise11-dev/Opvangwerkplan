import nodemailer from 'nodemailer';
// Deliberately no Gmail fallback, insecure port or certificate bypass.
export function smtpOptions(env=process.env){
 if(env.SMTP_HOST!=='web0175.zxcs.nl'||env.SMTP_PORT!=='465'||env.SMTP_USER!=='info@opvangwerkplan.nl')throw Error('Stel SMTP_HOST=web0175.zxcs.nl, SMTP_PORT=465 en SMTP_USER=info@opvangwerkplan.nl in.');
 if(typeof env.SMTP_PASSWORD!=='string'||!env.SMTP_PASSWORD.length)throw Error('SMTP_PASSWORD ontbreekt. Stel het mailboxwachtwoord als geheime servervariabele in.');
 return {host:env.SMTP_HOST,port:465,secure:true,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000};
}
export function smtpReady(){try{smtpOptions();return true;}catch{return false;}}
export function createMailTransport(){return nodemailer.createTransport(smtpOptions());}
