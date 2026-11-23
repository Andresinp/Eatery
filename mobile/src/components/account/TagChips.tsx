import { Chip, ChipGroup, tagLabel } from '@/components/ui';

type Props = {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  tone?: 'amber' | 'leaf' | 'danger';
};

// A multi-select of stored tag values (DIETARY, ALLERGENS), shown in the reader's language.
export function TagChips({ options, value, onChange, tone = 'amber' }: Props) {
  const handleToggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <ChipGroup>
      {options.map((option) => (
        <Chip key={option} title={tagLabel(option)} tone={tone} isSelected={value.includes(option)} onPress={() => handleToggle(option)} />
      ))}
    </ChipGroup>
  );
}
