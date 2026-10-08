-- 33 — Cible sphérique sans cible : effet annulé, tour poursuivi.
-- Ne modifie pas le comportement lorsqu'une carte adverse est présente.
create or replace function public.slay_custom_memory_target_no_target(p_room uuid)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 who text; enemy text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 who:=case when r.host_id=auth.uid() then 'host'
           when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé';end if;
 enemy:=case when who='host' then 'guest' else 'host' end;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found or not g.memory_enabled or g.winner is not null
    or g.turn<>who or g.memory_pending is distinct from who
    or g.memory_reveal->>'id' is distinct from 'target'
    or g.memory_reveal->>'owner' is distinct from who
    or g.memory_reveal->>'resolved' is distinct from 'false'
    or g.memory_reaction='pending'
 then raise exception 'Cible sphérique indisponible';end if;
 if exists (
   select 1 from jsonb_array_elements(g.board) as entry(card)
   where entry.card is distinct from 'null'::jsonb
     and entry.card->>'owner'=enemy
 ) then raise exception 'Une carte adverse peut être ciblée';end if;
 update public.slay_custom_duel_games
 set memory_discard=memory_discard||to_jsonb('target'::text),
     memory_reveal=null,memory_pending=null,turn=enemy,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_target_no_target(uuid) from public,anon;
grant execute on function public.slay_custom_memory_target_no_target(uuid) to authenticated;
