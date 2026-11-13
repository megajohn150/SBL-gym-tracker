-- Tracker: tabele dla części społecznościowej.
-- Wklej całość w Supabase → SQL Editor → Run. Można puścić drugi raz,
-- każdy obiekt jest tworzony warunkowo.

-- ------------------------------------------------------------------
-- 1. Profil publiczny. Username jest unikalny i widoczny dla każdego
--    zalogowanego — po nim działa wyszukiwarka znajomych.
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  username   text unique not null,
  name       text not null default '',
  bio        text not null default '',
  pic        text,
  stats      jsonb not null default '{}'::jsonb,   -- workouts, streak, since
  updated_at timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles (username);
alter table public.profiles enable row level security;

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select to authenticated using (true);
create policy "profiles insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles update" on public.profiles for update to authenticated using (auth.uid() = user_id)
                                                               with check (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- 2. Obserwacje. Znajomość = obie strony obserwują się nawzajem.
-- ------------------------------------------------------------------
create table if not exists public.follows (
  follower   uuid references auth.users on delete cascade,
  followee   uuid references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee)
);
create index if not exists follows_followee_idx on public.follows (followee);
alter table public.follows enable row level security;

drop policy if exists "follows read"   on public.follows;
drop policy if exists "follows insert" on public.follows;
drop policy if exists "follows delete" on public.follows;
create policy "follows read"   on public.follows for select to authenticated using (true);
create policy "follows insert" on public.follows for insert to authenticated with check (auth.uid() = follower);
create policy "follows delete" on public.follows for delete to authenticated using (auth.uid() = follower);
-- Followers można też odpiąć od siebie: usuwa wiersz ten, kogo obserwują.
drop policy if exists "follows kick" on public.follows;
create policy "follows kick" on public.follows for delete to authenticated using (auth.uid() = followee);


-- wzajemność w jednym miejscu, żeby polityki niżej się nie powtarzały
create or replace function public.friends_with(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.follows where follower = auth.uid() and followee = other)
     and exists (select 1 from public.follows where follower = other and followee = auth.uid());
$$;

-- ------------------------------------------------------------------
-- 3. Opublikowane treningi. Kopia treningu wędruje tu przy zakończeniu
--    sesji, chyba że trening jest prywatny. Czyta właściciel i znajomi.
-- ------------------------------------------------------------------
create table if not exists public.posts (
  user_id    uuid references auth.users on delete cascade,
  id         text not null,                     -- id treningu z aplikacji
  date       timestamptz not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists posts_date_idx on public.posts (date desc);
alter table public.posts enable row level security;

drop policy if exists "posts read"  on public.posts;
drop policy if exists "posts write" on public.posts;
drop policy if exists "posts edit"  on public.posts;
drop policy if exists "posts drop"  on public.posts;
create policy "posts read"  on public.posts for select to authenticated
  using (auth.uid() = user_id or public.friends_with(user_id));
create policy "posts write" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts edit"  on public.posts for update to authenticated using (auth.uid() = user_id)
                                                          with check (auth.uid() = user_id);
create policy "posts drop"  on public.posts for delete to authenticated using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- 4. Biblioteka: rutyny i ćwiczenia do kopiowania przez znajomych.
-- ------------------------------------------------------------------
create table if not exists public.library (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,   -- { routines: [], exercises: [] }
  updated_at timestamptz not null default now()
);
alter table public.library enable row level security;

drop policy if exists "library read"  on public.library;
drop policy if exists "library write" on public.library;
drop policy if exists "library edit"  on public.library;
create policy "library read"  on public.library for select to authenticated
  using (auth.uid() = user_id or public.friends_with(user_id));
create policy "library write" on public.library for insert to authenticated with check (auth.uid() = user_id);
create policy "library edit"  on public.library for update to authenticated using (auth.uid() = user_id)
                                                            with check (auth.uid() = user_id);

-- Nazwa musi zaczynać się i kończyć literą lub cyfrą, 3-20 znaków — żeby nie
-- dało się zająć nicka typu "..." albo "__". Aplikacja pilnuje tego samego.
do $$ begin
  alter table public.profiles add constraint username_shape
    check (username ~ '^[a-z0-9][a-z0-9_.]{1,18}[a-z0-9]$');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------
-- 5. Lajki. Jeden wiersz = jedna osoba pod jednym treningiem.
--    Widzi je ten, kto widzi sam trening; stawia tylko znajomy.
-- ------------------------------------------------------------------
create table if not exists public.likes (
  post_user  uuid not null,
  post_id    text not null,
  liker      uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_user, post_id, liker),
  foreign key (post_user, post_id) references public.posts (user_id, id) on delete cascade
);
create index if not exists likes_post_idx on public.likes (post_user, post_id);
alter table public.likes enable row level security;

