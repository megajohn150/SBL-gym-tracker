-- Realtime: wklej to w całości w SQL Editor w dashboardzie Supabase.
-- Nie ma tu żadnego sekretu do podmiany — push_send zostaje nietknięte.
-- Źródłem prawdy jest supabase-social.sql; ten plik to dokładnie te dwa
-- kawałki, które trzeba wykonać, żeby włączyć kanały na żywo.

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
create or replace function public.live_friends(owner uuid, kind text)
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
    perform public.live_ping(f.id, null, kind);
  end loop;
end $$;
revoke execute on function public.live_friends(uuid, text)
  from public, anon, authenticated;

-- trening znajomego: doszedł, zmienił się albo zniknął
create or replace function public.live_post() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_friends(coalesce(new.user_id, old.user_id), 'post');
  return coalesce(new, old);
end $$;

-- biblioteka: rutyna, którą ktoś followuje, właśnie się zmieniła
create or replace function public.live_lib() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_friends(new.user_id, 'lib');
  return new;
end $$;

-- cofnięty lajk albo skasowany komentarz też zmienia to, co widać
create or replace function public.live_undo() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.live_ping(old.post_user, auth.uid(), 'react');
  return old;
end $$;

-- Twoje własne dane do Twoich pozostałych urządzeń. Sesja w trakcie
-- treningu zapisuje się co parę sekund i nikogo nie obchodzi — liczy się
-- tylko zmiana samego dziennika.
create or replace function public.live_self() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.data is distinct from old.data then
    perform public.live_ping(new.user_id, null, 'data');
  end if;
  return new;
end $$;

drop trigger if exists live_on_post      on public.posts;
drop trigger if exists live_on_lib       on public.library;
drop trigger if exists live_on_unlike    on public.likes;
drop trigger if exists live_on_uncomment on public.comments;
drop trigger if exists live_on_tracker   on public.tracker;
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
-- właśnie otwarta. Funkcja bez zmian poza pięcioma liniami live_ping.
create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  t record;
begin
  if tg_table_name = 'likes' then
    perform public.push_send('like', new.post_user, new.liker,
                             new.post_user, new.post_id);
    perform public.live_ping(new.post_user, new.liker, 'react');

  elsif tg_table_name = 'comments' then
    -- właściciel treningu, chyba że to on odpisał albo odpowiedź leci do niego
    if new.parent_author is distinct from new.post_user then
      perform public.push_send('comment', new.post_user, new.author,
                               new.post_user, new.post_id);
      perform public.live_ping(new.post_user, new.author, 'react');
    end if;
    -- komentarz, na który ktoś odpowiedział
    if new.parent_author is not null then
      perform public.push_send('reply', new.parent_author, new.author,
                               new.post_user, new.post_id);
      perform public.live_ping(new.parent_author, new.author, 'react');
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
      perform public.live_ping(t.author, new.author, 'react');
    end loop;

  else
    perform public.push_send('follow', new.followee, new.follower, null, null);
    perform public.live_ping(new.followee, new.follower, 'foll');
  end if;
  return new;
end $$;
