const RARITY_ORDER = {common:0,uncommon:1,rare:2,alternative:3,parallel:4,divine:5};
function assignCardNumbers(cards) {
  const saved = window.HACKENIA_CARD_NUMBERS || {};
  let next = Math.max(0,...Object.values(saved)) + 1;
  for (const card of cards) card.number = saved[card.id] || next++;
}
function cardNumber(card) { return '#' + String(card.number || catalogById(card.id)?.number || 0).padStart(3,'0'); }
function sortedCards(cards, mode = 'number') {
  if (mode === 'name-desc') return sortedCards(cards,'name').reverse();
  if (mode === 'rarity-desc') return sortedCards(cards,'rarity').reverse();
  return [...cards].sort((a,b) => {
    if (mode === 'quantity') { const q = ownedCopies(b.id) - ownedCopies(a.id); if (q) return q; }
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
    for (const [value,text] of [['number','Ordre officiel du set'],['name','Nom (A → Z)'],['name-desc','Nom (Z → A)'],['rarity','Rareté (croissante)'],['rarity-desc','Rareté (décroissante)'],['quantity','Quantité (plus possédées)']]) { const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option); }
    const saved=readSaved('hackenia-'+id,'number');select.value=['number','name','name-desc','rarity','rarity-desc','quantity'].includes(saved)?saved:'number';
    select.onchange=()=>{try{localStorage.setItem('hackenia-'+id,JSON.stringify(select.value))}catch{}renderFn()};label.append(select);
    $(panel+' .panel-card').insertBefore(label,$(panel==='#collectionScreen'?'#collectionGrid':'#deckGrid'));
  }
  const note=document.createElement('p');note.className='mastery-note';note.textContent='10 exemplaires de la même illustration : cadre doré. 100 : cadre diamant. Les exemplaires foil comptent aussi. Ces cadres restent visibles en duel et ne changent pas les stats.';$('#collectionGrid').before(note);
  document.querySelector('.sigil').innerHTML='<img src="assets/icons/hackenia-192.png" alt="H d’Hackénia">';
  renderCollection();renderDeckBuilder();
  initTutorial();
  const historyButton=document.createElement('button');historyButton.className='ghost mobile-history';historyButton.textContent='Historique';historyButton.setAttribute('aria-expanded','false');
  const history=document.querySelector('.history-panel');
  const toggleHistory=()=>{const open=history.classList.toggle('history-open');historyButton.setAttribute('aria-expanded',String(open));};
  historyButton.onclick=toggleHistory;document.querySelector('#gameApp .actions').append(historyButton);
  const close=document.createElement('button');close.className='mobile-history';close.textContent='Fermer';close.onclick=toggleHistory;history.querySelector('.history-head').append(close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&history.classList.contains('history-open'))toggleHistory()});
}