drop policy if exists "likes read"  on public.likes;
drop policy if exists "likes write" on public.likes;
drop policy if exists "likes drop"  on public.likes;
create policy "likes read"  on public.likes for select to authenticated
  using (auth.uid() = post_user or public.friends_with(post_user));
create policy "likes write" on public.likes for insert to authenticated
  with check (auth.uid() = liker and (auth.uid() = post_user or public.friends_with(post_user)));
create policy "likes drop"  on public.likes for delete to authenticated using (auth.uid() = liker);

-- ------------------------------------------------------------------
-- 6. Komentarze. parent to komentarz, pod który poszła odpowiedź;
--    parent_author trzymamy osobno, żeby powiadomienie o odpowiedzi
--    dało się wyciągnąć jednym zapytaniem, bez złączeń.
-- ------------------------------------------------------------------
create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  post_user     uuid not null,
  post_id       text not null,
  author        uuid not null references auth.users on delete cascade,
  parent        uuid references public.comments (id) on delete cascade,
  parent_author uuid,
  body          text not null check (char_length(body) between 1 and 500),
  created_at    timestamptz not null default now(),
  foreign key (post_user, post_id) references public.posts (user_id, id) on delete cascade
);
create index if not exists comments_post_idx on public.comments (post_user, post_id, created_at);
create index if not exists comments_parent_author_idx on public.comments (parent_author, created_at desc);
alter table public.comments enable row level security;

drop policy if exists "comments read"  on public.comments;
drop policy if exists "comments write" on public.comments;
drop policy if exists "comments drop"  on public.comments;
create policy "comments read"  on public.comments for select to authenticated
  using (auth.uid() = post_user or public.friends_with(post_user) or auth.uid() = parent_author);
create policy "comments write" on public.comments for insert to authenticated
  with check (auth.uid() = author and (auth.uid() = post_user or public.friends_with(post_user)));
-- komentarz kasuje wyłącznie jego autor
create policy "comments drop"  on public.comments for delete to authenticated
  using (auth.uid() = author);

-- nikt nie obserwuje samego siebie
do $$ begin
  alter table public.follows add constraint follows_not_self check (follower <> followee);
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------
-- 7. Prywatny trening zostaje w chmurze, tylko znajomi go nie widzą.
--    Dzięki temu lajki i komentarze przeżywają przełączenie tam i z
--    powrotem — wcześniej wiersz znikał i kaskada je zabierała.
-- ------------------------------------------------------------------
alter table public.posts add column if not exists private boolean not null default false;

drop policy if exists "posts read" on public.posts;
create policy "posts read" on public.posts for select to authenticated
  using (auth.uid() = user_id or (not private and public.friends_with(user_id)));

-- Reakcje widzi ten, kto widzi sam trening — prywatny odcina też je.
create or replace function public.can_see_post(pu uuid, pid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p
    where p.user_id = pu and p.id = pid
      and (auth.uid() = p.user_id or (not p.private and public.friends_with(p.user_id)))
  );
$$;

drop policy if exists "likes read"  on public.likes;
drop policy if exists "likes write" on public.likes;
create policy "likes read"  on public.likes for select to authenticated
  using (public.can_see_post(post_user, post_id));
create policy "likes write" on public.likes for insert to authenticated
  with check (auth.uid() = liker and public.can_see_post(post_user, post_id));

