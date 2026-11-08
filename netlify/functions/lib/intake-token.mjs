import {createHmac,timingSafeEqual} from 'node:crypto';
import {environmentInfo} from './environment.mjs';
export function issueToken(id,now=Date.now()){const key=process.env.ADMIN_TOKEN;if(!key||key.length<12)throw Error('Testbeheercode ontbreekt of is te kort.');const payload=Buffer.from(JSON.stringify({id,deploy:environmentInfo().deployId,expires:now+20*60*1000})).toString('base64url');return payload+'.'+createHmac('sha256',key).update(payload).digest('base64url');}
export function verifyToken(id,token,now=Date.now()){
 try{if(typeof token!=='string'||token.length>1500)return false;const [payload,sig,...rest]=token.split('.');if(rest.length||!sig)return false;const key=process.env.ADMIN_TOKEN;if(!key||key.length<12)return false;const a=Buffer.from(sig),b=Buffer.from(createHmac('sha256',key).update(payload).digest('base64url'));if(a.length!==b.length||!timingSafeEqual(a,b))return false;const data=JSON.parse(Buffer.from(payload,'base64url'));return data.id===id&&data.deploy===environmentInfo().deployId&&data.expires>now&&data.expires<=now+20*60*1000;}catch{return false;}
}
