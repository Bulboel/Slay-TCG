// One-time challenges live in the economy profile, so save/import/reset share their lifecycle.
const elementalBacks={water:'Eau',wind:'Vent',fire:'Feu',earth:'Terre',ice:'Glace',lightning:'Foudre'};
let boardChoice=null;
function challengeState(){if(!economy.challenges||typeof economy.challenges!=='object'||Array.isArray(economy.challenges))economy.challenges={};return economy.challenges}
function collectedSetCards(){return catalog.filter(card=>ownedCopies(card.id)>0).length}
function checkChallenges(quickWin=false){
 const state=challengeState();let changed=false,earned=0;
 if(quickWin&&!state.quickWin){state.quickWin={completedAt:Date.now()};economy.gold+=50;earned=50;changed=true}
 if(collectedSetCards()>=100&&!state.collection100){state.collection100={completedAt:Date.now()};changed=true}
 if(changed){saveEconomy();if(saveSlotActive)syncProgressSave()}
 return earned;
}
const grandTriadeModes=['quick','deck','story','pvp'];
const grandTriadeRules=['basic-open','basic-dark','same-open','same-dark','plus-open','plus-dark','elements-open','elements-dark'];
function grandTriadeProgress(){
 const state=challengeState(),progress=state.grandTriadeProgress||{};
 const modes=Array.isArray(progress.modes)?progress.modes:[],rules=Array.isArray(progress.rules)?progress.rules:[];
 return {modes:grandTriadeModes.filter(m=>modes.includes(m)),rules:grandTriadeRules.filter(r=>rules.includes(r))};
}
function recordGrandTriadeWin(mode,rule){
 const state=challengeState();if(state.grandTriadeWin)return false;
 const progress=grandTriadeProgress();
 const group=mode==='quick'||mode==='deck'||mode==='pvp'?mode:mode==='story'||mode.startsWith('story-')?'story':null;
 let changed=false;
 if(group&&!progress.modes.includes(group)){progress.modes.push(group);changed=true}
 if(grandTriadeRules.includes(rule)&&!progress.rules.includes(rule)){progress.rules.push(rule);changed=true}
 if(!changed)return false;
 state.grandTriadeProgress=progress;
 const completed=progress.modes.length===grandTriadeModes.length&&progress.rules.length===grandTriadeRules.length;
 if(completed)state.grandTriadeWin={completedAt:Date.now()};
 saveEconomy();if(typeof saveSlotActive!=='undefined'&&saveSlotActive)syncProgressSave();
 renderChallenges();return completed;
}
function unlockAdditionBoard(){const state=challengeState();if(state.additionWin)return false;state.additionWin={completedAt:Date.now()};saveEconomy();if(typeof saveSlotActive!=='undefined'&&saveSlotActive)syncProgressSave();renderChallenges();return true}
function unlockIdenticalBoard(){const state=challengeState();if(state.identicalWin)return false;state.identicalWin={completedAt:Date.now()};saveEconomy();if(typeof saveSlotActive!=='undefined'&&saveSlotActive)syncProgressSave();renderChallenges();return true}
function backUnlocked(id){if(typeof id!=='string')return false;return ['official','sun','mist'].includes(id)||(id.startsWith('element-')&&elementalBacks[id.slice(8)]&&!!challengeState().collection100)}
function renderEarnedBacks(){
 const holder=document.querySelector('.back-options');if(!holder)return;
 for(const [key,name] of Object.entries(elementalBacks)){
  const id='element-'+key;let button=holder.querySelector('[data-back="'+id+'"]');
  if(!button){button=document.createElement('button');button.className='back-choice';button.dataset.back=id;button.innerHTML='<span class="card card-back back-'+id+'"></span><span>'+name+'</span><small class="back-lock"></small>';holder.append(button);button.onclick=()=>{if(!backUnlocked(id))return;settings.back=id;applySettings();renderMemory()}}
  button.disabled=!backUnlocked(id);button.querySelector('.back-lock').textContent=button.disabled?'Défi : 100 cartes':'Débloqué';button.setAttribute('aria-pressed',String(settings.back===id));
 }
}
function renderChallenges(){
 const state=challengeState(),count=collectedSetCards();
 const grandProgress=grandTriadeProgress();
 const challenges=[{id:'grandTriadeWin',title:'Grand maître de la Triade : remporter un match dans chaque mode (Partie rapide, Jouer avec un deck, Histoire, PVP local) et avec les 8 règles, tous modes confondus',reward:'Plateau de jeu « Le Cercle des Six Éléments »',progress:grandProgress.modes.length+grandProgress.rules.length,total:grandTriadeModes.length+grandTriadeRules.length},{id:'additionWin',title:'Remporter un match avec la règle « Addition » (Clair ou Obscur), quel que soit le mode',reward:'Plateau de jeu « Les Petits Chevaux de Jordan »',progress:state.additionWin?1:0,total:1},{id:'identicalWin',title:'Remporter un match avec la règle « Identique » (Clair ou Obscur)',reward:'Plateau de jeu « Sceau des Arcanes »',progress:state.identicalWin?1:0,total:1},{id:'quickWin',title:'Gagnez une partie rapide',reward:'50 pièces d’or',progress:state.quickWin?1:0,total:1},{id:'collection100',title:'Possédez 100 cartes différentes du set « Un nouveau départ »',reward:'Six dos de cartes élémentaires',progress:Math.min(count,100),total:100}];
 for(const [selector,archived] of [['#challengeActive',false],['#challengeArchive',true]]){
  const holder=document.querySelector(selector);holder.replaceChildren();
  for(const challenge of challenges.filter(c=>!!state[c.id]===archived)){
   const article=document.createElement('article');article.className='challenge-card'+(archived?' complete':'');
   const title=document.createElement('strong');title.textContent=challenge.title;
   const reward=document.createElement('p');reward.textContent='Récompense : '+challenge.reward;
   if(challenge.id==='grandTriadeWin'){
    const p=grandTriadeProgress(),detail=document.createElement('p');
    detail.textContent='Modes : '+p.modes.length+'/4 · Règles : '+p.rules.length+'/8';article.append(detail);
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
