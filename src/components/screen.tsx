import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{ title?: string }>;

/** Contenedor base de pantalla: fondo, márgenes y título grande. */
export function Screen({ title, children }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white px-5 dark:bg-neutral-950" style={{ paddingTop: insets.top + 16 }}>
      {title ? (
        <Text className="mb-4 text-3xl font-bold text-neutral-900 dark:text-white">{title}</Text>
      ) : null}
      {children}
    </View>
  );
}
