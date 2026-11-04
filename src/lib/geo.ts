export type Coords = { latitude: number; longitude: number };

/** Radio máximo para hacer check-in. Debe coincidir con `max_distance_m` en la RPC private.check_in. */
export const CHECK_IN_RADIUS_M = 150;

/** Distancia aproximada en metros (haversine). Solo para la UI: la validación real la hace el servidor. */
export function distanceInMeters(a: Coords, b: Coords) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

/** "45 m" o "3,2 km" */
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;
}
