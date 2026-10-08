-- 22 — LE MAÎTRE DU JEU : annulation serveur d'un Souvenir adverse.
-- À exécuter après 21. N'active pas memory_enabled.
-- La duplication sera traitée séparément : chaque effet nécessite
-- des règles de cible et de propriété différentes.
create or replace function public.slay_custom_memory_joker_cancel(p_room uuid)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 reactor text;drawer text;effect_id text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 reactor:=case when r.host_id=auth.uid() then 'host'
               when r.guest_id=auth.uid() then 'guest' else null end;
 if reactor is null then raise exception 'Accès refusé';end if;
 drawer:=case when reactor='host' then 'guest' else 'host' end;
 select * into g from public.slay_custom_duel_games
 where room_id=p_room for update;
 if not found or not g.memory_enabled then
   raise exception 'Souvenirs en ligne non encore activés';end if;
 if g.winner is not null or g.turn is distinct from drawer
 or g.memory_pending is distinct from drawer
 or g.memory_reveal is null
 or g.memory_reveal->>'owner' is distinct from drawer
 or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Aucun Souvenir adverse annulable';end if;
 if not coalesce((g.memory_joker->>reactor)::boolean,false)
 then raise exception 'Aucun Joker disponible';end if;
 effect_id:=g.memory_reveal->>'id';
 if effect_id is null or effect_id='master' then
   raise exception 'Ce Souvenir ne peut pas être annulé';end if;
 update public.slay_custom_duel_games
 set memory_joker=jsonb_set(memory_joker,array[reactor],'false'::jsonb),
 memory_discard=memory_discard||to_jsonb(effect_id),
 memory_reveal=null,memory_pending=null,turn=reactor,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_joker_cancel(uuid) from public,anon;
grant execute on function public.slay_custom_memory_joker_cancel(uuid) to authenticated;
