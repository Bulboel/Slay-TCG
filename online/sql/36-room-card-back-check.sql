-- 36 — Autoriser tous les dos de cartes proposés dans le salon PvP.
-- Corrige l'erreur slay_rooms_card_back_check lors de la création du salon.
-- À exécuter dans Supabase SQL Editor après 35-room-cosmetics.sql.
BEGIN;
ALTER TABLE public.slay_rooms DROP CONSTRAINT IF EXISTS slay_rooms_card_back_check;
ALTER TABLE public.slay_rooms ADD CONSTRAINT slay_rooms_card_back_check
CHECK (card_back IN (
  'official','sun','mist','treasure-gold','caleizis-crying','jordan-cool',
  'element-water','element-wind','element-fire','element-earth','element-ice','element-lightning'
));
COMMIT;
