// Duel gestures are isolated from scrollable collection and menu cards.
let duelTouchZoomGuardUntil=0;
function bindDuelTouch(el,card,owner,index,hidden,playable){
 let gesture=null,suppressClickUntil=0;
 const clear=()=>{if(gesture)clearTimeout(gesture.timer);gesture=null};
 el.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!e.isPrimary)return;
  clear();const start={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY,button:0,pointerType:'touch'};
  gesture={start,moved:false,held:false,timer:0};el.setPointerCapture?.(e.pointerId);
  if(!hidden)gesture.timer=setTimeout(()=>{
   if(!gesture||gesture.moved||!el.isConnected||document.querySelector('#gameApp').classList.contains('hidden'))return;
   gesture.held=true;duelTouchZoomGuardUntil=Date.now()+1000;suppressClickUntil=Date.now()+800;cancelDuelDrag();
   openCardZoom({...card,mastery:card.mastery||masteryTier(ownedCopies(card.id))});
  },420);
 });
 el.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.start.pointerId||gesture.held)return;
  if(Math.hypot(e.clientX-gesture.start.clientX,e.clientY-gesture.start.clientY)>9){
   clearTimeout(gesture.timer);
   if(!gesture.moved){gesture.moved=true;suppressClickUntil=Date.now()+800;if(playable)startDrag(gesture.start,owner,index,el)}
  }
 });
 el.addEventListener('pointerup',()=>{if(gesture?.held)duelTouchZoomGuardUntil=Date.now()+500;if(gesture?.moved||gesture?.held)suppressClickUntil=Date.now()+800;clear()});
 el.addEventListener('pointercancel',clear);el.addEventListener('lostpointercapture',clear);
 el.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 el.addEventListener('contextmenu',e=>{if(gesture||Date.now()<suppressClickUntil)e.preventDefault()});
}
