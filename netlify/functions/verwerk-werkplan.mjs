import { sendCustomerMail } from './lib/customer-mail.mjs';
import { getStore } from "@netlify/blobs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { reserveGeneration } from "./lib/daily-limit.mjs";
import { generateWorkplan } from "./lib/generator.mjs";
import { buildConceptPdf } from "./lib/pdf.mjs";

export const config = { background: true };

function gelijkGeheim(provided, configured) {
  if (!provided || !configured || configured.length < 12) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

function veiligeFoutmelding(error) {
  const apiKey = String(process.env.OPENAI_API_KEY || "");
  const token = String(process.env.ADMIN_TOKEN || "");
  let message = String(error?.message || error || "Onbekende fout");
  for (const geheim of [apiKey, token]) {
    if (geheim) message = message.replaceAll(geheim, "[geheim verborgen]");
  }
  return message.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[API-sleutel verborgen]");
}

export default async (req) => {
  if (req.method !== "POST") {
    console.warn("Achtergrondaanroep geweigerd: onjuiste methode");
    return;
  }
  if (!gelijkGeheim(req.headers.get("x-internal-token"), process.env.ADMIN_TOKEN)) {
    console.warn("Achtergrondaanroep geweigerd: ongeldige interne autorisatie");
    return;
  }

  let data, requestedId;
  try {
    const body = await req.json();
    data = body?.data;
    requestedId=body?.id;
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Intakegegevens ontbreken");
  } catch (error) {
    console.error("Achtergrondaanroep bevat ongeldige gegevens", veiligeFoutmelding(error));
    return;
  }

  const id = /^[0-9a-f-]{36}$/i.test(requestedId||"") ? requestedId : randomUUID();
  const createdAt = new Date().toISOString();
  const store = getStore({ name: "opvangwerkplan-concepten", consistency: "strong" });

  const claim=await store.setJSON(`claims/${id}.json`,{createdAt},{onlyIfNew:true});
  if(!claim.modified) return;
  try {
    const mail = await sendCustomerMail(store, 'intake-'+id, 'intake', data);
    console.log('Intakebevestiging', mail.status);
  } catch (error) {
    console.error('Intakebevestiging mislukt', error.message);
  }
  try {
    await store.setJSON(`jobs/${id}.json`,{id,createdAt,opvangnaam:data.opvangnaam||"",status:"bezig"});
    console.log("Werkplan-generatie in achtergrond gestart");
    await reserveGeneration(store);
    const generated = await generateWorkplan(process.env.OPENAI_API_KEY, data);
    console.log("OpenAI-generatie voltooid; PDF wordt opgebouwd");
    const record = {
      id,
      createdAt,
      status: "concept",
      naam: data.naam || "",
      email: data.email || "",
      opvangnaam: data.opvangnaam || "Gastouderopvang",
      plaats: data.plaats || "",
      datum: new Date().toLocaleDateString("nl-NL"),
      intake: Object.fromEntries(Object.entries(data).filter(([k])=>!["ip","user_agent","referrer","bot-field","bureau_beleid_bestand"].includes(k))),
      policyUploaded: Boolean(data.bureau_beleid_bestand),
      ...generated
    };
    const pdf = await buildConceptPdf(record);
    await store.set(`pdf/${id}.pdf`, new Blob([pdf], { type: "application/pdf" }), {
      metadata: { createdAt, contentType: "application/pdf" }
    });
    await store.setJSON(`records/${id}.json`, record, { onlyIfNew:true });
    await store.delete(`jobs/${id}.json`);
    console.log(`Concept ${id} gegenereerd voor ${record.opvangnaam}`);
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
};
