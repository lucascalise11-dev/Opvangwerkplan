import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

function intakeHerkennen(data) {
  const marker = String(data["generator-trigger"] || "");
  return {
    marker,
    geldig: marker === "werkplan-intake-v1" || Boolean(data.opvangnaam && data.email && data.dagritme)
  };
}

function veiligeFoutmelding(error) {
  const token = String(process.env.ADMIN_TOKEN || "");
  let message = String(error?.message || error || "Onbekende fout");
  if (token) message = message.replaceAll(token, "[geheim verborgen]");
  return message.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[API-sleutel verborgen]");
}

async function dispatchNaarAchtergrond(data, id) {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const token = process.env.ADMIN_TOKEN;
  if (!baseUrl) throw new Error("Netlify-site-URL ontbreekt");
  if (!token || token.length < 12) throw new Error("ADMIN_TOKEN ontbreekt of is te kort");

  const response = await fetch(new URL("/.netlify/functions/verwerk-werkplan", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": token
    },
    body: JSON.stringify({ data, id }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Achtergrondfunctie kon niet worden gestart (${response.status})`);
}

export default async (req) => {
    console.log("Formuliertrigger submission-created v6.2 ontvangen");
    const { payload } = await req.json();
    const data = payload?.data || {};
    const herkenning = intakeHerkennen(data);

    console.log("Formulier-event ontvangen", {
      marker: herkenning.marker || "ontbreekt",
      intakeHerkenning: herkenning.geldig,
      velden: Object.keys(data).sort()
    });

    if (!herkenning.geldig) {
      console.log("Event overgeslagen: geen werkplan-intake");
      return;
    }

    const id=randomUUID();
    const store=getStore({name:"opvangwerkplan-concepten",consistency:"strong"});
    await store.setJSON(`jobs/${id}.json`,{id,createdAt:new Date().toISOString(),opvangnaam:data.opvangnaam||"",status:"wachtrij"});
    try {
      await dispatchNaarAchtergrond(data, id);
      console.log("Werkplan veilig in de achtergrondwachtrij geplaatst");
    } catch (error) {
      console.error("Achtergrondgeneratie starten mislukt", veiligeFoutmelding(error));
      try {

        const createdAt = new Date().toISOString();
        const store = getStore({ name: "opvangwerkplan-concepten", consistency: "strong" });
        await store.setJSON(`errors/${id}.json`, {
          id,
          createdAt,
          naam: data.naam || "",
          email: data.email || "",
          opvangnaam: data.opvangnaam || "",
          error: veiligeFoutmelding(error)
        });
      } catch (storageError) {
        console.error("Startfout kon niet worden opgeslagen", veiligeFoutmelding(storageError));
      }
    }
};
