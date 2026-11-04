import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { CommentComposer } from '@/components/comment-composer';
import { ImageCarousel } from '@/components/image-carousel';
import { QueryError } from '@/components/query-error';
import { RatingPicker } from '@/components/rating-picker';
import { CATEGORY_INFO } from '@/constants/categories';
import { useCheckInPhotoUrls, useMyCheckIn } from '@/hooks/use-check-ins';
import { OPTIMISTIC_ID_PREFIX, usePlanComments } from '@/hooks/use-plan-comments';
import { usePlan } from '@/hooks/use-plans';
import { formatDate, formatRating } from '@/lib/format';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, error, refetch } = usePlan(id);

  if (plan === undefined) {
    return (
      <View className="flex-1 bg-white px-5 dark:bg-neutral-950">
        {error ? (
          <QueryError message={`No pudimos cargar el plan: ${error.message}`} onRetry={refetch} />
        ) : (
          <ActivityIndicator className="mt-10" />
        )}
      </View>
    );
  }

  if (plan === null) {
    return (
      <View className="flex-1 bg-white px-5 pt-8 dark:bg-neutral-950">
        <Text className="text-base text-neutral-500">Este plan ya no existe.</Text>
      </View>
    );
  }

  const category = CATEGORY_INFO[plan.category];

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="pb-12">
      <ImageCarousel urls={plan.image_urls} />

      <View className="gap-2 px-5 pt-5">
        <Text className="text-sm font-semibold uppercase tracking-wide" style={{ color: category.color }}>
          {category.label}
        </Text>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">{plan.title}</Text>
        {plan.neighborhood || plan.address ? (
          <Text className="text-base text-neutral-500">
            {[plan.neighborhood, plan.address].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <Text className="text-base font-medium text-neutral-800 dark:text-neutral-200">
          {formatRating(plan.rating_avg, plan.rating_count)}
        </Text>
        <View className="mt-3 gap-6">
          <CheckInStatus planId={plan.id} />
          <OnlyAfterCheckIn planId={plan.id}>
            <RatingPicker planId={plan.id} />
          </OnlyAfterCheckIn>
        </View>
        {plan.description ? (
          <Text className="mt-2 text-base leading-6 text-neutral-800 dark:text-neutral-200">
            {plan.description}
          </Text>
        ) : null}
      </View>

      <Comments planId={plan.id} />
    </ScrollView>
  );
}

/** Botón de check-in, o "Ya fuiste" con la foto si el usuario ya hizo check-in. */
function CheckInStatus({ planId }: { planId: string }) {
  const { data: checkIn, error, refetch } = useMyCheckIn(planId);
  const { data: photoUrls } = useCheckInPhotoUrls(checkIn ? [checkIn.photo_path] : []);

  if (checkIn === undefined) {
    return error ? (
      <QueryError message={`No pudimos ver tu check-in: ${error.message}`} onRetry={refetch} />
    ) : null;
  }

  if (checkIn === null) {
    return (
      <Button
        title="Hacer check-in"
        onPress={() => router.push({ pathname: '/plan/[id]/check-in', params: { id: planId } })}
      />
    );
  }

  const photoUrl = photoUrls?.[checkIn.photo_path];

  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-green-50 p-3 dark:bg-green-950">
      {photoUrl ? (
        <Image
          // La URL firmada cambia; la ruta sirve de clave de caché estable.
          source={{ uri: photoUrl, cacheKey: checkIn.photo_path }}
          style={{ width: 56, height: 56, borderRadius: 12 }}
          contentFit="cover"
          accessibilityLabel="Tu foto del check-in"
        />
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 12 }} className="bg-green-100 dark:bg-green-900" />
      )}
      <View className="flex-1">
        <Text className="text-base font-semibold text-green-800 dark:text-green-300">✓ Ya fuiste</Text>
        <Text className="text-sm text-green-800 dark:text-green-300">
          Check-in el {formatDate(checkIn.created_at)}
        </Text>
      </View>
    </View>
  );
}

/** Muestra `children` solo si el usuario ya hizo check-in (calificar y comentar lo exigen). */
function OnlyAfterCheckIn({
  planId,
  fallback = null,
  children,
}: {
  planId: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { data: checkIn } = useMyCheckIn(planId);
  if (checkIn === undefined) return null;
  return checkIn ? children : fallback;
}

function Comments({ planId }: { planId: string }) {
  const { data: comments, error, refetch } = usePlanComments(planId);

  return (
    <View className="mt-8 gap-4 px-5">
      <Text className="text-xl font-bold text-neutral-900 dark:text-white">Comentarios</Text>

      <OnlyAfterCheckIn
        planId={planId}
        fallback={<Text className="text-sm text-neutral-500">Haz check-in en este plan para calificarlo y comentar.</Text>}>
        <CommentComposer planId={planId} />
      </OnlyAfterCheckIn>

      {comments === undefined ? (
        error ? (
          <QueryError message={`No pudimos cargar los comentarios: ${error.message}`} onRetry={refetch} />
        ) : (
          <ActivityIndicator className="self-start" />
        )
      ) : comments.length === 0 ? (
        <Text className="text-base text-neutral-500">Aún no hay comentarios. ¡Sé el primero!</Text>
      ) : (
        comments.map((comment) => (
          <View
            key={comment.id}
            className={`gap-1 border-b border-neutral-200 pb-4 dark:border-neutral-800 ${
              comment.id.startsWith(OPTIMISTIC_ID_PREFIX) ? 'opacity-50' : ''
            }`}>
            <Text className="text-sm text-neutral-500">
              <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
                {comment.author?.display_name ?? 'Usuario'}
              </Text>
              {comment.id.startsWith(OPTIMISTIC_ID_PREFIX) ? ' · Publicando…' : ` · ${formatDate(comment.created_at)}`}
            </Text>
            <Text className="text-base text-neutral-800 dark:text-neutral-200">{comment.body}</Text>
          </View>
        ))
      )}
    </View>
  );
}
