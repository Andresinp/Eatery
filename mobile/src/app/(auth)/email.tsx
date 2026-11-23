import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Segmented } from '@/components/account/Segmented';
import { Body, Button, Empty, Field, Gap, Header, Muted, Screen, Title, errorMessage } from '@/components/ui';
import { isEmail, MIN_PASSWORD } from '@/lib/account-format';
import { closeAuth, leaveAuthAfterSignIn } from '@/lib/account-nav';
import { sendPasswordReset, signInWithEmail, signUpWithEmail } from '@/lib/auth';
import { logError } from '@/lib/log';
import { colors, fonts, space } from '@/theme';

type Mode = 'signIn' | 'signUp';
type FieldErrors = { name?: string; email?: string; password?: string };

export default function EmailAuth() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [inboxEmail, setInboxEmail] = useState<string | null>(null);

  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const isSignUp = mode === 'signUp';

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (isSignUp && name.trim().length === 0) next.name = t('auth.nameRequired');
    if (!isEmail(email)) next.email = t('auth.emailInvalid');
    if (isSignUp && password.length < MIN_PASSWORD) next.password = t('auth.passwordTooShort');
    if (!isSignUp && password.length === 0) next.password = t('auth.passwordRequired');
    return next;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const next = validate();
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const hasSession = await signUpWithEmail(email, password, name);
        if (hasSession) leaveAuthAfterSignIn();
        else setInboxEmail(email.trim());
      } else {
        await signInWithEmail(email, password);
        leaveAuthAfterSignIn();
      }
    } catch (error) {
      logError(isSignUp ? 'signUpWithEmail' : 'signInWithEmail', error);
      setFormError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async () => {
    if (!isEmail(email)) {
      setErrors({ email: t('auth.resetNeedsEmail') });
      emailRef.current?.focus();
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordReset(email);
      Alert.alert(t('auth.resetSentTitle'), t('auth.resetSentBody', { email: email.trim() }));
    } catch (error) {
      logError('sendPasswordReset', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
  };

  if (inboxEmail) {
    return (
      <Screen scroll={false} header={<Header onBack={() => setInboxEmail(null)} />}>
        <Empty
          icon="send"
          title={t('auth.checkInboxTitle')}
          body={t('auth.checkInboxBody', { email: inboxEmail })}
          action={
            <View style={styles.inboxActions}>
              <Button title={t('auth.backToSignIn')} onPress={() => {
                setInboxEmail(null);
                handleModeChange('signIn');
              }} />
              <Button title={t('welcome.notNow')} variant="ghost" onPress={closeAuth} />
            </View>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header />}
      footer={
        <Button
          title={isSignUp ? t('auth.createButton') : t('auth.signInButton')}
          isLoading={isSubmitting}
          onPress={() => void handleSubmit()}
        />
      }>
      <Title>{isSignUp ? t('auth.createTitle') : t('auth.signInTitle')}</Title>
      <Gap size="xs" />
      <Muted>{isSignUp ? t('auth.createSubtitle') : t('auth.signInSubtitle')}</Muted>
      <Gap size="lg" />
      <Segmented
        options={[
          { value: 'signIn', label: t('auth.tabSignIn') },
          { value: 'signUp', label: t('auth.tabCreate') },
        ]}
        value={mode}
        onChange={handleModeChange}
      />

      {isSignUp ? (
        <Field
          label={t('auth.name')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          placeholder={t('auth.namePlaceholder')}
          textContentType="name"
          autoComplete="name"
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
      ) : null}
      <Field
        ref={emailRef}
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder={t('auth.emailPlaceholder')}
        textContentType={isSignUp ? 'emailAddress' : 'username'}
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Field
        ref={passwordRef}
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        help={isSignUp ? t('auth.passwordHint') : undefined}
        secureTextEntry={!isPasswordVisible}
        textContentType={isSignUp ? 'newPassword' : 'password'}
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => void handleSubmit()}
      />
      <View style={styles.passwordTools}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: isPasswordVisible }}
          hitSlop={8}
          onPress={() => setIsPasswordVisible((v) => !v)}
          style={styles.textButton}>
          <Text style={styles.textButtonLabel}>{isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')}</Text>
        </Pressable>
        {!isSignUp ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isSendingReset }}
            disabled={isSendingReset}
            hitSlop={8}
            onPress={() => void handleForgot()}
            style={styles.textButton}>
            <Text style={styles.textButtonLabel}>{isSendingReset ? t('common.loading') : t('auth.forgotPassword')}</Text>
          </Pressable>
        ) : null}
      </View>

      {formError ? (
        <View style={styles.formError} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Body style={styles.formErrorText}>{formError}</Body>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  passwordTools: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  textButton: { minHeight: 44, justifyContent: 'center' },
  textButtonLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.amberInk, textDecorationLine: 'underline' },
  formError: { marginTop: space.md, padding: space.md, borderRadius: 14, backgroundColor: colors.dangerSoft },
  formErrorText: { color: colors.danger },
  inboxActions: { alignSelf: 'stretch', gap: space.sm },
});
