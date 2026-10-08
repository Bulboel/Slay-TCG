// Chapter 1, part 4: the torch's challenge. Only a victory opens the epilogue.
function renderMineMenu() {
  const unlocked = story.part3 === 'complete', complete = story.part4 === 'complete';
  $('#storyPart4').classList.toggle('locked', !unlocked);
  $('#storyPart4').classList.toggle('complete', complete);
  $('#chapter1Part4Btn').disabled = !unlocked;
  $('#chapter1Part4Btn').textContent = !unlocked ? 'Verrouillé' : complete ? 'Rejouer' : String(story.stage).startsWith('part4') ? 'Continuer' : 'Commencer';
  $('#chapter1Part4Status').textContent = !unlocked ? 'Terminez la partie 3 pour rejoindre les mines.' : complete ? 'Partie terminée — une araignée blanche a fui dans un tunnel.' : story.part4 === 'retry' ? 'Remportez le défi de la torche pour avancer.' : 'Des mineurs en danger et deux torches bleues.';
  $('#chapter2Card').classList.toggle('locked', !complete);
  $('#chapter2Status').textContent = complete ? 'La suite de l’aventure sera ajoutée prochainement.' : 'Terminez la partie 4 pour continuer.';
  $('#chapter2Btn').textContent = complete ? 'Bientôt disponible' : 'Verrouillé';
}
function startMinePart() {
  if (story.part3 !== 'complete') return;
  const saved = readSaved('hackenia-story-match', null);
  if (story.stage === 'part4-match' && saved?.mode === 'story-mine') { restoreStoryMatch(saved); return; }
  if (story.stage === 'part4-victory') { showMineVictory(); return; }
  if (story.part4 === 'retry') { startMineGame(); return; }
  const resume = story.stage === 'part4-intro' ? story.mineStep : 0;
  story.part4 = 'started'; story.stage = 'part4-intro'; story.mineChallengeWon = false; saveStory();
  runStorySequence([
    {speaker:'Voix off',location:'Berdésa',cast:['grimgors','jhimm'],mood:'surprised',text:'À Berdésa, un villageois les interpelle : des mineurs sont en danger ! Grimgors et Jhimm partent aussitôt en tête du groupe.'},
    {speaker:'Voix off',location:'Les mines de Berdésa',cast:[],text:'Dans l’entrée de la mine, des wagons renversés et des pioches brisées encombrent le sol. Deux torches bleues éclairent une unique porte de bois.'},
    {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala'],text:'Cette lumière… Attendez, je prends une torche.'},
    {speaker:'La voix de la torche',location:'Les mines de Berdésa',cast:['kala'],text:'Accepte mon défi et tu verras plus clair que jamais.'},
    {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala'],text:'Alors montre-moi le chemin.',finalLabel:'Accepter le défi'}
  ], startMineGame, resume);
}
function startMineGame() {
  if (story.part3 !== 'complete') return;
  if (activeDeck().cards.length === 5 && !validDeck(activeDeck())) { renderDeckBuilder(); openPanel('#deckScreen'); return; }
  applyRulePreset('basic-open'); currentMode = 'story-mine'; gameType = 'ai';
  const chosen = validDeck(activeDeck()) ? deckCardsWithFoil(activeDeck()) : ['p27','p23','p04','p08','p13'].map(catalogById);
  const opponent = ['p38','p36','p60','p17','p01'].map(catalogById);
  board = Array(9).fill(null); hands = {p:chosen.map(playerCard), a:opponent.map(cloneCard)};
  selected = null; turn = 'p'; locked = false; passing = false; matchRewarded = false; matchInProgress = true;
  resetMemories(); story.part4 = 'started'; story.stage = 'part4-match'; story.mineChallengeWon = false; story.mineStep = 0; saveStory();
  $('#storyScene').classList.add('hidden'); $('#menuScreen').classList.add('hidden');
  document.querySelectorAll('.panel-screen').forEach(x => x.classList.add('hidden'));
  $('#gameApp').classList.remove('hidden'); $('#leftLabel').textContent = 'Kala • votre main'; $('#rightLabel').textContent = 'La voix de la torche'; $('#rulesBtn').style.display = 'none';
  msg('Le défi de la torche', 'Remportez ce duel pour éclairer la suite du chemin.'); render(); saveStoryMatch();
}
function endMineGame(counts) {
  try { localStorage.removeItem('hackenia-story-match'); } catch {}
  if (counts.p > counts.a) {
    story.stage = 'part4-victory'; story.mineChallengeWon = true; story.mineStep = 0; saveStory();
    msg('Le défi est remporté', 'La lumière bleue révèle le chemin à Kala.'); setTimeout(showMineVictory, 1200);
  } else {
    story.part4 = 'retry'; story.stage = 'part4-retry'; story.mineChallengeWon = false; saveStory();
    msg(counts.p === counts.a ? 'Égalité' : 'Le défi continue', 'La torche vous attend pour une nouvelle tentative.');
    setTimeout(() => runStorySequence([{speaker:'La voix de la torche',location:'Les mines de Berdésa',cast:['kala'],text:'La lumière reste voilée. Reviens tenter le défi.',finalLabel:'Réessayer le duel'}], startMineGame), 1200);
  }
}
function showMineVictory() {
  if (!story.mineChallengeWon) return;
  const resume = story.stage === 'part4-victory' ? story.mineStep : 0;
  story.stage = 'part4-victory'; saveStory();
  runStorySequence([
    {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala'],mood:'surprised',text:'Je vois les galeries… comme si j’étais déjà venue ici.'},
    {speaker:'Voix off',location:'Les mines de Berdésa',cast:['grimgors'],text:'Deux secondes plus tard, Grimgors enfonce la porte de bois. Le groupe s’engouffre dans le passage.'},
    {speaker:'Voix off',location:'Les mines de Berdésa',cast:[],text:'Une horde d’araignées noires leur barre la route. Ensemble, les aventuriers les repoussent sans difficulté.'},
    {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala'],mood:'surprised',text:'Là ! Une araignée blanche… Elle s’enfuit dans cet autre tunnel.'},
    {speaker:'Voix off',location:'Les mines de Berdésa',cast:['kala'],text:'La petite silhouette disparaît dans l’obscurité. Fin de la partie 4 — un booster et 50 pièces d’or à la première réussite.',finalLabel:'Terminer la partie 4'}
  ], finishMinePart, resume);
}
function finishMinePart() {
  if (!story.mineChallengeWon) return;
  queueStoryBooster('part4');
  story.part4 = 'complete'; story.chapter1 = story.part6 === 'complete' ? 'complete' : 'started'; story.part5 = story.part5 === 'complete' ? 'complete' : 'new'; story.stage = 'part4-complete'; story.mineStep = 0; story.unlocked = Math.max(2, story.unlocked);
  if (!economy.storyRewards.part4) { economy.storyRewards.part4 = true; awardGold(50); }
  saveCollection(); saveStory(); showStoryMenu();
}

// Chapter 1, part 5. Rewards and narrative progress survive replay and reload.
function renderFinalMineMenu(){
 const unlocked=story.part4==='complete',complete=story.part5==='complete';
 $('#storyPart5').classList.toggle('locked',!unlocked);$('#storyPart5').classList.toggle('complete',complete);
 $('#chapter1Part5Btn').disabled=!unlocked;$('#chapter1Part5Btn').textContent=!unlocked?'Verrouillé':complete?'Rejouer':String(story.stage).startsWith('part5')?'Continuer':'Commencer';
 $('#chapter1Part5Status').textContent=!unlocked?'Terminez la partie 4.':complete?'Partie terminée — les mineurs sont en sécurité.':'Sauvez les mineurs et affrontez l’araignée géante.';
 $('#chapter2Card').classList.toggle('locked',!complete);$('#chapter2Status').textContent=complete?'La suite sera ajoutée prochainement.':'Terminez la partie 5 pour continuer.';$('#chapter2Btn').textContent=complete?'Bientôt disponible':'Verrouillé';
}
function startFinalMinePart(){
 if(story.part4!=='complete')return;
 const saved=readSaved('hackenia-story-match',null);
 if(story.stage==='part5-match'&&saved?.mode==='story-mine-finale'){restoreStoryMatch(saved);return}
 if(story.stage==='part5-victory'){showFinalMineVictory();return}
 if(story.part5==='retry'){startFinalMineGame();return}
 const resume=story.stage==='part5-intro'?story.finalMineStep:0;
 story.part5='started';story.chapter1='started';story.stage='part5-intro';story.finalMineWon=false;saveStory();
 runStorySequence([
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:['kala','grimgors','eberien'],text:'Dans les galeries, Kala observe les araignées blanches. Elles s’écartent des mineurs sans jamais les attaquer.'},
  {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala','grimgors','jhimm'],text:'Attendez… les araignées blanches sont inoffensives pour les humains ! Inutile de les combattre. Occupons-nous des mineurs.'},
  {speaker:'Jhimm',location:'Les mines de Berdésa',cast:['jhimm','kala'],text:'Je les emmène en lieu sûr. Restez ensemble et suivez-moi ! Je reviens dès qu’ils sont à l’abri.'},
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:['jhimm'],text:'Jhimm aide les mineurs à avancer et les conduit rapidement hors de la mine. Une fois tout le monde en sécurité, il retourne retrouver ses amis.'},
  {speaker:'Jhimm',location:'Les mines de Berdésa',cast:['jhimm','bolduc','grimgors'],mood:'neutral',text:'Ils sont à l’abri. Vous pouvez compter sur moi pour la suite !'},
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:['spider'],text:'Au dernier renfoncement, une énorme araignée noire se dresse devant le groupe. Celle-ci n’a rien des paisibles araignées blanches : elle leur barre le passage.'},
  {speaker:'Bolduc',location:'Les mines de Berdésa',cast:['bolduc','grimgors','eberien'],text:'Alors on va se frayer un chemin !',finalLabel:'Affronter l’araignée'}
 ],startFinalMineGame,resume);
}
function startFinalMineGame(){
 if(story.part4!=='complete')return;
 if(activeDeck().cards.length===5&&!validDeck(activeDeck())){renderDeckBuilder();openPanel('#deckScreen');return}
 applyRulePreset('basic-open');currentMode='story-mine-finale';gameType='ai';
 const chosen=validDeck(activeDeck())?deckCardsWithFoil(activeDeck()):['p27','p23','p04','p08','p13'].map(catalogById);
 board=Array(9).fill(null);hands={p:chosen.map(playerCard),a:Array.from({length:5},()=>cloneCard(catalogById('p02')))};
 selected=null;turn='p';locked=false;passing=false;matchRewarded=false;matchInProgress=true;resetMemories();
 story.part5='started';story.stage='part5-match';story.finalMineWon=false;story.finalMineStep=0;saveStory();
 $('#storyScene').classList.add('hidden');$('#menuScreen').classList.add('hidden');document.querySelectorAll('.panel-screen').forEach(x=>x.classList.add('hidden'));
 $('#gameApp').classList.remove('hidden');$('#leftLabel').textContent='Les aventuriers';$('#rightLabel').textContent='L’araignée géante';$('#rulesBtn').style.display='none';
 msg('La dernière galerie','Remportez le duel pour dégager le passage.');render();saveStoryMatch();
}
function endFinalMineGame(counts){
 try{localStorage.removeItem('hackenia-story-match')}catch{}
 if(counts.p>counts.a){story.stage='part5-victory';story.finalMineWon=true;story.finalMineStep=0;saveStory();msg('La voie est libre !','Bolduc s’avance pour porter le dernier coup.');setTimeout(showFinalMineVictory,1200)}
 else{story.part5='retry';story.stage='part5-retry';story.finalMineWon=false;saveStory();msg(counts.p===counts.a?'Égalité':'L’araignée vous barre la route','Réessayez pour ouvrir le passage.');setTimeout(()=>runStorySequence([{speaker:'Bolduc',location:'Les mines de Berdésa',cast:['bolduc'],text:'On reprend notre souffle… et on y retourne !',finalLabel:'Réessayer'}],startFinalMineGame),1200)}
}
function showFinalMineVictory(){
 if(!story.finalMineWon)return;
 const resume=story.stage==='part5-victory'?story.finalMineStep:0;story.stage='part5-victory';saveStory();
 runStorySequence([
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:['bolduc','grimgors'],text:'Bolduc abat son gourdin sur l’immense tête de l’araignée. Le choc résonne dans toute la galerie : la créature s’effondre enfin.'},
  {speaker:'Voix off',location:'Berdésa',cast:['kala','jhimm','bolduc'],mood:'neutral',text:'Les aventuriers rejoignent au village les mineurs que Jhimm a mis à l’abri. Ils sont enfin en sécurité.'},
  {speaker:'Voix off',location:'Berdésa',cast:['grimgors','bolduc','eberien'],mood:'neutral',text:'À l’auberge, un repas chaud et une nuit de repos leur rendent des forces. Puis ils reprennent la route vers la grotte des jumeaux, le passage qui mène au lac.',finalLabel:'Terminer la partie 5'}
 ],finishFinalMinePart,resume);
}
function finishFinalMinePart(){
 if(!story.finalMineWon)return;
 queueStoryBooster('part5');story.part5='complete';story.part6=story.part6==='complete'?'complete':'new';story.chapter1=story.part9==='complete'?'complete':'started';story.stage='part5-complete';story.finalMineStep=0;story.unlocked=Math.max(2,story.unlocked);
 if(!economy.storyRewards.part5){economy.storyRewards.part5=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}


// A scripted encounter: the wolf pack intentionally has five copies of p16.
function renderRescueMenu(){
 const unlocked=story.part5==='complete',complete=story.part6==='complete';
 $('#storyPart6').classList.toggle('locked',!unlocked);$('#storyPart6').classList.toggle('complete',complete);
 $('#chapter1Part6Btn').disabled=!unlocked;$('#chapter1Part6Btn').textContent=!unlocked?'Verrouillé':String(story.stage).startsWith('part6')&&story.stage!=='part6-complete'?'Continuer':complete?'Rejouer':'Commencer';
 $('#chapter1Part6Status').textContent=!unlocked?'Terminez la partie 5.':complete?'Messire Balai a rejoint les aventuriers.':'Une chute, une horde de loups et une rencontre inattendue.';
 $('#chapter2Card').classList.toggle('locked',!complete);$('#chapter2Status').textContent=complete?'La suite sera ajoutée prochainement.':'Terminez la partie 6 pour continuer.';$('#chapter2Btn').textContent=complete?'Bientôt disponible':'Verrouillé';
}
function startRescuePart(){
 if(story.part5!=='complete')return;
 const saved=readSaved('hackenia-story-match',null);
 if(story.stage==='part6-match'&&saved?.mode==='story-wolves'){restoreStoryMatch(saved);return}
 if(story.stage==='part6-victory'){showRescueVictory();return}
 if(story.stage==='part6-match'||story.part6==='retry'){startRescueGame();return}
 const resume=story.stage==='part6-intro'?story.rescueStep:0;
 story.part6='started';story.chapter1='started';story.stage='part6-intro';story.rescueWon=false;saveStory();
 runStorySequence([
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['kala','grimgors','eberien'],mood:'surprised',text:'Les aventuriers poursuivent leur route vers la grotte des jumeaux. Soudain, un énorme CRAC retentit au-dessus d’eux !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:[],text:'Un portail s’est ouvert dans le ciel. Une chose en tombe et disparaît derrière les arbres dans un fracas de branches.'},
  {speaker:'Jhimm',location:'Le Bois Tendre',cast:['jhimm','kala'],mood:'surprised',text:'Quelqu’un a peut-être besoin de nous ! Vite, allons voir !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['bolduc','grimgors','eberien'],text:'Ni une ni deux, les aventuriers courent vers le lieu de la chute. En approchant, ils entendent une voix : « Au secours ! À l’aide ! »'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['wolves'],text:'Les appels viennent de derrière un arbre. Une pauvre victime y est encerclée par une horde de loups affamés.'},
  {speaker:'Grimgors',location:'Le Bois Tendre',cast:['grimgors','jhimm','bolduc'],text:'Tenez bon ! Nous allons éloigner ces loups !',finalLabel:'Affronter les loups'}
 ],startRescueGame,resume);
}
function startRescueGame(){
 if(story.part5!=='complete')return;
 if(activeDeck().cards.length===5&&!validDeck(activeDeck())){renderDeckBuilder();openPanel('#deckScreen');return}
 applyRulePreset('basic-open');currentMode='story-wolves';gameType='ai';
 const chosen=validDeck(activeDeck())?deckCardsWithFoil(activeDeck()):['p27','p23','p04','p08','p13'].map(catalogById);
 board=Array(9).fill(null);hands={p:chosen.map(playerCard),a:Array.from({length:5},()=>cloneCard(catalogById('p16')))};
 selected=null;turn='p';locked=false;passing=false;matchRewarded=false;matchInProgress=true;resetMemories();
 story.part6='started';story.stage='part6-match';story.rescueWon=false;story.rescueStep=0;saveStory();
 $('#storyScene').classList.add('hidden');$('#menuScreen').classList.add('hidden');document.querySelectorAll('.panel-screen').forEach(x=>x.classList.add('hidden'));
 $('#gameApp').classList.remove('hidden');$('#leftLabel').textContent='Les aventuriers';$('#rightLabel').textContent='Horde de loups affamés';$('#rulesBtn').style.display='none';
 msg('Au secours !','Remportez le duel pour sauver la personne encerclée.');render();saveStoryMatch();
}
function endRescueGame(counts){
 try{localStorage.removeItem('hackenia-story-match')}catch{}
 if(counts.p>counts.a){story.stage='part6-victory';story.rescueWon=true;story.rescueStep=0;saveStory();setTimeout(showRescueVictory,1200)}
 else{story.part6='retry';story.stage='part6-retry';story.rescueWon=false;saveStory();setTimeout(()=>runStorySequence([{speaker:'Jhimm',location:'Le Bois Tendre',cast:['jhimm'],text:'Les loups sont encore là. Ne lâchons rien, cette personne compte sur nous !',finalLabel:'Réessayer'}],startRescueGame),1200)}
}
function showRescueVictory(){
 if(!story.rescueWon)return;
 const resume=story.stage==='part6-victory'?story.rescueStep:0;story.stage='part6-victory';saveStory();
 runStorySequence([
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['kala','grimgors','eberien'],mood:'neutral',text:'Les loups s’enfuient enfin. Les aventuriers se précipitent derrière l’arbre pour vérifier que la victime n’a rien.'},
  {speaker:'Jhimm',location:'Le Bois Tendre',cast:['jhimm','balai'],mood:'surprised',text:'Vous êtes blessé ?… Par toutes les étoiles, c’est un balai à chiottes !'},
  {speaker:'Messire Balai',location:'Le Bois Tendre',cast:['balai','grimgors'],emotions:{balai:'neutral',grimgors:'surprised'},text:'Un balai à chiottes qui parle, oui ! Messire Balai, pour vous servir. Merci, j’ai bien cru finir entre les crocs de ces loups !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['kala','balai','bolduc'],mood:'surprised',text:'Le groupe reste un instant bouche bée devant cet étrange rescapé. Puis les couleurs s’effacent : un souvenir d’une autre aventure apparaît…'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['violette','mirahel','lama'],flashback:true,text:'Dans ce souvenir en noir et blanc, Violette, Mirahel et Lama viennent eux aussi de sauver Messire Balai des loups.'},
  {speaker:'Messire Balai',location:'Le Bois Tendre',cast:['balai','violette'],flashback:true,mood:'neutral',text:'Messire Balai, fidèle serviteur ! Je vous dois une fière chandelle !'},
  {speaker:'Violette',location:'Le Bois Tendre',cast:['violette','balai'],flashback:true,mood:'surprised',text:'Attends… on vient de sauver un balai à chiottes qui parle ?!'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['violette','mirahel','lama'],flashback:true,mood:'happy',text:'Violette, Mirahel et Lama se regardent, puis explosent de rire. Messire Balai ne sait plus où donner des brins !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['grimgors','balai','kala'],text:'Le souvenir s’estompe et les couleurs reviennent. Messire Balai est toujours là, sain et sauf, auprès des aventuriers.'},
  {speaker:'Ébérien',location:'Le Bois Tendre',cast:['eberien','balai','jhimm'],emotions:{eberien:'neutral',balai:'neutral',jhimm:'neutral'},text:'Venez avec nous, Messire Balai. Vous serez plus en sécurité en bonne compagnie.'},
  {speaker:'Messire Balai',location:'Le Bois Tendre',cast:['balai','bolduc','grimgors'],mood:'neutral',text:'Avec grand plaisir ! Et, si possible, loin des loups !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['grimgors','balai','eberien'],mood:'neutral',text:'Messire Balai se joint au groupe. Les aventuriers reprennent enfin la route vers la grotte des jumeaux.',finalLabel:'Terminer la partie 6'}
 ],finishRescuePart,resume);
}
function finishRescuePart(){
 if(!story.rescueWon)return;
 queueStoryBooster('part6');story.part6='complete';story.part6bis=story.part6bis==='complete'?'complete':'new';story.part7=story.part7==='complete'?'complete':'new';story.chapter1=story.part9==='complete'?'complete':'started';story.stage='part6-complete';story.rescueStep=0;story.unlocked=Math.max(2,story.unlocked);
 if(!economy.storyRewards.part6){economy.storyRewards.part6=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}


function renderCaveMenu(){
 const unlocked=caveAccessible(),complete=story.part7==='complete';
 $('#storyPart7').classList.toggle('locked',!unlocked);$('#storyPart7').classList.toggle('complete',complete);
 $('#chapter1Part7Btn').disabled=!unlocked;$('#chapter1Part7Btn').textContent=!unlocked?'Verrouillé':String(story.stage).startsWith('part7')&&story.stage!=='part7-complete'?'Continuer':complete?'Rejouer':'Commencer';
 $('#chapter1Part7Status').textContent=!unlocked?'Terminez la partie 6 bis.':complete?'La traversée est achevée — un portail lumineux vous attend.':'Une énigme, des pièges et trois soldats fantomatiques.';
 $('#chapter2Card').classList.toggle('locked',!complete);$('#chapter2Status').textContent=complete?'La suite sera ajoutée prochainement.':'Terminez la partie 7 pour continuer.';$('#chapter2Btn').textContent=complete?'Bientôt disponible':'Verrouillé';
}
function startCavePart(){
 if(!caveAccessible())return;
 const saved=readSaved('hackenia-story-match',null);
 if(story.stage==='part7-match'&&saved?.mode==='story-ghosts'){restoreStoryMatch(saved);return}
 if(story.stage==='part7-victory'){showCaveVictory();return}
 if(story.stage==='part7-match'||story.part7==='retry'){startCaveGame();return}
 const resume=story.stage==='part7-intro'?story.caveStep:0;
 story.part7='started';story.chapter1='started';story.stage='part7-intro';story.caveWon=false;saveStory();
 runStorySequence([
 {speaker:'Voix off',entrance:true,cast:['kala','eberien','balai'],text:'Les aventuriers arrivent enfin devant la porte de la grotte des jumeaux. Deux visages sculptés encadrent une inscription.'},
 {speaker:'Kala',entrance:true,cast:['kala','eberien'],text:'« Abandonne et renaît. » Voilà ce que dit la porte…'},
 {speaker:'Ébérien',entrance:true,cast:['eberien','kala','grimgors'],text:'Abandonner quoi ? Nos possessions ? Nos certitudes ? Il doit y avoir un sens à cette énigme.'},
 {speaker:'Voix off',entrance:true,cast:['jhimm','bolduc','grimgors'],text:'Ils réfléchissent un long moment. Les tentatives se succèdent, mais la porte reste immobile.'},
 {speaker:'Messire Balai',entrance:true,cast:['balai','kala','eberien'],text:'Peut-être devez-vous être sans tous vos atours pour passer cette porte ?'},
 {speaker:'Bolduc',entrance:true,cast:['bolduc','jhimm','grimgors'],emotions:{bolduc:'happy',jhimm:'embarrassed',grimgors:'neutral'},text:'Ah ! Enfin une énigme qui me plaît !'},
 {speaker:'Jhimm',entrance:true,cast:['jhimm','kala','eberien'],emotions:{jhimm:'embarrassed',kala:'neutral',eberien:'neutral'},text:'Vraiment… tout ? Bon. Si c’est le seul moyen de passer…'},
 {speaker:'Voix off',entrance:true,cast:[],text:'Les aventuriers déposent leurs armes, puis leurs vêtements, et se retrouvent nus devant la porte. Bolduc est ravi ; Jhimm beaucoup moins. Les autres restent presque de marbre. Aussitôt, une lumière les enveloppe et les téléporte à l’intérieur du donjon.'},
 {speaker:'Voix off',cast:['grimgors','jhimm','bolduc'],text:'Le groupe se retrouve entièrement équipé : vêtements, armures et armes ont repris leur place, comme si rien n’avait été enlevé.'},
 {speaker:'Kala',cast:['kala','balai','eberien'],text:'Abandonner pour renaître… Tu avais vu juste, Messire Balai.'},
 {speaker:'Voix off',cast:['grimgors','bolduc','jhimm'],text:'La traversée commence. Une dalle déclenche des pointes ; un passage rassurant dissimule une fosse. Les aventuriers déjouent ces pièges malins, parfois franchement sournois, en avançant avec prudence.'},
 {speaker:'Grimgors',cast:['grimgors','kala','eberien'],text:'Ne vous fiez pas au chemin le plus facile. Regardez les marques au sol avant de faire un pas.'},
 {speaker:'Voix off',cast:[],text:'Au bout du passage, trois soldats fantomatiques leur barrent la route. Probablement d’anciens aventuriers qui ont péri durant cette même traversée…'},
 {speaker:'Jhimm',cast:['jhimm','grimgors','balai'],text:'Ils ne nous laisseront pas passer. Restez ensemble.',finalLabel:'Affronter les soldats fantomatiques'}
 ].map(beat=>({location:'La grotte des jumeaux',mood:'neutral',...beat})),startCaveGame,resume);
}
function startCaveGame(){
 if(!caveAccessible())return;
 if(activeDeck().cards.length===5&&!validDeck(activeDeck())){renderDeckBuilder();openPanel('#deckScreen');return}
 applyRulePreset('basic-open');currentMode='story-ghosts';gameType='ai';
 const chosen=validDeck(activeDeck())?deckCardsWithFoil(activeDeck()):['p27','p23','p04','p08','p13'].map(catalogById);
 board=Array(9).fill(null);hands={p:chosen.map(playerCard),a:Array.from({length:5},()=>cloneCard(catalogById('p37')))};
 selected=null;turn='p';locked=false;passing=false;matchRewarded=false;matchInProgress=true;resetMemories();
 story.part7='started';story.stage='part7-match';story.caveWon=false;story.caveStep=0;saveStory();
 $('#storyScene').classList.add('hidden');$('#menuScreen').classList.add('hidden');document.querySelectorAll('.panel-screen').forEach(x=>x.classList.add('hidden'));
 $('#gameApp').classList.remove('hidden');$('#leftLabel').textContent='Les aventuriers';$('#rightLabel').textContent='Soldats fantomatiques';$('#rulesBtn').style.display='none';
 msg('La traversée de la grotte','Vainquez les soldats fantomatiques pour poursuivre la traversée.');render();saveStoryMatch();
}

function endCaveGame(counts){
 try{localStorage.removeItem('hackenia-story-match')}catch{}
 if(counts.p>counts.a){story.stage='part7-victory';story.caveWon=true;story.caveStep=0;saveStory();setTimeout(showCaveVictory,1200)}
 else{story.part7='retry';story.stage='part7-retry';story.caveWon=false;saveStory();setTimeout(()=>runStorySequence([{speaker:'Jhimm',location:'La grotte des jumeaux',cast:['jhimm','grimgors'],mood:'neutral',text:'Le passage reste gardé. Reprenons notre souffle avant de tenter à nouveau.',finalLabel:'Réessayer'}],startCaveGame),1200)}
}
function showCaveVictory(){
 if(!story.caveWon)return;
 const resume=story.stage==='part7-victory'?story.caveStep:0;story.stage='part7-victory';saveStory();
 runStorySequence([
 {speaker:'Voix off',location:'La grotte des jumeaux',cast:['kala','grimgors','jhimm'],mood:'neutral',text:'Les trois soldats fantomatiques s’effacent. Le silence revient dans la grotte.'},
 {speaker:'Voix off',location:'La grotte des jumeaux',cast:[],portal:true,text:'Un portail lumineux s’ouvre devant les aventuriers. Sa lumière éclaire la pierre : la traversée de la grotte est achevée.',finalLabel:'Terminer la partie 7'}
 ],finishCavePart,resume);
}
function finishCavePart(){
 if(!story.caveWon)return;
 queueStoryBooster('part7');story.part7='complete';story.part8=story.part8==='complete'?'complete':'new';story.chapter1=story.part9==='complete'?'complete':'started';story.stage='part7-complete';story.caveStep=0;story.unlocked=Math.max(2,story.unlocked);
 if(!economy.storyRewards.part7){economy.storyRewards.part7=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}


// Preserve access for saves already inside or beyond part 7.
function caveAccessible(){return story.part6==='complete'&&(story.part6bis==='complete'||story.part7==='complete'||String(story.stage).startsWith('part7'))}
function renderNewFacesMenu(){
 const unlocked=story.part6==='complete',complete=story.part6bis==='complete';
 $('#storyPart6bis').classList.toggle('locked',!unlocked);$('#storyPart6bis').classList.toggle('complete',complete);
 $('#chapter1Part6bisBtn').disabled=!unlocked;$('#chapter1Part6bisBtn').textContent=!unlocked?'Verrouillé':String(story.stage).startsWith('part6bis')&&story.stage!=='part6bis-complete'?'Continuer':complete?'Rejouer':'Commencer';
 $('#chapter1Part6bisStatus').textContent=!unlocked?'Terminez la partie 6.':complete?'Ven a été vaincu — le chemin de la grotte vous attend.':'Trois voyageurs, quelques questions et un duel imposé.';
}
function startNewFacesPart(){
 if(story.part6!=='complete')return;
 const saved=readSaved('hackenia-story-match',null);
 if(story.stage==='part6bis-match'&&saved?.mode==='story-ven'){restoreStoryMatch(saved);return}
 if(story.stage==='part6bis-victory'){showNewFacesVictory();return}
 if(story.stage==='part6bis-match'||story.part6bis==='retry'){startNewFacesGame();return}
 const resume=story.stage==='part6bis-intro'?story.newFacesStep:0;
 story.part6bis='started';story.stage='part6bis-intro';story.newFacesWon=false;saveStory();
 runStorySequence([
 {speaker:'Voix off',cast:['balai','kala','jhimm'],text:'Messire Balai sauvé, les aventuriers s’apprêtent à reprendre la route. Des bruits de pas les retiennent : trois voyageurs approchent entre les arbres.'},
 {speaker:'Voix off',cast:['pennedra','ven','frolgor'],emotions:{pennedra:'friendly',ven:'haughty',frolgor:'neutral'},text:'Pennedra leur adresse un signe amical. Ven les dévisage, le menton haut. À leurs côtés, Frolgor observe la scène sans dire un mot.'},
 {speaker:'Pennedra',cast:['pennedra','ven','frolgor'],emotions:{pennedra:'friendly',ven:'haughty'},text:'Salut à vous ! Moi, c’est Pennedra. Voici Ven et Frolgor.'},
 {speaker:'Ven',cast:['ven','pennedra'],emotions:{ven:'haughty',pennedra:'friendly'},text:'Oui, les présentations suffiront. Qu’est-ce que vous faites ici, au juste ?'},
 {speaker:'Ébérien',cast:['eberien','kala','balai'],text:'Nous sommes de passage. Nous avons encore un peu de route à faire.'},
 {speaker:'Voix off',cast:['grimgors','ven','frolgor'],emotions:{grimgors:'proud',ven:'haughty',frolgor:'neutral'},text:'Grimgors bombe le torse et se redresse : leur groupe sait se défendre. Ven ne paraît guère impressionné. Frolgor garde le silence.'},
 {speaker:'Ven',cast:['ven','grimgors'],emotions:{ven:'haughty',grimgors:'proud'},text:'De passage ? D’où venez-vous ? Et pourquoi traîner dans ces bois ?'},
 {speaker:'Kala',cast:['kala','jhimm','bolduc'],text:'De Berdésa. Nous avons aidé des mineurs qui étaient en danger.'},
 {speaker:'Jhimm',cast:['jhimm','ven','pennedra'],emotions:{ven:'haughty',pennedra:'friendly'},text:'Vous étiez dans les environs, vous aussi ? Vous n’avez pas entendu parler de ce qui se passait dans la mine ?'},
 {speaker:'Ven',cast:['ven','frolgor','pennedra'],emotions:{ven:'haughty',frolgor:'neutral',pennedra:'friendly'},text:'Si, bien sûr. Mais nous avions plus important à faire.'},
 {speaker:'Voix off',cast:['kala','eberien','bolduc'],mood:'blasé',text:'Les aventuriers échangent des regards blasés. Ah oui… d’accord. Ils avaient donc laissé les mineurs se débrouiller seuls.'},
 {speaker:'Grimgors',cast:['grimgors','jhimm','balai'],mood:'blasé',text:'Plus important. Je vois.'},
 {speaker:'Voix off',cast:['frolgor','ven','pennedra'],emotions:{frolgor:'neutral',ven:'haughty',pennedra:'friendly'},text:'Frolgor ne commente pas. Son regard passe tranquillement de Ven aux aventuriers.'},
 {speaker:'Ven',cast:['ven','grimgors'],emotions:{ven:'haughty',grimgors:'proud'},text:'Puisque vous semblez si sûrs de vous, nous allons régler cela avec une partie de Triade. Je vous défie. Pas question de vous défiler.'},
 {speaker:'Grimgors',cast:['grimgors','ven','bolduc'],emotions:{grimgors:'proud',ven:'haughty',bolduc:'neutral'},text:'Laissez-moi faire. Je vais lui montrer ce que vaut notre groupe.',finalLabel:'Affronter Ven avec Grimgors'}
 ].map(beat=>({location:'Le Bois Tendre',mood:'neutral',...beat})),startNewFacesGame,resume);
}

function newFacesOpponentHand(){
 const pennedra={id:'story-pennedra',name:'Pennedra',v:[3,3,7,7],element:'wind',rarity:'common',kind:'playable',image:{src:'assets/story/pennedra-card.webp',full:true},a:'#7aa98b',r:'✦'};
 return [catalogById('p42'),catalogById('p10'),pennedra,catalogById('p10'),pennedra].map(cloneCard);
}
function startNewFacesGame(){
 if(story.part6!=='complete')return;
 if(activeDeck().cards.length===5&&!validDeck(activeDeck())){renderDeckBuilder();openPanel('#deckScreen');return}
 applyRulePreset('basic-open');currentMode='story-ven';gameType='ai';
 const chosen=validDeck(activeDeck())?deckCardsWithFoil(activeDeck()):['p27','p23','p04','p08','p13'].map(catalogById);
 board=Array(9).fill(null);hands={p:chosen.map(playerCard),a:newFacesOpponentHand()};
 selected=null;turn='p';locked=false;passing=false;matchRewarded=false;matchInProgress=true;resetMemories();
 story.part6bis='started';story.stage='part6bis-match';story.newFacesWon=false;story.newFacesStep=0;saveStory();
 $('#storyScene').classList.add('hidden');$('#menuScreen').classList.add('hidden');document.querySelectorAll('.panel-screen').forEach(x=>x.classList.add('hidden'));
 $('#gameApp').classList.remove('hidden');$('#leftLabel').textContent='Grimgors';$('#rightLabel').textContent='Ven';$('#rulesBtn').style.display='none';
 msg('De nouveaux visages','Grimgors relève le défi de Ven.');render();saveStoryMatch();
}


function endNewFacesGame(counts){
 try{localStorage.removeItem('hackenia-story-match')}catch{}
 if(counts.p>counts.a){story.stage='part6bis-victory';story.newFacesWon=true;story.newFacesStep=0;saveStory();setTimeout(showNewFacesVictory,1200)}
 else{story.part6bis='retry';story.stage='part6bis-retry';story.newFacesWon=false;saveStory();setTimeout(()=>runStorySequence([{speaker:'Grimgors',location:'Le Bois Tendre',cast:['grimgors','ven'],emotions:{grimgors:'neutral',ven:'haughty'},text:'Une revanche. Je n’en ai pas terminé avec toi.',finalLabel:'Réessayer'}],startNewFacesGame),1200)}
}
function showNewFacesVictory(){
 if(!story.newFacesWon)return;
 const resume=story.stage==='part6bis-victory'?story.newFacesStep:0;story.stage='part6bis-victory';saveStory();
 runStorySequence([
 {speaker:'Grimgors',location:'Le Bois Tendre',cast:['grimgors','ven','frolgor'],emotions:{grimgors:'proud',ven:'haughty',frolgor:'neutral'},text:'Voilà. Nous avons encore de la route. Bonne continuation.'},
 {speaker:'Voix off',location:'Le Bois Tendre',cast:['balai','kala','eberien'],mood:'neutral',text:'Le duel terminé, les aventuriers reprennent leur chemin vers la grotte des jumeaux.',finalLabel:'Terminer la partie 6 bis'}
 ],finishNewFacesPart,resume);
}
function finishNewFacesPart(){
 if(!story.newFacesWon)return;
 queueStoryBooster('part6bis');story.part6bis='complete';story.part7=story.part7==='complete'?'complete':'new';story.chapter1=story.part9==='complete'?'complete':'started';story.stage='part6bis-complete';story.newFacesStep=0;
 if(!economy.storyRewards.part6bis){economy.storyRewards.part6bis=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}


function renderLakeMenu(){
 const unlocked=story.part7==='complete',complete=story.part8==='complete';
 $('#storyPart8').classList.toggle('locked',!unlocked);$('#storyPart8').classList.toggle('complete',complete);
 $('#chapter1Part8Btn').disabled=!unlocked;$('#chapter1Part8Btn').textContent=!unlocked?'Verrouillé':String(story.stage).startsWith('part8')&&story.stage!=='part8-complete'?'Continuer':complete?'Rejouer':'Commencer';
 $('#chapter1Part8Status').textContent=!unlocked?'Terminez la partie 7.':complete?'Le temple est derrière vous — le lac rose se dévoile.':'Un portail, une rencontre troublante et un choix risqué.';
 $('#chapter2Card').classList.toggle('locked',!complete);$('#chapter2Status').textContent=complete?'La suite sera ajoutée prochainement.':'Terminez la partie 8 pour continuer.';$('#chapter2Btn').textContent=complete?'Bientôt disponible':'Verrouillé';
}
function restartLakePart(){
 if(story.part7!=='complete')return;
 story.stage='part8-intro';story.lakeStep=0;story.lakePath=null;story.lakeWon=false;story.lakeEncounterResolved=false;
 try{localStorage.removeItem('hackenia-story-match')}catch{}saveStory();startLakePart();
}
function startLakePart(){
 if(story.part7!=='complete')return;
 const saved=readSaved('hackenia-story-match',null);
 if(story.stage==='part8-match'&&saved?.mode==='story-caleizis'){restoreStoryMatch(saved);return}
 if(story.stage==='part8-epilogue'&&story.lakeEncounterResolved){showLakeEpilogue();return}
 if(story.stage==='part8-match'){startLakeGame();return}
 const resume=story.stage==='part8-intro'?story.lakeStep:0;
 story.part8='started';story.chapter1='started';story.stage='part8-intro';story.lakeWon=false;story.lakeEncounterResolved=false;story.lakePath=null;saveStory();
 runStorySequence([
 {speaker:'Grimgors',location:'La grotte des jumeaux',portal:true,cast:['grimgors','bolduc','jhimm'],text:'Avant de nous y jeter, essayons avec un caillou.'},
 {speaker:'Voix off',location:'La grotte des jumeaux',portal:true,cast:['grimgors','kala','eberien'],text:'Grimgors lance un caillou à travers le portail. Il disparaît dans la lumière… et ne revient pas.'},
 {speaker:'Bolduc',location:'La grotte des jumeaux',portal:true,cast:['bolduc','balai','jhimm'],text:'Je pourrais y passer la tête, juste pour regarder de l’autre côté…'},
 {speaker:'Voix off',location:'La grotte des jumeaux',portal:true,cast:['bolduc','kala','grimgors'],mood:'surprised',text:'Finalement, Bolduc tend la main. À peine touche-t-il le portail qu’il est aspiré ! Ses amis n’hésitent pas et passent aussitôt après lui.'},
 {speaker:'Voix off',location:'Le temple des jumeaux',cast:['bolduc','jhimm','balai'],text:'Tous se retrouvent dans une grande salle éclairée de torches bleutées. Les sculptures sur les murs représentent des couples de figures : un temple des jumeaux.'},
 {speaker:'Kala',location:'Le temple des jumeaux',cast:['kala','eberien','grimgors'],text:'Une autre pièce, à gauche… et la sortie là-bas, à une trentaine de mètres.'},
 {speaker:'Voix off',location:'Le temple des jumeaux',cast:['caleizis'],text:'Un immense tourbillon de volutes violettes se déploie dans la salle. Caleizis apparaît au milieu de cette lumière, telle un mirage.'},
 {speaker:'Caleizis',location:'Le temple des jumeaux',cast:['caleizis','kala'],text:'Vous voilà enfin. Vous portez bien plus que vos armes… Je connais les histoires que vous préférez taire.'},
 {speaker:'Voix off',location:'Le temple des jumeaux',cast:['eberien','jhimm','bolduc'],text:'Elle évoque des noms, des lieux et des instants précis de leurs vies. Certains réveillent une douleur ancienne ; d’autres, une rancœur qu’ils croyaient enfouie. Elle en sait beaucoup trop.'},
 {speaker:'Grimgors',location:'Le temple des jumeaux',cast:['grimgors','caleizis'],text:'Assez. Comment sais-tu tout cela ?'},
 {speaker:'Voix off',location:'Le temple des jumeaux',cast:['kala','jhimm','grimgors'],mood:'surprised',text:'Ils tentent de réagir, mais quelque chose dans l’air les paralyse tous. Impossible de faire un pas. La puissance de Caleizis dépasse clairement la leur.'},
 {speaker:'Caleizis',location:'Le temple des jumeaux',cast:['caleizis'],text:'Eh bien ? Plus personne n’a rien à dire ?',choices:[
  {label:'Provoquer Caleizis — lancer le duel',onChoose:()=>chooseLakeReaction('duel')},
  {label:'Garder le silence',secondary:true,onChoose:()=>chooseLakeReaction('silence')}
 ]}
 ].map(beat=>({mood:'neutral',...beat})),null,resume);
}
function chooseLakeReaction(path){
 if(story.stage!=='part8-intro'||!['duel','silence'].includes(path))return;
 story.lakePath=path;story.lakeStep=0;saveStory();
 if(path==='duel')startLakeGame();
 else{story.lakeEncounterResolved=true;story.stage='part8-epilogue';saveStory();showLakeEpilogue()}
}
function startLakeGame(){
 if(story.part7!=='complete')return;
 if(activeDeck().cards.length===5&&!validDeck(activeDeck())){renderDeckBuilder();openPanel('#deckScreen');return}
 applyRulePreset('basic-open');currentMode='story-caleizis';gameType='ai';
 const chosen=validDeck(activeDeck())?deckCardsWithFoil(activeDeck()):['p27','p23','p04','p08','p13'].map(catalogById);
 board=Array(9).fill(null);hands={p:chosen.map(playerCard),a:['p56','p56','p56','p05','p05'].map(id=>cloneCard(catalogById(id)))};
 selected=null;turn='p';locked=false;passing=false;matchRewarded=false;matchInProgress=true;resetMemories();
 story.lakePath='duel';story.lakeEncounterResolved=false;story.part8='started';story.stage='part8-match';story.lakeWon=false;story.lakeStep=0;saveStory();
 $('#storyScene').classList.add('hidden');$('#menuScreen').classList.add('hidden');document.querySelectorAll('.panel-screen').forEach(x=>x.classList.add('hidden'));
 $('#gameApp').classList.remove('hidden');$('#leftLabel').textContent='Les aventuriers';$('#rightLabel').textContent='Caleizis';$('#rulesBtn').style.display='none';
 msg('Le défi de Caleizis','Vous avez choisi de provoquer Caleizis.');render();saveStoryMatch();
}


function endLakeGame(counts){
 try{localStorage.removeItem('hackenia-story-match')}catch{}
 if(counts.p>counts.a){if(awardCaleizisVictory())msg('Défi accompli !','Dos de carte « Caleizis en larmes » débloqué dans les Options !');story.lakeWon=true;story.lakeEncounterResolved=true;story.stage='part8-epilogue';story.lakeStep=0;saveStory();setTimeout(showLakeEpilogue,1200)}
 else{story.part8='retry';story.stage='part8-retry';story.lakeWon=false;story.lakeEncounterResolved=false;story.lakeStep=0;story.lakePath=null;saveStory();setTimeout(()=>runStorySequence([{speaker:'Voix off',location:'Le temple des jumeaux',cast:['caleizis'],text:'Caleizis a pris le dessus. Il faut reprendre la partie 8 depuis le début.',finalLabel:'Recommencer la partie 8'}],restartLakePart),1200)}
}
function showLakeEpilogue(){
 if(!story.lakeEncounterResolved)return;
 const resume=story.stage==='part8-epilogue'?story.lakeStep:0;story.stage='part8-epilogue';saveStory();
 const departure=story.lakePath==='duel'?
 [{speaker:'Caleizis',location:'Le temple des jumeaux',cast:['caleizis'],mood:'crying',text:'Non… Ce n’est pas possible ! Vous… !'},
 {speaker:'Voix off',location:'Le temple des jumeaux',cast:['caleizis'],mood:'crying',text:'Caleizis s’emporte. Des larmes coulent sur ses joues ; ses volutes se déchirent et elle disparaît, furieuse et en pleurs.'}]:
 [{speaker:'Caleizis',location:'Le temple des jumeaux',cast:['caleizis'],text:'Votre silence est bien décevant…'},
 {speaker:'Voix off',location:'Le temple des jumeaux',cast:['caleizis'],text:'Un peu vexée de ne recevoir aucune réponse, Caleizis finit par disparaître dans ses volutes.'}];
 runStorySequence([...departure,
 {speaker:'Jhimm',location:'Le temple des jumeaux',cast:['jhimm','kala','grimgors'],text:'Je peux à nouveau bouger. Tout le monde va bien ?'},
 {speaker:'Ébérien',location:'Le temple des jumeaux',cast:['eberien','bolduc','balai'],text:'Allons voir cette pièce à gauche avant de partir.'},
 {speaker:'Voix off',location:'La salle de rituel',cast:[],artwork:'ice-ritual-background',artworkAlt:'Deux statues dans la salle de rituel et la source élémentaire de glace',text:'Les aventuriers fouillent la salle de rituel. Deux belles statues y sont installées, face à face.'},
 {speaker:'Kala',location:'La salle de rituel',cast:['kala','eberien'],text:'Au fond… une source élémentaire de glace !'},
 {speaker:'Voix off',location:'La salle de rituel',cast:[],artwork:'ice-ritual-background',artworkAlt:'Deux statues dans la salle de rituel et la source élémentaire de glace',text:'Des cristaux bleus s’élèvent au-dessus d’une eau lumineuse. La source de glace éclaire les sculptures d’une lueur froide.'},
 {speaker:'Voix off',location:'Le lac rose',cast:[],artwork:'pink-lake-background',artworkAlt:'Panorama du lac rose sous une lune rose entre les montagnes',text:'Enfin, ils sortent de la grotte. Devant eux s’étend un panorama magnifique : le lac rose scintille entre les montagnes sous la lumière de la lune.'},
 {speaker:'Voix off',location:'Le lac rose',cast:['grimgors','kala','jhimm'],text:'Après les pièges et cette rencontre troublante, les aventuriers s’arrêtent un instant pour contempler le lac. La partie 8 s’achève ici.',finalLabel:'Terminer la partie 8'}
 ].map(beat=>({mood:'neutral',...beat})),finishLakePart,resume);
}
function finishLakePart(){
 if(!story.lakeEncounterResolved||story.part7!=='complete')return;
 queueStoryBooster('part8');story.part8='complete';story.part9=story.part9==='complete'?'complete':'new';story.chapter1=story.part9==='complete'?'complete':'started';story.stage='part8-complete';story.lakeStep=0;story.unlocked=Math.max(2,story.unlocked);
 if(!economy.storyRewards.part8){economy.storyRewards.part8=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}

function renderFinaleMenu(){
 const unlocked=story.part8==='complete',complete=story.part9==='complete';
 $('#storyPart9').classList.toggle('locked',!unlocked);$('#storyPart9').classList.toggle('complete',complete);
 $('#chapter1Part9Btn').disabled=!unlocked;$('#chapter1Part9Btn').textContent=!unlocked?'Verrouillé':String(story.stage).startsWith('part9')&&story.stage!=='part9-complete'?'Continuer':complete?'Rejouer':'Commencer';
 $('#chapter1Part9Status').textContent=!unlocked?'Terminez la partie 8.':complete?'Les nouveaux jumeaux sont retrouvés — chapitre terminé.':'Une veille au bord du lac… et un dernier danger.';
 $('#chapter2Card').classList.toggle('locked',!complete);$('#chapter2Status').textContent=complete?'La suite sera ajoutée prochainement.':'Terminez la partie 9 pour continuer.';$('#chapter2Btn').textContent=complete?'Bientôt disponible':'Verrouillé';
}
function startFinalePart(){
 if(story.part8!=='complete')return;
 const saved=readSaved('hackenia-story-match',null);
 if(story.stage==='part9-match'&&saved?.mode==='story-lake-finale'){restoreStoryMatch(saved);return}
 if(story.stage==='part9-victory'&&story.finaleWon){showFinaleVictory();return}
 if(['part9-match','part9-retry'].includes(story.stage)){startFinaleGame();return}
 const resume=story.stage==='part9-intro'?story.finaleStep:0;
 story.part9='started';story.stage='part9-intro';story.finaleWon=false;saveStory();
 runStorySequence([
 {speaker:'Voix off',location:'Le lac rose',cast:[],artwork:'pink-lake-background',text:'Les aventuriers atteignent enfin le fameux lac rose. C’est ici qu’ils doivent trouver les nouveaux jumeaux. Pourtant, personne ne les attend.'},
 {speaker:'Kala',location:'Le lac rose',cast:['kala','eberien','jhimm'],text:'Pas une silhouette… Restons dans les environs.'},
 {speaker:'Grimgors',location:'La rive du lac rose',cast:['grimgors','bolduc','balai'],text:'Le bois longe le lac sur la droite. Nous pourrons y passer la nuit tout en surveillant la rive.'},
 {speaker:'Voix off',location:'La rive du lac rose',cast:['kala','jhimm','eberien'],text:'Ils s’installent entre les arbres, assez près de l’eau pour apercevoir au loin une éventuelle arrivée. Ils organisent une ronde pour la nuit.'},
 {speaker:'Jhimm',location:'La rive du lac rose',cast:['jhimm','grimgors'],text:'Je prends le premier tour. Reposez-vous.'},
 {speaker:'Voix off',location:'La rive du lac rose',cast:['jhimm'],text:'La veille de Jhimm se déroule calmement. Seuls le vent dans les branches et le clapotis du lac troublent le silence.'},
 {speaker:'Kala',location:'La rive du lac rose',cast:['kala','jhimm'],text:'À mon tour. Va dormir, je garde un œil sur le lac.'},
 {speaker:'Voix off',location:'La rive du lac rose',cast:['kala'],mood:'surprised',text:'Kala entend soudain des voix dans sa tête. Douces, insistantes, elles l’invitent à entrer dans le lac… à les rejoindre sous la surface.'},
 {speaker:'Ébérien',location:'La rive du lac rose',cast:['eberien','kala'],mood:'surprised',text:'Kala… Ces voix, tu les entends aussi ?'},
 {speaker:'Voix off',location:'La rive du lac rose',cast:['eberien','kala'],mood:'surprised',text:'Ébérien vient de se réveiller. Le même charme s’empare de lui. Malgré leurs efforts, tous deux se sentent attirés vers les profondeurs du lac.'},
 {speaker:'Kala',location:'La rive du lac rose',cast:['kala','eberien'],mood:'surprised',text:'Réveillez-vous ! Aidez-nous ! Quelque chose nous attire dans l’eau !'},
 {speaker:'Voix off',location:'Le lac rose',cast:[],artwork:'lake-attack-chibi',artworkAlt:'Trois gardiennes rouges et deux hydrelithes bleus émergent du lac rose, en version chibi',text:'Leurs amis se précipitent hors du campement. Les gardiennes commencent à sortir du lac, suivies de deux hydrelithes mineurs.'},
 {speaker:'Voix off',location:'Le lac rose',cast:[],artwork:'lake-attack-chibi',text:'Au loin, le rire de Caleizis résonne dans la nuit, comme si elle était satisfaite de ce qui se déroule devant eux.'},
 {speaker:'Grimgors',location:'Le lac rose',cast:['grimgors','jhimm','bolduc'],text:'Tenez bon ! On est là !',finalLabel:'Affronter les créatures du lac'}
 ].map(beat=>({mood:'neutral',...beat})),startFinaleGame,resume);
}
function startFinaleGame(){
 if(story.part8!=='complete')return;
 if(activeDeck().cards.length===5&&!validDeck(activeDeck())){renderDeckBuilder();openPanel('#deckScreen');return}
 applyRulePreset('basic-open');currentMode='story-lake-finale';gameType='ai';
 const chosen=validDeck(activeDeck())?deckCardsWithFoil(activeDeck()):['p27','p23','p04','p08','p13'].map(catalogById);
 board=Array(9).fill(null);hands={p:chosen.map(playerCard),a:['p11','p11','p11','p17','p17'].map(id=>cloneCard(catalogById(id)))};
 selected=null;turn='p';locked=false;passing=false;matchRewarded=false;matchInProgress=true;resetMemories();
 story.part9='started';story.stage='part9-match';story.finaleWon=false;story.finaleStep=0;saveStory();
 $('#storyScene').classList.add('hidden');$('#menuScreen').classList.add('hidden');document.querySelectorAll('.panel-screen').forEach(x=>x.classList.add('hidden'));
 $('#gameApp').classList.remove('hidden');$('#leftLabel').textContent='Les aventuriers';$('#rightLabel').textContent='Les gardiennes du lac';$('#rulesBtn').style.display='none';
 msg('Fin de la mission','Libérez Kala et Ébérien du charme du lac.');render();saveStoryMatch();
}
function endFinaleGame(counts){
 try{localStorage.removeItem('hackenia-story-match')}catch{}
 if(counts.p>counts.a){story.finaleWon=true;story.stage='part9-victory';story.finaleStep=0;saveStory();setTimeout(showFinaleVictory,1200)}
 else{story.part9='retry';story.stage='part9-retry';story.finaleWon=false;saveStory();setTimeout(()=>runStorySequence([{speaker:'Voix off',location:'Le lac rose',cast:[],artwork:'lake-attack-chibi',text:'Les créatures tiennent encore la rive. Il faut les vaincre pour libérer Kala et Ébérien.',finalLabel:'Réessayer le duel'}],startFinaleGame),1200)}
}
function showFinaleVictory(){
 if(!story.finaleWon)return;
 const resume=story.stage==='part9-victory'?story.finaleStep:0;story.stage='part9-victory';saveStory();
 runStorySequence([
 {speaker:'Voix off',location:'Le lac rose',cast:['kala','eberien','jhimm'],text:'Les créatures disparaissent dans les eaux roses. Le charme se brise : Kala et Ébérien retrouvent enfin le contrôle de leurs mouvements.'},
 {speaker:'Jhimm',location:'Le lac rose',cast:['jhimm','kala','eberien'],text:'Vous êtes avec nous. Éloignons-nous du bord.'},
 {speaker:'Messire Balai',location:'Le lac rose',cast:['balai','grimgors','bolduc'],mood:'surprised',text:'Regardez… quelque chose remonte !'},
 {speaker:'Voix off',location:'Le lac rose',cast:[],artwork:'twins-bubble-chibi',artworkAlt:'Les deux nouveaux jumeaux blonds reposent dans une immense bulle irisée au-dessus du lac rose, en version chibi',text:'Une énorme bulle émerge lentement du lac. Des reflets irisés courent sur sa surface. À l’intérieur reposent les nouveaux jumeaux.'},
 {speaker:'Kala',location:'Le lac rose',cast:['kala','eberien'],mood:'happy',text:'Les voilà… Nous les avons enfin trouvés.'},
 {speaker:'Voix off',location:'Le lac rose',cast:[],artwork:'twins-bubble-chibi',text:'La bulle s’élève au-dessus de l’eau, les jumeaux à l’abri en son cœur. Après cette dernière épreuve, leur mission touche à sa fin. Fin du chapitre 1.',finalLabel:'Terminer le chapitre 1'}
 ].map(beat=>({mood:'neutral',...beat})),finishFinalePart,resume);
}
function finishFinalePart(){
 if(!story.finaleWon||story.part8!=='complete')return;
 queueStoryBooster('part9');story.part9='complete';story.chapter1='complete';story.stage='part9-complete';story.finaleStep=0;story.unlocked=Math.max(2,story.unlocked);
 if(!economy.storyRewards.part9){economy.storyRewards.part9=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}
