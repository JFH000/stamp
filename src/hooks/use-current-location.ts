import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

export class LocationPermissionError extends Error {
  constructor(public canAskAgain: boolean) {
    super('Necesitamos tu ubicación para confirmar que estás en el plan.');
  }
}

async function getCurrentCoords() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new LocationPermissionError(permission.canAskAgain);

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error('Activa la ubicación (GPS) del teléfono y vuelve a intentar.');
  }

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

/**
 * Pide permiso y lee la ubicación actual. Nunca se sirve de caché, y se vuelve a
 * pedir al regresar a la app (p. ej. después de dar el permiso en Ajustes).
 */
export function useCurrentLocation() {
  return useQuery({
    queryKey: ['current-location'],
    queryFn: getCurrentCoords,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
