import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { AvatarEditor } from '@/components/account/AvatarEditor';
import { TagChips } from '@/components/account/TagChips';
import { Button, ErrorState, Field, Header, Loading, Screen, Section, SignInGate, errorMessage } from '@/components/ui';
import { MAX_BIO } from '@/lib/account-format';
import { api, type MyProfile } from '@/lib/api';
import { logError } from '@/lib/log';
import { useSession } from '@/lib/session';
import { ALLERGENS, DIETARY } from '@/lib/vocab';

export default function EditProfile() {
  const { t } = useTranslation();
  const { state, refreshProfile } = useSession();
  const header = <Header title={t('profile.editProfile')} />;
  if (state.phase === 'loading') {
    return (
      <Screen scroll={false} header={header}>
        <Loading />
      </Screen>
    );
  }
  if (state.phase === 'signedOut') {
    return (
      <Screen scroll={false} header={header}>
        <SignInGate />
      </Screen>
    );
  }
  if (!state.profile) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={null} onRetry={() => void refreshProfile()} />
      </Screen>
    );
  }
  return <EditForm key={state.profile.id} profile={state.profile} header={header} />;
}

function EditForm({ profile, header }: { profile: MyProfile; header: React.ReactNode }) {
  const { t } = useTranslation();
  const { refreshProfile } = useSession();
  const [name, setName] = useState(profile.full_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [dietary, setDietary] = useState<string[]>(profile.dietary_prefs);
  const [allergens, setAllergens] = useState<string[]>(profile.allergen_exclusions);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setNameError(t('onboarding.nameRequired'));
      return;
    }
    setNameError(null);
    setIsSaving(true);
    try {
      await api.updateMyProfile(profile.id, {
        full_name: name.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        dietary_prefs: dietary,
        allergen_exclusions: allergens,
      });
      await refreshProfile();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) router.back();
    } catch (error) {
      logError('edit profile save', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen header={header} footer={<Button title={t('common.save')} isLoading={isSaving} onPress={() => void handleSave()} />}>
      <AvatarEditor userId={profile.id} uri={avatarUrl} name={name} onChange={setAvatarUrl} />
      <Field
        label={t('onboarding.nameLabel')}
        value={name}
        onChangeText={setName}
        error={nameError}
        textContentType="name"
        autoComplete="name"
        autoCapitalize="words"
        returnKeyType="done"
      />
      <Field
        label={t('profile.bioLabel')}
        value={bio}
        onChangeText={setBio}
        placeholder={t('profile.bioPlaceholder')}
        multiline
        maxLength={MAX_BIO}
        help={t('profile.bioCount', { length: bio.length, max: MAX_BIO })}
      />
      <Section label={t('onboarding.dietaryTitle')} help={t('onboarding.dietarySubtitle')}>
        <TagChips options={DIETARY} value={dietary} onChange={setDietary} tone="leaf" />
      </Section>
      <Section label={t('onboarding.allergensTitle')} help={t('onboarding.allergensNote')}>
        <TagChips options={ALLERGENS} value={allergens} onChange={setAllergens} tone="danger" />
      </Section>
    </Screen>
  );
}
