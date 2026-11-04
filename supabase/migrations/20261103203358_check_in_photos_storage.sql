-- =============================================================================
-- Bucket privado `check-in-photos`.
-- Ruta obligatoria: <user_id>/<archivo>. Cada usuario solo lee y escribe en su
-- propia carpeta; la app muestra las fotos con URLs firmadas (createSignedUrl).
-- Insert + select + update permiten también el upsert de archivos.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'check-in-photos',
  'check-in-photos',
  false,
  10 * 1024 * 1024, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "check-in photos: users read their own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'check-in-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "check-in photos: users upload to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'check-in-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "check-in photos: users update their own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'check-in-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'check-in-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "check-in photos: users delete their own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'check-in-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
