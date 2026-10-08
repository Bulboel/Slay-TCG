-- 14 — Souvenir « On ne tue pas les araignées blanches ! »
-- Exécuter après 13. Ne pas activer memory_enabled.
-- Le modèle actuel conserve les cartes de la main dans les decks d'origine.
-- Une carte retirée du plateau redevient donc disponible à son index initial.
-- L'ordre de pose est enregistré côté serveur pour retrouver la dernière carte.
alter table public.slay_custom_duel_games
 add column if not exists memory_played_order jsonb not null default '[]'::jsonb;

-- La fonction ci-dessous est volontairement indépendante : elle n'est pas
-- utilisable tant que la fenêtre des Souvenirs n'est pas activée.
create or replace function public.slay_custom_memory_spider(p_room uuid)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 who text;enemy text;b jsonb;entries jsonb;entry jsonb;
 i integer;position integer:=-1;hand_idx integer:=-1;
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
    or g.memory_reveal is null or g.memory_reveal->>'id' is distinct from 'spider'
    or g.memory_reveal->>'owner' is distinct from who
    or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Araignées blanches indisponible'; end if;
 b:=g.board;entries:=g.memory_played_order;
 -- Recherche inverse de la dernière carte encore présente et contrôlée
 -- par son propriétaire, conformément au jeu original.
 for i in reverse jsonb_array_length(entries)-1..0 loop
   entry:=entries->i;
   if entry->>'played_by'=who then
     position:=(entry->>'position')::integer;
     hand_idx:=(entry->>'hand_index')::integer;
     if position between 0 and 8
        and b->position<>'null'::jsonb
        and b->position->>'owner'=who
        and b->position->>'played_by'=who
        and (b->position->>'hand_index')::integer=hand_idx
     then exit; end if;
   end if;
   position:=-1;hand_idx:=-1;
 end loop;
 if position>=0 then
   b:=jsonb_set(b,array[position::text],'null'::jsonb);
   -- Une pose supplémentaire redevient nécessaire pour remplir le plateau.
   -- Les cartes déjà posées ne sont pas réindexées.
   g.move_count:=greatest(0,g.move_count-1);
 end if;
 update public.slay_custom_duel_games
 set board=b,move_count=g.move_count,
 memory_discard=memory_discard||to_jsonb('spider'::text),
 memory_reveal=null,memory_pending=null,turn=enemy,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_spider(uuid) from public,anon;
grant execute on function public.slay_custom_memory_spider(uuid) to authenticated;
