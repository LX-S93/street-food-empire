const G=require('./core.js');
function run(mode){
  const S=G.newGame();G.S=S;S.intro=false;G.migrate();S.cash=1e7;S.comps=[];
  const l=S.locs[0];l.tier=1;S.maxTier=1;
  for(const P of G.PRODS)if(P.t<=1&&!l.menu[P.id])l.menu[P.id]={on:true,price:1,q:1,p:1};
  for(const r of ['cook','cook','help'])l.team.push({id:S.nextE++,name:'x',role:r,sk:1,tr:'',pay:G.wage(l,r),rar:0,day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0,mood:70});
  l.staff.cook=2;l.staff.help=1;l.want=Object.assign({},l.staff);l.mach={herd:2,kuehl:2};l.auto=true;l.stock=400;l.stockVal=400;l.rep=55;
  G.migrate();
  const c0=G.calcX(l);for(const id in c0.all){c0.all[id].m.price=+(c0.all[id].V).toFixed(1);}
  for(const id in l.menu){const m=l.menu[id];for(const k in (m.x||{})){if(mode==='aus')m.x[k].on=false;if(mode==='teuer')m.x[k].price=+(m.x[k].price*3).toFixed(1);if(mode==='billig')m.x[k].price=+(m.x[k].price*0.5).toFixed(1);}}
  let cash0;for(let d=0;d<30;d++){S.card=null;S.tester=null;S.cev=[];S.comps=[];S.wx={w:'wolken',fc:['wolken','wolken'],temp:12};l.ord=90;l.broken={};for(let i=0;i<120;i++)G.step(0.5,false);if(d===14)cash0=S.cash;}
  const c=G.calcX(l),f=c.all.pommes;
  return mode.padEnd(7)+' Gewinn/Tag '+String(Math.round((S.cash-cash0)/15)).padStart(5)+' Ø Bon '+c.price.toFixed(2)+' Ruf '+Math.round(l.rep)+' Pommes-Extras: '+f.xs.map(e=>e.x.n+' '+e.o.price.toFixed(2)+'€ '+Math.round(e.take*100)+'%').join(', ')+' | gestern '+JSON.stringify(Object.fromEntries(Object.entries(l.xsLast||{}).slice(0,4).map(([k,v])=>[k,Math.round(v)])));
}
for(const m of ['aus','normal','billig','teuer'])console.log(run(m));
