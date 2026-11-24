const G=require('./core.js');
let S=G.newGame();G.S=S;S.intro=false;G.migrate();
S=G.S;
// Mittelgroße Firma: 3 Betriebe
const mk=(loc,r,sk)=>loc.team.push({id:S.nextE++,name:'Test '+S.nextE,role:r,sk:sk||1,tr:'',pay:G.wage(loc,r),day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0,mood:70});
function setupLoc(loc,tier){loc.tier=tier;S.maxTier=Math.max(S.maxTier,tier);const T=G.TIERS[tier];
  for(const P of G.PRODS)if(P.t<=tier&&!loc.menu[P.id])loc.menu[P.id]={on:true,price:1,q:1,p:1};
  loc.qual=T.maxQ;for(const r of ['cook','help','serv','bar','lead'])for(let i=0;i<T[r];i++)mk(loc,r);
  for(const r of ['cook','help','serv','bar','lead'])loc.staff[r]=T[r];loc.want=Object.assign({},loc.staff);
  for(const M of G.MACH)if(M.t<=tier)loc.mach[M.id]=tier+1;
  for(const P of G.PRODS){const m=loc.menu[P.id];if(!m)continue;m.q=Math.min(loc.qual,T.exp+1);if(!P.drink&&P.t<tier-1)m.on=false;}
  loc.auto=true;loc.autoHire=true;loc.stock=T.store;loc.stockVal=T.store;loc.rep=55;
  const c=G.calcX(loc);for(const id in c.all){const x=c.all[id];x.m.price=+(x.V).toFixed(2);}}
setupLoc(S.locs[0],2);
const l2=G.newLoc(S.nextId++,1,3);S.locs.push(l2);setupLoc(l2,3);
const l3=G.newLoc(S.nextId++,2,1);S.locs.push(l3);setupLoc(l3,1);
S.hq=1;S.cash=30000;
const stats={cards:{},tester:0,comps:new Set(),cev:{},quests:0,questsDone:0,wx:{},popups:0,asks:0,poach:0,errors:0};
let lastLog=0;
for(let d=1;d<=150;d++){
  // Spieler-Verhalten: Ordnung halten, Karten zufällig beantworten, Forderungen annehmen
  if(!process.env.PASSIVE)for(const l of S.locs){l.ord=Math.max(l.ord,80);}
  if(process.env.PASSIVE){for(const l of S.locs)l.ord=Math.max(l.ord,0);}
  if(S.card&&!process.env.PASSIVE){stats.cards[S.card.k]=(stats.cards[S.card.k]||0)+1;const V=G.CARDS[S.card.k].v(S.card,S.locs.find(x=>x.id===S.card.loc));G.ACT.cardOpt({i:Math.floor(Math.random()*V.o.length)});}
  if(!process.env.PASSIVE)for(const l of S.locs)for(const e of l.team){if(e.ask){stats.asks++;S.sel=l.id;G.ACT.askYes({id:e.id});}if(e.poach){stats.poach++;S.sel=l.id;G.ACT.poachYes({id:e.id});}}
  // Pop-up buchen, wenn möglich
  if(!process.env.PASSIVE)for(const ev of S.cev){if(!S.locs.some(l=>l.area===ev.area)&&S.day===ev.start-1){S.sel=S.locs[0].id;G.ACT.popup({ev:ev.id});const p=S.locs[S.locs.length-1];if(p.popup){stats.popups++;G.ACT.buy({f:1});}}}
  if(S.tester)stats.tester+=0;
  stats.wx[S.wx.w]=(stats.wx[S.wx.w]||0)+1;
  (S.comps||[]).forEach(c=>stats.comps.add(c.n));
  (S.cev||[]).forEach(e=>stats.cev[e.type+'@'+e.id]=1);
  try{for(let i=0;i<120;i++){G.step(0.5,false);}}catch(err){stats.errors++;console.log('ERR day',d,err.stack.split('\n').slice(0,3).join(' | '));break;}
  for(const q of S.quests||[])if(q.done)stats.questsDone+=0;
  if(d>=40&&d%5===0){const b=S.locs[1],c=G.calcX(b);console.log('  BISTRO d'+S.day,'rep',Math.round(b.rep),'ord',Math.round(b.ord),'reg',Math.round(b.reg),'staff',JSON.stringify(b.staff),'want',JSON.stringify(b.want),'moods',b.team.map(e=>Math.round(e.mood)).join(','),'sk',b.team.map(e=>e.sk.toFixed(1)).join(','),'dem',Math.round(c.demand),'cap',Math.round(c.cap),'neck',c.neck,'sT',Math.round(c.sTarget),'compF',c.compF.toFixed(2),'wx',S.wx.w,'stock',Math.round(b.stock),'apps',b.apps.length,'ad',!!b.ad,'cash',Math.round(S.cash));}
  if(d>=60&&d%6===0&&false){const ld=S.lastDay;console.log('D'+S.day,'total',Math.round(ld.total),'admin',Math.round(ld.admin),'hq',ld.hq,'int',Math.round(ld.interest),'dispo',Math.round(ld.dispo),'loan',S.loan,S.locs.map(l=>l.last?`${G.AREAS[l.area].n}: rev${Math.round(l.last.rev)} cogs${Math.round(l.last.cogs)} w${Math.round(l.last.wages)} r${Math.round(l.last.rent)} oth${Math.round(l.last.other)} th${Math.round(l.last.theft)} prov${Math.round(l.last.prov)} res${Math.round(l.last.res)} srv${Math.round(l.last.served)} lost${Math.round(l.last.lost)}`:'').join(' || '));}
  if(d%25===0){const L=S.locs.map(l=>`${l.popup?'POP':G.TIERS[l.tier].n}@${G.AREAS[l.area].n} rep${Math.round(l.rep)} reg${Math.round(l.reg)} st${l.stars} res${l.last?Math.round(l.last.res):'-'}`).join(' | ');
    console.log(`Tag ${S.day} Saison ${['F','S','H','W'][Math.floor((S.day-1)/15)%4]} Wetter ${S.wx.w} Kasse ${Math.round(S.cash)} Comps ${S.comps.map(c=>c.n+'@'+G.AREAS[c.area].n+' hp'+Math.round(c.hp)).join(',')}\n   ${L}`);}
}
const logs=S.log.map(l=>l.m);
console.log('Wetterverteilung',JSON.stringify(stats.wx));
console.log('Karten',JSON.stringify(stats.cards),'Gehaltsforderungen',stats.asks,'Abwerbungen',stats.poach,'Pop-ups',stats.popups,'Stadtereignisse',Object.keys(stats.cev).length,'Konkurrenten',[...stats.comps].join(', '));
console.log('Letzte Logs:\n  '+logs.slice(0,25).join('\n  '));
console.log('Aufträge heute',JSON.stringify(S.quests.map(q=>[q.k,q.n,q.rew,q.done,q.fail])),'Serie',S.qStreak);
console.log('Problems l0',G.problems(S.locs[0]).map(p=>p.t).join(' | '));
console.log('coProblems',G.coProblems().map(p=>p.t).join(' | '));
console.log('meta',JSON.stringify(S.meta));
