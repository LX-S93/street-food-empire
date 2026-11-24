const G=require('./core.js');
const S=G.newGame();G.S=S;S.intro=false;G.migrate();S.cash=50000;
const l=S.locs[0];l.tier=2;S.maxTier=2;l.area=7;l.mach={bar:1,herd:1};
for(const P of G.PRODS)if(P.t<=2&&!l.menu[P.id])l.menu[P.id]={on:true,price:P.v,q:1,p:1};
for(const r of ['cook','cook','serv'])l.team.push({id:S.nextE++,name:'Fest '+r,role:r,sk:1,tr:'',pay:G.wage(l,r),rar:0,day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0,mood:70});
l.want={cook:2,serv:1};l.stock=1100;l.stockVal=1100;l.auto=true;
// Sync über Funktion im Modul nicht exportiert: Personal neu zählen
l.staff={cook:2,help:0,serv:1,bar:0,lead:0};
S.cev=[{id:1,type:'fussball',area:7,start:S.day+6,end:S.day+6}];S.nextEv=1;S.sel=l.id;
G.ACT.tSearch({ev:1,r:'bar'});G.ACT.tSearch({ev:1,r:'cook'});
const day=()=>{S.card=null;S.tester=null;S.comps=[];l.ord=90;for(let i=0;i<120;i++)G.step(0.5,false);};
for(let d=0;d<4;d++)day();
console.log('Bewerbungen nach 4 Tagen:',l.tapps.length,l.tapps.map(a=>a.role+':'+a.rate+'€').join(', '));
const bar=l.tapps.find(a=>a.role==='bar'),cook=l.tapps.find(a=>a.role==='cook');
const c0=S.cash;G.ACT.tBook({id:bar.id});G.ACT.tBook({id:cook.id});console.log('gebucht, Kosten',Math.round(c0-S.cash),'Staff',JSON.stringify(l.staff));
while(S.day<S.cev[0].start){day();}
const c=G.calcX(l);console.log('Ereignistag',S.day,'Team',l.team.map(e=>e.name+(e.tempUntil?'(Aushilfe)':'')).join(', '),'staff',JSON.stringify(l.staff),'Kapazität',Math.round(c.cap),'Nachfrage',Math.round(c.demand));
day();day();
console.log('danach Tag',S.day,'Team',l.team.length,'Angebote',JSON.stringify((l.toffers||[]).map(o=>[o.name,o.role,o.pay])),'Log:',S.log.slice(0,4).map(x=>x.m).join(' | '));
if(l.toffers&&l.toffers.length){G.ACT.tTake({id:l.toffers[0].id});console.log('übernommen, Team',l.team.map(e=>e.name).join(', '),'staff',JSON.stringify(l.staff));}
