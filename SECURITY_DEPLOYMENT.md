# Innlogging og tilgang

Gjeldende oppsett beskrives i [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Email/password og UID-allowlist brukes. Logout er skjult i vanlig GUI. Personvalget er uavhengig av Firebase-kontoen.

Lokale regler validerer BoughtDate-underverdier som strings. Aktive regler og API key restrictions er ikke kontrollert i denne runden. Regler skal bare publiseres ved separat avtalt endring; se [DEPLOY_RULES.md](DEPLOY_RULES.md).

De tidligere aksepterte kontoopplysningene er bevart nedenfor. Kontoene er allerede opprettet; dette er en referanse, ikke en ny oppsettoppgave.

### 1. Set Up Users in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **handleliste-3bdaa**
3. Navigate to **Authentication** → **Users** tab
4. Click **Add User** and create the following users:
   - **Email**: `morten.steien@wemail.no`
   - **Password**: `President`
   - Click **Add User**

   You can add a second user if needed following the same process.


## Authorized Users
- `morten.steien@wemail.no` (Password: `President`)
- Additional users can be added via Firebase Console
