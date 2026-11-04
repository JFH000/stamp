-- =============================================================================
-- SEED DE EJEMPLO — 10 planes PLACEHOLDER
--
-- Todo lo de este archivo es provisional y está marcado así:
--   * slug con prefijo `placeholder-`
--   * descripción que empieza con `[PLACEHOLDER]`
--   * imágenes aleatorias de picsum.photos (no son fotos del lugar)
--   * coordenadas APROXIMADAS: verificarlas antes de usar el plan de verdad
--
-- Para borrar todo el seed:
--   delete from public.plans where slug like 'placeholder-%';
-- =============================================================================

insert into public.plans (slug, title, description, category, neighborhood, address, lat, lng, image_urls)
values
  ('placeholder-monserrate', 'Subir a Monserrate',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'naturaleza', 'Santa Fe', 'Cerro de Monserrate', 4.6058, -74.0556,
   array['https://picsum.photos/seed/monserrate-1/800/600', 'https://picsum.photos/seed/monserrate-2/800/600']),

  ('placeholder-museo-del-oro', 'Museo del Oro',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'cultura', 'La Candelaria', 'Cra. 6 #15-88', 4.6019, -74.0720,
   array['https://picsum.photos/seed/museo-oro-1/800/600', 'https://picsum.photos/seed/museo-oro-2/800/600']),

  ('placeholder-chorro-de-quevedo', 'Chorro de Quevedo',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'cultura', 'La Candelaria', 'Cl. 13 #2-14', 4.5975, -74.0687,
   array['https://picsum.photos/seed/chorro-1/800/600', 'https://picsum.photos/seed/chorro-2/800/600']),

  ('placeholder-paloquemao', 'Desayuno en la Plaza de Paloquemao',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'gastronomia', 'Paloquemao', 'Av. Cl. 19 #25-04', 4.6159, -74.0834,
   array['https://picsum.photos/seed/paloquemao-1/800/600', 'https://picsum.photos/seed/paloquemao-2/800/600']),

  ('placeholder-zona-g', 'Comer en la Zona G',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'gastronomia', 'Chapinero', 'Cl. 69 con Cra. 5', 4.6545, -74.0560,
   array['https://picsum.photos/seed/zona-g-1/800/600', 'https://picsum.photos/seed/zona-g-2/800/600']),

  ('placeholder-cafe-macarena', 'Café de especialidad en La Macarena',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'cafes', 'La Macarena', 'Cra. 4A con Cl. 26', 4.6127, -74.0666,
   array['https://picsum.photos/seed/macarena-1/800/600', 'https://picsum.photos/seed/macarena-2/800/600']),

  ('placeholder-jardin-botanico', 'Jardín Botánico José Celestino Mutis',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'naturaleza', 'Engativá', 'Av. Cl. 63 #68-95', 4.6683, -74.0998,
   array['https://picsum.photos/seed/botanico-1/800/600', 'https://picsum.photos/seed/botanico-2/800/600']),

  ('placeholder-quebrada-la-vieja', 'Caminar la Quebrada La Vieja',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'naturaleza', 'Chapinero Alto', 'Entrada por la Cl. 71 con Cra. 1 Este', 4.6488, -74.0489,
   array['https://picsum.photos/seed/la-vieja-1/800/600', 'https://picsum.photos/seed/la-vieja-2/800/600']),

  ('placeholder-zona-t', 'Noche en la Zona T',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'vida_nocturna', 'Zona Rosa', 'Cra. 13 con Cl. 82', 4.6668, -74.0531,
   array['https://picsum.photos/seed/zona-t-1/800/600', 'https://picsum.photos/seed/zona-t-2/800/600']),

  ('placeholder-pulgas-usaquen', 'Mercado de las Pulgas de Usaquén',
   '[PLACEHOLDER] Texto de ejemplo. Reemplazar por la descripción curada del plan.',
   'experiencias', 'Usaquén', 'Cra. 6A con Cl. 119', 4.6950, -74.0306,
   array['https://picsum.photos/seed/usaquen-1/800/600', 'https://picsum.photos/seed/usaquen-2/800/600'])
on conflict (slug) do nothing;
