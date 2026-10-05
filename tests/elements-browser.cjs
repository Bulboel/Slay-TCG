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
 await page.evaluate(()=>{$('#startupScreen').classList.add('hidden');openPanel('#optionsScreen')});
 assert.equal(await page.locator('.element-choice svg').count(),6);
 await page.locator('.element-options').screenshot({path:'/tmp/element-seals.png'});
 await page.locator('[data-element="fire"]').tap();assert.equal(await page.locator('[data-element="fire"]').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>{document.querySelectorAll('.panel-screen').forEach(e=>e.classList.add('hidden'));$('#menuScreen').classList.add('hidden');$('#gameApp').classList.remove('hidden');newGame('quick');turn='p';locked=false;memoryDraws={p:2,a:1};render()});
 assert.equal(await page.locator('#pMemoryOrbs .memory-orb:not(.empty)').count(),2);assert.equal(await page.locator('#aMemoryOrbs .memory-orb.empty').count(),1);
 assert.equal(await page.locator('#pMemoryOrbs').evaluate(e=>e.style.getPropertyValue('--crystal-color')),await page.evaluate(()=>elements.fire.color));
 assert.equal(await page.locator('#pMemoryOrbs svg').first().evaluate(e=>getComputedStyle(e).animationName),'crystalRock');
 await page.screenshot({path:'/tmp/crystals-mobile.png'});
 await page.evaluate(()=>{memoryDraws.p=1;renderMemory()});assert.equal(await page.locator('#pMemoryOrbs .empty').count(),1);
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'/tmp/crystals-desktop.png'});
 assert(await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.side.player')).zIndex)>Number(getComputedStyle(document.querySelector('.arena')).zIndex)));
 await page.evaluate(()=>{document.querySelector('#cardZoom').classList.remove('hidden')});
 const centered=await page.locator('#cardZoomClose').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('svg').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<1&&Math.abs(a.y+a.height/2-b.y-b.height/2)<1});assert(centered);
 await page.locator('#cardZoomClose').click();assert(await page.locator('#cardZoom').evaluate(e=>e.classList.contains('hidden')));
 await page.evaluate(()=>{memoryBlocked.p=true;renderMemory()});assert.equal(await page.locator('#pMemoryOrbs .empty').count(),2);assert((await page.locator('#pMemoryOrbs').getAttribute('aria-label')).startsWith('0 pioche'));
 assert.deepEqual(errors,[]);console.log('PASS: six matching element glyphs, selection, crystal availability and blocked draws.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
