import { timingSafeEqual } from "node:crypto";
export const fields = ["opvangnaam","plaats","opvang","werkwijze","activiteiten","speelruimte","emotionele_veiligheid","persoonlijke_competenties","sociale_competenties","normen_waarden","ontwikkeling","bureau_beleid","actualiseren"];
export function allowed(req) {
 const a=Buffer.from(req.headers.get("x-admin-token")||""), b=Buffer.from(process.env.ADMIN_TOKEN||"");
 return b.length>=12 && a.length===b.length && timingSafeEqual(a,b);
}
export function sanitize(message) {
 let value=String(message||"Onbekende fout");
 for(const secret of [process.env.ADMIN_TOKEN,process.env.OPENAI_API_KEY,process.env.MOLLIE_TEST_API_KEY,process.env.MOLLIE_LIVE_API_KEY]) if(secret) value=value.replaceAll(secret,"[verborgen]");
 return value.replace(/sk-[A-Za-z0-9_-]+/g,"[verborgen]").replace(/Incorrect API key provided:[^\n]*/gi,"API-sleutel geweigerd.");
}
export function editRecord(record, body) {
 if(!body || !body.values || typeof body.values!=="object") throw Error("Werkplantekst ontbreekt.");
 const next={...record};
 for(const field of fields) {
  const value=body.values[field];
  if(typeof value!=="string" || value.length>20000 || !value.trim()) throw Error("Vul alle onderdelen in (maximaal 20.000 tekens per onderdeel).");
  next[field]=value.trim();
 }
 const count=(record.controlepunten||[]).length;
 if(!Array.isArray(body.checks)||body.checks.length!==count||body.checks.some(v=>typeof v!=="boolean")) throw Error("Controlepunten kloppen niet.");
 next.checked=body.checks;
 next.reviewed=body.reviewed===true;
 next.customerApproved=body.customerApproved===true;
 if(!["onbetaald","betaalverzoek","betaald"].includes(body.payment)) throw Error("Ongeldige betaalstatus.");
 // A verified Mollie transaction is the only source for its own payment status.
 next.payment=record.mollie?.id ? record.payment : body.payment;
 if(typeof body.notes!=="string" || body.notes.length>10000) throw Error("Notities zijn te lang.");
 next.notes=body.notes;
 next.status="concept"; next.finalPdfKey=null; next.finalizedAt=null; next.completedAt=null;
 next.updatedAt=new Date().toISOString();
 return next;
}
export function canFinalize(r) {
 return fields.every(f=>typeof r[f]==="string"&&r[f].trim()) && r.reviewed===true && r.customerApproved===true && (r.controlepunten||[]).every((_,i)=>r.checked?.[i]===true);
}
