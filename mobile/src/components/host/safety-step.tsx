import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Button, Chip, ChipGroup, Gap, Section, Small, Title, ToggleRow, tagLabel } from '@/components/ui';
import { detectAllergens as detectLocally } from '@/lib/allergens';
import { api } from '@/lib/api';
import { toggle } from '@/lib/host-draft';
import { logError } from '@/lib/log';
import { ALLERGENS, DIETARY } from '@/lib/vocab';
import { colors, radius, space } from '@/theme';

import type { StepProps } from './types';

// The server answer is checked, not trusted: anything outside the vocabulary is dropped.
const known = (list: readonly string[], values: unknown): string[] =>
  Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string' && list.includes(v)) : [];

type Suggestions = { allergens: string[]; dietary: string[] };

// The server's model, else the offline keyword scan. Never rejects.
async function suggest(title: string, description: string): Promise<Suggestions> {
  let found: Suggestions;
  try {
    found = await api.detectAllergens(title, description);
  } catch (error) {
    logError('detectAllergens (using the offline scan)', error);
    const local = detectLocally(`${title}\n${description}`);
    found = { allergens: local.allergens, dietary: local.suggestedDietary };
  }
  return { allergens: known(ALLERGENS, found.allergens), dietary: known(DIETARY, found.dietary) };
}

type Props = StepProps & { isHeaderShown?: boolean; isAutoSuggest?: boolean };

export function SafetyStep({ draft, dispatch, errors, isHeaderShown = true, isAutoSuggest = true }: Props) {
  const { t } = useTranslation();
  const source = `${draft.title}\n${draft.description}`;
  const needsSuggestions = draft.suggestedFor !== source;
  const [isDetecting, setIsDetecting] = useState(() => isAutoSuggest && needsSuggestions);

  const apply = (found: Suggestions) => {
    dispatch({ type: 'applySuggestions', source, allergens: found.allergens, dietary: found.dietary });
    setIsDetecting(false);
  };

  const handleDetect = () => {
    setIsDetecting(true);
    void suggest(draft.title, draft.description).then(apply);
  };

  // In the wizard: suggest on entering the step, once per title and description.
  useEffect(() => {
    if (!isAutoSuggest || !needsSuggestions) return;
    let isActive = true;
    void suggest(draft.title, draft.description).then((found) => {
      if (isActive) apply(found);
    });
    return () => {
      isActive = false;
    };
    // Runs when the step is shown, not on every keystroke elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestedA = new Set(draft.suggestedAllergens);
  const suggestedD = new Set(draft.suggestedDietary);
  const chipTitle = (value: string, isSuggested: boolean) => (isSuggested ? `${tagLabel(value)} · ${t('hostNew.safety.suggestedShort')}` : tagLabel(value));

  return (
    <View>
      {isHeaderShown ? (
        <>
          <Title>{t('hostNew.safety.title')}</Title>
          <Gap size="sm" />
          <Body>{t('hostNew.safety.body')}</Body>
        </>
      ) : null}
      {isDetecting ? (
        <View style={styles.notice}>
          <ActivityIndicator color={colors.amberDeep} />
          <Small style={styles.noticeText}>{t('hostNew.safety.detecting')}</Small>
        </View>
      ) : draft.suggestedAllergens.length + draft.suggestedDietary.length > 0 ? (
        <View style={styles.notice}>
          <Icon name="sparkle" size={18} color={colors.amberDeep} />
          <Small style={styles.noticeText}>{t('hostNew.safety.suggested')}</Small>
        </View>
      ) : null}
      {!isDetecting && needsSuggestions ? (
        <>
          <Gap size="sm" />
          <Button
            title={t('hostNew.safety.suggestAgain')}
            variant="outline"
            icon={<Icon name="sparkle" size={18} color={colors.amberDeep} />}
            onPress={handleDetect}
          />
        </>
      ) : null}

      <Section label={t('hostNew.safety.allergens')} help={t('hostNew.safety.allergensHelp')}>
        <ChipGroup>
          {ALLERGENS.map((value) => (
            <Chip
              key={value}
              tone="danger"
              title={chipTitle(value, suggestedA.has(value))}
              isSelected={draft.allergens.includes(value)}
              onPress={() => dispatch({ type: 'set', patch: { allergens: toggle(draft.allergens, value), isSafetyChecked: false } })}
            />
          ))}
        </ChipGroup>
      </Section>

      <Section label={t('hostNew.safety.dietary')} help={t('hostNew.safety.dietaryHelp')}>
        <ChipGroup>
          {DIETARY.map((value) => (
            <Chip
              key={value}
              tone="leaf"
              title={chipTitle(value, suggestedD.has(value))}
              isSelected={draft.dietary.includes(value)}
              onPress={() => dispatch({ type: 'set', patch: { dietary: toggle(draft.dietary, value), isSafetyChecked: false } })}
            />
          ))}
        </ChipGroup>
      </Section>

      <Gap />
      <View style={[styles.confirm, !!errors.checked && styles.confirmError]}>
        <ToggleRow
          title={t('hostNew.safety.confirm')}
          help={t('hostNew.safety.confirmHelp')}
          value={draft.isSafetyChecked}
          isDisabled={isDetecting}
          onChange={(isSafetyChecked) => dispatch({ type: 'set', patch: { isSafetyChecked } })}
        />
      </View>
      {errors.checked ? <Small style={styles.error}>{errors.checked}</Small> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.amberSoft,
  },
  noticeText: { flex: 1, color: colors.amberInk },
  confirm: { paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  confirmError: { borderColor: colors.danger },
  error: { marginTop: space.xs, color: colors.danger },
});
