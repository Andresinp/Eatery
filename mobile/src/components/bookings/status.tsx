import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Tag } from '@/components/ui';
import type { OrderStatus } from '@/lib/api';

// Literal keys so the i18n checker sees each one.
export function statusLabel(t: TFunction, status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return t('status.confirmed');
    case 'completed':
      return t('status.completed');
    case 'cancelled_by_guest':
      return t('status.cancelled_by_guest');
    case 'cancelled_by_host':
      return t('status.cancelled_by_host');
    case 'no_show_guest':
      return t('status.no_show_guest');
    case 'no_show_host':
      return t('status.no_show_host');
  }
}

function statusTone(status: OrderStatus): 'leaf' | 'neutral' | 'danger' {
  if (status === 'confirmed') return 'leaf';
  if (status === 'completed') return 'neutral';
  return 'danger';
}

type Props = { status: OrderStatus };

export function StatusBadge({ status }: Props) {
  const { t } = useTranslation();
  return <Tag title={statusLabel(t, status)} tone={statusTone(status)} />;
}
