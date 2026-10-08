// Slay TCG — client Supabase pour les salons privés (prototype).
// Ce module n'est pas encore chargé par index.html : la version publique reste inchangée.
// L'authentification anonyme doit être activée dans Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://uewpcnyewfyicsszqrjj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8L3GgKLt_CAqcV5Hb1oO5A_ECIbTu6B';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

export async function ensureOnlineIdentity() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user) return sessionData.session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

export async function createOnlineRoom() {
  await ensureOnlineIdentity();
  const { data, error } = await supabase.rpc('slay_create_room');
  if (error) throw error;
  if (!Array.isArray(data) || !data[0]?.room_id || !data[0]?.invitation_code) {
    throw new Error('Réponse de création de salon invalide.');
  }
  return data[0];
}

export async function joinOnlineRoom(code) {
  await ensureOnlineIdentity();
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error('Le code doit contenir exactement 6 caractères.');
  }
  const { data, error } = await supabase.rpc('slay_join_room', { p_code: normalized });
  if (error) throw error;
  return data;
}

export async function getOnlineRoom(roomId) {
  await ensureOnlineIdentity();
  const { data, error } = await supabase.from('slay_rooms')
    .select('id,room_code,host_id,guest_id,status,expires_at')
    .eq('id', roomId).single();
  if (error) throw error;
  return data;
}

// La validation des decks, les coups et les captures seront implémentés côté serveur.
// Ne jamais envoyer de résultat de partie directement depuis le navigateur.
