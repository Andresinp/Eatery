import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { i18n } from '@/i18n';
import { tagKey } from '@/lib/vocab';
import { colors, fonts, radius, shadow, space, type } from '@/theme';

import { Icon } from './icons';

// Every primitive the screens share. Screens compose these; they do not restyle them.

// ---------------------------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------------------------

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };

export const Hero = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[type.hero, style]} numberOfLines={numberOfLines} accessibilityRole="header">
    {children}
  </Text>
);
export const Title = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[type.title, style]} numberOfLines={numberOfLines} accessibilityRole="header">
    {children}
  </Text>
);
export const Heading = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[type.heading, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);
export const Body = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[type.body, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);
export const Muted = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[type.bodyMuted, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);
export const Small = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[type.small, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);
export const Label = ({ children, style }: TextProps) => <Text style={[type.label, style]}>{children}</Text>;

// ---------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  footer?: ReactNode;
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
};

// A safe-area page. `footer` rides above the keyboard (primary actions); `header` stays pinned.
export function Screen({ children, scroll = true, edges = ['top', 'bottom'], footer, header, contentStyle, refreshControl }: ScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.screenContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.screenContent, styles.flex, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type HeaderProps = { title?: string; onBack?: () => void; right?: ReactNode; isModal?: boolean };

// A back (or close, for modals) button, an optional centred title and an optional right action.
export function Header({ title, onBack, right, isModal }: HeaderProps) {
  const { t } = useTranslation();
  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={styles.header}>
      <IconButton name={isModal ? 'close' : 'back'} label={isModal ? t('common.close') : t('common.back')} onPress={handleBack} />
      <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
        {title ?? ''}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export const Gap = ({ size = 'md' }: { size?: keyof typeof space }) => <View style={{ height: space[size] }} />;

export function Section({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <View style={styles.section}>
      <Label>{label}</Label>
      <View style={styles.sectionBody}>{children}</View>
      {help ? <Small style={styles.help}>{help}</Small> : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export const Divider = () => <View style={styles.divider} />;

// ---------------------------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------------------------

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'outline' | 'ghost' | 'danger';
  isDisabled?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', isDisabled, isLoading, icon, style }: ButtonProps) {
  const isInactive = isDisabled || isLoading;
  const textColor =
    variant === 'primary' ? colors.amberInk : variant === 'dark' ? colors.bg : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isInactive, busy: !!isLoading }}
      accessibilityLabel={title}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'dark' && styles.buttonDark,
        variant === 'outline' && styles.buttonOutline,
        variant === 'danger' && styles.buttonDanger,
        variant === 'ghost' && styles.buttonGhost,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  name: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  variant?: 'plain' | 'float';
  badge?: number;
};

// A 44pt round button with an icon. `float` sits over the map with a shadow.
export function IconButton({ name, label, onPress, variant = 'plain', badge }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, variant === 'float' && styles.iconButtonFloat, pressed && styles.pressed]}>
      <Icon name={name} size={22} color={colors.text} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label?: string;
  help?: string;
  error?: string | null;
  prefix?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

// A multiline input that grows with its text up to `max`, then scrolls.
function useGrowingInput(min: number, max: number) {
  const [contentHeight, setContentHeight] = useState(min);
  return {
    style: { height: Math.min(Math.max(contentHeight, min), max) },
    scrollEnabled: contentHeight > max,
    onContentSizeChange: (e: { nativeEvent: { contentSize: { height: number } } }) =>
      setContentHeight(Math.ceil(e.nativeEvent.contentSize.height) + 20),
  };
}

export function Field({ label, help, error, prefix, style, ...input }: FieldProps) {
  const grow = useGrowingInput(96, 220);
  return (
    <View style={styles.field}>
      {label ? <Label>{label}</Label> : null}
      <View style={[styles.inputBox, !!error && styles.inputBoxError]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.amberDeep}
          accessibilityLabel={label}
          {...input}
          style={[styles.input, input.multiline && [grow.style, styles.inputMultiline], style]}
          scrollEnabled={input.multiline ? grow.scrollEnabled : input.scrollEnabled}
          onContentSizeChange={(e) => {
            if (input.multiline) grow.onContentSizeChange(e);
            input.onContentSizeChange?.(e);
          }}
        />
      </View>
      {error ? <Small style={styles.error}>{error}</Small> : help ? <Small style={styles.help}>{help}</Small> : null}
    </View>
  );
}

export function Chip({ title, isSelected, onPress, tone = 'amber' }: { title: string; isSelected: boolean; onPress: () => void; tone?: 'amber' | 'leaf' | 'danger' }) {
  const selectedStyle = tone === 'leaf' ? styles.chipLeaf : tone === 'danger' ? styles.chipDanger : styles.chipAmber;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, isSelected && selectedStyle, pressed && styles.pressed]}>
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{title}</Text>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.chipGroup}>{children}</View>;
}

