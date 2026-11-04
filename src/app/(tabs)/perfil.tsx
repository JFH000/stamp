import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { QueryError } from '@/components/query-error';
import { Screen } from '@/components/screen';
import { useCheckInPhotoUrls, useMyCheckIns } from '@/hooks/use-check-ins';
import { usePlans } from '@/hooks/use-plans';
import { useProfile } from '@/hooks/use-profile';
import { useMyRatings } from '@/hooks/use-ratings';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';

const COLUMNS = 3;
const GAP = 8;
const SCREEN_PADDING = 20; // px-5 de <Screen>

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const tileSize = Math.floor((width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const { data: checkIns, error, refetch, isRefetching } = useMyCheckIns();
  const { data: plans } = usePlans();
  const { data: myRatings } = useMyRatings();
  const { data: photoUrls } = useCheckInPhotoUrls(checkIns?.map((checkIn) => checkIn.photo_path) ?? []);
  const logout = useMutation({ mutationFn: signOut });

  const planTitles = new Map(plans?.map((plan) => [plan.id, plan.title]));
  const scores = new Map(myRatings?.map((rating) => [rating.plan_id, rating.score]));

  return (
    <Screen title="Perfil">
      <FlatList
        data={checkIns ?? []}
        keyExtractor={(checkIn) => checkIn.id}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ gap: GAP, paddingBottom: 40 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={<ProfileHeader completed={checkIns?.length} total={plans?.length} />}
        renderItem={({ item }) => {
          const photoUrl = photoUrls?.[item.photo_path];
          const score = scores.get(item.plan_id);
          return (
            <Link href={{ pathname: '/plan/[id]', params: { id: item.plan_id } }} asChild>
              <Pressable style={{ width: tileSize }} className="active:opacity-80">
                <View
                  style={{ width: tileSize, height: tileSize }}
                  className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                  {photoUrl ? (
                    <Image
                      source={{ uri: photoUrl, cacheKey: item.photo_path }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : null}
                  {score ? (
                    <View className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5">
                      <Text className="text-xs font-semibold text-white">★ {score}</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-1 text-xs text-neutral-700 dark:text-neutral-300" numberOfLines={1}>
                  {planTitles.get(item.plan_id) ?? ''}
                </Text>
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={
          checkIns ? (
            <Text className="text-base text-neutral-500">
              Aún no has completado planes. Busca uno en Explorar o en el Mapa y haz tu primer check-in.
            </Text>
          ) : error ? (
            <QueryError message={`No pudimos cargar tus planes: ${error.message}`} onRetry={refetch} />
          ) : (
            <ActivityIndicator className="self-start" />
          )
        }
        ListFooterComponent={
          <View className="mt-10">
            <Button
              title="Cerrar sesión"
              variant="secondary"
              onPress={() => logout.mutate()}
              loading={logout.isPending}
            />
          </View>
        }
      />
    </Screen>
  );
}

function ProfileHeader({ completed, total }: { completed?: number; total?: number }) {
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const progress = completed !== undefined && total ? Math.min(completed / total, 1) : 0;

  return (
    <View className="mb-2 gap-6">
      <View className="gap-1">
        <Text className="text-xl font-semibold text-neutral-900 dark:text-white">
          {profile?.display_name ?? ' '}
        </Text>
        <Text className="text-base text-neutral-500">{session?.user.email}</Text>
      </View>

      <View className="gap-3 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-900">
        <Text className="text-4xl font-bold text-neutral-900 dark:text-white">
          {completed ?? '–'}
          <Text className="text-2xl text-neutral-500">/{total ?? '–'}</Text>
        </Text>
        <Text className="text-base text-neutral-600 dark:text-neutral-400">planes completados</Text>
        <View
          className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total ?? 0, now: completed ?? 0 }}>
          <View className="h-full rounded-full bg-primary dark:bg-primary-dark" style={{ width: `${progress * 100}%` }} />
        </View>
      </View>

      <Text className="text-lg font-semibold text-neutral-900 dark:text-white">Tus planes</Text>
    </View>
  );
}
