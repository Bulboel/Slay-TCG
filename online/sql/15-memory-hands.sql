-- 15 — Mains de duel indépendantes des decks : fondation de Retrouvailles.
-- À exécuter après 14. Migration additive et inactive par défaut.
-- Les decks validés restent immuables; aucune partie existante n'est modifiée.
-- L'échange effectif et le moteur de pose seront raccordés ensuite.
create table if not exists public.slay_custom_duel_hands (
 room_id uuid not null references public.slay_rooms(id) on delete cascade,
 player_id uuid not null,
 cards jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(room_id,player_id),
 constraint slay_custom_duel_hands_cards_array check(jsonb_typeof(cards)='array')
);
alter table public.slay_custom_duel_hands enable row level security;
revoke all on public.slay_custom_duel_hands from public,anon,authenticated;
grant select on public.slay_custom_duel_hands to authenticated;
drop policy if exists slay_custom_duel_hands_read on public.slay_custom_duel_hands;
create policy slay_custom_duel_hands_read on public.slay_custom_duel_hands
 for select to authenticated using(
 exists(select 1 from public.slay_rooms r where r.id=room_id
 and (r.host_id=auth.uid() or r.guest_id=auth.uid()))
 );
alter table public.slay_custom_duel_games
 add column if not exists memory_hands_ready boolean not null default false;

-- Prépare des copies des deux mains, sans toucher aux decks originaux.
-- Fonction utilisable uniquement avant le premier coup; une seconde
-- invocation n'écrase jamais les mains déjà préparées.
create or replace function public.slay_custom_prepare_hands(p_room uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 host_cards jsonb;guest_cards jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room for update;
 if not found or (r.host_id is distinct from auth.uid() and r.guest_id is distinct from auth.uid())
 then raise exception 'Salon inaccessible';end if;
 if r.guest_id is null then raise exception 'Il faut deux joueurs';end if;
 select * into g from public.slay_custom_duel_games where room_id=p_room for update;
 if not found then raise exception 'Duel non démarré';end if;
 if g.memory_hands_ready then return true;end if;
 if g.move_count<>0 or g.board<>'[null,null,null,null,null,null,null,null,null]'::jsonb
 then raise exception 'Les mains ne peuvent être préparées qu''avant le premier coup';end if;
 select cards into host_cards from public.slay_custom_duel_decks
 where room_id=p_room and player_id=r.host_id;
 select cards into guest_cards from public.slay_custom_duel_decks
 where room_id=p_room and player_id=r.guest_id;
 if jsonb_typeof(host_cards)<>'array' or jsonb_array_length(host_cards)<>5
 or jsonb_typeof(guest_cards)<>'array' or jsonb_array_length(guest_cards)<>5
 then raise exception 'Les deux decks de cinq cartes sont requis';end if;
 insert into public.slay_custom_duel_hands(room_id,player_id,cards)
 values(p_room,r.host_id,host_cards),(p_room,r.guest_id,guest_cards)
 on conflict(room_id,player_id) do nothing;
 update public.slay_custom_duel_games set memory_hands_ready=true,updated_at=now()
 where room_id=p_room;
 return true;
end $$;
revoke all on function public.slay_custom_prepare_hands(uuid) from public,anon;
grant execute on function public.slay_custom_prepare_hands(uuid) to authenticated;
