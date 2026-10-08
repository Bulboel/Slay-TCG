-- 08 — État des Souvenirs synchronisés (préparation du moteur).
-- À exécuter après 07. N'active PAS encore la pioche : les effets doivent être
-- intégrés à slay_custom_move avant d'autoriser les nouveaux tours.
-- Migration additive : les duels en cours restent sur l'ancien fonctionnement.
alter table public.slay_custom_duel_games
  add column if not exists memory_enabled boolean not null default false,
  add column if not exists memory_draws jsonb not null default '{"host":2,"guest":2}'::jsonb,
  add column if not exists memory_deck jsonb not null default '[]'::jsonb,
  add column if not exists memory_discard jsonb not null default '[]'::jsonb,
  add column if not exists memory_pending text check (memory_pending in ('host','guest')),
  add column if not exists memory_reveal jsonb,
  add column if not exists memory_blocked jsonb not null default '{"host":false,"guest":false}'::jsonb,
  add column if not exists memory_blind jsonb not null default '{"host":false,"guest":false}'::jsonb,
  add column if not exists memory_joker jsonb not null default '{"host":false,"guest":false}'::jsonb;
comment on column public.slay_custom_duel_games.memory_enabled is
  'Activation réservée à la future version transactionnelle des Souvenirs; false par défaut.';
-- Catalogue contrôlé côté base, identique à celui du jeu original.
create table if not exists public.slay_memory_catalog (
  id text primary key,
  cost integer not null default 1 check(cost between 1 and 2),
  requires_choice boolean not null default false
);
revoke all on public.slay_memory_catalog from public,anon;
alter table public.slay_memory_catalog enable row level security;
grant select on public.slay_memory_catalog to authenticated;
drop policy if exists slay_memory_catalog_read on public.slay_memory_catalog;
create policy slay_memory_catalog_read on public.slay_memory_catalog
for select to authenticated using(true);
insert into public.slay_memory_catalog(id,cost,requires_choice) values
 ('target',1,true),('fire',1,true),('spider',1,false),('rock',1,true),
 ('cheese',1,false),('reunion',1,true),('stuck',1,false),
 ('master',2,false),('rest',1,false)
on conflict(id) do update set cost=excluded.cost,requires_choice=excluded.requires_choice;
