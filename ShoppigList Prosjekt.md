# ShoppingList – prosjektbeskrivelse og driftsgrunnlag

Dokumentversjon: 3

Sist kontrollert mot lokal kode: 2026-10-01

Dokumentet beskriver eksisterende kode, lokale konfigurasjonsfiler og vedtatte krav til senere endringer. Krav merket som planlagt er ikke implementert. Opplysninger om Firebase-kontoer og aksepterte risikoer er bekreftet av brukeren; produksjonsnettstedet og aktive Firebase-innstillinger er ikke kontrollert av Codex. **Må Sjekkes** markerer gjenstående kontrollpunkter.

## Instruksjoner Codex ChatGPT skal følge

* Svar på norsk som standard.
* Hvis noe er uklart og påvirker endringen, spør før endringer gjøres.
* Alle prosjektendringer skal gjøres direkte i filene under `D:\GIT\ShoppingList-NoBackend\`.
* Ved hver endringsrunde i prosjektfilen økes dokumentversjonen med 1. Oppdater kontrolldatoen når dokumentet kontrolleres mot koden.
* Ved applikasjonsendringer skal appversjonen økes med 1 og relevante versjonsreferanser i dokumentasjon og tester oppdateres. Appen skal ha et versjonsnummer i koden. For å spare plass vises ikke versjon i GUI.
* Dokumentendringer alene øker bare dokumentversjonen. Fremtidige oppgaver i denne filen skal utføres når den aktuelle kodeendringen bestilles; de utvider ikke omfanget av en oppgave som bare gjelder prosjektfilen.
* Ikke list lange endringer i chat.
* Hvis noe må testes av brukeren, be om kun én test av gangen og vent på svar.
* Når jeg bruker "Du", "Deg" eller lignende, refererer dette til Codex ChatGPT.
* Handleliste bruker Firebase-prosjektet `handleliste-3bdaa`. Endringer må ikke ødelegge data, regler eller innlogging for `/handleliste` eller andre apper som deler databasen.
* Skill mellom implementert funksjonalitet og planer. Neste kodeendring er en klargjøringsrunde. Deretter følger PWA med internett påkrevd; offline-støtte og egen cache-strategi kommer senere.
* Automatiserte tester skal bruke isolerte testdata og ikke skrive til produksjonsdatabasen. Hold manuelle tester så få som mulig.
* Kontroller endringsomfang med `git diff`. Ikke endre andre filer enn oppgaven omfatter eller ta med uvedkommende lokale endringer i commit.

## Status

* GitHub-repo: `https://github.com/Bamsen61/ShoppingList-NoBackend`
* Lokal kopi: `D:\GIT\ShoppingList-NoBackend\`
* Oppgitt produksjonsadresse: `https://bamsen61.github.io/ShoppingList-NoBackend/index.html`
* `.github/workflows/deploy.yml` publiserer ved push til `main` og kan startes med `workflow_dispatch`.
* Bare innholdet i `docs/` lastes opp til GitHub Pages.
* Statisk HTML, CSS og JavaScript med ES modules; ingen build-prosess, `package.json` eller automatisert testpakke.
* Målplattform: Android Chrome. Responsiv layout finnes; øvrig nettleserkompatibilitet er ikke bekreftet.
* Ingen egen backend kjøres i repoet. Firebase Authentication og Realtime Database brukes direkte fra nettleseren.
* PWA, service worker og egen offline-cache er ikke implementert.
* Appversjon er ikke implementert. Et tomt versjonsfelt i HTML og `configuration_version` i `google-services.json` er ikke appversjoner.

## Formål

ShoppingList-NoBackend er en felles handleliste for to autoriserte brukere. Varer gjenbrukes mellom handleturer, organiseres etter butikk og registreres med kjøpshistorikk. Appen skal senere gjøres til en PWA (Progressive Web App).

## Funksjoner i appen

