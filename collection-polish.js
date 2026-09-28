const RARITY_ORDER = {common:0,uncommon:1,rare:2,alternative:3,parallel:4,divine:5};
function assignCardNumbers(cards) {
  const saved = window.HACKENIA_CARD_NUMBERS || {};
  let next = Math.max(0,...Object.values(saved)) + 1;
  for (const card of cards) card.number = saved[card.id] || next++;
}
function cardNumber(card) { return '#' + String(card.number || catalogById(card.id)?.number || 0).padStart(3,'0'); }
function sortedCards(cards, mode = 'number') {
  return [...cards].sort((a,b) => {
    if (mode === 'rarity') { const r = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]; if (r) return r; }
    if (mode === 'name' || mode === 'rarity') { const n = a.name.localeCompare(b.name,'fr'); if (n) return n; }
    return a.number - b.number;
  });
}
function masteryTier(count) { return count >= 100 ? 'diamond' : count >= 10 ? 'gold' : ''; }
function playerCard(card) { return {...cloneCard(card),mastery:masteryTier(ownedCopies(card.id))}; }
function cardDecoration(card, tier = masteryTier(ownedCopies(card.id))) {
  const frame = tier === 'gold' || tier === 'diamond' ? `<span class="mastery-frame ${tier}" aria-hidden="true"></span><span class="mastery-label ${tier}" title="${tier === 'diamond' ? 'Cadre diamant • 100 exemplaires' : 'Cadre doré • 10 exemplaires'}">${tier === 'diamond' ? '◆ 100' : '✦ 10'}</span>` : '';
  return `<span class="catalog-number">${cardNumber(card)}</span>${frame}`;
}
function masteryDescription(card) {
  const count = ownedCopies(card.id), tier = masteryTier(count);
  return tier === 'diamond' ? 'Cadre diamant débloqué • 100 exemplaires' : tier === 'gold' ? `Cadre doré débloqué • ${count}/100 vers le diamant` : `${count}/10 exemplaires vers le cadre doré`;
}
function decorateMemoryArtwork(card) {
  const selected = catalogById(settings.memorySkins?.[card.id]);
  const collectible = selected?.kind === 'memory' && selected.effect === card.id && ownedCopies(selected.id) ? selected : souvenirCollectibles.find(c => c.effect === card.id && c.rarity === 'common');
  const holder = $('#memoryArtwork'); holder.innerHTML = collectible ? cardDecoration(collectible) : '';
}
function initCollectionPolish() {
  for (const [panel,id,renderFn] of [['#collectionScreen','collectionSort',renderCollection],['#deckScreen','deckSort',renderDeckBuilder]]) {
    const label = document.createElement('label'); label.className='catalog-sort';label.textContent='Trier les cartes : ';
    const select=document.createElement('select');select.id=id;select.setAttribute('aria-label','Ordre des cartes');
    for (const [value,text] of [['number','Numéro'],['name','Nom (A → Z)'],['rarity','Rareté']]) { const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option); }
    const saved=readSaved('hackenia-'+id,'number');select.value=['number','name','rarity'].includes(saved)?saved:'number';
    select.onchange=()=>{try{localStorage.setItem('hackenia-'+id,JSON.stringify(select.value))}catch{}renderFn()};label.append(select);
    $(panel+' .panel-card').insertBefore(label,$(panel==='#collectionScreen'?'#collectionGrid':'#deckGrid'));
  }
  const note=document.createElement('p');note.className='mastery-note';note.textContent='10 exemplaires de la même illustration : cadre doré. 100 : cadre diamant. Les exemplaires foil comptent aussi. Ces cadres restent visibles en duel et ne changent pas les stats.';$('#collectionGrid').before(note);
  document.querySelector('.sigil').innerHTML='<img src="assets/icons/hackenia-192.png" alt="H d’Hackénia">';
  renderCollection();renderDeckBuilder();
  initTutorial();
}

