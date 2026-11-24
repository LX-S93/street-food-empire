const G=require('./core.js');
function setup(tier,opts={}){
  const S=G.newGame(); G.S=S; S.cash=1e9; S.intro=false;
  const loc=S.locs[0]; loc.tier=tier; S.maxTier=tier;
  const T=G.TIERS[tier];
  for(const P of G.PRODS) if(P.t<=tier&&!loc.menu[P.id]) loc.menu[P.id]={on:true,price:1,q:1,p:1};
  loc.qual=opts.q||T.maxQ;
  for(const r of ['cook','help','serv','bar','lead']) for(let i=0;i<T[r];i++) loc.team.push({id:S.nextE++,name:'x',role:r,sk:opts.sk||1,tr:'',pay:G.wage(loc,r),day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0});
  for(const r of ['cook','help','serv','bar','lead']) loc.staff[r]=T[r]; loc.want=Object.assign({},loc.staff);
  for(const M of G.MACH) if(M.t<=tier) loc.mach[M.id]=opts.m!=null?Math.min(opts.m,tier+1):tier+1;
  // keep only top-tier foods (>= tier-1)
  for(const P of G.PRODS){const m=loc.menu[P.id]; if(!m)continue; m.q=loc.qual; if(!P.drink&&P.t<tier-1) m.on=false;}
  loc.auto=true; loc.autoHire=true; loc.stock=T.store; loc.stockVal=T.store; loc.rep=50;
  return {S,loc};
}
function fair(loc,k=1){ const c=G.calc(loc); for(const id in c.all){const x=c.all[id]; x.m.price=+(x.V/k).toFixed(2);} }
for(let tier=0;tier<6;tier++){
  const {S,loc}=setup(tier);
  let c0=S.cash;
  for(let d=0;d<60;d++){ fair(loc,1); if(tier==0&&loc.stock<60)G.ACT.buy({f:1}); loc.ord=Math.max(loc.ord,85); loc.broken={}; if(tier<2)loc.team.forEach(e=>e.leaveDay=0); for(let i=0;i<120;i++)G.step(0.5,false); if(d==39)c0=S.cash; }
  const c=G.calc(loc);
  console.log(G.TIERS[tier].n.padEnd(20),'profit/day',Math.round((S.cash-c0)/20),'rep',loc.rep.toFixed(0),'dem',c.demand.toFixed(0),'cap',c.cap.toFixed(0),'prodCap',c.prodCap.toFixed(0),'price',c.price.toFixed(2),'ek',c.ek.toFixed(2),'fix',Math.round(c.fix),'served',Math.round(loc.last.served),'lost',Math.round(loc.last.lost),'next cost',G.TIERS[Math.min(5,tier+1)].cost);
}
// start state: nothing but owner
{const S=G.newGame();G.S=S;const loc=S.locs[0];let c0=S.cash;
 for(let d=0;d<15;d++){ if(loc.stock<40){G.ACT.buy({f:1});} loc.ord=Math.max(loc.ord,80); for(let i=0;i<120;i++)G.step(0.5,false);}
 console.log('start 15 days cash',Math.round(S.cash),'rep',loc.rep.toFixed(0),'stockVal',Math.round(loc.stockVal),'last',JSON.stringify(loc.last,(k,v)=>typeof v==='number'?Math.round(v):v));}
// neglect: 6 restaurants, no HQ, leads, never checked, 40 days
{const {S,loc}=setup(4); S.cash=50000;
 for(let i=1;i<6;i++){const l=JSON.parse(JSON.stringify(loc)); l.id=i+1; l.area=i; S.locs.push(l);} S.nextId=7;
 const c0=S.cash; S.locs.forEach(l=>fair(l,1));
 for(let d=0;d<40;d++){for(let i=0;i<120;i++){G.step(0.5,false); if(S.bankrupt)break;} if(S.bankrupt){console.log('bankrupt day',d);break;}}
 console.log('6 Restaurants vernachlässigt 40 Tage: cash delta',Math.round(S.cash-c0),'ord',S.locs.map(l=>Math.round(l.ord)).join(','),'rep',S.locs.map(l=>Math.round(l.rep)).join(','),'last res',S.locs.map(l=>Math.round(l.last.res)).join(','));
 // same but 2 restaurants
 const t=setup(4); t.S.cash=50000; const l2=JSON.parse(JSON.stringify(t.loc)); l2.id=2;l2.area=1;t.S.locs.push(l2); t.S.locs.forEach(l=>fair(l,1));
 for(let d=0;d<40;d++)for(let i=0;i<120;i++)G.step(0.5,false);
 console.log('2 Restaurants vernachlässigt 40 Tage: cash delta',Math.round(t.S.cash-50000),'ord',t.S.locs.map(l=>Math.round(l.ord)).join(','),'last res',t.S.locs.map(l=>Math.round(l.last.res)).join(','));
 const r=G.away(3600*8); console.log('away 8h',JSON.stringify(r,(k,v)=>typeof v==='number'?Math.round(v):v));
}

