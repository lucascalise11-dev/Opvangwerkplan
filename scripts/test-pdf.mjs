import { writeFile } from "node:fs/promises";
import { buildConceptPdf } from "../netlify/functions/lib/pdf.mjs";

const fixture = {
  opvangnaam: "Gastouderopvang De Kleine Beer", plaats: "Utrecht", datum: "5 augustus 2026",
  opvang: "In mijn gastouderopvang bied ik kleinschalige opvang aan maximaal vijf kinderen tegelijk. Ik vang kinderen op van ongeveer 0 tot en met 4 jaar. De opvang vindt plaats op maandag, dinsdag en donderdag.",
  werkwijze: "Ik werk met een herkenbaar maar flexibel dagritme. Bij binnenkomst neem ik rustig de tijd voor de overdracht. Daarna is er ruimte voor vrij spel. Eet-, rust- en slaapmomenten worden afgestemd op de leeftijd van de kinderen. Nieuwe kinderen kunnen stapsgewijs wennen, in overleg met hun ouders.",
  activiteiten: "Ik bied onder andere voorlezen, muziek, knutselen, puzzelen en buiten wandelen aan. Ik kies activiteiten passend bij de leeftijd en belangstelling van de kinderen. Met open spelmateriaal kunnen kinderen zelf ontdekken en oplossingen bedenken.",
  speelruimte: "Binnen is er een vaste speelhoek en ruimte aan tafel voor creatieve activiteiten. Speelmaterialen staan waar kinderen er passend bij hun leeftijd bij kunnen. Buiten gebruik ik de eigen omheinde tuin en ga ik regelmatig naar de speeltuin in de buurt.",
  emotionele_veiligheid: "Ik zorg voor een vaste, rustige benadering en reageer op signalen van kinderen. Ik benoem gevoelens en geef kinderen de tijd om op hun eigen manier aan een situatie te wennen.",
  persoonlijke_competenties: "Ik stimuleer zelfstandigheid door kinderen kleine keuzes te geven en handelingen eerst zelf te laten proberen. Met taal, bewegen en creatieve activiteiten sluit ik aan bij hun ontwikkelingsniveau.",
  sociale_competenties: "Tijdens samenspel help ik kinderen om op elkaar te wachten, te delen en woorden te geven aan wat zij willen. Bij een conflict begeleid ik hen om naar elkaar te luisteren en samen een oplossing te zoeken.",
  normen_waarden: "Respect, eerlijkheid en rekening houden met elkaar zijn voor mij belangrijk. Ik geef zelf het voorbeeld, benoem gewenst gedrag positief en leg eenvoudige afspraken uit op een manier die bij de leeftijd past.",
  ontwikkeling: "Ik volg de ontwikkeling door kinderen dagelijks te observeren tijdens spel, verzorging en contactmomenten. Opvallende veranderingen bespreek ik met ouders. Bij aanhoudende zorgen overleg ik met ouders en, waar passend, het gastouderbureau over een vervolgstap.",
  bureau_beleid: "Het pedagogisch beleid van mijn gastouderbureau legt nadruk op de vier pedagogische basisdoelen. In mijn dagelijkse opvang vertaal ik dit naar een vertrouwde benadering, ruimte voor zelfstandigheid, begeleid samenspel en duidelijke afspraken.",
  actualiseren: "Ik bekijk dit werkplan opnieuw wanneer de groepssamenstelling, opvangruimte, mijn werkwijze of het pedagogisch beleid van het gastouderbureau relevant verandert.",
  controlepunten: ["Controleren of de omschrijving van het pedagogisch beleid van het gastouderbureau volledig overeenkomt met de actuele beleidsversie.", "Bevestigen dat de genoemde opvangdagen nog actueel zijn."]
};
await writeFile("tmp-test-concept.pdf", await buildConceptPdf(fixture));
