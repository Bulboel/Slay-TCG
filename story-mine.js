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
    {speaker:'Voix off',location:'Berdésa',cast:['grimgors'],text:'À Berdésa, un villageois les interpelle : des mineurs sont en danger ! Grimgors et Jhimm partent aussitôt en tête du groupe.'},
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
    {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala'],text:'Je vois les galeries… comme si j’étais déjà venue ici.'},
    {speaker:'Voix off',location:'Les mines de Berdésa',cast:['grimgors'],text:'Deux secondes plus tard, Grimgors enfonce la porte de bois. Le groupe s’engouffre dans le passage.'},
    {speaker:'Voix off',location:'Les mines de Berdésa',cast:[],text:'Une horde d’araignées noires leur barre la route. Ensemble, les aventuriers les repoussent sans difficulté.'},
    {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala'],text:'Là ! Une araignée blanche… Elle s’enfuit dans cet autre tunnel.'},
    {speaker:'Voix off',location:'Les mines de Berdésa',cast:['kala'],text:'La petite silhouette disparaît dans l’obscurité. Fin de la partie 4 — un booster et 50 pièces d’or à la première réussite.',finalLabel:'Terminer la partie 4'}
  ], finishMinePart, resume);
}
function finishMinePart() {
  if (!story.mineChallengeWon) return;
  queueStoryBooster('part4');
  story.part4 = 'complete'; story.chapter1 = story.part5 === 'complete' ? 'complete' : 'started'; story.part5 = story.part5 === 'complete' ? 'complete' : 'new'; story.stage = 'part4-complete'; story.mineStep = 0; story.unlocked = Math.max(2, story.unlocked);
  if (!economy.storyRewards.part4) { economy.storyRewards.part4 = true; awardGold(50); }
  saveCollection(); saveStory(); showStoryMenu();
}

// Chapter 1, part 5. Rewards and narrative progress survive replay and reload.
function renderFinalMineMenu(){
 const unlocked=story.part4==='complete',complete=story.part5==='complete';
 $('#storyPart5').classList.toggle('locked',!unlocked);$('#storyPart5').classList.toggle('complete',complete);
 $('#chapter1Part5Btn').disabled=!unlocked;$('#chapter1Part5Btn').textContent=!unlocked?'Verrouillé':complete?'Rejouer':String(story.stage).startsWith('part5')?'Continuer':'Commencer';
 $('#chapter1Part5Status').textContent=!unlocked?'Terminez la partie 4.':complete?'Partie terminée — une chute mystérieuse dans le Bois Tendre.':'Sauvez les mineurs et affrontez l’araignée géante.';
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
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:['kala','grimgors'],text:'Plus loin dans les galeries, les aventuriers guident les travailleurs paniqués vers la sortie. Des cris résonnent encore au fond de la mine.'},
  {speaker:'Kala',location:'Les mines de Berdésa',cast:['kala'],text:'Par ici ! Restez ensemble, le passage est dégagé.'},
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:[],text:'Au dernier renfoncement, une énorme araignée noire se dresse devant eux. Derrière ses pattes, les derniers mineurs sont pris au piège.'},
  {speaker:'Bolduc',location:'Les mines de Berdésa',cast:['bolduc'],text:'On va leur ouvrir un chemin !',finalLabel:'Affronter l’araignée'}
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
 msg('La dernière galerie','Remportez le duel pour libérer les mineurs.');render();saveStoryMatch();
}
function endFinalMineGame(counts){
 try{localStorage.removeItem('hackenia-story-match')}catch{}
 if(counts.p>counts.a){story.stage='part5-victory';story.finalMineWon=true;story.finalMineStep=0;saveStory();msg('La voie est libre !','Bolduc s’avance pour porter le dernier coup.');setTimeout(showFinalMineVictory,1200)}
 else{story.part5='retry';story.stage='part5-retry';story.finalMineWon=false;saveStory();msg(counts.p===counts.a?'Égalité':'Les mineurs attendent votre aide','Réessayez pour ouvrir le passage.');setTimeout(()=>runStorySequence([{speaker:'Bolduc',location:'Les mines de Berdésa',cast:['bolduc'],text:'On reprend notre souffle… et on y retourne !',finalLabel:'Réessayer'}],startFinalMineGame),1200)}
}
function showFinalMineVictory(){
 if(!story.finalMineWon)return;
 const resume=story.stage==='part5-victory'?story.finalMineStep:0;story.stage='part5-victory';saveStory();
 runStorySequence([
  {speaker:'Voix off',location:'Les mines de Berdésa',cast:['bolduc'],text:'Bolduc abat son gourdin sur l’immense tête de l’araignée. Le choc résonne dans toute la galerie : la créature s’effondre enfin.'},
  {speaker:'Voix off',location:'Berdésa',cast:['kala','bolduc','grimgors'],text:'Le groupe ramène les survivants au village. Malgré les pertes, la plupart des mineurs ont pu être sauvés.'},
  {speaker:'Voix off',location:'Berdésa',cast:['bolduc','eberien'],text:'À l’auberge, un repas chaud et une nuit de repos leur rendent des forces. Puis ils reprennent la route vers la grotte des jumeaux, le passage qui mène au lac.'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:[],text:'CRAC ! Un déchirement retentit dans le ciel. Un petit portail scintille au-dessus des arbres… et quelque chose en tombe.'},
  {speaker:'Kala',location:'Le Bois Tendre',cast:['kala','grimgors'],text:'Vous avez vu ça ? Vite, il y a peut-être quelqu’un à aider !'},
  {speaker:'Voix off',location:'Le Bois Tendre',cast:['kala','bolduc','eberien'],text:'Les aventuriers quittent le sentier et courent vers le lieu de la chute. Fin de la partie 5 — un booster et 50 pièces d’or à la première réussite.',finalLabel:'Terminer la partie 5'}
 ],finishFinalMinePart,resume);
}
function finishFinalMinePart(){
 if(!story.finalMineWon)return;
 queueStoryBooster('part5');story.part5='complete';story.chapter1='complete';story.stage='part5-complete';story.finalMineStep=0;story.unlocked=Math.max(2,story.unlocked);
 if(!economy.storyRewards.part5){economy.storyRewards.part5=true;awardGold(50)}saveCollection();saveStory();showStoryMenu();
}
