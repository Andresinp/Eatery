// Stripe's React Native SDK compiles against its card-issuing "push provisioning" module
// (compileOnly), which depends on Google's play-services-tapandpay — not published publicly.
// Eatery never issues cards, so:
//  1. its release lint task (the only thing that resolves that artifact) is excluded from every
//     build, the same as `-x :stripe_stripe-react-native:lintVitalAnalyzeRelease`;
//  2. R8 is told those classes are intentionally absent (expo-build-properties extraProguardRules
//     in app.config.js holds the -dontwarn).
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// eatery-stripe-lint-exclusion';
const SNIPPET = `
${MARKER}
gradle.startParameter.excludedTaskNames.add(':stripe_stripe-react-native:lintVitalAnalyzeRelease')
`;

module.exports = function withStripeAndroidFixes(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) cfg.modResults.contents += SNIPPET;
    return cfg;
  });
};
