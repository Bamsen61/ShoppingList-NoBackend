# Firebase-regler

Ingen regeldeploy inngår i klargjøringen eller PWA-runden. GitHub Pages-workflowen publiserer bare nettstedet.

Gjeldende lokale regler er i database.rules.json. firebase.json og .firebaserc finnes lokalt og er Git-ignorert. Aktive regler må sammenlignes med komplett lokalfil før en senere avtalt endring. Bevar /handleliste, /hvoreralle og de to tillatte UID-ene. Ikke bruk offentlig tilgang eller generell auth != null som erstatning.

Ved separat avtalt regeldeploy, med Firebase CLI installert og innlogget:

```powershell
Set-Location 'D:\GIT\ShoppingList-NoBackend'
firebase deploy --only database --project handleliste-3bdaa
```

Sikre gjeldende regler og nødvendige data før endringen. Automatiserte apptester bruker mock og bekrefter ikke aktive regler; bruk lokal emulator hvis integrasjonstester blir nødvendige.
