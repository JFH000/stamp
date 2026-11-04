import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { LocationPermissionError, useCurrentLocation } from '@/hooks/use-current-location';
import { useCheckIn, useMyCheckIn } from '@/hooks/use-check-ins';
import { usePlan } from '@/hooks/use-plans';
import { CHECK_IN_RADIUS_M, distanceInMeters, formatDistance } from '@/lib/geo';
import { useAuth } from '@/providers/auth-provider';

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth().session?.user.id;
  const { data: plan } = usePlan(id);
  const { data: existingCheckIn } = useMyCheckIn(id);
  const location = useCurrentLocation();
  const checkIn = useCheckIn();

  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const distance =
    plan && location.data ? distanceInMeters(location.data, { latitude: plan.lat, longitude: plan.lng }) : null;
  const isNear = distance !== null && distance <= CHECK_IN_RADIUS_M;

  async function takePhoto() {
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Necesitamos la cámara para tomar la foto. Puedes darle permiso en Ajustes.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled) setPhoto(result.assets[0]);
    } catch (error) {
      setPhotoError(`No pudimos abrir la cámara: ${(error as Error).message}`);
    }
  }

  async function pickPhoto() {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        // iOS: entrega JPEG en lugar de HEIC.
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled) setPhoto(result.assets[0]);
    } catch (error) {
      setPhotoError(`No pudimos abrir la galería: ${(error as Error).message}`);
    }
  }

  function submit() {
    if (!plan || !userId || !photo || !location.data) return;
    checkIn.mutate(
      { planId: plan.id, userId, photo, coords: location.data },
      { onSuccess: () => router.back() },
    );
  }

  if (!plan) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator />
      </View>
    );
  }

  if (existingCheckIn) {
    return (
      <View className="flex-1 gap-4 bg-white px-5 pt-8 dark:bg-neutral-950">
        <Text className="text-base text-neutral-800 dark:text-neutral-200">Ya hiciste check-in en {plan.title}.</Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="gap-8 px-5 pb-12 pt-6"
      contentInsetAdjustmentBehavior="automatic">
      <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{plan.title}</Text>

      {/* 1. Ubicación */}
      <View className="gap-3">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-white">1. Tu ubicación</Text>
        {location.data && distance !== null ? (
          <>
            <Text className={`text-base ${isNear ? 'text-green-700 dark:text-green-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
              {isNear
                ? `✓ Estás a ${formatDistance(distance)} del plan.`
                : `Estás a ${formatDistance(distance)} del plan. Acércate a menos de ${CHECK_IN_RADIUS_M} m para hacer check-in.`}
            </Text>
            {location.data.accuracy !== null && location.data.accuracy > 50 ? (
              <Text className="text-sm text-neutral-500">
                La señal GPS es débil (±{Math.round(location.data.accuracy)} m). Si estás en el lugar, sal a un
                espacio abierto y actualiza.
              </Text>
            ) : null}
            <Button
              title="Actualizar ubicación"
              variant="secondary"
              onPress={() => location.refetch()}
              loading={location.isFetching}
            />
          </>
        ) : location.error ? (
          <LocationErrorView error={location.error} onRetry={() => location.refetch()} />
        ) : (
          <View className="flex-row items-center gap-3">
            <ActivityIndicator />
            <Text className="text-base text-neutral-500">Buscando tu ubicación…</Text>
          </View>
        )}
      </View>

      {/* 2. Foto */}
      <View className="gap-3">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-white">2. Tu foto</Text>
        {photo ? (
          <Image
            source={photo.uri}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16 }}
            contentFit="cover"
            accessibilityLabel="Foto del check-in"
          />
        ) : null}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button title={photo ? 'Tomar otra' : 'Tomar foto'} variant="secondary" onPress={takePhoto} />
          </View>
          <View className="flex-1">
            <Button title="Galería" variant="secondary" onPress={pickPhoto} />
          </View>
        </View>
        {photoError ? <Text className="text-sm text-red-600">{photoError}</Text> : null}
      </View>

      {/* 3. Enviar */}
      <View className="gap-3">
        <Button
          title="Hacer check-in"
          onPress={submit}
          disabled={!photo || !isNear}
          loading={checkIn.isPending}
        />
        {checkIn.error ? <Text className="text-sm text-red-600">{checkIn.error.message}</Text> : null}
      </View>
    </ScrollView>
  );
}

function LocationErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const needsSettings = error instanceof LocationPermissionError && !error.canAskAgain;

  return (
    <>
      <Text className="text-base text-neutral-800 dark:text-neutral-200">{error.message}</Text>
      {needsSettings ? (
        <Button title="Abrir Ajustes" variant="secondary" onPress={() => Linking.openSettings()} />
      ) : (
        <Button title="Permitir y reintentar" variant="secondary" onPress={onRetry} />
      )}
    </>
  );
}
