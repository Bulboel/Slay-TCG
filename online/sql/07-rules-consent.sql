-- 07 — Règles officielles et consentement bilatéral. Exécuter après 06.
-- Les parties déjà commencées conservent leur règle classique.
alter table public.slay_rooms add column if not exists custom_rule text not null default 'basic-open';
alter table public.slay_rooms add column if not exists custom_rule_version integer not null default 0;
alter table public.slay_rooms add column if not exists custom_rule_accepted_version integer not null default -1;
create or replace function public.slay_custom_set_rule(p_room uuid,p_rule text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;
begin
 select * into r from public.slay_rooms where id=p_room for update;
 if not found or r.host_id is distinct from auth.uid() then raise exception 'Seul le créateur peut choisir les règles'; end if;
 if exists(select 1 from public.slay_custom_duel_games where room_id=p_room) then raise exception 'Duel déjà commencé'; end if;
 if p_rule not in ('basic-open','basic-dark','same-open','same-dark','plus-open','plus-dark','elements-open','elements-dark')
 then raise exception 'Règle inconnue'; end if;
 if r.custom_rule is distinct from p_rule then
  update public.slay_rooms set custom_rule=p_rule,custom_rule_version=custom_rule_version+1,
  custom_rule_accepted_version=-1 where id=p_room;
 end if;
end $$;
create or replace function public.slay_custom_accept_rule(p_room uuid,p_version integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;
begin
 select * into r from public.slay_rooms where id=p_room for update;
 if not found or r.guest_id is distinct from auth.uid() then raise exception 'Seul l’invité accepte les règles'; end if;
 if exists(select 1 from public.slay_custom_duel_games where room_id=p_room) then raise exception 'Duel déjà commencé'; end if;
 if p_version<>r.custom_rule_version then raise exception 'Les règles ont changé : relis la proposition'; end if;
 update public.slay_rooms set custom_rule_accepted_version=p_version where id=p_room;
end $$;
create or replace function public.slay_custom_start(p_room uuid)
returns public.slay_custom_duel_games language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype; g public.slay_custom_duel_games%rowtype;
begin
 select * into r from public.slay_rooms where id=p_room for update;
 if not found or auth.uid() is null or (r.host_id<>auth.uid() and r.guest_id is distinct from auth.uid())
 then raise exception 'Salon inaccessible'; end if;
 if r.guest_id is null then raise exception 'Deux joueurs nécessaires'; end if;
 if r.custom_rule_accepted_version<>r.custom_rule_version then raise exception 'L’invité doit accepter les règles'; end if;
 if not exists(select 1 from public.slay_custom_duel_decks where room_id=p_room and player_id=r.host_id)
 or not exists(select 1 from public.slay_custom_duel_decks where room_id=p_room and player_id=r.guest_id)
 then raise exception 'Les deux decks doivent être prêts'; end if;
 insert into public.slay_custom_duel_games(room_id) values(p_room) on conflict(room_id) do nothing;
 select * into g from public.slay_custom_duel_games where room_id=p_room;return g;
end $$;
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
 update public.slay_custom_duel_games set board=b,move_count=g.move_count,turn=enemy,winner=g.winner,updated_at=now()
 where room_id=p_room returning * into g;return g;
end $$;
revoke all on function public.slay_custom_set_rule(uuid,text) from public,anon;
revoke all on function public.slay_custom_accept_rule(uuid,integer) from public,anon;
grant execute on function public.slay_custom_set_rule(uuid,text) to authenticated;
grant execute on function public.slay_custom_accept_rule(uuid,integer) to authenticated;
