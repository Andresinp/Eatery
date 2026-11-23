import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, ChipGroup, Header, Screen, Section, tagLabel, ToggleRow } from '@/components/ui';
import { applyFilters, withType, type Filters, type TypeFilter, type WhenFilter } from '@/lib/explore-filter-logic';
import { clearFilters, setFilters, useExploreListings, useFilters } from '@/lib/explore-filters';
import { formatPrice } from '@/lib/format';
import { useMyProfile } from '@/lib/session';
import { CUISINES, DIETARY, PRODUCT_TYPES } from '@/lib/vocab';
import { space } from '@/theme';

const PRICE_STEPS = [10, 20, 30, 50] as const;
const NO_ALLERGENS: string[] = [];

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

// The currency most of the loaded listings use, for the price chips' labels.
function commonCurrency(currencies: string[]): string {
  const counts = new Map<string, number>();
  for (const c of currencies) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = '€';
  let bestCount = 0;
  for (const [c, n] of counts) {
    if (n > bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}

export default function FiltersScreen() {
  const { t } = useTranslation();
  const filters = useFilters();
  const listings = useExploreListings();
  const profile = useMyProfile();
  const myAllergens = profile?.allergen_exclusions ?? NO_ALLERGENS;
  const resultCount = applyFilters(listings, filters, myAllergens, new Date()).length;
  const currency = commonCurrency(listings.map((l) => l.currency));

  const update = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }));

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: t('explore.typeAll') },
    { value: 'table', label: t('explore.typeTables') },
    { value: 'market', label: t('explore.typeMarket') },
  ];
  const whenOptions: { value: WhenFilter; label: string }[] = [
    { value: 'any', label: t('filters.whenAny') },
    { value: 'today', label: t('date.today') },
    { value: 'tomorrow', label: t('date.tomorrow') },
    { value: 'week', label: t('filters.whenWeek') },
  ];

  const handleClose = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'));

  return (
    <Screen
      edges={['bottom']}
      header={<Header title={t('filters.title')} isModal onBack={handleClose} />}
      footer={
        <View style={styles.footer}>
          <Button title={t('filters.clear')} variant="ghost" onPress={clearFilters} style={styles.clear} />
          <Button title={t('filters.showResults', { count: resultCount })} onPress={handleClose} style={styles.show} />
        </View>
      }>
      <Section label={t('filters.type')}>
        <ChipGroup>
          {typeOptions.map((o) => (
            <Chip key={o.value} title={o.label} isSelected={filters.type === o.value} onPress={() => setFilters((prev) => withType(prev, o.value))} />
          ))}
        </ChipGroup>
      </Section>

      <Section label={t('filters.when')}>
        <ChipGroup>
          {whenOptions.map((o) => (
            <Chip key={o.value} title={o.label} isSelected={filters.when === o.value} onPress={() => update({ when: o.value })} />
          ))}
        </ChipGroup>
      </Section>

      <Section label={t('filters.dietary')} help={t('filters.dietaryHelp')}>
        <ChipGroup>
          {DIETARY.map((d) => (
            <Chip key={d} tone="leaf" title={tagLabel(d)} isSelected={filters.dietary.includes(d)} onPress={() => update({ dietary: toggle(filters.dietary, d) })} />
          ))}
        </ChipGroup>
      </Section>

      {myAllergens.length > 0 ? (
        <Section label={t('filters.allergens')}>
          <ToggleRow
            title={t('filters.hideMyAllergens')}
            help={t('filters.hideMyAllergensHelp', { names: myAllergens.map(tagLabel).join(', ') })}
            value={filters.hideMyAllergens}
            onChange={(hideMyAllergens) => update({ hideMyAllergens })}
          />
        </Section>
      ) : null}

      <Section label={t('filters.maxPrice')}>
        <ChipGroup>
          <Chip title={t('filters.anyPrice')} isSelected={filters.maxPrice === null} onPress={() => update({ maxPrice: null })} />
          {PRICE_STEPS.map((p) => (
            <Chip
              key={p}
              title={t('filters.upTo', { price: formatPrice(p, currency) })}
              isSelected={filters.maxPrice === p}
              onPress={() => update({ maxPrice: filters.maxPrice === p ? null : p })}
            />
          ))}
        </ChipGroup>
      </Section>

      <Section label={t('filters.cuisine')}>
        <ChipGroup>
          {CUISINES.map((c) => (
            <Chip key={c} title={tagLabel(c)} isSelected={filters.cuisines.includes(c)} onPress={() => update({ cuisines: toggle(filters.cuisines, c) })} />
          ))}
        </ChipGroup>
      </Section>

      {filters.type !== 'table' ? (
        <Section label={t('filters.productType')} help={t('filters.productTypeHelp')}>
          <ChipGroup>
            {PRODUCT_TYPES.map((p) => (
              <Chip
                key={p}
                title={tagLabel(p)}
                isSelected={filters.productTypes.includes(p)}
                onPress={() => update({ productTypes: toggle(filters.productTypes, p) })}
              />
            ))}
          </ChipGroup>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  clear: { paddingHorizontal: space.md },
  show: { flex: 1 },
});
