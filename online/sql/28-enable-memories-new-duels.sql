-- 28 — Activer les Souvenirs pour les NOUVEAUX duels uniquement.
-- Après 27. Les parties déjà commencées ne sont pas modifiées.
-- Prépare dans la même transaction les mains privées et le paquet secret.
create or replace function public.slay_custom_initialize_memory_game()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r public.slay_rooms%rowtype;
  h jsonb; g jsonb; shuffled jsonb;
begin
  select * into r from public.slay_rooms where id=new.room_id;
  if not found or r.host_id is null or r.guest_id is null then
    raise exception 'Salon incomplet pour les Souvenirs';
  end if;
  select cards into h from public.slay_custom_duel_decks
  where room_id=new.room_id and player_id=r.host_id;
  select cards into g from public.slay_custom_duel_decks
  where room_id=new.room_id and player_id=r.guest_id;
  if jsonb_typeof(h)<>'array' or jsonb_array_length(h)<>5
     or jsonb_typeof(g)<>'array' or jsonb_array_length(g)<>5
  then raise exception 'Deux decks validés requis pour les Souvenirs';end if;
  insert into public.slay_custom_duel_hands(room_id,player_id,cards)
  values(new.room_id,r.host_id,h),(new.room_id,r.guest_id,g)
  on conflict(room_id,player_id) do nothing;
  select coalesce(jsonb_agg(id order by random()),'[]'::jsonb)
    into shuffled
  from (select c.id from public.slay_memory_catalog c
   cross join lateral generate_series(1,case when c.id='master' then 1
    when c.id='rest' then 10 else 2 end)) entries(id);
  insert into public.slay_custom_memory_secret(room_id,deck)
    values(new.room_id,shuffled)
    on conflict(room_id) do nothing;
  update public.slay_custom_duel_games
  set memory_enabled=true,memory_hands_ready=true,
      memory_draws='{"host":2,"guest":2}'::jsonb,
      memory_joker_choices='{}'::jsonb,
      updated_at=now()
  where room_id=new.room_id;
  return new;
end $$;
drop trigger if exists slay_custom_initialize_memory_game_trigger
 on public.slay_custom_duel_games;
create trigger slay_custom_initialize_memory_game_trigger
 after insert on public.slay_custom_duel_games
 for each row execute function public.slay_custom_initialize_memory_game();
revoke all on function public.slay_custom_initialize_memory_game() from public,anon,authenticated;
