import { useTranslation } from 'react-i18next';

import { Row } from '@/components/ui';
import { openLink, PRIVACY_URL, SUPPORT_URL, TERMS_URL } from '@/lib/account-links';

// Help & support, Privacy and Terms: the same three rows signed in or out.
export function InfoRows() {
  const { t } = useTranslation();
  return (
    <>
      <Row title={t('profile.help')} onPress={() => openLink(SUPPORT_URL)} />
      <Row title={t('profile.privacy')} onPress={() => openLink(PRIVACY_URL)} />
      <Row title={t('profile.terms')} onPress={() => openLink(TERMS_URL)} />
    </>
  );
}
