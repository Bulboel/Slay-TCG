// Run from repository root. Requires playwright; optional CHROMIUM_EXECUTABLE_PATH.
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 const server=http.createServer((q,r)=>{let f=path.join(process.cwd(),decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';r.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','webp':'image/webp','png':'image/png'})[f.split('.').pop()]||'application/octet-stream');fs.createReadStream(f).on('error',()=>{r.statusCode=404;r.end()}).pipe(r)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const opts={headless:true};if(process.env.CHROMIUM_EXECUTABLE_PATH){opts.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;opts.args=require('@sparticuz/chromium').default.args}
 const browser=await chromium.launch(opts);
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(()=>{$('#startupScreen').classList.add('hidden');$('#menuScreen').classList.add('hidden');$('#gameApp').classList.remove('hidden');gameType='local';turn='p';locked=false;hands={p:pool.slice(0,5).map(cloneCard),a:pool.slice(5,10).map(cloneCard)};board=Array(9).fill(null);render()});
 for(const [width,height] of [[1440,900],[1920,1080],[1366,768],[1024,650]]){
  await page.setViewportSize({width,height});
  const before=await page.locator('#board').boundingBox();
  for(const n of [0,4,8]){
   await page.evaluate(n=>{hands={p:pool.slice(0,5-Math.floor(n/2)).map(cloneCard),a:pool.slice(5,10-Math.ceil(n/2)).map(cloneCard)};board=Array.from({length:9},(_,i)=>i<n?{card:cloneCard(pool[i]),owner:i%2?'a':'p'}:null);moveHistory=Array.from({length:20},()=>({owner:'p',title:'Une carte est posée.',lines:['Un récit de capture qui peut occuper plusieurs lignes sans déplacer le plateau.']}));render()},n);
   const after=await page.locator('#board').boundingBox();assert.deepEqual(after,before,'Board must stay still');
   for(const sel of ['#board','.side.player','.side.ai','.history-panel','.message']){const r=await page.locator(sel).boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,sel+' fits '+width+'x'+height+JSON.stringify(r))}
  }
  await page.screenshot({path:'/tmp/duel-'+width+'.png'});
 }
 await page.evaluate(()=>{const c=cloneCard(pool[0]);c.v=c.v.map(v=>Math.min(10,v+1));board[0]={card:c,owner:'p'};render()});assert.equal(await page.locator('#board .changed-stats').count(),1);assert.equal(await page.locator('#board .stat-up').count(),4);
 await page.evaluate(()=>{collection.boosterProgress={};collection.pendingPack={context:'shop',pulls:['p04','p27','p23','p29','p15'].map((id,i)=>({id,foil:i===4,slot:'Test'}))};showBooster('shop');window.testBursts=[];const original=burstRareStars;burstRareStars=pull=>{testBursts.push(boosterPresentation.index);original(pull)}});
 await page.screenshot({path:'/tmp/new-pack.png'});await page.locator('#boosterPack').click();await page.waitForFunction(()=>boosterPresentation.seen===0&&!boosterPresentation.busy);await page.locator('#boosterSkipAll').click();await page.waitForFunction(()=>boosterPresentation.seen===4&&!boosterPresentation.busy);assert.deepEqual(await page.evaluate(()=>testBursts),[3,4]);assert.deepEqual(errors,[]);
 console.log('PASS: stable desktop at four sizes and three match stages; modified stats; rare stars in slots 4 and 5 after reveal all.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
