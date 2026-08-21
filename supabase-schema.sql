-- ============================================================
-- Ankieta G4 - schemat Supabase
-- Uruchom to w: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- TABELE
create table if not exists g4_codes (
  code text primary key,
  used boolean not null default false,
  decision text not null default 'waiting' check (decision in ('waiting','qualified','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists g4_questions (
  id text primary key,
  order_num int not null default 0,
  text text not null,
  type text not null check (type in ('yesno','scale','choice','text')),
  options jsonb,
  min int,
  max int
);

create table if not exists g4_answers (
  id uuid primary key default gen_random_uuid(),
  code text not null references g4_codes(code),
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

-- RLS
alter table g4_codes enable row level security;
alter table g4_questions enable row level security;
alter table g4_answers enable row level security;

-- Pytania moze czytac kazdy (potrzebne na survey.html bez logowania)
create policy "public read questions" on g4_questions
  for select using (true);

-- Kody i odpowiedzi widzi/edytuje tylko zalogowany admin (Supabase Auth)
create policy "admin full codes" on g4_codes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full questions" on g4_questions for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full answers" on g4_answers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Zwykli uzytkownicy (anon) NIE maja bezposredniego dostepu do g4_codes / g4_answers.
-- Cala komunikacja idzie przez ponizsze funkcje RPC (security definer),
-- zeby nikt z konsoli przegladarki nie mogl sobie sam ustawic "qualified".

-- Sprawdzenie czy kod jest wazny
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
  else
    return jsonb_build_object('valid', true);
  end if;
end;
$$;

-- Status zgloszenia (do status.html)
create or replace function get_status(code_val text)
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
    return null;
  end if;
  return jsonb_build_object('decision', rec.decision);
end;
$$;

-- Wyslanie odpowiedzi (atomowo: zapis + oznaczenie kodu jako uzyty)
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
  end if;

  insert into g4_answers (code, answers) values (code_val, answers_val);
  update g4_codes set used = true where code = code_val;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function check_code(text) to anon, authenticated;
grant execute on function get_status(text) to anon, authenticated;
grant execute on function submit_answers(text, jsonb) to anon, authenticated;

-- Generowanie nowego kodu (tylko admin)
create or replace function admin_generate_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'not authorized';
  end if;
  loop
    new_code := lpad(floor(random() * 1000000)::text, 6, '0');
    exit when not exists (select 1 from g4_codes where code = new_code);
  end loop;
  insert into g4_codes (code) values (new_code);
  return new_code;
end;
$$;

grant execute on function admin_generate_code() to authenticated;

-- Przykladowe pytania - edytuj dowolnie w Table Editor (tabela g4_questions)
insert into g4_questions (id, order_num, text, type, options, min, max) values
  ('q1', 1, 'Jak dobrze znasz reszte grupy?', 'scale', null, 1, 10),
  ('q2', 2, 'Czy byles/as juz na naszym spotkaniu?', 'yesno', null, null, null),
  ('q3', 3, 'Co Cie najbardziej przyciaga do dolaczenia?', 'text', null, null, null)
on conflict (id) do nothing;