const TUTORIAL_STEPS = [
  {title:'Votre premier duel',text:'Chaque joueur reçoit cinq cartes. À tour de rôle, posez-en une sur une case libre du plateau de 3 × 3. Après neuf poses, le joueur qui contrôle le plus de cartes sur le plateau gagne.'},
  {title:'Lire une carte',text:'Les quatre valeurs correspondent au haut, à la droite, au bas et à la gauche. A vaut 10 ; 0 vaut zéro. Sur Les Sans-chiffres, E vaut 3 et B vaut 8. Seuls les côtés qui se touchent se comparent : jamais les diagonales.'},
  {title:'À vous : capturer une carte',text:'La carte adverse au centre a 3 à gauche. Sélectionnez votre carte (6 à droite), puis posez-la juste à sa gauche. 6 est supérieur à 3 : la carte adverse change de couleur.',practice:true},
  {title:'Identique',text:'En règle Identique, au moins deux contacts doivent avoir des valeurs égales en même temps. Exemple : 4 face à 4 et 7 face à 7. Les cartes adverses concernées sont capturées. Une seule égalité ne suffit pas ; une carte alliée peut compléter le deuxième contact.'},
  {title:'Addition',text:'En règle Addition, calculez la somme des deux valeurs à chaque contact. Deux sommes égales déclenchent les captures : par exemple 2 + 7 et 5 + 4 donnent toutes deux 9. Les captures classiques par valeur supérieure restent actives.'},
  {title:'Clair, Obscur et Souvenirs',text:'Clair montre la main adverse ; Obscur la cache. Après une pose, vous pouvez piocher un Souvenir ou passer. Chaque joueur dispose de deux pioches ; le Maître du Jeu coûte deux orbes. Les effets peuvent aider ou gêner : consultez la chronique du duel.'},
  {title:'Construire votre deck',text:'Un deck contient cinq cartes : deux exemplaires maximum du même nom, variantes comprises, et trois rares ou Divines maximum. Une alternative de commune ne compte pas comme rare. Les cadres doré/diamant et le foil sont des effets visuels, sans bonus de puissance.'},
  {title:'Collectionner',text:'Les boosters contiennent cinq cartes. La dernière est une carte jouable foil, jamais un Souvenir. Tous les 25 boosters, choisissez une rare ou un Souvenir alternatif ; au palier 50, une alternative remplace ce choix. Le compteur repart ensuite à zéro. Les Divines ne font pas partie de ces choix.'}
];
let tutorialStep=0, tutorialSelected=false, tutorialSolved=false;
function openTutorial() { tutorialStep=0;tutorialSelected=false;tutorialSolved=false;renderTutorial();$('#tutorialDialog').classList.remove('hidden');$('#tutorialClose').focus(); }
function closeTutorial() { $('#tutorialDialog').classList.add('hidden'); }
function renderTutorial() {
  const step=TUTORIAL_STEPS[tutorialStep];$('#tutorialTitle').textContent=step.title;$('#tutorialText').textContent=step.text;$('#tutorialProgress').textContent=`${tutorialStep+1} / ${TUTORIAL_STEPS.length}`;
  $('#tutorialPrevious').disabled=tutorialStep===0;$('#tutorialNext').textContent=tutorialStep===TUTORIAL_STEPS.length-1?'Terminer':'Continuer';$('#tutorialNext').disabled=!!step.practice&&!tutorialSolved;
  const practice=$('#tutorialPractice');practice.replaceChildren();practice.classList.toggle('hidden',!step.practice);
  if (!step.practice) return;
  const card=document.createElement('button');card.className='tutorial-hand';card.textContent='Ma carte • droite : 6';card.setAttribute('aria-pressed',String(tutorialSelected));card.disabled=tutorialSolved;card.onclick=()=>{tutorialSelected=true;renderTutorial()};practice.append(card);
  const grid=document.createElement('div');grid.className='tutorial-board';
  for(let i=0;i<9;i++){const cell=document.createElement('button');cell.className='tutorial-cell';cell.textContent=i===4?(tutorialSolved?'Capturée !':'Adversaire · gauche : 3'):i===3&&tutorialSolved?'Ma carte · droite : 6':String(i+1);cell.classList.toggle('captured',tutorialSolved&&[3,4].includes(i));cell.disabled=i===4||tutorialSolved;cell.setAttribute('aria-label',i===4?'Carte adverse au centre':`Case ${i+1}`);cell.onclick=()=>{if(!tutorialSelected){$('#tutorialFeedback').textContent='Sélectionnez d’abord votre carte.';return}if(i!==3){$('#tutorialFeedback').textContent='Essayez la case 4, juste à gauche de la carte adverse.';return}tutorialSolved=true;renderTutorial();$('#tutorialFeedback').textContent='Bravo ! 6 > 3 : vous capturez la carte adverse.'};grid.append(cell)}practice.append(grid);
  const feedback=document.createElement('p');feedback.id='tutorialFeedback';feedback.setAttribute('role','status');feedback.textContent=tutorialSolved?'Capture réussie ! Vous pouvez continuer.':tutorialSelected?'Posez la carte dans la case 4.':'Sélectionnez votre carte pour commencer.';practice.append(feedback);
}
function initTutorial() {
  document.body.insertAdjacentHTML('beforeend','<section id="tutorialDialog" class="tutorial-dialog hidden" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle"><article class="panel-card"><button id="tutorialClose" class="tutorial-close" aria-label="Fermer le tutoriel">×</button><span id="tutorialProgress"></span><h2 id="tutorialTitle"></h2><p id="tutorialText"></p><div id="tutorialPractice"></div><div class="panel-actions"><button class="menu-btn secondary" id="tutorialPrevious">Précédent</button><button class="menu-btn" id="tutorialNext">Continuer</button></div></article></section>');
  for(const parent of ['#startupScreen .menu-actions','#menuScreen .menu-actions']){const button=document.createElement('button');button.className='menu-btn secondary';button.textContent='Apprendre à jouer';button.onclick=openTutorial;$(parent).append(button)}
  $('#tutorialClose').onclick=closeTutorial;$('#tutorialPrevious').onclick=()=>{if(tutorialStep>0){tutorialStep--;renderTutorial()}};$('#tutorialNext').onclick=()=>{if(TUTORIAL_STEPS[tutorialStep].practice&&!tutorialSolved)return;if(tutorialStep===TUTORIAL_STEPS.length-1){closeTutorial();return}tutorialStep++;renderTutorial()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTutorial()});
}
