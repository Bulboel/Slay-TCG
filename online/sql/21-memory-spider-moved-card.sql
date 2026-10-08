-- 21 — Correction de l'interaction Cible sphérique / Araignées blanches.
-- À exécuter après 20. Les Souvenirs restent désactivés.
-- On identifie la dernière carte encore présente grâce à son identité de
-- pose (joueur + index de main), même si Cible sphérique l'a déplacée.
create or replace function public.slay_custom_memory_spider(p_room uuid)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;g public.slay_custom_duel_games%rowtype;
 who text;enemy text;b jsonb;entries jsonb;entry jsonb;slot jsonb;
 i integer;j integer;found_position integer:=-1;hand_idx integer;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 who:=case when r.host_id=auth.uid() then 'host'
           when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé';end if;
 enemy:=case when who='host' then 'guest' else 'host' end;
 select * into g from public.slay_custom_duel_games
 where room_id=p_room for update;
 if not found or not g.memory_enabled then
   raise exception 'Souvenirs en ligne non encore activés';end if;
 if g.winner is not null or g.turn<>who or g.memory_pending is distinct from who
 or g.memory_reveal is null or g.memory_reveal->>'id' is distinct from 'spider'
 or g.memory_reveal->>'owner' is distinct from who
 or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Araignées blanches indisponible';end if;
 b:=g.board;entries:=coalesce(g.memory_played_order,'[]'::jsonb);
 if jsonb_typeof(entries)<>'array' then raise exception 'Historique invalide';end if;
 if jsonb_array_length(entries)>0 then
  for i in reverse (jsonb_array_length(entries)-1)..0 loop
   entry:=entries->i;
   if entry->>'played_by' is distinct from who then continue;end if;
   hand_idx:=(entry->>'hand_index')::integer;
   for j in 0..8 loop
    slot:=b->j;
    if slot is not null and slot<>'null'::jsonb
       and slot->>'owner'=who and slot->>'played_by'=who
       and (slot->>'hand_index')::integer=hand_idx
    then found_position:=j;exit;end if;
   end loop;
   if found_position>=0 then exit;end if;
  end loop;
 end if;
 if found_position>=0 then
   b:=jsonb_set(b,array[found_position::text],'null'::jsonb);
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
