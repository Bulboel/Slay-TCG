// Run from repository root. Requires playwright; optional CHROMIUM_EXECUTABLE_PATH.
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 const server=http.createServer((q,r)=>{let f=path.join(process.cwd(),decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';r.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','webp':'image/webp','png':'image/png'})[f.split('.').pop()]||'application/octet-stream');fs.createReadStream(f).on('error',()=>{r.statusCode=404;r.end()}).pipe(r)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const opts={headless:true};if(process.env.CHROMIUM_EXECUTABLE_PATH){opts.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;opts.args=require('@sparticuz/chromium').default.args}
 const browser=await chromium.launch(opts);
 try{
 const context=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true});const page=await context.newPage();const url='http://127.0.0.1:'+server.address().port;await page.goto(url);
 await page.evaluate(()=>{$('#startupScreen').classList.add('hidden');collection.counts=Object.fromEntries(pool.map(c=>[c.id,2]));collection.starterBoosters=0;renderCollection();openPanel('#collectionScreen')});
 const cdp=await context.newCDPSession(page);
 for(const panel of ['collection','deck']){
  await page.evaluate(panel=>{if(panel==='deck'){renderDeckBuilder();openPanel('#deckScreen')}const p=document.querySelector('#'+panel+'Screen .panel-card');p.scrollTop=document.querySelector('#'+panel+'Grid').offsetTop-80},panel);
  const card=page.locator('#'+panel+'Grid .card').first();const rect=await card.boundingBox();const y=Math.min(570,rect.y+rect.height/2),x=rect.x+rect.width/2;
  const before=await page.locator('#'+panel+'Screen .panel-card').evaluate(e=>e.scrollTop);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*18}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);
  const after=await page.locator('#'+panel+'Screen .panel-card').evaluate(e=>e.scrollTop);assert(after>before+30,panel+' scrolls from card');assert(await page.locator('#cardZoom').isHidden(),'Swipe must not zoom');
 }
 await page.evaluate(()=>{showMenu();openPanel('#optionsScreen');economy.gold=12;writeSaveSlot(null);saveSlotActive=false;economy.gold=765;renderWallet()});
 const downloaded=page.waitForEvent('download');await page.locator('#exportSaveBtn').click();const download=await downloaded;await download.saveAs('/tmp/hackenia-transfer.json');const payload=JSON.parse(fs.readFileSync('/tmp/hackenia-transfer.json'));assert.equal(payload.profile.economy.gold,765);
 const fresh=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true});const other=await fresh.newPage();await other.goto(url);await other.evaluate(()=>{$('#startupScreen').classList.add('hidden');openPanel('#optionsScreen')});await other.locator('#importSaveFile').setInputFiles('/tmp/hackenia-transfer.json');await other.waitForFunction(()=>economy.gold===765);assert.equal(await other.locator('#menuScreen .gold-value').textContent(),'765');await other.reload();await other.locator('#startupLoadBtn').click();assert.equal(await other.evaluate(()=>economy.gold),765);
 console.log('PASS: real touch swipes over Collection/Deck cards and downloaded save imported on fresh device retain 765 gold after reload.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
