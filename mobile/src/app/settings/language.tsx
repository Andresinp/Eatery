import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { OptionRow } from '@/components/account/OptionRow';
import { Header, Screen, errorMessage } from '@/components/ui';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';
import { api } from '@/lib/api';
import { setLanguage } from '@/lib/language';
import { logError } from '@/lib/log';
import { useSession, useUserId } from '@/lib/session';
import { space } from '@/theme';

// Works signed out too: the choice applies on this phone; signed in it is also saved to the profile.
export default function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const userId = useUserId();
  const { refreshProfile } = useSession();

  const handleSelect = async (code: LanguageCode) => {
    if (code === i18n.language) return;
    const previous = i18n.language;
    setLanguage(code);
    void Haptics.selectionAsync();
    if (!userId) return;
    try {
      await api.updateMyProfile(userId, { language: code });
      await refreshProfile();
    } catch (error) {
      logError('save language', error);
      setLanguage(previous);
      Alert.alert(t('errors.title'), errorMessage(error));
    }
  };

  return (
    <Screen header={<Header title={t('settings.language')} />}>
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {SUPPORTED_LANGUAGES.map((code) => (
          <OptionRow key={code} title={LANGUAGE_NAMES[code]} isSelected={i18n.language === code} onPress={() => void handleSelect(code)} />
        ))}
      </View>
    </Screen>
  );
}
