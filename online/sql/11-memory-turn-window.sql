-- 11 — Raccordement des tours à la fenêtre de pioche.
-- À exécuter après 10. Ne bascule PAS memory_enabled à true.
-- Préserve les 8 règles de capture existantes et le comportement actuel
-- de toutes les parties tant que les Souvenirs restent désactivés.
-- Une fois le moteur des effets terminé, cette fonction pourra garder le tour
-- au joueur qui vient de poser une carte jusqu'à pioche ou passage.
create or replace function public.slay_custom_move(p_room uuid,p_hand_index integer,p_position integer)
returns public.slay_custom_duel_games language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;g public.slay_custom_duel_games%rowtype;
who text;enemy text;cards jsonb;c jsonb;b jsonb;target jsonb;adj jsonb;
i integer;side integer;opposite integer;rr integer;cc integer;p integer;
dr integer[]:=array[-1,0,1,0];dc integer[]:=array[0,1,0,-1];
sides integer[]:=array[]::integer[];positions integer[]:=array[]::integer[];
totals integer[]:=array[]::integer[];matches integer:=0;
attack integer;defense integer;score integer;host_score integer:=0;guest_score integer:=0;
dominance text;rule text;
begin
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu'; end if;
 if auth.uid()=r.host_id then who:='host';enemy:='guest';
 elsif auth.uid()=r.guest_id then who:='guest';enemy:='host';
 else raise exception 'Accès refusé'; end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found then raise exception 'Duel non démarré'; end if;
 if g.winner is not null or g.move_count=9 then raise exception 'Duel terminé'; end if;
 if g.memory_enabled and g.memory_pending is not null then raise exception 'Résous ou passe le Souvenir avant de poser une carte'; end if;
 if g.turn<>who then raise exception 'Ce n''est pas ton tour'; end if;
 if p_position is null or p_position not between 0 and 8 or p_hand_index is null or p_hand_index not between 0 and 4 then raise exception 'Coup invalide'; end if;
 b:=g.board;
 if b->p_position <> 'null'::jsonb then raise exception 'Case occupée'; end if;
 for i in 0..8 loop
  if b->i<>'null'::jsonb and b->i->>'played_by'=who and (b->i->>'hand_index')::integer=p_hand_index then raise exception 'Carte déjà jouée'; end if;
 end loop;
 select d.cards into cards from public.slay_custom_duel_decks d where d.room_id=p_room and d.player_id=auth.uid();
 if cards is null then raise exception 'Deck absent'; end if;
 c:=cards->p_hand_index;rule:=r.custom_rule;
 b:=jsonb_set(b,array[p_position::text],jsonb_build_object('owner',who,'played_by',who,'hand_index',p_hand_index,'card',c));
 -- Collecter toutes les cases voisines, y compris alliées pour Identique/Addition.
 for side in 0..3 loop
  rr:=p_position/3+dr[side+1];cc:=p_position%3+dc[side+1];
  if rr<0 or rr>2 or cc<0 or cc>2 then continue; end if;
  p:=rr*3+cc;target:=b->p;
  if target='null'::jsonb then continue; end if;
  opposite:=(side+2)%4;
  sides:=array_append(sides,side);positions:=array_append(positions,p);
  totals:=array_append(totals,(c->'v'->>side)::integer+(target->'card'->'v'->>opposite)::integer);
 end loop;
 -- Identique : au moins deux égalités simultanées, même contre une carte alliée.
 if rule like 'same-%' then
  matches:=0;
  for i in 1..coalesce(array_length(positions,1),0) loop
   if (c->'v'->>sides[i])::integer=(b->positions[i]->'card'->'v'->>((sides[i]+2)%4))::integer then matches:=matches+1;end if;
  end loop;
  if matches>=2 then
   for i in 1..coalesce(array_length(positions,1),0) loop
    if (c->'v'->>sides[i])::integer=(b->positions[i]->'card'->'v'->>((sides[i]+2)%4))::integer
    and b->positions[i]->>'owner'<>who then
     b:=jsonb_set(b,array[positions[i]::text,'owner'],to_jsonb(who));
    end if;
   end loop;
  end if;
 end if;
 -- Addition : au moins deux sommes identiques, sans combo.
 if rule like 'plus-%' then
  for i in 1..coalesce(array_length(positions,1),0) loop
   if (select count(*) from unnest(totals) t where t=totals[i])>=2 and b->positions[i]->>'owner'<>who then
    b:=jsonb_set(b,array[positions[i]::text,'owner'],to_jsonb(who));
   end if;
  end loop;
 end if;
 -- Capture classique, bonus élémentaire uniquement sur le côté en contact.
 for i in 1..coalesce(array_length(positions,1),0) loop
  p:=positions[i];side:=sides[i];target:=b->p;
  if target->>'owner'=who then continue;end if;
  opposite:=(side+2)%4;
  attack:=(c->'v'->>side)::integer;defense:=(target->'card'->'v'->>opposite)::integer;
  if rule like 'elements-%' then
   dominance:=case c->>'element' when 'water' then 'fire' when 'fire' then 'ice' when 'ice' then 'wind'
   when 'wind' then 'earth' when 'earth' then 'lightning' when 'lightning' then 'water' else null end;
   if dominance=target->'card'->>'element' then attack:=attack+1;end if;
   dominance:=case target->'card'->>'element' when 'water' then 'fire' when 'fire' then 'ice' when 'ice' then 'wind'
   when 'wind' then 'earth' when 'earth' then 'lightning' when 'lightning' then 'water' else null end;
   if dominance=c->>'element' then defense:=defense+1;end if;
  end if;
  if attack>defense then b:=jsonb_set(b,array[p::text,'owner'],to_jsonb(who));end if;
 end loop;
 g.move_count:=g.move_count+1;
 if g.move_count=9 then
  for i in 0..8 loop
   if b->i->>'owner'='host' then host_score:=host_score+1;
   elsif b->i->>'owner'='guest' then guest_score:=guest_score+1;end if;
  end loop;
  guest_score:=guest_score+1;
  g.winner:=case when host_score>guest_score then 'host' when guest_score>host_score then 'guest' else 'draw' end;
 end if;
 update public.slay_custom_duel_games set board=b,move_count=g.move_count,
 turn=case when memory_enabled and g.winner is null and coalesce((memory_draws->>who)::integer,0)>0
 and jsonb_array_length(memory_deck)>0 and not coalesce((memory_blocked->>who)::boolean,false)
 then who else enemy end,
 memory_pending=case when memory_enabled and g.winner is null and coalesce((memory_draws->>who)::integer,0)>0
 and jsonb_array_length(memory_deck)>0 and not coalesce((memory_blocked->>who)::boolean,false)
 then who else null end,
 winner=g.winner,updated_at=now()
 where room_id=p_room returning * into g;return g;
end $$;
revoke all on function public.slay_custom_move(uuid,integer,integer) from public,anon;
grant execute on function public.slay_custom_move(uuid,integer,integer) to authenticated;
