import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Gap, Heading, Muted, Title } from '@/components/ui';
import type { ListingType } from '@/lib/api';
import { colors, radius, shadow, space } from '@/theme';

import type { StepProps } from './types';

type CardProps = { title: string; body: string; icon: 'plate' | 'bag'; isSelected: boolean; onPress: () => void };

function TypeCard({ title, body, icon, isSelected, onPress }: CardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, isSelected && styles.cardSelected, pressed && styles.pressed]}>
      <View style={[styles.icon, isSelected && styles.iconSelected]}>
        <Icon name={icon} size={26} color={colors.amberInk} />
      </View>
      <View style={styles.text}>
        <Heading>{title}</Heading>
        <Muted>{body}</Muted>
      </View>
      {isSelected ? <Icon name="check" size={22} color={colors.amberInk} /> : null}
    </Pressable>
  );
}

export function TypeStep({ draft, dispatch }: StepProps) {
  const { t } = useTranslation();
  const handleChoose = (listingType: ListingType) => {
    void Haptics.selectionAsync();
    // Cuisine tags and product types are different vocabularies: start fresh when switching.
    dispatch({ type: 'set', patch: listingType === draft.listingType ? {} : { listingType, tags: [] } });
  };
  return (
    <View>
      <Title>{t('hostNew.type.title')}</Title>
      <Gap size="sm" />
      <Body>{t('hostNew.type.body')}</Body>
      <Gap size="lg" />
      <TypeCard
        title={t('hostNew.type.table')}
        body={t('hostNew.type.tableBody')}
        icon="plate"
        isSelected={draft.listingType === 'table'}
        onPress={() => handleChoose('table')}
      />
      <Gap />
      <TypeCard
        title={t('hostNew.type.market')}
        body={t('hostNew.type.marketBody')}
        icon="bag"
        isSelected={draft.listingType === 'market'}
        onPress={() => handleChoose('market')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    minHeight: 96,
  },
  cardSelected: { borderColor: colors.amberDeep, backgroundColor: colors.amberSoft, ...shadow.card },
  pressed: { opacity: 0.7 },
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconSelected: { backgroundColor: colors.amber },
  text: { flex: 1, gap: space.xs },
});
