-- Triade of Hackenia — phase 3 : decks personnels en duel synchronisé.
-- Exécuter dans Supabase SQL Editor après 02-synced-test.sql.
-- Prototype : les cartes sont contrôlées côté serveur pour leur format et leurs limites,
-- mais la propriété réelle dans la collection locale n'est PAS encore vérifiable.
-- Ne modifie pas les parties de démonstration existantes.
create table if not exists public.slay_custom_duel_decks (
  room_id uuid not null references public.slay_rooms(id) on delete cascade,
  player_id uuid not null,
  cards jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (room_id,player_id)
);
alter table public.slay_custom_duel_decks enable row level security;
revoke all on public.slay_custom_duel_decks from public,anon,authenticated;
grant select on public.slay_custom_duel_decks to authenticated;
drop policy if exists slay_custom_decks_read on public.slay_custom_duel_decks;
create policy slay_custom_decks_read on public.slay_custom_duel_decks
for select to authenticated using (
  exists (select 1 from public.slay_rooms r where r.id=room_id
    and (r.host_id=auth.uid() or r.guest_id=auth.uid()))
);
create table if not exists public.slay_custom_duel_games (
  room_id uuid primary key references public.slay_rooms(id) on delete cascade,
  board jsonb not null default '[null,null,null,null,null,null,null,null,null]'::jsonb,
  turn text not null default 'host' check (turn in ('host','guest')),
  move_count integer not null default 0 check (move_count between 0 and 9),
  winner text check (winner in ('host','guest','draw')),
  updated_at timestamptz not null default now()
);
alter table public.slay_custom_duel_games enable row level security;
revoke all on public.slay_custom_duel_games from public,anon,authenticated;
grant select on public.slay_custom_duel_games to authenticated;
drop policy if exists slay_custom_games_read on public.slay_custom_duel_games;
create policy slay_custom_games_read on public.slay_custom_duel_games
for select to authenticated using (
  exists (select 1 from public.slay_rooms r where r.id=room_id
    and (r.host_id=auth.uid() or r.guest_id=auth.uid()))
);

