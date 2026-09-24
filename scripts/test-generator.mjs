import { generateWorkplan } from "../netlify/functions/lib/generator.mjs";

const output = {
  opvang: "Opvangtekst", werkwijze: "Werkwijze", activiteiten: "Activiteiten", speelruimte: "Speelruimte",
  emotionele_veiligheid: "Veilig", persoonlijke_competenties: "Persoonlijk", sociale_competenties: "Sociaal",
  normen_waarden: "Normen", ontwikkeling: "Ontwikkeling", bureau_beleid: "Beleid", actualiseren: "Actualiseren",
  controlepunten: ["Controleer beleid"]
};
let calls = 0;
globalThis.fetch = async (_url, options) => {
  calls += 1;
  const body = JSON.parse(options.body);
  const serialized = JSON.stringify(body);
  if (serialized.includes("klant@example.nl") || serialized.includes("Geheime Klantnaam")) throw new Error("Contactgegevens kwamen in de AI-prompt terecht");
  if (calls === 1 && serialized.includes("input_file")) return new Response("policy url unavailable", { status: 400 });
  return Response.json({ status: "completed", output_text: JSON.stringify(output) });
};

const result = await generateWorkplan("test-key", {
  naam: "Geheime Klantnaam", email: "klant@example.nl", opvangnaam: "De Testopvang", plaats: "Utrecht",
  bureau_beleid_bestand: "https://example.nl/beleid.pdf", dagritme: "Rustig dagritme"
});
if (result.opvang !== "Opvangtekst" || calls !== 2) throw new Error("Generator-fallbacktest mislukt");
console.log("Generator mocktest geslaagd; contactgegevens blijven buiten prompt en PDF-fallback werkt.");
