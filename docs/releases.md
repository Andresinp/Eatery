# Releases

Where artefacts live, how a release is cut, and what shipped when. Store consoles are not
greppable and Actions artifacts expire after 90 days, so this file is the record.

## Signing material (outside the repo)

`~/.eatery-signing/` (chmod 700): `eatery-upload.keystore` + `credentials.properties` (Android
upload key — Google must reset it if lost), and later the APNs key `AuthKey_<id>.p8` (cannot be
re-downloaded). Keep an encrypted copy off the Mac (password manager with attachments).
**A CI secret is not a backup.** Not yet created — see "Before the first release".

## Cutting a release (local, no EAS build)

```sh
cd mobile
npm run verify && npm run check:env
# bump expo.version, ios.buildNumber, android.versionCode in app.config.js (strictly higher)
npx expo prebuild --no-install && (cd ios && pod install)
xcodebuild archive -workspace ios/Eatery.xcworkspace -scheme Eatery -configuration Release \
  -archivePath <scratch>/Eatery<build>.xcarchive -allowProvisioningUpdates DEVELOPMENT_TEAM=SKGWY35456
xcodebuild -exportArchive -archivePath <scratch>/Eatery<build>.xcarchive \
  -exportOptionsPlist <scratch>/upload.plist -exportPath <scratch>/ipa -allowProvisioningUpdates
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew bundleRelease assembleRelease
unzip -l app/build/outputs/bundle/release/app-release.aab | grep -q 'META-INF/.*\.\(RSA\|EC\)'
```

Then install the release APK on an emulator and open it (the ship-mobile smoke test) before
uploading. TestFlight first; App Store submission is a separate step.

## Before the first release

1. Supabase project restored; `supabase db push` of 0006; functions deployed; secrets set
   (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUSH_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`);
   `private.secrets` rows for push; Stripe webhook endpoint added.
2. Stripe publishable key in the root `.env`; Apple Pay merchant id `merchant.com.andresinp.eatery`
   registered and its certificate uploaded to Stripe; merchant country set in the app.
3. Sign in with Apple enabled for the bundle id and in Supabase Auth; Google OAuth clients.
4. EAS project id for push (`EXPO_PUBLIC_EAS_PROJECT_ID`), APNs key uploaded to Expo.
5. Legal pages live (privacy, terms, support, account deletion).
6. Demo account for App Review with a host listing and a past booking.

## History

| Date | Channel | Version (build) | What a user would notice |
|---|---|---|---|
| — | — | — | not released yet |
