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

  else
    perform public.push_send('follow', new.followee, new.follower, null, null);
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
