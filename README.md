# ShoppingList-NoBackend

Felles handleliste med Firebase Authentication (email/password) og Realtime Database. Appversjon **1** er definert i docs/js/version.js og vises ikke i GUI. PWA og offline-støtte er planlagt.

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
