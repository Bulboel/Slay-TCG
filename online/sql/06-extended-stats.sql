-- Correctif validation des decks (à exécuter après 03-custom-decks.sql).
-- Les règles officielles autorisent 3 cartes rares et 1 divine.
-- Les statistiques incluent 0, A (=10), A+ (=11) et leurs prolongements, convertis en nombres par le client.
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
      or jsonb_typeof(c->'name')<>'string' or length(c->>'name') not between 0 and 200
      or jsonb_typeof(c->'v')<>'array' or jsonb_array_length(c->'v')<>4
      or jsonb_typeof(c->'rarity')<>'string'
      or c->>'rarity' not in ('common','uncommon','rare','alternative','divine','parallel')
   then raise exception 'Carte invalide : %', coalesce(c->>'name','inconnue'); end if;
   for n in 0..3 loop
     if jsonb_typeof(c->'v'->n)<>'number' or (c->'v'->>n)::numeric not between 1 and 10
        or (c->'v'->>n)::numeric <> trunc((c->'v'->>n)::numeric)
     then raise exception 'Statistique invalide pour %',c->>'name'; end if;
   end loop;
   if c->>'rarity'='rare' then rares:=rares+1; end if;
   if c->>'rarity'='divine' then divines:=divines+1; end if;
   if (select count(*) from jsonb_array_elements(p_cards) x where x->>'name'=c->>'name')>2
   then raise exception 'Deux exemplaires maximum par nom'; end if;
 end loop;
 if rares>3 then raise exception 'Trois cartes rares maximum'; end if;
 if divines>1 then raise exception 'Une carte divine maximum'; end if;
 insert into public.slay_custom_duel_decks(room_id,player_id,cards)
 values(p_room,auth.uid(),p_cards)
 on conflict(room_id,player_id) do update set cards=excluded.cards,updated_at=now();
end $$;
revoke all on function public.slay_custom_submit_deck(uuid,jsonb) from public,anon;
grant execute on function public.slay_custom_submit_deck(uuid,jsonb) to authenticated;
