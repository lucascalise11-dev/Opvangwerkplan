# OpvangWerkPlan v8.4 — handmatig bewaren en verwijderen

Gecontroleerd op 9 november 2026. Deze procedure vervangt de v6-procedure van 24 september. Er is tijdens deze controle niets verwijderd. Archiveren is omkeerbaar en is geen verwijdering.

## Bewaaradministratie

Eigenaar/verantwoordelijke: Gianluca Scalise. Gebruik het bijgevoegde register. Leg per aanvraag de aanvraag-ID, locatie/omgeving, datum laatste inhoudelijke contact, afrondingsdatum, uiterste verwijderdatum, uitzondering met reden en herbeoordelingsdatum vast. Gebruik geen namen van kinderen of volledige intake-inhoud in het register.

- Zonder opdracht: drie kalendermaanden na het laatste inhoudelijke contact.
- Afgeronde opdracht: twaalf kalendermaanden na afronding voor intake, beleidsbijlagen, werkbestanden, feedback, versies en niet-financiële correspondentie.
- Lopende correctie/actualisatie/geschil: bewaar alleen noodzakelijke gegevens en registreer waarom, met een herbeoordelingsdatum. Niet stilzwijgend onbeperkt verlengen.
- Verplicht te bewaren financiële administratie afzonderlijk behandelen; doorgaans zeven jaar, afhankelijk van toepasselijke verplichting en startmoment. De fiscale termijn geldt niet automatisch voor complete pedagogische werkplannen.
- Bestaande verzoeken om verwijdering/bezwaar apart beoordelen; een interne termijn verhindert geen eerder rechtmatig verzoek.

Controleer het register wekelijks en plan de daadwerkelijke verwijdering uiterlijk op de deadline. Alleen maandelijks opruimen kan de beloofde termijn overschrijden. Er is geen automatische verwijdertaak ingesteld. De hieronder beschreven acties worden alleen na een afzonderlijk besluit voor de betreffende aanvraag uitgevoerd.

## Stap 1 — bepaal scope en voorkom opnieuw aanmaken

Verifieer de identiteit van de verzoeker proportioneel. Noteer alle bijbehorende aanvraag-ID's, Forms-submission-ID's, transactie-ID's en relevante oude versies. Zoek ook dubbele intake-inzendingen; dezelfde persoon kan meerdere aanvraag-ID's hebben. Verifieer koppelingen op basis van inhoud en datum, niet alleen gelijke opvangnaam. Voor oudere records kan de oorspronkelijke intake ontbreken: raadpleeg dan Forms veilig en doelgericht.

Controleer dat geen generatie, analyse, e-mailactie of betaling wordt verwerkt. Sluit beheerbewerkingen voor deze aanvraag. Laat lopende taken en eventuele platformherhalingen eerst aflopen of gecontroleerd beëindigen. Een aanvraag verwijderen terwijl een worker bezig is kan gegevens opnieuw laten ontstaan. Verwijder claim-/lockbestanden nooit om een actie te forceren. Een nog werkende betaal-/terugbetalingsafhandeling moet behouden blijven.

Maak een inventaris van te verwijderen objecten en te behouden financiële bewijsstukken vóór je gaat verwijderen. Geen onnodige nieuwe volledige persoonsgegevensback-up maken alleen voor een verwijderverzoek. Bestaande beveiligde back-ups vallen wel onder de controle in stap 6.

## Stap 2 — juiste Netlify-opslag selecteren

Productie gebruikt de sitebrede Blobs-store `opvangwerkplan-concepten`. Deploy Previews/branchdeploys gebruiken de deploymentgebonden `opvangwerkplan-test`; lokale code gebruikt `opvangwerkplan-test-local`. Een testdeployment verwijderen is niet automatisch bewijs dat alle providerkopieën weg zijn. Controleer de actuele deployment en de opslaglocatie. Verwijder nooit de gehele store of het hele Netlify-project.

Inventariseer voor aanvraag `ID`:

| Locatie | Wat controleren |
| --- | --- |
| `records/ID.json` | Intake, werkplan, feedback, interne notities, vragen, antwoorden, voorstellen, akkoorden en verwijzingen naar documenten/versies. |
| `pdf/ID.pdf` | Eerste legacy-concept. |
| `pdf/ID/…` | Latere PDF's én DOCX-bestanden, inclusief oude/orphaned documenten. |
| `versions/ID/…json` | Volledige snapshots; deze bevatten zelf persoonsgegevens en verwijzingen naar oudere bestanden. |
| `errors/ID.json`, `jobs/ID.json` | Naam/e-mail/voortgang/foutgegevens waar aanwezig. |
| `claims/ID.json` | Genereerclaim: alleen verwijderen als herlevering/herstart niet meer kan plaatsvinden. |
| `review-jobs/ID/…`, `review-claims/ID/…` | Achtergrondanalyses en uitvoeringsclaims; taken eerst beëindigd. |
| `question-mail/ID/…` | Vragenmails en onzekere/verzonden mailregistraties, vaak inclusief tekst. |
| `mail/intake-ID.json` | Registratie intakebevestiging. |
| `payments/TRANSACTIE.json` | Koppeling via `recordId`; zoek alle transacties voor deze aanvraag, ook eerdere pogingen. |
| `mail/payment-TRANSACTIE.json` | Registratie betaalbevestiging, gekoppeld via transactie-ID. |
| `payment-locks/ID/POGING.json` | Niet blind verwijderen: kan dubbele betaalverzoeken voorkomen. |
| `test-submissions/ID.json` | Alleen in de betreffende testopslag; bevat de oorspronkelijke testintake. |

