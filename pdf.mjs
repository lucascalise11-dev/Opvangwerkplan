import PDFDocument from "pdfkit";

const GREEN = "#314f3b";
const DARK = "#233c2c";
const MUTED = "#687066";
const CREAM = "#f4f0e5";
const ACCENT = "#a45b36";

function safe(value, fallback = "Dit onderdeel wordt vóór afronding aangevuld.") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function buildConceptPdf(record, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 62, right: 60, bottom: 62, left: 60 }, info: { Title: `${options.final ? "Pedagogisch werkplan" : "Concept pedagogisch werkplan"} - ${record.opvangnaam || "gastouderopvang"}`, Author: "OpvangWerkPlan" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ensure = (height = 90) => {
      if (doc.y + height > doc.page.height - 70) doc.addPage();
    };
    const heading = (number, title) => {
      ensure(155);
      doc.moveDown(.6).font("Helvetica-Bold").fontSize(9).fillColor(ACCENT).text(number.toUpperCase());
      doc.moveDown(.25).font("Times-Bold").fontSize(20).fillColor(DARK).text(title);
      doc.moveDown(.45);
    };
    const paragraph = (text) => {
      doc.font("Helvetica").fontSize(10.5).fillColor("#333a33").text(safe(text), { lineGap: 3, align: "left" });
      doc.moveDown(.7);
    };
    const subheading = (title) => {
      ensure(70); doc.font("Times-Bold").fontSize(13).fillColor(GREEN).text(title); doc.moveDown(.3);
    };

    doc.rect(0, 0, doc.page.width, 178).fill(CREAM);
    doc.rect(60, 52, 42, 42).fill(GREEN);
    doc.font("Times-Bold").fontSize(13).fillColor("white").text("OW", 60, 66, { width: 42, align: "center" });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ACCENT).text(options.final ? "PEDAGOGISCH WERKPLAN" : "CONCEPT - TER CONTROLE", 60, 118);
    doc.font("Times-Bold").fontSize(31).fillColor(DARK).text("Pedagogisch werkplan", 60, 136, { width: 475 });
    doc.y = 208;
    doc.font("Times-Bold").fontSize(19).fillColor(DARK).text(safe(record.opvangnaam, "Gastouderopvang"));
    doc.moveDown(.25).font("Helvetica").fontSize(10).fillColor(MUTED).text([record.plaats, `Opgesteld: ${record.datum || new Date().toLocaleDateString("nl-NL")}`].filter(Boolean).join(" · "));
    doc.moveDown(1.3);
    doc.roundedRect(60, doc.y, doc.page.width - 120, 68, 2).fill("#e6eadc");
    const noteY = doc.y + 15;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(DARK).text("Belangrijk", 76, noteY);
    doc.font("Helvetica").fontSize(9).fillColor("#465047").text(options.final ? "Dit werkplan beschrijft de door de gastouder gecontroleerde opvangpraktijk. Houd het document actueel bij veranderingen in de opvang of in het beleid van het gastouderbureau." : "Dit is een concept op basis van de ingevulde intake. De gastouder controleert of de tekst de eigen praktijk en het pedagogisch beleid van het gastouderbureau correct weergeeft voordat het document definitief wordt gemaakt.", 76, noteY + 16, { width: doc.page.width - 152, lineGap: 2 });
    doc.y = noteY + 72;

    heading("1", "Over de opvang"); paragraph(record.opvang);
    heading("2", "Werkwijze en wennen"); paragraph(record.werkwijze);
    heading("3", "Activiteiten en speelmaterialen"); paragraph(record.activiteiten);
    heading("4", "Binnen- en buitenspeelruimte"); paragraph(record.speelruimte);
    heading("5", "Pedagogische basisdoelen");
    subheading("Emotionele veiligheid"); paragraph(record.emotionele_veiligheid);
    subheading("Persoonlijke competenties"); paragraph(record.persoonlijke_competenties);
    subheading("Sociale competenties"); paragraph(record.sociale_competenties);
    subheading("Normen en waarden"); paragraph(record.normen_waarden);
    heading("6", "Ontwikkeling volgen"); paragraph(record.ontwikkeling);
    heading("7", "Vertaling van het beleid van het gastouderbureau"); paragraph(record.bureau_beleid);
    heading("8", "Actueel houden van het werkplan"); paragraph(record.actualiseren);

    if (!options.final) {
      const points = Array.isArray(record.controlepunten) ? record.controlepunten : [];
      heading("Controle", "Controle vóór afronding");
      const entries=points.length?points:["Lees het hele concept na en bevestig dat het uw dagelijkse werkwijze correct beschrijft."];
      entries.forEach((point,i)=>{ensure(60); paragraph((record.checked?.[i]?"Afgewerkt: ":"Te controleren: ")+point);});
    }
    doc.end();
  });
}
