# Operations / Déploiement

## CI/CD GitHub Actions

Les déploiements sont déclenchés sur `push` vers `beta-releases`.

- iOS: `.github/workflows/cd_ios_internal.yml`
- Android: `.github/workflows/cd_android_internal.yml`

## Déploiement iOS

Workflow:

1. `npm ci`
2. `npx pod-install ios`
3. décodage de `P8_KEY_BASE_64` en `AuthKey.p8`
4. `fastlane ios testflight_release`

Lane Fastlane: `fastlane/Fastfile`

- incrément du build number (`IOS_BUILD_NUMBER` ou timestamp + `IOS_BUILD_NUMBER_OFFSET`)
- build archive App Store
- upload TestFlight (groupe `TestReactifExte`)

Variables/secrets requis:

- `P8_KEY_ID`
- `P8_ISSUER_ID`
- `P8_KEY_BASE_64`
- `MATCH_GIT_BASIC_AUTHORIZATION`
- `MATCH_PASSWORD`
- `BETA_APP_FEEDBACK_EMAIL`
- `IOS_BUILD_NUMBER_OFFSET` (variable optionnelle)
- `BETA_APP_DESCRIPTION` (variable optionnelle)

## Déploiement Android

Workflow:

1. `npm ci`
2. configuration JDK 17
3. décodage `ANDROID_KEYSTORE_BASE64` -> `android/app/upload-keystore.jks`
4. génération `android/key.properties`
5. `fastlane android prepare_version`: lecture des AAB/APK courants et des releases de tous les tracks Play, puis `versionCode = max(codes Play, plancher) + 1`
6. build AAB: `./gradlew bundleRelease`
7. génération changelog
8. `fastlane android internal_release`

Lane Fastlane: `fastlane/Fastfile`

- upload AAB vers track Play (`internal` par défaut)
- mode `release_status` configurable (`draft`/`completed`)

Variables/secrets requis:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `ANDROID_UPLOAD_CERT_SHA1` (recommandé)
- `ANDROID_VERSION_CODE_FLOOR` (variable optionnelle, dernier code utilisé à préserver; défaut: `1781000164`)

Le code Android n'utilise plus le timestamp Git ni les variables d'offset. Les jobs Android sont sérialisés pour éviter deux uploads CI avec le même code. Une erreur de lecture Play arrête le build; aucun retour au timestamp ou à un petit code n'est effectué.

Le prochain code vaut `1781000165` uniquement si aucun code supérieur n'est retourné par Play. Les releases internes comptent aussi: ne pas remettre le compteur à 1 avant le passage en production. Si un code supérieur a été utilisé dans un ancien upload qui n'est plus visible via l'API, définir `ANDROID_VERSION_CODE_FLOOR` à ce code dans les variables GitHub Actions. Éviter un upload manuel/EAS pendant le job CI, car la sérialisation concerne uniquement ce workflow. Le maximum accepté par Play est `2100000000`.

L'activité Android préfère le portrait, mais `android.hardware.screen.portrait` est déclaré optionnel pour ne pas exclure les appareils à écran fixe. Le plugin `plugins/withOptionalPortraitFeature.js` conserve cette déclaration lors d'un prebuild Expo. Après upload du nouveau bundle, vérifier les raisons d'exclusion dans Play et le rendu de l'application sur écran fixe avant promotion.

## Commandes locales utiles

```bash
npm ci
npm run lint
npm run ios
npm run android
```

Build locale Android (si script ajouté/rétabli):

```bash
npm run build:android:local
```

## Check-list de release

1. Vérifier que la branche de release est `beta-releases`.
2. Vérifier que les secrets CI sont valides et non expirés.
3. Vérifier la signature Android (SHA1 attendu).
4. Vérifier les notes/changelog générées.
5. Contrôler la build sur TestFlight et Play Internal avant promotion.

## Dépannage rapide

- Erreur `match` iOS:
  - contrôler `MATCH_GIT_BASIC_AUTHORIZATION` et `MATCH_PASSWORD`
- Erreur clé App Store:
  - contrôler `P8_KEY_*` et le contenu base64
- Erreur Play Console:
  - valider le JSON `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (service account + permissions)
- Erreur signature Android:
  - vérifier `ANDROID_KEY_ALIAS` / mots de passe / certificat attendu
