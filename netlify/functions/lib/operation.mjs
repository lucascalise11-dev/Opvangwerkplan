import {createHash} from 'node:crypto';
export function operation(body,record){
 if(!body.operationId)return null;
 if(!/^[a-f0-9-]{36}$/i.test(body.operationId))throw Error('Ongeldig bewerkingsnummer.');
 const {operationId,version,...content}=body;const hash=createHash('sha256').update(JSON.stringify(content)).digest('hex');
 const old=(record.operations||[]).find(x=>x.id===operationId);if(old&&old.hash!==hash)throw Error('Dit bewerkingsnummer hoort bij andere wijzigingen.');
 return {id:operationId,hash,replayed:!!old};
}
export function remember(record,op){return op?{...record,operations:[...(record.operations||[]),{id:op.id,hash:op.hash,at:new Date().toISOString()}]}:record;}
