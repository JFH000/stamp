import { Pressable, Text, View } from 'react-native';

import { useMyRating, useRatePlan } from '@/hooks/use-ratings';

const SCORE_ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
];

/** Calificación 1–10 del usuario. Se guarda al tocar (optimistic). */
export function RatingPicker({ planId }: { planId: string }) {
  const { data: myScore } = useMyRating(planId);
  const rate = useRatePlan(planId);

  return (
    <View className="gap-2">
      <Text className="text-lg font-semibold text-neutral-900 dark:text-white">
        Tu calificación{myScore ? `: ${myScore}/10` : ''}
      </Text>
      {SCORE_ROWS.map((row) => (
        <View key={row[0]} className="flex-row gap-2">
          {row.map((score) => {
            const selected = myScore === score;
            return (
              <Pressable
                key={score}
                accessibilityRole="button"
                accessibilityLabel={`Calificar con ${score} de 10`}
                accessibilityState={{ selected }}
                onPress={() => rate.mutate(score)}
                className={`h-11 flex-1 items-center justify-center rounded-xl border active:opacity-70 ${
                  selected
                    ? 'border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}>
                <Text
                  className={`text-base font-semibold ${
                    selected ? 'text-white dark:text-neutral-950' : 'text-neutral-800 dark:text-neutral-200'
                  }`}>
                  {score}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      {rate.error ? (
        <Text className="text-sm text-red-600">
          No pudimos guardar tu calificación: {rate.error.message}. Intenta de nuevo.
        </Text>
      ) : null}
    </View>
  );
}