* **Handleliste:** `index.html` viser varer med `Buy === true`, sortert etter butikk og deretter varenavn. Vare og butikk vises på samme rad.
* **Registrere kjøp:** Kort trykk setter `Buy` til `false`, registrerer valgt person i `BoughtBy`, legger inn kjøpsdato og øker `BuyNumber` med 1. Varen forsvinner fra handlelisten, men beholdes i databasen.
* **Legg til eksisterende vare:** `markitemtobuy.html` viser varer med `Buy === false`, sortert etter varenavn. Kort trykk setter `Buy` til `true`.
* **Siste kjøp:** "Legg til" viser først varer med en gyldig kjøpsdato fra de siste 50 dagene. Grensen styres av `RECENTLY_BOUGHT_DAYS_LIMIT` i `docs/js/markitemtobuy.js`.
* **Vis alle og søk:** "Vis alle" viser alle varer som ikke står på handlelisten. Søk matcher deler av varenavnet uten å skille mellom store og små bokstaver. Endring i søkefeltet fjerner 50-dagersfilteret for resten av sideøkten.
* **Bokstavnavigasjon:** Sidefelt med `0`, `A–Z`, `Æ`, `Ø` og `Å`. Trykk tømmer søket, viser alle tilgjengelige varer og ruller til valgt bokstav, eventuelt neste bokstav med varer eller en foregående dersom ingen senere finnes. `0` samler navn med andre starttegn.
* **Ny vare:** `additemtodatabase.html` oppretter en vare med navn og butikk. Begge felt må fylles ut. Nye varer legges direkte på handlelisten.
* **Redigere og slette:** Langt trykk (700 ms) åpner `edititem.html`. Navn og butikk kan endres. "Slett Vare" krever bekreftelse og fjerner hele varen, inkludert historikken.
* **Personvalg:** Morten eller Linh velges på hovedsiden. Valget lagres lokalt og brukes i `AddedBy` og `BoughtBy`; det er uavhengig av innlogget Firebase-konto.
* **Skriftstørrelse:** 16, 20, 24 eller 36 px velges på hovedsiden og lagres lokalt. Brukes på varesidene; login har egen styling.
* **Realtime:** Hovedlisten og "Legg til" bruker `onValue` på `/handleliste`. Andre klienters endringer oppdaterer listene når forbindelse og tilgang fungerer.
* **Norsk sortering:** Felles funksjoner ignorerer store/små bokstaver og plasserer `Æ`, `Ø` og `Å` etter `Z`.

Ingen egen global butikkinnstilling, angrefunksjon for kjøp eller deduplisering ved opprettelse er implementert.

## Arkitektur og avhengigheter

* Hver side er et eget HTML-dokument. Varesidene bruker hver sin JavaScript-modul og felles `common.js`.
* `firebase-init.js` initialiserer Firebase og håndterer innlogging, UID-allowlist og eksport av databasefunksjoner.
* Firebase Modular Web SDK **9.23.0** importeres fra `https://www.gstatic.com/firebasejs/9.23.0/`. Ingen npm-installasjon kreves for å kjøre appen.
* Firebase-konfigurasjonen ligger direkte i `docs/js/firebase-init.js`. `.env` og `VITE_FIREBASE_*` leses ikke av eksisterende kode.
* Prosjekt: `handleliste-3bdaa`; database: `https://handleliste-3bdaa-default-rtdb.europe-west1.firebasedatabase.app`.
* Auth domain: `handleliste-3bdaa.firebaseapp.com`. Konfigurasjonen inneholder også Storage- og messaging-identifikatorer, men appmodulene bruker ikke disse tjenestene.
* Appen serveres over HTTP/HTTPS; `file://` er ikke normal arbeidsflyt for ES modules.

## Login med email

