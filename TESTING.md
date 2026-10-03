# Testing – appversjon 4

## Automatiserte tester

```powershell
Set-Location 'D:\GIT\ShoppingList-NoBackend'
node --experimental-vm-modules --test tests/*.test.cjs
git diff --check
```

Krever Node.js 22 eller nyere. Bruker innebygd node:test og vm.SourceTextModule; ingen npm-avhengigheter. Node kan vise ExperimentalWarning for VM modules.

tests/app.test.cjs kjører de faktiske appmodulene i isolerte VM-kontekster med Firebase erstattet av en in-memory mock. Modul-loaderen avviser nettverksimporter; fetch, XMLHttpRequest og produksjonskontoer er ikke tilgjengelige. Hver test får egne fixtures. Ingen test skriver til produksjonsdatabasen.

Dekker standardperson og valgt person, Oslo-dato rundt midnatt og sommertid, inklusive 50 kalenderdager, ugyldige datoer, norsk sortering, direkte retur til forsiden, opprettelse, kjøp/teller/historikk, tillegg, redigering/sletting og avviste writes ved manglende auth. Søk, Vis alle og bokstavnavigasjon kontrolleres med DOM-mock. Publiseringskontrollen tillater bare nødvendige appfiler og kontrollerer lokale ressursreferanser samt appversjon 4.

Mocken bekrefter ikke ekte innlogging, aktive Firebase-regler, nettverksbasert realtime eller rendering i Android Chrome. Bruk lokal Firebase-emulator hvis automatisert auth-/regelintegrasjon blir nødvendig.

## Avgrenset manuell kontroll

Gi brukeren én test om gangen og vent på svaret. Etter tilgjengeliggjøring av oppdatert app: åpne Legg til → Ny vare → Avbryt på Android Chrome og kontroller at forsiden vises; kontroller deretter Androids Back-knapp. Dette krever enheten og kan ikke bekreftes av DOM-mocken.

Ved relevant auth/realtime-endring kontrolleres autorisert innlogging og oppdatering mellom to ekte klienter separat. Klargjøringen endrer ikke auth-logikk eller regler. Lokal server bruker ekte Firebase; ikke bruk vareoperasjoner mot produksjon som automatiserte tester.

Person og fontSize er de lokale innstillingene. Det finnes ingen global shop-innstilling. Logout er skjult; appversjon vises høyrejustert i eksisterende topplinje, med samme font som personvalget og uten ekstra høyde. PWA-installasjon og ekte offline-oppstart må kontrolleres på Android Chrome etter publisering.

## Offline og PWA

Automatiserte tester dekker minimal lokal datacache, offline-oppstart fra lagring, overstrykning, vedvarende kjøp over reload, gjenopprettet forbindelse, opprinnelig kjøpsperson/dato, teller/historikk, feil og retry, slettede/allerede kjøpte varer, manifestets GitHub Pages-stier og PNG-størrelser. Service worker testes med isolert Cache/fetch-mock.

Etter publisering er første manuelle test: installer Handleliste fra Android Chrome og kontroller at den åpner i eget appvindu med v4. Vent på svar før neste test. Deretter kontrolleres offline-oppstart og synkronisering med en særskilt testvare, og ekte login/realtime/navigasjon separat. Disse kontrollene er ikke gjennomført automatisk.

Regresjonstester dekker gammel v2-JavaScript i HTTP-cache ved precache av ny appversjon, opprydding av gammel service worker-cache og én reload av forsiden ved controllerchange. Skjemasider beholdes uten reload.
