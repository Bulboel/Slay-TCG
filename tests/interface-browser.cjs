// Run from repository root. Requires playwright; optional CHROMIUM_EXECUTABLE_PATH.
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 const server=http.createServer((q,r)=>{let f=path.join(process.cwd(),decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';r.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','webp':'image/webp','png':'image/png'})[f.split('.').pop()]||'application/octet-stream');fs.createReadStream(f).on('error',()=>{r.statusCode=404;r.end()}).pipe(r)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const opts={headless:true};if(process.env.CHROMIUM_EXECUTABLE_PATH){opts.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;opts.args=require('@sparticuz/chromium').default.args}
 const browser=await chromium.launch(opts);
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.screenshot({path:'/tmp/polish-startup.png'});
 const title=await page.locator('#startupScreen .menu-title').boundingBox(),box=await page.locator('#startupScreen .menu-card').boundingBox();assert(Math.abs(title.x+title.width/2-box.x-box.width/2)<1,'Title centred');assert(title.width<=box.width);
 await page.evaluate(()=>{$('#startupScreen').classList.add('hidden');collection.counts=Object.fromEntries(catalog.map(c=>[c.id,100]));renderCollection();showMenu()});
 for(const name of ['collection','deck','shop','story','options','pvp','mode']){
  await page.evaluate(name=>{if(name==='deck')renderDeckBuilder();openPanel('#'+name+'Screen')},name);await page.screenshot({path:'/tmp/polish-'+name+'.png'});
  assert(await page.locator('#'+name+'Screen').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Panel overflow '+name);
 }
 await page.evaluate(()=>openPanel('#optionsScreen'));assert(await page.locator('[data-effect="spider"] .memory-skin-choice').count());await page.locator('#testAudioBtn').tap();await page.waitForFunction(()=>AudioEngine.state.contextState==='running');await page.evaluate(()=>AudioEngine.suspend());await page.waitForFunction(()=>AudioEngine.state.contextState==='suspended');await page.locator('#testAudioBtn').tap();await page.waitForFunction(()=>AudioEngine.state.contextState==='running');
 const seed=async()=>page.evaluate(()=>{document.querySelectorAll('.panel-screen').forEach(e=>e.classList.add('hidden'));$('#menuScreen').classList.add('hidden');$('#gameApp').classList.remove('hidden');gameType='local';$('#splitScreen').checked=true;$('#passScreen').checked=false;currentMode='pvp';turn='p';locked=false;passing=false;memoryPending=false;blindHands={p:false,a:false};hands={p:['p27','p04','p08','p13','p29'].map(id=>playerCard(catalogById(id))),a:['p27','p04','p08','p13','p29'].map(id=>playerCard(catalogById(id)))};board=Array(9).fill(null);playedOrder=[];resetMemories();render()});
 await seed();const cdp=await page.context().newCDPSession(page);
 const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y}]});
 let r=await page.locator('#playerHand .card').first().boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 await touch('touchStart',x,y);await page.waitForTimeout(500);await touch('touchEnd');assert(await page.locator('#cardZoom').isVisible(),'Long press zooms hand');assert(await page.locator('#cardZoom .mastery-frame.diamond').count());assert.equal(await page.evaluate(()=>board.filter(Boolean).length),0);await page.locator('#cardZoomClose').tap();
 await page.waitForTimeout(850);r=await page.locator('#playerHand .card').first().boundingBox();x=r.x+r.width/2;y=r.y+r.height/2;const target=await page.locator('.cell').nth(4).boundingBox(),tx=target.x+target.width/2,ty=target.y+target.height/2;
 await touch('touchStart',x,y);for(let i=1;i<=8;i++)await touch('touchMove',x+(tx-x)*i/8,y+(ty-y)*i/8);await touch('touchEnd');await page.waitForFunction(()=>board[4]?.card.id==='p27');assert(await page.locator('#cardZoom').isHidden(),'Dragging does not zoom');
 assert(await page.locator('#board .catalog-number').isHidden());assert(await page.locator('#board .mastery-frame').isHidden());
 await page.waitForTimeout(450);r=await page.locator('#board .card').boundingBox();await touch('touchStart',r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(500);await touch('touchEnd');assert(await page.locator('#cardZoom').isVisible(),'Board long press zooms');assert(await page.locator('#cardZoom .mastery-frame.diamond').isVisible());await page.locator('#cardZoomClose').tap();
 for(const [width,height] of [[390,844],[390,667],[320,568],[844,390]]){await page.setViewportSize({width,height});await page.screenshot({path:`/tmp/polish-duel-${width}-${height}.png`});const b=await page.locator('#board').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,'Board fits');const hand=await page.locator('#playerHand').boundingBox();assert(hand.y+hand.height<=height+1,'Hand fits')}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{collection.pendingPack={context:'shop',pulls:['p04','p27','p147','p29','p150'].map((id,i)=>({id,foil:i===4,slot:'Test'}))};collection.boosterProgress={};showBooster('shop');openBoosterPack()});const began=Date.now();await page.waitForSelector('.rare-spark-burst');assert.equal(await page.locator('.rare-spark-burst i').count(),12);await page.screenshot({path:'/tmp/polish-rare.png'});await page.waitForFunction(()=>boosterPresentation.seen===4&&!boosterPresentation.busy);assert(Date.now()-began<11000,'Opening is faster');assert.equal(await page.locator('.rare-spark-burst').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: themed menus, sound resume, spider option, touch drag, hand/board long press, clean board, mobile sizing and faster rare spark reveal.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
