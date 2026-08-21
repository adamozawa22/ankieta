-- Wklej TYLKO to w SQL Editor i kliknij Run.
-- (Podmienia 2 istniejace funkcje i dodaje 1 nowa - bezpieczne, "already exists" tu nie wystapi)

create or replace function check_code(code_val text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec g4_codes%rowtype;
begin
  select * into rec from g4_codes where code = code_val;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  elsif rec.used then
    return jsonb_build_object('valid', false, 'reason', 'used');
  elsif rec.created_at < now() - interval '5 days' then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  else
    return jsonb_build_object('valid', true);
  end if;
end;
$$;

create or replace function submit_answers(code_val text, answers_val jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec g4_codes%rowtype;
begin
  select * into rec from g4_codes where code = code_val for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Nieprawidlowy kod.');
  elsif rec.used then
    return jsonb_build_object('success', false, 'error', 'Ten kod zostal juz wykorzystany.');
  elsif rec.created_at < now() - interval '5 days' then
    return jsonb_build_object('success', false, 'error', 'Ten kod wygasl. Popros o nowy kod dostepu.');
  end if;

  insert into g4_answers (code, answers) values (code_val, answers_val);
  update g4_codes set used = true where code = code_val;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function admin_delete_expired_codes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'not authorized';
  end if;
  delete from g4_codes where used = false and created_at < now() - interval '5 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function admin_delete_expired_codes() to authenticated;
