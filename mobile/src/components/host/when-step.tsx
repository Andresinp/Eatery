import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Chip, ChipGroup, Gap, Section, Small, Stepper, Title, ToggleRow, tagLabel } from '@/components/ui';
import type { DiningSetting } from '@/lib/api';
import { formatDay, formatTime } from '@/lib/format';
import { QUANTITY_MAX, SEATS_MAX, endFromTime, toggle, withDay } from '@/lib/host-draft';
import { DINING_SETTINGS, DRINKS } from '@/lib/vocab';
import { i18n } from '@/i18n';
import { colors, fonts, radius, space } from '@/theme';

import { DiningPhotoPicker } from './dining-photo';
import { diningLabel } from './labels';
import type { StepProps } from './types';

type PickerProps = {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  minimumDate?: Date;
  error?: string;
};

// The platform's own picker: compact inline on iOS, the system dialog on Android.
export function DateTimeRow({ label, value, mode, onChange, minimumDate, error }: PickerProps) {
  const shown = mode === 'date' ? formatDay(value.toISOString()) : formatTime(value.toISOString());
  const handleAndroid = () => {
    DateTimePickerAndroid.open({
      value,
      mode,
      minimumDate,
      onValueChange: (_event, date) => onChange(date),
    });
  };
  return (
    <View>
      <View style={[styles.row, !!error && styles.rowError]}>
        <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={20} color={colors.textMuted} />
        <Body style={styles.flex}>{label}</Body>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            minimumDate={minimumDate}
            minuteInterval={5}
            accentColor={colors.amberDeep}
            locale={i18n.language}
            accessibilityLabel={label}
            onValueChange={(_event, date) => onChange(date)}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${shown}`}
            onPress={handleAndroid}
            style={({ pressed }) => [styles.value, pressed && styles.pressed]}>
            <Text style={styles.valueText}>{shown}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Small style={styles.error}>{error}</Small> : null}
    </View>
  );
}

type Props = StepProps & { userId: string; minUnits?: number; isHeaderShown?: boolean };

export function WhenStep({ draft, dispatch, errors, userId, minUnits = 0, isHeaderShown = true }: Props) {
  const { t } = useTranslation();
  const isTable = draft.listingType === 'table';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDay = (day: Date) => {
    const start = withDay(draft.start, day);
    const duration = draft.end.getTime() - draft.start.getTime();
    dispatch({ type: 'set', patch: { start, end: new Date(start.getTime() + Math.max(duration, 3600_000)) } });
  };
  const handleStart = (time: Date) => {
    const start = withDay(time, draft.start);
    // Defaults to three hours later; keeps a custom length once the host set the end.
    const duration = draft.end.getTime() - draft.start.getTime();
    dispatch({ type: 'set', patch: { start, end: new Date(start.getTime() + (duration > 0 ? duration : 3 * 3600_000)) } });
  };
  const handleEnd = (time: Date) => dispatch({ type: 'set', patch: { end: endFromTime(draft.start, time) } });

  return (
    <View>
      {isHeaderShown ? (
        <>
          <Title>{isTable ? t('hostNew.when.titleTable') : t('hostNew.when.titleMarket')}</Title>
          <Gap size="sm" />
          <Body>{isTable ? t('hostNew.when.bodyTable') : t('hostNew.when.bodyMarket')}</Body>
        </>
      ) : null}
      <Section label={isTable ? t('hostNew.when.date') : t('hostNew.when.pickupDate')}>
        <DateTimeRow label={t('hostNew.when.day')} value={draft.start} mode="date" minimumDate={today} onChange={handleDay} />
        <DateTimeRow
          label={isTable ? t('hostNew.when.start') : t('hostNew.when.windowStart')}
          value={draft.start}
          mode="time"
          onChange={handleStart}
          error={errors.start}
        />
        <DateTimeRow
          label={isTable ? t('hostNew.when.end') : t('hostNew.when.windowEnd')}
          value={draft.end}
          mode="time"
          onChange={handleEnd}
          error={errors.end}
        />
      </Section>

      <Section
        label={isTable ? t('hostNew.when.seats') : t('hostNew.when.quantity')}
        help={minUnits > 0 ? t('hostNew.when.booked', { count: minUnits }) : undefined}>
        <View style={styles.stepperRow}>
          <Body style={styles.flex}>{isTable ? t('hostNew.when.seatsHelp') : t('hostNew.when.quantityHelp')}</Body>
          {isTable ? (
            <Stepper
              label={t('hostNew.when.seats')}
              value={draft.seats}
              min={Math.max(1, minUnits)}
              max={SEATS_MAX}
              onChange={(seats) => dispatch({ type: 'set', patch: { seats } })}
            />
          ) : (
            <Stepper
              label={t('hostNew.when.quantity')}
              value={draft.quantity}
              min={Math.max(1, minUnits)}
              max={QUANTITY_MAX}
              onChange={(quantity) => dispatch({ type: 'set', patch: { quantity } })}
            />
          )}
        </View>
        {errors.units ? <Small style={styles.error}>{errors.units}</Small> : null}
      </Section>

      {isTable ? (
        <>
          <Section label={t('hostNew.when.setting')}>
            <ChipGroup>
              {DINING_SETTINGS.map((setting: DiningSetting) => (
                <Chip
                  key={setting}
                  title={diningLabel(t, setting)}
                  isSelected={draft.diningSetting === setting}
                  onPress={() => dispatch({ type: 'set', patch: { diningSetting: setting } })}
                />
              ))}
            </ChipGroup>
          </Section>
          <Section label={t('hostNew.diningPhoto.title')}>
            <DiningPhotoPicker photo={draft.diningPhoto} dispatch={dispatch} userId={userId} error={errors.diningPhoto} />
          </Section>
          <Section label={t('hostNew.when.drinks')}>
            <ToggleRow
              title={t('hostNew.when.drinksIncluded')}
              help={t('hostNew.when.drinksHelp')}
              value={draft.drinksIncluded}
              onChange={(drinksIncluded) => dispatch({ type: 'set', patch: { drinksIncluded } })}
            />
            {draft.drinksIncluded ? (
              <ChipGroup>
                {DRINKS.map((drink) => (
                  <Chip
                    key={drink}
                    title={tagLabel(drink)}
                    isSelected={draft.drinks.includes(drink)}
                    onPress={() => dispatch({ type: 'set', patch: { drinks: toggle(draft.drinks, drink) } })}
                  />
                ))}
              </ChipGroup>
            ) : null}
            {errors.drinks ? <Small style={styles.error}>{errors.drinks}</Small> : null}
          </Section>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  rowError: { borderColor: colors.danger },
  value: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.sm, backgroundColor: colors.surface, minHeight: 40, justifyContent: 'center' },
  valueText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  pressed: { opacity: 0.6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  error: { marginTop: space.xs, color: colors.danger },
});
