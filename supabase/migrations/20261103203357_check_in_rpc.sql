-- =============================================================================
-- RPC check_in(plan_id, lat, lng, photo_path)
--
-- Única forma de crear un check-in: el rol authenticated no tiene INSERT sobre
-- public.check_ins. Valida en el servidor que el usuario esté a <= 150 m del plan.
--
-- Errores (campo `message` en la respuesta de supabase-js):
--   not_authenticated   sin sesión
--   invalid_location    lat/lng fuera de rango
--   plan_not_found      el plan no existe
--   too_far             a más de 150 m (detail: "distance_m=<metros>")
--   invalid_photo       la foto no está en el bucket o no es de la carpeta del usuario
--   already_checked_in  ya hay un check-in de este usuario en este plan
--
-- La lógica vive en `private` (security definer, no expuesto en la API) y
-- `public.check_in` es un wrapper invoker que sí se expone.
-- =============================================================================

create function private.check_in(
  p_plan_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_photo_path text
)
returns public.check_ins
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_distance_m constant double precision := 150;
  v_user_id uuid := auth.uid();
  v_plan_location extensions.geography;
  v_user_location extensions.geography;
  v_distance_m double precision;
  v_check_in public.check_ins;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;

  select p.location into v_plan_location
  from public.plans p
  where p.id = p_plan_id;

  if not found then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;

  v_user_location := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_distance_m := extensions.st_distance(v_user_location, v_plan_location);

  if not extensions.st_dwithin(v_user_location, v_plan_location, max_distance_m) then
    raise exception 'too_far'
      using errcode = 'P0001', detail = format('distance_m=%s', round(v_distance_m));
  end if;

  -- La foto ya debe estar subida al bucket, dentro de la carpeta del usuario.
  if (storage.foldername(p_photo_path))[1] is distinct from v_user_id::text
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'check-in-photos' and o.name = p_photo_path
     ) then
    raise exception 'invalid_photo' using errcode = '22023';
  end if;

  insert into public.check_ins (user_id, plan_id, photo_path, location, distance_m)
  values (v_user_id, p_plan_id, p_photo_path, v_user_location, v_distance_m)
  on conflict (user_id, plan_id) do nothing
  returning * into v_check_in;

  if not found then
    raise exception 'already_checked_in' using errcode = '23505';
  end if;

  return v_check_in;
end;
$$;

create function public.check_in(
  plan_id uuid,
  lat double precision,
  lng double precision,
  photo_path text
)
returns public.check_ins
language sql
set search_path = ''
as $$
  select * from private.check_in(check_in.plan_id, check_in.lat, check_in.lng, check_in.photo_path);
$$;

-- Solo usuarios con sesión pueden llamarla.
revoke execute on function private.check_in(uuid, double precision, double precision, text) from public;
revoke execute on function public.check_in(uuid, double precision, double precision, text) from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.check_in(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.check_in(uuid, double precision, double precision, text) to authenticated;
