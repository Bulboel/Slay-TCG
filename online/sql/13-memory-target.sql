-- 13 — Cible sphérique : déplacement atomique d'une carte adverse.
-- À exécuter après 12. Ne pas activer memory_enabled.
-- Les Souvenirs restants (araignée, retrouvailles, Joker) ne sont pas
-- encore pris en charge. Cette migration n'affecte pas les duels existants.
create or replace function public.slay_custom_memory_target(
 p_room uuid,p_from integer,p_to integer)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 who text;enemy text;b jsonb;moved jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu'; end if;
 who:=case when r.host_id=auth.uid() then 'host'
           when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé'; end if;
 enemy:=case when who='host' then 'guest' else 'host' end;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found or not g.memory_enabled then
   raise exception 'Souvenirs en ligne non encore activés'; end if;
 if g.winner is not null or g.turn<>who or g.memory_pending is distinct from who
    or g.memory_reveal is null or g.memory_reveal->>'id' is distinct from 'target'
    or g.memory_reveal->>'owner' is distinct from who
    or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Cible sphérique indisponible'; end if;
 if p_from is null or p_to is null or p_from not between 0 and 8
    or p_to not between 0 and 8 or p_from=p_to
 then raise exception 'Cases invalides'; end if;
 b:=g.board;moved:=b->p_from;
 if moved is null or moved='null'::jsonb or moved->>'owner'<>enemy
 then raise exception 'La carte de départ doit appartenir à l''adversaire'; end if;
 if b->p_to is distinct from 'null'::jsonb
 then raise exception 'La case de destination doit être vide'; end if;
 b:=jsonb_set(b,array[p_to::text],moved);
 b:=jsonb_set(b,array[p_from::text],'null'::jsonb);
 update public.slay_custom_duel_games
 set board=b,
 memory_discard=memory_discard||to_jsonb('target'::text),
 memory_reveal=null,memory_pending=null,turn=enemy,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_target(uuid,integer,integer) from public,anon;
grant execute on function public.slay_custom_memory_target(uuid,integer,integer) to authenticated;
