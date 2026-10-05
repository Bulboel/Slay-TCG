// Run from repository root. Requires playwright; optional CHROMIUM_EXECUTABLE_PATH.
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 const server=http.createServer((q,r)=>{let f=path.join(process.cwd(),decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';r.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','webp':'image/webp','png':'image/png'})[f.split('.').pop()]||'application/octet-stream');fs.createReadStream(f).on('error',()=>{r.statusCode=404;r.end()}).pipe(r)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const opts={headless:true};if(process.env.CHROMIUM_EXECUTABLE_PATH){opts.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;opts.args=require('@sparticuz/chromium').default.args}
 const browser=await chromium.launch(opts);
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 const before=await page.evaluate(()=>JSON.stringify(progressPayload()));
 await page.locator('#startupScreen button').filter({hasText:'Apprendre à jouer'}).tap();
 for(const [width,height] of [[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.screenshot({path:`/tmp/tutorial-${width}-${height}.png`});
  const bounds=await page.locator('.tutorial-table').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,'Tutorial fits mobile');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#tutorialNext').tap();await page.locator('#tutorialHand button').first().tap();await page.locator('#tutorialBoard [data-pos="3"]').tap();
 assert.equal(await page.evaluate(()=>tutorialDuel.board[4].owner),'p');await page.screenshot({path:'/tmp/tutorial-capture.png'});
 for(let guard=0;guard<20;guard++){
  const phase=await page.evaluate(()=>tutorialDuel.phase);if(phase==='done')break;
  if(phase==='choose'){const hint=await page.evaluate(()=>tutorialHint());await page.locator('#tutorialHand button').nth(hint.index).tap();await page.locator('#tutorialBoard [data-pos="'+hint.pos+'"]').tap()}
  else await page.locator('#tutorialNext').tap();
 }
 assert.equal(await page.evaluate(()=>tutorialDuel.phase),'done');assert.equal(await page.locator('#tutorialBoard .card').count(),9);await page.screenshot({path:'/tmp/tutorial-finish.png'});await page.locator('#tutorialNext').tap();assert.equal(await page.evaluate(()=>JSON.stringify(progressPayload())),before);
 await page.evaluate(()=>{$('#startupScreen').classList.add('hidden');openPanel('#optionsScreen')});
 const save=process.env.HACKENIA_SHOWCASE_SAVE||'/workspace/scratch/b609725c2c27/deliverables/Hackenia-collection-complete-100.json';
 await page.locator('#importSaveFile').setInputFiles(save);await page.waitForFunction(()=>catalog.every(c=>ownedCopies(c.id)===100));
 await page.reload();await page.locator('#startupLoadBtn').tap();await page.evaluate(()=>openPanel('#collectionScreen'));
 assert.equal(await page.locator('#collectionGrid .mastery-halo.diamond').count(),150);
 assert.equal(await page.locator('#collectionGrid .mastery-frame').count(),0);
 const item=page.locator('#collectionGrid [data-card-id="p27"]'),art=await item.locator('.card').boundingBox(),badge=await item.locator('.collection-foil-count').boundingBox();assert(badge.y>=art.y+art.height,'Foil badge below illustration');assert.equal(await item.locator('.collection-kind').textContent(),'Kala');await page.screenshot({path:'/tmp/collection-halos.png'});
 await item.tap();assert(await page.locator('#cardZoom .mastery-halo.diamond').isVisible());await page.screenshot({path:'/tmp/diamond-halo.png'});await page.locator('#cardZoomClose').tap();
 await page.evaluate(()=>{collection.counts={};collection.foils={};collection.boosterProgress={[BOOSTER_SET]:{opened:50,pending:[{milestone:50,type:'all-set'}]}};collection.counts.p107=1;showPity()});
 assert.equal(await page.locator('#pityGrid .card, #pityGrid img').count(),0);assert.equal(await page.locator('#pityGrid .reward-option').count(),await page.evaluate(()=>catalog.filter(c=>!['common','uncommon'].includes(c.rarity)&&c.id!=='p107').length));
 await page.evaluate(()=>{collection.counts=Object.fromEntries(catalog.map(c=>[c.id,100]));showPity()});assert(await page.locator('#pityDialog').isHidden());assert.equal(await page.evaluate(()=>pityProgress().pending.length),0);
 await page.evaluate(()=>{collection.pendingPack={context:'shop',pulls:['p04','p27','p23','p29','p03'].map((id,i)=>({id,foil:i===4,slot:'Test'}))};collection.boosterProgress={};showBooster('shop');openBoosterPack()});
 await page.waitForFunction(()=>boosterPresentation.index===3&&document.querySelector('.booster-pull.active .rare-spark-burst'));
 assert.equal(await page.locator('.booster-pull.active .rare-spark-burst i').count(),24);
 await page.waitForSelector('.booster-angel-stage',{state:'attached'});await page.waitForTimeout(600);assert.equal(await page.locator('.angel-spark').count(),24);await page.screenshot({path:'/tmp/angel-bright.png'});
 await page.waitForFunction(()=>boosterPresentation.seen===4&&!boosterPresentation.busy);assert.deepEqual(errors,[]);
 console.log('PASS: full guided duel, mobile fit, exact save import/reload, diamond halos, unobstructed collection labels, missing-only rewards, rare shine in slot 4 and brighter angel.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
