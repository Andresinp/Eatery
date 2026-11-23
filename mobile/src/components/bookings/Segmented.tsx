import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, shadow, space } from '@/theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = { options: readonly Option<T>[]; value: T; onChange: (value: T) => void };

// A two- or three-way switch, like the system segmented control, in the app's colours.
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isSelected && styles.selected]}>
            <Text style={[styles.text, isSelected && styles.textSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  selected: { backgroundColor: colors.card, ...shadow.card, shadowOpacity: 0.08 },
  text: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textMuted },
  textSelected: { color: colors.text },
});
