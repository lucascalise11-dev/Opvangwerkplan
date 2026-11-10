export const PACKAGES=Object.freeze({starter:{id:'starter',name:'Starter',amount:'49.00',corrections:1},compleet:{id:'compleet',name:'Compleet',amount:'99.00',corrections:2}});
export function packageFor(value){if(value==null||value==='')return PACKAGES.starter;if(!Object.hasOwn(PACKAGES,value))throw Error('Onbekend pakket.');return PACKAGES[value];}
export function recordPackage(record){return packageFor(record.packageId==='bureau'?'starter':record.packageId||record.pakket||record.intake?.pakket);}
