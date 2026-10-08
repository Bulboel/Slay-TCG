-- 30 — Corrige la pioche Souvenirs : variable deck / colonne deck.
-- Exécuter après SQL 28 (et 29 si déjà exécuté).
-- Aucun reset des parties ni des paquets existants.
create or replace function public.slay_custom_draw_memory(p_room uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 who text; picked text; cost integer; remaining integer;
 result jsonb; secret_cards jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 who:=case when r.host_id=auth.uid() then 'host'
           when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé';end if;
 select * into g from public.slay_custom_duel_games
 where room_id=p_room for update;
 if not found or not g.memory_enabled then
  raise exception 'Pioche Souvenirs non activée';end if;
 if g.winner is not null or g.memory_pending is distinct from who
    or g.turn<>who then raise exception 'Aucune pioche autorisée à ce moment';end if;
 if g.memory_reveal is not null then raise exception 'Résous le Souvenir en cours';end if;
 if coalesce((g.memory_blocked->>who)::boolean,false)
 then raise exception 'Pioche bloquée';end if;
 select ms.deck into secret_cards
 from public.slay_custom_memory_secret ms
 where ms.room_id=p_room for update;
 if secret_cards is null or jsonb_array_length(secret_cards)=0
 then raise exception 'Paquet Souvenirs vide';end if;
 picked:=secret_cards->>0;
 select c.cost into cost from public.slay_memory_catalog c where c.id=picked;
 if cost is null then raise exception 'Souvenir inconnu';end if;
 remaining:=coalesce((g.memory_draws->>who)::integer,0);
 if remaining<cost then raise exception 'Cristaux insuffisants';end if;
 result:=jsonb_build_object('id',picked,'owner',who,'cost',cost,'resolved',false);
 update public.slay_custom_memory_secret as ms
 set deck=secret_cards-0 where ms.room_id=p_room;
 update public.slay_custom_duel_games
 set memory_draws=jsonb_set(memory_draws,array[who],to_jsonb(remaining-cost)),
     memory_reveal=result,updated_at=now()
 where room_id=p_room;
 return result;
end $$;
revoke all on function public.slay_custom_draw_memory(uuid) from public,anon;
grant execute on function public.slay_custom_draw_memory(uuid) to authenticated;
