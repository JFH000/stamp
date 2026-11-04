import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env y reinicia `npx expo start`.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // La sesión se guarda en el dispositivo (expo-sqlite) y sobrevive reinicios.
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En móvil no hay URL de la que leer la sesión: los deep links se manejan a mano.
    detectSessionInUrl: false,
    // PKCE: el magic link vuelve a la app con `?code=`, que se canjea por la sesión.
    flowType: 'pkce',
  },
});

// Refresca el token solo con la app en primer plano.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
