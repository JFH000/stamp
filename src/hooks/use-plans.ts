import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// `location` (geography) se omite: el cliente usa lat/lng.
const PLAN_COLUMNS =
  'id, slug, title, description, category, neighborhood, address, lat, lng, image_urls, rating_avg, rating_count';

async function fetchPlans() {
  const { data, error } = await supabase.from('plans').select(PLAN_COLUMNS).order('title');
  if (error) throw error;
  return data;
}

export type Plan = Awaited<ReturnType<typeof fetchPlans>>[number];

/** Clave del catálogo. Invalidarla cuando cambie el rating de un plan. */
export const plansQueryKey = ['plans'] as const;

/** Catálogo completo (~100 planes): se pide una vez y lo comparten lista, mapa y detalle. */
export function usePlans() {
  return useQuery({ queryKey: plansQueryKey, queryFn: fetchPlans });
}

/** Un plan del catálogo en caché. `null` si no existe. */
export function usePlan(id: string) {
  return useQuery({
    queryKey: plansQueryKey,
    queryFn: fetchPlans,
    select: (plans) => plans.find((plan) => plan.id === id) ?? null,
  });
}
