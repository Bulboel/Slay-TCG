const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html','utf8');
const main = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const features = fs.readFileSync('collection-updates.js','utf8');
new vm.Script(main);new vm.Script(features);
const ctx = vm.createContext({console,window:{},Math,saveCollection(){},readSaved:()=>({})});
vm.runInContext(fs.readFileSync('assets/data/card-stats.js','utf8'),ctx);
for(const file of ['assets/data/september28-cards.js','assets/data/card-numbers.js','collection-polish.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
vm.runInContext(features,ctx);
vm.runInContext(main.slice(0,main.indexOf('const memoryCards=')),ctx);
vm.runInContext(main.split('\n').find(line=>line.startsWith('function shuffle(')),ctx);
vm.runInContext(`let collection={counts:{},foils:{},starterBoosters:0};
 const ownedCopies=id=>collection.counts[id]||0;
 function deckNameCount(deck,name){return deck.cards.filter(i=>pool[i]?.name===name).length}
 initializeCardStats();`,ctx);
const run = code => vm.runInContext(code,ctx);
const plain = code => JSON.parse(JSON.stringify(run(code)));
assert.equal(run('catalog.length'),150);
assert.equal(run('new Set(catalog.map(c=>c.id)).size'),150);
assert.equal(run('new Set(catalog.map(c=>c.number)).size'),150);
assert.deepEqual(plain(`catalogById('p113').v`),[3,8,3,8]);
assert.equal(run(`catalog.filter(c=>c.rarity==='divine').length`),6);
assert.equal(run(`isDivineCard(catalogById('p104'))`),true);
assert.equal(run(`rewardCandidates({type:'alternative'}).some(c=>c.rarity==='divine')`),false);
assert.equal(run(`(()=>{const ds=catalog.filter(c=>c.rarity==='divine'),total=ds.reduce((s,c)=>s+c.divineWeight,0);return ds.find(c=>c.kaylaDivine).divineWeight/total})()`),.02,'Kayla is 2% of Divine draws');
assert.deepEqual(plain('[masteryTier(9),masteryTier(10),masteryTier(19),masteryTier(20)]'),['','gold','gold','diamond']);
assert.equal(run(`(()=>{const state={counts:Object.fromEntries(catalog.filter(c=>!c.kaylaDivine).map(c=>[c.id,1])),foils:{}};let kayla=0;for(let n=0;n<1000;n++){let seq=[.5,.5,.5,.5,.5,.5,.192,(n+.5)/1000],i=0;const card=generateBooster(catalog,state,()=>seq[i++])[4].card;if(card.kaylaDivine)kayla++;if(card.rarity!=='divine')throw Error('Divine slot');}return kayla})()`),20,'Kayla stays 2% of Divine draws even when she is the only missing card');
for (const [id,v] of Object.entries({p10:[7,7,2,2],p31:[1,5,6,2],p37:[4,4,3,5],p40:[3,4,7,4],p42:[8,6,2,4],p44:[7,3,7,2],p48:[0,6,6,3],p86:[8,1,8,1],p88:[9,3,1,2],p90:[4,7,0,3],p91:[0,0,8,8],p95:[5,2,6,10]})) assert.deepEqual(plain(`catalogById('${id}').v`),v);
assert.equal(run(`isRareCard(catalogById('p03'))`),false);
assert.equal(run(`isRareCard(catalogById('p05'))`),true);
run(`collection.counts=Object.fromEntries(pool.map(c=>[c.id,5]));const deckOf=ids=>({cards:ids.map(id=>pool.findIndex(c=>c.id===id))});`);
assert.equal(run(`validDeck(deckOf(['p05','p14','p104','p03','p07']))`),true);
assert.equal(run(`validDeck(deckOf(['p05','p14','p28','p33','p03']))`),false);
assert.equal(run(`validDeck(deckOf(['p03','p07','p12','p22','p24']))`),true,'Five common alternatives are legal');
assert.equal(run(`validDeck(deckOf(['p03','p03','p04','p07','p12']))`),false,'Two copies per name across illustrations');
run(`collection.foils.p03=1`);
assert.deepEqual(plain(`deckCardsWithFoil(deckOf(['p03','p03','p07','p12','p22'])).map(c=>c.foil)`),[true,false,false,false,false]);
for(let i=0;i<100;i++)assert.equal(run('randomLegalHand().filter(isRareCard).length<=2'),true);
assert.equal(run('validStats([0,10,5,2])'),true);
for(const input of ['[1,2,3]','[1,2,3,11]','[1,2,3,1.5]','[1,2,3,"4"]'])assert.equal(run(`validStats(${input})`),false);
assert.throws(()=>run('validateStatMap({p00:[1,2,3,4]})'));
run(`localStats={p42:[1,2,3,4]};applyCardStats()`);assert.deepEqual(plain(`catalogById('p42').v`),[1,2,3,4]);
run(`localStats={};applyCardStats()`);assert.deepEqual(plain(`catalogById('p42').v`),[8,6,2,4]);
run(`collection={counts:{},foils:{}};for(let n=0;n<50;n++)recordBoosterOpening();`);
assert.deepEqual(plain('pityProgress().pending'),[{milestone:25,type:'rare-or-memory'},{milestone:50,type:'all-set'}]);
assert.equal(run(`claimPityCard('p03',25)`),false,'A common alternative is not a 25 reward');
assert.equal(run(`claimPityCard('s06',25)`),true);
assert.equal(run(`claimPityCard('s06',25)`),false,'No double claim');
assert.equal(run(`claimPityCard('p27',50)`),false,'Common is excluded from 50 reward');
run(`collection=JSON.parse(JSON.stringify(collection))`);
assert.equal(run(`claimPityCard('p03',50)`),true,'Pending choice survives serialization');
assert.equal(run('pityProgress().pending.length'),0);
run(`collection={counts:{},foils:{}};pityProgress().opened=199;`);
assert.equal(run(`generateBooster(catalog,collection,()=>.99)[4].card.rarity`),'parallel');
run(`const oldPack=generateBooster(catalog,collection);oldPack[4]={card:catalogById('s06'),foil:true};repairPendingFoil(oldPack)`);
assert.equal(run('oldPack[4].card.kind'),'playable');assert.equal(run('oldPack[4].card.rarity'),'alternative');assert.equal(run('oldPack[4].foil'),true);
// Fixed independent seeds, not a favorable hand-picked sample.
const result = run(`(()=>{let minimum=1,total=0,complete=0;const standard=catalog.filter(c=>['common','uncommon','rare'].includes(c.rarity));
 for(let seed=1;seed<=500;seed++){
  let state={counts:{},foils:{}},s=seed;const rng=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
  for(let n=0;n<200;n++){
   const pack=generateBooster(catalog,state,rng);
   if(pack.length!==5||pack[0].card.rarity!=='common'||pack[1].card.rarity!=='common'||!['common','uncommon'].includes(pack[2].card.rarity)||!['common','uncommon','rare'].includes(pack[3].card.rarity)||pack.filter(p=>p.foil).length!==1)throw Error('Invalid slots');
   if(pack[4].card.kind!=='playable')throw Error('Souvenir in foil slot');
   for(const p of pack)state.counts[p.card.id]=(state.counts[p.card.id]||0)+1;
   recordBoosterOpening(state);
  }
  const found=standard.filter(c=>state.counts[c.id]>0).length/standard.length;minimum=Math.min(minimum,found);total+=found;if(found===1)complete++;
  if(!catalog.some(c=>c.rarity==='parallel'&&state.counts[c.id]>0))throw Error('No parallel');
  if(pityProgress(state).pending.length>8||pityProgress(state).pending.some(r=>!rewardCandidates(r,BOOSTER_SET,state).length))throw Error('Pity milestones');
 }
 return {minimum,average:total/500,complete,runs:500};})()`);
assert(result.minimum>=.95);assert(result.average>=.99);
console.log('PASS: stats audit, 150 cards, deck limits, foil copies, import validation, pity, persistence and 100,000 booster openings.');
console.log(JSON.stringify(result));

// Pending legacy 50/100 choices become one missing rare+ choice per milestone.
run(`collection={counts:{},foils:{},boosterProgress:{[BOOSTER_SET]:{opened:100,pending:[{milestone:50,type:'alternative'},{milestone:100,type:'alternative'},{milestone:100,type:'all-set'}]}}}`);
assert.equal(run('pityProgress().pending.length'),2);
assert.equal(run('pityProgress().pending.length'),2,'Migration is idempotent');
assert.equal(run(`rewardCandidates({type:'all-set'}).every(c=>!['common','uncommon'].includes(c.rarity))`),true);
assert.equal(run(`rewardCandidates({type:'all-set'},'future-set').length`),0);
assert.equal(run(`claimPityCard('p107',50,'all-set')`),true);
assert.equal(run(`claimPityCard('p107',100,'all-set')`),false,'Owned cards cannot be chosen');
assert.equal(run('pityProgress().pending.length'),1,'Rejected claim preserves reward');
assert.equal(run(`claimPityCard('p30',100,'all-set')`),true);
run(`collection.counts=Object.fromEntries(pool.map(c=>[c.id,5]))`);
assert.equal(run(`validDeck(deckOf(['p104','p107','p03','p07','p12']))`),false);
assert.equal(run(`validDeck(deckOf(['p05','p14','p28','p03','p07']))`),false);
for(let i=0;i<500;i++)assert.equal(run('randomLegalHand().filter(isDivineCard).length<=1'),true);
run(`collection.counts.p03=100`);
assert.equal(run(`sortedCards(pool,'quantity')[0].id`),'p03');
run(`collection={counts:{},foils:{}};for(let n=0;n<100;n++)recordBoosterOpening()`);
assert.deepEqual(plain('pityProgress().pending.map(r=>[r.milestone,r.type])'),[[25,'rare-or-memory'],[50,'all-set'],[75,'rare-or-memory'],[100,'all-set']]);
run(`collection.counts=Object.fromEntries(catalog.map(c=>[c.id,1]))`);
assert.equal(run('pityProgress().pending.length'),0,'Completed collection skips all empty choices');
run(`delete collection.counts.p107;recordBoosterOpening()`);
assert.equal(run('pityProgress().pending.length'),0,'Skipped choices never return');
console.log('PASS: missing-only 25/50 rewards, old reward migration, no duplicates and complete collection.');

assert.equal(run(`sortedCards(catalog,'number')[0].id`),'p27');
assert.equal(run(`sortedCards(catalog,'number').slice(-13).every(c=>c.kind==='memory')`),true);
assert.deepEqual(plain(`sortedCards(catalog,'name-desc').map(c=>c.id)`),plain(`sortedCards(catalog,'name').reverse().map(c=>c.id)`));
assert.deepEqual(plain(`sortedCards(catalog,'rarity-desc').map(c=>c.id)`),plain(`sortedCards(catalog,'rarity').reverse().map(c=>c.id)`));
for(const [id,v] of Object.entries({p129:[0,8,8,1],p130:[9,7,4,10],p131:[8,9,8,6],p132:[8,8,7,9],p133:[7,9,10,4],p134:[9,8,5,9],p135:[3,9,7,0],p136:[6,1,1,8]}))assert.deepEqual(plain(`catalogById('${id}').v`),v);
console.log('PASS: inverse sorts, new stats, official heroes-first and memories-last numbering.');

assert.deepEqual(plain("catalogById('p140').v"),[1,3,3,7]);

assert.equal(run("catalogById('p148').number"),137);
assert.equal(run("sortedCards(catalog,'number')[137].kind"),'memory');
for(const [id,v] of Object.entries({p146:[1,1,2,8],p147:[7,4,4,7],p148:[8,10,8,10],p149:[5,8,5,5],p150:[8,1,1,6]}))assert.deepEqual(plain(`catalogById('${id}').v`),v);

const odds=plain(`(()=>{const state={counts:Object.fromEntries(catalog.map(c=>[c.id,1]))},result={};for(let n=0;n<10000;n++){const sequence=[.5,.5,.5,.5,.5,.5,(n+.5)/10000,.5];let i=0;const rarity=generateBooster(catalog,state,()=>sequence[i++]||.00001)[4].card.rarity;result[rarity]=(result[rarity]||0)+1}return result})()`);
assert.equal(odds.alternative,800);assert.equal(odds.rare,1000);assert.equal(odds.parallel,100);assert.equal(odds.divine,50);
console.log('PASS: exact foil rarity intervals: 8% alternative, 10% rare, 1% parallel, 0.5% Divine.');
