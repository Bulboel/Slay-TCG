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
  story.part4 = 'complete'; story.chapter1 = 'complete'; story.stage = 'part4-complete'; story.mineStep = 0; story.unlocked = Math.max(2, story.unlocked);
  if (!economy.storyRewards.part4) { economy.storyRewards.part4 = true; awardGold(50); }
  saveCollection(); saveStory(); showStoryMenu();
}
