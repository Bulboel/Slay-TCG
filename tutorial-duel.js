// A self-contained training duel: the real card renderer and capture rules,
// with its own board/hands so neither a saved duel nor progress can change.
let tutorialDuel=null, tutorialReturnFocus=null;
function openTutorial(){
 tutorialReturnFocus=document.activeElement;
 const card=id=>{const c=catalogById(id);return {...c,v:[...(publishedStats[id]||c.v)]}};
 tutorialDuel={board:Array(9).fill(null),hands:{p:['p42','p27','p04','p13','p23'].map(card),a:['p25','p36','p09','p43'].map(card)},phase:'intro',selected:null,first:true,last:[],message:'Chacun commence avec cinq cartes. Votre adversaire vient de poser la première au centre. À vous de jouer !'};
 tutorialDuel.board[4]={card:card('p02'),owner:'a'};
 $('#tutorialDialog').classList.remove('hidden');renderTutorial();$('#tutorialNext').focus();
}
function closeTutorial(){ $('#tutorialDialog').classList.add('hidden');tutorialDuel=null;tutorialReturnFocus?.focus(); }
function tutorialMoves(owner){
 const t=tutorialDuel,moves=[];
 t.hands[owner].forEach((card,index)=>t.board.forEach((slot,pos)=>{if(slot)return;const grid=t.board.map(s=>s?{...s}:null);grid[pos]={card,owner};moves.push({index,pos,captures:capture(pos,owner,grid,'basic-open').size})}));return moves;
}
function tutorialHint(){
 const t=tutorialDuel;if(t.first)return {index:0,pos:3};
 return tutorialMoves('p').filter(m=>t.selected===null||m.index===t.selected).sort((a,b)=>b.captures-a.captures)[0];
}
function tutorialPlace(pos){
 const t=tutorialDuel;if(!t||t.phase!=='choose'||t.board[pos])return;
 if(t.selected===null){$('#tutorialFeedback').textContent='Touchez d’abord une carte de votre main, en bas.';return}
 if(t.first&&(t.selected!==0||pos!==3)){$('#tutorialFeedback').textContent='Pour cette première capture, posez Ven dans la case lumineuse, à gauche de l’araignée.';return}
 tutorialMove('p',t.selected,pos);t.first=false;t.phase='after-player';renderTutorial();
}
function tutorialMove(owner,index,pos){
 const t=tutorialDuel,card=t.hands[owner].splice(index,1)[0];t.board[pos]={card,owner};
 const flips=capture(pos,owner,t.board,'basic-open');t.last=[...flips.keys()];t.selected=null;
 const sides=['haut','droite','bas','gauche'];
 const comparisons=[...flips.entries()].map(([pos,f])=>`${card.v[f.side]} (${sides[f.side]}) > ${t.board[pos].card.v[f.opp]} (${sides[f.opp]})`);
 t.message=flips.size?`${owner==='p'?'Bien joué !':'L’adversaire capture aussi :'} ${comparisons.join(' ; ')}. ${flips.size===1?'La carte change':'Les cartes changent'} de couleur et ${owner==='p'?(flips.size===1?'vous appartient désormais.':'vous appartiennent désormais.'):(flips.size===1?'passe à l’adversaire.':'passent à l’adversaire.')}`:`${owner==='p'?'Vous avez':'L’adversaire a'} posé ${card.name}. Aucune valeur voisine adverse n’est dépassée : aucune capture.`;
 AudioEngine.sfx(flips.size?'capture':'place');
 if(t.board.every(Boolean))t.phase='done';
}
function advanceTutorial(){
 const t=tutorialDuel;if(!t)return;
 if(t.phase==='done'){closeTutorial();return}
 if(t.phase==='intro'||t.phase==='after-ai'){
  t.phase='choose';t.last=[];t.message=t.first?'Touchez Ven, puis la case lumineuse : son 6 à droite bat le 4 à gauche de l’araignée.':'Choisissez une carte, puis une case libre. Seuls les côtés qui se touchent se comparent. Une égalité ne capture rien.';
 }else if(t.phase==='after-player'){
  const move=tutorialMoves('a').sort((a,b)=>a.captures-b.captures)[0];
  if(move){tutorialMove('a',move.index,move.pos);if(t.phase!=='done')t.phase='after-ai'}
 }
 renderTutorial();
}
function tutorialCard(card,owner){
 const el=document.createElement('span');el.className=`card image-card ${owner==='a'?'enemy':''}`;el.innerHTML=cardFaceMarkup(card);return el;
}
function renderTutorial(){
 const t=tutorialDuel;if(!t)return;const done=t.phase==='done',choosing=t.phase==='choose',hint=choosing?tutorialHint():null;
 const p=t.board.filter(s=>s?.owner==='p').length,a=t.board.filter(s=>s?.owner==='a').length;
 $('#tutorialTitle').textContent=done?(p>a?'Victoire !':'Duel terminé'):t.first?'Votre première capture':'À vous de jouer';
 $('#tutorialProgress').textContent=`Duel guidé · ${t.board.filter(Boolean).length} / 9 cartes posées`;
 $('#tutorialText').textContent=done?`Le plateau est plein : ${p} cartes pour vous, ${a} pour l’adversaire. Celui qui contrôle le plus de cartes gagne. D’autres variantes existent : vous les découvrirez plus tard.`:'Un chiffre plus élevé bat le chiffre adverse qui lui fait face. La carte capturée prend votre couleur.';
 $('#tutorialFeedback').textContent=t.message;
 $('#tutorialScore').textContent=`Vous ${p} — ${a} Adversaire`;
 const next=$('#tutorialNext');next.disabled=choosing;next.textContent=done?'Terminer':t.phase==='intro'?'À moi de jouer':t.phase==='after-player'?'Tour de l’adversaire':t.phase==='after-ai'?'À mon tour':'Posez votre carte';
 const grid=$('#tutorialBoard');grid.replaceChildren();
 t.board.forEach((slot,pos)=>{
  const cell=document.createElement('button');cell.type='button';cell.className='cell tutorial-cell';cell.dataset.pos=pos;
  cell.classList.toggle('tutorial-target',hint?.pos===pos);cell.classList.toggle('tutorial-captured',t.last.includes(pos));
  cell.disabled=!!slot||!choosing;cell.setAttribute('aria-label',slot?`${slot.card.name}, ${slot.owner==='p'?'à vous':'adverse'}`:`Case ${pos+1}${hint?.pos===pos?' conseillée':''}`);
  if(slot)cell.append(tutorialCard(slot.card,slot.owner));else cell.innerHTML=hint?.pos===pos?'<span class="tutorial-target-label">Posez ici</span>':'';
  cell.onclick=()=>tutorialPlace(pos);grid.append(cell);
 });
 for(const owner of ['a','p']){
  const hand=$(owner==='p'?'#tutorialHand':'#tutorialOpponent');hand.replaceChildren();
  t.hands[owner].forEach((card,index)=>{
   const button=document.createElement('button');button.className='tutorial-hand-card';button.disabled=owner==='a'||!choosing||(t.first&&index!==0);button.setAttribute('aria-label',`${card.name} : haut ${card.v[0]}, droite ${card.v[1]}, bas ${card.v[2]}, gauche ${card.v[3]}`);button.setAttribute('aria-pressed',String(owner==='p'&&index===t.selected));
   button.classList.toggle('tutorial-suggested',owner==='p'&&hint?.index===index);button.append(tutorialCard(card,owner));
   button.onclick=()=>{t.selected=index;renderTutorial();$('#tutorialFeedback').textContent=`${card.name} : ↑ ${card.v[0]} · → ${card.v[1]} · ↓ ${card.v[2]} · ← ${card.v[3]}. ${t.first?'Posez-la à gauche de l’araignée.':'Touchez une case libre ; la case lumineuse est une suggestion.'}`};hand.append(button);
  });
 }
}
function initTutorial(){
 document.body.insertAdjacentHTML('beforeend',`<section id="tutorialDialog" class="tutorial-dialog hidden" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle"><article class="tutorial-table"><header><span id="tutorialProgress"></span><button id="tutorialClose" aria-label="Fermer le tutoriel">×</button><h2 id="tutorialTitle"></h2><p id="tutorialText"></p></header><div class="tutorial-arena"><div id="tutorialOpponent" aria-label="Main adverse"></div><strong id="tutorialScore"></strong><div class="board-wrap"><div id="tutorialBoard" class="board"></div></div><div id="tutorialHand" aria-label="Votre main"></div></div><p id="tutorialFeedback" role="status" aria-live="polite"></p><footer><button class="menu-btn secondary" id="tutorialRestart">Recommencer</button><button class="menu-btn" id="tutorialNext">À moi de jouer</button></footer></article></section>`);
 for(const parent of ['#startupScreen .menu-actions','#menuScreen .menu-actions']){const button=document.createElement('button');button.className='menu-btn secondary';button.textContent='Apprendre à jouer';button.onclick=openTutorial;$(parent).append(button)}
 $('#tutorialClose').onclick=closeTutorial;$('#tutorialRestart').onclick=()=>{const focus=tutorialReturnFocus;openTutorial();tutorialReturnFocus=focus};$('#tutorialNext').onclick=advanceTutorial;
 document.addEventListener('keydown',e=>{const dialog=$('#tutorialDialog');if(dialog.classList.contains('hidden'))return;if(e.key==='Escape'){closeTutorial();return}if(e.key==='Tab'){const focusable=[...dialog.querySelectorAll('button:not(:disabled)')],first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
}