drop policy if exists "comments read"  on public.comments;
drop policy if exists "comments write" on public.comments;
create policy "comments read"  on public.comments for select to authenticated
  using (public.can_see_post(post_user, post_id) or auth.uid() = parent_author);
create policy "comments write" on public.comments for insert to authenticated
  with check (auth.uid() = author and public.can_see_post(post_user, post_id));

-- ------------------------------------------------------------------
-- 8. Powiadomienia push. Przeglądarka oddaje subskrypcję, baza woła
--    Edge Function "notify", ta wysyła powiadomienie na każde
--    urządzenie odbiorcy.
--
--    Zanim to zadziała:
--      1. npx web-push generate-vapid-keys
--      2. klucz publiczny wklej do VAPID_PUBLIC w public/index.html
--      3. supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... \
--           PUSH_SECRET=<długi losowy ciąg>
--      4. supabase functions deploy notify --no-verify-jwt
--      5. w zapytaniu niżej podmień <PUSH_SECRET> — w edytorze SQL,
--         nie w tym pliku, żeby sekret nie trafił do repozytorium
-- ------------------------------------------------------------------
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
-- co to urządzenie chce dostawać: klucz = rodzaj pusha, false = wyłączony, brak klucza = włączony
alter table public.push_subs add column if not exists prefs jsonb not null default '{}'::jsonb;
create index if not exists push_subs_user_idx on public.push_subs (user_id);
alter table public.push_subs enable row level security;

drop policy if exists "subs own" on public.push_subs;
create policy "subs own" on public.push_subs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create extension if not exists pg_net with schema extensions;

-- Jedna wysyłka. Odpala się tylko z triggera albo z crona, więc
-- użytkownik nie może nią wysłać powiadomienia komu chce.
create or replace function public.push_send(
  kind text, target uuid, actor uuid, pu uuid, pi text
) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if target is null then return; end if;
  if actor is not null and target = actor then return; end if;

  perform net.http_post(
    url := 'https://nzagghskfwdosmopiuuk.functions.supabase.co/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', '<PUSH_SECRET>'
    ),
    body := jsonb_build_object('kind', kind, 'target', target, 'actor', actor,
                               'post_user', pu, 'post_id', pi)
  );
end $$;
revoke execute on function public.push_send(text, uuid, uuid, uuid, text)
  from public, anon, authenticated;

create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  t record;
begin
  if tg_table_name = 'likes' then
    perform public.push_send('like', new.post_user, new.liker,
                             new.post_user, new.post_id);
    perform public.live_react(new.post_user, new.liker);

  elsif tg_table_name = 'comments' then
    -- właściciel treningu, chyba że to on odpisał albo odpowiedź leci do niego
    if new.parent_author is distinct from new.post_user then
      perform public.push_send('comment', new.post_user, new.author,
                               new.post_user, new.post_id);
    end if;
    -- komentarz, na który ktoś odpowiedział
    if new.parent_author is not null then
      perform public.push_send('reply', new.parent_author, new.author,
                               new.post_user, new.post_id);
    end if;
    -- i każdy, kto już jest w tym wątku — po jednym powiadomieniu
    for t in
      select distinct c.author from public.comments c
      where c.post_user = new.post_user
        and c.post_id = new.post_id
        and c.author <> new.author
        and c.author <> new.post_user
        and (new.parent_author is null or c.author <> new.parent_author)
    loop
      perform public.push_send('thread', t.author, new.author,
                               new.post_user, new.post_id);
    end loop;
    perform public.live_react(new.post_user, new.author);

  else
    perform public.push_send('follow', new.followee, new.follower, null, null);
    perform public.live_ping(new.followee, null, 'foll');
    perform public.live_ping(new.follower, null, 'foll');   -- i jego inne urządzenia
  end if;
  return new;
end $$;

drop trigger if exists push_on_like    on public.likes;
drop trigger if exists push_on_comment on public.comments;
drop trigger if exists push_on_follow  on public.follows;
create trigger push_on_like    after insert on public.likes
  for each row execute function public.notify_push();
