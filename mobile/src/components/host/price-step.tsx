import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icons';
import { Body, Divider, Field, Gap, Header, Heading, Label, Muted, Section, Small, Title } from '@/components/ui';
import { currencyFor, CURRENCIES, type CurrencyOption } from '@/lib/currencies';
import { formatMoney } from '@/lib/format';
import { parsePrice, previewSplit } from '@/lib/host-draft';
import { logError } from '@/lib/log';
import { i18n } from '@/i18n';
import { colors, fonts, radius, space } from '@/theme';

import type { StepProps } from './types';

// The currency's name in the reader's language where the device can say it, else the English name.
function currencyName(option: CurrencyOption): string {
  try {
    if (typeof Intl.DisplayNames === 'function') {
      return new Intl.DisplayNames([i18n.language], { type: 'currency' }).of(option.code) ?? option.name;
    }
  } catch (error) {
    logError('currencyName', error);
  }
  return option.name;
}

type SheetProps = { isVisible: boolean; value: string; onSelect: (value: string) => void; onClose: () => void };

function CurrencySheet({ isVisible, value, onSelect, onClose }: SheetProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const options = q
    ? CURRENCIES.filter((c) => [c.code, c.name, c.symbol, currencyName(c)].some((s) => s.toLowerCase().includes(q)))
    : CURRENCIES;
  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <Header title={t('hostNew.price.currency')} isModal onBack={onClose} />
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('hostNew.price.searchCurrency')}
            placeholderTextColor={colors.textFaint}
            accessibilityLabel={t('hostNew.price.searchCurrency')}
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
        <FlatList
          data={options}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Muted style={styles.empty}>{t('hostNew.price.noCurrency')}</Muted>}
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${currencyName(item)} ${item.code}`}
                onPress={() => {
                  onSelect(item.value);
                  setQuery('');
                }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <View style={styles.flex}>
                  <Body numberOfLines={1}>{currencyName(item)}</Body>
                  <Small>{item.code}</Small>
                </View>
                {isSelected ? <Icon name="check" size={20} color={colors.amberDeep} /> : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

type Props = StepProps & { isHeaderShown?: boolean; hasBookings?: boolean };

export function PriceStep({ draft, dispatch, errors, isHeaderShown = true, hasBookings = false }: Props) {
  const { t } = useTranslation();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const isTable = draft.listingType === 'table';
  const price = parsePrice(draft.price);
  const option = currencyFor(draft.currency);
  const split = price && price > 0 ? previewSplit(price) : null;

  return (
    <View>
      {isHeaderShown ? (
        <>
          <Title>{t('hostNew.price.title')}</Title>
          <Gap size="sm" />
          <Body>{isTable ? t('hostNew.price.bodyTable') : t('hostNew.price.bodyMarket')}</Body>
        </>
      ) : null}
      <Field
        label={isTable ? t('hostNew.price.perSeat') : t('hostNew.price.perUnit')}
        value={draft.price}
        onChangeText={(text) => dispatch({ type: 'set', patch: { price: text.replace(/[^0-9.,]/g, '') } })}
        placeholder="0"
        keyboardType="decimal-pad"
        prefix={draft.currency}
        error={errors.price}
        help={hasBookings ? t('hostManage.edit.priceWarning') : undefined}
      />
      <Section label={t('hostNew.price.currency')}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('hostNew.price.currency')}: ${currencyName(option)}`}
          onPress={() => setIsPickerOpen(true)}
          style={({ pressed }) => [styles.currency, pressed && styles.pressed]}>
          <Text style={styles.symbol}>{option.symbol}</Text>
          <View style={styles.flex}>
            <Body>{currencyName(option)}</Body>
            <Small>{option.code}</Small>
          </View>
          <Icon name="chevron" size={18} color={colors.textFaint} />
        </Pressable>
      </Section>

      <Gap size="lg" />
      <View style={styles.split}>
        <Heading>{t('hostNew.price.howPaid')}</Heading>
        <Gap size="sm" />
        <View style={styles.splitRow}>
          <View style={styles.flex}>
            <Label>{t('hostNew.price.deposit')}</Label>
            <Small>{t('hostNew.price.depositHelp')}</Small>
          </View>
          <Text style={styles.amount}>{split ? formatMoney(split.deposit, draft.currency) : '—'}</Text>
        </View>
        <Divider />
        <View style={styles.splitRow}>
          <View style={styles.flex}>
            <Label>{t('hostNew.price.inPerson')}</Label>
            <Small>{t('hostNew.price.inPersonHelp')}</Small>
          </View>
          <Text style={[styles.amount, styles.amountYou]}>{split ? formatMoney(split.rest, draft.currency) : '—'}</Text>
        </View>
        <Gap size="sm" />
        <Small>{isTable ? t('hostNew.price.splitNoteTable') : t('hostNew.price.splitNoteMarket')}</Small>
      </View>
      <CurrencySheet
        isVisible={isPickerOpen}
        value={draft.currency}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(currency) => {
          dispatch({ type: 'set', patch: { currency } });
          setIsPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { flex: 1, backgroundColor: colors.bg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.text },
  empty: { padding: space.lg, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.md + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pressed: { opacity: 0.6 },
  symbol: { width: 44, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, color: colors.amberInk },
  currency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  split: { padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  amount: { fontFamily: fonts.displayHeavy, fontSize: 18, color: colors.text },
  amountYou: { color: colors.leafDeep },
});
