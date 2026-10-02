# Gjeldende Firebase-oppsett

Appen bruker prosjektet handleliste-3bdaa og Firebase Web SDK 9.23.0 fra gstatic. Konfigurasjonen er i docs/js/firebase-init.js; miljøfiler brukes ikke.

Innlogging skjer med email/password på docs/login.html. Klienten tillater UID-ene ZDq6ZGvDVDafX8BVlWGRhBoSn9X2 og fmVOzYiAtsOUNnUE33VZbwHR0SG3. browserLocalPersistence bevarer innlogging når nettleserlagring og kontostatus tillater det. waitForAuth() beskytter vareoperasjonene. Registrering, password reset og synlig logout er ikke implementert.

database.rules.json er lokal regelfil. Rotens read/write gir de to UID-ene tilgang, også til /hvoreralle. Handlelistevarer krever Name, Shop, AddedBy og Buy; BoughtDate har strings som underverdier. Se filen for komplette valideringer. Eksisterende /hvoreralle-regler og data skal bevares.

Aktive Firebase-regler, API key restrictions og authorized domains er ikke verifisert. Sammenlign aktive regler med hele lokalfilen før en senere avtalt regeldeploy. Klargjøringen endrer ingen Firebase-innstillinger.

Historiske anonymous-auth-diagnoser ligger i tools/ og er ikke gjeldende oppsettsveiledning. Se [DEPLOY_RULES.md](DEPLOY_RULES.md) og [TESTING.md](TESTING.md).
