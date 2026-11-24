import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Button, Chip, ChipGroup, Field, Gap, Section, Small, Title, tagLabel } from '@/components/ui';
import { api } from '@/lib/api';
import { DESCRIPTION_MAX, isQuickSelected, quickToggle, TITLE_MAX, toggle } from '@/lib/host-draft';
import { logError } from '@/lib/log';
import { CUISINES, PRODUCT_TYPES, QUICK_CONTAINS, QUICK_SUITABLE } from '@/lib/vocab';
import { i18n } from '@/i18n';
import { colors, space } from '@/theme';

import type { StepProps } from './types';

type Props = StepProps & { isHeaderShown?: boolean };

export function BasicsStep({ draft, dispatch, errors, isHeaderShown = true }: Props) {
  const { t } = useTranslation();
  const [isWriting, setIsWriting] = useState(false);
  const [hasWriteFailed, setHasWriteFailed] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const isTable = draft.listingType === 'table';
  const vocab: readonly string[] = isTable ? CUISINES : PRODUCT_TYPES;
  const customTags = draft.tags.filter((tag) => !vocab.includes(tag));

  const handleWrite = async () => {
    setIsWriting(true);
    setHasWriteFailed(false);
    try {
      const { description } = await api.describeListing({
        title: draft.title.trim(),
        listing_type: draft.listingType,
        ingredients: draft.description.trim() || undefined,
        cuisine: draft.tags[0],
        language: i18n.language,
      });
      dispatch({ type: 'set', patch: { description: description.slice(0, DESCRIPTION_MAX) } });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logError('describeListing', error);
      setHasWriteFailed(true);
    } finally {
      setIsWriting(false);
    }
  };

  const handleAddCustom = () => {
    const tag = customTag.trim().slice(0, 30);
    if (tag && !draft.tags.includes(tag)) dispatch({ type: 'set', patch: { tags: [...draft.tags, tag] } });
    setCustomTag('');
  };

  return (
    <View>
      {isHeaderShown ? (
        <>
          <Title>{t('hostNew.basics.title')}</Title>
          <Gap size="sm" />
          <Body>{isTable ? t('hostNew.basics.bodyTable') : t('hostNew.basics.bodyMarket')}</Body>
        </>
      ) : null}
      <Field
        label={t('hostNew.basics.name')}
        value={draft.title}
        onChangeText={(title) => dispatch({ type: 'set', patch: { title } })}
        placeholder={isTable ? t('hostNew.basics.namePlaceholderTable') : t('hostNew.basics.namePlaceholderMarket')}
        maxLength={TITLE_MAX}
        error={errors.title}
        help={t('hostNew.basics.counter', { n: draft.title.length, max: TITLE_MAX })}
        returnKeyType="next"
      />
      <Field
        label={t('hostNew.basics.description')}
        value={draft.description}
        onChangeText={(description) => dispatch({ type: 'set', patch: { description } })}
        placeholder={t('hostNew.basics.descriptionPlaceholder')}
        maxLength={DESCRIPTION_MAX}
        multiline
        error={errors.description}
        help={t('hostNew.basics.counter', { n: draft.description.length, max: DESCRIPTION_MAX })}
      />
      <Gap size="sm" />
      <View style={styles.writeRow}>
        <Button
          title={isWriting ? t('hostNew.basics.writing') : t('hostNew.basics.write')}
          variant="outline"
          icon={<Icon name="sparkle" size={18} color={colors.amberDeep} />}
          isLoading={isWriting}
          isDisabled={draft.title.trim().length < 3}
          onPress={() => void handleWrite()}
        />
        {draft.title.trim().length < 3 ? <Small style={styles.faint}>{t('hostNew.basics.writeNeedsTitle')}</Small> : null}
        {hasWriteFailed ? <Small style={styles.error}>{t('hostNew.basics.writeFailed')}</Small> : null}
      </View>

      <Section label={t('hostNew.quick.title')} help={t('hostNew.quick.help')}>
        <Small style={styles.groupLabel}>{t('hostNew.quick.contains')}</Small>
        <ChipGroup>
          {QUICK_CONTAINS.map((value) => (
            <Chip
              key={value}
              tone="danger"
              title={value === 'Meat' ? t('hostNew.quick.meat') : tagLabel(value)}
              isSelected={isQuickSelected(draft, value)}
              onPress={() => dispatch({ type: 'set', patch: quickToggle(draft, value) })}
            />
          ))}
        </ChipGroup>
        <Small style={styles.groupLabel}>{t('hostNew.quick.suitable')}</Small>
        <ChipGroup>
          {QUICK_SUITABLE.map((value) => (
            <Chip
              key={value}
              tone="leaf"
              title={tagLabel(value)}
              isSelected={isQuickSelected(draft, value)}
              onPress={() => dispatch({ type: 'set', patch: quickToggle(draft, value) })}
            />
          ))}
          <Chip
            title={t('hostNew.quick.unsure')}
            isSelected={draft.isContentsUnsure}
            onPress={() => dispatch({ type: 'set', patch: { isContentsUnsure: !draft.isContentsUnsure } })}
          />
        </ChipGroup>
        {draft.isContentsUnsure ? <Small style={styles.faint}>{t('hostNew.quick.unsureHelp')}</Small> : null}
      </Section>

      <Section label={isTable ? t('hostNew.basics.cuisine') : t('hostNew.basics.productType')}>
        <ChipGroup>
          {vocab.map((tag) => (
            <Chip
              key={tag}
              title={tagLabel(tag)}
              isSelected={draft.tags.includes(tag)}
              onPress={() => dispatch({ type: 'set', patch: { tags: toggle(draft.tags, tag) } })}
            />
          ))}
          {customTags.map((tag) => (
            <Chip key={tag} title={tag} isSelected onPress={() => dispatch({ type: 'set', patch: { tags: toggle(draft.tags, tag) } })} />
          ))}
        </ChipGroup>
        <Field
          label={t('hostNew.basics.customTag')}
          value={customTag}
          onChangeText={setCustomTag}
          placeholder={t('hostNew.basics.customTagPlaceholder')}
          onSubmitEditing={handleAddCustom}
          returnKeyType="done"
          maxLength={30}
          help={t('hostNew.basics.customTagHelp')}
        />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  writeRow: { alignItems: 'flex-start', gap: space.xs },
  faint: { color: colors.textFaint },
  groupLabel: { color: colors.textMuted, marginBottom: space.xs, marginTop: space.xs },
  error: { color: colors.danger },
});
