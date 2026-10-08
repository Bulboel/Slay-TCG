-- 23 — Fenêtre de réaction du Joker.
-- À exécuter après 22. Ne pas activer memory_enabled.
-- Si l'adversaire possède un Joker, le Souvenir révélé attend sa réponse.
alter table public.slay_custom_duel_games
 add column if not exists memory_reaction text
 check(memory_reaction in ('pending','keep'));

create or replace function public.slay_custom_memory_reaction_guard()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare drawer text;reactor text;
begin
 -- Une nouvelle révélation ouvre une fenêtre si le joueur opposé
 -- possède un Joker. La résolution ne peut alors pas être immédiate.
 if old.memory_reveal is null and new.memory_reveal is not null then
   drawer:=new.memory_reveal->>'owner';
   reactor:=case when drawer='host' then 'guest' else 'host' end;
   if drawer in ('host','guest')
      and coalesce((new.memory_joker->>reactor)::boolean,false)
      and new.memory_reveal->>'id'<>'master'
   then new.memory_reaction:='pending';
   else new.memory_reaction:=null;end if;
 end if;
 if old.memory_reveal is not null and new.memory_reveal is null then
   if old.memory_reaction='pending' then
     drawer:=old.memory_reveal->>'owner';
     reactor:=case when drawer='host' then 'guest' else 'host' end;
     -- L'annulation (SQL 22) consomme le Joker dans la même transaction.
     -- Toutes les autres résolutions doivent attendre la réponse.
     if coalesce((new.memory_joker->>reactor)::boolean,false) then
       raise exception 'Attends la réaction du Joker adverse';end if;
   end if;
   new.memory_reaction:=null;
 end if;
 return new;
end $$;
drop trigger if exists slay_custom_memory_reaction_guard_trigger
 on public.slay_custom_duel_games;
create trigger slay_custom_memory_reaction_guard_trigger
 before update of memory_reveal on public.slay_custom_duel_games
 for each row execute function public.slay_custom_memory_reaction_guard();

create or replace function public.slay_custom_memory_joker_keep(p_room uuid)
returns public.slay_custom_duel_games
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype;g public.slay_custom_duel_games%rowtype;
 reactor text;drawer text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into r from public.slay_rooms where id=p_room;
 if not found then raise exception 'Salon inconnu';end if;
 reactor:=case when r.host_id=auth.uid() then 'host'
               when r.guest_id=auth.uid() then 'guest' else null end;
 if reactor is null then raise exception 'Accès refusé';end if;
 drawer:=case when reactor='host' then 'guest' else 'host' end;
 select * into g from public.slay_custom_duel_games
 where room_id=p_room for update;
 if not found or not g.memory_enabled or g.winner is not null
 or g.memory_reveal is null or g.memory_reaction is distinct from 'pending'
 or g.memory_reveal->>'owner' is distinct from drawer
 or g.memory_pending is distinct from drawer
 or not coalesce((g.memory_joker->>reactor)::boolean,false)
 then raise exception 'Aucune réaction Joker à conserver';end if;
 update public.slay_custom_duel_games
 set memory_reaction='keep',updated_at=now()
 where room_id=p_room returning * into g;
 return g;
end $$;
revoke all on function public.slay_custom_memory_joker_keep(uuid) from public,anon;
grant execute on function public.slay_custom_memory_joker_keep(uuid) to authenticated;
-- Les résolutions existantes peuvent désormais passer après « conserver ».
-- La duplication du Joker sera ajoutée ultérieurement.
