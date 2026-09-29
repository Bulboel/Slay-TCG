// Presentation only: the saved pack and collection are still managed by the game.
let boosterPresentation = {index:0,seen:-1,busy:false,timers:[],generation:0};
function queueBoosterPresentation(fn,delay){
 const generation=boosterPresentation.generation;
 const timer=setTimeout(()=>{if(generation===boosterPresentation.generation)fn()},delay);
 boosterPresentation.timers.push(timer);return timer;
}
function resetBoosterPresentation(){
 for(const timer of boosterPresentation.timers)clearTimeout(timer);
 boosterPresentation={index:0,seen:-1,busy:false,timers:[],generation:boosterPresentation.generation+1};
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
 $('#boosterSequenceStatus').textContent=`Carte ${index+1} / 5${index===4?' · La carte foil':''}`;
 const dots=$('#boosterStepDots');dots.replaceChildren();
 for(let i=0;i<5;i++){
  const button=document.createElement('button');button.textContent=String(i+1);
  button.setAttribute('aria-label',i<=seen?`Revoir la carte ${i+1}`:`Carte ${i+1} à découvrir`);
  button.setAttribute('aria-current',i===index?'step':'false');button.disabled=busy||i>seen;
  button.onclick=()=>showBoosterStep(i);dots.append(button);
 }
 $('#boosterNextBtn').classList.toggle('hidden',index===4);$('#boosterNextBtn').disabled=busy;
 $('#boosterSkipAll').classList.toggle('hidden',seen===4);$('#boosterSkipAll').disabled=busy;
 const claim=$('#boosterContinueBtn');claim.classList.toggle('hidden',seen<4);claim.disabled=seen<4||busy;
}
function showBoosterStep(index){
 if(boosterPresentation.busy||index<0||index>4)return;
 const fresh=index>boosterPresentation.seen;
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
 };
 const flip=()=>{
  pull.classList.remove('face-down');pull.classList.add('turning');AudioEngine.sfx('reveal');
  const rarity=pendingBooster[index].card.rarity;
  if(rarity==='divine')AudioEngine.sfx('divine');else if(['rare','alternative','parallel'].includes(rarity))AudioEngine.sfx('rare');
  if(reduced)finish();else queueBoosterPresentation(finish,650);
 };
 queueBoosterPresentation(()=>{if(index===4)animateBoosterAngel(pendingBooster[index],flip);else flip()},reduced?0:220);
}
