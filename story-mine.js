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
  {speaker:'Jhimm',location:'Les mines de Berdésa',cast:['jhimm','bolduc','grimgors'],mood:'happy',text:'Ils sont à l’abri. Vous pouvez compter sur moi pour la suite !'},
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:['spider'],text:'Au dernier renfoncement, une énorme araignée noire se dresse devant le groupe. Celle-ci n’a rien des paisibles araignées blanches : elle leur barre le passage.'},
  {speaker:'Bolduc',location:'Les mines de Berdésa',cast:['bolduc','grimgors','eberien'],text:'Alors on va se frayer un chemin !',finalLabel:'Affronter l’araignée'}
 ],startFinalMineGame,resume);
}
function startFinalMineGame(){
 if(story.part4!=='complete')return;
 if(activeDeck().cards.length===5&&!validDeck(activeDeck())){renderDeckBuilder();openPanel('#deckScreen');return}
 applyRulePreset('basic-open');currentMode='story-mine-finale';gameType='ai';
 const chosen=validDeck(activeDeck())?deckCardsWithFoil(activeDeck()):['p27','p23','p04','p08','p13'].map(catalogById);
 board=Array(9).fill(null);hands={p:chosen.map(playerCard),a:['p02','p02','p65','p82','p17'].map(id=>cloneCard(catalogById(id)))};
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
  {speaker:'Voix off',location:'Berdésa',cast:['kala','jhimm','bolduc'],mood:'happy',text:'Les aventuriers rejoignent au village les mineurs que Jhimm a mis à l’abri. Ils sont enfin en sécurité.'},
  {speaker:'Voix off',location:'Berdésa',cast:['grimgors','bolduc','eberien'],mood:'happy',text:'À l’auberge, un repas chaud et une nuit de repos leur rendent des forces. Puis ils reprennent la route vers la grotte des jumeaux, le passage qui mène au lac.',finalLabel:'Terminer la partie 5'}
 ],finishFinalMinePart,resume);
}
function finishFinalMinePart(){
 if(!story.finalMineWon)return;
 queueStoryBooster('part5');story.part5='complete';story.part6=story.part6==='complete'?'complete':'new';story.chapter1=story.part6==='complete'?'complete':'started';story.stage='part5-complete';story.finalMineStep=0;story.unlocked=Math.max(2,story.unlocked);
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
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['kala','grimgors','eberien'],mood:'happy',text:'Les loups s’enfuient enfin. Les aventuriers se précipitent derrière l’arbre pour vérifier que la victime n’a rien.'},
  {speaker:'Jhimm',location:'Le Bois Tendre',cast:['jhimm','balai'],mood:'surprised',text:'Vous êtes blessé ?… Par toutes les étoiles, c’est un balai à chiottes !'},
  {speaker:'Messire Balai',location:'Le Bois Tendre',cast:['balai','grimgors'],emotions:{balai:'happy',grimgors:'surprised'},text:'Un balai à chiottes qui parle, oui ! Messire Balai, pour vous servir. Merci, j’ai bien cru finir entre les crocs de ces loups !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['kala','balai','bolduc'],mood:'surprised',text:'Le groupe reste un instant bouche bée devant cet étrange rescapé. Puis les couleurs s’effacent : un souvenir d’une autre aventure apparaît…'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['violette','mirahel','lama'],flashback:true,text:'Dans ce souvenir en noir et blanc, Violette, Mirahel et Lama viennent eux aussi de sauver Messire Balai des loups.'},
  {speaker:'Messire Balai',location:'Le Bois Tendre',cast:['balai','violette'],flashback:true,mood:'happy',text:'Messire Balai, fidèle serviteur ! Je vous dois une fière chandelle !'},
  {speaker:'Violette',location:'Le Bois Tendre',cast:['violette','balai'],flashback:true,mood:'surprised',text:'Attends… on vient de sauver un balai à chiottes qui parle ?!'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['violette','mirahel','lama'],flashback:true,mood:'happy',text:'Violette, Mirahel et Lama se regardent, puis explosent de rire. Messire Balai ne sait plus où donner des brins !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['grimgors','balai','kala'],text:'Le souvenir s’estompe et les couleurs reviennent. Messire Balai est toujours là, sain et sauf, auprès des aventuriers.'},
  {speaker:'Ébérien',location:'Le Bois Tendre',cast:['eberien','balai','jhimm'],mood:'happy',text:'Venez avec nous, Messire Balai. Vous serez plus en sécurité en bonne compagnie.'},
  {speaker:'Messire Balai',location:'Le Bois Tendre',cast:['balai','bolduc','grimgors'],mood:'happy',text:'Avec grand plaisir ! Et, si possible, loin des loups !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['grimgors','balai','eberien'],mood:'happy',text:'Messire Balai se joint au groupe. Les aventuriers reprennent enfin la route vers la grotte des jumeaux.',finalLabel:'Terminer la partie 6'}
 ],finishRescuePart,resume);
}
function finishRescuePart(){
 if(!story.rescueWon)return;
 queueStoryBooster('part6');story.part6='complete';story.chapter1='complete';story.stage='part6-complete';story.rescueStep=0;story.unlocked=Math.max(2,story.unlocked);
 if(!economy.storyRewards.part6){economy.storyRewards.part6=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}
