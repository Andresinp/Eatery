import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BrandHero } from '@/components/account/BrandHero';
import { IntroSlides } from '@/components/account/IntroSlides';
import { Button, Gap, Screen, errorMessage } from '@/components/ui';
import { openLink, PRIVACY_URL, TERMS_URL } from '@/lib/account-links';
import { closeAuth, leaveAuthAfterSignIn } from '@/lib/account-nav';
import { isAppleAvailable, isGoogleConfigured, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { logError } from '@/lib/log';
import { colors, fonts, radius, space, type } from '@/theme';

type Provider = 'apple' | 'google';

export default function Welcome() {
  const { t } = useTranslation();
  const [hasApple, setHasApple] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);
  const hasGoogle = isGoogleConfigured();

  useEffect(() => {
    let isActive = true;
    isAppleAvailable().then(
      (available) => {
        if (isActive) setHasApple(available);
      },
      (error: unknown) => logError('isAppleAvailable', error),
    );
    return () => {
      isActive = false;
    };
  }, []);

  const handleProvider = async (provider: Provider) => {
    if (busy) return;
    setBusy(provider);
    try {
      const isSignedIn = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (isSignedIn) leaveAuthAfterSignIn();
    } catch (error) {
      logError(`signIn ${provider}`, error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <BrandHero />
      <IntroSlides />
      <Gap size="lg" />

      <View style={styles.buttons}>
        {hasApple ? (
          <View style={busy !== null && styles.dimmed} pointerEvents={busy !== null ? 'none' : 'auto'} accessibilityState={{ busy: busy === 'apple' }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.pill}
              style={styles.appleButton}
              onPress={() => void handleProvider('apple')}
            />
          </View>
        ) : null}
        {hasGoogle ? (
          <Button
            title={t('auth.continueGoogle')}
            variant="outline"
            isLoading={busy === 'google'}
            isDisabled={busy !== null && busy !== 'google'}
            onPress={() => void handleProvider('google')}
          />
        ) : null}
        <Button
          title={t('auth.continueEmail')}
          variant={hasApple || hasGoogle ? 'outline' : 'primary'}
          isDisabled={busy !== null}
          onPress={() => router.push('/(auth)/email')}
        />
        <Button title={t('welcome.notNow')} variant="ghost" isDisabled={busy !== null} onPress={closeAuth} />
      </View>

      <Gap />
      <Text style={styles.legal}>
        {t('welcome.legalPrefix')}{' '}
        <Text accessibilityRole="link" style={styles.link} onPress={() => openLink(TERMS_URL)}>
          {t('profile.terms')}
        </Text>{' '}
        {t('welcome.legalAnd')}{' '}
        <Text accessibilityRole="link" style={styles.link} onPress={() => openLink(PRIVACY_URL)}>
          {t('profile.privacy')}
        </Text>
        {t('welcome.legalSuffix')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg },
  buttons: { gap: space.sm + 4 },
  appleButton: { height: 52, width: '100%' },
  dimmed: { opacity: 0.5 },
  legal: { ...type.small, textAlign: 'center', paddingHorizontal: space.md },
  link: { color: colors.text, fontFamily: fonts.bodySemi, textDecorationLine: 'underline' },
});