* `docs/login.html` bruker email/password gjennom `signInUser()`.
* Klienten tillater UID-ene `ZDq6ZGvDVDafX8BVlWGRhBoSn9X2` og `fmVOzYiAtsOUNnUE33VZbwHR0SG3`. De samme UID-ene står i den lokale regelfilen.
* `waitForAuth()` brukes før databaseoperasjoner. Manglende autorisert bruker eller timeout (5 sekunder) fører til login-siden.
* `browserLocalPersistence` er konfigurert for innlogging mellom nettleserøkter. Dette er ikke en garanti for at ny innlogging aldri kreves.
* Registrering og password reset er ikke implementert i appen.
* Logout-funksjonen finnes, men knappen i `index.html` er kommentert ut.

Brukeren har bekreftet at UID-ene fortsatt tilhører riktige Firebase-kontoer. Personvelgeren dokumenterer ikke hvem som er innlogget; begge brukere kan velge begge navn.

Logout skal ikke være tilgjengelig i vanlig brukergrensesnitt.

## Realtime Database-regler

Lokal regelfil: `database.rules.json`. `firebase.json` peker på denne, og `.firebaserc` angir standardprosjektet `handleliste-3bdaa`. Disse to konfigurasjonsfilene finnes lokalt, men er Git-ignorert og ikke tracked.

* Rotens `.read` og `.write` tillater de to UID-ene.
* `/handleliste/$itemId` krever `Name`, `Shop`, `AddedBy` og `Buy` for varer som lagres.
* `Name` må være en ikke-tom string på maksimalt 100 tegn; `Shop` og `AddedBy` ikke-tomme strings på maksimalt 50 tegn.
* `Buy` må være boolean; `BoughtBy` string på maksimalt 50 tegn; `BuyNumber` et tall større enn eller lik 0.
* `BoughtDate` validerer underverdier som strings. Datoformat og grensen på ti datoer håndheves ikke av reglene.
* Ingen `$other`-regel avviser ekstra felt under handlelistevarene. Sletting er tillatt for autoriserte brukere.
* Filen inneholder også regler for `/hvoreralle`, inkludert `Accuracy`. Handlelistekoden bruker ikke denne stien eller dette feltet.

Rottilgangen gjelder også underliggende stier. De to UID-ene får dermed tilgang til `/hvoreralle`; email-regelen der begrenser ikke tilgang som allerede er gitt ved roten. Brukeren har akseptert denne tilgangen; ingen regelendring er planlagt.

Brukeren har bekreftet at repoet HvorErAlle ikke lenger er aktivt. Det er ikke etablert noe krav om synkronisering med dette repoet. Eksisterende `/hvoreralle`-data og regler beholdes; et inaktivt repo er ikke en instruksjon om å slette dem.

Lokale regler beviser ikke hvilke regler som er aktive i Firebase. **Må Sjekkes**: Sammenlign med aktive regler før en senere regelendring eller regeldeploy. Dette er ikke et krav om regeldeploy i klargjørings- eller PWA-runden.

GitHub Actions publiserer nettstedet, ikke reglene. Ved en senere avtalt regelendring, med Firebase CLI installert og innlogget, publiseres den komplette regelfilen fra repo-roten:

```powershell
Set-Location 'D:\GIT\ShoppingList-NoBackend'
firebase deploy --only database --project handleliste-3bdaa
```

Ikke erstatt gjeldende regler med eldre eksempler med offentlig tilgang eller generell `auth != null`.

## Datamodell

Hver vare ligger under `/handleliste/<Key>`. Nye nøkler genereres med Firebase `push()`.

| Felt | Type brukt i appen | Innhold og oppførsel |
|---|---|---|
| `AddedBy` | String | Valgt person ved opprettelse; standard `Morten` hvis lokalt valg mangler. |
| `BoughtBy` | String | Valgt person ved siste kjøp; tom string ved opprettelse. Dagens kjøpsfunksjon bruker `Anonymous` hvis personvalget mangler. Planlagt krav: bruk `Morten` som standard. |
| `BoughtDate` | Array av strings | Inntil ti siste registrerte kjøpsdatoer, nyeste registrering først, i format `YYYY-MM-DD`. Tom array ved opprettelse; koden håndterer manglende felt som tom historikk. |
| `Buy` | Boolean | `true`: på handlelisten; `false`: tilgjengelig under "Legg til". Ny vare får `true`. |
| `BuyNumber` | Number | Antall registrerte kjøp; starter på 0 og økes med 1. Reglene krever ikke heltall. |
| `Name` | String | Varenavn; trimmes ved opprettelse og redigering. |
| `Shop` | String | Butikk per vare; trimmes ved opprettelse og redigering. |

