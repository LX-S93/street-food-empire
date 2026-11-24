const G=require('./core.js');
function setup(tier){
  const S=G.newGame(); G.S=S; S.cash=1e9; S.intro=false;
  const loc=S.locs[0]; loc.tier=tier; S.maxTier=tier; const T=G.TIERS[tier];
  for(const P of G.PRODS) if(P.t<=tier&&!loc.menu[P.id]) loc.menu[P.id]={on:true,price:1,q:1,p:1};
  loc.qual=T.maxQ;
  for(const r of ['cook','help','serv','bar','lead']) for(let i=0;i<T[r];i++) loc.team.push({id:S.nextE++,name:'x',role:r,sk:1,tr:'',pay:G.wage(loc,r),day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0});
  for(const r of ['cook','help','serv','bar','lead']) loc.staff[r]=T[r]; loc.want=Object.assign({},loc.staff);
  for(const M of G.MACH) if(M.t<=tier) loc.mach[M.id]=tier+1;
  for(const P of G.PRODS){const m=loc.menu[P.id]; if(!m)continue; m.q=Math.min(loc.qual,T.exp+1); if(!P.drink&&P.t<tier-1) m.on=false;}
  loc.auto=true; loc.stock=T.store; loc.stockVal=T.store; loc.rep=50;
  const c=G.calc(loc); for(const id in c.all){const x=c.all[id]; x.m.price=+(x.V).toFixed(2);}
  return {S,loc};
}
function day(S,loc){loc.ord=Math.max(loc.ord,85);loc.broken={};loc.team.forEach(e=>{e.leaveDay=0;e.sickUntil=0;});const c0=S.cash;for(let i=0;i<120;i++)G.step(0.5,false);return S.cash-c0;}
for(const tier of [0,2,3]){
  const {S,loc}=setup(tier);
  let out=[];
  for(let d=1;d<=90;d++){
    if(d===31)loc.mkt=2; if(d===46)loc.mkt=0;
    if(d===61){for(const id in loc.menu){loc.menu[id].price=+(loc.menu[id].price*1.2).toFixed(2);}}
    if(d===76){for(const id in loc.menu){loc.menu[id].price=+(loc.menu[id].price/1.2).toFixed(2);}}
    if(tier===0&&loc.stock<80)G.ACT.buy({f:1});
    const pr=day(S,loc); const c=G.calc(loc);
    if([10,20,30,35,40,45,50,55,60,61,62,63,65,70,75,80,90].includes(d))out.push(`d${d}: reg ${Math.round(loc.reg)} (+${loc.regLog.gain.toFixed(1)}/-${loc.regLog.lost.toFixed(1)}) walk ${Math.round(c.walk)} regD ${Math.round(c.regD)} cap ${Math.round(c.cap)} rep ${Math.round(loc.rep)} s ${Math.round(c.sTarget)} profit ${Math.round(pr)}`);
  }
  console.log('--- '+G.TIERS[tier].n+'\n'+out.join('\n'));
}
