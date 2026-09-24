# OpvangWerkPlan – van v6 naar de eerste klant

Werkversie: 24 september 2026. Doel: binnen ongeveer vier weken klaar voor een kleine proeflancering.
Deze oplevering bevat broncode en lokaal gebouwde websitebestanden. Zij is nog niet op de live Netlify-site gepubliceerd.

## Wat is in v6 gemaakt?

- Bewerken van alle werkplanonderdelen, met de oorspronkelijke intake ernaast voor nieuwe aanvragen.
- Controlepunten afwerken; eigen controle en akkoord van de klant apart vastleggen.
- Definitieve PDF maken zonder conceptlabel of interne controlepunten. De bestaande PDF-lettertypen zijn behouden.
- Betaling registreren: onbetaald, betaalverzoek verstuurd of betaald.
- Afronden na betaling en bevestigde levering.
- Aanvragen en foutmeldingen omkeerbaar archiveren; archief doorzoeken en terugzetten.
- Aanvraag exporteren als JSON; conceptmails openen in het eigen mailprogramma.
- Nieuwe aanvragen verschijnen als wachtrij/bezig. Na 16 minuten volgt een melding om de log te controleren.
- Eén interne opdracht wordt niet dubbel uitgevoerd bij herhaalde aanroep van de achtergrondfunctie.
- Oude v5-records blijven leesbaar. Oude records hebben geen oorspronkelijke intake in beheer.
- Bewerkingen gebruiken versiecontrole: twee tabbladen mogen elkaars wijzigingen niet stil overschrijven.
- Intake controleert PDF-bestandstype en bestandsgrootte (maximaal 6 MB).
- Bij een mislukte formulierverzending blijven de antwoorden in het huidige venster.
- Contact-, privacy- en voorwaardenpagina's, favicon, 404-pagina en zoekmachine-instellingen.
- Aanvullende beveiligingsheaders en afscherming van geheime waarden in foutmeldingen.
- Standaard maximaal 20 automatische generaties per UTC-dag; instelbaar met MAX_DAILY_GENERATIONS.
- Lanceringschecklist op /lancering.html, met vinkjes die alleen lokaal in de browser blijven.

## Blokkades voor commerciële lancering

1. **Identiteit en adres.** De opgegeven handelsnaam is **Opvangwerkplan** en het beoogde domein **opvangwerkplan.nl**. Het zakelijke e-mailadres, telefoonnummer **0615151426** en het door jou voor publicatie goedgekeurde adres **Achterdijk 5, 3981 HA Bunnik** zijn verwerkt. Vul nog de exacte juridische naam, het KvK-nummer en het btw-id in. Op het inschrijfscherm staat **afschermen bezoekadres: nee**; het opgegeven adres wordt bij publicatie ook op de website getoond.
2. **Adres.** Je hebt het vestigingsadres expliciet voor publicatie goedgekeurd; de adresbevestiging staat daarom aan. Controleer bij inschrijving of het definitieve vestigingsadres gelijk blijft. Bij een wijziging pas je de website en bedrijfsdocumenten aan.
3. **Dienstverleningsafspraken.** Bevestig €49 inclusief btw, één correctieronde binnen 30 dagen, betaling na persoonlijk contact, en levering op een schriftelijk afgesproken datum. De teksten doen bewust geen automatische belofte dat elk werkplan binnen een vaste termijn gereed is.
4. **Privacy.** De bewaartermijnen (3 maanden voor niet-doorgezette aanvragen, 12 maanden voor afgeronde werkbestanden) zijn voorgestelde werkafspraken. Controleer verwerkersafspraken, internationale doorgifte, instellingen en bewaartermijnen bij Netlify, OpenAI en de gebruikte e-maildienst. Een privé-Gmail-account is niet zonder meer een afgeronde zakelijke privacy-inrichting.
5. **Voorwaarden.** Laat de teksten toetsen aan de feitelijke dienstverlening en verkoop aan bedrijven versus consumenten. De werkversie biedt consumenten een ruime, kosteloze herroeping binnen 14 dagen. Veronderstel niet dat maatwerk automatisch alle bedenktijd uitsluit. Bij latere online contractsluiting/betaling moet ook de actuele herroepingsfunctie worden beoordeeld.
6. **Domein en e-mail.** Controleer of opvangwerkplan.nl daadwerkelijk geregistreerd is en onder jouw beheer valt. Configureer daarna DNS/HTTPS en bij zakelijke mail SPF, DKIM en DMARC via de provider.
7. **Administratie.** Richt offertes, factuurnummering, betalingen en een bewaarlocatie voor klantakkoorden in. De betaalstatus in het beheer is een handmatige registratie, geen betaalprovider of boekhouding.
8. **Live proef.** Doe na deploy een echte test met fictieve gegevens en controleer generatie, opslag, notificatie, bewerking en definitieve PDF. De lokale tests gebruiken geen betaalde OpenAI-aanroepen.

