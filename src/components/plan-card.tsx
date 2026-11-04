import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { CATEGORY_INFO } from '@/constants/categories';
import type { Plan } from '@/hooks/use-plans';
import { formatRating } from '@/lib/format';

export function PlanCard({ plan }: { plan: Plan }) {
  const category = CATEGORY_INFO[plan.category];
  const cover = plan.image_urls[0];

  return (
    <Link href={{ pathname: '/plan/[id]', params: { id: plan.id } }} asChild>
      <Pressable className="active:opacity-80">
        <View className="overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
          {cover ? (
            <Image
              source={cover}
              style={{ width: '100%', aspectRatio: 16 / 9 }}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={{ width: '100%', aspectRatio: 16 / 9 }} />
          )}
        </View>
        <Text className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white" numberOfLines={1}>
          {plan.title}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={1}>
          <Text style={{ color: category.color }}>{category.label}</Text>
          {plan.neighborhood ? ` · ${plan.neighborhood}` : ''} · {formatRating(plan.rating_avg, plan.rating_count)}
        </Text>
      </Pressable>
    </Link>
  );
}
