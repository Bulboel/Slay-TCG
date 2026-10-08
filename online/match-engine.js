// Moteur de règles déterministe pour les futurs duels PVP en ligne.
// Valeurs de carte : [haut, droite, bas, gauche]. Joueurs : 'host' et 'guest'.
// Phase 1 : règles classiques Clair/Obscur (même capture, visibilité différente).
// Ce moteur est indépendant de l'interface et sera exécuté côté serveur avant mise en production.
const OPPOSITE = [2, 3, 0, 1];
const DIRECTIONS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

export function assertCard(card) {
  if (!card || typeof card.id !== 'string' || !card.id ||
      !Array.isArray(card.v) || card.v.length !== 4 ||
      !card.v.every(n => Number.isInteger(n) && n >= 1 && n <= 10)) {
    throw new Error('Carte invalide.');
  }
}

export function createMatchState(hostDeck, guestDeck, rule = 'basic-open') {
  if (!['basic-open', 'basic-dark'].includes(rule)) throw new Error('Règle non prise en charge.');
  for (const deck of [hostDeck, guestDeck]) {
    if (!Array.isArray(deck) || deck.length !== 5) throw new Error('Un deck doit contenir 5 cartes.');
    deck.forEach(assertCard);
  }
  return {
    rule,
    board: Array(9).fill(null),
    hands: { host: hostDeck.map(c => ({ id: c.id, v: [...c.v] })),
             guest: guestDeck.map(c => ({ id: c.id, v: [...c.v] })) },
    turn: 'host',
    moves: 0,
    winner: null,
    finished: false
  };
}

export function applyMove(state, player, handIndex, position) {
  if (state.finished) throw new Error('La partie est terminée.');
  if (player !== state.turn) throw new Error("Ce n'est pas ton tour.");
  if (!Number.isInteger(position) || position < 0 || position > 8 || state.board[position])
    throw new Error('Case indisponible.');
  if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= state.hands[player].length)
    throw new Error('Carte indisponible.');
  const next = structuredClone(state);
  const [card] = next.hands[player].splice(handIndex, 1);
  next.board[position] = { owner: player, card };
  const row = Math.floor(position / 3), col = position % 3;
  const captures = [];
  for (let side = 0; side < 4; side++) {
    const [dr, dc] = DIRECTIONS[side], nr = row + dr, nc = col + dc;
    if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
    const neighborPosition = nr * 3 + nc;
    const target = next.board[neighborPosition];
    if (target && target.owner !== player && card.v[side] > target.card.v[OPPOSITE[side]]) {
      target.owner = player;
      captures.push(neighborPosition);
    }
  }
  next.moves += 1;
  if (next.moves === 9) {
    next.finished = true;
    const host = next.board.filter(cell => cell?.owner === 'host').length +
      next.hands.host.length;
    const guest = next.board.filter(cell => cell?.owner === 'guest').length +
      next.hands.guest.length;
    next.winner = host === guest ? 'draw' : host > guest ? 'host' : 'guest';
    next.turn = null;
  } else {
    next.turn = player === 'host' ? 'guest' : 'host';
  }
  return { state: next, captures };
}
