import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Text, useWindowDimensions, View } from 'react-native';

/** Galería horizontal a todo el ancho, con contador "1/3". */
export function ImageCarousel({ urls }: { urls: string[] }) {
  const { width } = useWindowDimensions();
  const height = Math.round(width * 0.66);
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return <View style={{ width, height }} className="bg-neutral-200 dark:bg-neutral-800" />;
  }

  return (
    <View>
      <FlatList
        data={urls}
        keyExtractor={(url) => url}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Image source={item} style={{ width, height }} contentFit="cover" transition={200} />
        )}
      />
      {urls.length > 1 ? (
        <View className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1">
          <Text className="text-xs font-medium text-white">
            {index + 1}/{urls.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
