// Run from repository root. Requires playwright; optional CHROMIUM_EXECUTABLE_PATH.
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 const server=http.createServer((q,r)=>{let f=path.join(process.cwd(),decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';r.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','webp':'image/webp','png':'image/png'})[f.split('.').pop()]||'application/octet-stream');fs.createReadStream(f).on('error',()=>{r.statusCode=404;r.end()}).pipe(r)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const opts={headless:true};if(process.env.CHROMIUM_EXECUTABLE_PATH){opts.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;opts.args=require('@sparticuz/chromium').default.args}
 const browser=await chromium.launch(opts);
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{$('#startupScreen').classList.add('hidden');showMenu()});await page.screenshot({path:'/tmp/menu-mobile.png'});
  const seed=async(last='p148')=>page.evaluate(last=>{collection.boosterProgress={};collection.starterBoosters=0;collection.pendingPack={context:'shop',pulls:['p04','p27','p147','p29',last].map((id,i)=>({id,foil:i===4,slot:'Test'}))};showBooster('shop')},last);
  await seed();await page.locator('#boosterPack').click();await page.waitForFunction(()=>boosterPresentation.seen===0&&!boosterPresentation.busy);
  assert.equal(await page.locator('#boosterCards .booster-pull:visible').count(),1);assert(await page.locator('#boosterContinueBtn').isDisabled());
  await page.locator('#boosterCards .active .card').click();assert(await page.locator('#cardZoom').isVisible());await page.locator('#cardZoomClose').click();
  assert(await page.locator('#boosterNextBtn').isHidden());
  await page.waitForSelector('.booster-angel-stage',{timeout:20000});
  assert(await page.evaluate(()=>{const a=$('.angel-origin').getBoundingClientRect(),c=$('#boosterCards .active .booster-flipper').getBoundingClientRect();return Math.abs(a.x-c.x-c.width/2)<1&&Math.abs(a.y-c.y-c.height/2)<1}),'Angel centred');
  await page.locator('.angel-skip').click();await page.waitForFunction(()=>boosterPresentation.seen===4&&!boosterPresentation.busy);assert(await page.locator('#boosterContinueBtn').isEnabled());
  await page.locator('#boosterStepDots button').first().click();assert.equal(await page.locator('#boosterCards .active .catalog-number').textContent(),'#005');
  await seed('p150');await page.locator('#boosterPack').click();await page.waitForFunction(()=>boosterPresentation.seen===0&&!boosterPresentation.busy);await page.locator('#boosterSkipAll').click();await page.waitForFunction(()=>boosterPresentation.seen===4&&!boosterPresentation.busy);
  assert(await page.evaluate(async()=>{const im=new Image();im.src=catalogById('p150').image.src;await im.decode();return im.naturalWidth>100}));
  const ids=await page.evaluate(()=>pendingBooster.map(p=>p.card.id));await page.reload();await page.evaluate(()=>{$('#startupScreen').classList.add('hidden');showBooster('shop')});assert.deepEqual(await page.evaluate(()=>pendingBooster.map(p=>p.card.id)),ids);
  for(const [width,height] of [[320,568],[390,667],[844,390]]){
   await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{showBooster('shop');openBoosterPack()});await page.waitForFunction(()=>boosterPresentation.seen===0&&!boosterPresentation.busy);
   await page.screenshot({path:`/tmp/booster-${width}.png`});
   const check=async()=>{const d=await page.locator('#boosterReveal').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,sh:e.scrollHeight}));assert(d.sw<=d.w+1,'Horizontal overflow '+JSON.stringify(d));assert(d.sh<=d.h+1,'Vertical overflow '+JSON.stringify(d))};
   await check();await page.locator('#boosterSkipAll').click();await page.waitForFunction(()=>boosterPresentation.seen===4&&!boosterPresentation.busy);await check();assert(await page.locator('#boosterContinueBtn').isEnabled());
  }
  assert.deepEqual(errors,[]);console.log('PASS: sequential flips, centred angel, zoom, revisit, skip, card 94 decode, saved pack and small/landscape screens.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
