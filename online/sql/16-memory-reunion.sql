-- 16 — Retrouvailles : échange atomique de cartes encore en main.
-- À exécuter après 15. N'active pas les Souvenirs.
-- La pose doit ensuite être raccordée aux mains du SQL 15 avant activation.
create or replace function public.slay_custom_memory_reunion(
 p_room uuid,p_hand_index integer)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 who text;enemy text;mine_id uuid;theirs_id uuid;
 mine jsonb;theirs jsonb;mine_card jsonb;their_card jsonb;
 eligible integer[]:=array[]::integer[];chosen integer;
 i integer;j integer;slot jsonb;used boolean;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 if auth.uid()=r.host_id then
   who:='host';enemy:='guest';mine_id:=r.host_id;theirs_id:=r.guest_id;
 elsif auth.uid()=r.guest_id then
   who:='guest';enemy:='host';mine_id:=r.guest_id;theirs_id:=r.host_id;
 else raise exception 'Accès refusé';end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found or not g.memory_enabled or not g.memory_hands_ready
 then raise exception 'Mains des Souvenirs non activées';end if;
 if g.winner is not null or g.turn<>who or g.memory_pending is distinct from who
 or g.memory_reveal is null or g.memory_reveal->>'id' is distinct from 'reunion'
 or g.memory_reveal->>'owner' is distinct from who
 or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Retrouvailles indisponible';end if;
 if p_hand_index is null or p_hand_index not between 0 and 4
 then raise exception 'Carte choisie invalide';end if;
 -- Verrouillage déterministe des deux lignes pour éviter les échanges concurrents.
 perform 1 from public.slay_custom_duel_hands
 where room_id=p_room and player_id in (mine_id,theirs_id)
 order by player_id for update;
 select cards into mine from public.slay_custom_duel_hands
 where room_id=p_room and player_id=mine_id;
 select cards into theirs from public.slay_custom_duel_hands
 where room_id=p_room and player_id=theirs_id;
 if jsonb_typeof(mine)<>'array' or jsonb_array_length(mine)<>5
 or jsonb_typeof(theirs)<>'array' or jsonb_array_length(theirs)<>5
 then raise exception 'Mains non initialisées';end if;
 if mine->p_hand_index='null'::jsonb
 then raise exception 'Carte absente de la main';end if;
 -- Les cartes posées sont exclues même si leur slot garde une référence.
 for i in 0..8 loop
   slot:=g.board->i;
   if slot is not null and slot<>'null'::jsonb
     and slot->>'played_by'=who
     and (slot->>'hand_index')::integer=p_hand_index
   then raise exception 'Cette carte a déjà été jouée';end if;
 end loop;
 for j in 0..4 loop
   if theirs->j='null'::jsonb then continue;end if;
   used:=false;
   for i in 0..8 loop
     slot:=g.board->i;
     if slot is not null and slot<>'null'::jsonb
        and slot->>'played_by'=enemy
        and (slot->>'hand_index')::integer=j
     then used:=true;exit;end if;
   end loop;
   if not used then eligible:=array_append(eligible,j);end if;
 end loop;
 if coalesce(array_length(eligible,1),0)=0
 then raise exception 'Aucune carte adverse échangeable';end if;
 chosen:=eligible[1+floor(random()*array_length(eligible,1))::integer];
 mine_card:=mine->p_hand_index;their_card:=theirs->chosen;
 mine:=jsonb_set(mine,array[p_hand_index::text],their_card);
 theirs:=jsonb_set(theirs,array[chosen::text],mine_card);
 update public.slay_custom_duel_hands set cards=mine,updated_at=now()
 where room_id=p_room and player_id=mine_id;
 update public.slay_custom_duel_hands set cards=theirs,updated_at=now()
 where room_id=p_room and player_id=theirs_id;
 update public.slay_custom_duel_games set
 memory_discard=memory_discard||to_jsonb('reunion'::text),
 memory_reveal=null,memory_pending=null,turn=enemy,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_reunion(uuid,integer) from public,anon;
grant execute on function public.slay_custom_memory_reunion(uuid,integer) to authenticated;