`id` legges til i minnet fra Firebase-nøkkelen når listene lastes; lagres ikke som eget felt av appen. Historikken har ingen klokkeslett. Flere kjøp samme dag gir like datoer.

Eksempel på format, ikke en kontrollert produksjonsrecord:

```json
{
  "handleliste": {
    "-eksempelVare": {
      "AddedBy": "Morten",
      "BoughtBy": "Linh",
      "BoughtDate": ["2026-09-28", "2026-08-22"],
      "Buy": false,
      "BuyNumber": 16,
      "Name": "Kaffe",
      "Shop": "Extra"
    }
  }
}
```

Kjøpsdato bruker nå `toISOString()` og dermed UTC-dato. 50-dagersfilteret bruker nettleserens lokale midnatt. Planlagt krav: nye kjøp skal registreres med norsk lokal dato (`Europe/Oslo`), og 50-dagersfilteret skal bruke samme datogrunnlag. Formatet forblir `YYYY-MM-DD`; eksisterende kjøpshistorikk skal ikke omskrives.

Kjøpsregistrering bruker `get()` etterfulgt av `update()`, uten transaction. Samtidige kjøp av samme vare kan overskrive teller eller historikk. Brukeren har akseptert dette; innføring av transaction er ikke planlagt.

## Lokal lagring og navigasjon

* `localStorage` lagrer `person` og `fontSize`, ingen global `shop`-innstilling.
* Firebase håndterer persistent auth separat. Lokal lagring erstatter ikke varedatabasen.
* Hovedsidens listener ryddes ved `pagehide` og kobles til igjen ved `pageshow` fra back/forward cache. "Legg til" rydder ved `beforeunload`.
* Redigering bruker URL-parametrene `id` og `return`. Normal retur er `index.html` eller `markitemtobuy.html`.
* `returnToMainPage()` bruker historikken ved referrer med samme origin og tilgjengelig historikk; ellers `location.replace("index.html")`. Flere andre overganger bruker også `location.replace()`.

Planlagt krav: `returnToMainPage()` skal alltid gå til `index.html`, også etter opprettelse/avbryt av ny vare og ved «Tilbake» fra «Legg til». Dette er ikke implementert; funksjonen bruker fortsatt nettleserhistorikken. Den separate `return=markitemtobuy.html`-returen fra redigering beholdes. Androids Back-knapp må fortsatt kontrolleres ved navigasjonsendringen.

## PWA og cache – planlagt

PWA er ikke implementert. Nåværende app har ingen manifestfil, service worker, service worker-registrering eller PWA-ikoner. `site/manifest.webmanifest` og `site/sw.js` fra dokumentmalen beskriver ikke dette repoet.

Brukeren har bestemt at klargjøringsrunden gjennomføres først. Første PWA-runde gir installasjon på Android Chrome og åpning i eget appvindu, med internett påkrevd. Offline-støtte og egen cache-strategi utsettes.

Før PWA-implementeringen må følgende konkretiseres:

* Manifest, ikoner og en eventuell service worker plasseres under `docs/` for publisering.
* `start_url` og `scope` tilpasses GitHub Pages-stien `/ShoppingList-NoBackend/`.
* Navn, ikoner, `display`, `theme_color` og `background_color` velges.
* Første PWA-runde skal ikke legge til egen ressurscache eller kø for databaseoperasjoner uten internett. Behovet for service worker vurderes ut fra installasjonskravene ved implementering; dagens kode har ingen.
* Installasjon og vanlig bruk med internett testes på Android Chrome. Innlogging, realtime og navigasjon må fungere både i nettleseren og i appvinduet.

