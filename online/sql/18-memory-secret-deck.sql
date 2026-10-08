-- 18 — Paquet Souvenirs secret côté serveur.
-- À exécuter après 17. N'active pas memory_enabled.
-- Le paquet ne doit jamais être lisible dans slay_custom_duel_games.
create table if not exists public.slay_custom_memory_secret (
 room_id uuid primary key references public.slay_rooms(id) on delete cascade,
 deck jsonb not null default '[]'::jsonb,
 constraint slay_custom_memory_secret_deck_array check(jsonb_typeof(deck)='array')
);
alter table public.slay_custom_memory_secret enable row level security;
revoke all on public.slay_custom_memory_secret from public,anon,authenticated;
-- Aucune policy SELECT : seules les fonctions SECURITY DEFINER y accèdent.
-- Migration des éventuels paquets déjà préparés par SQL 09.
insert into public.slay_custom_memory_secret(room_id,deck)
select room_id,memory_deck from public.slay_custom_duel_games
where jsonb_array_length(memory_deck)>0
on conflict(room_id) do nothing;
update public.slay_custom_duel_games
set memory_deck='[]'::jsonb where jsonb_array_length(memory_deck)>0;

create or replace function public.slay_custom_prepare_memories(p_room uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;g public.slay_custom_duel_games%rowtype;
shuffled jsonb;existing jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found or (r.host_id is distinct from auth.uid() and r.guest_id is distinct from auth.uid())
 then raise exception 'Salon inaccessible';end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found then raise exception 'Duel non démarré';end if;
 if g.memory_enabled then raise exception 'Les Souvenirs sont déjà actifs';end if;
 select deck into existing from public.slay_custom_memory_secret where room_id=p_room;
 if found then return jsonb_array_length(existing);end if;
 select coalesce(jsonb_agg(id order by random()),'[]'::jsonb) into shuffled
 from (select c.id from public.slay_memory_catalog c
 cross join lateral generate_series(1,case when c.id='master' then 1 when c.id='rest' then 10 else 2 end)) entries(id);
 insert into public.slay_custom_memory_secret(room_id,deck) values(p_room,shuffled);
 update public.slay_custom_duel_games
 set memory_deck='[]'::jsonb,memory_draws='{"host":2,"guest":2}'::jsonb,
 memory_discard='[]'::jsonb,memory_pending=null,memory_reveal=null,updated_at=now()
 where room_id=p_room;
 return jsonb_array_length(shuffled);
end $$;

create or replace function public.slay_custom_draw_memory(p_room uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;g public.slay_custom_duel_games%rowtype;
who text;picked text;cost integer;remaining integer;result jsonb;deck jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 who:=case when r.host_id=auth.uid() then 'host' when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé';end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found or not g.memory_enabled then raise exception 'Pioche en ligne non encore activée';end if;
 if g.winner is not null or g.memory_pending is distinct from who or g.turn<>who
 then raise exception 'Aucune pioche autorisée à ce moment';end if;
 if g.memory_reveal is not null then raise exception 'Un Souvenir doit être résolu';end if;
 if coalesce((g.memory_blocked->>who)::boolean,false) then raise exception 'Pioche bloquée';end if;
 select s.deck into deck from public.slay_custom_memory_secret s where s.room_id=p_room for update;
 if deck is null or jsonb_array_length(deck)=0 then raise exception 'Paquet vide';end if;
 picked:=deck->>0;
 select c.cost into cost from public.slay_memory_catalog c where c.id=picked;
 if cost is null then raise exception 'Souvenir inconnu';end if;
 remaining:=coalesce((g.memory_draws->>who)::integer,0);
 if remaining<cost then raise exception 'Cristaux insuffisants';end if;
 result:=jsonb_build_object('id',picked,'owner',who,'cost',cost,'resolved',false);
 update public.slay_custom_memory_secret set deck=deck-0 where room_id=p_room;
 update public.slay_custom_duel_games set
 memory_draws=jsonb_set(memory_draws,array[who],to_jsonb(remaining-cost)),
 memory_reveal=result,updated_at=now() where room_id=p_room;
 return result;
end $$;
revoke all on function public.slay_custom_prepare_memories(uuid) from public,anon;
revoke all on function public.slay_custom_draw_memory(uuid) from public,anon;
grant execute on function public.slay_custom_prepare_memories(uuid) to authenticated;
grant execute on function public.slay_custom_draw_memory(uuid) to authenticated;
-- IMPORTANT : SQL 11 utilise encore memory_deck pour ouvrir la fenêtre de
-- pioche. Un prochain SQL devra remplacer ce test par le paquet secret.
-- Ne pas activer les Souvenirs avant ce raccordement.
