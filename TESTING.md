# Testing – appversjon 8

## Automatiserte tester

```powershell
Set-Location 'D:\GIT\ShoppingList-NoBackend'
node --experimental-vm-modules --test tests/*.test.cjs
git diff --check
```

Krever Node.js 22 eller nyere. Bruker innebygd node:test og vm.SourceTextModule; ingen npm-avhengigheter. Node kan vise ExperimentalWarning for VM modules.

tests/app.test.cjs kjører de faktiske appmodulene i isolerte VM-kontekster med Firebase erstattet av en in-memory mock. Modul-loaderen avviser nettverksimporter; fetch, XMLHttpRequest og produksjonskontoer er ikke tilgjengelige. Hver test får egne fixtures. Ingen test skriver til produksjonsdatabasen.

Dekker standardperson og valgt person, Oslo-dato rundt midnatt og sommertid, inklusive 50 kalenderdager, ugyldige datoer, norsk sortering, direkte retur til forsiden, opprettelse, kjøp/teller/historikk, tillegg, redigering/sletting og avviste writes ved manglende auth. Søk, Vis alle og bokstavnavigasjon kontrolleres med DOM-mock. Publiseringskontrollen tillater bare nødvendige appfiler og kontrollerer lokale ressursreferanser samt appversjon 8.

Mocken bekrefter ikke ekte innlogging, aktive Firebase-regler, nettverksbasert realtime eller rendering i Android Chrome. Bruk lokal Firebase-emulator hvis automatisert auth-/regelintegrasjon blir nødvendig.

## Avgrenset manuell kontroll

Gi brukeren én test om gangen og vent på svaret. Etter tilgjengeliggjøring av oppdatert app: åpne Legg til → Ny vare → Avbryt på Android Chrome og kontroller at forsiden vises; kontroller deretter Androids Back-knapp. Dette krever enheten og kan ikke bekreftes av DOM-mocken.

Ved relevant auth/realtime-endring kontrolleres autorisert innlogging og oppdatering mellom to ekte klienter separat. Klargjøringen endrer ikke auth-logikk eller regler. Lokal server bruker ekte Firebase; ikke bruk vareoperasjoner mot produksjon som automatiserte tester.

Person og fontSize er de lokale innstillingene. Det finnes ingen global shop-innstilling. Logout er skjult; appversjon vises høyrejustert i eksisterende topplinje, med samme font som personvalget og uten ekstra høyde. PWA-installasjon og ekte offline-oppstart må kontrolleres på Android Chrome etter publisering.

## Offline og PWA

Automatiserte tester dekker minimal lokal datacache, offline-oppstart fra lagring, overstrykning, vedvarende kjøp over reload, gjenopprettet forbindelse, opprinnelig kjøpsperson/dato, teller/historikk, feil og retry, slettede/allerede kjøpte varer, manifestets GitHub Pages-stier og PNG-størrelser. Service worker testes med isolert Cache/fetch-mock.

Etter publisering er første manuelle test: installer Handleliste fra Android Chrome og kontroller at den åpner i eget appvindu med v8. Vent på svar før neste test. Deretter kontrolleres offline-oppstart og synkronisering med en særskilt testvare, og ekte login/realtime/navigasjon separat. Disse kontrollene er ikke gjennomført automatisk.

Regresjonstester dekker gammel v2-JavaScript i HTTP-cache ved precache av ny appversjon, opprydding av gammel service worker-cache og automatisk aktivering etter fullstendig precache, oppdateringssjekk ved oppstart/fokus/foreground og automatisk navigasjon av åpne appvinduer (inkludert gamle klienter). Andre apper på origin skal ikke navigeres. Offline/feil skal beholde gjeldende app, og mislykket precache skal ikke aktivere en ufullstendig app.

Manuell kontroll av denne endringen, én test: etter publisering, åpne index.html i Chrome på telefonen for å få v5 inn én gang (v3/v4 mangler fokus-sjekken). Kontroller at v5 lastes automatisk uten sletting av Chrome-data. Fra v5 testes neste publiserte versjon ved å hente appen fra bakgrunnen; tvungen stopp skal ikke være nødvendig. Android-test er ikke utført av de isolerte testene.

Appversjon 6: offline er bekreftet av brukeren i v5. Tilkoblingsknappen testes med isolerte fixtures for ingen popup, rødt feilblink, vellykket forsøk og fortsatt reconnect etter feedback. Manuell kontroll etter publisering: trykk «Koble til internett» uten nett og kontroller to røde blink uten dialog. Vent på svaret før videre mobiltesting.

Appversjon 7: isolerte regresjonstester gjenskaper v6-feilen der en pending write feiler etter at knappen har vist vellykket tilkobling. Testene dekker faktisk restart av SDK-forbindelsen, read/write-feil med bevart kjøp og automatisk retry, tilkoblingstimeout/backoff, foreground, frakobling/pagehide, utdaterte callbacks, permission denial og server-writes som venter gjennom reconnect uten dobbeltregistrering. Ingen produksjonskontoer eller nettverk brukes. Etter publisering er neste manuelle kontroll én test: åpne v7 på den berørte telefonen med internett, trykk "Koble til internett" hvis knappen vises, og kontroller at appen blir stående med "Legg til" og at de ventende kjøpene forsvinner. Vent på svaret før flere tester.

Appversjon 8: 39 isolerte tester passerer. Nye fixtures gjenskaper objektbasert `BoughtDate` som stoppet hele køen i v7, og kontrollerer beholdt historikk for array/objekt/enkeltstående string/null, numerisk teller og bevart kø ved ugyldige data. Feiltekst testes for read/write, navigator-offline, timeout og fjerning ved vellykket synkronisering. Ingen produksjonsdata er lest eller skrevet. Manuell kontroll bestått, bekreftet av brukeren 2026-10-07 etter publisering av v8: telefonen koblet straks til databasen da oppdateringen ble lastet ned, alle tre cachede kjøp ble synkronisert uten feilmelding, og PC-nettstedet ble automatisk oppdatert via Realtime. Den observerte feilen er løst. Den eksakte datatypefeilen på telefonen ble ikke logget; årsaken der er ikke direkte bekreftet.
