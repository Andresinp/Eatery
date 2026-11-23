import type { TFunction } from 'i18next';

import type { DiningSetting, OrderStatus } from '@/lib/api';

// Literal keys, so the i18n check sees every one.
export function diningLabel(t: TFunction, setting: DiningSetting): string {
  switch (setting) {
    case 'indoor_table':
      return t('dining.indoor_table');
    case 'garden':
      return t('dining.garden');
    case 'terrace':
      return t('dining.terrace');
    case 'rooftop':
      return t('dining.rooftop');
    case 'open_kitchen':
      return t('dining.open_kitchen');
  }
}

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
