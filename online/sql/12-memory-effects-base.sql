-- 12 — Résolution serveur des Souvenirs : première série d'effets.
-- Exécuter après 11. N'active pas memory_enabled.
-- Gère : repos, fromage, coincé, feu, caillou et maître du jeu.
-- Cible sphérique, araignées blanches et retrouvailles nécessitent
-- encore les mécanismes de déplacement et de modification des mains.
create or replace function public.slay_custom_resolve_memory(
 p_room uuid,p_position integer default null)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.slay_rooms%rowtype;
 g public.slay_custom_duel_games%rowtype;
 who text;enemy text;effect_id text;
 b jsonb;slot jsonb;v jsonb;new_values jsonb:='[]'::jsonb;
 i integer;value integer;delta integer;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu'; end if;
 who:=case when r.host_id=auth.uid() then 'host'
           when r.guest_id=auth.uid() then 'guest' else null end;
 if who is null then raise exception 'Accès refusé'; end if;
 enemy:=case when who='host' then 'guest' else 'host' end;
 select * into g from public.slay_custom_duel_games
 where room_id=p_room for update;
 if not found or not g.memory_enabled then
   raise exception 'Souvenirs en ligne non encore activés';
 end if;
 if g.winner is not null or g.memory_pending is distinct from who
    or g.turn<>who then raise exception 'Ce n''est pas la phase de Souvenir'; end if;
 if g.memory_reveal is null
    or g.memory_reveal->>'owner' is distinct from who
    or g.memory_reveal->>'resolved' is distinct from 'false'
 then raise exception 'Aucun Souvenir à résoudre'; end if;
 effect_id:=g.memory_reveal->>'id';
 if effect_id not in ('rest','cheese','stuck','fire','rock','master')
 then raise exception 'Effet % en attente de son moteur sécurisé',effect_id; end if;
 b:=g.board;
 if effect_id in ('fire','rock') then
   if p_position is null or p_position not between 0 and 8 then
     raise exception 'Choisis une case de 1 à 9'; end if;
   slot:=b->p_position;
   if slot is null or slot='null'::jsonb or slot->>'owner'<>who
   then raise exception 'Choisis une de tes cartes sur le plateau'; end if;
   v:=slot->'card'->'v';
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v)<>4
   then raise exception 'Valeurs de carte invalides'; end if;
   delta:=case when effect_id='rock' then 1 else -1 end;
   for i in 0..3 loop
     value:=greatest(1,(v->>i)::integer+delta);
     new_values:=new_values||to_jsonb(value);
   end loop;
   b:=jsonb_set(b,array[p_position::text,'card','v'],new_values);
 elsif effect_id='cheese' then
   g.memory_blind:=jsonb_set(g.memory_blind,array[enemy],'true'::jsonb);
 elsif effect_id='stuck' then
   g.memory_blind:=jsonb_set(g.memory_blind,array[who],'true'::jsonb);
 elsif effect_id='master' then
   g.memory_blocked:=jsonb_set(g.memory_blocked,array[who],'true'::jsonb);
   g.memory_joker:=jsonb_set(g.memory_joker,array[who],'true'::jsonb);
 end if;
 g.memory_discard:=g.memory_discard||to_jsonb(effect_id);
 update public.slay_custom_duel_games
 set board=b,memory_blind=g.memory_blind,memory_blocked=g.memory_blocked,
 memory_joker=g.memory_joker,memory_discard=g.memory_discard,
 memory_reveal=null,memory_pending=null,
 turn=enemy,updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_resolve_memory(uuid,integer) from public,anon;
grant execute on function public.slay_custom_resolve_memory(uuid,integer) to authenticated;
