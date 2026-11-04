import type { PostgrestError } from '@supabase/supabase-js';
import type { ImagePickerAsset } from 'expo-image-picker';

import { CHECK_IN_RADIUS_M, type Coords } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

export const CHECK_IN_PHOTOS_BUCKET = 'check-in-photos';

type CheckInInput = {
  planId: string;
  userId: string;
  photo: ImagePickerAsset;
  coords: Coords;
};

/**
 * 1. Sube la foto a check-in-photos/<user_id>/...
 * 2. Llama a la RPC check_in, que valida la distancia en el servidor.
 * Si la RPC falla, borra la foto para no dejar archivos huérfanos.
 */
export async function submitCheckIn({ planId, userId, photo, coords }: CheckInInput) {
  const contentType = photo.mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${planId}-${Date.now()}.${extension}`;

  const file = await fetch(photo.uri).then((response) => response.arrayBuffer());
  const upload = await supabase.storage.from(CHECK_IN_PHOTOS_BUCKET).upload(path, file, { contentType });
  if (upload.error) throw new Error(`No pudimos subir la foto: ${upload.error.message}`);

  const { data, error } = await supabase.rpc('check_in', {
    plan_id: planId,
    lat: coords.latitude,
    lng: coords.longitude,
    photo_path: path,
  });

  if (error) {
    await supabase.storage.from(CHECK_IN_PHOTOS_BUCKET).remove([path]);
    throw new Error(checkInErrorMessage(error));
  }

  return data;
}

/** Traduce los códigos de error de la RPC check_in a mensajes para el usuario. */
function checkInErrorMessage(error: PostgrestError) {
  switch (error.message) {
    case 'too_far': {
      const meters = Number(error.details?.match(/distance_m=(\d+)/)?.[1]);
      const distance = Number.isFinite(meters) ? `${meters} m` : 'demasiado lejos';
      return `Estás a ${distance} del plan. Acércate a menos de ${CHECK_IN_RADIUS_M} m.`;
    }
    case 'already_checked_in':
      return 'Ya hiciste check-in en este plan.';
    case 'invalid_photo':
      return 'No pudimos verificar la foto. Intenta de nuevo.';
    case 'plan_not_found':
      return 'Este plan ya no existe.';
    case 'invalid_location':
      return 'Tu ubicación no es válida. Actualízala e intenta de nuevo.';
    case 'not_authenticated':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    default:
      return `No pudimos hacer el check-in: ${error.message}`;
  }
}
