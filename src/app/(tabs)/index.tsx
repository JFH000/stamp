import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { CategoryFilter } from '@/components/category-filter';
import { PlanCard } from '@/components/plan-card';
import { QueryError } from '@/components/query-error';
import { Screen } from '@/components/screen';
import type { PlanCategory } from '@/constants/categories';
import { usePlans } from '@/hooks/use-plans';

export default function ExploreScreen() {
  const [category, setCategory] = useState<PlanCategory | null>(null);
  const { data: plans, error, refetch, isRefetching } = usePlans();

  const visiblePlans = category ? plans?.filter((plan) => plan.category === category) : plans;

  return (
    <Screen title="Explorar">
      <CategoryFilter value={category} onChange={setCategory} />

      {visiblePlans === undefined ? (
        error ? (
          <QueryError message={`No pudimos cargar los planes: ${error.message}`} onRetry={refetch} />
        ) : (
          <ActivityIndicator className="mt-10" />
        )
      ) : (
        <FlatList
          data={visiblePlans}
          keyExtractor={(plan) => plan.id}
          renderItem={({ item }) => <PlanCard plan={item} />}
          ItemSeparatorComponent={() => <View className="h-6" />}
          contentContainerClassName="pb-8 pt-4"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            category ? (
              <View className="items-start gap-4 py-8">
                <Text className="text-base text-neutral-500">No hay planes en esta categoría todavía.</Text>
                <Button title="Ver todos" variant="secondary" onPress={() => setCategory(null)} />
              </View>
            ) : (
              <Text className="py-8 text-base text-neutral-500">Todavía no hay planes publicados.</Text>
            )
          }
        />
      )}
    </Screen>
  );
}
