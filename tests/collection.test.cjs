const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html','utf8');
const main = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const features = fs.readFileSync('collection-updates.js','utf8');
new vm.Script(main);new vm.Script(features);
const ctx = vm.createContext({console,window:{},Math,saveCollection(){},readSaved:()=>({})});
vm.runInContext(fs.readFileSync('assets/data/card-stats.js','utf8'),ctx);
vm.runInContext(features,ctx);
vm.runInContext(main.slice(0,main.indexOf('const memoryCards=')),ctx);
vm.runInContext(main.split('\n').find(line=>line.startsWith('function shuffle(')),ctx);
vm.runInContext(`let collection={counts:{},foils:{},starterBoosters:0};
 const ownedCopies=id=>collection.counts[id]||0;
 function deckNameCount(deck,name){return deck.cards.filter(i=>pool[i]?.name===name).length}
 initializeCardStats();`,ctx);
const run = code => vm.runInContext(code,ctx);
const plain = code => JSON.parse(JSON.stringify(run(code)));
assert.equal(run('catalog.length'),95);
assert.equal(run('new Set(catalog.map(c=>c.id)).size'),95);
for (const [id,v] of Object.entries({p10:[7,7,2,2],p31:[1,5,6,2],p37:[4,4,3,5],p40:[3,4,7,4],p42:[8,6,2,4],p44:[7,3,7,2],p48:[0,6,6,3],p86:[8,1,8,1],p88:[9,3,1,2],p90:[4,7,0,3],p91:[0,0,8,8],p95:[5,2,6,10]})) assert.deepEqual(plain(`catalogById('${id}').v`),v);
assert.equal(run(`isRareCard(catalogById('p03'))`),false);
assert.equal(run(`isRareCard(catalogById('p05'))`),true);
run(`collection.counts=Object.fromEntries(pool.map(c=>[c.id,5]));const deckOf=ids=>({cards:ids.map(id=>pool.findIndex(c=>c.id===id))});`);
assert.equal(run(`validDeck(deckOf(['p05','p14','p28','p03','p07']))`),true);
assert.equal(run(`validDeck(deckOf(['p05','p14','p28','p33','p03']))`),false);
assert.equal(run(`validDeck(deckOf(['p03','p07','p12','p22','p24']))`),true,'Five common alternatives are legal');
assert.equal(run(`validDeck(deckOf(['p03','p03','p04','p07','p12']))`),false,'Two copies per name across illustrations');
run(`collection.foils.p03=1`);
assert.deepEqual(plain(`deckCardsWithFoil(deckOf(['p03','p03','p07','p12','p22'])).map(c=>c.foil)`),[true,false,false,false,false]);
for(let i=0;i<100;i++)assert.equal(run('randomLegalHand().filter(isRareCard).length<=3'),true);
assert.equal(run('validStats([0,10,5,2])'),true);
for(const input of ['[1,2,3]','[1,2,3,11]','[1,2,3,1.5]','[1,2,3,"4"]'])assert.equal(run(`validStats(${input})`),false);
assert.throws(()=>run('validateStatMap({p00:[1,2,3,4]})'));
run(`localStats={p42:[1,2,3,4]};applyCardStats()`);assert.deepEqual(plain(`catalogById('p42').v`),[1,2,3,4]);
run(`localStats={};applyCardStats()`);assert.deepEqual(plain(`catalogById('p42').v`),[8,6,2,4]);
run(`collection={counts:{},foils:{}};for(let n=0;n<50;n++)recordBoosterOpening();`);
assert.deepEqual(plain('pityProgress().pending'),[{milestone:25,type:'rare-or-memory'},{milestone:50,type:'alternative'}]);
assert.equal(run(`claimPityCard('p03',25)`),false,'A common alternative is not a 25 reward');
assert.equal(run(`claimPityCard('s06',25)`),true);
assert.equal(run(`claimPityCard('s06',25)`),false,'No double claim');
assert.equal(run(`claimPityCard('p30',50)`),false,'Parallel is not alternative');
run(`collection=JSON.parse(JSON.stringify(collection))`);
assert.equal(run(`claimPityCard('p03',50)`),true,'Pending choice survives serialization');
assert.equal(run('pityProgress().pending.length'),0);
run(`collection={counts:{},foils:{}};pityProgress().opened=199;`);
assert.equal(run(`generateBooster(catalog,collection,()=>.99)[4].card.rarity`),'parallel');
// Fixed independent seeds, not a favorable hand-picked sample.
const result = run(`(()=>{let minimum=1,total=0,complete=0;const standard=catalog.filter(c=>['common','uncommon','rare'].includes(c.rarity));
 for(let seed=1;seed<=500;seed++){
  let state={counts:{},foils:{}},s=seed;const rng=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
  for(let n=0;n<200;n++){
   const pack=generateBooster(catalog,state,rng);
   if(pack.length!==5||pack[0].card.rarity!=='common'||pack[1].card.rarity!=='common'||!['common','uncommon'].includes(pack[2].card.rarity)||!['common','uncommon','rare'].includes(pack[3].card.rarity)||pack.filter(p=>p.foil).length!==1)throw Error('Invalid slots');
   for(const p of pack)state.counts[p.card.id]=(state.counts[p.card.id]||0)+1;
   recordBoosterOpening(state);
  }
  const found=standard.filter(c=>state.counts[c.id]>0).length/standard.length;minimum=Math.min(minimum,found);total+=found;if(found===1)complete++;
  if(!catalog.some(c=>c.rarity==='parallel'&&state.counts[c.id]>0))throw Error('No parallel');
  if(pityProgress(state).pending.length!==8)throw Error('Pity milestones');
 }
 return {minimum,average:total/500,complete,runs:500};})()`);
assert(result.minimum>=.95);assert(result.average>=.99);
console.log('PASS: stats audit, 95 cards, deck limits, foil copies, import validation, pity, persistence and 100,000 booster openings.');
console.log(JSON.stringify(result));