Volg daarnaast `pdfKey`, `docxKey`, `finalPdfKey`, `finalDocxKey` en `versionHistory[].key` in huidig record én snapshots. Controleer eigenaarschap van ieder object. Bestandsnamen kunnen per historische versie verschillen; de tabel is geen opdracht tot ongecontroleerd wissen op een glob. Verwijder geen gedeeld beleidsbestand zolang andere rechtmatige opdrachten het nodig hebben. De geaggregeerde `usage/DATUM.json`-teller bevat geen aanvraaginhoud en hoeft niet per klant te worden verwijderd.

Scheid eerst de noodzakelijke financiële gegevens en bewijsstukken van inhoudelijke werkbestanden. Behoud noodzakelijke transactie-/webhookkoppelingen zolang betalingen of terugbetalingen lopen, met reden en termijn. Controleer Mollie afzonderlijk: verwijderen in Blobs verwijdert daar geen betaalgegevens. Behoud geen complete intake als financieel bewijs als een beperkter bewijs volstaat.

## Stap 3 — Forms en uploads

Controleer alle gebruikte intake- en contactformulieren, inclusief oudere formuliernamen, verified submissions én spam. Koppel de juiste inzendingen aan de inventaris. Verwijder alleen de betreffende inzendingen, niet het hele formulier: verwijderen van een formulier kan nieuwe inzendingen breken.

Noteer vóór verwijdering de bijbehorende uploadverwijzingen. Controleer na verwijdering de status/bereikbaarheid van die uploads volgens de providerprocedure; bezoek geen andere klantuploads. Netlify meldt dat na verwijderen van een formulier uploads door caching nog 24 uur via de directe URL beschikbaar kunnen zijn. Neem niet aan dat elk type inzendingsverwijdering exact dezelfde termijn heeft: bevestig het toepasselijke cache-/back-upgedrag bij Netlify als het niet duidelijk is. Regel zo nodig providerondersteuning. E-mailnotificaties en CSV-exports zijn aparte kopieën.

## Stap 4 — Blobs verwijderen

Na de financiële selectie en nadat taken niet meer actief zijn: verwijder uitsluitend de geïnventariseerde inhoudelijke objecten, snapshots, documenten en niet langer benodigde taak-/mailregistraties. Controleer alle pagina's van een objectlijst, ook ongekoppelde oude bestanden onder de betreffende aanvraagprefix. Verwijder het hoofdrecord pas nadat zijn verwijzingen zijn geïnventariseerd. Noteer uitzonderingen. Voer geen nieuwe AI-analyse of webhooktest uit op een verwijderde aanvraag.

## Stap 5 — e-mail en eigen kopieën

Controleer ontvangen mail, verzonden mail, concepten, archief/Alle mail, spam, prullenbak, bijlagen en eventuele lokale mailclients. Alleen archiveren is ook hier geen verwijderen. Verwijder uitsluitend berichten/bijlagen die binnen de scope vallen, rekening houdend met financiële bewijsstukken. Controleer automatische doorsturingen, Netlify-notificaties, lokale Word/PDF/JSON/CSV-downloads en synchronisatiemappen. Vraag waar nodig een andere gerechtigde ontvanger om diens eigen kopie te behandelen; beloof niet dat je die op afstand hebt gewist.

## Stap 6 — logs, AI en back-ups

De code logt beperkt, maar leverancierlogs en oude fouten kunnen alsnog gegevens bevatten. Beoordeel de relevante logs en providertermijnen zonder brede exports te maken. `store:false` is geen verwijderopdracht voor alle OpenAI-logs. Neem voor een gericht privacyverzoek contact op via de toepasselijke leveranciersprocedure; stuur geen extra kindgegevens mee als een verzoek-ID volstaat.

Leg voor backups/providerkopieën vast: bewaartermijn, geplande afloop, toegangsbeperking en eventuele uitzonderingen. Wanneer selectief verwijderen niet mogelijk is, gebruik die kopieën niet regulier en zorg dat een herstel de eerder verwijderde gegevens niet opnieuw beschikbaar maakt. Doe geen onhoudbare toezegging van onmiddellijke verwijdering van alle technische kopieën.

## Stap 7 — verifieer en sluit af

Controleer de actieve opslag, Forms, uploadstatus en eigen mailbox/kopieën opnieuw. Bevestig dat geen worker gegevens heeft teruggeschreven. Leg minimaal vast: aanvraagreferentie, uitvoerder, datum, gecontroleerde locaties, resultaat en behouden uitzonderingen/vervaldata. Bewaar dit register zelf niet onbeperkt of met volledige klantinhoud. Informeer de verzoeker over de uitvoering en concrete wettelijke/technische uitzonderingen. Verstuur niets namens de eigenaar zonder opdracht.

## Verschil met de oude v6-procedure

v6 noemde alleen hoofdrecord, PDF, errors/jobs/claims, Forms en mail. v8.4 bewaart ook Wordbestanden, volledige snapshots, reviewtaken/-claims, vragenmails, betaalmailregistraties, transactie- en lockkoppelingen en deploymentgebonden testinzendingen. Bovendien maken zowel archivering als een code-rollback geen persoonsgegevens ongedaan. Deze procedure neemt die locaties en het voorkomen van heraanmaak mee.

Bronnen: https://docs.netlify.com/manage/forms/submissions/ ; https://docs.netlify.com/build/data-and-storage/netlify-blobs/ ; https://developers.openai.com/api/docs/guides/your-data
