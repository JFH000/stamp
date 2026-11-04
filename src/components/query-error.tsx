import { Text, View } from 'react-native';

import { Button } from '@/components/button';

/** Estado de error de una carga, con botón para reintentar. */
export function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="gap-4 py-8">
      <Text className="text-base text-red-600">{message}</Text>
      <Button title="Reintentar" variant="secondary" onPress={onRetry} />
    </View>
  );
}
