/* Pantheon strategy: simulate the same captures as live play, then consider replies. */
function choosePantheonMove(){
 const empty=board.filter(x=>!x).length,exact=empty<=4;
 const visible=currentRuleKey.endsWith('-open')&&!blindHands.p;
 const samples=visible?[hands.p]:Array.from({length:3},()=>randomLegalHand().slice(0,hands.p.length));
 const depth=exact?empty:3;
 const evaluate=grid=>{
  let score=0;
  for(let i=0;i<9;i++)if(grid[i]){
   const sign=grid[i].owner==='a'?1:-1;score+=sign*100;
   if(!grid.every(Boolean))for(const n of neighbors(i))if(!grid[n.pos])score+=sign*combatValue(grid[i].card.v[n.side])*.6;
  }
  return score;
 };
 function moves(grid,cards,owner){
  const result=[],seen=new Set();
  cards.forEach((card,ci)=>{
   const key=card.v.join(',')+'|'+card.element;
   if(seen.has(key))return;seen.add(key);
   grid.forEach((slot,bi)=>{if(slot)return;
    const next=grid.map(x=>x?{card:x.card,owner:x.owner}:null);
    next[bi]={card,owner};capture(bi,owner,next,currentRuleKey);
    result.push({ci,bi,grid:next,value:evaluate(next)});
   });
  });
  return result.sort((a,b)=>owner==='a'?b.value-a.value:a.value-b.value);
 }
 function search(grid,ai,player,owner,left,alpha,beta){
  if(!left||grid.every(Boolean))return evaluate(grid);
  const cards=owner==='a'?ai:player;
  if(!cards.length)return evaluate(grid);
  const choices=moves(grid,cards,owner),limit=exact?choices.length:Math.min(8,choices.length);
  let best=owner==='a'?-Infinity:Infinity;
  for(let i=0;i<limit;i++){
   const move=choices[i],remaining=cards.filter((_,j)=>j!==move.ci);
   const value=search(move.grid,owner==='a'?remaining:ai,owner==='p'?remaining:player,owner==='a'?'p':'a',left-1,alpha,beta);
   if(owner==='a'){best=Math.max(best,value);alpha=Math.max(alpha,best)}else{best=Math.min(best,value);beta=Math.min(beta,best)}
   if(beta<=alpha)break;
  }
  return best;
 }
 let best=null,bestValue=-Infinity;
 for(const move of moves(board,hands.a,'a')){
  const remaining=hands.a.filter((_,i)=>i!==move.ci);
  const value=samples.reduce((sum,player)=>sum+search(move.grid,remaining,player,'p',depth-1,-Infinity,Infinity),0)/samples.length;
  if(value>bestValue){bestValue=value;best=move}
 }
 return best;
}
