-- 35 — Apparence du salon choisie par son créateur.
-- Exécuter dans Supabase SQL Editor.
alter table public.slay_rooms
 add column if not exists board_theme text not null default 'classic',
 add column if not exists card_back text not null default 'official',
 add column if not exists score_ornament text not null default 'none';

create or replace function public.slay_custom_set_room_cosmetics(
 p_room uuid,p_theme text,p_back text,p_ornament text
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;
begin
 select * into r from public.slay_rooms where id=p_room for update;
 if not found or auth.uid() is distinct from r.host_id then
  raise exception 'Seul le créateur du salon peut choisir son apparence';
 end if;
 if p_theme not in ('classic','arcane','jordan','elements-wheel','treasure')
 or p_back not in ('official','sun','mist','treasure-gold','caleizis-crying','jordan-cool',
 'element-water','element-wind','element-fire','element-earth','element-ice','element-lightning')
 or p_ornament not in ('none','treasure','rainbow') then
  raise exception 'Apparence du salon inconnue';
 end if;
 update public.slay_rooms set board_theme=p_theme,card_back=p_back,score_ornament=p_ornament where id=p_room;
end $$;
revoke all on function public.slay_custom_set_room_cosmetics(uuid,text,text,text) from public,anon;
grant execute on function public.slay_custom_set_room_cosmetics(uuid,text,text,text) to authenticated;