Pas na deze punten zet je launchReady in site-config.json op true. De build weigert een lanceringsversie wanneer verplichte velden of de drie reviewbevestigingen ontbreken. Dit is een technische controle op ingevulde velden, geen juridische goedkeuring.

Het goedgekeurde adres staat in address en addressReviewComplete is true. Als je later het vestigingsadres wijzigt of laat afschermen, herbeoordeel dan eerst de openbare bedrijfsgegevens.

## Vier weken

| Week | Resultaat | Acties voor Luca |
|---|---|---|
| 1 | Bedrijfsbasis vast | KvK, adresvraag, domeinregistratie controleren, telefoon, btw en prijs |
| 2 | Werkende v6 op Netlify | Build/deploy, bestaande gegevens testen, twee nieuwe fictieve aanvragen |
| 3 | Verkoopproces getest | Voorwaarden/privacy bevestigen, factuurproces, 2–3 proefgastouders |
| 4 | Kleine lancering | Feedback verwerken, gegevens definitief, testdata opruimen, domein/mail/mobiel eindtest |

Er zijn geen automatische herinneringen of achtergrondcontroles ingesteld.

## Eén klant van aanvraag tot levering

1. Lees de melding; controleer dat de juiste aanvraag in Netlify Forms staat.
2. Open /admin.html, voer ADMIN_TOKEN in en open het werkplan.
3. Vergelijk de tekst met intake en het werkelijke beleid van ieder betrokken bureau. Open beleidsbijlagen daarvoor in Netlify Forms.
4. Corrigeer de tekst en los de controlepunten inhoudelijk op. Alleen een vinkje zetten verandert de tekst niet.
5. Stuur eerst de schriftelijke opdrachtbevestiging: prijs, inhoud, leverdatum, correctieronde en voorwaarden. Bewaar akkoord vóór je een betalingsverplichting vastlegt.
6. Stuur het concept met de bijbehorende controlepunten ter controle aan de klant. De mailknop maakt alleen een concept; voeg de PDF zelf toe.
7. Verwerk correcties, registreer klantakkoord en betaling en sla op.
8. Maak na de definitieve PDF zo nodig de Mollie-betaallink; stuur hem pas na de schriftelijke opdrachtbevestiging naar de klant. Controleer in beheer dat er **LIVE** en uiteindelijk **betaald** staat, of verifieer een andere echte betaling. Verstuur daarna de PDF en markeer af als afgerond.
9. Verander je de tekst later? Opslaan maakt weer een concept en trekt de oude definitieve PDF in het beheer in. Al verstuurde kopieën verdwijnen natuurlijk niet.
10. Archiveren is alleen opruimen in het overzicht. Gebruik onderstaande procedure voor echte verwijdering.

## Bewaren en verwijderen

Voorgestelde handmatige routine, vóór lancering definitief afspreken:
- Niet-doorgezette aanvragen: uiterlijk 3 maanden na laatste inhoudelijke contact.
- Afgeronde intake, beleid en werkbestanden: uiterlijk 12 maanden na afronding, tenzij een concrete wettelijke reden/geschil bewaring vereist.
- Facturen en overige fiscaal verplichte administratie afzonderlijk bewaren volgens de wettelijke termijn, doorgaans 7 jaar.