const TUTORIAL_STEPS = [
  {title:'Votre premier duel',text:'Chaque joueur reçoit cinq cartes. À tour de rôle, posez-en une sur une case libre du plateau de 3 × 3. Après neuf poses, le joueur qui contrôle le plus de cartes sur le plateau gagne.'},
  {title:'Lire une carte',text:'Les quatre valeurs correspondent au haut, à la droite, au bas et à la gauche. A vaut 10 ; 0 vaut zéro. Sur Les Sans-chiffres, E vaut 3 et B vaut 8. Sur Le pèlerin, L vaut 7, I vaut 1 et E vaut 3. Seuls les côtés qui se touchent se comparent : jamais les diagonales.'},
  {title:'À vous : capturer une carte',text:'La carte adverse au centre a 3 à gauche. Sélectionnez votre carte (6 à droite), puis posez-la juste à sa gauche. 6 est supérieur à 3 : la carte adverse change de couleur.',practice:true},
  {title:'Identique',text:'En règle Identique, au moins deux contacts doivent avoir des valeurs égales en même temps. Exemple : 4 face à 4 et 7 face à 7. Les cartes adverses concernées sont capturées. Une seule égalité ne suffit pas ; une carte alliée peut compléter le deuxième contact.'},
  {title:'Addition',text:'En règle Addition, calculez la somme des deux valeurs à chaque contact. Deux sommes égales déclenchent les captures : par exemple 2 + 7 et 5 + 4 donnent toutes deux 9. Les captures classiques par valeur supérieure restent actives.'},
  {title:'Clair, Obscur et Souvenirs',text:'Clair montre la main adverse ; Obscur la cache. Après une pose, vous pouvez piocher un Souvenir ou passer. Chaque joueur dispose de deux pioches ; le Maître du Jeu coûte deux orbes. Les effets peuvent aider ou gêner : consultez la chronique du duel.'},
  {title:'Construire votre deck',text:'Un deck contient cinq cartes : deux exemplaires maximum du même nom, variantes comprises, et deux rares maximum et une Divine maximum. Une alternative de commune ne compte pas comme rare. Les cadres doré/diamant et le foil sont des effets visuels, sans bonus de puissance.'},
  {title:'Collectionner',text:'Les boosters contiennent cinq cartes. La dernière est une carte jouable foil, jamais un Souvenir. Tous les 25 boosters, choisissez une rare ou un Souvenir alternatif ; au palier 50, une alternative remplace ce choix. Le compteur repart ensuite à zéro. Tous les 100 boosters du set, un choix supplémentaire ouvre toute sa collection, Divines comprises.'}
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

function inspectHand(owner,requested=0){
 const holder=$(owner==='p'?'#playerHand':'#aiHand');
 if(passing||$('#turnCover').classList.contains('hidden')===false)return;
 const visible=hands[owner].filter((c,i)=>holder.children[i]&&!holder.children[i].classList.contains('card-back'));
 if(!visible.length)return;
 const index=(requested+visible.length)%visible.length;openCardZoom(visible[index]);
 const nav=$('#handZoomNav');nav.classList.remove('hidden');$('#handZoomPosition').textContent=`${index+1} / ${visible.length}`;
 $('#handZoomPrevious').onclick=()=>inspectHand(owner,index-1);$('#handZoomNext').onclick=()=>inspectHand(owner,index+1);
 $('#handZoomPrevious').disabled=visible.length<2;$('#handZoomNext').disabled=visible.length<2;document.querySelector('.card-zoom-dialog').scrollTop=0;
}
function initNavigationPolish(){
 for(const panel of ['#collectionScreen','#deckScreen']){
  const bar=document.createElement('div');bar.className='catalog-backbar';const button=document.createElement('button');button.className='menu-btn secondary';button.textContent='← Retour au menu';button.onclick=showMenu;bar.append(button);$(panel+' .panel-card').prepend(bar);
 }
 $('#cardZoomStats').after(Object.assign(document.createElement('div'),{id:'handZoomNav',className:'hand-zoom-nav hidden',innerHTML:'<button id="handZoomPrevious" aria-label="Carte précédente">←</button><span id="handZoomPosition"></span><button id="handZoomNext" aria-label="Carte suivante">→</button>'}));
 for(const owner of ['p','a']){const button=document.createElement('button');button.className='hand-inspect';button.textContent='Loupe';button.setAttribute('aria-label',owner==='p'?'Agrandir les cartes de votre main':'Agrandir les cartes visibles de cette main');button.onclick=()=>inspectHand(owner);document.querySelector(owner==='p'?'.side.player .player-label':'.side.ai .player-label').append(button)}
}

let boosterAngelCleanup=null;
function cancelBoosterAngel(){boosterAngelCleanup?.(false);boosterAngelCleanup=null}
function animateBoosterAngel(pull,done){
 cancelBoosterAngel();
 const last=$('#boosterCards .booster-pull:last-child');
 if(!last||!['alternative','parallel','divine'].includes(pull?.card?.rarity)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){done();return}
 last.classList.add('angel-pending');last.scrollIntoView?.({block:'center',inline:'center',behavior:'instant'});
 const stage=document.createElement('div');stage.className='booster-angel-stage '+pull.card.rarity;
 stage.innerHTML=`<div class="angel-origin"><div class="angel-burst"></div><div class="angel-rings"></div><svg class="booster-angel" viewBox="0 0 240 280" aria-hidden="true"><defs><linearGradient id="angelWing" x2="0" y2="1"><stop stop-color="#fffef5"/><stop offset="1" stop-color="#ffd476"/></linearGradient><radialGradient id="angelGlow"><stop stop-color="#fff"/><stop offset="1" stop-color="#ffe4a0"/></radialGradient></defs><g class="angel-left-wing" fill="url(#angelWing)" stroke="#fff7cf" stroke-width="2"><path d="M111 144C81 110 62 80 23 69C18 92 34 115 53 127C39 123 26 114 15 107C17 136 46 155 72 158C57 162 46 160 36 155C48 184 86 185 111 165Z"/><path d="M103 153Q67 145 38 105M95 161Q62 164 36 137" fill="none" stroke="#e9b867"/></g><g class="angel-right-wing" fill="url(#angelWing)" stroke="#fff7cf" stroke-width="2"><path d="M129 144C159 110 178 80 217 69C222 92 206 115 187 127C201 123 214 114 225 107C223 136 194 155 168 158C183 162 194 160 204 155C192 184 154 185 129 165Z"/><path d="M137 153Q173 145 202 105M145 161Q178 164 204 137" fill="none" stroke="#e9b867"/></g><ellipse cx="120" cy="50" rx="29" ry="8" fill="none" stroke="#fff3a4" stroke-width="5"/><path d="M105 134Q94 164 83 208Q120 232 157 208Q146 162 135 134Z" fill="url(#angelWing)"/><path d="M103 152Q120 162 137 152" fill="none" stroke="#dca652" stroke-width="5"/><circle cx="120" cy="106" r="31" fill="url(#angelGlow)"/><path d="M89 101Q85 70 118 72Q149 70 151 101Q140 94 134 84Q121 102 107 92Q99 101 89 101" fill="#f3c66c"/><path d="M103 109Q108 114 112 109M128 109Q133 114 138 109" fill="none" stroke="#a16a36" stroke-width="2.5" stroke-linecap="round"/><path d="M115 120Q121 125 127 120" fill="none" stroke="#c28755" stroke-width="2" stroke-linecap="round"/><circle cx="100" cy="118" r="4" fill="#edb596" opacity=".7"/><circle cx="140" cy="118" r="4" fill="#edb596" opacity=".7"/><path d="M105 148L93 165M135 148L147 165" stroke="#fff5d8" stroke-width="10" stroke-linecap="round"/><path d="M110 178L113 207M128 178L131 207" stroke="#fff" opacity=".75" stroke-width="3"/></svg>${Array.from({length:12},(_,i)=>`<i class="angel-spark" style="--spark-x:${(i%4-1.5)*48}px;--spark-y:${(Math.floor(i/4)-1)*65}px;--spark-delay:${i*.045}s">✦</i>`).join('')}</div><button class="angel-skip">Révéler la carte</button>`;
 const rect=last.querySelector('.card').getBoundingClientRect();stage.style.setProperty('--angel-x',Math.max(120,Math.min(innerWidth-120,rect.x+rect.width/2))+'px');stage.style.setProperty('--angel-y',Math.max(150,Math.min(innerHeight-130,rect.y+rect.height/2))+'px');
 stage.setAttribute('role','status');stage.setAttribute('aria-label','Un ange lumineux dévoile votre carte '+rarityLabels[pull.card.rarity]);document.body.append(stage);
 let finished=false;const finish=(complete=true)=>{if(finished)return;finished=true;clearTimeout(timer);last.classList.remove('angel-pending');stage.remove();boosterAngelCleanup=null;if(complete)done()};const timer=setTimeout(()=>finish(),2700);boosterAngelCleanup=finish;
 stage.querySelector('button').onclick=()=>finish();
}
