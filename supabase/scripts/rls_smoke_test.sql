-- Smoke test de RLS, RPC check_in y triggers. Ejecutarlo con el MCP (execute_sql) o pegarlo en el SQL Editor.
-- Termina SIEMPRE con un error 'TEST RESULTS: ...' a propósito: así todo se revierte y no deja datos.
-- Requiere el seed (usa el plan placeholder-museo-del-oro). Cualquier 'ALLOWED(BAD)' es un fallo.
do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';
  b uuid := '00000000-0000-4000-8000-00000000000b';
  v_plan uuid;
  ci public.check_ins;
  r record;
  n int;
  d text;
  res text := '';
begin
  -- Setup (como postgres)
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (a, 'ana@test.local', '{}'::jsonb, 'authenticated', 'authenticated'),
         (b, 'beto@test.local', '{"full_name":"Beto Google"}'::jsonb, 'authenticated', 'authenticated');
  select string_agg(display_name, ',' order by display_name) into d from public.profiles where id in (a, b);
  res := 'profiles=' || d;

  select id into v_plan from public.plans where slug = 'placeholder-museo-del-oro';
  select count(*) into n from public.plans;
  res := res || ' | plans=' || n;
  insert into storage.objects (bucket_id, name, owner_id)
  values ('check-in-photos', a::text || '/t.jpg', a::text), ('check-in-photos', b::text || '/t.jpg', b::text);

  -- ===== Usuario A =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.check_ins (user_id, plan_id, photo_path, location, distance_m) values (a, v_plan, 'x', null, 0);
    res := res || ' | A_direct_insert=ALLOWED(BAD)';
  exception when others then res := res || ' | A_direct_insert=' || sqlerrm; end;

  begin
    insert into public.ratings (plan_id, score) values (v_plan, 8);
    res := res || ' | A_rate_before_checkin=ALLOWED(BAD)';
  exception when others then res := res || ' | A_rate_before_checkin=' || sqlerrm; end;

  begin
    insert into public.comments (plan_id, body) values (v_plan, 'antes');
    res := res || ' | A_comment_before_checkin=ALLOWED(BAD)';
  exception when others then res := res || ' | A_comment_before_checkin=' || sqlerrm; end;

  begin
    perform public.check_in(v_plan, 4.6500, -74.0600, a::text || '/t.jpg');
    res := res || ' | A_far=ALLOWED(BAD)';
  exception when others then
    get stacked diagnostics d = pg_exception_detail;
    res := res || ' | A_far=' || sqlerrm || ' (' || d || ')';
  end;

  begin
    perform public.check_in(v_plan, 4.6020, -74.0721, b::text || '/t.jpg');
    res := res || ' | A_photo_of_B=ALLOWED(BAD)';
  exception when others then res := res || ' | A_photo_of_B=' || sqlerrm; end;

  begin
    perform public.check_in(v_plan, 4.6020, -74.0721, a::text || '/missing.jpg');
    res := res || ' | A_missing_photo=ALLOWED(BAD)';
  exception when others then res := res || ' | A_missing_photo=' || sqlerrm; end;

  begin
    perform public.check_in(gen_random_uuid(), 4.6020, -74.0721, a::text || '/t.jpg');
    res := res || ' | A_bad_plan=ALLOWED(BAD)';
  exception when others then res := res || ' | A_bad_plan=' || sqlerrm; end;

  begin
    select * into ci from public.check_in(v_plan, 4.6020, -74.0721, a::text || '/t.jpg');
    res := res || ' | A_near=OK dist_m=' || round(ci.distance_m);
  exception when others then res := res || ' | A_near=FAIL ' || sqlerrm; end;

  begin
    perform public.check_in(v_plan, 4.6020, -74.0721, a::text || '/t.jpg');
    res := res || ' | A_again=ALLOWED(BAD)';
  exception when others then res := res || ' | A_again=' || sqlerrm; end;

  insert into public.ratings (plan_id, score) values (v_plan, 8);
  select rating_avg, rating_count into r from public.plans where id = v_plan;
  res := res || format(' | A_rated8 avg=%s count=%s', r.rating_avg, r.rating_count);

  insert into public.ratings (plan_id, score) values (v_plan, 5)
  on conflict (user_id, plan_id) do update set score = excluded.score;
  select rating_avg, rating_count into r from public.plans where id = v_plan;
  res := res || format(' | A_upsert5 avg=%s count=%s', r.rating_avg, r.rating_count);

  insert into public.comments (plan_id, body) values (v_plan, 'Muy bueno');
  res := res || ' | A_comment=OK';

  update public.profiles set display_name = 'Ana' where id = a;
  get diagnostics n = row_count;
  res := res || ' | A_update_own_profile_rows=' || n;

  update public.profiles set display_name = 'hack' where id = b;
  get diagnostics n = row_count;
  res := res || ' | A_update_B_profile_rows=' || n;

  begin
    update public.plans set title = 'hack' where id = v_plan;
    res := res || ' | A_update_plan=ALLOWED(BAD)';
  exception when others then res := res || ' | A_update_plan=' || sqlerrm; end;

  select count(*) into n from public.check_ins;
  res := res || ' | A_sees_checkins=' || n;
  select count(*) into n from storage.objects where bucket_id = 'check-in-photos';
  res := res || ' | A_sees_objects=' || n;

  begin
    perform private.sync_plan_rating();
    res := res || ' | A_call_private_trigger_fn=ALLOWED(BAD)';
  exception when others then res := res || ' | A_call_private_trigger_fn=' || sqlerrm; end;

  -- ===== Usuario B (sin check-in) =====
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.check_ins;
  res := res || ' | B_sees_checkins=' || n;
  select count(*) into n from public.ratings;
  res := res || ' | B_sees_ratings=' || n;
  select count(*) into n from public.comments;
  res := res || ' | B_sees_comments=' || n;
  select count(*) into n from public.profiles;
  res := res || ' | B_sees_profiles=' || n;
  select count(*) into n from storage.objects where bucket_id = 'check-in-photos';
  res := res || ' | B_sees_objects=' || n;

  begin
    insert into public.comments (plan_id, body) values (v_plan, 'spam');
    res := res || ' | B_comment_no_checkin=ALLOWED(BAD)';
  exception when others then res := res || ' | B_comment_no_checkin=' || sqlerrm; end;

  update public.ratings set score = 1 where user_id = a;
  get diagnostics n = row_count;
  res := res || ' | B_update_A_rating_rows=' || n;

  delete from public.comments where user_id = a;
  get diagnostics n = row_count;
  res := res || ' | B_delete_A_comment_rows=' || n;

  -- ===== anon =====
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  begin
    select count(*) into n from public.plans;
    res := res || ' | anon_read_plans=ALLOWED(BAD)';
  exception when others then res := res || ' | anon_read_plans=' || sqlerrm; end;

  begin
    perform public.check_in(v_plan, 4.6020, -74.0721, 'x/t.jpg');
    res := res || ' | anon_check_in=ALLOWED(BAD)';
  exception when others then res := res || ' | anon_check_in=' || sqlerrm; end;

  reset role;
  raise exception 'TEST RESULTS: %', res;
end $$;
