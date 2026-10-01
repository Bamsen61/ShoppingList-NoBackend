# ShoppingList – prosjektbeskrivelse og driftsgrunnlag

Sist kontrollert mot produksjonskoden: 2025-07-30

## Instruksjoner Codex ChatGPT skal følge

* Hvis noe er uklart, spør før endringer gjøres.
* Alle endringer skal gjøres direkte i filene under `D:\GIT\ShoppingList-NoBackend\`.
* Ved hver endringsrunde skal versjonsnummeret økes med 1.  
  Oppdater også versjonsreferanser i dokumentasjon og tester.
* Ikke list lange endringer i chat.
* Hvis noe må testes av brukeren, be om kun én test av gangen og vent på svar.
* Når jeg bruker «Du», «Deg» eller lignende, refererer dette til Codex ChatGPT.
* Handleliste bruker Firebase-prosjekt.  
  Endringer må ikke ødelegge data, regler eller innlogging for `handleliste`.

## Status

* GitHub-repo: `https://github.com/Bamsen61/ShoppingList-NoBackend`
* Lokal kopi: `D:\GIT\ShoppingList-NoBackend\`
* Produksjon: `https://bamsen61.github.io/ShoppingList-NoBackend/index.html`
* Publisering skjer automatisk med GitHub Actions ved hver push til `main`.
* Det er ingen build-prosess; applikasjonen består av statisk HTML, CSS og JavaScript.
* Løsningen er for Android Chrome.

## Formål

ShoppingList-NoBackend er en handleliste app med enkel funksjonalitet.
Appen skal være en PWA-app (Progressive Web App)

## Funksjoner i appen

**Oppdateres av Codex på bakgrunn av eksisterende app**
* Realtime database som oppdaterer alle aktive klienter uniddelbart når det er endringer.

## Login med email

To brukere er allerede definert i Firebas basen.


### Realtime Database-regler

Gjeldende regler ligger i `database.rules.json`.

Regelfilen finnes også i `D:\GIT\ShoppingList-NoBackend\database.rules.json`.  
De to kopiene må holdes synkronisert når Firebase-reglene endres,
slik at en senere deploy fra ett repo ikke ødelegger den andre appen.  

GitHub Actions publiserer bare nettstedet. Database-regler publiseres separat fra repo-roten:

```powershell
firebase deploy --only database
```

# --- Over dette er oppdatert  ---

## Datamodell

Hver record ligger under `/handleliste/<Key>`.

| Felt | Type | innhold |
|---|---|---|
| `AddedBy` | Tekst | Brukeren som la til varen |
| `BoughtBy` | Tekst | Den som sist kjøpte varen |
| `BoughtDate` | List[Tekst] | De 10 siste kjøpstidspunkt på formatet `YYYY-MM-DD hh:mm:ss`. Nyeste først |
| `Buy` | Boolean | Ligge i listen over varer som skal kjøpes |
| `BuyNumber` | Int | Hvor mange ganger er varen kjøpt. |
| `Name` | Text | Hva heter varen. |
| `Shop` | Text | Hva heter butikken varen kjøpes i. |

`Accuracy` settes til `Fine` når nettleseren rapporterer inntil 100 meter, ellers `Coarse`.

Eksempel:

```json
"-OOMRXbquuc76Nxbslta": {
  "AddedBy": "Morten",
  "BoughtBy": "Morten",
  "BoughtDate": [
    "2026-09-28",
    "2026-08-22",
    "2026-08-01",
    "2026-07-08",
    "2026-06-02",
    "2026-05-08",
    "2026-04-18",
    "2026-04-01",
    "2026-01-19",
    "2025-12-19"
  ],
  "Buy": false,
  "BuyNumber": 16,
  "Name": "Kaffe",
  "Shop": "Extra"
},
```

## PWA og cache

PWA-oppsettet består av:

* `site/manifest.webmanifest`
* `site/sw.js`
* ikonene `192x192`, `512x512` og `180x180`
* HTTPS via GitHub Pages
* `display: standalone`
* definert `start_url`, `scope`, `theme_color` og `background_color`

## Filstruktur

| Fil/mappe | Ansvar |
|---|---|
**Oppdateres av Codex på bakgrunn av eksisterende app**

## Publisering

Workflowen `.github/workflows/deploy-pages.yml` kjører automatisk ved push til `main` og
kan også startes manuelt med `workflow_dispatch`.

Normal arbeidsflyt:

```powershell
npm test
npm run check
git diff --check
git add --all
git commit -m "Kort beskrivelse"
git push origin main
```

Etter push:

1. kontroller at `Deploy to GitHub Pages` fullføres med `success`,
2. kontroller at produksjonsfilene er oppdatert,
3. be brukeren utføre høyst én konkret test om gangen dersom manuell mobiltest er nødvendig.
