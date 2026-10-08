-- Slay TCG — laboratoire PVP synchronisé (sans impact sur le jeu publié).
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Les decks sont FIXES pour ce test : les collections des joueurs ne sont pas encore utilisées.
-- Règles classiques seulement. Aucun accès direct en écriture depuis le navigateur.
create table if not exists public.slay_online_test_games (
  room_id uuid primary key references public.slay_rooms(id) on delete cascade,
  board jsonb not null default '[]'::jsonb,
  turn text not null default 'host' check (turn in ('host','guest')),
  move_count integer not null default 0 check (move_count between 0 and 9),
  winner text check (winner in ('host','guest','draw')),
  updated_at timestamptz not null default now()
);
alter table public.slay_online_test_games enable row level security;
revoke all on public.slay_online_test_games from anon, authenticated;
grant select on public.slay_online_test_games to authenticated;
drop policy if exists slay_online_test_games_read on public.slay_online_test_games;
create policy slay_online_test_games_read on public.slay_online_test_games for select to authenticated
using (exists (select 1 from public.slay_rooms r where r.id=room_id and (r.host_id=auth.uid() or r.guest_id=auth.uid())));

create or replace function public.slay_test_start(p_room uuid)
returns public.slay_online_test_games language plpgsql security definer
set search_path = public, pg_temp as $$
declare r public.slay_rooms%rowtype; g public.slay_online_test_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into r from public.slay_rooms where id=p_room for update;
  if not found or (r.host_id<>auth.uid() and r.guest_id is distinct from auth.uid()) then
    raise exception 'Salon inaccessible';
  end if;
  if r.guest_id is null then raise exception 'Deux joueurs sont nécessaires'; end if;
  insert into public.slay_online_test_games(room_id,board)
  values(p_room,'[null,null,null,null,null,null,null,null,null]'::jsonb)
  on conflict (room_id) do nothing;
  select * into g from public.slay_online_test_games where room_id=p_room;
  return g;
end $$;

create or replace function public.slay_test_move(p_room uuid,p_hand_index integer,p_position integer)
returns public.slay_online_test_games language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  r public.slay_rooms%rowtype; g public.slay_online_test_games%rowtype;
  who text; enemy text; card jsonb; target jsonb; b jsonb;
  h jsonb := '[{"id":"kala","v":[6,5,7,4]},{"id":"bolduc","v":[7,4,5,5]},{"id":"jhimm","v":[4,7,5,7]},{"id":"grimgors","v":[8,2,3,8]},{"id":"araignee","v":[3,6,5,4]}]'::jsonb;
  a jsonb := '[{"id":"hilam","v":[9,7,8,10]},{"id":"kayla","v":[8,10,9,7]},{"id":"gardienne","v":[7,7,5,3]},{"id":"frolgor","v":[7,7,2,2]},{"id":"ven","v":[8,6,2,4]}]'::jsonb;
  i integer; p integer; side integer; opposite integer; rr integer; cc integer;
  dr integer[] := array[-1,0,1,0]; dc integer[] := array[0,1,0,-1];
  played integer[] := array[]::integer[]; owner text; host_score integer := 0; guest_score integer := 0;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into r from public.slay_rooms where id=p_room;
  if not found then raise exception 'Salon inconnu'; end if;
  if auth.uid()=r.host_id then who:='host';
  elsif auth.uid()=r.guest_id then who:='guest';
  else raise exception 'Tu ne participes pas à ce salon'; end if;
  select * into g from public.slay_online_test_games where room_id=p_room for update;
  if not found then raise exception 'Démarre le test avant de jouer'; end if;
  if g.winner is not null or g.move_count=9 then raise exception 'Partie terminée'; end if;
  if g.turn<>who then raise exception 'Ce n''est pas ton tour'; end if;
  if p_position is null or p_position<0 or p_position>8 then raise exception 'Case invalide'; end if;
  if p_hand_index is null or p_hand_index<0 or p_hand_index>4 then raise exception 'Carte invalide'; end if;
  b:=g.board;
  if jsonb_array_length(b)<>9 then raise exception 'Plateau invalide'; end if;
  if b->p_position <> 'null'::jsonb then raise exception 'Case occupée'; end if;
  -- Les cartes jouées sont identifiées par leur index ORIGINAL (0..4).
  for i in 0..8 loop
    if b->i <> 'null'::jsonb and b->i->>'owner'=who then
      played:=array_append(played,(b->i->>'hand_index')::integer);
    end if;
  end loop;
  -- Une carte capturée reste une carte déjà jouée : regarder TOUS les propriétaires initiaux.
  played:=array[]::integer[];
  for i in 0..8 loop
    if b->i <> 'null'::jsonb and b->i->>'played_by'=who then
      played:=array_append(played,(b->i->>'hand_index')::integer);
    end if;
  end loop;
  if p_hand_index=any(played) then raise exception 'Carte déjà jouée'; end if;
  if who='host' then card:=h->p_hand_index;enemy:='guest';
  else card:=a->p_hand_index;enemy:='host'; end if;
  b:=jsonb_set(b,array[p_position::text],jsonb_build_object('owner',who,'played_by',who,'hand_index',p_hand_index,'card',card));
  for side in 0..3 loop
    rr:=p_position/3+dr[side+1]; cc:=p_position%3+dc[side+1];
    if rr<0 or rr>2 or cc<0 or cc>2 then continue; end if;
    p:=rr*3+cc;target:=b->p;
    if target='null'::jsonb or target->>'owner'=who then continue; end if;
    opposite:=(side+2)%4;
    if (card->'v'->>side)::integer>(target->'card'->'v'->>opposite)::integer then
      b:=jsonb_set(b,array[p::text,'owner'],to_jsonb(who));
    end if;
  end loop;
  g.move_count:=g.move_count+1;
  if g.move_count=9 then
    for i in 0..8 loop
      owner:=b->i->>'owner';
      if owner='host' then host_score:=host_score+1;
      elsif owner='guest' then guest_score:=guest_score+1; end if;
    end loop;
    -- Une carte reste en main à la fin des neuf tours.
    if (g.move_count%2)=1 then guest_score:=guest_score+1; end if;
    g.winner:=case when host_score>guest_score then 'host' when guest_score>host_score then 'guest' else 'draw' end;
  end if;
  update public.slay_online_test_games
  set board=b,move_count=g.move_count,turn=enemy,winner=g.winner,updated_at=now()
  where room_id=p_room returning * into g;
  return g;
end $$;
revoke all on function public.slay_test_start(uuid) from public,anon;
revoke all on function public.slay_test_move(uuid,integer,integer) from public,anon;
grant execute on function public.slay_test_start(uuid) to authenticated;
grant execute on function public.slay_test_move(uuid,integer,integer) to authenticated;
