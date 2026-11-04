import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { completeSignIn } from '@/lib/auth';

/**
 * Pantalla a la que llega el magic link: stamp://auth/callback?code=...
 * Al canjear el código hay sesión, el guard de esta ruta pasa a false y el
 * router lleva automáticamente a las tabs.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // El código solo se puede canjear una vez.
    if (started.current) return;
    started.current = true;
    completeSignIn(params).catch((e: Error) => setError(e.message));
  }, [params]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-neutral-950">
      {error ? (
        <>
          <Text className="text-center text-base text-neutral-800 dark:text-neutral-200">
            No pudimos iniciar sesión: {error}
          </Text>
          <Button title="Volver" onPress={() => router.replace('/sign-in')} />
        </>
      ) : (
        <ActivityIndicator size="large" />
      )}
    </View>
  );
}
