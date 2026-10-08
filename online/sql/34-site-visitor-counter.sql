-- Triade d'Hackénia — compteur de visites anonymes.
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Une visite est comptée une fois par onglet/session navigateur (sessionStorage côté client).
-- Ce compteur ne collecte ni IP, ni compte, ni identifiant personnel.
-- Attention : une personne peut générer plusieurs visites, et l'API publique peut être sollicitée artificiellement.
create table if not exists public.triade_site_visits (
  id integer primary key default 1 check (id = 1),
  total bigint not null default 0 check (total >= 0)
);
insert into public.triade_site_visits (id,total) values (1,0)
on conflict (id) do nothing;
revoke all on public.triade_site_visits from public, anon, authenticated;
alter table public.triade_site_visits enable row level security;

create or replace function public.triade_site_visit_count(p_increment boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_total bigint;
begin
  if p_increment then
    update public.triade_site_visits set total=total+1 where id=1 returning total into v_total;
  else
    select total into v_total from public.triade_site_visits where id=1;
  end if;
  return coalesce(v_total,0);
end;
$$;
revoke all on function public.triade_site_visit_count(boolean) from public;
grant execute on function public.triade_site_visit_count(boolean) to anon, authenticated;
