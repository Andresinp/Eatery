import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type SheetAction = { label: string; onPress: () => void; isDestructive?: boolean };

// A native list of actions: the action sheet on iOS, a dialog with buttons elsewhere.
export function showActionSheet({ title, actions, cancelLabel }: { title?: string; actions: SheetAction[]; cancelLabel: string }): void {
  if (Platform.OS === 'ios') {
    const destructiveButtonIndex = actions.map((a, i) => (a.isDestructive ? i : -1)).filter((i) => i >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((a) => a.label), cancelLabel],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex,
      },
      (index) => actions[index]?.onPress(),
    );
    return;
  }
  Alert.alert(title ?? '', undefined, [
    ...actions.map((a) => ({ text: a.label, onPress: a.onPress, style: a.isDestructive ? ('destructive' as const) : ('default' as const) })),
    { text: cancelLabel, style: 'cancel' as const },
  ]);
}
