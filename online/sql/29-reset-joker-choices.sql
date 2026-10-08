-- 29 — Réinitialiser les choix du Joker à chaque nouveau Souvenir.
-- Après SQL 28. Évite qu'un ancien choix ne bloque une nouvelle duplication.
create or replace function public.slay_custom_reset_joker_choices()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.memory_reveal is distinct from new.memory_reveal
    and (old.memory_reveal is null or new.memory_reveal is null) then
   new.memory_joker_choices:='{}'::jsonb;
 end if;
 return new;
end $$;
drop trigger if exists slay_custom_reset_joker_choices_trigger
 on public.slay_custom_duel_games;
create trigger slay_custom_reset_joker_choices_trigger
 before update of memory_reveal on public.slay_custom_duel_games
 for each row execute function public.slay_custom_reset_joker_choices();
revoke all on function public.slay_custom_reset_joker_choices() from public,anon,authenticated;
