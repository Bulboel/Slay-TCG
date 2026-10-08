-- 10 — Actions de pioche et de passage pour les Souvenirs.
-- Exécuter après 09. Les fonctions restent inactives tant que memory_enabled=false.
-- Ne pas activer memory_enabled manuellement : le moteur de pose et les effets
-- doivent d'abord être raccordés et testés.
create or replace function public.slay_custom_draw_memory(p_room uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype; g public.slay_custom_duel_games%rowtype;
who text; picked text; cost integer; remaining integer; result jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu'; end if;
 who:=case when r.host_id=auth.uid() then 'host' when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé'; end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found or not g.memory_enabled then raise exception 'Pioche en ligne non encore activée'; end if;
 if g.winner is not null or g.memory_pending is distinct from who or g.turn<>who
 then raise exception 'Aucune pioche autorisée à ce moment'; end if;
 if g.memory_reveal is not null then raise exception 'Un Souvenir doit être résolu'; end if;
 if jsonb_array_length(g.memory_deck)=0 then raise exception 'Paquet vide'; end if;
 if coalesce((g.memory_blocked->>who)::boolean,false) then raise exception 'Pioche bloquée'; end if;
 picked:=g.memory_deck->>0;
 select c.cost into cost from public.slay_memory_catalog c where c.id=picked;
 if cost is null then raise exception 'Souvenir inconnu'; end if;
 remaining:=coalesce((g.memory_draws->>who)::integer,0);
 if remaining<cost then raise exception 'Cristaux insuffisants'; end if;
 result:=jsonb_build_object('id',picked,'owner',who,'cost',cost,'resolved',false);
 update public.slay_custom_duel_games
 set memory_deck=memory_deck-0,
 memory_draws=jsonb_set(memory_draws,array[who],to_jsonb(remaining-cost)),
 memory_reveal=result,updated_at=now()
 where room_id=p_room;
 return result;
end $$;

create or replace function public.slay_custom_skip_memory(p_room uuid)
returns public.slay_custom_duel_games language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype; g public.slay_custom_duel_games%rowtype;
who text; next_player text;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu'; end if;
 who:=case when r.host_id=auth.uid() then 'host' when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé'; end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found or not g.memory_enabled then raise exception 'Souvenirs en ligne non encore activés'; end if;
 if g.memory_pending is distinct from who or g.turn<>who or g.memory_reveal is not null
 then raise exception 'Impossible de passer maintenant'; end if;
 next_player:=case when who='host' then 'guest' else 'host' end;
 update public.slay_custom_duel_games
 set memory_pending=null,turn=next_player,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_draw_memory(uuid) from public,anon;
revoke all on function public.slay_custom_skip_memory(uuid) from public,anon;
grant execute on function public.slay_custom_draw_memory(uuid) to authenticated;
grant execute on function public.slay_custom_skip_memory(uuid) to authenticated;
