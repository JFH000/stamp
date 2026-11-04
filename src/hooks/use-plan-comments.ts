import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileQueryKey, type Profile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export function planCommentsQueryKey(planId: string) {
  return ['comments', planId] as const;
}

async function fetchPlanComments(planId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, body, created_at, user_id, author:profiles(display_name, avatar_url)')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export type PlanComment = Awaited<ReturnType<typeof fetchPlanComments>>[number];

/** Prefijo de id de los comentarios optimistas (aún sin confirmar por el servidor). */
export const OPTIMISTIC_ID_PREFIX = 'optimistic-';

export function usePlanComments(planId: string) {
  return useQuery({
    queryKey: planCommentsQueryKey(planId),
    queryFn: () => fetchPlanComments(planId),
  });
}

/** Publica un comentario con optimistic update. RLS exige check-in previo en el plan. */
export function useAddComment(planId: string) {
  const queryClient = useQueryClient();
  const userId = useAuth().session?.user.id;
  const queryKey = planCommentsQueryKey(planId);

  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from('comments').insert({ plan_id: planId, body });
      if (error) throw error;
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PlanComment[]>(queryKey);
      const profile = queryClient.getQueryData<Profile>(profileQueryKey(userId));

      const optimistic: PlanComment = {
        id: `${OPTIMISTIC_ID_PREFIX}${Date.now()}`,
        body,
        created_at: new Date().toISOString(),
        user_id: userId ?? '',
        author: { display_name: profile?.display_name ?? 'Tú', avatar_url: profile?.avatar_url ?? null },
      };
      queryClient.setQueryData<PlanComment[]>(queryKey, (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_error, _body, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