**Må Sjekkes**: Appnavn, ikonmotiv og farger er ikke valgt. Avklar disse før PWA-implementering. Offline-støtte, cache-strategi og tilhørende oppdateringsflyt kommer i en senere oppdatering.

## Filstruktur

| Fil/mappe | Ansvar |
|---|---|
| `docs/` | Alt innholdet som publiseres til GitHub Pages. |
| `docs/index.html` | Hovedliste, personvalg, skriftstørrelse og "Legg til". Tomt versjonsfelt; logout-knapp kommentert ut. |
| `docs/login.html` | Login, feilmeldinger og redirect; inline JavaScript og CSS. |
| `docs/markitemtobuy.html` | Eksisterende varer, søk, bokstavnavigasjon og knapper for ny vare, alle varer og retur. |
| `docs/additemtodatabase.html` | Skjema for opprettelse av vare. |
| `docs/edititem.html` | Skjema for redigering og sletting. |
| `docs/js/firebase-init.js` | Firebase-konfigurasjon, SDK, UID-allowlist, persistence og auth-funksjoner. |
| `docs/js/common.js` | Lokal lagring, skriftstørrelse, sortering, langt trykk og navigasjon. |
| `docs/js/main.js` | Realtime hovedliste og registrering av kjøp. |
| `docs/js/markitemtobuy.js` | Realtime tilgjengelige varer, 50-dagersfilter, søk og bokstavnavigasjon. |
| `docs/js/additemtodatabase.js` | Opprettelse med Firebase `push()`. |
| `docs/js/edititem.js` | Lasting, oppdatering og sletting av enkeltvare. |
| `docs/css/style.css` | Felles styling og responsiv layout for varesidene. |
| `docs/api-key-test.html` | Diagnoseside som leser `.info/connected`; egen Firebase-konfigurasjon. |
| `docs/auth-diagnostic.html` | Eldre diagnoseside som kan forsøke anonymous authentication og leser `/handleliste`. |
| `docs/quick-auth-fix.html` | Eldre veilednings-/testside for anonymous authentication. |
| `docs/auth-persistence-test.html` | Auth-status og logout-test med felles Firebase-init. |
| `docs/CountDown.html` | Frittstående nedtelling; ikke del av handlelistens navigasjon. |
| `docs/google-services.json` | Firebase-konfigurasjonsfil; ikke lastet av appmodulene, men ligger i publiseringsmappen. |
| `database.rules.json` | Lokale regler for `/handleliste` og `/hvoreralle`. |
| `firebase.json` | Lokal, Git-ignorert kobling til regelfilen for Firebase CLI. |
| `.firebaserc` | Lokalt, Git-ignorert standardprosjekt for Firebase CLI. |
| `.github/workflows/deploy.yml` | Publisering av `docs/` uten build eller tester. |
| `.gitignore` | Ignorerer blant annet miljøfiler og lokale Firebase CLI-filer. |
| `.env.example` | Lokal mal med `VITE_FIREBASE_*`; Git-ignorert av eksisterende mønster og ikke brukt av appen. |
| `test_server.py` | HTTP-server for `docs/`; skriver ut URL-er og åpner nettleser. Ingen automatiserte assertions. |
| `Readme.md` | Oversikt og oppstart; Git registrerer filnavnet som `README.md`. |
| `TESTING.md` | Eldre manuell testguide med utdaterte forventninger. |
| `FIREBASE_SETUP.md` | Eldre oppsett for anonymous authentication og alternative regler. |
| `SECURITY_DEPLOYMENT.md` | Eldre email/password-veiledning med utdaterte regler og innloggingsopplysninger. |
| `DEPLOY_RULES.md` | Eldre regeldeploy-veiledning med eksempler som ikke er gjeldende regler. |
| `ShoppigList Prosjekt.md` | Denne prosjektbeskrivelsen og avklaringspunktene. |

## Dokumentasjonsavvik og sikkerhetspunkter

