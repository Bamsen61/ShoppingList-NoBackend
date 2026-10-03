# ShoppingList-NoBackend

Felles handleliste med Firebase Authentication (email/password) og Realtime Database. Appversjon **6** er definert i docs/js/version.js og vises som `v6` høyrejustert i forsiden sin eksisterende topplinje, med samme font som personvalget. Installér appen som **Handleliste** fra Chrome. Offline viser den sist lagrede handlelisten og lar deg markere kjøp med overstrykning. Kjøp synkroniseres automatisk når Firebase-forbindelsen er tilbake. Første innlogging og caching krever internett.

## Lokal kjøring

```powershell
Set-Location 'D:\GIT\ShoppingList-NoBackend'
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Åpne http://127.0.0.1:8000/. Appen bruker ekte Firebase; manuelle vareoperasjoner endrer reelle data. Firebase-konfigurasjonen står i docs/js/firebase-init.js. .env og VITE_FIREBASE_* leses ikke.

## Automatiserte tester

```powershell
node --experimental-vm-modules --test tests/*.test.cjs
```

Node.js 22 eller nyere, uten npm-avhengigheter. Se [TESTING.md](TESTING.md). Testene bruker isolerte fixtures og mock; ingen produksjonsinnlogging eller nettverkstilgang.

## Funksjoner og tilgang

Handleliste sortert etter butikk og varenavn, nye/eksisterende varer, kjøpshistorikk, redigering og bekreftet sletting. Personvalg (Morten/Linh) og skriftstørrelse lagres lokalt. Standardperson er Morten. Kjøp og 50-dagersfilter bruker Europe/Oslo og YYYY-MM-DD. Eksisterende historikk beholdes.

Bare to tillatte UID-er får tilgang i klienten og lokale regler. Logout er skjult. Aktiv API key-konfigurasjon og aktive regler er ikke verifisert av denne oppdateringen. Se [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

## Publisering

.github/workflows/deploy.yml publiserer bare docs/ ved push til main eller workflow_dispatch. tools/ og tests/ publiseres ikke. Workflowen kjører ikke tester eller regeldeploy. Ingen build er nødvendig.

## PWA og oppdatering

Manifest, service worker og ikoner publiseres fra docs/. Relative stier fungerer under /ShoppingList-NoBackend/. Datacachen inneholder bare varer som skal kjøpes og nødvendig metadata for ventende kjøp. Andre sider og funksjoner krever internett. Service worker cacher også statiske ressurser og Firebase SDK, men ingen auth- eller databasesvar. Appen sjekker etter oppdateringer ved oppstart og når den får fokus/blir synlig. En ferdig nedlastet oppdatering aktiveres automatisk og laster appvinduene på nytt. Ulagrede skjemafelt kan nullstilles; innlogging og ventende kjøp beholdes. Ved senere kodeendringer økes både APP_VERSION og service worker-cacheversjonen.

Fra v4 bypasser precache nettleserens HTTP-cache for å unngå blanding av gamle moduler og ny HTML. Fra v5 lastes åpne Handleliste-vinduer automatisk på nytt når en ny service worker overtar. Ventende kjøp og persistent auth beholdes ved oppdatering.

«Koble til internett» prøver databasen igjen uten popup. Ved manglende kontakt blinker knappen rødt to ganger (umiddelbart uten nett, ellers etter feil eller fem sekunder).
