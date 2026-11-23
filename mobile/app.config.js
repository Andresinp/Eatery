// Expo config. Static fields live here; public build values are read BY NAME from the web app's
// committed ../.env (one source of truth for both apps) and passed to the app through `extra`.
// scripts/check-build-env.mjs checks their shape before a build and greps the bundle after it.
//
// Optional, read from the environment or ../.env when present:
//   VITE_STRIPE_PUBLISHABLE_KEY       booking deposits (empty → booking says payments are not set up)
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  Google sign-in (empty → the Google button is hidden)
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID  Google sign-in on iOS; also enables the native plugin
//   EXPO_PUBLIC_EAS_PROJECT_ID        Expo push token project (empty → no push registration)
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');

function readDotEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = { ...readDotEnv(path.join(__dirname, '..', '.env')), ...readDotEnv(path.join(__dirname, '.env')) };
const get = (name) => process.env[name] ?? fileEnv[name] ?? '';

const googleIosClientId = get('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
// com.googleusercontent.apps.<id> — the reversed client id Google hands back to the app.
const googleIosUrlScheme = googleIosClientId
  ? `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`
  : '';

const BRAND = '#F5A524';
const CREAM = '#FFFDF7';

module.exports = {
  expo: {
    name: 'Eatery',
    slug: 'eatery',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'eatery',
    userInterfaceStyle: 'light',
    backgroundColor: CREAM,
    ios: {
      bundleIdentifier: 'com.andresinp.eatery',
      buildNumber: '1',
      supportsTablet: false,
      appleTeamId: 'SKGWY35456',
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDisplayName: 'Eatery',
      },
    },
    android: {
      package: 'com.andresinp.eatery',
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: BRAND,
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_CALL_LOG',
        'android.permission.READ_SMS',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
      ],
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-image',
      'expo-localization',
      'expo-sqlite',
      'expo-web-browser',
      'expo-apple-authentication',
      ['expo-splash-screen', { backgroundColor: BRAND, image: './assets/images/splash-icon.png', imageWidth: 200 }],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Eatery uses your location to show home-cooked meals near you and, when you host, to place your table on the map.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Eatery uses your photos so you can add pictures of your dishes, your table and your profile.',
          cameraPermission: 'Eatery uses the camera so you can take pictures of your dishes and your table.',
          microphonePermission: false,
        },
      ],
      [
        'expo-calendar',
        {
          calendarPermission: 'Eatery adds the meals you book to your calendar when you ask it to.',
          remindersPermission: false,
        },
      ],
      ['expo-notifications', { color: BRAND }],
      // Apple Pay needs the merchant id registered with Apple and its certificate in Stripe; until
      // then (EATERY_APPLE_PAY unset) no entitlement is added and the sheet takes cards only.
      ['@stripe/stripe-react-native', {
        merchantIdentifier: process.env.EATERY_APPLE_PAY === '1' ? ['merchant.com.andresinp.eatery'] : [],
        enableGooglePay: true,
      }],
      '@maplibre/maplibre-react-native',
      ...(googleIosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]] : []),
      // Stripe's iOS SDK resolves through Swift Package Manager, which needs dynamic frameworks.
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'dynamic' },
          // Stripe's card-issuing classes are compiled against but never shipped (see the plugin below).
          android: { extraProguardRules: '-dontwarn com.stripe.android.pushProvisioning.**' },
        },
      ],
      './plugins/with-stripe-android-fixes',
      '@react-native-community/datetimepicker',
      './plugins/with-release-signing',
    ],
    experiments: { typedRoutes: true, reactCompiler: true },
    extra: {
      supabaseUrl: get('VITE_SUPABASE_URL'),
      supabaseKey: get('VITE_SUPABASE_PUBLISHABLE_KEY') || get('VITE_SUPABASE_ANON_KEY'),
      stripeKey: get('VITE_STRIPE_PUBLISHABLE_KEY'),
      googleWebClientId: get('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
      googleIosClientId,
      eas: get('EXPO_PUBLIC_EAS_PROJECT_ID') ? { projectId: get('EXPO_PUBLIC_EAS_PROJECT_ID') } : undefined,
    },
  },
};
