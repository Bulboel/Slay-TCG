// Presentation only: the saved pack and collection are still managed by the game.
let boosterPresentation = {index:0,seen:-1,busy:false,timers:[],stepToken:0,generation:0};
function queueBoosterPresentation(fn,delay){
 const generation=boosterPresentation.generation;
 const timer=setTimeout(()=>{if(generation===boosterPresentation.generation)fn()},delay);
 boosterPresentation.timers.push(timer);return timer;
}
function resetBoosterPresentation(){
 for(const timer of boosterPresentation.timers)clearTimeout(timer);
 boosterPresentation={index:0,seen:-1,busy:false,timers:[],stepToken:0,generation:boosterPresentation.generation+1};
 document.querySelector('#boosterSequenceControls')?.classList.add('hidden');
 document.querySelector('#boosterCards')?.classList.remove('sequence');
}
function beginBoosterPresentation(){
 const holder=$('#boosterCards');holder.classList.add('revealed','sequence');
 $('#boosterSequenceControls').classList.remove('hidden');
 $('#boosterNextBtn').onclick=()=>{if(!boosterPresentation.busy)showBoosterStep(Math.min(4,boosterPresentation.index+1))};
 $('#boosterSkipAll').onclick=()=>{
  if(boosterPresentation.busy)return;
  // Keep the final foil reveal (and its angel) even when skipping the first cards.
  boosterPresentation.seen=Math.max(3,boosterPresentation.seen);showBoosterStep(4);
 };
 showBoosterStep(0);
}
function renderBoosterStepControls(){
 const {index,seen,busy}=boosterPresentation;
 document.querySelector('.booster-zoom-hint').textContent=seen<4?'Ouverture automatique · Touchez la carte pour faire une pause et zoomer.':'Touchez une carte révélée pour l’agrandir.';
 $('#boosterSequenceStatus').textContent=`Carte ${index+1} / 5${index===4?' · La carte foil':''}`;
 const dots=$('#boosterStepDots');dots.replaceChildren();
 for(let i=0;i<5;i++){
  const button=document.createElement('button');button.textContent=String(i+1);
  button.setAttribute('aria-label',i<=seen?`Revoir la carte ${i+1}`:`Carte ${i+1} à découvrir`);
  button.setAttribute('aria-current',i===index?'step':'false');button.disabled=busy||seen<4;
  button.onclick=()=>showBoosterStep(i);dots.append(button);
 }
 $('#boosterNextBtn').classList.toggle('hidden',seen<4||index===4);$('#boosterNextBtn').disabled=busy;
 $('#boosterSkipAll').classList.toggle('hidden',seen===4);$('#boosterSkipAll').disabled=busy;
 const claim=$('#boosterContinueBtn');claim.classList.toggle('hidden',seen<4);claim.disabled=seen<4||busy;
}
function showBoosterStep(index){
 if(boosterPresentation.busy||index<0||index>4)return;
 const fresh=index>boosterPresentation.seen;
 const stepToken=++boosterPresentation.stepToken;
 boosterPresentation.index=index;boosterPresentation.busy=fresh;
 const pulls=[...document.querySelectorAll('#boosterCards .booster-pull')];
 pulls.forEach((el,i)=>{
  const active=i===index;el.classList.toggle('active',active);el.classList.remove('turning');
  el.classList.toggle('face-down',i>boosterPresentation.seen);el.tabIndex=active&&!fresh?0:-1;
  el.setAttribute('aria-hidden',String(!active));
  el.setAttribute('aria-label',i>boosterPresentation.seen?`Carte ${i+1} à découvrir`:'Agrandir '+pendingBooster[i].card.name);
 });
 renderBoosterStepControls();if(!fresh)return;
 const pull=pulls[index],reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const finish=()=>{
  pull.classList.remove('turning');boosterPresentation.seen=Math.max(index,boosterPresentation.seen);boosterPresentation.busy=false;
  pull.tabIndex=0;pull.setAttribute('aria-label','Agrandir '+pendingBooster[index].card.name);renderBoosterStepControls();
  if(index<4){
   const advance=()=>{
    if(stepToken!==boosterPresentation.stepToken)return;
    // Let players inspect a card and wait while the app is in the background.
    if(document.hidden||!$('#cardZoom').classList.contains('hidden')){queueBoosterPresentation(advance,250);return}
    showBoosterStep(index+1);
   };
   queueBoosterPresentation(advance,850);
  }
 };
 const flip=()=>{
  pull.classList.remove('face-down');pull.classList.add('turning');AudioEngine.sfx('reveal');
  const rarity=pendingBooster[index].card.rarity;
  if(rarity==='rare'&&!reduced)burstRareStars(pull);
  if(rarity==='divine')AudioEngine.sfx('divine');else if(['rare','alternative','parallel'].includes(rarity))AudioEngine.sfx('rare');
  if(reduced)finish();else queueBoosterPresentation(finish,450);
 };
 queueBoosterPresentation(()=>{if(index===4)animateBoosterAngel(pendingBooster[index],flip);else flip()},reduced?0:130);
}

function burstRareStars(pull){
 const burst=document.createElement('span');burst.className='rare-spark-burst';burst.setAttribute('aria-hidden','true');
 for(let i=0;i<12;i++){const star=document.createElement('i');star.textContent=i%3?'✦':'✧';const side=i%2?1:-1;star.style.cssText=`--spark-side:${side};--spark-top:${18+Math.floor(i/2)*12}%;--spark-dx:${side*(26+(i%3)*15)}px;--spark-dy:${-36+(i%4)*24}px;--spark-delay:${i%3*.035}s`;burst.append(star)}
 pull.querySelector('.booster-flipper').append(burst);queueBoosterPresentation(()=>burst.remove(),900);
}
