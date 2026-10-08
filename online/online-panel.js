// PVP en ligne — panneau expérimental ajouté au menu PVP existant.
// Ne modifie ni les règles du PVP local ni la progression sauvegardée.
import { createOnlineRoom, joinOnlineRoom, getOnlineRoom, supabase } from './supabase-client.js';

const screen = document.getElementById('pvpScreen');
if (!screen) throw new Error('Menu PVP introuvable');
const card = screen.querySelector('.panel-card');
const actions = card.querySelector('.panel-actions');
const panel = document.createElement('section');
panel.id = 'slayOnlinePanel';
panel.className = 'slay-online-panel';
panel.innerHTML = `
  <h3>⚔ PVP en ligne <small>— laboratoire</small></h3>
  <p>Crée une salle privée et invite un ami avec un code. Les salons fonctionnent. Sélectionne un deck personnel et ouvre le duel synchronisé. Chaque joueur devra valider son deck avant de lancer la partie.</p>
  <div class="slay-online-decks">
    <label for="triadeOnlineDeckSelect">Mon deck pour le PVP en ligne</label>
    <select id="triadeOnlineDeckSelect" aria-label="Deck local à prévisualiser"></select>
    <p id="triadeOnlineDeckCards"></p>
    <button type="button" class="menu-btn secondary" id="triadeOnlineRefreshDecks">Actualiser mes decks</button>
  </div>
  <button type="button" class="menu-btn" id="triadeOnlineCustomDuel">⚔ Jouer avec mes decks (test)</button>
  <div class="slay-online-controls">
    <button type="button" class="menu-btn" id="slayOnlineCreate">Créer un duel en ligne</button>
    <label for="slayOnlineCode">Code d'invitation (6 caractères)</label>
    <input id="slayOnlineCode" maxlength="6" placeholder="ABC123" autocomplete="off" aria-label="Code d'invitation">
    <button type="button" class="menu-btn secondary" id="slayOnlineJoin">Rejoindre un duel</button>
  </div>
  <div id="slayOnlineRoom" hidden>
    <strong>Code de la salle : <span id="slayOnlineRoomCode"></span></strong>
    <button type="button" class="menu-btn secondary" id="slayOnlineCopy">📋 Copier le code</button>
    <p id="slayOnlinePlayers"></p>
  </div>
  <p id="slayOnlineStatus" role="status" aria-live="polite">Prêt à créer une salle.</p>
  <p class="slay-online-warning">⚠ Le bouton « Lancer la partie » du menu PVP principal démarre uniquement un duel local. Pour jouer sur deux appareils, utilise le laboratoire synchronisé ci-dessous.</p>
  <a class="menu-btn slay-online-test-link" href="online/synced-test.html" target="_blank" rel="noopener">⚔ Ouvrir le duel synchronisé (decks de test)</a>
`;
card.insertBefore(panel, actions);
const style = document.createElement('style');
style.textContent = `
.slay-online-panel{margin:24px 0;padding:18px;border:2px solid #9c753c;border-radius:16px;background:#fff5d18c;text-align:left}
.slay-online-panel h3{margin:0 0 8px;font:700 1.45rem Georgia,serif;color:#4d3016}
.slay-online-panel h3 small{font:500 .8rem system-ui}
.slay-online-controls{display:grid;gap:10px}
.slay-online-decks{display:grid;gap:9px;margin:12px 0 18px;padding:12px;border:1px solid #ad8b57;border-radius:10px;background:#fff7df;color:#4d3016}
.slay-online-decks select{width:100%;padding:9px;border-radius:8px;background:#fffdf7;color:#3d2a17}
.slay-online-decks p{margin:2px 0;line-height:1.5;font-size:.92rem}
.slay-online-controls label{font-weight:700;color:#523718}
.slay-online-controls input{width:100%;padding:12px;border-radius:9px;border:1px solid #8b6736;background:#fff9e9;color:#332211;font:700 1rem system-ui;text-transform:uppercase;letter-spacing:.18em}
.slay-online-panel .menu-btn{width:100%;min-height:45px}
.slay-online-panel #slayOnlineRoom{margin-top:14px;padding:12px;border-radius:10px;background:#fff7df}
.slay-online-panel #slayOnlineStatus{min-height:24px;overflow-wrap:anywhere}
.slay-online-panel .slay-online-warning{padding:10px;border-left:4px solid #ad7531;background:#fff4d4;color:#573617;font-size:.91rem;line-height:1.45}
.slay-online-panel .slay-online-test-link{display:block;text-align:center;text-decoration:none;padding:12px;background:#684322;color:#fff1cc;border-radius:9px;margin-top:10px}
`;
document.head.append(style);