Voor een verwijderverzoek:
1. Stel vast om welke persoon en aanvraag het gaat, en welke gegevens wel/niet weg mogen.
2. Noteer het aanvraag-id uit de JSON-export of het beheer. Exporteer persoonsgegevens alleen wanneer nodig; sla ze veilig op.
3. Verwijder in Netlify Blobs uitsluitend de bijbehorende keys in de store opvangwerkplan-concepten: records/ID.json, pdf/ID.pdf, pdf/ID/… en waar aanwezig errors/ID.json, jobs/ID.json en claims/ID.json.
4. Verwijder ook de betreffende Netlify Forms-inzending en upload. Controleer welke bewaartermijn de provider voor resterende technische kopieën hanteert.
5. Verwijder onnodige e-mails, bijlagen, lokale downloads en exports. Behoud de afzonderlijke administratie die je wettelijk moet bewaren.
6. Bevestig de afhandeling aan de aanvrager. Verwijder niet de gehele Blobs-store.
Er is bewust geen automatische verwijdering van bestaande klantgegevens uitgevoerd.

## Techniek en grenzen

- Netlify blijft de host. OPENAI_API_KEY en ADMIN_TOKEN blijven environment variables, nooit code.
- ADMIN_TOKEN is minimaal 12 tekens; gebruik een lange willekeurige code en een wachtwoordmanager.
- De beheercode wordt in v6 alleen in het geheugen van het tabblad gebruikt; na herladen log je opnieuw in.
- De e-mailmelding aan Luca wordt door Netlify Forms ingesteld voor werkplan-aanvragen én werkplan-intake.
- Er is geen automatische e-mail aan de klant of automatische incasso. De Mollie-betaallink wordt handmatig na de opdrachtbevestiging verstuurd. Dit past bij het afgesproken persoonlijke contactproces.
- Mollie-betaallinks zijn optioneel en worden uitsluitend vanuit het beveiligde beheer gemaakt nadat de tekst en het klantakkoord zijn gecontroleerd. De server bepaalt de vaste prijs van €49; de klant betaalt via de betaalpagina van Mollie. Een testbetaling kan een opdracht niet als daadwerkelijk geleverd afsluiten.
- De daglimiet telt gestarte generaties, ook als die mislukken. Er is geen automatische herstart de volgende dag. Bewaar de aanvraag in Forms en beoordeel hem handmatig. Verander MAX_DAILY_GENERATIONS alleen als je budget en belasting dat toelaten.
- Een formulier dat een klant opnieuw indient is een nieuwe aanvraag. De interne deduplicatie voorkomt alleen dubbel uitvoeren van hetzelfde dispatch-id.
- Bij een harde platformtimeout kan een aanvraag op bezig blijven staan. Na 16 minuten toont beheer dat controle van de log nodig is. Niet blind opnieuw indienen.
- Deze versie maakt één concept tegelijk per aanvraag, met expliciete menselijke goedkeuring. Ze is geen GGD-goedkeuring of vervanging van het beleid van het bureau.
- Een PDF-fout na AI-generatie wordt zichtbaar als fout, maar de ruwe AI-uitvoer wordt dan niet als bewerkbaar concept bewaard. Controleer de log en oorspronkelijke Forms-inzending.
- Er is geen automatische back-updienst ingesteld. Bewaar het deploypakket en de financiële administratie; maak noodzakelijke klantexports alleen op een beveiligde plek.


## Mollie betalen: nu testen, later activeren

De website gebruikt voorlopig de eerder afgesproken werkwijze: **vrijblijvende intake → jouw controle en schriftelijke opdrachtbevestiging → persoonlijk betaallinkje → na betaling definitieve PDF**. Er is geen automatische betaling op de homepage.

Voor testmodus:
1. Maak een Mollie-account en websiteprofiel als de aanmeldflow dit al toelaat. Verzin geen KvK-nummer; Mollie kan de afronding van de onboarding uitstellen totdat de inschrijving rond is.
2. Haal de **Test API key** uit het Mollie-dashboard. Zet in Netlify de geheime variabelen `MOLLIE_MODE=test` en `MOLLIE_TEST_API_KEY=...` (waarde begint met `test_`). Deel de sleutel niet in chat of screenshots.
3. Publiceer een testdeploy van v6 met werkende serverfuncties. Controleer een fictief concept, vink controle en klantakkoord af, sla op en maak de definitieve PDF. Open dan het beheerscherm, klik **Maak betaallink van €49**, kopieer die link en doorloop de Mollie-testbetaalpagina.
4. Controleer de functielog van `mollie-webhook`, klik **Controleer betaalstatus** en controleer dat de aanvraag **TEST** zegt. Test ook annuleren. Een browser-terugkeer is geen betaalbevestiging.