// A read-only tag: dietary in leaf green, allergens in danger, the rest neutral.
export function Tag({ title, tone = 'neutral' }: { title: string; tone?: 'neutral' | 'leaf' | 'danger' | 'amber' }) {
  return (
    <View
      style={[
        styles.tag,
        tone === 'leaf' && { backgroundColor: colors.leafSoft },
        tone === 'danger' && { backgroundColor: colors.dangerSoft },
        tone === 'amber' && { backgroundColor: colors.amberSoft },
      ]}>
      <Text
        style={[
          styles.tagText,
          tone === 'leaf' && { color: colors.leafInk },
          tone === 'danger' && { color: colors.danger },
          tone === 'amber' && { color: colors.amberInk },
        ]}>
        {title}
      </Text>
    </View>
  );
}

// A stored tag value shown in the reader's language (custom tags shown as typed).
export function tagLabel(value: string): string {
  const key = tagKey(value);
  return i18n.exists(key) ? i18n.t(key) : value;
}

export function Stepper({ value, min = 1, max, onChange, label }: { value: number; min?: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <View style={styles.stepper} accessibilityLabel={label}>
      <IconButton name="minus" label={`${label} −`} onPress={() => onChange(Math.max(min, value - 1))} />
      <Text style={styles.stepperValue} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <IconButton name="plus" label={`${label} +`} onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

type ToggleRowProps = { title: string; help?: string; value: boolean; onChange: (v: boolean) => void; isDisabled?: boolean };

export function ToggleRow({ title, help, value, onChange, isDisabled }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Body>{title}</Body>
        {help ? <Small style={styles.help}>{help}</Small> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={isDisabled}
        accessibilityLabel={title}
        trackColor={{ false: colors.surfaceRaised, true: colors.amber }}
        ios_backgroundColor={colors.surfaceRaised}
      />
    </View>
  );
}

type RowProps = { title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; left?: ReactNode; tone?: 'default' | 'danger' };

export function Row({ title, subtitle, onPress, right, left, tone = 'default' }: RowProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}>
      {left}
      <View style={styles.flex}>
        <Body numberOfLines={1} style={tone === 'danger' ? { color: colors.danger } : undefined}>
          {title}
        </Body>
        {subtitle ? <Small numberOfLines={2}>{subtitle}</Small> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={18} color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// People and pictures
// ---------------------------------------------------------------------------------------------

export function Avatar({ uri, name, size = 44 }: { uri?: string | null; name: string | null | undefined; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, box]} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[styles.avatar, styles.monogram, box]}>
      <Text style={[styles.monogramText, { fontSize: size * 0.42 }]}>{(name ?? '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

// A listing photo with a warm placeholder while it loads or when there is none.
export function Photo({ uri, style, rounded = true }: { uri?: string | null; style?: StyleProp<ViewStyle>; rounded?: boolean }) {
  return (
    <View style={[styles.photo, rounded && styles.photoRounded, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
      ) : (
        <Icon name="plate" size={32} color={colors.amberDeep} />
      )}
    </View>
  );
}

export function Stars({ rating, size = 14 }: { rating: number | null; size?: number }) {
  const { t } = useTranslation();
  if (rating === null) return <Small>{t('listing.newHost')}</Small>;
  return (
    <View style={styles.stars} accessibilityLabel={`${rating.toFixed(1)} / 5`}>
      <Icon name="star" size={size} color={colors.amberDeep} />
      <Text style={[styles.starsText, { fontSize: size }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------------------------

export function Loading() {
  return (
    <View style={styles.center} accessibilityLabel={i18n.t('common.loading')}>
      <ActivityIndicator color={colors.amberDeep} />
    </View>
  );
}

export function errorKey(error: unknown): string {
  if (error instanceof ApiError) return `errors.${error.code}`;
  if (error instanceof TypeError) return 'errors.network';
  return 'errors.unknown';
}

// The message for an error, translated, never a raw server string.
export function errorMessage(error: unknown): string {
  const key = errorKey(error);
  return i18n.exists(key) ? i18n.t(key) : i18n.t('errors.unknown');
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Icon name="alert" size={32} color={colors.textFaint} />
      <Gap size="sm" />
      <Muted style={styles.centerText}>{errorMessage(error)}</Muted>
      <Gap />
      <Button title={t('common.retry')} variant="outline" onPress={onRetry} />
    </View>
  );
}

export function Empty({ icon = 'plate', title, body, action }: { icon?: React.ComponentProps<typeof Icon>['name']; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.amberDeep} />
      </View>
      <Gap />
      <Heading style={styles.centerText}>{title}</Heading>
      {body ? (
        <>
          <Gap size="sm" />
          <Muted style={styles.centerText}>{body}</Muted>
        </>
      ) : null}
      {action ? (
        <>
          <Gap size="lg" />
          {action}
        </>
      ) : null}
    </View>
  );
}

// Shown in place of a signed-in-only screen while browsing signed out.
export function SignInGate({ title, body }: { title?: string; body?: string }) {
  const { t } = useTranslation();
  return (
    <Empty
      icon="user"
      title={title ?? t('signInGate.title')}
      body={body ?? t('signInGate.body')}
      action={<Button title={t('common.signIn')} onPress={() => router.push('/(auth)/welcome')} />}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { paddingHorizontal: space.md + 4, paddingTop: space.md, paddingBottom: space.xxl },
  footer: {
    paddingHorizontal: space.md + 4,
    paddingBottom: space.sm,
    paddingTop: space.sm,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, height: 52 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  headerRight: { minWidth: 44, alignItems: 'flex-end' },
  section: { marginTop: space.lg },
  sectionBody: { marginTop: space.sm, gap: space.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.md },
  help: { marginTop: space.xs, color: colors.textFaint },
  error: { marginTop: space.xs, color: colors.danger },
  button: { minHeight: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttonPrimary: { backgroundColor: colors.amber },
  buttonDark: { backgroundColor: colors.text },
  buttonOutline: { borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.card },
  buttonDanger: { borderWidth: 1.5, borderColor: colors.danger },
  buttonGhost: { minHeight: 44 },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconButtonFloat: { backgroundColor: colors.card, ...shadow.float },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onPhoto, fontFamily: fonts.bodyBold, fontSize: 10 },
  field: { gap: space.sm, marginTop: space.md },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
  },
  inputBoxError: { borderColor: colors.danger },
  prefix: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textMuted, marginRight: space.xs },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, paddingVertical: 14 },
  inputMultiline: { textAlignVertical: 'top' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.card,
  },
  chipAmber: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipLeaf: { backgroundColor: colors.leaf, borderColor: colors.leaf },
  chipDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  chipTextSelected: { color: colors.text },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surface },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.pill },
  stepperValue: { minWidth: 28, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, color: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  avatar: { backgroundColor: colors.surfaceRaised },
  monogram: { alignItems: 'center', justifyContent: 'center' },
  monogramText: { fontFamily: fonts.display, color: colors.amberInk },
  photo: { backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoRounded: { borderRadius: radius.md },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starsText: { fontFamily: fonts.bodyBold, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  centerText: { textAlign: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
});
