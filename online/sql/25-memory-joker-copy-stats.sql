-- 25 — Duplication Joker des Souvenirs Feu et Caillou.
-- Après SQL 24. Ne pas activer memory_enabled.
-- Chaque joueur choisit une de ses cartes sur le plateau :
-- l'effet original et sa copie sont appliqués atomiquement.
create or replace function public.slay_custom_memory_joker_copy_stats(
 p_room uuid,p_drawer_position integer,p_reactor_position integer)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 reactor text;drawer text;effect_id text;
 b jsonb;slot jsonb;vals jsonb;new_vals jsonb;
 pos integer;i integer;delta integer;v integer;
 expected_owner text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 reactor:=case when r.host_id=auth.uid() then 'host'
               when r.guest_id=auth.uid() then 'guest' else null end;
 if reactor is null then raise exception 'Accès refusé';end if;
 drawer:=case when reactor='host' then 'guest' else 'host' end;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found or not g.memory_enabled or g.winner is not null
 or g.turn is distinct from drawer or g.memory_pending is distinct from drawer
 or g.memory_reveal is null or g.memory_reaction is distinct from 'pending'
 or g.memory_reveal->>'owner' is distinct from drawer
 or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Aucune duplication Joker disponible';end if;
 if not coalesce((g.memory_joker->>reactor)::boolean,false)
 then raise exception 'Joker indisponible';end if;
 effect_id:=g.memory_reveal->>'id';
 if effect_id not in ('fire','rock') then
   raise exception 'Cet effet ne modifie pas les statistiques';end if;
 if p_drawer_position is null or p_drawer_position not between 0 and 8
 or p_reactor_position is null or p_reactor_position not between 0 and 8
 or p_drawer_position=p_reactor_position
 then raise exception 'Choix de cartes invalides';end if;
 b:=g.board;
 delta:=case when effect_id='rock' then 1 else -1 end;
 for i in 1..2 loop
   pos:=case when i=1 then p_drawer_position else p_reactor_position end;
   expected_owner:=case when i=1 then drawer else reactor end;
   slot:=b->pos;
   if slot is null or slot='null'::jsonb or slot->>'owner'<>expected_owner
   then raise exception 'Chaque joueur doit cibler une de ses cartes';end if;
   vals:=slot->'card'->'v';
   if jsonb_typeof(vals)<>'array' or jsonb_array_length(vals)<>4
   then raise exception 'Valeurs de carte invalides';end if;
   new_vals:='[]'::jsonb;
   for v in 0..3 loop
     new_vals:=new_vals||to_jsonb(greatest(1,(vals->>v)::integer+delta));
   end loop;
   b:=jsonb_set(b,array[pos::text,'card','v'],new_vals);
 end loop;
 update public.slay_custom_duel_games set
 board=b,memory_joker=jsonb_set(memory_joker,array[reactor],'false'::jsonb),
 memory_discard=memory_discard||to_jsonb(effect_id),
 memory_reveal=null,memory_pending=null,turn=reactor,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_joker_copy_stats(uuid,integer,integer) from public,anon;
grant execute on function public.slay_custom_memory_joker_copy_stats(uuid,integer,integer) to authenticated;
-- ATTENTION : l'interface doit recueillir le choix du piocheur et celui
-- du porteur du Joker avant d'appeler cette fonction. Ne jamais laisser
-- le réacteur choisir arbitrairement la cible du piocheur.
