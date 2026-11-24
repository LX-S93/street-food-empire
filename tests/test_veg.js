const G=require('./core.js');
function run(area,mode){
  const S=G.newGame();G.S=S;S.intro=false;G.migrate();S.cash=1e7;S.comps=[];S.cev=[];
  const l=S.locs[0];l.area=area;l.tier=2;S.maxTier=2;l.qual=3;
  for(const P of G.PRODS)if(P.t<=2&&!l.menu[P.id])l.menu[P.id]={on:true,price:1,q:1,p:1};
  for(const r of ['cook','cook','cook','help','serv','lead'])l.team.push({id:S.nextE++,name:'x',role:r,sk:1,tr:'',pay:G.wage(l,r),day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0,mood:70});
  for(const r of ['cook','help','serv','lead'])l.staff[r]=l.team.filter(e=>e.role===r).length;l.want=Object.assign({},l.staff);
  l.mach={herd:2,kuehl:2,bar:1,kasse:1};l.auto=true;l.stock=2000;l.stockVal=2000;l.rep=60;
  for(const id in l.menu){const P=G.PRODS.find(p=>p.id===id);const m=l.menu[id];m.q=2;
    if(P.diet&&!P.side){m.on=mode!=='none';if(mode==='q1')m.q=1;if(mode==='q3')m.q=3;}}
  const c0=G.calcX(l);for(const id in c0.all){c0.all[id].m.price=+(c0.all[id].V).toFixed(1);}
  let cash0,res=[];
  for(let d=0;d<30;d++){S.wx={w:'wolken',fc:['wolken','wolken'],temp:12};S.card=null;S.tester=null;l.ord=90;l.broken={};
    for(let i=0;i<120;i++)G.step(0.5,false);if(d===14)cash0=S.cash;}
  const c=G.calcX(l);
  return `${G.AREAS[area].n.padEnd(12)} ${mode.padEnd(5)} Gewinn/Tag ${String(Math.round((S.cash-cash0)/15)).padStart(5)} Nachfrage ${Math.round(c.demand)} Ruf ${Math.round(l.rep)} Stamm ${Math.round(l.reg)} Segmente ${c.segs.map(s=>s.k+':w'+(s.w*100).toFixed(0)+' opt'+s.opt+' sat'+s.sat.toFixed(0)+' anteil'+(s.share*100).toFixed(0)).join(' | ')}`;
}
for(const area of [2,4])for(const mode of ['none','q1','q2','q3'])console.log(run(area,mode));
