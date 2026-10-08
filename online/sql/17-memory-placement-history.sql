-- 17 — Historique fiable des poses pour les Souvenirs.
-- Après SQL 16. Migration additive; les parties classiques restent jouables.
-- Chaque nouveau coup est enregistré à partir de la transition du plateau.
-- La vérification move_count évite de confondre un déplacement de Souvenir
-- avec une nouvelle pose.
create or replace function public.slay_custom_record_placement()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
 i integer;old_slot jsonb;new_slot jsonb;
 new_position integer:=-1;new_count integer:=0;
begin
 if new.move_count<>old.move_count+1 then return new;end if;
 if jsonb_typeof(new.board)<>'array' or jsonb_array_length(new.board)<>9
 or jsonb_typeof(old.board)<>'array' or jsonb_array_length(old.board)<>9
 then raise exception 'Plateau invalide';end if;
 for i in 0..8 loop
   old_slot:=old.board->i;new_slot:=new.board->i;
   if old_slot='null'::jsonb and new_slot<>'null'::jsonb then
     new_position:=i;new_count:=new_count+1;
   end if;
 end loop;
 if new_count<>1 then raise exception 'Une pose doit remplir exactement une case';end if;
 new.memory_played_order:=coalesce(old.memory_played_order,'[]'::jsonb)
   ||jsonb_build_array(jsonb_build_object(
      'position',new_position,
      'played_by',new.board->new_position->>'played_by',
      'hand_index',(new.board->new_position->>'hand_index')::integer
   ));
 -- Les mains cachées par « fromage » ou « coincé » redeviennent
 -- visibles après que le joueur concerné a posé sa prochaine carte.
 if new.board->new_position->>'played_by' in ('host','guest') then
   new.memory_blind:=jsonb_set(
     coalesce(new.memory_blind,'{"host":false,"guest":false}'::jsonb),
     array[new.board->new_position->>'played_by'],'false'::jsonb,true);
 end if;
 return new;
end $$;
drop trigger if exists slay_custom_record_placement_trigger
 on public.slay_custom_duel_games;
create trigger slay_custom_record_placement_trigger
 before update of board,move_count on public.slay_custom_duel_games
 for each row execute function public.slay_custom_record_placement();
-- Le SQL 14 cherche la dernière carte présente dans cet historique.
-- Les coups antérieurs à cette migration ne peuvent pas être reconstitués
-- rétroactivement sans journal serveur historique.
