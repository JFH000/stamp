import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryFilter } from '@/components/category-filter';
import { CATEGORY_INFO, type PlanCategory } from '@/constants/categories';
import { usePlans } from '@/hooks/use-plans';
import { formatRating } from '@/lib/format';

const BOGOTA_REGION = {
  latitude: 4.65,
  longitude: -74.08,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<PlanCategory | null>(null);
  const { data: plans, error, refetch, isFetching } = usePlans();

  const visiblePlans = category ? plans?.filter((plan) => plan.category === category) : plans;

  return (
    <View className="flex-1">
      <MapView style={StyleSheet.absoluteFill} initialRegion={BOGOTA_REGION} showsPointsOfInterests={false}>
        {visiblePlans?.map((plan) => (
          <Marker
            key={plan.id}
            coordinate={{ latitude: plan.lat, longitude: plan.lng }}
            title={plan.title}
            description={`${CATEGORY_INFO[plan.category].label} · ${formatRating(plan.rating_avg, plan.rating_count)}`}
            pinColor={CATEGORY_INFO[plan.category].color}
            onCalloutPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
          />
        ))}
      </MapView>

      {/* Filtros y estado, flotando sobre el mapa */}
      <View className="absolute left-0 right-0 gap-2 px-5" style={{ top: insets.top + 8 }}>
        <CategoryFilter value={category} onChange={setCategory} />

        {plans === undefined && isFetching ? (
          <View className="self-start rounded-full bg-white px-3 py-2 dark:bg-neutral-900">
            <ActivityIndicator />
          </View>
        ) : null}

        {error ? (
          <Pressable
            onPress={() => refetch()}
            className="self-start rounded-full bg-white px-4 py-2 active:opacity-70 dark:bg-neutral-900">
            <Text className="text-sm text-red-600">No pudimos cargar los planes · Reintentar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