create trigger push_on_comment after insert on public.comments
  for each row execute function public.notify_push();
create trigger push_on_follow  after insert on public.follows
  for each row execute function public.notify_push();

-- ------------------------------------------------------------------
-- 9. Terminy, o które aplikacja prosi sama siebie: koniec przerwy
--    między seriami i trening zostawiony w tle. Śpiący telefon
--    zatrzymuje każdy licznik w stronie, więc termin leży tutaj,
--    a push przychodzi z bazy. Jeden wiersz na rodzaj — nowa
--    przerwa zastępuje poprzednią.
--
--    Potrzebny jest pg_cron (Database → Extensions w panelu).
-- ------------------------------------------------------------------
create table if not exists public.push_jobs (
  user_id uuid not null references auth.users on delete cascade,
  kind    text not null check (kind in ('rest', 'stale')),
  due_at  timestamptz not null,
  primary key (user_id, kind)
);
create index if not exists push_jobs_due_idx on public.push_jobs (due_at);
alter table public.push_jobs enable row level security;

drop policy if exists "jobs own" on public.push_jobs;
create policy "jobs own" on public.push_jobs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Wysyła i od razu usuwa — każdy termin odzywa się raz.
create or replace function public.drain_push_jobs() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  j record;
begin
  for j in delete from public.push_jobs where due_at <= now() returning * loop
    perform public.push_send(j.kind, j.user_id, null, null, null);
  end loop;
end $$;
revoke execute on function public.drain_push_jobs() from public, anon, authenticated;

-- pg_cron włącza się w panelu: Database -> Extensions. Zadanie o tej
-- samej nazwie jest nadpisywane, więc to można puścić ponownie.
select cron.schedule('drain-push', '10 seconds', $$select public.drain_push_jobs()$$);

-- ------------------------------------------------------------------
-- 10. Na żywo. Ta sama nowina co push, tyle że do aplikacji, która
--     jest właśnie otwarta. Każdy ma swój prywatny kanał "u:<id>", a
--     baza wrzuca do niego goły ping: jedna litera mówiąca, czego
--     dotyczy. Treści w nim nie ma żadnej — aplikacja po pingu sięga
--     po swoje zwykłe zapytania, więc to RLS, a nie kanał, decyduje
--     co kto zobaczy. Kanał jest prywatny, wpuszcza tylko właściciela.
-- ------------------------------------------------------------------
drop policy if exists "live own topic" on realtime.messages;
create policy "live own topic" on realtime.messages
  for select to authenticated
  using ( realtime.topic() = 'u:' || auth.uid()::text );

