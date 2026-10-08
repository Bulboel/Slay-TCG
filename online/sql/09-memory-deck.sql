-- 09 — Préparer le paquet Souvenirs sur le serveur, sans activer la pioche.
-- Exécuter après 08. Cette fonction ne modifie ni les règles ni les tours.
create or replace function public.slay_custom_prepare_memories(p_room uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;
        g public.slay_custom_duel_games%rowtype;
        shuffled jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found or (r.host_id is distinct from auth.uid() and r.guest_id is distinct from auth.uid())
 then raise exception 'Salon inaccessible'; end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found then raise exception 'Duel non démarré'; end if;
 if g.memory_enabled then raise exception 'Les Souvenirs sont déjà actifs'; end if;
 if jsonb_array_length(g.memory_deck)>0 then return jsonb_array_length(g.memory_deck); end if;
 -- Deux exemplaires de chaque souvenir ordinaire, un Maître du Jeu,
 -- dix Repos mérités, mélangés côté serveur (jamais par le navigateur).
 select coalesce(jsonb_agg(id order by random()),'[]'::jsonb) into shuffled
 from (
  select c.id from public.slay_memory_catalog c
  cross join lateral generate_series(1,case when c.id='master' then 1 when c.id='rest' then 10 else 2 end)
 ) as entries(id);
 update public.slay_custom_duel_games
 set memory_deck=shuffled,memory_draws='{"host":2,"guest":2}'::jsonb,
 memory_discard='[]'::jsonb,memory_pending=null,memory_reveal=null,
 updated_at=now()
 where room_id=p_room;
 return jsonb_array_length(shuffled);
end $$;
revoke all on function public.slay_custom_prepare_memories(uuid) from public,anon;
grant execute on function public.slay_custom_prepare_memories(uuid) to authenticated;
