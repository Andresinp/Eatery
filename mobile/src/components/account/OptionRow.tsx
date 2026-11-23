import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Small } from '@/components/ui';
import { colors, radius, space } from '@/theme';

type Props = { title: string; subtitle?: string; isSelected: boolean; onPress: () => void };

// One choice in a single-choice list: a radio dot, a title and an optional line under it.
export function OptionRow({ title, subtitle, isSelected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, isSelected && styles.rowSelected, pressed && styles.pressed]}>
      <View style={[styles.radio, isSelected && styles.radioSelected]}>{isSelected ? <View style={styles.dot} /> : null}</View>
      <View style={styles.text}>
        <Body>{title}</Body>
        {subtitle ? <Small>{subtitle}</Small> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  rowSelected: { borderColor: colors.amberDeep, backgroundColor: colors.amberSoft },
  pressed: { opacity: 0.6 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.amberDeep },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amberDeep },
  text: { flex: 1 },
});