create or replace function public.live_ping(target uuid, actor uuid, kind text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if target is null or target = actor then return; end if;
  perform realtime.send(jsonb_build_object('k', kind), 'ping',
                        'u:' || target::text, true);
exception when others then
  -- ping, który nie doleciał, nie ma prawa cofnąć zapisu, przy którym leciał
  null;
end $$;
revoke execute on function public.live_ping(uuid, uuid, text)
  from public, anon, authenticated;

-- jeden ping do każdego znajomego, czyli do obserwujących w obie strony
drop function if exists public.live_friends(uuid, text);
create or replace function public.live_friends(owner uuid, kind text, actor uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  f record;
begin
  for f in
    select a.follower as id from public.follows a
    where a.followee = owner
      and exists (select 1 from public.follows b
                  where b.follower = owner and b.followee = a.follower)
  loop
    perform public.live_ping(f.id, actor, kind);
  end loop;
end $$;
revoke execute on function public.live_friends(uuid, text, uuid)
  from public, anon, authenticated;

-- Znajomy, który ogląda twój trening: like, bicek, "patrzę" (co 15 s) i "wyszedłem".
-- Funkcja sprawdza przyjaźń i to, że trening trwa, a potem pinguje właściciela nickiem.
drop function if exists public.live_peek(uuid);
drop function if exists public.live_peek(uuid, text);
create or replace function public.live_peek(target uuid, kind text, msg text default '')
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare nick text;
begin
  if kind not in ('like', 'flex', 'say', 'look', 'leave') then return; end if;
  if target is null or target = auth.uid() or not public.friends_with(target) then return; end if;
  if not exists (select 1 from public.live_session where user_id = target) then return; end if;
  select username into nick from public.profiles where user_id = auth.uid();
  perform realtime.send(jsonb_build_object('k', kind, 'n', coalesce(nick, ''), 't', left(coalesce(msg, ''), 20)),
                        'ping', 'u:' || target::text, true);
end $$;
revoke execute on function public.live_peek(uuid, text, text) from public, anon;
grant execute on function public.live_peek(uuid, text, text) to authenticated;

-- Powiadomienie idzie do właściciela treningu, bo to jego sprawa. Ale lajk
-- albo komentarz widzi każdy, kto ma ten trening przed oczami — czyli autor
-- i wszyscy jego znajomi. Bez tego własny lajk pod własnym treningiem nie
-- ruszyłby u nikogo, bo ping do samego siebie jest pomijany.
create or replace function public.live_react(pu uuid, actor uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_ping(pu, actor, 'react');
  perform public.live_friends(pu, 'react', actor);
end $$;
revoke execute on function public.live_react(uuid, uuid)
  from public, anon, authenticated;

-- trening znajomego: doszedł, zmienił się albo zniknął
create or replace function public.live_post() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_friends(coalesce(new.user_id, old.user_id), 'post', null);
  return coalesce(new, old);
end $$;

-- biblioteka: rutyna, którą ktoś followuje, właśnie się zmieniła
create or replace function public.live_lib() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_friends(new.user_id, 'lib', null);
  return new;
end $$;

-- cofnięty lajk albo skasowany komentarz też zmienia to, co widać
create or replace function public.live_undo() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_react(old.post_user, auth.uid());
  return old;
end $$;

-- nick, imię, bio, zdjęcie albo licznik treningów: wszystko, co znajomy
-- widzi o Tobie, zanim w cokolwiek kliknie
create or replace function public.live_prof() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_friends(new.user_id, 'prof', null);
  return new;
end $$;

-- koniec znajomości: drugiej stronie znika feed, biblioteka i podgląd
-- followowanych rutyn, więc musi się o tym dowiedzieć od razu
create or replace function public.live_unfoll() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_ping(old.followee, null, 'foll');
  perform public.live_ping(old.follower, null, 'foll');
  return old;
end $$;

-- Twoje własne dane do Twoich pozostałych urządzeń. Sesja w trakcie
-- treningu zapisuje się co parę sekund i nikogo nie obchodzi — liczy się
-- tylko zmiana samego dziennika.
create or replace function public.live_self() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.data is distinct from old.data then
    -- z numerem wersji, żeby urządzenie, które właśnie to zapisało, nie
    -- pobierało z powrotem własnego zapisu
    perform public.live_ping(new.user_id, null, 'data:' || new.rev::text);
  end if;
  return new;
end $$;

drop trigger if exists live_on_prof      on public.profiles;
drop trigger if exists live_on_unfollow  on public.follows;
drop trigger if exists live_on_post      on public.posts;
drop trigger if exists live_on_lib       on public.library;
drop trigger if exists live_on_unlike    on public.likes;
drop trigger if exists live_on_uncomment on public.comments;
drop trigger if exists live_on_tracker   on public.tracker;
create trigger live_on_prof after update on public.profiles
  for each row execute function public.live_prof();
create trigger live_on_unfollow after delete on public.follows
  for each row execute function public.live_unfoll();
create trigger live_on_post after insert or update or delete on public.posts
  for each row execute function public.live_post();
create trigger live_on_lib after insert or update on public.library
  for each row execute function public.live_lib();
create trigger live_on_unlike after delete on public.likes
  for each row execute function public.live_undo();
create trigger live_on_uncomment after delete on public.comments
  for each row execute function public.live_undo();
create trigger live_on_tracker after update on public.tracker
  for each row execute function public.live_self();

-- ------------------------------------------------------------------
-- 11. Trening w toku. Jeden wiersz na osobę, dopóki sesja trwa; znika,
--     gdy trening się kończy, zostaje odrzucony albo jest prywatny.
--     Czyta właściciel i znajomi — w przeciwieństwie do profilu, który
--     czyta każdy zalogowany, więc ćwiczeń i serii nie wolno tam trzymać.
--     Zmiana wiersza pinguje znajomych ('sess'), a aplikacja sięga po
--     wiersze zwykłym zapytaniem, tak jak przy reszcie kanału na żywo.
-- ------------------------------------------------------------------
create table if not exists public.live_session (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.live_session enable row level security;

drop policy if exists "live_session read"  on public.live_session;
drop policy if exists "live_session write" on public.live_session;
drop policy if exists "live_session edit"  on public.live_session;
drop policy if exists "live_session drop"  on public.live_session;
create policy "live_session read"  on public.live_session for select to authenticated
  using (auth.uid() = user_id or public.friends_with(user_id));
create policy "live_session write" on public.live_session for insert to authenticated
  with check (auth.uid() = user_id);
create policy "live_session edit"  on public.live_session for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "live_session drop"  on public.live_session for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.live_sess() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_friends(coalesce(new.user_id, old.user_id), 'sess', null);
  return coalesce(new, old);
end $$;

drop trigger if exists live_on_sess on public.live_session;
create trigger live_on_sess after insert or update or delete on public.live_session
  for each row execute function public.live_sess();

-- ------------------------------------------------------------------
-- 11. Niedzielny recap. W niedzielę o 20:00 czasu polskiego idzie push
--     do każdego, kto ma włączone powiadomienia i trenował w tym
--     tygodniu (pon-nd). pg_cron liczy w UTC, a godzina polska zmienia
--     się z czasem letnim, więc zadanie budzi się o 18:00 i 19:00 UTC,
--     a funkcja puszcza tylko tę z nich, która jest 20:00 w Warszawie.
--     Tekst i miejsce, w które prowadzi stuknięcie, są w funkcji notify.
-- ------------------------------------------------------------------
create or replace function public.weekly_recap_push() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  u uuid;
begin
  if extract(hour from now() at time zone 'Europe/Warsaw') <> 20 then return; end if;
  for u in
    select distinct p.user_id from public.posts p
    where p.date >= date_trunc('week', now())
      and exists (select 1 from public.push_subs s where s.user_id = p.user_id)
  loop
    perform public.push_send('recap', u, null, null, null);
  end loop;
end $$;
revoke execute on function public.weekly_recap_push() from public, anon, authenticated;

select cron.schedule('weekly-recap', '0 18,19 * * 0', $$select public.weekly_recap_push()$$);

-- ------------------------------------------------------------------
-- 12. Raport miesięczny. Pierwszego dnia miesiąca o 10:00 czasu
--     polskiego idzie push do każdego, kto ma włączone powiadomienia
--     i trenował w poprzednim miesiącu. Tak samo jak recap: cron budzi
--     się o 08:00 i 09:00 UTC, a funkcja puszcza tę godzinę, która jest
--     10:00 w Warszawie.
-- ------------------------------------------------------------------
create or replace function public.monthly_report_push() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  u uuid;
  here timestamp := now() at time zone 'Europe/Warsaw';
begin
  if extract(hour from here) <> 10 or extract(day from here) <> 1 then return; end if;
  for u in
    select distinct p.user_id from public.posts p
    where p.date >= (date_trunc('month', here) - interval '1 month') at time zone 'Europe/Warsaw'
      and p.date <  date_trunc('month', here) at time zone 'Europe/Warsaw'
      and exists (select 1 from public.push_subs s where s.user_id = p.user_id)
  loop
    perform public.push_send('report', u, null, null, null);
  end loop;
end $$;
revoke execute on function public.monthly_report_push() from public, anon, authenticated;

select cron.schedule('monthly-report', '0 8,9 1 * *', $$select public.monthly_report_push()$$);


-- ============================================================
-- Delete my account: removes the auth user, and every table cascades
-- (profiles, tracker, posts, follows, likes, comments, library, live_session,
-- push_subs, push_jobs), so the email and the nick are free again.
-- ============================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
