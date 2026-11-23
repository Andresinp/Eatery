// Release builds sign with the upload key kept OUTSIDE the repo, in ~/.eatery-signing/
// (eatery-upload.keystore + credentials.properties). Without that folder the release build falls
// back to the debug key, so it still builds on any machine but cannot be uploaded to Play.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// eatery-release-signing';

const SNIPPET = `
${MARKER}
def eaterySigningDir = new File(System.getenv('EATERY_SIGNING_DIR') ?: "\${System.getProperty('user.home')}/.eatery-signing")
def eateryCreds = new Properties()
def eateryCredsFile = new File(eaterySigningDir, 'credentials.properties')
if (eateryCredsFile.exists()) eateryCredsFile.withInputStream { eateryCreds.load(it) }
android {
    signingConfigs {
        eateryUpload {
            if (eateryCredsFile.exists()) {
                storeFile new File(eaterySigningDir, 'eatery-upload.keystore')
                storePassword eateryCreds['store_password']
                keyAlias eateryCreds['key_alias']
                keyPassword eateryCreds['key_password']
            }
        }
    }
    buildTypes {
        release {
            if (eateryCredsFile.exists()) signingConfig signingConfigs.eateryUpload
        }
    }
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) cfg.modResults.contents += SNIPPET;
    return cfg;
  });
};
