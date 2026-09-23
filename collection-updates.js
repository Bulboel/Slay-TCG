/* Collection rules are shared by the UI and the simulation tests. */
const BOOSTER_SET = 'un-nouveau-depart';
const STATS_KEY = 'hackenia-card-stat-overrides';
let publishedStats = {}, localStats = {};

function isRareCard(card) {
  if (!card || card.kind !== 'playable') return false;
  if (card.rarity === 'rare') return true;
  return ['alternative', 'parallel'].includes(card.rarity) && pool.some(base => base.name === card.name && base.rarity === 'rare');
}
function deckRareCount(deck) { return deck.cards.filter(i => isRareCard(pool[i])).length; }
function validDeck(deck) {
  return !!deck && deck.cards.length === 5 && deckRareCount(deck) <= 3 && deck.cards.every(i =>
    pool[i] && deckNameCount(deck, pool[i].name) <= 2 && deck.cards.filter(n => n === i).length <= ownedCopies(pool[i].id));
}
function deckCardsWithFoil(deck) {
  const used = {};
  return deck.cards.map(i => { const card = pool[i]; used[card.id] = (used[card.id] || 0) + 1;
    return {...card, v:[...card.v], foil:used[card.id] <= (collection.foils?.[card.id] || 0)};
  });
}
function randomLegalHand() {
  const hand = [];
  for (const card of shuffle(pool)) {
    if (hand.filter(c => c.name === card.name).length >= 2 || (isRareCard(card) && hand.filter(isRareCard).length >= 3)) continue;
    hand.push(card); if (hand.length === 5) break;
  }
  return hand;
}
function pityProgress(state = collection, setId = BOOSTER_SET) {
  state.boosterProgress ||= {};
  const p = state.boosterProgress[setId] ||= {opened:0, pending:[]};
  if (!Number.isSafeInteger(p.opened) || p.opened < 0) p.opened = 0;
  if (!Array.isArray(p.pending)) p.pending = [];
  return p;
}
function recordBoosterOpening(state = collection, setId = BOOSTER_SET) {
  const p = pityProgress(state,setId); p.opened++;
  if (p.opened % 25 === 0) p.pending.push({milestone:p.opened,type:p.opened % 50 === 0 ? 'alternative' : 'rare-or-memory'});
}
function rewardCandidates(reward, setId = BOOSTER_SET) {
  return catalog.filter(c => c.setId === setId && (reward.type === 'alternative' ? c.rarity === 'alternative' : c.rarity === 'rare' || (c.kind === 'memory' && c.rarity === 'alternative')));
}
function claimPityCard(id, milestone) {
  const p = pityProgress(), reward = p.pending[0];
  if (!reward || reward.milestone !== milestone || !rewardCandidates(reward).some(c => c.id === id)) return false;
  collection.counts[id] = ownedCopies(id) + 1;
  p.pending.shift(); saveCollection(); return true;
}
function generateBooster(cards, state, rng = Math.random, setId = BOOSTER_SET) {
  const available = cards.filter(c => c.setId === setId), selected = new Set();
  const of = rarity => available.filter(c => c.rarity === rarity);
  const pick = candidates => {
    if (!candidates.length) throw new Error('Booster incomplet : catégorie vide');
    // Prefer missing illustrations, including within this pack, without altering slot rarity.
    const missing = candidates.filter(c => !(state.counts[c.id] > 0) && !selected.has(c.id));
    const list = missing.length && rng() < .85 ? missing : candidates;
    const card = list[Math.floor(rng() * list.length)]; selected.add(card.id); return card;
  };
  const commons = of('common'), commonPlayable = commons.filter(c => c.kind === 'playable'), uncommons = of('uncommon'), rares = of('rare');
  const pulls = [pick(commons),pick(commonPlayable),pick(rng() < .30 ? uncommons : commonPlayable)];
  const fourth = rng(); pulls.push(pick(fourth < .20 ? rares : fourth < .55 ? uncommons : commonPlayable));
  const foil = rng(), parallels = of('parallel');
  const needsParallel = pityProgress(state,setId).opened >= 199 && !parallels.some(c => state.counts[c.id] > 0);
  pulls.push(pick(needsParallel || foil < .01 ? parallels : foil < .06 ? of('alternative') : foil < .16 ? rares : [...commons,...uncommons]));
  return pulls.map((card,i) => ({card,foil:i === 4,slot:rarityLabels[card.rarity] + (i === 4 ? ' foil' : '')}));
}
function continueBoosters() {
  if (pityProgress().pending.length) { showPity(); return; }
  $('#pityDialog')?.classList.add('hidden');
  if (collection.pendingPack) { showBooster(collection.pendingPack.context); return; }
  if (collection.shopQueue > 0) { showBooster('shop'); return; }
  if (collection.starterBoosters > 0) { showBooster('starter'); return; }
  if (story.pendingReward || collection.storyBoosterQueue?.length) { showBooster('chapter'); return; }
  if (boosterContext === 'chapter') { renderStoryMenu(); openPanel('#storyScreen'); }
  else openShop('Les cartes ont rejoint votre collection.');
}
function renderBoosterProgress() {
  const box = $('#boosterProgress'); if (!box) return;
  const p = pityProgress(), next = 25 - p.opened % 25;
  box.querySelector('strong').textContent = `Un nouveau départ • ${p.opened % 50} / 50 boosters`;
  box.querySelector('progress').max = 50;
  box.querySelector('progress').value = p.opened % 50;
  box.querySelector('p').textContent = `${next} avant le prochain choix. Tous les 25 : rare ou Souvenir alternatif ; tous les 50 : alternative au choix, à la place du choix précédent. Une parallèle garantie au plus tard au 200e booster de cette série.`;
  box.querySelector('button').classList.toggle('hidden',!p.pending.length && !collection.pendingPack && !(collection.shopQueue > 0));
  box.querySelector('button').textContent = p.pending.length ? `Choisir une récompense (${p.pending.length})` : 'Reprendre les boosters';
}
function showPity() {
  const reward = pityProgress().pending[0]; if (!reward) { continueBoosters(); return; }
  const dialog = $('#pityDialog'), grid = $('#pityGrid'); grid.replaceChildren();
  const displayedMilestone = reward.milestone % 50 || 50;
  $('#pityTitle').textContent = `Palier ${displayedMilestone} • votre carte au choix`;
  $('#pityIntro').textContent = reward.type === 'alternative' ? 'Choisissez une alternative de la série Un nouveau départ.' : 'Choisissez une rare classique ou un Souvenir alternatif de la série Un nouveau départ.';
  for (const card of rewardCandidates(reward)) {
    const item = document.createElement('article'); item.className = 'reward-option';
    const label = document.createElement('p'); label.textContent = card.name;
    const choose = document.createElement('button'); choose.className = 'menu-btn'; choose.textContent = 'Choisir';
    choose.setAttribute('aria-label', 'Choisir ' + card.name);
    choose.onclick = () => { if (!confirm(`Ajouter « ${card.name} » à votre collection pour le palier ${displayedMilestone} ?`)) return;
      if (claimPityCard(card.id,reward.milestone)) { dialog.classList.add('hidden'); renderCollection();renderDeckBuilder();continueBoosters(); }
    };
    item.append(label,choose); grid.append(item);
  }
  $('#boosterReveal').classList.add('hidden'); dialog.classList.remove('hidden');
}

