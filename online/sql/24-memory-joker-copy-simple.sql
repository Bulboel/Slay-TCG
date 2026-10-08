-- 24 — LE MAÎTRE DU JEU : duplication des effets sans cible.
-- Après SQL 23. Ne pas activer memory_enabled.
-- Gère « Repos mérité », « Vous avez du fromage ? » et « Je suis coincé ».
-- Les effets nécessitant une cible seront ajoutés séparément.
create or replace function public.slay_custom_memory_joker_copy_simple(p_room uuid)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 reactor text;drawer text;effect_id text;
 blind jsonb;
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
 then raise exception 'Tu ne possèdes pas de Joker';end if;
 effect_id:=g.memory_reveal->>'id';
 if effect_id not in ('rest','cheese','stuck')
 then raise exception 'Cet effet nécessite un choix ou une résolution spécifique';end if;
 blind:=g.memory_blind;
 if effect_id='cheese' then
   -- Effet initial : main du réacteur cachée.
   -- Copie : main du piocheur cachée.
   blind:=jsonb_set(blind,array[reactor],'true'::jsonb);
   blind:=jsonb_set(blind,array[drawer],'true'::jsonb);
 elsif effect_id='stuck' then
   -- Effet initial : main du piocheur cachée.
   -- Copie : main du réacteur cachée.
   blind:=jsonb_set(blind,array[drawer],'true'::jsonb);
   blind:=jsonb_set(blind,array[reactor],'true'::jsonb);
 end if;
 update public.slay_custom_duel_games set
   memory_joker=jsonb_set(memory_joker,array[reactor],'false'::jsonb),
   memory_blind=blind,
   memory_discard=memory_discard||to_jsonb(effect_id),
   memory_reveal=null,memory_pending=null,turn=reactor,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_joker_copy_simple(uuid) from public,anon;
grant execute on function public.slay_custom_memory_joker_copy_simple(uuid) to authenticated;
