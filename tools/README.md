# Upubliserte hjelpefiler

Disse filene er bevart utenfor GitHub Pages-artifact. Appen laster dem ikke.
auth-diagnostic.html og quick-auth-fix.html er historiske eksempler med anonymous authentication; de beskriver ikke gjeldende innlogging. Ikke aktiver anonymous authentication eller endre regler etter disse eksemplene.

For eksplisitt diagnostikk kan repo-roten serveres lokalt med Python:

```powershell
python -m http.server 8001 --bind 127.0.0.1
```

Åpne /tools/auth-persistence-test.html. Felles Firebase-init er lenket til ../docs/js/firebase-init.js. Diagnosesidene bruker ekte Firebase og er ikke automatiserte tester. CountDown.html er en separat nedtelling; google-services.json lastes ikke av appen.
