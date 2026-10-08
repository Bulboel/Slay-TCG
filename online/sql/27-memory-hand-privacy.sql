-- 27 — Confidentialité des mains synchronisées.
-- Après SQL 26. Aucun changement de gameplay, Souvenirs toujours inactifs.
-- SQL 15 permettait aux deux participants de lire les deux mains.
-- Restreindre chaque joueur à sa propre main.
drop policy if exists slay_custom_duel_hands_read on public.slay_custom_duel_hands;
create policy slay_custom_duel_hands_read
 on public.slay_custom_duel_hands for select to authenticated
 using (
   player_id = (select auth.uid())
   and exists (
     select 1 from public.slay_rooms r
     where r.id=room_id
       and (r.host_id=(select auth.uid()) or r.guest_id=(select auth.uid()))
   )
 );
-- Les fonctions SECURITY DEFINER continuent à gérer les échanges.
-- Ne pas publier les mains complètes dans les snapshots accessibles à l'adversaire.