create or replace function public.slay_custom_submit_deck(p_room uuid,p_cards jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype; c jsonb; n integer; rares integer:=0; divines integer:=0;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into r from public.slay_rooms where id=p_room for update;
 if not found or (r.host_id<>auth.uid() and r.guest_id is distinct from auth.uid())
 then raise exception 'Salon inaccessible'; end if;
 if exists(select 1 from public.slay_custom_duel_games where room_id=p_room)
 then raise exception 'Duel déjà commencé'; end if;
 if jsonb_typeof(p_cards)<>'array' or jsonb_array_length(p_cards)<>5
 then raise exception 'Le deck doit contenir cinq cartes'; end if;
 for c in select value from jsonb_array_elements(p_cards) loop
   if jsonb_typeof(c)<>'object' or jsonb_typeof(c->'id')<>'string'
      or length(c->>'id') not between 1 and 60
      or jsonb_typeof(c->'name')<>'string' or length(c->>'name') not between 1 and 100
      or jsonb_typeof(c->'v')<>'array' or jsonb_array_length(c->'v')<>4
      or jsonb_typeof(c->'rarity')<>'string'
      or c->>'rarity' not in ('common','uncommon','rare','alternative','divine','parallel')
   then raise exception 'Carte invalide'; end if;
   for n in 0..3 loop
     if jsonb_typeof(c->'v'->n)<>'number' or (c->'v'->>n)::numeric not between 1 and 10
        or (c->'v'->>n)::numeric <> trunc((c->'v'->>n)::numeric)
     then raise exception 'Statistique invalide'; end if;
   end loop;
   if c->>'rarity'='rare' then rares:=rares+1; end if;
   if c->>'rarity'='divine' then divines:=divines+1; end if;
   if (select count(*) from jsonb_array_elements(p_cards) x where x->>'name'=c->>'name')>2
   then raise exception 'Deux exemplaires maximum par nom'; end if;
 end loop;
 if rares>2 or divines>1 then raise exception 'Limite de rareté dépassée'; end if;
 insert into public.slay_custom_duel_decks(room_id,player_id,cards)
 values(p_room,auth.uid(),p_cards)
 on conflict(room_id,player_id) do update set cards=excluded.cards,updated_at=now();
end $$;

create or replace function public.slay_custom_start(p_room uuid)
returns public.slay_custom_duel_games language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype; g public.slay_custom_duel_games%rowtype;
begin
 select * into r from public.slay_rooms where id=p_room for update;
 if not found or auth.uid() is null or (r.host_id<>auth.uid() and r.guest_id is distinct from auth.uid())
 then raise exception 'Salon inaccessible'; end if;
 if r.guest_id is null then raise exception 'Deux joueurs nécessaires'; end if;
 if not exists(select 1 from public.slay_custom_duel_decks where room_id=p_room and player_id=r.host_id)
 or not exists(select 1 from public.slay_custom_duel_decks where room_id=p_room and player_id=r.guest_id)
 then raise exception 'Les deux decks doivent être prêts'; end if;
 insert into public.slay_custom_duel_games(room_id) values(p_room)
 on conflict(room_id) do nothing;
 select * into g from public.slay_custom_duel_games where room_id=p_room;
 return g;
end $$;

create or replace function public.slay_custom_move(p_room uuid,p_hand_index integer,p_position integer)
returns public.slay_custom_duel_games language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype; g public.slay_custom_duel_games%rowtype;
who text; enemy text; cards jsonb; c jsonb; b jsonb; target jsonb;
i integer; side integer; opposite integer; rr integer; cc integer; p integer;
dr integer[]:=array[-1,0,1,0]; dc integer[]:=array[0,1,0,-1];
host_score integer:=0; guest_score integer:=0;
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
 if p_position is null or p_position not between 0 and 8
 or p_hand_index is null or p_hand_index not between 0 and 4
 then raise exception 'Coup invalide'; end if;
 b:=g.board;
 if b->p_position <> 'null'::jsonb then raise exception 'Case occupée'; end if;
 for i in 0..8 loop
   if b->i<>'null'::jsonb and b->i->>'played_by'=who and (b->i->>'hand_index')::integer=p_hand_index
   then raise exception 'Carte déjà jouée'; end if;
 end loop;
 select d.cards into cards from public.slay_custom_duel_decks d
 where d.room_id=p_room and d.player_id=auth.uid();
 if cards is null then raise exception 'Deck absent'; end if;
 c:=cards->p_hand_index;
 b:=jsonb_set(b,array[p_position::text],
 jsonb_build_object('owner',who,'played_by',who,'hand_index',p_hand_index,'card',c));
 for side in 0..3 loop
   rr:=p_position/3+dr[side+1];cc:=p_position%3+dc[side+1];
   if rr<0 or rr>2 or cc<0 or cc>2 then continue; end if;
   p:=rr*3+cc;target:=b->p;
   if target='null'::jsonb or target->>'owner'=who then continue; end if;
   opposite:=(side+2)%4;
   if (c->'v'->>side)::integer>(target->'card'->'v'->>opposite)::integer
   then b:=jsonb_set(b,array[p::text,'owner'],to_jsonb(who)); end if;
 end loop;
 g.move_count:=g.move_count+1;
 if g.move_count=9 then
   for i in 0..8 loop
     if b->i->>'owner'='host' then host_score:=host_score+1;
     elsif b->i->>'owner'='guest' then guest_score:=guest_score+1; end if;
   end loop;
   guest_score:=guest_score+1;
   g.winner:=case when host_score>guest_score then 'host'
     when guest_score>host_score then 'guest' else 'draw' end;
 end if;
 update public.slay_custom_duel_games set board=b,move_count=g.move_count,
 turn=enemy,winner=g.winner,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_submit_deck(uuid,jsonb) from public,anon;
revoke all on function public.slay_custom_start(uuid) from public,anon;
revoke all on function public.slay_custom_move(uuid,integer,integer) from public,anon;
grant execute on function public.slay_custom_submit_deck(uuid,jsonb) to authenticated;
grant execute on function public.slay_custom_start(uuid) to authenticated;
grant execute on function public.slay_custom_move(uuid,integer,integer) to authenticated;
