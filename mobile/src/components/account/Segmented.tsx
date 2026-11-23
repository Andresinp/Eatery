import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, shadow, space } from '@/theme';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = { options: readonly Option<T>[]; value: T; onChange: (value: T) => void };

// A two- or three-way switch (e.g. Sign in / Create account).
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
            onPress={() => onChange(option.value)}
            style={[styles.segment, isSelected && styles.segmentSelected]}>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, padding: space.xs },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentSelected: { backgroundColor: colors.card, ...shadow.card, shadowOpacity: 0.08 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textMuted },
  labelSelected: { color: colors.text },
});
