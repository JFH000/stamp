import { Pressable, ScrollView, Text } from 'react-native';

import { CATEGORY_INFO, PLAN_CATEGORIES, type PlanCategory } from '@/constants/categories';

type CategoryFilterProps = {
  value: PlanCategory | null;
  onChange: (category: PlanCategory | null) => void;
};

/** Chips horizontales: "Todos" + una por categoría. */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5"
      className="-mx-5 grow-0">
      <Chip label="Todos" selected={value === null} onPress={() => onChange(null)} />
      {PLAN_CATEGORIES.map((category) => (
        <Chip
          key={category}
          label={CATEGORY_INFO[category].label}
          selected={value === category}
          onPress={() => onChange(category)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`h-9 justify-center rounded-full border px-4 active:opacity-70 ${
        selected
          ? 'border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark'
          : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
      }`}>
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-white dark:text-neutral-950' : 'text-neutral-800 dark:text-neutral-200'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}
