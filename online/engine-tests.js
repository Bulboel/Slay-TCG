// Tests du moteur PVP, sans serveur ni dépendance externe.
// Exécution : ouvrir online/engine-tests.html dans un navigateur.
import { createMatchState, applyMove } from './match-engine.js';
const c=(id,v)=>({id,v});
const a=c('a',[8,7,6,5]),b=c('b',[2,3,4,1]);
const host=[a,a,a,a,a],guest=[b,b,b,b,b];
const tests=[];
function test(name,fn){try{fn();tests.push({name,ok:true})}catch(error){tests.push({name,ok:false,error:error.message})}}
function check(value,message){if(!value)throw new Error(message)}
function rejects(fn){let threw=false;try{fn()}catch{threw=true}check(threw,'Une action interdite a été acceptée')}
test('Création : plateau vide et 5 cartes chacun',()=>{const s=createMatchState(host,guest);check(s.board.length===9&&s.hands.host.length===5&&s.hands.guest.length===5,'État initial incorrect')});
test('Tour : un joueur ne peut pas jouer deux fois',()=>{const s=createMatchState(host,guest);rejects(()=>applyMove(s,'guest',0,0));const r=applyMove(s,'host',0,0);rejects(()=>applyMove(r.state,'host',0,1))});
test('Case déjà occupée refusée',()=>{let s=createMatchState(host,guest);s=applyMove(s,'host',0,0).state;rejects(()=>applyMove(s,'guest',0,0))});
test('Capture horizontale : droite contre gauche',()=>{let s=createMatchState(host,guest);s=applyMove(s,'host',0,0).state;s=applyMove(s,'guest',0,1).state;check(s.board[0].owner==='host','Capture inattendue');s=applyMove(s,'host',0,2).state;check(s.board[1].owner==='host','La carte de gauche doit être capturée')});
test('Capture verticale : haut contre bas',()=>{let s=createMatchState(host,guest);s=applyMove(s,'host',0,0).state;s=applyMove(s,'guest',0,3).state;s=applyMove(s,'host',0,6).state;check(s.board[3].owner==='host','La carte au-dessus doit être capturée')});
test('La fonction ne modifie pas son état d’entrée',()=>{const s=createMatchState(host,guest);applyMove(s,'host',0,0);check(s.board[0]===null&&s.hands.host.length===5,'État original modifié')});
test('9 coups : partie terminée et score calculé',()=>{let s=createMatchState(host,guest);for(let i=0;i<9;i++)s=applyMove(s,s.turn,0,i).state;check(s.finished&&s.moves===9&&s.turn===null,'Fin incorrecte');check(['host','guest','draw'].includes(s.winner),'Vainqueur incorrect');rejects(()=>applyMove(s,'host',0,0))});
test('Decks et règles invalides refusés',()=>{rejects(()=>createMatchState(host.slice(1),guest));rejects(()=>createMatchState(host,guest,'plus-open'));rejects(()=>createMatchState([...host.slice(0,4),c('bad',[11,1,1,1])],guest))});
const output=document.getElementById('results');
if(output){output.replaceChildren();for(const t of tests){const li=document.createElement('li');li.textContent=(t.ok?'✓ ':'✗ ')+t.name+(t.error?' — '+t.error:'');li.style.color=t.ok?'#b7efb3':'#ffadad';output.append(li)}document.getElementById('summary').textContent=tests.filter(t=>t.ok).length+' / '+tests.length+' tests réussis';}
export {tests};
