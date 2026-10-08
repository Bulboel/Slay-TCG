-- 32 — Pseudonymes de salon synchronisés et modifiables.
alter table public.slay_rooms
 add column if not exists host_nickname text,
 add column if not exists guest_nickname text;

create or replace function public.slay_custom_set_nickname(p_room uuid,p_nickname text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.slay_rooms%rowtype; nick text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 nick:=btrim(coalesce(p_nickname,''));
 if char_length(nick)<2 or char_length(nick)>20
    or nick !~ '^[[:alnum:]À-ÿ _.-]+$'
 then raise exception 'Pseudo : 2 à 20 caractères (lettres, chiffres, espaces, _, . ou -)';end if;
 select * into r from public.slay_rooms where id=p_room for update;
 if not found then raise exception 'Salon inconnu';end if;
 if auth.uid()=r.host_id then
  update public.slay_rooms set host_nickname=nick where id=p_room;
 elsif auth.uid()=r.guest_id then
  update public.slay_rooms set guest_nickname=nick where id=p_room;
 else raise exception 'Accès refusé';end if;
end $$;
revoke all on function public.slay_custom_set_nickname(uuid,text) from public,anon;
grant execute on function public.slay_custom_set_nickname(uuid,text) to authenticated;