function queueStoryBooster(part) {
  // Part 3 already awarded a booster before this update; keep that entitlement.
  collection.storyBoosterQueue ||= [];
  if (!story.boosterRewards) {
    story.boosterRewards = {part3:!!economy.storyRewards.part3};
    if (story.pendingReward && economy.storyRewards.part3 && !collection.storyBoosterQueue.includes('part3')) collection.storyBoosterQueue.push('part3');
  }
  if (story.boosterRewards[part]) return;
  story.boosterRewards[part] = true;
  collection.storyBoosterQueue.push(part);
  story.pendingReward = true;
}
function recoverStoryBoosters() {
  // Restore the two rewards omitted by older versions, once per completed part.
  for (const part of ['part1','part2']) if (story[part] === 'complete') queueStoryBooster(part);
  if (collection.storyBoosterQueue?.length) story.pendingReward = true;
}

function validStats(values) { return Array.isArray(values) && values.length === 4 && values.every(v => Number.isInteger(v) && v >= 0 && v <= 10); }
function validateStatMap(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error('Format de statistiques invalide');
  const clean = {};
  for (const [id,values] of Object.entries(map)) {
    if (!pool.some(c => c.id === id) || !validStats(values)) throw new Error(`Valeurs invalides pour ${id} : quatre entiers de 0 à 10 sont requis.`);
    clean[id] = [...values];
  }
  return clean;
}
function initializeCardStats() {
  publishedStats = Object.fromEntries(pool.map(c => [c.id,[...c.v]]));
  try { Object.assign(publishedStats,validateStatMap(window.HACKENIA_CARD_STATS || {})); } catch (e) { console.warn(e.message); }
  try { localStats = validateStatMap(readSaved(STATS_KEY,{})); } catch { localStats = {}; }
  applyCardStats();
}
function applyCardStats() { for (const card of pool) card.v = [...(localStats[card.id] || publishedStats[card.id])]; }
function saveLocalStats() { localStorage.setItem(STATS_KEY,JSON.stringify(localStats));applyCardStats();renderCollection();renderDeckBuilder(); }
function renderStatsCard() {
  const card = catalogById($('#statsCard').value); if (!card) return;
  $('#statsVisual').innerHTML = previewMarkup(card);
  $('#statsIdentity').textContent = `${card.id} • ${rarityLabels[card.rarity]} • ${elements[card.element]?.name || 'Sans élément'}`;
  document.querySelectorAll('[data-stat-side]').forEach(input => { input.value = card.v[Number(input.dataset.statSide)]; });
  $('#statsStatus').textContent = localStats[card.id] ? 'Correction locale active. Les prochaines parties utiliseront ces valeurs.' : 'Valeurs publiées sur le site.';
  updateStatsExport();
}
function updateStatsExport() {
  const data = {...(window.HACKENIA_CARD_STATS || {}),...localStats};
  $('#statsPublishText').value = '// Order: top, right, bottom, left. A = 10.\nwindow.HACKENIA_CARD_STATS = '+JSON.stringify(data,null,2)+';\n';
}
function downloadStats(content,name,type) {
  const url = URL.createObjectURL(new Blob([content],{type})), link = document.createElement('a'); link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function initCollectionUpdates() {
  recoverStoryBoosters();saveCollection();saveStory();
  document.body.insertAdjacentHTML('beforeend', `
    <section id="statsScreen" class="panel-screen hidden"><div class="panel-card">
      <h2>Vérifier et corriger les statistiques</h2>
      <p>Ce registre affiche toutes les cartes, même celles que vous n’avez pas découvertes. Comparez les chiffres imprimés aux valeurs utilisées en jeu. A correspond à 10.</p>
      <label>Carte <select id="statsCard"></select></label><p id="statsIdentity"></p>
      <div class="stats-editor"><div id="statsVisual"></div><form id="statsForm"><div class="stats-inputs">
      ${['Haut','Droite','Bas','Gauche'].map((name,i)=>`<label>${name}<input required type="number" min="0" max="10" step="1" data-stat-side="${i}"></label>`).join('')}
      </div><p>La correction s’applique sur cet appareil aux prochaines parties. Elle ne modifie ni le dessin ni les parties déjà commencées.</p>
      <button class="menu-btn" type="submit">Appliquer sur cet appareil</button><button class="menu-btn secondary" type="button" id="statsReset">Revenir aux valeurs publiées</button><p role="status" id="statsStatus"></p></form></div>
      <details><summary>Transférer ou publier les corrections pour tous</summary>
      <p>Exportez les corrections pour les conserver ou les importer sur un autre appareil. Pour les publier pour tous les joueurs : ouvrez le fichier GitHub, remplacez son contenu par le texte ci-dessous, puis validez le commit sur GitHub. Seuls les responsables du dépôt peuvent publier.</p>
      <div class="panel-actions"><button class="menu-btn" id="statsExport">Exporter les corrections JSON</button><button class="menu-btn secondary" id="statsImport">Importer un JSON</button><input type="file" id="statsImportFile" accept="application/json,.json" hidden></div>
      <textarea id="statsPublishText" readonly aria-label="Contenu à publier dans le fichier GitHub"></textarea>
      <a href="https://github.com/Bulboel/Slay-TCG/edit/main/assets/data/card-stats.js" target="_blank" rel="noopener">Ouvrir le fichier des statistiques sur GitHub</a>
      </details><div class="panel-actions"><button class="menu-btn secondary" id="statsClose">Retour à la collection</button></div>
    </div></section>
    <section id="pityDialog" class="reward-dialog hidden" role="dialog" aria-modal="true" aria-labelledby="pityTitle"><div class="panel-card"><h2 id="pityTitle"></h2><p id="pityIntro"></p><div id="pityGrid" class="reward-grid"></div><button id="pityLater" class="menu-btn secondary">Choisir plus tard</button></div></section>`);
  const edit = document.createElement('button');edit.className='menu-btn secondary';edit.textContent='Vérifier / corriger les stats';edit.onclick=()=>{renderStatsCard();openPanel('#statsScreen')};$('#collectionScreen .panel-actions').append(edit);
  const select=$('#statsCard');
  for(const card of [...pool].sort((a,b)=>a.name.localeCompare(b.name,'fr'))){const option=document.createElement('option');option.value=card.id;option.textContent=`${card.name} — ${rarityLabels[card.rarity]} (${card.id})`;select.append(option)}
  select.onchange=renderStatsCard;
  $('#statsForm').onsubmit=e=>{e.preventDefault();const values=[...document.querySelectorAll('[data-stat-side]')].map(el=>el.value.trim()===''?NaN:Number(el.value));if(!validStats(values)){$('#statsStatus').textContent='Entrez quatre entiers entre 0 et 10.';return}localStats[select.value]=values;try{saveLocalStats();renderStatsCard()}catch{$('#statsStatus').textContent='Impossible de sauvegarder sur cet appareil. Exportez vos corrections.'}};
  $('#statsReset').onclick=()=>{delete localStats[select.value];saveLocalStats();renderStatsCard()};
  $('#statsClose').onclick=()=>openPanel('#collectionScreen');
  $('#statsExport').onclick=()=>downloadStats(JSON.stringify({...window.HACKENIA_CARD_STATS,...localStats},null,2),'hackenia-corrections.json','application/json');
  $('#statsImport').onclick=()=>$('#statsImportFile').click();
  $('#statsImportFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const clean=validateStatMap(JSON.parse(await file.text()));localStats={...localStats,...clean};saveLocalStats();renderStatsCard();$('#statsStatus').textContent='Corrections importées sur cet appareil.'}catch(err){$('#statsStatus').textContent=err.message}finally{e.target.value=''}};
  const box=document.createElement('section');box.id='boosterProgress';box.className='booster-progress';box.innerHTML='<strong></strong><progress max="25" value="0" aria-label="Progression vers le prochain choix"></progress><p></p><small>Le compteur commence avec cette mise à jour ; les anciennes ouvertures n’étaient pas enregistrées. Emplacement 4 : 20 % rare. Foil : 1 % parallèle, 5 % alternative, 10 % rare. Les cartes manquantes sont favorisées dans chaque catégorie. Les boosters utilisent uniquement les pièces gagnées en jeu.</small><button class="menu-btn hidden">Reprendre</button>';
  box.querySelector('button').onclick=continueBoosters;$('#shopScreen .shop-grid').before(box);
  const rewards=document.createElement('button');rewards.className='menu-btn secondary';rewards.textContent='Progression des boosters';rewards.onclick=()=>openShop();$('#collectionScreen .panel-actions').append(rewards);
  $('#pityLater').onclick=()=>{$('#pityDialog').classList.add('hidden');openShop('Votre choix est conservé. Vous pourrez le récupérer avant la prochaine ouverture.')};
  renderBoosterProgress();
}
