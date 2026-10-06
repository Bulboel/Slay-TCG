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
function masteryTier(count) { return count >= 20 ? 'diamond' : count >= 10 ? 'gold' : ''; }
function playerCard(card) { return {...cloneCard(card),mastery:masteryTier(ownedCopies(card.id))}; }
function cardDecoration(card, tier = masteryTier(ownedCopies(card.id))) {
  const halo = tier === 'gold' || tier === 'diamond' ? `<span class="mastery-halo ${tier}" aria-hidden="true"></span>` : '';
  return `<span class="catalog-number">${cardNumber(card)}</span>${halo}`;
}
function masteryDescription(card) {
  const count = ownedCopies(card.id), tier = masteryTier(count);
  return tier === 'diamond' ? 'Halo diamant débloqué • 20 exemplaires' : tier === 'gold' ? `Halo doré débloqué • ${count}/20 vers le diamant` : `${count}/10 exemplaires vers le halo doré`;
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
  const note=document.createElement('p');note.className='mastery-note';note.textContent='10 exemplaires de la même illustration : halo doré. 20 : halo diamant scintillant. Les exemplaires foil comptent aussi. Retrouvez ces halos dans la collection et en vue agrandie ; ils ne changent pas les stats.';$('#collectionGrid').before(note);
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

function inspectHand(owner,requested=0){
 const holder=handHolder(owner);
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
 for(const owner of ['p','a']){const button=document.createElement('button');button.className='hand-inspect';button.textContent='Loupe';button.setAttribute('aria-label',owner==='p'?'Agrandir les cartes de votre main':'Agrandir les cartes visibles de cette main');button.onclick=()=>inspectHand(owner==='p'?bottomHandOwner():bottomHandOwner()==='p'?'a':'p');document.querySelector(owner==='p'?'.side.player .player-label':'.side.ai .player-label').append(button)}
}

let boosterAngelCleanup=null;
function cancelBoosterAngel(){boosterAngelCleanup?.(false);boosterAngelCleanup=null}
function animateBoosterAngel(pull,done){
 cancelBoosterAngel();
 const last=$('#boosterCards .booster-pull:last-child');
 if(!last||!['alternative','parallel','divine'].includes(pull?.card?.rarity)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){done();return}
 last.classList.add('angel-pending');
 const stage=document.createElement('div');stage.className='booster-angel-stage '+pull.card.rarity;
 stage.innerHTML=`<div class="angel-origin"><div class="angel-rays"></div><div class="angel-burst"></div><div class="angel-rings"></div><svg class="booster-angel" viewBox="0 0 240 280" aria-hidden="true"><defs><linearGradient id="angelWing" x2="0" y2="1"><stop stop-color="#fffef5"/><stop offset="1" stop-color="#ffd476"/></linearGradient><radialGradient id="angelGlow"><stop stop-color="#fff"/><stop offset="1" stop-color="#ffe4a0"/></radialGradient></defs><g class="angel-left-wing" fill="url(#angelWing)" stroke="#fff7cf" stroke-width="2"><path d="M111 144C81 110 62 80 23 69C18 92 34 115 53 127C39 123 26 114 15 107C17 136 46 155 72 158C57 162 46 160 36 155C48 184 86 185 111 165Z"/><path d="M103 153Q67 145 38 105M95 161Q62 164 36 137" fill="none" stroke="#e9b867"/></g><g class="angel-right-wing" fill="url(#angelWing)" stroke="#fff7cf" stroke-width="2"><path d="M129 144C159 110 178 80 217 69C222 92 206 115 187 127C201 123 214 114 225 107C223 136 194 155 168 158C183 162 194 160 204 155C192 184 154 185 129 165Z"/><path d="M137 153Q173 145 202 105M145 161Q178 164 204 137" fill="none" stroke="#e9b867"/></g><ellipse cx="120" cy="50" rx="29" ry="8" fill="none" stroke="#fff3a4" stroke-width="5"/><path d="M105 134Q94 164 83 208Q120 232 157 208Q146 162 135 134Z" fill="url(#angelWing)"/><path d="M103 152Q120 162 137 152" fill="none" stroke="#dca652" stroke-width="5"/><circle cx="120" cy="106" r="31" fill="url(#angelGlow)"/><path d="M89 101Q85 70 118 72Q149 70 151 101Q140 94 134 84Q121 102 107 92Q99 101 89 101" fill="#f3c66c"/><path d="M103 109Q108 114 112 109M128 109Q133 114 138 109" fill="none" stroke="#a16a36" stroke-width="2.5" stroke-linecap="round"/><path d="M115 120Q121 125 127 120" fill="none" stroke="#c28755" stroke-width="2" stroke-linecap="round"/><circle cx="100" cy="118" r="4" fill="#edb596" opacity=".7"/><circle cx="140" cy="118" r="4" fill="#edb596" opacity=".7"/><path d="M105 148L93 165M135 148L147 165" stroke="#fff5d8" stroke-width="10" stroke-linecap="round"/><path d="M110 178L113 207M128 178L131 207" stroke="#fff" opacity=".75" stroke-width="3"/></svg>${Array.from({length:24},(_,i)=>`<i class="angel-spark" style="--spark-x:${(i%6-2.5)*48}px;--spark-y:${(Math.floor(i/6)-1.5)*65}px;--spark-delay:${i*.025}s">✦</i>`).join('')}</div><button class="angel-skip">Révéler la carte</button>`;
 const anchor=last.querySelector('.booster-flipper');
 if(!anchor){const rect=last.querySelector('.card').getBoundingClientRect();stage.style.setProperty('--angel-x',(rect.x+rect.width/2)+'px');stage.style.setProperty('--angel-y',(rect.y+rect.height/2)+'px')}
 stage.setAttribute('role','status');stage.setAttribute('aria-label','Un ange lumineux dévoile votre carte '+rarityLabels[pull.card.rarity]);(anchor||document.body).append(stage);
 let finished=false;const finish=(complete=true)=>{if(finished)return;finished=true;clearTimeout(timer);last.classList.remove('angel-pending');stage.remove();boosterAngelCleanup=null;if(complete)done()};const timer=setTimeout(()=>finish(),2700);boosterAngelCleanup=finish;
 stage.querySelector('button').onclick=()=>finish();
}
