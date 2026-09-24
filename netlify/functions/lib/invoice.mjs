import PDFDocument from 'pdfkit';
// Preview only: this does not issue a tax invoice or allocate a live invoice number.
export function buildTestInvoice(record,reference='TEST-2026-0001'){
 return new Promise((resolve,reject)=>{
 const doc=new PDFDocument({size:'A4',margin:52,info:{Title:'Testfactuur | Opvangwerkplan',Author:'Opvangwerkplan'}}),chunks=[];
 doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
 const text=(s,x,y,size=10,color='#243025',font='Helvetica',opts={})=>doc.font(font).fontSize(size).fillColor(color).text(String(s),x,y,opts);
 doc.rect(0,0,596,165).fill('#233c2c');text('OW',52,44,22,'#ffffff','Times-Bold');text('Opvangwerkplan',110,44,27,'#ffffff','Times-Bold');text('Pedagogische werkplannen met aandacht',110,82,10,'#dbe5d8');
 text('FACTUURVOORBEELD',52,122,10,'#dbe5d8','Helvetica-Bold');
 doc.rect(52,188,491,37).fill('#f4f0e5');text('TEST - GEEN GELDIGE FACTUUR',66,200,10,'#a45b36','Helvetica-Bold');
 text('Voor',52,253,10,'#687066');text(String(record.naam||'Voorbeeldklant').slice(0,90),52,275,13,'#233c2c','Helvetica-Bold',{width:260});text(String(record.opvangnaam||'Bij Abuela').slice(0,90),52,312,11,'#243025','Helvetica',{width:260});
 text('Referentie',360,253,10,'#687066');text(reference,360,275,12,'#233c2c','Helvetica-Bold',{width:180});text('Datum: '+new Date().toLocaleDateString('nl-NL'),360,312,10);
 doc.rect(52,369,491,34).fill('#314f3b');text('Omschrijving',66,381,10,'#ffffff','Helvetica-Bold');text('Bedrag',450,381,10,'#ffffff','Helvetica-Bold');
 text('Persoonlijk pedagogisch werkplan',66,425,12,'#233c2c','Helvetica-Bold');text('Inclusief één correctieronde',66,447,10,'#687066');text('€ 49,00',450,425,12);
 doc.moveTo(52,483).lineTo(543,483).strokeColor('#d8d0bd').stroke();
 text('Exclusief btw (rekenvoorbeeld)',270,507,10);text('€ 40,50',450,507,10);text('Btw 21% (rekenvoorbeeld)',270,531,10);text('€ 8,50',450,531,10);
 doc.rect(260,559,283,45).fill('#edf0e5');text('Totaal',275,574,13,'#233c2c','Helvetica-Bold');text('€ 49,00',450,574,13,'#233c2c','Helvetica-Bold');
 text('Geen betaling verschuldigd voor dit voorbeeld.',52,642,11,'#314f3b','Helvetica-Bold');text('Btw-behandeling, bedrijfsgegevens en factuurnummering moeten vóór echte facturatie worden vastgesteld.',52,667,9,'#687066','Helvetica',{width:490,lineGap:3});
 doc.moveTo(52,727).lineTo(543,727).strokeColor('#d8d0bd').stroke();text('Opvangwerkplan  |  Achterdijk 5, 3981 HA Bunnik',52,745,9,'#687066');text('opvangwerkplan@gmail.com  |  0615151426  |  opvangwerkplan.nl',52,762,9,'#687066');
 doc.end();
 });
}