const el = id => document.getElementById(id);
function refreshDeckPreview() {
  const select = el('triadeOnlineDeckSelect');
  const output = el('triadeOnlineDeckCards');
  const previous = select.value;
  const snapshot = window.triadeOnlineDeckPreview?.();
  const decks = snapshot?.decks || [];
  select.replaceChildren();
  for (const deck of decks) {
    const option = document.createElement('option');
    option.value = deck.id;
    option.textContent = deck.name;
    select.append(option);
  }
  if (decks.length === 0) {
    output.textContent = 'Aucun deck complet et valide trouvé. Prépare un deck de cinq cartes dans « Mes decks ».';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.value = decks.some(d => d.id === previous) ? previous :
    decks.some(d => d.id === snapshot.activeDeckId) ? snapshot.activeDeckId : decks[0].id;
  const deck = decks.find(d => d.id === select.value);
  output.textContent = deck.cards.map(c => c.name + ' (' + c.v.join(' / ') + ')').join(' · ');
}
el('triadeOnlineDeckSelect').addEventListener('change', refreshDeckPreview);
el('triadeOnlineRefreshDecks').addEventListener('click', refreshDeckPreview);
refreshDeckPreview();
el('triadeOnlineCustomDuel').addEventListener('click', () => {
  const snapshot = window.triadeOnlineDeckPreview?.();
  if (!snapshot?.decks?.length) {
    status('Prépare d’abord un deck valide dans « Mes decks ».');
    return;
  }
  localStorage.setItem('triade-online-deck-snapshot', JSON.stringify(snapshot.decks));
  window.location.assign('online/custom-duel.html');
});
let roomId = null;
let channel = null;
let poller = null;
function status(message) { el('slayOnlineStatus').textContent = message; }
async function refreshRoom() {
  if (!roomId) return;
  const room = await getOnlineRoom(roomId);
  el('slayOnlineRoom').hidden = false;
  el('slayOnlineRoomCode').textContent = room.room_code;
  el('slayOnlinePlayers').textContent = room.guest_id
    ? 'Les deux joueurs sont présents ! Le duel sera activé prochainement.'
    : 'En attente du deuxième joueur…';
}
async function watchRoom(id) {
  roomId = id;
  if (channel) await supabase.removeChannel(channel);
  if (poller) clearInterval(poller);
  await refreshRoom();
  channel = supabase.channel('slay-room-' + id)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'slay_rooms', filter: 'id=eq.' + id
    }, () => refreshRoom().catch(e => status(e.message)))
    .subscribe();
  // Fonctionne même si Realtime Postgres Changes n'est pas encore activé.
  poller = setInterval(() => refreshRoom().catch(e => status(e.message)), 4000);
}
async function withBusy(button, task) {
  button.disabled = true;
  try { await task(); }
  catch (error) { status('Erreur : ' + (error.message || String(error))); }
  finally { button.disabled = false; }
}
el('slayOnlineCreate').addEventListener('click', () => withBusy(el('slayOnlineCreate'), async () => {
  status('Création de la salle…');
  const result = await createOnlineRoom();
  await watchRoom(result.room_id);
  status('Salle créée. Partage ton code avec ton ami !');
}));
el('slayOnlineCode').addEventListener('paste', event => {
  const pasted = event.clipboardData?.getData('text') || '';
  const match = pasted.toUpperCase().match(/(?:^|[^A-Z0-9])([A-F0-9]{6})(?:$|[^A-Z0-9])/);
  if (match) {
    event.preventDefault();
    el('slayOnlineCode').value = match[1];
    status('Code collé. Clique sur « Rejoindre un duel ».');
  }
});
el('slayOnlineJoin').addEventListener('click', () => withBusy(el('slayOnlineJoin'), async () => {
  status('Recherche de la salle…');
  const id = await joinOnlineRoom(el('slayOnlineCode').value);
  await watchRoom(id);
  status('Tu as rejoint la salle !');
}));
el('slayOnlineCopy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(el('slayOnlineRoomCode').textContent);
    status('Code copié !');
  } catch {
    const code = el('slayOnlineRoomCode');
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(code);
    selection.removeAllRanges();
    selection.addRange(range);
    status('Code sélectionné : copie-le avec Ctrl+C ou le menu de ton téléphone.');
  }
});
