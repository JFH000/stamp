import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

/**
 * URL a la que vuelve el usuario tras el magic link u OAuth.
 * Dev build: stamp://auth/callback · Expo Go: exp://<ip>:8081/--/auth/callback
 * Debe estar en Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export const authRedirectUrl = Linking.createURL('auth/callback');

export const isGoogleAuthEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: authRedirectUrl },
  });
  if (error) throw error;
}

type CallbackParams = { code?: unknown; error_description?: unknown };

/** Canjea el `?code=` de la URL de retorno (magic link u OAuth) por una sesión. */
export async function completeSignIn({ code, error_description }: CallbackParams) {
  if (typeof error_description === 'string') throw new Error(error_description);
  if (typeof code !== 'string') throw new Error('El enlace no es válido o ya se usó.');

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

/** Opcional: requiere el proveedor Google activo en Supabase y EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true. */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);
  if (result.type !== 'success') return; // el usuario cerró el navegador

  await completeSignIn(Linking.parse(result.url).queryParams ?? {});
}

export async function signOut() {
  await supabase.auth.signOut();
  queryClient.clear();
}
