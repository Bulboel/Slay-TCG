// One-time challenges live in the economy profile, so save/import/reset share their lifecycle.
const elementalBacks={water:'Eau',wind:'Vent',fire:'Feu',earth:'Terre',ice:'Glace',lightning:'Foudre'};
let boardChoice=null;
function challengeState(){if(!economy.challenges||typeof economy.challenges!=='object'||Array.isArray(economy.challenges))economy.challenges={};return economy.challenges}
function treasureCollectionProgress(){const cards=catalog.filter(card=>card.setId==='un-nouveau-depart'&&card.kind!=='memory');return {total:cards.length,owned:cards.filter(card=>ownedCopies(card.id)>0).length,foil:cards.filter(card=>(collection.foils?.[card.id]||0)>0).length}}
function onlineVictoryCount(){try{const ids=JSON.parse(localStorage.getItem('hackenia-online-victories-v1')||'[]');return Array.isArray(ids)?new Set(ids.filter(id=>typeof id==='string')).size:0}catch{return 0}}
function collectedSetCards(){return catalog.filter(card=>ownedCopies(card.id)>0).length}
function checkChallenges(quickWin=false){
 const state=challengeState();let changed=false,earned=0;
 if(quickWin&&!state.quickWin){state.quickWin={completedAt:Date.now()};economy.gold+=50;earned=50;changed=true}
 if(collectedSetCards()>=100&&!state.collection100){state.collection100={completedAt:Date.now()};changed=true}
 const onlineWins=onlineVictoryCount();
 if(onlineWins>=5&&!state.onlineFiveWins){state.onlineFiveWins={completedAt:Date.now()};changed=true}
 const treasure=treasureCollectionProgress();
 if(treasure.total>0&&treasure.owned===treasure.total&&treasure.foil===treasure.total&&!state.treasureComplete){state.treasureComplete={completedAt:Date.now()};changed=true}
 if(changed){saveEconomy();if(saveSlotActive)syncProgressSave()}
 return earned;
}
const grandTriadeRules=['basic-open','basic-dark','same-open','same-dark','plus-open','plus-dark','elements-open','elements-dark'];
function grandTriadeProgress(){
 const state=challengeState(),progress=state.grandTriadeProgressV2||{};
 return {quick:!!progress.quick,story:!!progress.story,rules:grandTriadeRules.filter(r=>Array.isArray(progress.rules)&&progress.rules.includes(r))};
}
function recordGrandTriadeWin(mode,rule){
 const state=challengeState();if(state.grandTriadeWin)return false;
 const progress=grandTriadeProgress();let changed=false;
 if(mode==='quick'&&!progress.quick){progress.quick=true;changed=true}
 if((mode==='story'||mode.startsWith('story-'))&&!progress.story){progress.story=true;changed=true}
 if(mode==='deck'&&grandTriadeRules.includes(rule)&&!progress.rules.includes(rule)){progress.rules.push(rule);changed=true}
 if(!changed)return false;
 state.grandTriadeProgressV2=progress;
 const completed=progress.quick&&progress.story&&progress.rules.length===grandTriadeRules.length;
 if(completed)state.grandTriadeWin={completedAt:Date.now()};
 saveEconomy();if(typeof saveSlotActive!=='undefined'&&saveSlotActive)syncProgressSave();
 renderChallenges();return completed;
}
function unlockAdditionBoard(){const state=challengeState();if(state.additionWin)return false;state.additionWin={completedAt:Date.now()};saveEconomy();if(typeof saveSlotActive!=='undefined'&&saveSlotActive)syncProgressSave();renderChallenges();return true}
function unlockIdenticalBoard(){const state=challengeState();if(state.identicalWin)return false;state.identicalWin={completedAt:Date.now()};saveEconomy();if(typeof saveSlotActive!=='undefined'&&saveSlotActive)syncProgressSave();renderChallenges();return true}
function awardJordanSweep(){const state=challengeState();if(state.jordanSweep)return false;state.jordanSweep={completedAt:Date.now()};economy.gold=(Number(economy.gold)||0)+200;saveEconomy();if(typeof saveSlotActive!=='undefined'&&saveSlotActive)syncProgressSave();renderChallenges();renderEarnedBacks();return true}
function awardCaleizisVictory(){const state=challengeState();if(state.caleizisVictory)return false;state.caleizisVictory={completedAt:Date.now()};saveEconomy();renderChallenges();renderEarnedBacks();return true}
function backUnlocked(id){if(typeof id!=='string')return false;return (id==='treasure-gold'&&!!challengeState().treasureComplete)||(id==='caleizis-crying'&&!!challengeState().caleizisVictory)||(id==='jordan-cool'&&!!challengeState().jordanSweep)||(id==='georges-chibi'&&!!challengeState().pantheonGeorges)||['official','sun','mist'].includes(id)||(id.startsWith('element-')&&elementalBacks[id.slice(8)]&&!!challengeState().collection100)}
function renderEarnedBacks(){
 const holder=document.querySelector('.back-options');if(!holder)return;
 let treasure=holder.querySelector('[data-back="treasure-gold"]');
 if(!treasure){treasure=document.createElement('button');treasure.type='button';treasure.className='back-choice';treasure.dataset.back='treasure-gold';treasure.innerHTML='<span class="card card-back back-treasure-gold"></span><span>Trésor d’Hackénia</span><small class="back-lock"></small>';holder.append(treasure);treasure.onclick=()=>{if(!backUnlocked('treasure-gold'))return;settings.back='treasure-gold';applySettings();renderMemory()}}
 treasure.disabled=!backUnlocked('treasure-gold');treasure.querySelector('.back-lock').textContent=treasure.disabled?'Défi : collection et foils complètes':'Débloqué';treasure.setAttribute('aria-pressed',String(settings.back==='treasure-gold'));

 let caleizis=holder.querySelector('[data-back="caleizis-crying"]');
 if(!caleizis){
  caleizis=document.createElement('button');caleizis.type='button';caleizis.className='back-choice';caleizis.dataset.back='caleizis-crying';
  caleizis.innerHTML='<span class="card card-back back-caleizis-crying"></span><span>Caleïzis en larmes</span><small class="back-lock"></small>';
  holder.append(caleizis);
  caleizis.onclick=()=>{if(!backUnlocked('caleizis-crying'))return;settings.back='caleizis-crying';applySettings();renderMemory()};
 }
 caleizis.disabled=!backUnlocked('caleizis-crying');
 caleizis.querySelector('.back-lock').textContent=caleizis.disabled?'Défi : vaincre Caleïzis':'Débloqué';
 caleizis.setAttribute('aria-pressed',String(settings.back==='caleizis-crying'));

 let georges=holder.querySelector('[data-back="georges-chibi"]');
 if(!georges){georges=document.createElement('button');georges.type='button';georges.className='back-choice';georges.dataset.back='georges-chibi';georges.innerHTML='<span class="card card-back back-georges-chibi" style="background-image:url(assets/Garde%20chibi%20devant%20le%20palais%20enchant%C3%A9.png);background-size:100% 100%"></span><span>Georges, garde du palais</span><small class="back-lock"></small>';holder.append(georges);georges.onclick=()=>{if(!backUnlocked('georges-chibi'))return;settings.back='georges-chibi';applySettings();renderMemory()}}
 georges.disabled=!backUnlocked('georges-chibi');georges.querySelector('.back-lock').textContent=georges.disabled?'Défi : battre Georges dans le Panthéon':'Débloqué';georges.setAttribute('aria-pressed',String(settings.back==='georges-chibi'));
 let jordan=holder.querySelector('[data-back="jordan-cool"]');
 if(!jordan){jordan=document.createElement('button');jordan.className='back-choice';jordan.dataset.back='jordan-cool';jordan.innerHTML='<span class="card card-back back-jordan-cool"></span><span>Jordan, l’étalon</span><small class="back-lock"></small>';holder.append(jordan);jordan.onclick=()=>{if(!backUnlocked('jordan-cool'))return;settings.back='jordan-cool';applySettings();renderMemory()}}
 jordan.disabled=!backUnlocked('jordan-cool');jordan.querySelector('.back-lock').textContent=jordan.disabled?'Défi : conquérir les 9 cases':'Débloqué';jordan.setAttribute('aria-pressed',String(settings.back==='jordan-cool'));

 for(const [key,name] of Object.entries(elementalBacks)){
  const id='element-'+key;let button=holder.querySelector('[data-back="'+id+'"]');
  if(!button){button=document.createElement('button');button.className='back-choice';button.dataset.back=id;button.innerHTML='<span class="card card-back back-'+id+'"></span><span>'+name+'</span><small class="back-lock"></small>';holder.append(button);button.onclick=()=>{if(!backUnlocked(id))return;settings.back=id;applySettings();renderMemory()}}
  button.disabled=!backUnlocked(id);button.querySelector('.back-lock').textContent=button.disabled?'Défi : 100 cartes':'Débloqué';button.setAttribute('aria-pressed',String(settings.back===id));
 }
}
function renderChallenges(){
 const state=challengeState(),count=collectedSetCards();
 const grandProgress=grandTriadeProgress(),treasure=treasureCollectionProgress();
 const challenges=[{id:'pantheonGeorges',title:'Battre Georges dans le Panthéon',reward:'Dos de carte Chibi de Georges gardant la porte principale',progress:state.pantheonGeorges?1:0,total:1},{id:'onlineFiveWins',title:'Remporter 5 duels en ligne contre d’autres joueurs',reward:'Hexagone prismatique arc-en-ciel animé pour le compteur de score',progress:Math.min(onlineVictoryCount(),5),total:5},{id:'treasureComplete',title:'Compléter les cartes jouables du set « Un nouveau départ », versions foil comprises (hors Souvenirs)',reward:'Dos de carte « Trésor d’Hackénia », plateau doré et hexagone animé du compteur',progress:treasure.owned+treasure.foil,total:treasure.total*2},{id:'caleizisVictory',title:'Battre Caleizis dans le mode Histoire',reward:'Dos de carte exclusif « Caleizis en larmes »',progress:state.caleizisVictory?1:0,total:1},{id:'jordanSweep',title:'Conquérir les 9 cases du plateau à la fin d’un duel',reward:'200 pièces d’or et dos de carte « Jordan, l’étalon »',progress:state.jordanSweep?1:0,total:1},{id:'grandTriadeWin',title:'Grand maître de la Triade : gagner une fois en Partie rapide, une fois en Histoire et gagner avec les 8 règles du mode Jouer (Clair et Obscur pour chaque variante)',reward:'Plateau de jeu « Le Cercle des Six Éléments »',progress:Number(grandProgress.quick)+Number(grandProgress.story)+grandProgress.rules.length,total:10},{id:'additionWin',title:'Remporter un match avec la règle « Addition » (Clair ou Obscur), quel que soit le mode',reward:'Plateau de jeu « Les Petits Chevaux de Jordan »',progress:state.additionWin?1:0,total:1},{id:'identicalWin',title:'Remporter un match avec la règle « Identique » (Clair ou Obscur)',reward:'Plateau de jeu « Sceau des Arcanes »',progress:state.identicalWin?1:0,total:1},{id:'quickWin',title:'Gagnez une partie rapide',reward:'50 pièces d’or',progress:state.quickWin?1:0,total:1},{id:'collection100',title:'Possédez 100 cartes différentes du set « Un nouveau départ »',reward:'Six dos de cartes élémentaires',progress:Math.min(count,100),total:100}];
 for(const [selector,archived] of [['#challengeActive',false],['#challengeArchive',true]]){
  const holder=document.querySelector(selector);holder.replaceChildren();
  for(const challenge of challenges.filter(c=>!!state[c.id]===archived)){
   const article=document.createElement('article');article.className='challenge-card'+(archived?' complete':'');
   const title=document.createElement('strong');title.textContent=challenge.title;
   const reward=document.createElement('p');reward.textContent='Récompense : '+challenge.reward;
   if(challenge.id==='grandTriadeWin'){
    const p=grandTriadeProgress(),detail=document.createElement('p');
    detail.textContent='Progression : '+(Number(p.quick)+Number(p.story)+p.rules.length)+'/10 victoires';article.append(detail);
    const tasks=[
     ['Remporter une partie rapide',p.quick],
     ['Remporter un duel en mode Histoire',p.story],
     ['Jouer : Classique — Clair',p.rules.includes('basic-open')],
     ['Jouer : Classique — Obscur',p.rules.includes('basic-dark')],
     ['Jouer : Identique — Clair',p.rules.includes('same-open')],
     ['Jouer : Identique — Obscur',p.rules.includes('same-dark')],
     ['Jouer : Addition — Clair',p.rules.includes('plus-open')],
     ['Jouer : Addition — Obscur',p.rules.includes('plus-dark')],
     ['Jouer : Éléments actifs — Clair',p.rules.includes('elements-open')],
     ['Jouer : Éléments actifs — Obscur',p.rules.includes('elements-dark')]
    ];
    const list=document.createElement('ul');list.className='grand-triade-checklist';list.setAttribute('aria-label','Étapes du défi Grand maître de la Triade');
    for(const [label,done] of tasks){
     const item=document.createElement('li');item.className=done?'done':'pending';
     const mark=document.createElement('span');mark.className='challenge-task-mark';mark.textContent=done?'✓':'○';mark.setAttribute('aria-hidden','true');
     const description=document.createElement('span');description.textContent=label+(done?' — terminé':' — à faire');
     item.append(mark,description);list.append(item);
    }
    article.append(list);
   }
   const status=document.createElement('small');status.textContent=archived?'✓ Accompli • récompense reçue':challenge.progress+' / '+challenge.total;
   article.append(title,reward,status);if(!archived){const progress=document.createElement('progress');progress.value=challenge.progress;progress.max=challenge.total;progress.setAttribute('aria-label',challenge.title);article.append(progress)}holder.append(article);
  }
  if(!holder.children.length){const p=document.createElement('p');p.textContent=archived?'Vos défis accomplis apparaîtront ici.':'Tous les défis sont accomplis !';holder.append(p)}
 }
}
function clearBoardChoice(){boardChoice=null;if(choiceState?.board)choiceState=null;document.querySelector('#board')?.classList.remove('choosing-memory');document.querySelector('#boardChoicePrompt')?.remove();document.querySelectorAll('#board .cell').forEach(cell=>{cell.classList.remove('memory-eligible','memory-ineligible');cell.removeAttribute('aria-disabled')})}
function openBoardChoice(title,text,positions,onPick){clearBoardChoice();choiceState={board:true};boardChoice={title,text,positions,onPick};document.querySelector('#memoryChoice').classList.add('hidden');paintBoardChoice();document.querySelector('#board .memory-eligible')?.focus({preventScroll:true})}
function paintBoardChoice(){if(!boardChoice)return;const holder=document.querySelector('#board');holder.classList.add('choosing-memory');holder.querySelectorAll('.cell').forEach(cell=>{const eligible=boardChoice.positions.includes(Number(cell.dataset.index));cell.classList.toggle('memory-eligible',eligible);cell.classList.toggle('memory-ineligible',!eligible);cell.setAttribute('aria-disabled',String(!eligible))});let prompt=document.querySelector('#boardChoicePrompt');if(!prompt){prompt=document.createElement('div');prompt.id='boardChoicePrompt';prompt.setAttribute('role','status');document.querySelector('.memory-zone').prepend(prompt)}prompt.textContent=boardChoice.title+' — '+boardChoice.text;document.querySelector('#turn').textContent='Choisissez sur le plateau'}
document.addEventListener('click',event=>{const cell=event.target.closest('#board .cell');if(!cell||!boardChoice)return;event.preventDefault();event.stopImmediatePropagation();const position=Number(cell.dataset.index);if(!boardChoice.positions.includes(position))return;const onPick=boardChoice.onPick;clearBoardChoice();onPick(position)},true);
// Keep the landing frame above the enlarged dragged card, without intercepting input.
function showLandingFrame(cell){
 let frame=document.querySelector('#landingFrame');
 if(!cell){frame?.remove();return}
 if(!frame){frame=document.createElement('div');frame.id='landingFrame';frame.setAttribute('aria-hidden','true');frame.innerHTML='<span>Poser ici</span>';document.body.append(frame)}
 const bounds=cell.getBoundingClientRect();
 Object.assign(frame.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px'});
 frame.dataset.index=cell.dataset.index;
}

/* Grand maître de la Triade: persistent, readable per-rule checklist. */
