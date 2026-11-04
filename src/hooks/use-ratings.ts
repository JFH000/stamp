import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { plansQueryKey } from '@/hooks/use-plans';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type MyRating = { plan_id: string; score: number };

function myRatingsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ['my-ratings', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyRating[]> => {
      // Las ratings son visibles para todos: filtrar por el usuario actual.
      const { data, error } = await supabase.from('ratings').select('plan_id, score').eq('user_id', userId!);
      if (error) throw error;
      return data;
    },
  });
}

/** Todas las calificaciones del usuario actual. */
export function useMyRatings() {
  return useQuery(myRatingsQuery(useAuth().session?.user.id));
}

/** La calificación del usuario en un plan (1–10), o `null`. */
export function useMyRating(planId: string) {
  return useQuery({
    ...myRatingsQuery(useAuth().session?.user.id),
    select: (ratings) => ratings.find((rating) => rating.plan_id === planId)?.score ?? null,
  });
}

/**
 * Guarda la calificación (upsert: una por usuario y plan) con optimistic update.
 * El promedio del plan lo recalcula un trigger; aquí solo se vuelve a pedir.
 */
export function useRatePlan(planId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = myRatingsQuery(useAuth().session?.user.id);
  const mutationKey = ['rate-plan', planId];

  return useMutation({
    mutationKey,
    mutationFn: async (score: number) => {
      const { error } = await supabase
        .from('ratings')
        .upsert({ plan_id: planId, score }, { onConflict: 'user_id,plan_id' });
      if (error) throw error;
    },
    onMutate: async (score) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old = []) => [
        ...old.filter((rating) => rating.plan_id !== planId),
        { plan_id: planId, score },
      ]);
      return { previous };
    },
    onError: (_error, _score, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      // Si el usuario tocó varias notas seguidas, refrescar solo al terminar la última.
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      return Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: plansQueryKey }),
      ]);
    },
  });
}