Voor echte betalingen:
1. Rond bij Mollie de organisatieverificatie af: KvK-nummer, btw-nummer, identiteit, bankrekening, websiteprofiel en iDEAL/Wero of andere betaalmethoden. Dit kan verwerkingstijd kosten; het KvK-nummer alleen schakelt betalingen niet direct in.
2. Rond de bedrijfsgegevens, adressituatie, privacytekst, voorwaarden en live proef af. Controleer domeineigendom en zakelijke e-mail.
3. Zet de geheime `MOLLIE_LIVE_API_KEY` in Netlify, kies `MOLLIE_MODE=live` en zet pas na de livecontrole `LIVE_PAYMENTS_APPROVED=yes`. Houd de test- en livesleutel gescheiden.
4. Doe één echte betaling met een testopdracht en controleer bedrag, status, factuur, uitbetaling en een eventuele terugbetaling.

Een webhook haalt de status zelf bij Mollie op en vergelijkt transactie-id, aanvraag-id, modus en exact €49. Een vervalste terugmelding kan een aanvraag dus niet als betaald markeren. Bij netwerkuitval vlak na het aanvragen van een link blokkeert de code een tweede poging om dubbele betalingen te vermijden. Controleer dan eerst het Mollie-dashboard en de Netlify-functielog; verwijder een `payment-locks/ID/POGING.json` alleen nadat je zeker weet dat er geen betaling in Mollie is aangemaakt. De betaalstatus in het beheer vervangt de wettelijke factuur niet.

## Verificatie bij oplevering

Geslaagd: build, generator-mocktest, authenticatie- en beheertests, oude-recordcompatibiliteit, versieconflicten, gelijktijdige bewerkingen, finaliseren, heropenen als concept, archiveren, foutafscherming, daglimiet en PDF-generatie.
De definitieve PDF en een document met 28 lange controlepunten zijn gerenderd en visueel gecontroleerd op overloop.
Geen live betaalde API-test of publicatie uitgevoerd. De betalingstests gebruiken een lokale Mollie-simulatie en controleren echte serverlogica, inclusief €49, dubbele klikken, nepwebhooks en terugbetaling.
De browserinstallatie voor een geautomatiseerde visuele mobiele/desktoptest mislukte in deze omgeving. Die controle blijft daarom onderdeel van de live proef. De code bevat responsieve opmaak, maar dat is geen bewijs van een geslaagde browsertest.

## Bronnen, gecontroleerd 22 september 2026

- Adres afschermen: https://www.kvk.nl/over-het-handelsregister/afschermen-van-je-bezoekadres-wat-is-mogelijk/
- Websitegegevens en uitzondering afscherming: https://ondernemersplein.overheid.nl/wetten-en-regels/regels-voor-bedrijfscorrespondentie/
- Bedrijfsgegevens bij online verkoop: https://www.acm.nl/nl/verkoop-aan-consumenten/consumenten-informeren/bedrijfsgegevens-vermelden
- Bewaartermijnen: https://www.autoriteitpersoonsgegevens.nl/themas/basis-avg/privacy-en-persoonsgegevens/bewaren-van-persoonsgegevens
- Bedenktijd: https://www.acm.nl/nl/verkoop-aan-consumenten/klantenservice/bedenktijd
- Gastouderopvang: https://www.rijksoverheid.nl/themas/familie-zorg-en-gezondheid/kinderopvang/kwaliteit-gastouderopvang
- Netlify builds/deploys: https://docs.netlify.com/deploy/create-deploys/
- Forms-uploadgrens: https://docs.netlify.com/manage/forms/setup/
- Mollie-testmodus: https://docs.mollie.com/reference/testing
- Mollie-webhook: https://docs.mollie.com/reference/webhooks
- Mollie-onboarding: https://help.mollie.com/hc/nl/articles/210709969-Hoe-maak-ik-een-account-aan
- Netlify Blobs-versiecontrole: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