// ---- Bewerber-Statistik
{const {S,loc}=setup(3); const N=4000; const apps=[]; for(let i=0;i<N;i++)apps.push(G.genApp(loc,'cook',false));
 const cls=a=>a.sk<0.45?'fake':a.sk<0.85?'schwach':a.sk<1.1?'solide':a.sk<1.3?'stark':'top';
 const by={}; apps.forEach(a=>{const c=cls(a);(by[c]=by[c]||[]).push(a);});
 for(const c of ['fake','schwach','solide','stark','top']){const L=by[c];const avg=f=>(L.reduce((s,a)=>s+f(a),0)/L.length).toFixed(2);
   console.log(c.padEnd(8),'n',String(L.length).padEnd(5),'score',avg(a=>G.appScore(a,1)),'zeugnis',avg(a=>a.zl<0?NaN:a.zl).replace('NaN','-'),'ohneZ',avg(a=>a.zl<0?1:0),'talk',avg(a=>a.talk),'pay',avg(a=>a.pay),'yrs',avg(a=>a.years));}
 // Wer nach Aktenlage den Besten aus 4 nimmt: was bekommt er?
 let res={};const T=3000;let bad=0,sum=0;for(let i=0;i<T;i++){const four=[0,1,2,3].map(()=>apps[Math.floor(Math.random()*N)]);four.sort((a,b)=>G.appScore(b,1)-G.appScore(a,1));const c=cls(four[0]);res[c]=(res[c]||0)+1;sum+=four[0].sk;if(four[0].tr==='dieb'||four[0].tr==='giftig')bad++;}
 console.log('Bester von 4 nach Aktenlage:',JSON.stringify(res),'Ø Können',(sum/T).toFixed(2),'schädlich %',(bad/T*100).toFixed(1));
 let r2={};sum=0;for(let i=0;i<T;i++){const a=apps[Math.floor(Math.random()*N)];r2[cls(a)]=(r2[cls(a)]||0)+1;sum+=a.sk;} console.log('Zufällig:',JSON.stringify(r2),'Ø',(sum/T).toFixed(2));
 console.log('Beispiel:',JSON.stringify(apps.slice(0,3).map(a=>({sk:+a.sk.toFixed(2),tr:a.tr,pay:a.pay,exp:a.exp,zl:a.zl,zh:a.zh,tk:a.tk,th:a.th})),null,0));
}
// ---- Effekt schlechter Belegschaft im Bistro
for(const sk of [0.35,0.7,1,1.3]){const {S,loc}=setup(3,{sk});let c0;for(let d=0;d<40;d++){fair(loc,1);loc.ord=Math.max(loc.ord,85);loc.broken={};loc.team.forEach(e=>e.sickUntil=0);for(let i=0;i<120;i++)G.step(0.5,false);if(d==19)c0=S.cash;}
 console.log('Bistro Können',sk,'Gewinn/Tag',Math.round((S.cash-c0)/20),'Ruf',loc.rep.toFixed(0),'Team',loc.team.length);}
{const {S,loc}=setup(3);loc.team[0].tr='dieb';loc.team[1].tr='giftig';let c0;for(let d=0;d<40;d++){fair(loc,1);loc.ord=Math.max(loc.ord,85);loc.broken={};for(let i=0;i<120;i++)G.step(0.5,false);if(d==19)c0=S.cash;}
 console.log('Bistro mit Dieb+Giftig Gewinn/Tag',Math.round((S.cash-c0)/20),'theft gestern',Math.round(loc.last.theft),'erkannt',loc.team.filter(e=>e.trKnown&&e.tr).length);}
