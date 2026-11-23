import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { i18n } from '@/i18n';

export type MenuOption = { label: string; onPress: () => void; isDestructive?: boolean };

// A "more" menu: the system action sheet where there is one, an alert with buttons otherwise.
export function showMenu(options: readonly MenuOption[], title?: string): void {
  const cancel = i18n.t('common.cancel');
  if (Platform.OS === 'ios') {
    const destructive = options.map((o, i) => (o.isDestructive ? i : -1)).filter((i) => i >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((o) => o.label), cancel],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: destructive,
      },
      (index) => options[index]?.onPress(),
    );
    return;
  }
  Alert.alert(title ?? '', undefined, [
    ...options.map((o) => ({ text: o.label, onPress: o.onPress, style: o.isDestructive ? ('destructive' as const) : ('default' as const) })),
    { text: cancel, style: 'cancel' as const },
  ]);
}

// A yes/no question; resolves true when the person confirms.
export function confirm(args: { title: string; message?: string; confirmLabel: string; isDestructive?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      args.title,
      args.message,
      [
        { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: args.confirmLabel, style: args.isDestructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
