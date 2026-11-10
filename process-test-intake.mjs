import {packageFor} from './packages.mjs';
import {sendCustomerMail} from './customer-mail.mjs';
import {getAppStore} from './environment.mjs';
import {reserveGeneration} from './daily-limit.mjs';
import {generateWorkplan} from './generator.mjs';
import {buildConceptPdf} from './pdf.mjs';
function veiligeFoutmelding(error) {
  const apiKey = String(process.env.OPENAI_API_KEY || "");
  const token = String(process.env.ADMIN_TOKEN || "");
  let message = String(error?.message || error || "Onbekende fout");
  for (const geheim of [apiKey, token]) {
    if (geheim) message = message.replaceAll(geheim, "[geheim verborgen]");
  }
  return message.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[API-sleutel verborgen]");
}

export async function processTestIntake(data,id,deps={}){
  const createdAt = new Date().toISOString();
  const store = deps.store||getAppStore();

  const claim=await store.setJSON(`claims/${id}.json`,{createdAt},{onlyIfNew:true});
  if(!claim.modified) return;
  try {
    const mail = await (deps.mail||sendCustomerMail)(store, 'intake-'+id, 'intake', data);
    console.log('Intakebevestiging', mail.status);
  } catch (error) {
    console.error('Intakebevestiging mislukt', error.message);
  }
  try {
    await store.setJSON(`jobs/${id}.json`,{id,createdAt,opvangnaam:data.opvangnaam||"",status:"bezig"});
    console.log("Werkplan-generatie in achtergrond gestart");
    await (deps.reserve||reserveGeneration)(store);
    const generated = await (deps.generate||generateWorkplan)(process.env.OPENAI_API_KEY, data);
    console.log("OpenAI-generatie voltooid; PDF wordt opgebouwd");
    const record = {
      id,
      createdAt,
      status: "concept",
      packageId: packageFor(data.pakket).id,
      packageName: packageFor(data.pakket).name,
      totalAmount: packageFor(data.pakket).amount,
      payment: "onbetaald",
      naam: data.naam || "",
      email: data.email || "",
      opvangnaam: data.opvangnaam || "Gastouderopvang",
      plaats: data.plaats || "",
      datum: new Date().toLocaleDateString("nl-NL"),
      intake: Object.fromEntries(Object.entries(data).filter(([k])=>!["ip","user_agent","referrer","bot-field","bureau_beleid_bestand"].includes(k))),
      policyUploaded: Boolean(data.bureau_beleid_bestand),
      ...generated
    };
    const pdf = await (deps.pdf||buildConceptPdf)(record);
    await store.set(`pdf/${id}.pdf`, new Blob([pdf], { type: "application/pdf" }), {
      metadata: { createdAt, contentType: "application/pdf" }
    });
    await store.setJSON(`records/${id}.json`, record, { onlyIfNew:true });
    await store.delete(`jobs/${id}.json`);
    console.log(`Concept ${id} gegenereerd`);
  } catch (error) {
    const veilig = veiligeFoutmelding(error);
    console.error("Werkplan genereren mislukt", veilig);
    try {
      await store.setJSON(`errors/${id}.json`, {
        id,
        createdAt,
        naam: data.naam || "",
        email: data.email || "",
        opvangnaam: data.opvangnaam || "",
        error: veilig
      });
      await store.delete(`jobs/${id}.json`);
      console.log(`Generatiefout ${id} opgeslagen voor beheer`);
    } catch (storageError) {
      console.error("Generatiefout kon niet in Blobs worden opgeslagen", veiligeFoutmelding(storageError));
    }
  }

}