* `SECURITY_DEPLOYMENT.md` inneholder et passord i klartekst. Brukeren har akseptert risikoen. Dette punktet gjenåpnes ikke som en avklaring; passordet gjentas ikke i prosjektfilen.
* `FIREBASE_SETUP.md` og `DEPLOY_RULES.md` viser offentlig database-tilgang og anonymous authentication. `SECURITY_DEPLOYMENT.md` viser bredere tilgang enn UID-allowlisten og feil datatype for `BoughtDate`. Planlagt: revider veiledningene i klargjøringsrunden mot gjeldende kode og lokale regler; ikke deploy regler som del av dokumentasjonsrettingen.
* `Readme.md` hevder miljøvariabelstøtte og verifiserte API key-restriksjoner. Planlagt: korriger dokumentet i klargjøringsrunden. **Må Sjekkes**: Faktiske restrictions og authorized domains krever kontroll i Firebase/Google Cloud ved relevante auth-/konfigurasjonsendringer. Ikke beskriv dem som verifisert uten slik kontroll.
* `TESTING.md` beskriver "Loading shop...", global butikkredigering, `shop` i localStorage og eldre knappenavn. Firebase-veiledningene viser også til testsider som ikke finnes. Planlagt: oppdater testguiden mot den ferdige koden og det nye testregimet. Bruk eksisterende filnavn `TESTING.md`; ikke opprett `Testing.md` som en ekstra fil.
* Alt i `docs/` publiseres fortsatt. Planlagt: bare nødvendige appfiler skal være i publiseringsmappen. Flytt diagnosesidene, `google-services.json` og `CountDown.html` ut av `docs/` til en upublisert mappe, og rett relevante lenker. Bevar filene i repoet; det er ikke behov for å slette dem for å utelate dem fra produksjon. Ingen av dem er lastet fra den ordinære appflyten.

## Lokal kjøring og verifikasjon

Kjør med Python tilgjengelig:

```powershell
Set-Location 'D:\GIT\ShoppingList-NoBackend'
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Åpne `http://127.0.0.1:8000/`. Lokal kjøring bruker samme Firebase-prosjekt som produksjonskoden, ikke en emulator. Ingen separat testdatabase er konfigurert; funksjonstester kan endre reelle data. `python test_server.py` er et alternativ fra repo-roten, men binder serveren til alle nettverksgrensesnitt.

Ved fremtidige kodeendringer velges relevante kontroller:

1. Autorisert login, bevart innlogging og avvisning av uautorisert bruker.
2. Opprettelse, legge til eksisterende vare og kjøp med korrekt teller og historikk.
3. Realtime mellom to klienter.
4. Redigering og sletting av en særskilt testvare.
5. 50-dagersfilter, "Vis alle", søk og bokstavrekkefølgen `Æ`, `Ø`, `Å`.
6. Personvalg, skriftstørrelse, langt trykk og Back-navigasjon på Android Chrome.

Dette er en referanseliste. Be brukeren om én konkret test av gangen og vent på svar. `npm test` og `npm run check` finnes ikke i repoet.

### Planlagt automatisert testregime

Ingen automatiserte tester er implementert ennå. Klargjøringsrunden skal etablere et kjørbart testregime med isolerte fixtures og en mock av Firebase for tester som ellers ville skrevet til databasen. Testkjøring skal ikke bruke produksjonskontoer eller gjøre write-operasjoner mot produksjonsdatabasen, heller ikke opprette og deretter slette testvarer der.

Prioriter tester for standardperson, datoer rundt norsk midnatt/sommertid, 50-dagersfilter, sortering, navigasjon og vareoperasjonene. Kontroller også at publiseringsmappen bare inneholder appens nødvendige filer. Dokumenter valgt verktøy og den faktiske testkommandoen i `TESTING.md` og prosjektfilen når oppsettet finnes.

Mocks bekrefter ikke aktive Firebase-regler eller innlogging mot Firebase. Bruk en lokal emulator dersom automatisert integrasjonstest av disse blir nødvendig. Begrens manuell kontroll til det automatiseringen ikke dekker, særlig ekte auth/realtime og Androids Back-knapp/PWA-installasjon.

