-- Realtime: wklej to w całości w SQL Editor w dashboardzie Supabase.
-- Nie ma tu żadnego sekretu do podmiany — push_send zostaje nietknięte.
-- Źródłem prawdy jest supabase-social.sql; ten plik to dokładnie te dwa
-- kawałki, które trzeba wykonać, żeby włączyć kanały na żywo.
-- Można puszczać wielokrotnie, nic się nie zdubluje.
--
-- To jest wersja z 5 listopada 2026 (195 linii). Czy masz ją już u siebie,
-- sprawdzisz dwoma zapytaniami w SQL Editor:
--   select count(*) from pg_trigger where tgname like 'live\_%';   -- ma być 7
--   select prosrc like '%data:%' from pg_proc where proname = 'live_self';
-- Jeśli pierwsze zwróci mniej niż 7 albo drugie "false" — wklej ten plik.

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

-- Te same powiadomienia co dotąd, plus ping do aplikacji, która jest
-- właśnie otwarta.
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
