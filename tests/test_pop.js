const G=require('./core.js');
const S=G.newGame();G.S=S;S.intro=false;G.migrate();S.cash=50000;
const l=S.locs[0];l.tier=2;S.maxTier=2;l.area=7;l.qual=3;
for(const P of G.PRODS)if(P.t<=2&&!l.menu[P.id])l.menu[P.id]={on:true,price:P.v*1.4,q:3,p:1.2};
for(const r of ['cook','cook','serv'])l.team.push({id:S.nextE++,name:'Fest '+r,role:r,sk:1,tr:'',pay:G.wage(l,r),rar:0,day:-9,trKnown:true,sickUntil:0,absent:false,leaveDay:0,mood:70});
l.staff={cook:2,help:0,serv:1,bar:0,lead:0};l.stock=1100;l.stockVal=1100;l.auto=true;S.sel=l.id;
l.dev={}; S.recipes={pommes:1};
S.cev=[{id:1,type:'fussball',area:7,start:S.day+6,end:S.day+6},{id:2,type:'fussball',area:3,start:S.day+2,end:S.day+3}];
G.ACT.tSearch({ev:1,r:'cook'});
const day=()=>{S.card=null;S.tester=null;S.comps=[];for(const x of S.locs)x.ord=90;for(let i=0;i<120;i++)G.step(0.5,false);};
// Mehrere Anzeigen
S.sel=l.id;G.ACT.ad();G.ACT.ad();require('./core.js');
console.log('Anzeigen', l.ads.length);
G.ACT.popup({ev:2});const pl=S.locs.find(x=>x.popup);
console.log('Pop-up Qualität',pl.qual,'Preis übernommen',Object.keys(pl.menu).filter(k=>l.menu[k]&&pl.menu[k].price===l.menu[k].price).length,'/',Object.keys(pl.menu).length,'Rezept pommes', G.calc(pl)&&true);
S.sel=pl.id;G.ACT.buy({f:1});
for(let d=0;d<3;d++){day();for(const a of (l.tapps||[]))if(!a.booked&&a.role==='cook'){S.sel=l.id;G.ACT.tBook({id:a.id});break;}}
console.log('Pop-up weg', !S.locs.some(x=>x.popup), 'Berichte', (S.reports||[]).map(r=>r.title+' '+Math.round(r.total)+' '+JSON.stringify(r.rows.map(x=>[x[1],Math.round(x[2])]))));
S.reports=[];
for(let d=0;d<5;d++)day();
console.log('Ereignis', (S.reports||[]).map(r=>r.title+' '+r.sub+' '+Math.round(r.total)+' '+JSON.stringify(r.rows.map(x=>[x[1],Math.round(x[2])]))));
console.log('Bewerbungen', l.apps.length);
