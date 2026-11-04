import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CHECK_IN_PHOTOS_BUCKET, submitCheckIn } from '@/lib/check-in';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const checkInsQueryKey = ['check-ins'] as const;

async function fetchMyCheckIns() {
  // RLS solo devuelve los check-ins del usuario actual.
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, plan_id, photo_path, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Check-ins del usuario actual (máximo uno por plan). */
export function useMyCheckIns() {
  const userId = useAuth().session?.user.id;
  return useQuery({
    queryKey: [...checkInsQueryKey, userId],
    queryFn: fetchMyCheckIns,
    enabled: !!userId,
  });
}

/** El check-in del usuario en un plan, o `null` si aún no ha ido. */
export function useMyCheckIn(planId: string) {
  const userId = useAuth().session?.user.id;
  return useQuery({
    queryKey: [...checkInsQueryKey, userId],
    queryFn: fetchMyCheckIns,
    enabled: !!userId,
    select: (checkIns) => checkIns.find((checkIn) => checkIn.plan_id === planId) ?? null,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitCheckIn,
    // Espera a refrescar la lista para que el detalle ya muestre "Ya fuiste".
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checkInsQueryKey }),
  });
}

/** URLs firmadas (1 h) de fotos del bucket privado, indexadas por ruta. */
export function useCheckInPhotoUrls(paths: string[]) {
  return useQuery({
    queryKey: ['check-in-photo-urls', paths],
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(CHECK_IN_PHOTOS_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const item of data) {
        if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
      }
      return urls;
    },
  });
}
