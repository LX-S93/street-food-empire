const G=require('./core.js');
function run(mode){
  const S=G.newGame();G.S=S;S.intro=false;G.migrate();S.cash=1e7;
  const l=S.locs[0];l.tier=2;S.maxTier=2;l.qual=2;l.combos=[];
  for(const P of G.PRODS)if(P.t<=2&&!l.menu[P.id])l.menu[P.id]={on:true,price:1,q:1,p:1};
  for(const r of ['cook','cook','cook','help','serv','lead'])l.team.push({id:S.nextE++,name:'x',role:r,sk:1,tr:'',pay:G.wage(l,r),rar:0,day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0,mood:70});
  for(const r of ['cook','help','serv','lead'])l.staff[r]=l.team.filter(e=>e.role===r).length;l.want=Object.assign({},l.staff);
  l.mach={herd:2,kuehl:2,bar:1,kasse:1};l.auto=true;l.stock=2000;l.stockVal=2000;l.rep=55;G.migrate();
  const c0=G.calcX(l);for(const id in c0.all){c0.all[id].m.price=+(c0.all[id].V).toFixed(1);}
  const mk=(main,f)=>{const a=G.calcX(l).all;const sum=a[main].m.price+a.pommes.m.price+a.soft.m.price;l.combos.push({id:l.nextCb++,main,side:'pommes',drink:'soft',price:+(sum*f).toFixed(1),on:true});};
  if(mode!=='keine'){const f={'-12 %':0.88,'-25 %':0.75,'±0 %':1.0}[mode];mk('burger',f);mk('schnitzel',f);mk('wurst',f);}
  let cash0;for(let d=0;d<30;d++){S.card=null;S.tester=null;S.cev=[];S.comps=[];S.wx={w:'wolken',fc:['wolken','wolken'],temp:12};l.ord=90;l.broken={};for(let i=0;i<120;i++)G.step(0.5,false);if(d===14)cash0=S.cash;}
  const c=G.calcX(l);const b=c.all.burger;
  return mode.padEnd(7)+' Gewinn/Tag '+String(Math.round((S.cash-cash0)/15)).padStart(5)+' Ø Bon '+c.price.toFixed(2)+' Gäste '+Math.round(l.last.served)+' Kapazität '+Math.round(c.cap)+' Nachfrage '+Math.round(c.demand)+' Ruf '+Math.round(l.rep)+(b.cs&&b.cs.length?' Burger-Menü-Quote '+Math.round(b.cs[0].eff*100)+'% gestern '+JSON.stringify(Object.values(l.csLast||{}).map(Math.round)):'');
}
for(const m of ['keine','±0 %','-12 %','-25 %'])console.log(run(m));
