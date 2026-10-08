-- 26 — Choix individuels pour la duplication Joker (Feu / Caillou).
-- À exécuter après 25. N'active pas memory_enabled.
-- Chaque joueur enregistre UNIQUEMENT son propre choix.
-- Le deuxième choix applique les deux modifications dans une transaction.
alter table public.slay_custom_duel_games
 add column if not exists memory_joker_choices jsonb not null default '{}'::jsonb;

create or replace function public.slay_custom_memory_joker_choose_stats(
 p_room uuid,p_position integer)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;g public.slay_custom_duel_games%rowtype;
 who text;drawer text;reactor text;effect_id text;
 choices jsonb;b jsonb;slot jsonb;vals jsonb;new_vals jsonb;
 pos integer;i integer;v integer;delta integer;owner_name text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 who:=case when r.host_id=auth.uid() then 'host'
           when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé';end if;
 select * into g from public.slay_custom_duel_games
 where room_id=p_room for update;
 if not found or not g.memory_enabled or g.winner is not null
    or g.memory_reveal is null or g.memory_reaction is distinct from 'pending'
    or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Aucune duplication de statistiques en attente';end if;
 drawer:=g.memory_reveal->>'owner';
 if drawer not in ('host','guest') or g.turn is distinct from drawer
 or g.memory_pending is distinct from drawer
 then raise exception 'Phase de Souvenir invalide';end if;
 reactor:=case when drawer='host' then 'guest' else 'host' end;
 if not coalesce((g.memory_joker->>reactor)::boolean,false)
 then raise exception 'Aucun Joker disponible';end if;
 effect_id:=g.memory_reveal->>'id';
 if effect_id not in ('fire','rock') then
   raise exception 'Ce Souvenir ne modifie pas les statistiques';end if;
 if p_position is null or p_position not between 0 and 8 then
   raise exception 'Case invalide';end if;
 slot:=g.board->p_position;
 if slot is null or slot='null'::jsonb or slot->>'owner'<>who then
   raise exception 'Choisis une de tes cartes';end if;
 choices:=coalesce(g.memory_joker_choices,'{}'::jsonb);
 if choices ? who then raise exception 'Tu as déjà choisi ta carte';end if;
 choices:=jsonb_set(choices,array[who],to_jsonb(p_position),true);
 if not (choices ? drawer and choices ? reactor) then
   update public.slay_custom_duel_games set
     memory_joker_choices=choices,updated_at=now()
   where room_id=p_room returning * into g;
   return g;
 end if;
 b:=g.board;
 delta:=case when effect_id='rock' then 1 else -1 end;
 for i in 1..2 loop
   owner_name:=case when i=1 then drawer else reactor end;
   pos:=(choices->>owner_name)::integer;
   slot:=b->pos;
   if slot is null or slot='null'::jsonb or slot->>'owner'<>owner_name
   then raise exception 'Une des cartes choisies a changé de propriétaire';end if;
   vals:=slot->'card'->'v';
   if jsonb_typeof(vals)<>'array' or jsonb_array_length(vals)<>4
   then raise exception 'Valeurs invalides';end if;
   new_vals:='[]'::jsonb;
   for v in 0..3 loop
     new_vals:=new_vals||to_jsonb(greatest(1,(vals->>v)::integer+delta));
   end loop;
   b:=jsonb_set(b,array[pos::text,'card','v'],new_vals);
 end loop;
 -- Le trigger du SQL 23 autorise la clôture de la fenêtre lorsque
 -- le Joker est consommé dans cette même transaction.
 update public.slay_custom_duel_games set
   board=b,memory_joker=jsonb_set(memory_joker,array[reactor],'false'::jsonb),
   memory_discard=memory_discard||to_jsonb(effect_id),
   memory_reveal=null,memory_pending=null,memory_joker_choices='{}'::jsonb,
   turn=reactor,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_joker_choose_stats(uuid,integer) from public,anon;
grant execute on function public.slay_custom_memory_joker_choose_stats(uuid,integer) to authenticated;
-- L'ancien RPC slay_custom_memory_joker_copy_stats du SQL 25 permettait
-- au réacteur de choisir les deux positions : retirer son accès public.
revoke execute on function public.slay_custom_memory_joker_copy_stats(uuid,integer,integer)
 from authenticated,public,anon;