## Neste kodeendringer – vedtatt rekkefølge

Denne dokumentoppdateringen gjennomfører ingen av punktene nedenfor.

### 1. Klargjøring før PWA

* Innfør ett sentralt appversjonsnummer i koden, uten visning i GUI. Brukeren har fastsatt første appversjon til `1`; deretter økes den med 1 per kodeendringsrunde. Appversjonen er uavhengig av dokumentversjonen.
* Endre standardverdien for `BoughtBy` fra `Anonymous` til `Morten`.
* Bruk norsk lokal dato ved nye kjøp og samme datogrunnlag i 50-dagersfilteret. Behold eksisterende historikk og datoformat.
* La `returnToMainPage()` gå direkte til forsiden.
* Revider eksisterende veiledninger og testdokumentasjon. Behold UID-allowlist, skjult logout og akseptert håndtering av samtidige kjøp.
* Flytt filer som ikke trengs av appen ut av `docs/`, uten å slette dem.
* Etabler automatiserte tester med isolerte data og verifiser at de ikke skriver til produksjonsdatabasen.

Klargjøringen er ferdig når relevante tester passerer, dokumentasjonen beskriver faktisk kode og publiseringsmappen er kontrollert. Ingen endring i datamodell, aktive Firebase-regler eller eksisterende varer inngår i denne runden.

### 2. PWA med internett påkrevd

* Avklar appnavn, ikoner og farger, og implementer manifest/installasjon med riktig GitHub Pages-sti.
* Kontroller installasjon og oppstart i eget appvindu på Android Chrome samt eksisterende login, realtime og navigasjon.
* Øk appversjonen og oppdater dokumentasjonen. Offline-støtte og egen cache-strategi inngår i en senere oppdatering.

## Publisering og tilbakeføring

Workflowen `.github/workflows/deploy.yml` heter `Deploy to GitHub Pages`. Den publiserer `docs/` og kjører ingen applikasjonstester. En dokumentcommit på `main` utløser også workflowen.

Kontroll og commit av bare denne dokumentoppdateringen:

```powershell
Set-Location 'D:\GIT\ShoppingList-NoBackend'
git diff --check
git diff -- 'ShoppigList Prosjekt.md'
git add -- 'ShoppigList Prosjekt.md'
git commit -m 'Oppdater prosjektbeskrivelse mot eksisterende kode'
```

Ved avtalt publisering fra `main`:

```powershell
git push origin main
```

Etter applikasjonsendringer kontrolleres workflow-resultat og aktuell produksjonsfunksjon. Manuell mobiltest gis én oppgave av gangen. Ingen commit, push eller Firebase-deploy er utført i denne dokumentgjennomgangen.

Ved tilbakeføring reverseres den konkrete feilaktige committen med `git revert`, etter kontroll av lokale endringer. En eldre nettstedversjon reverserer ikke databaseendringer eller Firebase-regler. Før senere endringer i regler eller datamodell sikres gjeldende regler og nødvendige data separat.

## Endringslogg for prosjektfilen

* **2026-10-01 – dokumentversjon 3:** Første appversjon fastsatt til `1` av brukeren. Avklaringspunktet om startnummer fjernet. Bare prosjektfilen endret.
* **2026-10-01 – dokumentversjon 2:** Brukerens avklaringer bevart. Dagens kode skilt fra vedtatte krav; klargjøring før PWA, avgrenset PWA-omfang, produksjonsopprydding og isolerte automatiserte tester dokumentert. Gjenstående startnummer og PWA-utforming markert. Bare prosjektfilen endret.
* **2026-10-01 – dokumentversjon 1:** Kontrollert mot lokal kode. Funksjoner og filstruktur fylt ut; datamodell, innlogging, regler, kjøring og publisering korrigert. PWA dokumentert som planlagt. Avvik og vurderingspunkter merket. Ingen applikasjonsfiler endret.
