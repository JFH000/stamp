import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export function profileQueryKey(userId: string | undefined) {
  return ['profile', userId] as const;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export type Profile = Awaited<ReturnType<typeof fetchProfile>>;

export function useProfile() {
  const userId = useAuth().session?.user.id;

  return useQuery({
    queryKey: profileQueryKey(userId),
    enabled: !!userId,
    queryFn: () => fetchProfile(userId!),
  });
}
