// @ts-nocheck
import { LANG, TR, LOCALE } from './i18n';
import { setHTML } from './ui/dom';
import { sfx, ring, initAudio, soundSettings, setSfx, setMusic } from './audio';
import { DAY, EXTRAS, SIDES, COMBO_MAX, QN, QV, QC, QW, QCOST, TIERS, PRODS, ROLES, MACH, VEGA, VEGAN_SHARE, DIETN, AREAS, HQS, REGV, WM, FN, LN, VENUES, POS, VAGUE, ZG, TALK, RAR, RAR_APP, RAR_HH, TRAIT, SEASONS, SEASON_LEN, WX, WXP, SEASON_DEM, SEASON_PRICE, PTAG, CITYEV, COMPN, SIGN, CONTR, PERKS, MKT } from './data';
// Game logic and UI. Being split into typed modules step by step.
'use strict';
/* ===================== Stammdaten ===================== */
// Extras: ek = Wareneinsatz, v = Wert für den Gast, t = Bestellquote bei fairem Preis, w = Zusatzarbeit, rel = relativ zum Gericht
// Menüs: Hauptgericht + Beilage + Getränk zum Bündelpreis
function comboName(cb){return ((typeof SHORT!=='undefined'&&SHORT[cb.main])||P_(cb.main).n)+TR('-Menü');}
function comboParts(cb){const a=[P_(cb.main).n];if(cb.side)a.push(SIDES[cb.side].n);if(cb.drink)a.push(P_(cb.drink).n);return a.join(' + ');}
function xFor(loc,P){return EXTRAS.filter(x=>x.p.includes(P.id)&&(!x.minT||loc.tier>=x.minT));}
function xName(x,P){return (x.names&&x.names[P.id])||x.n;}
function xBase(x,P){return x.rel?{ek:P.ek*x.rel[0],v:P.v*x.rel[1]}:{ek:x.ek,v:x.v};}
function xStep(price){return price<3?0.1:price<15?0.5:1;}
function xDef(loc,P,x){const b=xBase(x,P),v=b.v*(1+0.04*loc.tier)*AREAS[loc.area].pay,st=xStep(v);return +Math.max(0.1,Math.round(v/st)*st).toFixed(2);}
function addExtras(loc){for(const id in loc.menu){const P=P_(id),m=loc.menu[id];if(!P)continue;m.x=m.x||{};for(const x of xFor(loc,P))if(!m.x[x.id])m.x[x.id]={on:true,price:xDef(loc,P,x)};}}
// Anteil der Gäste, die vegetarisch oder vegan essen, je Lage
// Seltenheitsstufen: Gehaltsfaktor, Belastbarkeit, Leistungsspanne, Schulungsgrenze

/* ===================== Zustand ===================== */
let S=null;
const ui={tab:'stadt',adRole:'cook',down:0,away:false,modal:null,newArea:null,newTier:0};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const P_=id=>PRODS.find(p=>p.id===id);
function newToday(){return {rev:0,cogs:0,waste:0,other:0,theft:0,disc:0,prov:0,soldOut:0,served:0,lost:0};}
function stepOf(P){return P.v<8?0.1:P.v<30?0.5:1;}
function defPrice(loc,P){const st=stepOf(P);return +(Math.round(P.v*(1+0.04*loc.tier)*AREAS[loc.area].pay/st)*st).toFixed(2);}
function addProducts(loc){for(const P of PRODS){if(P.t<=loc.tier&&!loc.menu[P.id])loc.menu[P.id]={on:true,price:defPrice(loc,P),q:1,p:1};}addExtras(loc);}
function newLoc(id,area,tier){
  const loc={id,area,tier,staff:{cook:0,help:0,serv:0,bar:0,lead:0},reg:0,regS:null,regHist:[],regLog:null,stamp:false,team:[],apps:[],ad:null,hunt:null,ads:[],hunts:[],autoHire:false,want:{},mach:{},broken:{},qual:1,menu:{},stock:0,stockVal:0,rep:30,ord:100,queue:0,mkt:0,auto:false,
    today:newToday(),last:null,sold:{},soldR:{},soldC:{},soldLast:{},hist:[],boostUntil:0,pushUntil:0,sick:null,offer:null,reviews:[],stars:0,vegAdded:1,combos:[],nextCb:1,sig:null,sigDev:null,dev:{},devIng:null,popup:0,popRes:0,delivery:false,sponsor:0,feastDay:-99,filter:false};
  addProducts(loc);return loc;
}
function newMeta(){return {ep:0,perks:{},runs:0,best:0,ach:{}};}
function newGame(meta){
  const M=meta||newMeta(),pl=id=>(M.perks&&M.perks[id])||0;
  const l=newLoc(1,0,0);l.stock=90;l.stockVal=90;l.combos=[{id:1,main:'wurst',side:'pommes',drink:null,price:4.9,on:true}];l.nextCb=2;l.rep=35+8*pl('name');
  if(pl('truck')){l.tier=1;addProducts(l);}
  return {v:1,cash:300+500*pl('kapital'),t:0,day:1,dayT:6,loan:0,hq:0,strikes:0,locs:[l],nextId:2,ownerAt:1,sel:1,hist:[],log:[],market:{mult:1,until:0,label:''},
    pushCd:0,best:0,maxTier:l.tier,nextE:1,nextA:1,paused:false,lastSeen:Date.now(),lastDay:null,intro:true,bankrupt:false,
    meta:M,speed:0.5,flags:{},rushKey:'',rushBest:0,wx:null,cev:[],comps:[],card:null,tester:null,quests:[],qDay:0,qStreak:0,contract:{type:'tag',until:0},repay:[]};
}
const cur=()=>S.locs.find(l=>l.id===S.sel)||S.locs[0];

/* ===================== Formeln ===================== */
const NORM=(()=>{let s=0;for(let i=0;i<1000;i++)s+=rawPhase((i+.5)/1000);return s/1000;})();
function rawPhase(x){return 0.7+0.6*Math.exp(-Math.pow((x-0.36)/0.09,2))+0.55*Math.exp(-Math.pow((x-0.76)/0.1,2));}
function phase(x){return rawPhase(x)/NORM;}
function phaseName(x){return x<0.2?TR('Morgen'):x<0.5?TR('Mittag'):x<0.65?TR('Nachmittag'):x<0.9?TR('Abend'):TR('Nacht');}
function active(e){return !(S.t<e.sickUntil)&&!e.absent&&!(S.t<(e.trainUntil||0))&&!(S.t<(e.awayUntil||0));}
function realLocs(){return S.locs.filter(l=>!l.popup);}
function perk(id){return (S&&S.meta&&S.meta.perks&&S.meta.perks[id])||0;}
function season(d){return Math.floor(((d==null?S.day:d)-1)/SEASON_LEN)%4;}
function wxToday(){return (S.wx&&S.wx.w)||'wolken';}
function vegShare(loc){return clamp(VEGA[loc.area]*Math.min(1.4,1+0.003*((S&&S.day)||1)),0,0.5);}
function wxDem(loc){const W=WX[wxToday()],se=season();return loc.tier<=1?W.out*SEASON_DEM[se][0]:W.in*SEASON_DEM[se][1];}
function wxPop(id,w,se){const tag=PTAG[id];let m=1;
  const hot=w==='heiss'||(w==='sonne'&&se===1),cold=w==='schnee'||w==='frost'||se===3;
  if(hot)m*=({grill:1.25,kalt:1.45,kalt_d:1.6,bier:1.4,warm:0.75,leicht:1.2})[tag]||1;
  if(cold)m*=({warm:1.35,grill:0.9,kalt:0.6,kalt_d:0.7,wein:1.25,bier:0.9})[tag]||1;
  if(w==='regen'||w==='sturm')m*=({warm:1.15,kalt:0.85})[tag]||1;
  return m;}
function evAt(area,day){day=day==null?S.day:day;return (S.cev||[]).find(e=>e.area===area&&day>=e.start&&day<=e.end);}
function evDef(e){return CITYEV.find(x=>x.id===e.type);}
function compAt(area){return (S.comps||[]).find(c=>c.area===area&&S.day>=c.open);}
function compAtt(cp){return cp.att+(S.day<(cp.promoUntil||0)?0.25:0);}
function bioOn(){return S.contract&&S.contract.type==='bio';}
function promoActive(loc,r){return loc.team.some(e=>e.role===r&&e.promo&&active(e));}
function moodOf(e){return e.mood==null?70:e.mood;}
const ATTR=[['fk',TR('Fachkönnen')],['tm',TR('Teamfähigkeit')],['fu',TR('Führung')],['be',TR('Belastbarkeit')],['fr',TR('Freundlichkeit')],['zu',TR('Zuverlässigkeit')]];
const ROLEKEY={cook:['fk','be'],help:['zu','tm'],serv:['fr','be'],bar:['fr','fk'],lead:['fu','tm']};
function genAttrs(sk,rar,tr){const r=Math.random,n=(m,sd)=>Math.round(clamp(m+(r()+r()+r()-1.5)*sd,1,10)*10)/10,b=0.7*(rar||0);
  const at={fk:Math.round(clamp(sk*5,1,10)*10)/10,tm:n(5.5+b,2.6),fu:n(4.3+b+(sk-1)*2.5,2.6),be:n(4.5+1.2*(rar||0),2.2),fr:n(5.5+b*0.6,2.6),zu:n(6+b*0.5,2.4)};
  if(tr==='giftig')at.tm=n(2,1);if(tr==='vorbild'){at.tm=Math.max(at.tm,n(8.5,1));at.fu=Math.min(10,at.fu+1.5);}
  if(tr==='unzuv')at.zu=n(2.5,1);if(tr==='schlampig')at.zu=Math.min(at.zu,n(4,1));return at;}
// Schätzung aus den Unterlagen: Mitte = Wahrheit + Täuschung, Breite = Unsicherheit
function estAttrs(a){const at=a.at,E={},nz=sd=>(Math.random()+Math.random()+Math.random()-1.5)*sd,fake=a.sk<0.45,tri=a.trial&&a.trial!=='pending';
  for(const [k] of ATTR){let bias=nz(1.4),w=2.5;
    if(k==='fk'){bias=fake?2.5+Math.random()*2.5:nz(1.2);w=a.zl<0?3:2;if(a.hh){bias=nz(0.4);w=1;}if(tri){bias=nz(0.5);w=1;}}
    if(k==='fu'){w=3;if(a.hh)w=1.5;}
    if(k==='be'){w=3;if(tri){bias=nz(0.8);w=1.5;}}
    if(k==='zu'){w=a.zl<0?3.5:2.5;if(a.tr==='unzuv'&&a.zh!=='unzuv'&&a.th!=='unzuv')bias+=3;}
    if(k==='tm'&&a.tr==='giftig'&&a.th!=='giftig')bias+=3;
    if((k==='tm'||k==='fr')&&tri){bias=nz(0.8);w=1.5;}
    const c=clamp(at[k]+bias,1,10);E[k]=[Math.round(clamp(c-w,1,10)),Math.round(clamp(c+w,1,10))];}
  return E;}
function attrOf(e,k){return e.at?e.at[k]:5.5;}
function resOf(e){return e.at?clamp((e.at.be-1)/9,0,1)*0.9:rarOf(e).res;}
function teamMod(loc){let g=0,v=0,u=0;for(const e of loc.team){if(!active(e))continue;if(e.tr==='giftig')g++;else if(e.tr==='vorbild')v++;if(e.rar===3)u+=0.02;if(e.rar===4)u+=0.06;u+=(attrOf(e,'tm')-5.5)*0.006;}return clamp(1-0.06*g+0.04*v+u,0.7,1.25);}
function rarOf(e){return RAR[e.rar||0];}
function effStaff(loc,r){let s=0;const tm=teamMod(loc);for(const e of loc.team)if(e.role===r&&active(e))s+=e.sk*tm*(0.85+0.3*moodOf(e)/100)*(e.leaveDay?0.7:1)*(r==='lead'?0.6+0.08*attrOf(e,'fu'):1);return s;}
function headActive(loc,r){let n=0;for(const e of loc.team)if(e.role===r&&active(e))n++;return n;}
function sync(loc){for(const R of ROLES)loc.staff[R.id]=0;for(const e of loc.team)if(!e.tempUntil)loc.staff[e.role]++;}
const roleName=r=>ROLES.find(x=>x.id===r).n;
const pick=a=>a[Math.floor(Math.random()*a.length)];
function rndName(){return pick(FN)+' '+pick(LN);}
function mLvl(loc,id){return loc.broken[id]?0:(loc.mach[id]||0);}
function wage(loc,r){const R=ROLES.find(x=>x.id===r);return Math.round(R.w*WM[loc.tier]);}
function maxStaff(loc,r){return TIERS[loc.tier][r];}
function uncovered(){return Math.max(0,realLocs().length-1-2*S.hq);}
function marketMult(){return S.t<S.market.until?S.market.mult:1;}
function prodCalc(loc,P,m){
  const ev=evAt(loc.area),ed=ev?evDef(ev):null,sg=loc.sig&&loc.sig.p===P.id?loc.sig.r:0,dv=hasRec(loc,P.id)?1:0;
  const V=P.v*QV[m.q-1]*Math.pow(m.p,0.3)*(1+0.04*loc.tier)*(0.92+0.18*loc.rep/100)*AREAS[loc.area].pay*((ed&&ed.pay)||1)*((ed&&ed.price)||1)*(bioOn()?1.08:1)*(1+0.04*(loc.stars||0))*(1+0.12*sg)*(1+0.1*dv);
  const ek=P.ek*QC[m.q-1]*m.p;
  const r=V/Math.max(0.05,m.price), r3=r*r*r;
  const fx=(1+0.04*loc.tier)*(0.92+0.18*loc.rep/100)*AREAS[loc.area].pay*((ed&&ed.pay)||1),xs=[];let xrev=0,xek=0,xwork=0,xsat=0;
  if(m.x)for(const x of xFor(loc,P)){const o=m.x[x.id];if(!o||!o.on)continue;const b=xBase(x,P),Vx=b.v*fx,rx=Vx/Math.max(0.05,o.price),r3x=rx*rx*rx,take=Math.min(0.9,x.t*2*r3x/(1+r3x));
    xs.push({x,o,take,r:rx,ek:b.ek});xrev+=take*o.price;xek+=take*b.ek;xwork+=take*(x.rel?(x.w||0)*(P.w||0):(x.w||0));xsat+=x.t*clamp(14*(rx-1),-7,2);}
  return {xs,xrev,xek,xwork,xsat,P,m,V,ek,r,g:2*r3/(1+r3),work:(P.w||0)*QW[m.q-1]*Math.sqrt(m.p),s:0,sig:sg,pp:P.pop*wxPop(P.id,wxToday(),season())*((ed&&ed.pref[P.id])||1)*(1+0.35*sg)*(1+0.15*dv),dv};
}
function sideInfo(loc,all,k){if(k==='pommes'){const c=all.pommes;return c?{V:c.V,price:c.m.price,ek:c.ek,w:c.work}:null;}
  const S0=SIDES[k],fx=(1+0.04*loc.tier)*(0.92+0.18*loc.rep/100)*AREAS[loc.area].pay;return {V:S0.v*fx,price:+(S0.v*fx).toFixed(1),ek:S0.ek,w:S0.w};}
function comboCalc(loc,cb,all,drinks){
  const c=all[cb.main];if(!c)return null;const sd=cb.side?sideInfo(loc,all,cb.side):null,dr=cb.drink?all[cb.drink]:null;
  if(cb.side&&!sd)return {cb,bad:TR('Beilage fehlt')};if(cb.drink&&(!dr||!drinks.some(d=>d.P.id===cb.drink)))return {cb,bad:TR('Getränk nicht verfügbar')};
  const sum=c.m.price+(sd?sd.price:0)+(dr?dr.m.price:0),V=(c.V+(sd?sd.V:0)+(dr?dr.V:0))*0.97,r=V/Math.max(0.1,cb.price),r3=r*r*r,save=1-cb.price/Math.max(0.1,sum);
  const take=clamp(0.4*(2*r3/(1+r3))*(1+1.5*clamp(save,-0.3,0.3)),0,0.85);
  return {cb,sum,save,take,ekX:(sd?sd.ek:0)+(dr?dr.ek:0),wX:sd?sd.w:0,ekAll:c.ek+(sd?sd.ek:0)+(dr?dr.ek:0)};
}
function applyCombos(loc,all,foods,drinks){
  for(const c of foods){c.cs=[];c.cRev=0;c.cEk=0;c.cWork=0;c.csat=0;}
  for(const cb of loc.combos||[]){if(!cb.on)continue;const c=foods.find(f=>f.P.id===cb.main);if(!c)continue;const k=comboCalc(loc,cb,all,drinks);if(!k||k.bad)continue;c.cs.push(k);}
  for(const c of foods){if(!c.cs.length)continue;const tot=c.cs.reduce((a,k)=>a+k.take,0),f=tot>0.85?0.85/tot:1;
    for(const k of c.cs){const t=k.take*f;k.eff=t;c.cRev+=t*(k.cb.price-c.m.price);c.cEk+=t*k.ekX;c.cWork+=t*k.wX;c.csat+=t*clamp(20*k.save,-6,5);}
    c.pp*=1+0.3*Math.min(0.85,tot*f);}
}
function calc(loc){
  const T=TIERS[loc.tier],A=AREAS[loc.area],foods=[],drinks=[],all={};
  for(const P of PRODS){
    const m=loc.menu[P.id];if(!m||P.t>loc.tier)continue;
    const c=prodCalc(loc,P,m);all[P.id]=c;
    if(!m.on)continue;
    if(P.drink){if(mLvl(loc,'bar')<1)continue;if(P.bar&&effStaff(loc,'bar')<=0)continue;drinks.push(c);}
    else foods.push(c);
  }
  applyCombos(loc,all,foods,drinks);
  // Zielgruppen: Allesesser, Vegetarier, Veganer. Jede wählt nur aus den Gerichten, die für sie infrage kommen.
  const vs=vegShare(loc),gf=r=>{const r3=r*r*r;return 2*r3/(1+r3);};
  const SEG=[{k:'o',n:TR('Allesesser'),w:1-vs,ok:()=>true,pm:c=>c.P.diet?0.55:1,rm:1,qw:11,q1:0},
    {k:'v',n:TR('Vegetarier'),w:vs*(1-VEGAN_SHARE),ok:c=>c.P.diet&&!c.P.side,pm:()=>1,rm:1.1,qw:15,q1:6},
    {k:'vg',n:TR('Veganer'),w:vs*VEGAN_SHARE,ok:c=>c.P.diet==='vegan'&&!c.P.side,pm:()=>1,rm:1.1,qw:15,q1:6}];
  let miss=0;
  SEG.forEach(sg=>{sg.w0=sg.w;const L=foods.filter(sg.ok);sg.opt=L.length;let pp=0,a=0,st=0;
    L.forEach(c=>{const x=c.pp*sg.pm(c),r=c.r*sg.rm,g=gf(r);c['a_'+sg.k]=x*g;pp+=x;a+=x*g;});
    sg.G=pp?a/pp:0;sg.a=a;
    L.forEach(c=>{const sh=a>0?c['a_'+sg.k]/a:0;const r=c.r*sg.rm;st+=sh*(sg.qw*(c.m.q-1)-(c.m.q===1?sg.q1:0)+30*(c.m.p-1)+clamp(35*(r-1),-25,15)+4*c.sig+3*c.dv+c.xsat+(c.csat||0));});
    if(sg.k!=='o'&&sg.opt===1){sg.G*=0.85;st-=6;}
    sg.sat=st;if(sg.k!=='o'&&!sg.opt)miss+=sg.w;});
  SEG[0].w*=1-0.5*miss; // Gruppen mit Vegetariern gehen woanders hin
  SEG.forEach(sg=>sg.D=sg.w*sg.G);
  const G=SEG.reduce((x,sg)=>x+sg.D,0);
  let price=0,ek=0,work=0,sat=0,avgQ=0;
  foods.forEach(c=>{let s=0;SEG.forEach(sg=>{if(sg.ok(c)&&sg.a>0)s+=sg.D*c['a_'+sg.k]/sg.a;});
    c.s=G>0?s/G:0;price+=c.s*(c.m.price+c.xrev+(c.cRev||0));ek+=c.s*(c.ek+c.xek+(c.cEk||0));work+=c.s*(c.work+c.xwork+(c.cWork||0));avgQ+=c.s*c.m.q;});
  SEG.forEach(sg=>{sg.share=G>0?sg.D/G:0;sat+=sg.share*sg.sat;});
  const variety=1+0.06*Math.min(5,Math.max(0,foods.length-1));
  const boost=S.t<loc.boostUntil?1.4:1;
  const wxM=wxDem(loc),ev=evAt(loc.area),evM=ev?evDef(ev).mult:1;
  let walk=T.dem*A.dem*(0.4+1.2*loc.rep/100)*MKT[loc.mkt].f*variety*G*boost*wxM*evM*(1+0.12*(loc.stars||0))*(loc.sponsor>=S.day?1.1:1)*(loc.delivery?1.15:1);
  const regD=foods.length?(loc.reg||0)*REGV*Math.min(1.25,G)*(1+(wxM-1)*0.5):0;
  const owner=S.ownerAt===loc.id?1:0, leadP=effStaff(loc,'lead'), lead=leadP>0;
  const cooks=effStaff(loc,'cook')+owner, help=effStaff(loc,'help'), serv=effStaff(loc,'serv'), bk=effStaff(loc,'bar');
  const ordM=0.4+0.6*loc.ord/100, push=(S.t<loc.pushUntil?1.4:1)*(S.t<(loc.rushUntil||0)?(loc.rushMul||1.2):1);
  const kitchen=cooks*80*(1+0.3*mLvl(loc,'herd'))*(1+0.12*help)*ordM*push*(promoActive(loc,'cook')?1.1:1);
  const prodCap=work>0?kitchen/work:0;
  const servCap=loc.tier<2?Infinity:(loc.tier===2?140+110*serv:60+90*serv)*(1+0.2*mLvl(loc,'kasse'))*ordM*push*(promoActive(loc,'serv')?1.1:1);
  const cap=Math.min(prodCap,servCap);
  let dRate=0,dPrice=0,dEk=0,dCap=0;
  if(drinks.length){
    let dp=0,da=0;drinks.forEach(c=>{dp+=c.pp;c.a=c.pp*c.g;da+=c.a;});
    drinks.forEach(c=>{c.s=da>0?c.a/da:0;dPrice+=c.s*(c.m.price+c.xrev);dEk+=c.s*(c.ek+c.xek);});
    const L=mLvl(loc,'bar');
    dRate=Math.min(0.9,(0.25+0.08*L)*(da/dp)*(bk?1.25:1)*WX[wxToday()].drink);dCap=60*L+130*bk;
  }
  const nCook=headActive(loc,'cook')+owner,nServ=headActive(loc,'serv');
  let staffSat=nCook?clamp(18*(cooks/nCook-1),-15,9):0;
  if(loc.tier>=2&&nServ)staffSat+=clamp(10*(serv/nServ-1),-8,5);
  {const fr=loc.team.filter(e=>active(e)&&(loc.tier>=2?(e.role==='serv'||e.role==='bar'):e.role==='cook'));if(fr.length)staffSat+=clamp((fr.reduce((a,e)=>a+attrOf(e,'fr'),0)/fr.length-5.5)*1.2,-5,5);}
  let slop=0,thieves=0;for(const e of loc.team){if(!active(e))continue;if(e.tr==='schlampig')slop++;if(e.tr==='dieb')thieves++;}
  staffSat-=Math.min(8,4*slop);
  const sTarget=clamp(38+sat+staffSat+(loc.ord-75)*0.5-10*Math.max(0,T.exp-avgQ)+(bioOn()?5:0),0,100);
  const cmp=loc.popup?null:compAt(loc.area),own=(sTarget-55)/45+0.05*(loc.stars||0),compF=cmp?clamp(0.22*cmp.str*(1+1.2*(compAtt(cmp)-own)),0.02,0.4):0;
  walk*=1-compF;const demand=walk+regD,delShare=loc.delivery&&demand>0?walk*(0.15/1.15)/demand:0;
  let wages=0;for(const e of loc.team)wages+=e.pay;
  let lv=0;for(const M of MACH)lv+=loc.mach[M.id]||0;
  const rent=loc.popup?0:T.rent*A.rent*(1-0.04*perk('miete')), energy=Math.round(lv*3*Math.pow(loc.tier+1,1.8)), mktCost=Math.round(MKT[loc.mkt].c*Math.pow(loc.tier+1,2));
  const unc=uncovered();
  return {segs:SEG,vegMiss:miss,cmp,compF,delShare,wxM,evM,walk,regD,sat,staffSat,foods,drinks,all,G,price,ek,work,avgQ,demand,cooks,kitchen,prodCap,servCap,cap,neck:prodCap<=servCap?TR('Küche'):'Service',
    extraM:1+0.05*mLvl(loc,'extra'),dRate,dPrice,dEk,dCap,sTarget,wages,rent,energy,mktCost,fix:wages+rent+energy+mktCost,
    store:T.store*(1+0.4*mLvl(loc,'kuehl')),spoil:0.08*(1-0.14*mLvl(loc,'kuehl')),
    ordDecay:(4+1.5*loc.tier)*(1-0.1*mLvl(loc,'spuel'))*Math.max(0.5,1-0.06*help)*(owner?0.6:1)*(lead?clamp(0.35/leadP,0.2,1):1)*(1+0.25*slop)*(1+0.35*unc),thieves,
    ordFloor:lead?clamp((62-7*unc)*Math.min(1.2,leadP),12,75):10,queueCap:T.q*(1+0.2*mLvl(loc,'kasse'))};
}
function forecast(loc,c){
  const g=Math.min(c.demand,c.cap*0.95);if(!(g>0))return -c.fix;
  const dr=Math.min(c.dRate,c.dCap/g);
  return g*(c.price*c.extraM+dr*c.dPrice)*(1-0.25*(c.delShare||0))-g*(c.ek+dr*c.dEk)*unitPrice(loc,1,loc.auto)*(1+c.spoil)-c.fix;
}
function dailyUse(loc,c){const g=Math.min(c.demand,c.cap);return g>0?g*(c.ek+Math.min(c.dRate,c.dCap/g)*c.dEk):0;}
function tierSum(t){let s=0;for(let i=0;i<=t;i++)s+=TIERS[i].cost;return s;}
function invested(loc){let s=tierSum(loc.tier);for(const M of MACH){const L=loc.mach[M.id]||0;for(let i=0;i<L;i++)s+=M.base*Math.pow(3,i);}for(let i=1;i<loc.qual;i++)s+=QCOST[i];return s;}
function investedAll(){let s=0;realLocs().forEach(l=>s+=invested(l));for(let i=1;i<=S.hq;i++)s+=HQS[i].cost;return s;}
function dispoLimit(){return Math.round(250+0.1*investedAll());}
function creditMax(){return Math.round((1000+0.4*investedAll())/100)*100;}
function companyValue(){let s=S.cash-S.loan+0.5*investedAll();S.locs.forEach(l=>s+=l.stockVal);return s;}
function adminCost(){const L=realLocs(),n=L.length;if(n<2)return 0;let at=0;L.forEach(l=>at+=l.tier);return Math.round(60*Math.pow(n-1,1.5)*(1+0.5*at/n)*(1-0.1*perk('verwaltung')));}
function overheadDay(){return adminCost()+HQS[S.hq].daily+S.loan*0.01+(S.cash<0?-S.cash*0.03:0);}
function newLocCost(tier){const n=realLocs().length;return 1500*n*n+tierSum(tier);}

/* ===================== Simulation ===================== */
function useStock(loc,amt,kind){if(amt<=0||loc.stock<=0)return;amt=Math.min(amt,loc.stock);const cost=amt*loc.stockVal/loc.stock;loc.stock-=amt;loc.stockVal-=cost;loc.today[kind]+=cost;if(loc.stock<1e-6){loc.stock=0;loc.stockVal=0;}}
function unitPrice(loc,qty,auto){const ct=(S.contract&&S.contract.type)||'tag';let p=ct==='fest'?1.05:marketMult()*SEASON_PRICE[season()];if(ct==='bio')p*=1.35;if(S.cheapUntil&&S.day<=S.cheapUntil)p*=0.75;p*=1-0.03*perk('einkauf');if(auto&&!loc.staff.lead)p*=1.15;if(!auto){if(qty>=8000)p*=0.88;else if(qty>=2000)p*=0.92;else if(qty>=500)p*=0.96;}return p;}
function buyStock(loc,qty,auto){
  const c=calc(loc);qty=Math.min(qty,c.store-loc.stock);if(qty<1)return 0;
  const up=unitPrice(loc,qty,auto),floor=auto?0:-dispoLimit();
  if(S.cash-qty*up<floor)qty=Math.max(0,(S.cash-floor)/up);
  if(qty<1)return 0;
  if(loc.pl)loc.pl.goods+=qty*up;
  S.cash-=qty*up;loc.stock+=qty;loc.stockVal+=qty*up;return qty;
}
function simLoc(loc,dt,ph){
  const c=calc(loc),dd=dt/DAY;
  if(loc.ord>c.ordFloor)loc.ord=Math.max(c.ordFloor,loc.ord-c.ordDecay*dd);
  if(loc.stock>0)useStock(loc,loc.stock*c.spoil*dd,'waste');
  const arr=c.demand*ph*dd;loc.queue+=arr;
  let srv=c.ek>0?Math.min(loc.queue,c.cap*dd,loc.stock/c.ek):0;if(!(srv>0))srv=0;
  loc.queue-=srv;let lost=0;
  if(c.ek>0&&loc.stock<c.ek&&srv<loc.queue){lost+=loc.queue;loc.queue=0;loc.today.soldOut=1;}
  if(loc.queue>c.queueCap){lost+=loc.queue-c.queueCap;loc.queue=c.queueCap;}
  if(srv>0){
    let rev=srv*c.price*c.extraM;const uc=loc.stock>0?loc.stockVal/loc.stock:1,bk=(f,n)=>{const id=f.P.id;loc.sold[id]=(loc.sold[id]||0)+n;loc.soldR[id]=(loc.soldR[id]||0)+n*(f.m.price+f.xrev+(f.cRev||0));loc.soldC[id]=(loc.soldC[id]||0)+n*(f.ek+f.xek+(f.cEk||0))*uc;if(f.cs&&f.cs.length){const C=loc.csold=loc.csold||{};for(const k of f.cs)C[k.cb.id]=(C[k.cb.id]||0)+n*k.eff;}if(f.xs.length){const X=loc.xsold=loc.xsold||{};for(const e of f.xs){const k=id+':'+e.x.id;X[k]=(X[k]||0)+n*e.take;}}};useStock(loc,srv*c.ek,'cogs');
    c.foods.forEach(f=>bk(f,srv*f.s));
    if(c.dRate>0&&c.dEk>0){const d=Math.min(srv*c.dRate,c.dCap*dd,loc.stock/c.dEk);if(d>0){rev+=d*c.dPrice;useStock(loc,d*c.dEk,'cogs');c.drinks.forEach(f=>bk(f,d*f.s));}}
    const stl=Math.min(0.2,0.04*c.thieves)*rev,disc=loc.stamp&&c.demand>0?rev*0.08*c.regD/c.demand:0,prov=rev*0.25*(c.delShare||0);S.cash+=rev-stl-disc-prov;loc.today.prov=(loc.today.prov||0)+prov;loc.today.rev+=rev;loc.today.disc=(loc.today.disc||0)+disc;loc.today.theft=(loc.today.theft||0)+stl;loc.today.served+=srv;
  }
  loc.today.lost+=lost;
  if(arr>0)loc.rep=clamp(loc.rep+((c.sTarget-loc.rep)*0.35*Math.min(1,srv/arr)-14*Math.min(1.5,lost/arr))*dd,0,100);
  if(loc.auto&&(loc.tier>=1||loc.staff.lead)&&loc.stock<c.store*0.25)buyStock(loc,c.store*0.7-loc.stock,true);
}
function addLog(msg,kind){S.log.unshift({d:S.day,m:msg,k:kind||''});if(S.log.length>40)S.log.length=40;if(kind)toast(msg,kind);}
function locName(loc){return (loc.popup?'Pop-up':TIERS[loc.tier].n)+' '+AREAS[loc.area].n;}
function repairCost(loc,id){const M=MACH.find(m=>m.id===id);return Math.round(0.25*M.base*Math.pow(3,(loc.mach[id]||1)-1));}
function rollEvents(loc){
  // Leitung lässt Defekte vom Vortag reparieren
  if(loc.staff.lead)for(const id in loc.broken){const rc=repairCost(loc,id);if(S.cash>=rc){S.cash-=rc;loc.today.other+=rc;delete loc.broken[id];}}
  if(loc.offer&&S.t>=loc.offer.until)loc.offer=null;
  if(Math.random()>0.07+0.01*loc.tier)return;
  const nm=locName(loc),x=Math.random()*100;
  if(x<35){
    const ms=MACH.filter(m=>(loc.mach[m.id]||0)>0&&!loc.broken[m.id]);if(!ms.length)return;
    const M=ms[Math.floor(Math.random()*ms.length)];loc.broken[M.id]=true;addLog(nm+': '+M.n+TR(' ist defekt.'),'bad');
  }else if(x<55){
    if(loc.ord<50){const fine=150*Math.pow(loc.tier+1,2);S.cash-=fine;loc.today.other+=fine;loc.rep=Math.max(0,loc.rep-8);addLog(nm+TR(': Gesundheitsamt bemängelt die Ordnung, ')+eur(fine)+TR(' Bußgeld.'),'bad');}
    else if(loc.ord>=80){loc.rep=Math.min(100,loc.rep+3);addLog(nm+TR(': Gesundheitsamt vergibt Bestnote.'),'good');}
  }else if(x<70){
    const rs=loc.team.filter(e=>e.role!=='lead'&&active(e)&&Math.random()>resOf(e)*0.6);if(!rs.length)return;
    const e=pick(rs);e.sickUntil=S.t+2*DAY;addLog(nm+': '+e.name+' ('+roleName(e.role)+TR(') fällt zwei Tage krank aus.'),'bad');
  }else if(x<82){
    loc.boostUntil=S.t+2*DAY;addLog(nm+TR(': Ein Food-Blog berichtet, zwei Tage lang 40 % mehr Andrang.'),'good');
  }else{
    const c=calc(loc);if(!(c.ek>0))return;const n=Math.round(TIERS[loc.tier].dem*0.4);
    loc.offer={n,need:n*c.ek,pay:Math.round(n*c.price*1.3),until:S.t+DAY};addLog(nm+TR(': Catering-Anfrage über ')+n+TR(' Portionen.'),'');
  }
}
function rollRar(loc,hh){
  const w=(hh?RAR_HH:RAR_APP).slice(),pl=perk('personal');
  for(let i=1;i<5;i++)w[i]*=(hh?1:(0.8+0.4*loc.rep/100))*(1+0.15*pl);
  let t=w.reduce((a,b)=>a+b,0),x=Math.random()*t;for(let i=0;i<5;i++){x-=w[i];if(x<=0)return i;}return 0;
}
function genApp(loc,role,hh){const A=genApp0(loc,role,hh);A.est=estAttrs(A);return A;}
function genApp0(loc,role,hh){
  const ref=wage(loc,role),nz=()=>Math.random()-0.5,rar=rollRar(loc,hh);let sk,tr='';
  if(rar>0){const R=RAR[rar].sk;sk=R[0]+Math.random()*(R[1]-R[0]);}
  else{const x=Math.random()-(loc.rep-50)/50*0.08-0.03*perk('personal');
    sk=x<0.13?0.15+Math.random()*0.27:x<0.4?0.5+Math.random()*0.3:x<0.85?0.85+Math.random()*0.25:1.1+Math.random()*0.15;}
  {const y=Math.random(),k=1-0.2*rar;tr=y<0.05*k?'dieb':y<0.11*k?'giftig':y<0.2*k?'unzuv':y<0.26*k?'schlampig':y<0.26*k+0.04+0.03*rar?'vorbild':'';if(hh&&(tr==='dieb'||tr==='giftig')&&Math.random()<0.7)tr='';}
  const fake=sk<0.45,pos=POS[role];
  const years=fake?2+Math.floor(Math.random()*7):clamp(Math.round(sk*sk*6+nz()*5),0,25);
  const pi=clamp(Math.floor((fake?0.35+Math.random()*0.6:sk/1.6+nz()*0.3)*pos.length),0,pos.length-1);
  const exp=Math.random()<(fake?0.62:0.14)?pick(VAGUE):years<1?TR('Ausbildung gerade abgeschlossen'):years+(years===1?TR(' Jahr'):TR(' Jahre'))+TR(', zuletzt ')+pos[pi]+TR(' im ')+pick(VENUES);
  let zl=fake?Math.floor(Math.random()*2):clamp(Math.round((sk-0.5)/0.22)+(Math.random()<0.3?(Math.random()<0.5?-1:1):0),0,5);
  if(!hh&&Math.random()<0.08)zl=4+Math.floor(Math.random()*2);
  if(!hh&&Math.random()<(fake?0.3:0.12))zl=-1;
  const hint=q=>tr&&tr!=='vorbild'?(Math.random()<q?tr:''):tr==='vorbild'?(Math.random()<q?tr:''):(!hh&&Math.random()<0.05?pick(['dieb','giftig','unzuv','schlampig']):'');
  const zh=zl<0?'':hint(0.5),th=hint(0.4);
  const v=sk+nz()*0.7,r0=Math.random();
  const talk=fake?(r0<0.5?0:r0<0.85?1:2):(v<0.8?0:v<1.15?1:2);
  const pay=Math.round(ref*(rar>0?RAR[rar].pay*(0.9+Math.random()*0.25)*(hh?1.15:1):fake?0.8+Math.random()*0.45:clamp(0.72+0.42*sk+nz()*0.3,0.6,1.4)));
  return {id:S.nextA++,role,name:rndName(),age:19+Math.floor(Math.random()*8)+Math.min(years,22),sk,tr,pay,years,exp,zl,zh,th,talk,tk:pick(TALK[talk]),exp_day:S.day+3,hh:!!hh,rar,trial:null,trialEst:0,at:genAttrs(sk,rar,tr)};
}
function trialText(a){
  const est=a.sk+(Math.random()-0.5)*0.25;a.trialEst=est;
  return (est<0.5?TR('Fand sich am Arbeitsplatz kaum zurecht.'):est<0.85?TR('Langsam, brauchte viel Anleitung.'):est<1.1?TR('Ordentliche Arbeit ohne Auffälligkeiten.'):est<1.3?TR('Schnell und sauber gearbeitet.'):TR('Hat das Team beeindruckt.'))+(a.tr==='unzuv'&&Math.random()<0.4?TR(' Kam verspätet.'):'');
}
function appScore(a,lp){let sc=(a.rar||0)*1.6+(a.zl<0?1.8:a.zl)+a.talk*1.2+Math.min(a.years,10)*0.12-(a.zh&&a.zh!=='vorbild'?1.2:0)-(a.th&&a.th!=='vorbild'?1.2:0)+(a.hh?3:0);if(a.trialEst)sc+=(a.trialEst-1)*4;if(lp>1.1)sc+=(a.sk-1)*3;return sc;}
function adCost(loc,r){return Math.round(wage(loc,r)*2.5);}
function huntCost(loc,r){return Math.round(wage(loc,r)*12);}
function hireApp(loc,a,auto){
  S.cash-=a.pay;
  loc.team.push({id:S.nextE++,name:a.name,role:a.role,sk:a.sk,tr:a.tr,pay:a.pay,rar:a.rar||0,at:a.at,est:a.est,day:S.day,trKnown:false,sickUntil:0,absent:false,leaveDay:0,mood:clamp(72+40*(a.pay/(wage(loc,a.role)*RAR[a.rar||0].pay)-1),40,95)});
  loc.apps=loc.apps.filter(x=>x!==a);sync(loc);
  if(!auto)loc.want[a.role]=Math.max(loc.want[a.role]||0,loc.staff[a.role]);
  if(a.role==='lead'){loc.auto=true;loc.autoHire=true;}
  if((a.rar||0)>=3)S.flags.legend=1;if(a.rar===4)S.flags.ultra=1;
  if(auto)addLog(locName(loc)+TR(': Die Leitung hat ')+a.name+TR(' als ')+roleName(a.role)+TR(' eingestellt.'),'');
}
function leadHires(loc){
  const lp=Math.max(effStaff(loc,'lead'),S.hq>0?1:0);
  for(const R of ROLES){
    if(R.id==='lead'&&loc.staff.lead)continue;
    if(loc.staff[R.id]>=Math.min(loc.want[R.id]||0,maxStaff(loc,R.id)))continue;
    const cs=loc.apps.filter(a=>a.role===R.id&&a.pay<=wage(loc,R.id)*Math.max(1.5,RAR[a.rar||0].pay*1.35)&&S.cash>=a.pay*3);
    if(cs.length){cs.sort((a,b)=>appScore(b,lp)-appScore(a,lp));hireApp(loc,cs[0],true);}
    else if(!loc.ads.some(a=>a.role===R.id)&&S.cash>=adCost(loc,R.id)*4){const c=adCost(loc,R.id);S.cash-=c;loc.today.other+=c;loc.ads.push({role:R.id,until:S.day+3});}
  }
}
function staffDay(loc,offline){
  const nm=locName(loc);
  const gone=loc.team.filter(e=>e.leaveDay&&S.day>=e.leaveDay);
  if(gone.length){loc.team=loc.team.filter(e=>!gone.includes(e));gone.forEach(e=>addLog(nm+': '+e.name+' ('+roleName(e.role)+TR(') hat den Betrieb verlassen.'),''));}
  const toxic=loc.team.some(e=>e.tr==='giftig');
  const watch=0.18+(S.ownerAt===loc.id?0.15:0)+(loc.staff.lead?0.08:0);
  const cc=calc(loc),over=(loc.last&&loc.last.lost>loc.last.served*0.1)||cc.demand>cc.cap*1.05,vb=loc.team.some(x=>x.tr==='vorbild'&&active(x)),feast=S.day-(loc.feastDay||-99)<5,cp=compAt(loc.area);
  for(const e of loc.team){
    const ref=wage(loc,e.role)*rarOf(e).pay,rs=resOf(e),tg=clamp(62+70*(e.pay/ref-1)-(over?10*(1-rs):0)-(toxic&&e.tr!=='giftig'?10*(1-rs):0)+(vb?6:0)+(S.ownerAt===loc.id?4:0)+(e.promo?10:0)+(feast?10:0)-(e.tr==='giftig'?10:0),5,100);
    e.mood=clamp(moodOf(e)+0.25*(tg-moodOf(e))+(Math.random()-0.5)*4,0,100);
    if(e.ask&&S.day>e.ask.day){if(loc.staff.lead&&e.ask.pay<=ref*1.25){e.pay=e.ask.pay;e.mood=Math.min(100,moodOf(e)+12);addLog(nm+TR(': Die Leitung hat ')+e.name+TR(' mehr Gehalt gegeben.'),'');}else{e.mood=Math.max(0,moodOf(e)-(loc.staff.lead?6:10));addLog(nm+': '+e.name+TR(' bekommt keine Gehaltserhöhung.'),'');}e.ask=null;e.lastAsk=S.day;}
    if(e.poach&&S.day>e.poach.day){if(loc.staff.lead&&e.poach.pay<=ref*1.5&&S.cash>e.poach.pay*10){e.pay=e.poach.pay;e.mood=Math.min(100,moodOf(e)+8);addLog(nm+TR(': Die Leitung hat ')+e.name+TR(' mit mehr Gehalt gehalten.'),'');}else{addLog(nm+': '+e.name+TR(' wechselt zu ')+e.poach.by+'.','bad');e.leaveDay=S.day+1;e.quit=true;}e.poach=null;}
    if(!offline&&!e.temp&&!e.leaveDay&&!e.ask&&!e.poach&&S.day-e.day>=8&&e.pay<ref*(1.15+0.5*Math.max(0,e.sk-1))&&S.day-(e.lastAsk||-99)>=10&&Math.random()<(e.mood<55?0.02:0.006)+(e.sk>1.15?0.008:0)){e.ask={pay:Math.round(e.pay*(1.1+Math.random()*0.12)),day:S.day+2};addLog(nm+': '+e.name+TR(' bittet um mehr Gehalt.'),'');}
    if(!offline&&cp&&!e.temp&&!e.leaveDay&&!e.poach&&e.sk>=1.1&&e.mood<70&&Math.random()<0.012*(1+0.5*(e.rar||0))){e.poach={pay:Math.round(e.pay*1.25),day:S.day+1,by:cp.n};addLog(nm+': '+cp.n+TR(' will ')+e.name+TR(' abwerben.'),'bad');}
    e.absent=Math.random()<(e.tr==='unzuv'?0.3:Math.max(0,(6-attrOf(e,'zu'))*0.008));
    if(e.tr&&!e.trKnown&&S.day-e.day>=1&&Math.random()<watch){e.trKnown=true;addLog(nm+': '+e.name+' '+TRAIT[e.tr].log,TRAIT[e.tr].k);}
    if(!offline&&!e.leaveDay&&S.day-e.day>=3&&Math.random()<(e.tr==='unzuv'?0.03:0.004)*(toxic&&e.tr!=='giftig'?2.5:1)*(moodOf(e)<40?1+(40-moodOf(e))/8:moodOf(e)>80?0.5:1)*(1-0.5*resOf(e))&&!e.temp){e.leaveDay=S.day+2;e.quit=true;addLog(nm+': '+e.name+' ('+roleName(e.role)+TR(') hat gekündigt und geht in zwei Tagen.'),'bad');}
  }
  sync(loc);
  if(offline)return;
  loc.apps=loc.apps.filter(a=>S.day<=a.exp_day);
  for(const a of loc.apps)if(a.trial==='pending'){a.trial=trialText(a);a.est=estAttrs(a);}
  loc.hunts=(loc.hunts||[]).filter(h=>{if(S.day<h.day)return true;const nw=[genApp(loc,h.role,true),genApp(loc,h.role,true)];nw.forEach(a=>loc.apps.push(a));const top=Math.max(...nw.map(a=>a.rar));addLog(nm+TR(': Der Headhunter stellt zwei Kandidaten als ')+roleName(h.role)+TR(' vor')+(top>=3?TR(', darunter ')+(top===4?TR('eine Ultra-Fachkraft!'):TR('eine legendäre Fachkraft.')):'.'),'good');return false;});
  loc.ads=(loc.ads||[]).filter(ad=>{if(S.day>ad.until)return false;const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++){const a=genApp(loc,ad.role,false);loc.apps.push(a);if(a.rar>=3)addLog(nm+TR(': Eine legendäre Bewerbung als ')+roleName(a.role)+TR(' ist eingegangen.'),'good');}return true;});
  if(Math.random()<0.3){const rs=[];ROLES.forEach(r=>{const mx=maxStaff(loc,r.id);if(mx){rs.push(r.id);if(loc.staff[r.id]<mx)rs.push(r.id,r.id);}});if(rs.length)loc.apps.push(genApp(loc,pick(rs),false));}
  while(loc.apps.length>8){const i=loc.apps.findIndex(a=>!a.hh);loc.apps.splice(i<0?0:i,1);}
  if(loc.autoHire&&(loc.staff.lead||(S.hq>0&&(loc.want.lead||0)>0)))leadHires(loc);
}
function migrate(){
  S.nextE=S.nextE||1;S.nextA=S.nextA||1;
  if(!S.speedSet){S.speed=0.5;S.speedSet=1;}
  S.meta=S.meta||newMeta();S.meta.perks=S.meta.perks||{};S.meta.ach=S.meta.ach||{};S.flags=S.flags||{};S.rushKey=S.rushKey||'';S.contract=S.contract||{type:'tag',until:0};S.cev=S.cev||[];S.comps=S.comps||[];S.repay=S.repay||[];S.quests=S.quests||[];
  if(S.card===undefined)S.card=null;if(S.tester===undefined)S.tester=null;if(!S.wx)wxInit();
  for(const loc of S.locs){
    if(!loc.team){loc.team=[];for(const R of ROLES)for(let i=0;i<(loc.staff[R.id]||0);i++)loc.team.push({id:S.nextE++,name:rndName(),role:R.id,sk:1,tr:'',pay:wage(loc,R.id),day:S.day-5,trKnown:true,sickUntil:0,absent:false,leaveDay:0});}
    loc.combos=loc.combos||[];loc.nextCb=loc.nextCb||1;
    addExtras(loc);
    if(!loc.vegAdded){for(const P of PRODS)if(P.diet&&P.t<=loc.tier&&!loc.menu[P.id])loc.menu[P.id]={on:false,price:defPrice(loc,P),q:1,p:1};loc.vegAdded=1;addExtras(loc);}
    loc.reviews=loc.reviews||[];loc.stars=loc.stars||0;if(loc.sig===undefined)loc.sig=null;if(loc.sigDev===undefined)loc.sigDev=null;loc.dev=loc.dev||{};if(loc.devIng===undefined)loc.devIng=null;loc.popup=loc.popup||0;loc.team.forEach(e=>{if(e.mood==null)e.mood=70;if(e.rar==null)e.rar=0;if(!e.at)e.at=genAttrs(e.sk,e.rar||0,e.tr);});
    loc.reg=loc.reg||0;if(loc.regS===undefined)loc.regS=null;loc.regHist=loc.regHist||[];if(loc.regLog===undefined)loc.regLog=null;loc.stamp=!!loc.stamp;
    loc.soldR=loc.soldR||{};loc.soldC=loc.soldC||{};loc.hist=loc.hist||[];
    loc.ads=loc.ads||(loc.ad?[loc.ad]:[]);loc.ad=null;loc.hunts=loc.hunts||(loc.hunt?[loc.hunt]:[]);loc.hunt=null;
    loc.apps=loc.apps||[];loc.apps.forEach(a=>{if(a.rar==null)a.rar=0;if(!a.at){a.at=genAttrs(a.sk,a.rar,a.tr);a.est=estAttrs(a);}});(loc.tapps||[]).forEach(a=>{if(!a.at){a.at=genAttrs(a.sk,a.rar||0,a.tr);a.est=estAttrs(a);}});if(loc.ad===undefined)loc.ad=null;if(loc.hunt===undefined)loc.hunt=null;loc.autoHire=!!loc.autoHire;
    sync(loc);loc.want=loc.want||Object.assign({},loc.staff);
  }
}
function regDay(loc,c,t){
  const reg=loc.reg||0,s=c.sTarget,share=c.demand>0?c.regD/c.demand:0;
  if(loc.regS==null)loc.regS=s;
  const visR=(t.served+t.lost)*share,lostR=t.lost*share,servW=t.served*(1-share);
  let pr=0;c.foods.forEach(f=>{const r=f.m.ref||f.m.price;pr+=f.s*Math.max(0,f.m.price/r-1);});
  const drop=Math.max(0,loc.regS-s),unserved=visR>0.5?lostR/visR:0,closed=!c.foods.length||!(c.cooks>0)||(c.ek>0&&t.served<1);
  let ch=0.02+drop*0.002+pr*0.25+unserved*0.15+Math.max(0,45-s)*0.003+(closed?0.08:0)+(c.cmp?0.012*c.cmp.str*(c.compF>0.2?1:0.3):0);
  if(loc.stamp)ch*=0.6;if(loc.sig)ch*=1-0.08*loc.sig.r;ch=clamp(ch,0,0.6);
  const conv=clamp((s-45)*0.0009,0,0.03)*(loc.stamp?1.35:1)*(1+0.1*perk('name'))*(bioOn()?1.15:1),gain=servW*conv,lost=reg*ch;
  const why=[];if(pr>0.03)why.push(TR('Preise erhöht'));if(drop>3)why.push(TR('Zufriedenheit gesunken'));if(unserved>0.1)why.push(TR('nicht bedient worden'));if(s<45)why.push(TR('unzufrieden mit Preis und Leistung'));if(closed)why.push(TR('Betrieb geschlossen'));if(c.cmp&&c.compF>0.2)why.push(TR('Konkurrenz ')+c.cmp.n);
  loc.reg=Math.max(0,reg+gain-lost);
  loc.regLog={gain,lost,why,day:S.day};
  loc.regHist.push(Math.round(loc.reg));if(loc.regHist.length>14)loc.regHist.shift();
  loc.regS+=0.15*(s-loc.regS);
  for(const P of PRODS){const m=loc.menu[P.id];if(!m||!m.on||P.t>loc.tier)continue;m.ref=m.ref==null?m.price:m.ref+0.15*(m.price-m.ref);}
  return {gain,lost,served:t.served*share};
}
/* ----- Wetter ----- */
function rollWx(se){const p=WXP[se];let x=Math.random(),k;for(k in p){x-=p[k];if(x<=0)return k;}return k;}
function wxTemp(w){const r=WX[w].t;return Math.round(r[0]+Math.random()*(r[1]-r[0]));}
function wxInit(){const w=rollWx(season());S.wx={w,fc:[rollWx(season(S.day+1)),rollWx(season(S.day+2))],temp:wxTemp(w)};}
function wxDay(){if(!S.wx)wxInit();const n=Math.random()<0.8?S.wx.fc[0]:rollWx(season());S.wx={w:n,fc:[Math.random()<0.85?S.wx.fc[1]:rollWx(season(S.day+1)),rollWx(season(S.day+2))],temp:wxTemp(n)};
  if((S.day-1)%SEASON_LEN===0&&S.day>1)addLog(TR('Der ')+SEASONS[season()]+TR(' beginnt.'),'');}
/* ----- Stadtereignisse und Pop-up ----- */
function tempRoles(loc){return ROLES.filter(R=>R.id!=='lead'&&(R.id==='cook'||maxStaff(loc,R.id)>0||(R.id==='bar'&&mLvl(loc,'bar')>=1)));}
function tempFee(loc,r){return Math.round(wage(loc,r)*0.8);}
function prepEvents(loc){return (S.cev||[]).filter(e=>e.area===loc.area&&!loc.popup&&e.end>=S.day&&e.start-S.day<=9).sort((a,b)=>a.start-b.start);}
function tempDay(offline){
  for(const loc of S.locs){loc.tsearch=loc.tsearch||[];loc.tapps=loc.tapps||[];loc.toffers=loc.toffers||[];const nm=locName(loc);
    // Einsatz beendet: Aushilfen gehen, gute bieten an zu bleiben
    const done=loc.team.filter(e=>e.tempUntil&&S.day>e.tempUntil);
    for(const e of done){loc.team=loc.team.filter(x=>x!==e);
      if(e.tr&&!e.trKnown&&Math.random()<0.5){e.trKnown=true;addLog(nm+TR(': Aushilfe ')+e.name+' '+TRAIT[e.tr].log,TRAIT[e.tr].k);}
      const slot=loc.team.filter(x=>x.role===e.role&&!x.temp).length<maxStaff(loc,e.role);
      if(slot&&!offline&&Math.random()<(moodOf(e)>60?0.6:0.3))loc.toffers.push({id:e.id,name:e.name,role:e.role,sk:e.sk,tr:e.tr,at:e.at,trKnown:e.trKnown,rar:e.rar||0,pay:e.basePay,until:S.day+2});}
    if(done.length){sync(loc);if(loc.toffers.length)addLog(nm+': '+loc.toffers.filter(o=>o.until===S.day+2).map(o=>o.name).join(', ')+TR(' würde gern fest bleiben.'),'good');}
    loc.toffers=loc.toffers.filter(o=>S.day<=o.until);
    // Gebuchte Aushilfen treten zum Ereignis an
    for(const a of loc.tapps.filter(a=>a.booked&&!a.joined&&S.day>=a.start&&S.day<=a.end)){a.joined=true;
      loc.team.push({id:S.nextE++,name:a.name,role:a.role,sk:a.sk,tr:a.tr,rar:a.rar||0,at:a.at,est:a.est,pay:0,basePay:a.pay,temp:true,tempUntil:a.end,day:S.day,trKnown:false,sickUntil:0,absent:false,leaveDay:0,mood:75});}
    sync(loc);
    // Suche läuft bis zum Ereignis, jeden Tag kommen Bewerbungen
    loc.tsearch=loc.tsearch.filter(ts=>{const ev=(S.cev||[]).find(e=>e.id===ts.ev);return ev&&S.day<ev.start;});
    for(const ts of loc.tsearch){const n=Math.random()<0.3?0:Math.random()<0.85?1:2;for(let i=0;i<n;i++){const a=genApp(loc,ts.role,false);a.ev=ts.ev;a.rate=Math.round(a.pay*1.6);loc.tapps.push(a);}}
    loc.tapps=loc.tapps.filter(a=>{if(a.booked)return S.day<=a.end;const ev=(S.cev||[]).find(e=>e.id===a.ev);return ev&&S.day<ev.start;});
  }
}
function cityDay(offline){
  S.cev=(S.cev||[]).filter(e=>e.end>=S.day);
  if(offline||S.cev.filter(e=>e.start>S.day).length>=2||Math.random()>0.12)return;
  const st=S.day+6+Math.floor(Math.random()*3),se=season(st),d=pick(CITYEV.filter(x=>x.season==null||x.season===se));
  const areas=d.areas.filter(a=>!S.cev.some(e=>e.area===a&&e.end>=st-1));if(!areas.length)return;
  const mine=areas.filter(a=>realLocs().some(l=>l.area===a)),area=mine.length&&Math.random()<0.6?pick(mine):pick(areas);S.nextEv=(S.nextEv||0)+1;S.cev.push({id:S.nextEv,type:d.id,area,start:st,end:st+d.len-1});
  addLog(d.n+TR(' im ')+AREAS[area].n+TR(' ab Tag ')+st+(d.len>1?' ('+d.len+' Tage)':'')+'.','');
}
function popCost(ev){return Math.round(150*(Math.min(S.maxTier,1)+1)*(ev.end-ev.start+1));}

/* ----- Abrechnungen für zeitbegrenzte Sachen ----- */
function sumDay(loc,c,t,res,th){const net=t.rev-th-(t.disc||0)-(t.prov||0);
  if(loc.pl&&loc.popup){const P=loc.pl;P.rev+=net;P.staff+=c.wages;P.run+=c.fix-c.wages+t.other;P.served+=t.served;P.lost+=t.lost;if(t.served>0)P.days++;return;}
  const ev=evAt(loc.area);loc.resH=loc.resH||[];loc.evl=loc.evl||{};
  if(!ev){loc.resH.push(res);if(loc.resH.length>10)loc.resH.shift();return;}
  const k=String(ev.id);let L=loc.evl[k];
  if(!L){const H=loc.resH.slice(-5),base=H.length?H.reduce((a,b)=>a+b,0)/H.length:0;L=loc.evl[k]={ev:ev.id,n:evDef(ev).n,end:ev.end,base,res:0,rev:0,served:0,days:0,temps:0,tn:0};}
  const B=(loc.tapps||[]).filter(a=>a.booked&&a.ev===ev.id);L.temps=Math.max(L.temps,B.reduce((a,x)=>a+(x.paid||0),0));L.tn=Math.max(L.tn,B.length);
  L.res+=res;L.rev+=net;L.served+=t.served;L.days++;
  if(S.day>=ev.end){const normal=L.base*L.days,extra=L.res-normal;
    pushReport({ic:'calendar',title:L.n+' · '+locName(loc),sub:L.days+(L.days===1?TR(' Tag'):TR(' Tage'))+' · '+n0(L.served)+TR(' Gäste'),
      rows:[L.tn?['hands',L.tn+(L.tn===1?TR(' Aushilfe'):TR(' Aushilfen')),-L.temps]:null,['cash',TR('Gewinn an den Ereignistagen'),L.res],['clock',TR('Sonst an ')+(L.days===1?TR('so einem Tag'):TR('so vielen Tagen'))+TR(' üblich'),normal,'mute']].filter(Boolean),
      total:extra-L.temps,totalLbl:L.tn?TR('Mehrgewinn nach Aushilfen'):TR('Mehrgewinn durch das Ereignis')});
    delete loc.evl[k];}}
function pushReport(r){S.reports=S.reports||[];S.reports.push(r);if(S.reports.length>5)S.reports.shift();if(typeof telEv==='function')telEv('abrechnung',r.title+': '+Math.round(r.total));}
function popReport(loc,back){const P=loc.pl;if(!P)return;const total=P.rev+back-P.fee-P.goods-P.staff-P.run;
  pushReport({ic:'truck',title:'Pop-up '+AREAS[loc.area].n,sub:P.days+(P.days===1?TR(' Tag'):TR(' Tage'))+' · '+n0(P.served)+TR(' Gäste')+(P.lost>0.5?' · '+n0(P.lost)+' verpasst':''),
    rows:[['rent',TR('Standgebühr'),-P.fee],['box',TR('Ware eingekauft'),-P.goods],['chef',TR('Personal'),-P.staff],P.run>0.5?['bolt',TR('Energie und Sonstiges'),-P.run]:null,['cash',TR('Umsatz'),P.rev],back?['up',TR('Restware zurück'),back]:null].filter(Boolean),
    total,totalLbl:TR('Unterm Strich')});}
function reportHTML(r){const row=x=>'<div class="bill'+(x[3]?' '+x[3]:'')+'">'+ic(x[0])+'<span>'+x[1]+'</span><span class="num '+(x[3]?'':x[2]<0?'neg':'pos')+'">'+eurS(Math.round(x[2]))+'</span></div>';
  return '<div class="small">'+r.sub+'</div><div class="bills">'+r.rows.map(row).join('')+'<div class="bill tot">'+ic(r.total>=0?'trophy':'warn')+'<span>'+r.totalLbl+'</span><span class="num '+(r.total>=0?'pos':'neg')+'">'+eurS(Math.round(r.total))+'</span></div></div>';}
function showReports(){if(ui.modal||!S.reports||!S.reports.length||(ui.rush&&!ui.rush.over)||ui.call)return;const r=S.reports.shift();modal(r.title,reportHTML(r),[[TR('Alles klar'),'mClose','pri']]);}
function closePopups(){
  for(const loc of S.locs.filter(l=>l.popup&&S.day>l.popup)){
    const back=Math.round(loc.stockVal*0.5);S.cash+=back;popReport(loc,back);
    if((loc.popRes||0)>500)S.flags.popup=1;
    addLog(TR('Pop-up-Stand ')+AREAS[loc.area].n+TR(' abgebaut. Ergebnis: ')+eurS(loc.popRes||0)+(back?TR(', Restware ')+eur(back)+' zurück':'')+'.',(loc.popRes||0)>=0?'good':'bad');
    S.locs=S.locs.filter(l=>l!==loc);const f=S.locs[0];if(f){if(S.ownerAt===loc.id)S.ownerAt=f.id;if(S.sel===loc.id)S.sel=f.id;}
  }
}
/* ----- Konkurrenz ----- */
function compDay(offline){
  S.comps=S.comps||[];
  for(const cp of S.comps){
    if(S.day<cp.open)continue;
    if(S.day===cp.open)addLog(cp.n+TR(' hat im ')+AREAS[cp.area].n+TR(' eröffnet.'),'bad');
    cp.str=Math.min(1,cp.str+0.05);
    const loc=realLocs().find(l=>l.area===cp.area);
    if(loc){const c=calc(loc),own=(c.sTarget-55)/45+0.05*(loc.stars||0);cp.hp+=(compAtt(cp)-own)*30-3;cp.hp=Math.min(130,cp.hp);}
    else cp.hp=Math.min(100,cp.hp+1);
    if(!offline&&S.day>=(cp.promoUntil||0)&&Math.random()<0.08){cp.promoUntil=S.day+3;if(loc)addLog(cp.n+TR(' startet im ')+AREAS[cp.area].n+TR(' eine Rabattaktion.'),'bad');}
  }
  S.comps.filter(cp=>cp.hp<=0).forEach(cp=>{const loc=realLocs().find(l=>l.area===cp.area);if(loc){loc.reg=(loc.reg||0)+10;S.flags.compBeaten=1;}addLog(cp.n+TR(' im ')+AREAS[cp.area].n+TR(' gibt auf. Ein Teil der Kundschaft kommt zu dir.'),'good');});
  S.comps=S.comps.filter(cp=>cp.hp>0);
  if(!offline&&S.day>10&&S.comps.length<3&&Math.random()<0.02+0.006*realLocs().length){
    const taken=S.comps.map(c=>c.area),mine=realLocs().map(l=>l.area).filter(a=>!taken.includes(a)),free=AREAS.map((a,i)=>i).filter(i=>!taken.includes(i));
    const area=mine.length&&Math.random()<0.7?pick(mine):(free.length?pick(free):null);if(area==null)return;
    const names=COMPN.filter(n=>!S.comps.some(c=>c.n===n));if(!names.length)return;const n=pick(names);
    S.nextC=(S.nextC||0)+1;S.comps.push({id:S.nextC,n,area,open:S.day+3,att:-0.1+Math.random()*0.45,str:0.35,hp:100,promoUntil:0});
    addLog(n+TR(' eröffnet in drei Tagen im ')+AREAS[area].n+'.','bad');
  }
}
/* ----- Restauranttester ----- */
function testerDay(){
  if(S.tester||S.day<8||Math.random()>0.04)return;
  const el=realLocs().filter(l=>l.tier>=1);if(!el.length)return;
  const loc=pick(el);S.tester={loc:loc.id,t:S.t+DAY*(0.3+Math.random()*1.6),ann:S.day,by:S.day+2};
  addLog(TR('Ein Restauranttester vom Genussführer besucht in den nächsten zwei Tagen unangekündigt einen deiner Betriebe.'),'');
}
function testerVisit(offline){
  const T0=S.tester;S.tester=null;const loc=S.locs.find(l=>l.id===T0.loc);if(!loc)return;
  const c=calc(loc),T=TIERS[loc.tier],bad=problems(loc,c).filter(p=>p.k==='bad').length;
  let sc=0.5*c.sTarget+0.2*loc.ord+(loc.stock>=c.ek*20?10:0)+(loc.queue<c.queueCap*0.5?8:0)+12*clamp(c.avgQ/T.exp,0,1.2)-6*bad+3*(loc.sig?loc.sig.r:0);
  if(!c.foods.length||!(c.cooks>0))sc=0;sc=Math.round(clamp(sc,0,100));
  const old=loc.stars||0,verr=sc<45;let st=sc>=88?3:sc>=76?2:sc>=64?1:0;
  if(verr){st=Math.max(0,old-1);loc.rep=Math.max(0,loc.rep-12);}
  loc.stars=st;loc.test={d:S.day,sc,st,verr};
  const tx=verr?TR('Verriss: ')+(sc<20?TR('Der Betrieb war praktisch nicht arbeitsfähig.'):TR('Unordnung, Wartezeiten und mäßiges Essen.'))+TR(' Ruf −12')+(old>st?TR(', ein Stern weniger'):'')+'.'
    :st>old?TR('Ausgezeichnet mit ')+st+(st===1?TR(' Stern'):TR(' Sternen'))+'. Mehr Laufkundschaft und höhere Zahlungsbereitschaft.':st===old?(st?TR('Die ')+st+(st===1?TR(' Stern'):TR(' Sterne'))+' bleiben.':TR('Ordentlich, aber für einen Stern reicht es nicht.')):TR('Nur noch ')+st+(st===1?TR(' Stern'):TR(' Sterne'))+'.';
  addLog(TR('Restauranttester im ')+locName(loc)+': '+sc+TR(' von 100 Punkten. ')+tx,verr||st<old?'bad':st>old?'good':'');
  if(!offline&&!S.bankrupt)modal(TR('Testergebnis ')+locName(loc),'<p class="num" style="font-size:28px">'+sc+' / 100</p><p class="stars" style="font-size:26px">'+'★'.repeat(st)+'☆'.repeat(3-st)+'</p><p>'+tx+TR('</p><p class="small">Bewertet werden Zufriedenheit der Gäste, Ordnung, Lager, Wartezeit, Qualität und offene Probleme.</p>'),[[TR('Weiter'),'mClose','pri']]);
}
/* ----- Ereigniskarten ----- */
const CARDS={
 billig:{ok:l=>!(S.cheapUntil>=S.day),
  v:()=>({t:TR('Günstiger Großhändler'),x:TR('Ein Händler bietet dir fünf Tage lang Ware 25 % unter Marktpreis an. Woher sie stammt, will er nicht sagen.'),o:[[TR('Annehmen'),TR('alle Betriebe 5 Tage günstiger, Risiko unklar'),0],[TR('Ablehnen'),'',0]]}),
  a:(cd,l,i)=>{if(i===0){S.cheapUntil=S.day+4;S.cheapRisk=Math.random()<0.3;return TR('Du kaufst fünf Tage lang beim günstigen Händler ein.');}return TR('Du bleibst bei deinen Lieferanten.');}},
 influencer:{ok:l=>!l.popup,
  v:(cd,l)=>({t:TR('Food-Influencerin'),x:TR('Eine Influencerin mit 80.000 Followern will im ')+locName(l)+TR(' essen und darüber berichten.'),o:[[TR('Einladen'),TR('Essen aufs Haus, Ausgang offen'),0],[TR('Bezahlten Beitrag buchen'),TR('sicher zwei Tage mehr Andrang'),Math.round(120*Math.pow(l.tier+1,1.5))],[TR('Ablehnen'),'',0]]}),
  a:(cd,l,i)=>{if(i===0){if(Math.random()<0.65){l.boostUntil=S.t+3*DAY;return TR('Die Influencerin ist begeistert: drei Tage lang mehr Andrang im ')+locName(l)+'.';}l.rep=Math.max(0,l.rep-8);return TR('Die Influencerin verreißt das ')+locName(l)+TR('. Ruf −8.');}
    if(i===1){l.boostUntil=S.t+2*DAY;return TR('Der bezahlte Beitrag läuft, zwei Tage mehr Andrang.');}return '';}},
 nachbar:{ok:l=>!l.filter&&!l.popup&&l.tier>=1,
  v:(cd,l)=>({t:TR('Beschwerde der Nachbarn'),x:TR('Anwohner beim ')+locName(l)+TR(' beschweren sich über Küchengeruch und drohen mit dem Ordnungsamt.'),o:[[TR('Abluftfilter einbauen'),TR('dauerhaft Ruhe'),Math.round(350*Math.pow(l.tier+1,1.3))],[TR('Gutscheine verteilen'),TR('beruhigt vielleicht'),Math.round(50*(l.tier+1))],[TR('Ignorieren'),TR('Ordnungsamt droht'),0]]}),
  a:(cd,l,i)=>{if(i===0){l.filter=true;return TR('Der Abluftfilter ist eingebaut, die Nachbarn sind zufrieden.');}
    if(i===1){if(Math.random()<0.6){l.rep=Math.min(100,l.rep+2);l.reg=(l.reg||0)+3;return TR('Die Nachbarn sind versöhnt und kommen sogar essen.');}return TR('Die Gutscheine helfen nicht, die Beschwerden gehen weiter.');}
    if(Math.random()<0.5){const f=300*(l.tier+1);S.cash-=f;l.today.other+=f;l.rep=Math.max(0,l.rep-5);return TR('Das Ordnungsamt verhängt ')+eur(f)+TR(' Bußgeld im ')+locName(l)+TR('. Ruf −5.');}return TR('Die Nachbarn beruhigen sich von selbst.');}},
 vorschuss:{ok:l=>l.team.some(e=>!e.temp&&!e.leaveDay),init:(cd,l)=>{const e=pick(l.team.filter(e=>!e.temp&&!e.leaveDay));cd.data={e:e.id,amt:e.pay*3};},
  v:(cd,l)=>{const e=l.team.find(x=>x.id===cd.data.e);return {t:TR('Bitte um Vorschuss'),x:(e?e.name+' ('+roleName(e.role)+')':TR('Jemand im Team'))+TR(' bittet um einen Vorschuss von ')+eur(cd.data.amt)+TR(' wegen einer Autoreparatur.'),o:[[TR('Vorschuss geben'),TR('Stimmung steigt, Rückzahlung nicht sicher'),cd.data.amt],[TR('Ablehnen'),TR('Stimmung sinkt'),0]]};},
  a:(cd,l,i)=>{const e=l.team.find(x=>x.id===cd.data.e);if(!e)return '';if(i===0){e.mood=Math.min(100,moodOf(e)+15);S.repay.push({d:S.day+5,amt:cd.data.amt,p:(e.tr==='dieb'||e.tr==='unzuv')?0.3:0.9,n:e.name});return e.name+TR(' bekommt den Vorschuss und ist dankbar.');}e.mood=Math.max(0,moodOf(e)-15);return e.name+TR(' ist enttäuscht.');}},
 preis:{ok:()=>true,init:cd=>{cd.data={real:Math.random()<0.7};},
  v:()=>({t:TR('Warnung vom Großhandel'),x:TR('Dein Großhändler warnt: In den nächsten Tagen könnten die Einkaufspreise deutlich steigen.'),o:[[TR('Alle Lager jetzt auffüllen'),TR('kauft zum heutigen Preis'),0],[TR('Abwarten'),'',0]]}),
  a:(cd,l,i)=>{if(cd.data.real)S.marketNext={day:S.day+2,mult:1.3,len:3};if(i===0){let n=0;S.locs.forEach(x=>{const c=calc(x);n+=buyStock(x,c.store-x.stock,false);});return TR('Alle Lager aufgefüllt (')+n0(n)+TR(' Einheiten).');}return '';}},
 verein:{ok:l=>!l.popup,
  v:(cd,l)=>({t:TR('Anfrage vom Sportverein'),x:TR('Der Sportverein aus dem ')+AREAS[l.area].n+TR(' sucht Unterstützung für die Jugendmannschaft.'),o:[[TR('Spenden'),TR('Ruf und ein paar Stammkunden'),Math.round(100*Math.pow(l.tier+1,1.3))],[TR('Trikotsponsoring'),TR('20 Tage +10 % Laufkundschaft'),Math.round(450*Math.pow(l.tier+1,1.3))],[TR('Ablehnen'),'',0]]}),
  a:(cd,l,i)=>{if(i===0){l.rep=Math.min(100,l.rep+4);l.reg=(l.reg||0)+5;return TR('Der Verein bedankt sich öffentlich beim ')+locName(l)+'.';}if(i===1){l.sponsor=S.day+20;return TR('Dein Logo steht 20 Tage auf den Trikots.');}return '';}},
 kochshow:{ok:l=>l.team.some(e=>e.role==='cook'&&e.sk>=1&&!e.temp&&active(e)),init:(cd,l)=>{const e=pick(l.team.filter(e=>e.role==='cook'&&e.sk>=1&&!e.temp&&active(e)));cd.data={e:e.id};},
  v:(cd,l)=>{const e=l.team.find(x=>x.id===cd.data.e);return {t:TR('Einladung zur Kochshow'),x:TR('Ein Fernsehsender will ')+(e?e.name:TR('deinen Koch'))+TR(' aus dem ')+locName(l)+TR(' in einer Kochshow sehen. Dafür fehlt ')+(e?e.name:'er')+TR(' einen Tag.'),o:[[TR('Zusagen'),TR('Koch fehlt einen Tag, alle Betriebe +5 Ruf'),0],[TR('Absagen'),'',0]]};},
  a:(cd,l,i)=>{const e=l.team.find(x=>x.id===cd.data.e);if(i===0&&e){e.awayUntil=S.t+DAY;e.mood=Math.min(100,moodOf(e)+10);realLocs().forEach(x=>x.rep=Math.min(100,x.rep+5));l.reg=(l.reg||0)+10;return e.name+TR(' ist im Fernsehen. Alle Betriebe gewinnen an Ruf.');}return '';}},
 portal:{ok:l=>!l.delivery&&l.tier>=1&&!l.popup,
  v:(cd,l)=>({t:TR('Angebot eines Lieferportals'),x:TR('Ein Lieferportal will das ')+locName(l)+TR(' aufnehmen. Mehr Bestellungen, aber auf diese Bestellungen fallen 25 % Provision an.'),o:[[TR('Partnerschaft eingehen'),TR('+15 % Gäste, 25 % Provision'),0],[TR('Ablehnen'),'',0]]}),
  a:(cd,l,i)=>{if(i===0){l.delivery=true;return TR('Das ')+locName(l)+TR(' ist jetzt auf dem Lieferportal. Unter Ausbau kannst du das wieder beenden.');}return '';}}
};
function cardView(cd){const l=S.locs.find(x=>x.id===cd.loc);return l?CARDS[cd.k].v(cd,l):null;}
function cardDay(){
  if(S.card&&S.day>S.card.until){const cd=S.card,l=S.locs.find(x=>x.id===cd.loc);S.card=null;if(l){const V=CARDS[cd.k].v(cd,l),m=CARDS[cd.k].a(cd,l,V.o.length-1);addLog(TR('Keine Antwort auf „')+V.t+TR('“ gilt als „')+V.o[V.o.length-1][0]+'“.'+(m?' '+m:''),'');}}
  if(S.card||S.day<4||Math.random()>0.08)return;
  const L=realLocs(),keys=Object.keys(CARDS);
  for(let i=0;i<8;i++){const k=pick(keys),l=pick(L);if(!CARDS[k].ok(l))continue;const cd={k,loc:l.id,until:S.day+2,data:{}};if(CARDS[k].init)CARDS[k].init(cd,l);S.card=cd;addLog(TR('Entscheidung gefragt: ')+CARDS[k].v(cd,l).t+'.','');return;}
}
/* ----- Aufträge ----- */
function avgProfit(){const h=S.hist.slice(-3);return h.length?h.reduce((a,b)=>a+b,0)/h.length:0;}
function genQuests(){
  S.qDay=S.day;S.quests=[];const L=realLocs(),cand=[];
  const base=Math.round(clamp(Math.abs(avgProfit())*0.12+40,40,25000));S.qBonus=Math.round(base*1.5);
  L.forEach(l=>{const c=calc(l);if(!c.foods.length||!(c.cooks>0))return;
    const fs=c.foods.slice().sort((a,b)=>b.s-a.s),f=fs[Math.floor(Math.random()*Math.min(3,fs.length))],g=Math.min(c.demand,c.cap);
    const y=(l.soldLast&&l.soldLast[f.P.id])||g*f.s;cand.push({k:'sell',loc:l.id,p:f.P.id,n:Math.max(8,Math.ceil(y*1.2))});
    cand.push({k:'serve',loc:l.id,n:Math.max(15,Math.ceil((l.last?l.last.served:g)*1.12))});
    if((l.reg||0)>=10)cand.push({k:'reg',loc:l.id,n:Math.max(2,Math.round(l.reg*0.02+1))});
    cand.push({k:'nolost',loc:l.id});});
  cand.push({k:'ord'},{k:'clean'});const pr=avgProfit();if(pr>20)cand.push({k:'profit',n:Math.ceil(pr*1.2/10)*10});
  for(let i=cand.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]];}
  const used={};for(const q of cand){if(S.quests.length>=3)break;if(used[q.k])continue;used[q.k]=1;q.rew=Math.round(base*(q.k==='sell'||q.k==='serve'?1:1.3));S.quests.push(q);}
}
function questText(q){const l=S.locs.find(x=>x.id===q.loc),a=l?' ('+AREAS[l.area].n+')':'';
  return q.k==='sell'?TR('Verkaufe heute ')+q.n+'× '+P_(q.p).n+a:q.k==='serve'?TR('Bediene heute ')+q.n+TR(' Gäste')+a:q.k==='reg'?TR('Gewinne heute netto ')+q.n+TR(' Stammkunden')+a:q.k==='nolost'?TR('Höchstens 3 % der Gäste gehen unbedient')+a:q.k==='ord'?TR('Ordnung in allen Betrieben über 75 % zum Tagesabschluss'):q.k==='clean'?TR('Kein rotes Problem zum Tagesabschluss'):TR('Tagesergebnis der Firma über ')+eur(q.n);}
function questProg(q){const l=S.locs.find(x=>x.id===q.loc);if(q.k==='sell')return l?(l.sold[q.p]||0)/q.n:0;if(q.k==='serve')return l?l.today.served/q.n:0;return null;}
function questWin(q){q.done=true;S.cash+=q.rew;const l=S.locs.find(x=>x.id===q.loc);if(l)l.rep=Math.min(100,l.rep+1);addLog(TR('Auftrag erledigt: ')+questText(q)+'. '+eurS(q.rew),'good');}
function questLive(){for(const q of S.quests||[]){if(q.done||q.fail)continue;const p=questProg(q);if(p!=null&&p>=1)questWin(q);}}
function questEnd(){
  if(S.qDay!==S.day)return;
  for(const q of S.quests||[]){if(q.done||q.fail)continue;const l=S.locs.find(x=>x.id===q.loc),L=l&&l.last;let ok=false;
    if(q.k==='reg')ok=L&&L.regGain-L.regLost>=q.n;else if(q.k==='nolost')ok=L&&L.served>5&&L.lost<=(L.served+L.lost)*0.03;
    else if(q.k==='ord')ok=realLocs().every(x=>x.ord>=75);else if(q.k==='clean')ok=S.locs.every(x=>!problems(x).some(p=>p.k==='bad'));
    else if(q.k==='profit')ok=S.lastDay&&S.lastDay.total>=q.n;
    if(ok)questWin(q);else q.fail=true;}
  const Q=S.quests||[];if(Q.length&&Q.every(q=>q.done)){S.qStreak=(S.qStreak||0)+1;S.cash+=S.qBonus||0;addLog(TR('Alle Aufträge erledigt, Bonus ')+eurS(S.qBonus||0)+TR('. Serie: ')+S.qStreak+TR(' Tage.'),'good');}else S.qStreak=0;
}
/* ----- Bewertungen ----- */
function genReviews(loc,c){
  const l=loc.last;if(!l||l.served<5)return;
  const T=TIERS[loc.tier],w=wxToday();loc.reviews=loc.reviews||[];
  for(let i=0;i<(l.served>150?3:2);i++){
    const asp=[],fs=c.foods.filter(f=>f.s>0.08),f=fs.length?pick(fs):null;
    if(f){if(f.r<0.92)asp.push([-1-(0.92-f.r)*5,f.P.n+TR(' für ')+eur2(f.m.price)+TR('? Ganz schön happig.')]);else if(f.r>1.25)asp.push([0.8,f.P.n+TR(' für ')+eur2(f.m.price)+TR(', da kann man nicht meckern.')]);
      if(f.m.p<0.88)asp.push([-1,TR('Die Portion ')+f.P.n+TR(' war ziemlich mickrig.')]);else if(f.m.p>1.2)asp.push([0.8,TR('Riesige Portion, ich bin pappsatt.')]);}
    if(c.avgQ<T.exp-0.05)asp.push([-1.2,TR('Für ein ')+T.n+TR(' hätte ich mehr erwartet.')]);else if(c.avgQ>=T.exp+0.9)asp.push([1,TR('Man schmeckt die guten Zutaten.')]);
    if(l.lost>l.served*0.1)asp.push([-1.5,TR('Ewig angestanden, einige sind wieder gegangen.')]);else if(c.demand>c.cap*1.02&&f)asp.push([-1,f.P.n+TR(' kam lauwarm, die Küche war wohl überlastet.')]);
    if(l.soldOut)asp.push([-1.4,TR('Am Abend war schon alles ausverkauft.')]);
    if(loc.ord<55)asp.push([-1.3,pick([TR('Tische klebten, der Boden war schmutzig.'),TR('Die Toiletten waren in einem üblen Zustand.')])]);else if(loc.ord>88)asp.push([0.6,TR('Alles blitzsauber.')]);
    const st=loc.team.filter(e=>e.role===(loc.tier>=2?'serv':'cook'));if(st.length){const md=st.reduce((a,e)=>a+moodOf(e),0)/st.length;if(md<40)asp.push([-1,loc.tier>=2?TR('Die Bedienung wirkte genervt.'):TR('Der Verkäufer war ziemlich mürrisch.')]);else if(md>82)asp.push([0.8,TR('Super freundliches Personal!')]);}
    if(c.segs){const v=c.segs[1],vg=c.segs[2];if(Math.random()<(v.w+vg.w)*2){
      if(!v.opt)asp.push([-1.3,pick([TR('Als Vegetarierin gab es für mich nur Pommes.'),TR('Kein einziges vegetarisches Gericht, wir sind weitergezogen.')])]);
      else if(!vg.opt&&Math.random()<0.5)asp.push([-1,TR('Für Veganer leider nichts dabei.')]);
      else{const vf=c.foods.filter(x=>x.P.diet&&!x.P.side);const lq=vf.find(x=>x.m.q===1);
        if(lq)asp.push([-0.8,lq.P.n+TR(' schmeckt nach Fertigprodukt.')]);else if(vf.length>=2)asp.push([1,pick([TR('Endlich richtig gute vegetarische Gerichte!'),TR('Tolle vegane Auswahl, komme wieder.')])]);}}}
    if(f&&f.cs&&f.cs.length){const k=f.cs[0];if(k.save>=0.1&&Math.random()<k.eff)asp.push([0.6,TR('Das ')+comboName(k.cb)+TR(' ist ein guter Deal.')]);else if(k.save<0)asp.push([-0.8,TR('Das ')+comboName(k.cb)+TR(' ist teurer als alles einzeln. Merkt doch jeder.')]);}
    if(loc.sig)asp.push([0.6+0.3*loc.sig.r,TR('Das ')+loc.sig.name+TR(' ist der Hammer!')]);
    if(f&&f.xs&&f.xs.length){const bx=f.xs.slice().sort((a,b)=>a.r-b.r)[0],gx=f.xs.slice().sort((a,b)=>b.r-a.r)[0];
      if(bx.r<0.6)asp.push([-0.9,xName(bx.x,f.P)+TR(' für ')+eur2(bx.o.price)+TR(' extra? Frechheit.')]);else if(gx.r>1.4&&Math.random()<0.5)asp.push([0.5,xName(gx.x,f.P)+TR(' gibt es hier fast geschenkt.')]);}
    if(c.cmp&&c.compF>0.15)asp.push([-0.6,TR('Bei ')+c.cmp.n+TR(' nebenan ist es günstiger.')]);
    if(loc.tier<=1&&(w==='regen'||w==='sturm'||w==='schnee'))asp.push([-0.5,TR('Im ')+(w==='schnee'?TR('Schnee'):TR('Regen'))+TR(' anstehen macht keinen Spaß.')]);
    if(!asp.length)asp.push([0.3,pick([TR('Solide, gerne wieder.'),TR('Nichts Besonderes, aber okay.'),TR('Schnell und lecker.')])]);
    asp.sort((a,b)=>Math.abs(b[0])+Math.random()*0.8-Math.abs(a[0])-Math.random()*0.8);
    const ch=[asp[0]];if(asp[1]&&Math.random()<0.45)ch.push(asp[1]);
    const stars=clamp(Math.round(1+c.sTarget/25+ch.reduce((a,x)=>a+x[0],0)*0.6+(Math.random()-0.5)),1,5);
    loc.reviews.unshift({d:S.day,s:stars,t:ch.map(x=>x[1]).join(' '),n:pick(FN)+' '+pick(LN)[0]+'.'});
  }
  if(loc.reviews.length>8)loc.reviews.length=8;
}
/* ----- Tageswechsel der Welt ----- */
function worldDay(offline){
  wxDay();
  if(S.marketNext&&S.day>=S.marketNext.day){S.market={mult:S.marketNext.mult,until:S.t+S.marketNext.len*DAY,label:TR('Preissteigerung beim Großhandel: Ware 30 % teurer')};addLog(TR('Die Einkaufspreise steigen für ')+S.marketNext.len+TR(' Tage um 30 %.'),'bad');S.marketNext=null;}
  if(S.cheapRisk&&S.day>S.cheapUntil){S.cheapRisk=false;let f=0;realLocs().forEach(l=>{l.rep=Math.max(0,l.rep-12);f+=200*(l.tier+1);});S.cash-=f;addLog(TR('Lebensmittelskandal: Die Billigware war verdorben. Alle Betriebe verlieren Ruf, Bußgeld ')+eur(f)+'.','bad');}
  S.repay=(S.repay||[]).filter(r=>{if(S.day<r.d)return true;if(Math.random()<r.p){S.cash+=r.amt;addLog(r.n+TR(' hat den Vorschuss zurückgezahlt.'),'good');}else addLog(r.n+TR(' zahlt den Vorschuss nicht zurück.'),'bad');return false;});
  if(S.contract&&S.contract.type!=='tag'&&S.day>S.contract.until){addLog(TR('Der Vertrag „')+CONTR[S.contract.type].n+TR('“ ist ausgelaufen, du zahlst wieder Tagespreise.'),'');S.contract={type:'tag',until:0};}
  for(const loc of S.locs){
    if(loc.devIng&&S.day>loc.devIng.day){loc.dev[loc.devIng.p]=1;S.recipes=S.recipes||{};S.recipes[loc.devIng.p]=1;addLog(TR('Das Rezept für ')+P_(loc.devIng.p).n+TR(' ist verfeinert und gilt jetzt in allen Betrieben.'),'good');loc.devIng=null;}
    if(loc.sigDev&&S.day>loc.sigDev.day){const p=loc.sigDev.p,r=loc.sigDev.r||1;loc.sigDev=null;loc.sig={p,r,name:SIGN[p]};addLog(locName(loc)+TR(': Hausgericht „')+SIGN[p]+TR('“ steht mit ')+r+(r===1?TR(' Stern'):TR(' Sternen'))+TR(' auf der Karte.'),'good');}
  }
  tempDay(offline);cityDay(offline);closePopups();compDay(offline);
  if(!offline){cardDay();testerDay();genQuests();}
}
/* ----- Küchenschicht: selbst an Grill, Fritteuse und Herd ----- */
const SHORT={wurst:'Bratwurst',vwurst:TR('Veggie-Wurst'),pommes:TR('Pommes'),burger:'Burger',wrap:TR('Hähnchen-Wrap'),falafel:'Falafel',halloumi:'Halloumi',schnitzel:'Schnitzel',bowl:'Bowl',curry:'Curry',spaetzle:'Spätzle',pasta:'Pasta',risotto:'Risotto',steak:'Steak',fisch:TR('Fisch'),menu3:TR('Menü'),vmenu:TR('Vegan-Menü'),degu:TR('Degustation'),gdeg:TR('Gemüse-Degu'),soft:TR('Softdrink'),bier:TR('Bier'),wein:TR('Wein'),cocktail:'Cocktail'};
const COOK={wurst:['grill',4],vwurst:['grill',4],burger:['grill',5],halloumi:['grill',4],steak:['grill',7],schnitzel:['fry',5],pommes:['fry',3.5],falafel:['fry',3.5],curry:['pot',6],spaetzle:['pot',5],pasta:['pot',5],risotto:['pot',7],fisch:['pot',6],menu3:['pot',8],vmenu:['pot',8],degu:['pot',9],gdeg:['pot',9]};
const STN={grill:'Grill',fry:TR('Fritteuse'),pot:TR('Herd')},SHIFT_MS=60000;
function rushWin(){return 'x';}
function rushAvail(loc){if(S.paused||S.bankrupt||ui.rush||S.rushKey===S.day)return false;const c=calc(loc);return c.foods.length>0&&loc.stock>=c.ek*8;}
function rushDiff(loc,c){return {sp:clamp(4.6-0.2*loc.tier-0.6*(c.cap>0?c.demand/c.cap-0.8:0),2.4,5),maxI:1+Math.min(2,Math.round(loc.tier*0.5))};}
function rushSlots(loc){const L=mLvl(loc,'herd');return {grill:3+(L>=2?1:0),fry:2+(L>=3?1:0),pot:2+(L>=3?1:0)};}
function rushPick(c){const tot=c.foods.reduce((a,f)=>a+f.s,0);let x=Math.random()*(tot+(c.drinks.length?0.3:0));
  for(const f of c.foods){x-=f.s;if(x<=0)return f.P.id;}if(c.drinks.length){let y=Math.random();for(const f of c.drinks){y-=f.s;if(y<=0)return f.P.id;}return c.drinks[0].P.id;}return c.foods[0].P.id;}
function rushSpawn(now){const R=ui.rush,loc=S.locs.find(l=>l.id===R.loc);if(!loc)return;const c=calc(loc),D=rushDiff(loc,c);
  if(R.tk.filter(t=>!t.out).length<4){const n=1+Math.floor(Math.random()*D.maxI),it={};
    for(let i=0;i<n;i++){const p=rushPick(c);it[p]=(it[p]||0)+1;const f=c.all[p];if(f&&f.cs&&f.cs.length){const k=f.cs[0];if(Math.random()<k.eff){if(k.cb.side==='pommes')it.pommes=(it.pommes||0)+1;if(k.cb.drink)it[k.cb.drink]=(it[k.cb.drink]||0)+1;}}}
    const items=Object.keys(it).map(p=>({p,n:it[p],d:0})),cnt=items.reduce((a,b)=>a+b.n,0),mx=Math.max(0,...items.map(x=>COOK[x.p]?COOK[x.p][1]:0));
    R.tk.push({id:R.seq++,no:loc.tier>=2?TR('Tisch ')+(1+Math.floor(Math.random()*24)):TR('Bon ')+(100+R.seq),items,t0:now,dur:(10+3.2*cnt+mx)*1000,veg:items.every(x=>P_(x.p).diet||P_(x.p).drink)});R.dirty=1;}
  R.next=now+D.sp*1000*(0.75+Math.random()*0.5)*Math.max(0.65,1-0.03*R.combo);}
function rushFlash(R,key,k,msg){R.flash={key,k,t:Date.now(),msg:msg||''};R.dirty=1;sfx(k==='ok'?(msg?'ding':'pop'):k==='bad'?'burn':'tap');}
function rushLoc(){const R=ui.rush;return R&&S.locs.find(l=>l.id===R.loc);}
function rushWaste(loc,p){const x=calc(loc).all[p];if(x)useStock(loc,x.ek,'waste');}
function rushDeliver(R,loc,now){
  for(const it of R.pass.slice()){const tk=R.tk.find(t=>!t.out&&t.items.some(x=>x.p===it.p&&x.d<x.n));if(!tk)continue;
    const x=tk.items.find(x=>x.p===it.p&&x.d<x.n);x.d++;tk.perf=(tk.perf||0)+(it.perfect?1:0);tk.cnt=(tk.cnt||0)+1;R.pass.splice(R.pass.indexOf(it),1);R.dirty=1;
    if(tk.items.every(x=>x.d>=x.n)){tk.out=now;tk.ok=1;R.done++;R.combo++;R.best=Math.max(R.best,R.combo);
      const left=clamp(1-(now-tk.t0)/tk.dur,0,1),val=tk.items.reduce((a,x)=>a+x.n*loc.menu[x.p].price,0),ps=(tk.perf||0)/Math.max(1,tk.cnt);
      const tip=val*(0.4+0.06*Math.min(R.combo,10))*(0.6+0.4*left)*(1+0.25*ps)*(R.ev?1.5:1);
      S.cash+=tip;loc.today.rev+=tip;R.tips+=tip;loc.rushUntil=S.t+5;loc.rushMul=1.2+0.025*Math.min(R.combo,12);}}}
function rushTap(p){const R=ui.rush,loc=rushLoc();if(!R||R.over||!loc)return;const now=Date.now(),ck=COOK[p];
  if(!ck){if(R.pass.length>=6){rushFlash(R,'pass','bad',TR('Der Pass ist voll'));renderRush();return;}R.pass.push({p,t0:now,perfect:true});rushFlash(R,'p:'+p,'ok');rushDeliver(R,loc,now);renderRush();return;}
  const arr=R.slots[ck[0]],i=arr.findIndex(z=>!z);
  if(i<0){rushFlash(R,'stn:'+ck[0],'bad',STN[ck[0]]+TR(' ist voll'));renderRush();return;}
  arr[i]={p,t0:now,T:ck[1]*1000};rushFlash(R,'p:'+p,'ok');renderRush();}
function rushSlotTap(key){const R=ui.rush,loc=rushLoc();if(!R||R.over||!loc)return;const [st,ii]=key.split(':'),i=+ii,z=R.slots[st]&&R.slots[st][i];if(!z)return;
  const now=Date.now(),f=(now-z.t0)/z.T;
  if(f<0.85){rushFlash(R,key,'bad',TR('noch roh'));renderRush();return;}
  R.slots[st][i]=null;
  if(f>1.35){R.burnt++;R.combo=0;rushWaste(loc,z.p);rushFlash(R,key,'bad',TR('verbrannt'));renderRush();return;}
  const pf=f>=1&&f<=1.3;if(pf)R.perfect++;if(R.pass.length>=6){const o=R.pass.shift();rushWaste(loc,o.p);}
  R.pass.push({p:z.p,t0:now,perfect:pf});rushFlash(R,key,'ok',pf?TR('perfekt'):'');rushDeliver(R,loc,now);renderRush();}
function rushEnd(){const R=ui.rush;if(!R||R.over)return;R.over=true;sfx('jingle');const loc=rushLoc();
  if(loc){const rg=clamp(R.done*0.12-R.missed*0.3-R.burnt*0.05,-5,5);loc.rep=clamp(loc.rep+rg,0,100);R.rep=rg;const nr=Math.max(0,R.done*0.15*(R.missed<=R.done*0.15?1:0.4));loc.reg=(loc.reg||0)+nr;R.reg=nr;
    if(R.missed<=R.done*0.1&&R.done>=5){loc.team.forEach(e=>e.mood=Math.min(100,moodOf(e)+4));R.team=1;}}
  if(R.best>=10)S.flags.combo10=1;if(R.done>=12&&!R.missed&&!R.burnt)S.flags.perfect=1;
  S.rushBest=Math.max(S.rushBest||0,R.done);
  S.log.unshift({d:S.day,m:TR('Küchenschicht: ')+R.done+TR(' Bons raus, ')+R.perfect+TR(' perfekt gegart, Trinkgeld ')+eurS(R.tips)+'.',k:'good'});
  checkAch();if(typeof telRush==='function')telRush(R);R.dirty=1;renderRush();}
function rushLoop(){const R=ui.rush;if(!R)return;const now=Date.now(),loc=rushLoc();
  if(!R.over){if(now>=R.end){rushEnd();}else{
    if(now>=R.next)rushSpawn(now);
    for(const t of R.tk){if(!t.out&&now-t.t0>=t.dur){t.out=now;t.ok=0;R.missed++;R.combo=0;if(loc){loc.rep=Math.max(0,loc.rep-0.4);loc.today.lost+=1;}R.dirty=1;}}
    const n0l=R.tk.length;R.tk=R.tk.filter(t=>!t.out||now-t.out<450);if(R.tk.length!==n0l)R.dirty=1;
    for(const st in R.slots)R.slots[st].forEach((z,i)=>{if(z&&(now-z.t0)/z.T>1.9){R.slots[st][i]=null;R.burnt++;R.combo=0;if(loc)rushWaste(loc,z.p);rushFlash(R,st+':'+i,'bad',TR('verbrannt'));}});
    const np=R.pass.length;R.pass=R.pass.filter(it=>{if(now-it.t0>15000){if(loc)rushWaste(loc,it.p);R.cold++;return false;}return true;});if(R.pass.length!==np)R.dirty=1;
    if(R.flash&&now-R.flash.t>800&&!R.flashCleared){R.flashCleared=1;R.dirty=1;}
    if(R.dirty)renderRush();
    const el=document.getElementById('rush');
    el.querySelectorAll('[data-tk]').forEach(b=>{const t=R.tk.find(x=>x.id===+b.dataset.tk);if(!t||t.out)return;const f=clamp(1-(now-t.t0)/t.dur,0,1);const i=b.querySelector('.tk-t i');if(i){i.style.width=(f*100).toFixed(1)+'%';i.style.background=f>0.5?'#3DBE7A':f>0.25?'#F2B33D':'#E5484D';}b.classList.toggle('late',f<0.25);});
    el.querySelectorAll('[data-rs]').forEach(b=>{const [st,i]=b.dataset.rs.split(':'),z=R.slots[st]&&R.slots[st][+i];if(!z)return;const f=(now-z.t0)/z.T,bar=b.querySelector('.sb i');
      const cls=f<0.85?'raw':f<1?'almost':f<=1.3?'perfect':f<=1.35?'late':'burnt';if(bar)bar.style.width=(Math.min(f/1.35,1)*100).toFixed(1)+'%';if(b.dataset.st!==cls){b.dataset.st=cls;b.className='slot '+cls;const lb=b.querySelector('.sl-s');if(lb)lb.textContent=cls==='raw'?TR('gart …'):cls==='almost'?'fast':cls==='perfect'?'jetzt!':cls==='late'?'schnell!':'verbrennt';}});
    el.querySelectorAll('[data-pi]').forEach(b=>{const it=R.pass[+b.dataset.pi];if(!it)return;const i=b.querySelector('i');if(i)i.style.width=(clamp(1-(now-it.t0)/15000,0,1)*100).toFixed(0)+'%';});
    const tb=el.querySelector('.rt-time i');if(tb)tb.style.width=(clamp((R.end-now)/SHIFT_MS,0,1)*100).toFixed(1)+'%';
    const tt=el.querySelector('.rt-sec');if(tt)tt.textContent=Math.ceil((R.end-now)/1000)+' s';}}
  requestAnimationFrame(rushLoop);}
function renderRush(){const R=ui.rush,el=document.getElementById('rush');if(!R||!el)return;R.dirty=0;const loc=rushLoc();if(!loc){ACT.rushClose();return;}
  if(R.over){el.innerHTML=TR('<div class="rush-res"><div class="rr-k">Schicht vorbei</div><h2>')+(R.missed===0&&R.burnt===0&&R.done>=12?TR('Perfekte Schicht!'):R.done>=R.missed*4?TR('Gut gemacht, Küche!'):TR('Puh, geschafft.'))+'</h2>'+
    '<div class="rr-grid"><div><b>'+R.done+TR('</b><span>Bons raus</span></div><div><b>×')+R.best+TR('</b><span>beste Kombo</span></div><div><b>')+R.perfect+TR('</b><span>perfekt gegart</span></div><div><b>')+(R.missed+R.burnt)+TR('</b><span>verpasst oder verbrannt</span></div></div>')+
    TR('<div class="rr-sum"><div class="l"><span>Trinkgeld</span><span>')+eurS(R.tips)+TR('</span></div><div class="l"><span>Ruf</span><span>')+(R.rep>=0?'+':'−')+Math.abs(R.rep).toFixed(1).replace('.',',')+TR('</span></div><div class="l"><span>Neue Stammkunden</span><span>+')+n0(R.reg)+'</span></div>'+(R.team?TR('<div class="l"><span>Teamstimmung</span><span>+4</span></div>'):'')+'</div>'+
    TR('<p class="rr-hint">Einmal pro Spieltag kannst du in einem Betrieb selbst eine Schicht in der Küche übernehmen. Bei Stadtereignissen gibt es anderthalbfach Trinkgeld.</p>')+
    TR('<button type="button" class="rbtn" data-a="rushClose">Zurück in den Laden</button></div>');return;}
  const c=calc(loc),open={};R.tk.forEach(t=>{if(!t.out)t.items.forEach(x=>{if(x.d<x.n)open[x.p]=(open[x.p]||0)+x.n-x.d;});});
  R.pass.forEach(it=>{if(open[it.p])open[it.p]--;});for(const st in R.slots)R.slots[st].forEach(z=>{if(z&&open[z.p])open[z.p]--;});
  const fl=R.flash&&Date.now()-R.flash.t<800?R.flash:null;R.flashCleared=fl?0:1;
  const items=c.foods.concat(c.drinks),used={};items.forEach(f=>{const k=COOK[f.P.id];if(k)used[k[0]]=1;});
  const tks=R.tk.map(t=>'<div class="tk'+(t.out?(t.ok?' out':' gone'):'')+'" data-tk="'+t.id+'"><div class="tk-h"><span>'+t.no+'</span>'+(t.veg?'<span class="tk-v">veggie</span>':'')+'</div>'+t.items.map(x=>'<div class="tk-i'+(x.d>=x.n?' done':'')+'"><span>'+x.n+'× '+(SHORT[x.p]||P_(x.p).n)+'</span>'+(x.n>1&&x.d<x.n?'<b>'+x.d+'/'+x.n+'</b>':'')+'</div>').join('')+'<div class="tk-t"><i></i></div>'+(t.out?'<div class="stamp">'+(t.ok?'RAUS':'WEG')+'</div>':'')+'</div>').join('');
  let stn='';for(const st of ['grill','fry','pot']){if(!used[st])continue;const sf=fl&&fl.key==='stn:'+st?' '+fl.k:'';
    stn+='<div class="stn'+sf+'"><div class="stn-h">'+img('st/'+st,'stimg')+STN[st]+'</div><div class="slots">'+R.slots[st].map((z,i)=>{const key=st+':'+i,f=fl&&fl.key===key?'<span class="sl-f '+fl.k+'">'+fl.msg+'</span>':'';
      return z?'<button type="button" class="slot raw" data-rs="'+key+'" data-st="raw"><span class="sl-n">'+(SHORT[z.p]||P_(z.p).n)+TR('</span><span class="sb"><i></i></span><span class="sl-s">gart …</span>')+f+'</button>':'<div class="slot empty">'+(f||TR('frei'))+'</div>';}).join('')+'</div></div>';}
  const pass='<div class="passrow'+(fl&&fl.key==='pass'?' bad':'')+'"><span class="pass-l">Pass</span>'+(R.pass.length?R.pass.map((it,i)=>'<span class="pitem'+(it.perfect?' pf':'')+'" data-pi="'+i+'">'+(SHORT[it.p]||P_(it.p).n)+'<i></i></span>').join(''):TR('<span class="pass-e">Fertiges landet hier und geht an den ältesten Bon.</span>'))+'</div>';
  const tiles=items.map(f=>{const P=f.P,k=COOK[P.id],cat=P.drink?'d':P.diet==='vegan'?'vg':P.diet?'v':'m',ff=fl&&fl.key==='p:'+P.id?' pop':'';
    return '<button type="button" class="tile c-'+cat+ff+'" data-rt="'+P.id+'">'+img('dish/'+P.id,'tlimg')+'<span class="tl-n">'+(SHORT[P.id]||P.n)+'</span><span class="tl-k">'+(k?({grill:'Grill',fry:TR('Fritte'),pot:TR('Herd')})[k[0]]+' '+String(k[1]).replace('.',',')+' s':TR('sofort'))+'</span>'+(open[P.id]>0?'<span class="tl-c">'+open[P.id]+'</span>':'')+'</button>';}).join('');
  el.innerHTML=TR('<div class="rush-top"><div class="rt-row"><div class="rt-title">Küchenschicht · ')+locName(loc)+(R.ev?TR(' · Ereignis'):'')+'</div><div class="rt-sec"></div></div><div class="rt-time"><i></i></div>'+
    '<div class="rt-stats"><div><b class="'+(R.combo>=5?'hot':'')+'">×'+R.combo+TR('</b><span>Kombo</span></div><div><b>')+eurS(R.tips)+TR('</b><span>Trinkgeld</span></div><div><b>')+R.done+TR('</b><span>Bons raus</span></div><div><b>')+(R.missed+R.burnt)+TR('</b><span>verpasst</span></div></div></div>')+
    '<div class="rail"><div class="rail-bar"></div><div class="tks">'+(tks||TR('<div class="tk-empty">Gleich kommen die ersten Bons …</div>'))+'</div></div>'+
    '<div class="kitchen">'+stn+pass+'</div>'+
    TR('<div class="pass-h">Gericht antippen = auflegen. Auf dem Grill antippen, wenn der Balken grün ist. Getränke und kalte Gerichte gehen sofort raus. Du kannst vorkochen.</div><div class="pass">')+tiles+'</div>'+
    TR('<div class="rush-foot"><button type="button" class="rbtn ghost" data-a="rushQuit">Schicht beenden</button></div>');
}
function rushBanner(loc){if(!rushAvail(loc))return '';const ev=evAt(loc.area);
  return '<div class="rbanner'+(ev?'':' calm')+'"><div class="grow"><strong>'+(ev?evDef(ev).n+': Küchenschicht!':TR('Küchenschicht'))+'</strong>'+chips(ev?[chip('flame',TR('Grill · Fritte · Herd')),chip('cash',TR('×1,5 Trinkgeld'))]:[chip('flame',TR('Grill · Fritte · Herd')),chip('cash',TR('Trinkgeld')),chip('star',TR('Ruf')),chip('heart',TR('Stammkunden')),chip('clock',TR('1× pro Tag'))])+'</div>'+B(TR('Schicht starten'),'rushStart',{id:loc.id},{cls:'pri'})+'</div>';}
/* ----- Erfolge ----- */
const ACH=[
 {id:'gewinn',n:TR('Läuft!'),d:TR('Einen Tag mit Gewinn abschließen'),ep:1,ok:()=>S.lastDay&&S.lastDay.total>0},
 {id:'truck',n:TR('Auf Rädern'),d:TR('Einen Foodtruck betreiben'),ep:1,ok:()=>S.maxTier>=1},
 {id:'imbiss',n:TR('Fester Standort'),d:TR('Einen Imbiss betreiben'),ep:1,ok:()=>S.maxTier>=2},
 {id:'bistro',n:TR('Bistro-Besitzer'),d:TR('Ein Bistro betreiben'),ep:2,ok:()=>S.maxTier>=3},
 {id:'restaurant',n:TR('Gastronom'),d:TR('Ein Restaurant betreiben'),ep:2,ok:()=>S.maxTier>=4},
 {id:'gourmet',n:TR('Haute Cuisine'),d:TR('Ein Gourmet-Restaurant betreiben'),ep:3,ok:()=>S.maxTier>=5},
 {id:'filiale',n:TR('Zweites Standbein'),d:TR('Zwei Betriebe gleichzeitig führen'),ep:1,ok:()=>realLocs().length>=2},
 {id:'kette',n:TR('Kleine Kette'),d:TR('Fünf Betriebe gleichzeitig führen'),ep:2,ok:()=>realLocs().length>=5},
 {id:'imperium',n:TR('Imperium'),d:TR('Zehn Betriebe gleichzeitig führen'),ep:3,ok:()=>realLocs().length>=10},
 {id:'tag1k',n:TR('Vierstellig'),d:TR('Ein Tagesergebnis über 1.000 €'),ep:1,ok:()=>S.lastDay&&S.lastDay.total>=1000},
 {id:'tag10k',n:TR('Fünfstellig'),d:TR('Ein Tagesergebnis über 10.000 €'),ep:2,ok:()=>S.lastDay&&S.lastDay.total>=10000},
 {id:'tag100k',n:TR('Goldgrube'),d:TR('Ein Tagesergebnis über 100.000 €'),ep:3,ok:()=>S.lastDay&&S.lastDay.total>=100000},
 {id:'million',n:TR('Millionär'),d:TR('Firmenwert über 1 Mio. €'),ep:3,ok:()=>companyValue()>=1e6},
 {id:'stamm',n:TR('Wie zu Hause'),d:TR('100 Stammkunden in einem Betrieb'),ep:2,ok:()=>S.locs.some(l=>(l.reg||0)>=100)},
 {id:'stern',n:TR('Ausgezeichnet'),d:TR('Einen Stern vom Restauranttester'),ep:1,ok:()=>S.locs.some(l=>l.stars>=1)},
 {id:'sterne3',n:TR('Drei Sterne'),d:TR('Drei Sterne für einen Betrieb'),ep:3,ok:()=>S.locs.some(l=>l.stars>=3)},
 {id:'konkurrenz',n:TR('Platzhirsch'),d:TR('Einen Konkurrenten zum Aufgeben bringen'),ep:2,ok:()=>S.flags.compBeaten},
 {id:'legende',n:TR('Legendärer Fang'),d:TR('Eine legendäre Fachkraft einstellen'),ep:1,ok:()=>S.flags.legend},
 {id:'ultra',n:TR('Einhorn'),d:TR('Eine Ultra-Fachkraft einstellen'),ep:3,ok:()=>S.flags.ultra},
 {id:'serie',n:TR('Zuverlässig'),d:TR('Sieben Tage in Folge alle Aufträge erledigen'),ep:2,ok:()=>(S.qStreak||0)>=7},
 {id:'kombo',n:TR('Am Grill zu Hause'),d:TR('Kombo ×10 in einer Küchenschicht'),ep:1,ok:()=>S.flags.combo10},
 {id:TR('perfekt'),n:TR('Perfekte Schicht'),d:TR('Mindestens 12 Bons, nichts verbrannt, nichts verpasst'),ep:2,ok:()=>S.flags.perfect},
 {id:'hausgericht',n:TR('Signature Dish'),d:TR('Ein Hausgericht mit drei Sternen'),ep:2,ok:()=>S.locs.some(l=>l.sig&&l.sig.r>=3)},
 {id:'gruen',n:TR('Grüne Küche'),d:TR('Drei vegane Hauptgerichte auf einer Karte'),ep:1,ok:()=>S.locs.some(l=>PRODS.filter(P=>P.diet==='vegan'&&!P.side&&P.t<=l.tier&&l.menu[P.id]&&l.menu[P.id].on).length>=3)},
 {id:'popup',n:TR('Pop-up-Profi'),d:TR('Mit einem Pop-up-Stand über 500 € verdienen'),ep:1,ok:()=>S.flags.popup},
 {id:'comeback',n:'Comeback',d:TR('Nach einer Mahnung wieder ins Plus kommen'),ep:2,ok:()=>S.flags.comeback},
 {id:'jahr',n:TR('Ein Jahr im Geschäft'),d:TR('60 Spieltage überstehen'),ep:2,ok:()=>S.day>60}];
function checkAch(){if(!S||!S.meta)return;const A=S.meta.ach=S.meta.ach||{};S.flags=S.flags||{};
  for(const a of ACH){if(A[a.id])continue;let ok=false;try{ok=!!a.ok();}catch(e){}
    if(ok){A[a.id]=S.day;S.meta.ep+=a.ep;sfx('jingle');S.log.unshift({d:S.day,m:TR('Erfolg „')+a.n+TR('“ freigeschaltet: ')+a.d+'. +'+a.ep+TR(' Erfahrung'),k:'good'});toast(TR('Erfolg: ')+a.n+' · +'+a.ep+TR(' Erfahrung'),'ach');}}}
function endDay(offline){
  let total=0;
  for(const loc of S.locs){
    if(offline&&!loc.staff.lead)continue;
    const c=calc(loc),t=loc.today;
    const th=t.theft||0,res=t.rev-th-(t.disc||0)-(t.prov||0)-t.cogs-t.waste-t.other-c.fix;if(loc.popup)loc.popRes=(loc.popRes||0)+res;
    sumDay(loc,c,t,res,th);
    const rg=regDay(loc,c,t);
    S.cash-=c.fix;
    loc.last={day:S.day,rev:t.rev,cogs:t.cogs,waste:t.waste,other:t.other,theft:th,wages:c.wages,rent:c.rent,energy:c.energy,mkt:c.mktCost,res,served:t.served,lost:t.lost,disc:t.disc||0,prov:t.prov||0,soldOut:t.soldOut||0,regServed:rg.served,reg:loc.reg,regGain:rg.gain,regLost:rg.lost};
    const it={};for(const P of PRODS){const m=loc.menu[P.id],n=loc.sold[P.id]||0;if(!m||P.t>loc.tier||(!m.on&&n<0.5))continue;const r=loc.soldR[P.id]||0;it[P.id]=[n,m.price,m.q,m.p,r,r-(loc.soldC[P.id]||0)];}
    loc.hist.push({d:S.day,it});if(loc.hist.length>7)loc.hist.shift();
    genReviews(loc,c);
    loc.today=newToday();loc.xsLast=loc.xsold||{};loc.xsold={};loc.csLast=loc.csold||{};loc.csold={};loc.soldLast=loc.sold;loc.sold={};loc.soldR={};loc.soldC={};total+=res;
  }
  const admin=adminCost(),hq=HQS[S.hq].daily,interest=S.loan*0.01,dispo=S.cash<0?-S.cash*0.03:0;
  S.cash-=admin+hq+interest+dispo;total-=admin+hq+interest+dispo;
  S.lastDay={day:S.day,total,admin,hq,interest,dispo};
  S.hist.push(Math.round(total));if(S.hist.length>14)S.hist.shift();
  if(!offline){
    const lim=dispoLimit();
    if(S.strikes>0)S.flags.hadStrike=1;
    if(S.cash<-lim){S.strikes++;if(S.strikes>=3){S.bankrupt=true;}else addLog(TR('Mahnung ')+S.strikes+TR(' von 3: Die Kasse liegt unter dem Dispo-Rahmen von ')+eur(-lim)+'.','bad');}
    else if(S.cash>=0){S.strikes=0;if(S.flags.hadStrike)S.flags.comeback=1;}
    checkAch();
    toast(TR('Tag ')+S.day+TR(' abgeschlossen: ')+eurS(total),total<0?'bad':'good');
    questEnd();
  }
  if(typeof telDay==='function')telDay(offline,total);if(!offline&&total>0)sfx('coin');
  S.day++;S.best=Math.max(S.best,companyValue());if(S.meta)S.meta.best=Math.max(S.meta.best||0,S.best);
  if(Math.random()<0.07&&S.t>=S.market.until){
    if(Math.random()<0.5){S.market={mult:0.7,until:S.t+DAY,label:TR('Großmarkt-Angebot: Ware heute 30 % günstiger')};addLog(TR('Großmarkt-Angebot: Ware einen Tag lang 30 % günstiger.'),'good');}
    else{S.market={mult:1.35,until:S.t+2*DAY,label:TR('Lieferengpass: Ware 35 % teurer')};addLog(TR('Lieferengpass: Ware zwei Tage lang 35 % teurer.'),'bad');}
  }
  for(const loc of S.locs){if(offline&&!loc.staff.lead)continue;rollEvents(loc);staffDay(loc,offline);}
  worldDay(offline);
}
function step(dt,offline){
  S.t+=dt;S.dayT+=dt;
  const ph=phase(Math.min(0.999,S.dayT/DAY));
  for(const loc of S.locs){if(offline&&!loc.staff.lead)continue;simLoc(loc,dt,ph);}
  if(S.tester&&S.t>=S.tester.t)testerVisit(offline);
  if(!offline){if(S.qDay!==S.day)genQuests();questLive();if(typeof callCheck==='function')callCheck();}
  if(S.dayT>=DAY){S.dayT-=DAY;endDay(offline);}
}
function away(sec){
  const before=S.cash,d0=S.day,open=S.locs.filter(l=>l.staff.lead>0).length;let stopped=false;
  ui.away=true;
  if(open&&S.cash>=0&&!S.paused&&!S.bankrupt){let left=Math.min(sec,12*3600)*0.1;while(left>0){const dt=Math.min(2,left);step(dt,true);left-=dt;if(S.cash<0){stopped=true;break;}}}
  ui.away=false;
  return {sec,days:S.day-d0,delta:S.cash-before,open,stopped};
}

/* ===================== Aktionen ===================== */
function need(cost){if(S.cash<cost){toast(S.cash<0?TR('Konto im Minus: erst die Kasse ausgleichen.'):TR('Dafür fehlen ')+eur(cost-S.cash)+'.','bad');return false;}return true;}
const ACT={
  tab(d){ui.tab=d.t;if(typeof window!=='undefined')window.scrollTo(0,0);},
  sel(d){S.sel=+d.id;},
  open(d){S.sel=+d.id;ui.tab='betrieb';if(typeof window!=='undefined')window.scrollTo(0,0);},
  buy(d){const loc=cur(),c=calc(loc);const q=buyStock(loc,c.store*(+d.f)-loc.stock,false);if(!q)toast(TR('Kein Kauf möglich: Lager voll oder Dispo-Rahmen ausgeschöpft.'),'bad');},
  auto(){const loc=cur();loc.auto=!loc.auto;},
  check(){cur().ord=100;},
  push(){const loc=cur();if(S.t<S.pushCd)return;loc.pushUntil=S.t+20;S.pushCd=S.t+90;},
  owner(){S.ownerAt=cur().id;},
  hire(d){const loc=cur(),a=loc.apps.find(x=>x.id===+d.id);if(!a)return;if(loc.staff[a.role]>=maxStaff(loc,a.role)){toast(TR('Für diese Stelle ist kein Platz frei.'),'bad');return;}if(!need(a.pay))return;hireApp(loc,a,false);toast(a.name+TR(' fängt als ')+roleName(a.role)+' an.','good');},
  reject(d){const loc=cur();loc.apps=loc.apps.filter(x=>x.id!==+d.id);},
  trial(d){const loc=cur(),a=loc.apps.find(x=>x.id===+d.id);if(!a||a.trial)return;const c=Math.round(a.pay*0.6);if(!need(c))return;S.cash-=c;loc.today.other+=c;
    const prev={};for(const [k] of ATTR)prev[k]=a.est&&a.est[k]?a.est[k].slice():null;
    a.trial=trialText(a);a.est=estAttrs(a);a.exp_day=Math.max(a.exp_day,S.day+1);
    const rg=r=>r?(r[0]===r[1]?String(r[0]):r[0]+'–'+r[1]):'?',good=a.trialEst>=1.1,bad=a.trialEst<0.85;
    modal(TR('Probetag: ')+a.name,'<p style="font-size:17px;margin:0 0 10px">'+a.trial+'</p>'+
      chips([chip(good?'smile':bad?'warn':'check',good?TR('Empfehlung'):bad?TR('Eher nicht'):TR('Solide'),good?'good':bad?'bad':'')])+
      TR('<div class="lbl" style="margin-top:12px">Jetzt genauer bekannt</div>')+
      ['fk','be'].map(k=>'<div class="row" style="gap:8px;margin:4px 0">'+ic(ATTRIC[k])+'<span class="grow">'+ATTR.find(x=>x[0]===k)[1]+'</span><span class="num muted">'+rg(prev[k])+'</span>'+ic('up').replace('class="ic"','class="ic" style="transform:rotate(90deg)"')+'<strong class="num">'+rg(a.est[k])+'</strong></div>').join('')+
      attrGrid(a,false,a.role),[[TR('Verstanden'),'mClose','pri']]);},
  ad(){const loc=cur(),r=adRole(loc);if(!r)return;const c=adCost(loc,r);if(!need(c))return;S.cash-=c;loc.today.other+=c;loc.ads.push({role:r,until:S.day+3});loc.apps.push(genApp(loc,r,false));toast(TR('Anzeige für ')+roleName(r)+TR(' geschaltet'),'good');},
  hunt(){const loc=cur(),r=adRole(loc);if(!r)return;const c=huntCost(loc,r);if(!need(c))return;S.cash-=c;loc.today.other+=c;loc.hunts.push({role:r,day:S.day+1});toast(TR('Headhunter sucht ')+roleName(r),'good');},
  autoHire(){const loc=cur();loc.autoHire=!loc.autoHire;},
  dismiss(d){const loc=cur(),e=loc.team.find(x=>x.id===+d.id);if(!e||e.leaveDay)return;
    if(d.m==='f'){if(!(e.trKnown&&e.tr==='dieb'))return;loc.team=loc.team.filter(x=>x!==e);sync(loc);addLog(locName(loc)+': '+e.name+TR(' fristlos entlassen.'),'');}
    else if(d.m==='a'){const c=e.pay*4;if(S.cash-c<-dispoLimit()){toast(TR('Die Abfindung ist nicht bezahlbar.'),'bad');return;}S.cash-=c;loc.today.other+=c;e.leaveDay=S.day+1;}
    else e.leaveDay=S.day+3;
    loc.want[e.role]=Math.max(0,(loc.want[e.role]!=null?loc.want[e.role]:loc.staff[e.role])-1);},
  mUp(d){const loc=cur(),M=MACH.find(m=>m.id===d.m),L=loc.mach[M.id]||0;if(L>=loc.tier+1||M.t>loc.tier)return;const c=M.base*Math.pow(3,L);if(!need(c))return;S.cash-=c;loc.mach[M.id]=L+1;},
  mSell(d){const loc=cur(),M=MACH.find(m=>m.id===d.m),L=loc.mach[M.id]||0;if(L<1)return;S.cash+=Math.round(0.4*M.base*Math.pow(3,L-1));loc.mach[M.id]=L-1;delete loc.broken[M.id];},
  repair(d){const loc=cur(),c=repairCost(loc,d.m);if(S.cash-c<-dispoLimit()){toast(TR('Reparatur nicht bezahlbar.'),'bad');return;}S.cash-=c;loc.today.other+=c;delete loc.broken[d.m];},
  tierUp(){const loc=cur();if(loc.tier>=5)return;const c=TIERS[loc.tier+1].cost;if(!need(c))return;S.cash-=c;loc.tier++;S.maxTier=Math.max(S.maxTier,loc.tier);addProducts(loc);addLog(AREAS[loc.area].n+TR(' ist jetzt ein ')+TIERS[loc.tier].n+'.','good');},
  qual(){const loc=cur();if(loc.qual>=TIERS[loc.tier].maxQ)return;const c=QCOST[loc.qual];if(!need(c))return;S.cash-=c;loc.qual++;},
  mkt(d){cur().mkt=+d.l;},
  cbAdd(){const loc=cur(),cb=ui.cb||{};const mains=comboMains(loc);if(!mains.some(P=>P.id===cb.main))return;if((loc.combos||[]).length>=COMBO_MAX[loc.tier])return;
    const all=calc(loc).all,sd=cb.side?sideInfo(loc,all,cb.side):null,dr=cb.drink?all[cb.drink]:null,sum=all[cb.main].m.price+(sd?sd.price:0)+(dr?dr.m.price:0),st=xStep(sum);
    loc.combos.push({id:loc.nextCb++,main:cb.main,side:cb.side||null,drink:cb.drink||null,price:+(Math.round(sum*0.88/st)*st).toFixed(2),on:true});ui.cb=null;},
  cbDel(d){const loc=cur();loc.combos=(loc.combos||[]).filter(c=>c.id!==+d.id);},
  cbTog(d){const cb=(cur().combos||[]).find(c=>c.id===+d.id);if(cb)cb.on=!cb.on;},
  cbStep(d){const cb=(cur().combos||[]).find(c=>c.id===+d.id);if(!cb)return;const st=xStep(cb.price+(+d.d<0?-0.001:0));cb.price=+Math.max(0.5,Math.round((cb.price+(+d.d)*st)/st)*st).toFixed(2);},
  xTog(d){const m=cur().menu[d.p];if(m&&m.x&&m.x[d.x])m.x[d.x].on=!m.x[d.x].on;},
  xStep(d){const m=cur().menu[d.p];if(!m||!m.x||!m.x[d.x])return;const o=m.x[d.x],st=xStep(o.price+(+d.d<0?-0.001:0));o.price=+Math.max(0.1,Math.round((o.price+(+d.d)*st)/st)*st).toFixed(2);},
  xOpen(d){ui.xOpen=ui.xOpen||{};ui.xOpen[d.p]=!ui.xOpen[d.p];},
  togProd(d){const m=cur().menu[d.p];if(m)m.on=!m.on;},
  pStep(d){const loc=cur(),P=P_(d.p),m=loc.menu[d.p];if(!m)return;const st=stepOf(P);m.price=+Math.max(st,Math.round((m.price+(+d.d)*st)/st)*st).toFixed(2);},
  qStep(d){const loc=cur(),m=loc.menu[d.p];if(m)m.q=clamp(m.q+(+d.d),1,loc.qual);},
  mStep(d){const m=cur().menu[d.p];if(m)m.p=clamp(Math.round(m.p*100+(+d.d)*5),70,150)/100;},
  accept(){const loc=cur(),o=loc.offer;if(!o)return;if(loc.stock<o.need){toast(TR('Zu wenig Ware im Lager: ')+Math.ceil(o.need)+TR(' Einheiten nötig.'),'bad');return;}useStock(loc,o.need,'cogs');S.cash+=o.pay;loc.today.rev+=o.pay;loc.rep=Math.min(100,loc.rep+1);loc.offer=null;toast(TR('Catering geliefert: ')+eurS(o.pay),'good');},
  decline(){cur().offer=null;},
  loan(){const ch=Math.max(500,creditMax()/4);if(S.loan+ch>creditMax()+1)return;S.loan+=ch;S.cash+=ch;},
  repay(){const x=Math.min(S.loan,Math.max(0,S.cash));if(x<=0)return;S.loan-=x;S.cash-=x;},
  hq(){if(S.hq>=4)return;const c=HQS[S.hq+1].cost;if(!need(c))return;S.cash-=c;S.hq++;},
  newLoc(){const free=freeAreas();if(!free.length||realLocs().length>=12)return;const a=free.includes(ui.newArea)?ui.newArea:free[0],t=Math.min(ui.newTier,S.maxTier),c=newLocCost(t);if(!need(c))return;S.cash-=c;const loc=newLoc(S.nextId++,a,t);loc.rep+=8*perk('name');S.locs.push(loc);S.sel=loc.id;ui.tab='betrieb';ui.newArea=null;ui.modal=null;addLog(TR('Neuer Standort: ')+locName(loc)+TR('. Er braucht Personal und Ware.'),'good');},
  askClose(){const loc=cur();if(realLocs().length<2||loc.popup)return;const back=Math.round(0.35*invested(loc)+loc.stockVal*0.5);let sev=0;for(const e of loc.team)sev+=e.pay*2;
    modal(TR('Standort schließen?'),'<p>'+locName(loc)+TR(' wird aufgegeben. Du bekommst ')+eur(back)+TR(' für Einrichtung und Ware und zahlst ')+eur(sev)+TR(' Abfindung.</p>'),[[TR('Schließen'),'close','danger'],[TR('Abbrechen'),'mClose','']]);},
  close(){const loc=cur();if(realLocs().length<2||loc.popup)return;let sev=0;for(const e of loc.team)sev+=e.pay*2;S.cash+=Math.round(0.35*invested(loc)+loc.stockVal*0.5)-sev;addLog(locName(loc)+TR(' geschlossen.'),'');S.locs=S.locs.filter(l=>l!==loc);if(S.ownerAt===loc.id)S.ownerAt=S.locs[0].id;S.sel=S.locs[0].id;ui.tab='stadt';ui.modal=null;},
  pause(){S.paused=!S.paused;},
  askReset(){modal(TR('Neu anfangen?'),TR('<p>Der aktuelle Spielstand wird gelöscht. Du startest wieder mit einem Straßenstand und 300 €.</p>'),[[TR('Neu anfangen'),'reset','danger'],[TR('Abbrechen'),'mClose','']]);},
  reset(){if(ui.rush)ACT.rushClose();if(S&&typeof telRun==='function')telRun(S.bankrupt?'insolvenz':'neustart');const best=S?S.best:0,M=(S&&S.meta)||newMeta();if(S&&S.bankrupt&&!S.epGiven){M.ep+=Math.floor(epFor(S.best)/2);M.runs=(M.runs||0)+1;}S=newGame(M);S.best=best;S.intro=false;migrate();genQuests();ui.tab='stadt';ui.modal=null;save();},
  mClose(){ui.modal=null;if(S.intro){S.intro=false;}},
  saveBox(){let code='';try{code=btoa(unescape(encodeURIComponent(JSON.stringify(S))));}catch(e){}
    modal(TR('Spielstand sichern'),TR('<p class="small">Der Spielstand liegt nur in diesem Browser. Kopiere den Code, um ihn aufzubewahren oder auf ein anderes Gerät zu holen.</p><textarea id="saveCode" aria-label="Spielstand-Code">')+code+'</textarea>',[[TR('Code kopieren'),'copy','pri'],[TR('Code laden'),'load',''],[TR('Schließen'),'mClose','']]);},
  copy(){const el=document.getElementById('saveCode');try{navigator.clipboard.writeText(el.value).then(()=>toast(TR('Code kopiert.'),'good'),()=>{el.select();toast(TR('Bitte den markierten Code von Hand kopieren.'),'');});}catch(e){el.select();toast(TR('Bitte den markierten Code von Hand kopieren.'),'');}return 'keep';},
  load(){const el=document.getElementById('saveCode');try{const d=JSON.parse(decodeURIComponent(escape(atob(el.value.trim()))));if(d&&d.v===1&&Array.isArray(d.locs)&&d.locs.length){S=d;migrate();if(S.qDay!==S.day)genQuests();S.lastSeen=Date.now();ui.modal=null;toast(TR('Spielstand geladen.'),'good');}else throw 0;}catch(e){toast(TR('Der Code ist kein gültiger Spielstand.'),'bad');return 'keep';}}
};
ACT.plot=function(d){
  ui.newArea=+d.i;if(!freeAreas().includes(ui.newArea))return;
  const cost=()=>newLocCost(Math.min(ui.newTier,S.maxTier));
  modal(TR('Grundstück ')+AREAS[ui.newArea].n,()=>{const A=AREAS[ui.newArea];ui.newTier=Math.min(ui.newTier,S.maxTier);
    return TR('<div class="small num">Andrang ')+pct(A.dem)+TR(' · Miete ')+pct(A.rent)+TR(' · Zahlungsbereitschaft ')+pct(A.pay)+TR(' · vegetarisch oder vegan ')+n0(VEGA[ui.newArea]*100)+' %</div>'+
      TR('<div><label class="lbl" for="selTier">Betriebsart</label><select id="selTier" data-i="newTier">')+TIERS.filter((t,i)=>i<=S.maxTier).map((t,i)=>'<option value="'+i+'"'+(i===ui.newTier?' selected':'')+'>'+t.n+'</option>').join('')+'</select></div>'+
      TR('<p class="small">Der Betrieb startet ohne Personal, Geräte und Ware und muss sich seinen Ruf erst erarbeiten. Jeder weitere Standort erhöht die Verwaltungskosten und verlangt mehr Aufmerksamkeit. Wählen kannst du jede Betriebsart, die du schon einmal erreicht hast.</p>');},
    ()=>[[TR('Eröffnen · ')+eur(cost()),'newLoc','pri',S.cash<cost()],[TR('Abbrechen'),'mClose','']]);
};
ACT.cardOpt=function(d){const cd=S.card;if(!cd)return;const l=S.locs.find(x=>x.id===cd.loc);if(!l){S.card=null;return;}const V=CARDS[cd.k].v(cd,l),o=V.o[+d.i];if(!o)return;if(o[2]&&!need(o[2]))return;if(o[2]){S.cash-=o[2];l.today.other+=o[2];}S.card=null;const m=CARDS[cd.k].a(cd,l,+d.i);if(m)addLog(m,'');};
ACT.popup=function(d){const ev=(S.cev||[]).find(e=>e.id===+d.ev);if(!ev||S.locs.some(l=>l.area===ev.area))return;const cst=popCost(ev);if(!need(cst))return;S.cash-=cst;
  const t=Math.min(S.maxTier,1),loc=newLoc(S.nextId++,ev.area,t);loc.popup=ev.end;loc.rep=50+8*perk('name');loc.auto=false;
  loc.team.push({id:S.nextE++,name:rndName(),role:'cook',sk:0.95,tr:'',at:genAttrs(0.95,0,''),pay:wage(loc,'cook'),day:S.day,trKnown:true,sickUntil:0,absent:false,leaveDay:0,mood:70,temp:true});sync(loc);loc.want={cook:1};
  popCopy(loc);loc.pl={fee:cst,goods:0,staff:0,run:0,rev:0,served:0,lost:0,days:0,start:ev.start,end:ev.end};
  S.locs.push(loc);S.sel=loc.id;ui.tab='betrieb';if(typeof window!=='undefined')window.scrollTo(0,0);addLog(TR('Pop-up-Stand im ')+AREAS[ev.area].n+TR(' gebucht. Preise, Qualität und Rezepte sind übernommen. Kauf Ware ein, bevor es losgeht.'),'good');};
function popCopy(loc){const src=realLocs().slice().sort((a,b)=>b.tier-a.tier||b.qual-a.qual)[0];if(!src)return;
  loc.qual=Math.min(TIERS[loc.tier].maxQ,src.qual);
  for(const id in loc.menu){const m=src.menu[id];if(!m)continue;const t=loc.menu[id];t.on=m.on;t.price=m.price;t.q=Math.min(loc.qual,m.q);t.p=m.p;if(m.x)t.x=JSON.parse(JSON.stringify(m.x));}
  loc.combos=(src.combos||[]).filter(c=>[c.main,c.side,c.drink].every(k=>!k||loc.menu[k])).map(c=>Object.assign({},c,{id:loc.nextCb++}));}
ACT.compInfo=function(d){const cp=(S.comps||[]).find(c=>c.id===+d.id);if(!cp)return;
  modal(cp.n,()=>{const loc=realLocs().find(l=>l.area===cp.area),c=loc?calc(loc):null,at=compAtt(cp);
    return '<p>'+(S.day<cp.open?TR('Eröffnet an Tag ')+cp.open:TR('Seit Tag ')+cp.open)+TR(' im ')+AREAS[cp.area].n+TR('. Angebot: ')+(at<0.05?TR('eher schwach'):at<0.2?TR('solide'):at<0.35?TR('stark'):TR('sehr stark'))+(S.day<(cp.promoUntil||0)?TR(', gerade mit Rabattaktion'):'')+'.</p>'+
      (loc&&S.day>=cp.open?TR('<p>Zieht deinem ')+locName(loc)+TR(' etwa ')+n0(c.compF*100)+TR(' % der Laufkundschaft ab.</p><div class="lbl">Durchhaltevermögen</div>')+meter(clamp(cp.hp,0,100),cp.hp<35?'good':cp.hp>80?'bad':'warn'):TR('<p>Du hast hier keinen Betrieb.</p>'))+
      TR('<p class="small">Ist dein Angebot dauerhaft besser, gibt die Konkurrenz auf und ein Teil ihrer Kundschaft kommt zu dir. Es helfen zufriedene Gäste durch Qualität, faire Preise, Ordnung, ein Hausgericht und Sterne. Gutes Personal wird abgeworben, wenn es unzufrieden ist.</p>');},[[TR('Schließen'),'mClose','']]);};
function empOf(id){const loc=cur();return {loc,e:loc.team.find(x=>x.id===+id)};}
function trainCost(loc,e){return wage(loc,e.role)*5;}
function canPromote(loc,e){return (e.role==='cook'||e.role==='serv')&&!e.promo&&!e.temp&&!e.leaveDay&&S.day-e.day>=7&&e.sk>=1.15&&!loc.team.some(x=>x.role===e.role&&x.promo);}
const PROMO={cook:TR('Sous-Chef'),serv:TR('Chef de Rang')};
ACT.askYes=function(d){const {e}=empOf(d.id);if(!e||!e.ask)return;e.pay=e.ask.pay;e.mood=Math.min(100,moodOf(e)+15);e.ask=null;e.lastAsk=S.day;};
ACT.askNo=function(d){const {e}=empOf(d.id);if(!e||!e.ask)return;e.mood=Math.max(0,moodOf(e)-18);e.ask=null;e.lastAsk=S.day;};
ACT.poachYes=function(d){const {e}=empOf(d.id);if(!e||!e.poach)return;e.pay=e.poach.pay;e.mood=Math.min(100,moodOf(e)+8);e.poach=null;};
ACT.poachNo=function(d){const {e}=empOf(d.id);if(!e||!e.poach)return;e.poach=null;e.leaveDay=S.day+1;e.quit=true;};
ACT.train=function(d){const {loc,e}=empOf(d.id);if(!e||(e.trains||0)>=4||e.sk>=rarOf(e).cap-0.01||S.t<(e.trainUntil||0))return;const c=trainCost(loc,e);if(!need(c))return;S.cash-=c;loc.today.other+=c;
  e.trainUntil=S.t+DAY;e.sk=Math.min(rarOf(e).cap,e.sk+clamp(0.12*(rarOf(e).cap+0.05-e.sk)/1.2,0.02,0.15));e.trains=(e.trains||0)+1;e.mood=Math.min(100,moodOf(e)+8);toast(e.name+TR(' ist einen Tag in der Schulung.'),'');};
ACT.promote=function(d){const {loc,e}=empOf(d.id);if(!e||!canPromote(loc,e))return;e.promo=true;e.pay=Math.round(e.pay*1.25);e.mood=Math.min(100,moodOf(e)+20);addLog(e.name+TR(' ist jetzt ')+PROMO[e.role]+TR(' im ')+locName(loc)+'.','good');};
function feastCost(loc){let w=0;loc.team.forEach(e=>w+=e.pay);return Math.max(50,Math.round(w*0.4));}
ACT.feast=function(){const loc=cur();if(S.day-(loc.feastDay||-99)<5||!loc.team.length)return;const c=feastCost(loc);if(!need(c))return;S.cash-=c;loc.today.other+=c;loc.feastDay=S.day;loc.team.forEach(e=>e.mood=Math.min(100,moodOf(e)+8));toast(TR('Teamessen: Die Stimmung steigt.'),'good');};
function sigCost(loc,P){return Math.round(P.v*30*(loc.tier+1)+200);}
function devCost(loc,P){return Math.round(P.v*20*(loc.tier+1)+150);}
function bestCook(loc){return Math.max(S.ownerAt===loc.id?1:0,...loc.team.filter(e=>e.role==='cook'&&!e.leaveDay).map(e=>e.sk));}
function sigRating(loc,p){const m=loc.menu[p];return clamp(Math.round(bestCook(loc)*1.4+((m?m.q:1)-1)*0.25+(hasRec(loc,p)?0.3:0)-0.35),1,3);}
ACT.devDish=function(d){const loc=cur(),P=P_(d.p);if(!P||P.drink||!loc.menu[P.id]||hasRec(loc,P.id)||loc.devIng||S.locs.some(l=>l.devIng&&l.devIng.p===P.id))return;const c=devCost(loc,P);if(!need(c))return;S.cash-=c;loc.today.other+=c;loc.devIng={p:P.id,day:S.day};toast(TR('Die Küche verfeinert das Rezept für ')+P.n+TR('. Fertig zum Tagesabschluss.'),'');};
ACT.sigDev=function(){const loc=cur(),p=ui.sigP&&loc.menu[ui.sigP]?ui.sigP:null;if(!p||loc.sigDev||loc.sig)return;const c=sigCost(loc,P_(p));if(!need(c))return;S.cash-=c;loc.today.other+=c;loc.sigDev={p,day:S.day,r:sigRating(loc,p)};toast(TR('Die Küche tüftelt am neuen Hausgericht. Ergebnis zum Tagesabschluss.'),'');};
ACT.delivery=function(){const l=cur();l.delivery=!l.delivery;};
function contractFee(){if(!S.contract||S.contract.type==='tag')return 0;let u=0;S.locs.forEach(l=>u+=dailyUse(l,calc(l)));return Math.round(Math.max(200,u*0.05*Math.max(0,S.contract.until-S.day)));}
ACT.contract=function(d){const k=d.c;if(!CONTR[k]||(S.contract.type===k&&k!=='tag'))return;if(S.contract.type===k)return;const fee=contractFee();if(fee&&!need(fee))return;S.cash-=fee;S.contract=k==='tag'?{type:'tag',until:0}:{type:k,until:S.day+29};addLog(TR('Einkauf: ')+CONTR[k].n+(k==='tag'?'':TR(' bis Tag ')+S.contract.until)+(fee?TR(', Vertragsstrafe ')+eur(fee):'')+'.','');};
function epFor(v){return Math.floor(Math.sqrt(Math.max(0,v)/1000));}
ACT.askSell=function(){const v=companyValue(),ep=epFor(v);if(v<25000){toast(TR('Verkaufen lohnt sich erst ab 25.000 € Firmenwert.'),'bad');return;}
  modal(TR('Firma verkaufen?'),TR('<p>Du verkaufst dein Unternehmen für ')+eur(v)+TR(' und fängst neu an. Dafür bekommst du <strong>')+ep+TR(' Erfahrungspunkte</strong>, mit denen du dauerhafte Vorteile freischaltest.</p><p class="small">Das Geld aus dem Verkauf nimmst du nicht mit, nur die Erfahrung.</p>'),[[TR('Verkaufen'),'sell','danger'],[TR('Abbrechen'),'mClose','']]);};
ACT.sell=function(){if(typeof telRun==='function')telRun('verkauf');const v=companyValue(),M=S.meta||newMeta();M.ep+=epFor(v);M.runs=(M.runs||0)+1;M.best=Math.max(M.best||0,v);S=newGame(M);S.intro=false;migrate();genQuests();ui.tab='stadt';ACT.perks();save();};
ACT.perks=function(){modal(TR('Erfahrung'),()=>{const M=S.meta;return TR('<p>Verfügbar: <strong>')+M.ep+TR(' Punkte</strong>. Vorteile gelten dauerhaft, auch nach jedem Neustart.</p>')+PERKS.map(P=>{const L=M.perks[P.id]||0;return '<div class="perk"><div class="grow"><strong>'+P.n+'</strong> <span class="small num">'+L+' / '+P.max+'</span><div class="small">'+P.d+(P.max>1?TR(' je Stufe'):'')+'</div></div>'+(L<P.max?B(TR('Kaufen'),'perk',{id:P.id},{cls:'sm pri',cost:P.cost+' P',dis:M.ep<P.cost}):TR('<span class="pill good">voll</span>'))+'</div>';}).join('');},[[TR('Schließen'),'mClose','']]);};
ACT.perk=function(d){const P=PERKS.find(x=>x.id===d.id),M=S.meta;if(!P)return;const L=M.perks[P.id]||0;if(L>=P.max||M.ep<P.cost)return;M.ep-=P.cost;M.perks[P.id]=L+1;};
ACT.rushStart=function(d){if(d&&d.id)S.sel=+d.id;const loc=cur();if(!rushAvail(loc))return;S.rushKey=S.day;S.ownerAt=loc.id;
  const now=Date.now(),sl=rushSlots(loc),slots={};for(const k in sl)slots[k]=Array(sl[k]).fill(null);
  ui.rush={loc:loc.id,ev:!!evAt(loc.area),t0:now,end:now+SHIFT_MS,tk:[],next:now+800,seq:1,combo:0,best:0,done:0,missed:0,burnt:0,cold:0,perfect:0,tips:0,slots,pass:[],dirty:1,flash:null,over:false};
  const el=document.getElementById('rush');el.classList.add('open');document.body.style.overflow='hidden';renderRush();requestAnimationFrame(rushLoop);return 'keep';};
ACT.rushQuit=function(){rushEnd();return 'keep';};
ACT.rushClose=function(){ui.rush=null;const el=document.getElementById('rush');el.classList.remove('open');el.innerHTML='';document.body.style.overflow='';};
ACT.achList=function(){modal(TR('Erfolge'),()=>{const A=S.meta.ach||{},n=ACH.filter(a=>A[a.id]).length;
  return '<p>'+n+TR(' von ')+ACH.length+TR(' freigeschaltet. Jeder Erfolg bringt einmalig Erfahrungspunkte für dauerhafte Vorteile, auch über einen Neustart hinweg.</p><div class="achs">')+ACH.map(a=>'<div class="ach'+(A[a.id]?' on':'')+'"><span class="ach-m" aria-hidden="true">'+(A[a.id]?'★':'☆')+'</span><div class="grow"><strong>'+a.n+'</strong><div class="small">'+a.d+'</div></div><span class="small num">'+(A[a.id]?'erreicht':'+'+a.ep+' P')+'</span></div>').join('')+'</div>';},[[TR('Schließen'),'mClose','']]);};
ACT.speed=function(d){S.speed=+d.v;};
ACT.tSearch=function(d){const loc=cur(),ev=(S.cev||[]).find(e=>e.id===+d.ev);if(!ev||S.day>=ev.start)return;loc.tsearch=loc.tsearch||[];loc.tapps=loc.tapps||[];
  if(loc.tsearch.some(t=>t.ev===ev.id&&t.role===d.r))return;const f=tempFee(loc,d.r);if(!need(f))return;S.cash-=f;loc.today.other+=f;loc.tsearch.push({ev:ev.id,role:d.r});
  const a=genApp(loc,d.r,false);a.ev=ev.id;a.rate=Math.round(a.pay*1.6);loc.tapps.push(a);toast(TR('Aushilfe als ')+roleName(d.r)+TR(' gesucht. Bis zum Ereignis kommen täglich Bewerbungen.'),'');};
ACT.tBook=function(d){const loc=cur(),a=(loc.tapps||[]).find(x=>x.id===+d.id);if(!a||a.booked)return;const ev=(S.cev||[]).find(e=>e.id===a.ev);if(!ev)return;
  if(loc.tapps.filter(x=>x.booked&&x.ev===a.ev&&x.role===a.role).length>=2){toast(TR('Pro Ereignis höchstens zwei Aushilfen je Aufgabe.'),'bad');return;}
  const days=ev.end-ev.start+1,c=a.rate*days;if(!need(c))return;S.cash-=c;loc.today.other+=c;a.booked=true;a.start=ev.start;a.end=ev.end;a.paid=c;toast(a.name+TR(' ist für ')+evDef(ev).n+TR(' gebucht.'),'good');};
ACT.tCancel=function(d){const loc=cur(),a=(loc.tapps||[]).find(x=>x.id===+d.id);if(!a||!a.booked||a.joined)return;S.cash+=Math.round((a.paid||0)*0.5);a.booked=false;};
ACT.tTake=function(d){const loc=cur(),o=(loc.toffers||[]).find(x=>x.id===+d.id);if(!o)return;if(loc.team.filter(x=>x.role===o.role&&!x.temp).length>=maxStaff(loc,o.role)){toast(TR('Für diese Stelle ist kein Platz frei.'),'bad');return;}if(!need(o.pay))return;
  S.cash-=o.pay;loc.team.push({id:S.nextE++,name:o.name,role:o.role,sk:o.sk,tr:o.tr,at:o.at,rar:o.rar,pay:o.pay,day:S.day-3,trKnown:o.trKnown,sickUntil:0,absent:false,leaveDay:0,mood:80});sync(loc);
  loc.want[o.role]=Math.max(loc.want[o.role]||0,loc.staff[o.role]);loc.toffers=loc.toffers.filter(x=>x!==o);if((o.rar||0)>=3)S.flags.legend=1;if(o.rar===4)S.flags.ultra=1;toast(o.name+TR(' gehört jetzt fest zum Team.'),'good');};
ACT.tBye=function(d){const loc=cur();loc.toffers=(loc.toffers||[]).filter(x=>x.id!==+d.id);};
ACT.help=function(d){ui.help=ui.help||{};ui.help[d.k]=!ui.help[d.k];};
ACT.stamp=function(){const l=cur();l.stamp=!l.stamp;};
ACT.goto=function(d){if(d.id)S.sel=+d.id;ui.tab=d.t;ui.jump=d.k||null;if(!ui.jump&&typeof window!=='undefined')window.scrollTo(0,0);};
ACT.nextLoc=function(d){const i=S.locs.indexOf(cur()),n=S.locs.length;S.sel=S.locs[(i+(+d.d)+n)%n].id;};
function adRole(loc){const rs=ROLES.filter(r=>maxStaff(loc,r.id)>0).map(r=>r.id);return rs.includes(ui.adRole)?ui.adRole:rs[0];}
function freeAreas(){const used=S.locs.map(l=>l.area);return AREAS.map((a,i)=>i).filter(i=>!used.includes(i));}

/* ===================== Anzeige ===================== */
const nf0=new Intl.NumberFormat(LOCALE,{maximumFractionDigits:0}),nf2=new Intl.NumberFormat(LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2});
function eur(x){const a=Math.abs(x);const s=a>=1e6?nf2.format(a/1e6)+(LANG==='en'?'M':TR(' Mio.')):nf0.format(Math.round(a));return (x<=-0.5?'−':'')+(LANG==='en'?'€'+s:s+' €');}
function eurS(x){return (x>=0.5?'+':'')+eur(x);}
function eur2(x){return (x<0?'−':'')+(LANG==='en'?'€'+nf2.format(Math.abs(x)):nf2.format(Math.abs(x))+' €');}
function n0(x){return nf0.format(Math.round(x));}
const CASH_ACTS=['buy','hire','mUp','tierUp','qual','repair','newLoc','feast','train','devDish','sigDev','popup','tBook','callFix','loan'];
function toast(msg,kind){
  if(typeof document==='undefined'||ui.away)return;if(kind==='good')sfx('ding');else if(kind==='bad')sfx('warn');
  const box=document.getElementById('toasts');if(!box)return;
  const el=document.createElement('div');el.className='toast '+(kind||'');el.textContent=msg;box.appendChild(el);
  while(box.children.length>2)box.removeChild(box.firstChild);
  setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el);},4200);
}
function modal(title,html,btns){ui.modal={title,html,btns};}
function B(label,a,d,o){d=d||{};o=o||{};let at='';for(const k in d)at+=' data-'+k+'="'+d[k]+'"';
  return '<button type="button" class="btn '+(o.cls||'')+'" data-a="'+a+'"'+at+(o.dis?' disabled':'')+'>'+label+(o.cost!=null?'<span class="cost">'+o.cost+'</span>':'')+'</button>';}
function meter(p,cls,mark){return '<div class="meter '+(cls||'')+'"><i style="width:'+clamp(p,0,100).toFixed(1)+'%"></i>'+(mark!=null?'<u style="left:'+clamp(mark,0,99).toFixed(1)+'%"></u>':'')+'</div>';}
function lvlCls(p){return p<40?'bad':p<65?'warn':'';}
function problems(loc,c){
  c=c||calc(loc);const T=TIERS[loc.tier],P=[],add=(k,tab,key,t,d,act)=>P.push({k,tab,key,t,d,act,loc:loc.id});
  const nocook=!(c.cooks>0),up=unitPrice(loc,1,loc.auto);
  if(!c.foods.length)add('bad','karte','nofood',TR('Keine Gerichte auf der Karte'),TR('Ohne Angebot kommt niemand. Nimm mindestens ein Gericht auf die Karte.'));
  if(nocook)add('bad','team','role:cook',TR('Niemand kocht'),TR('Der Betrieb verkauft nichts. Stelle einen Koch ein oder arbeite hier selbst mit.'));
  const use=dailyUse(loc,c)+loc.stock*c.spoil,days=use>0?loc.stock/use:99,autoOn=loc.auto&&(loc.tier>=1||loc.staff.lead>0);
  if(c.ek>0&&loc.stock<c.ek)add('bad','betrieb','stock',TR('Lager leer'),TR('Gäste gehen wieder, der Ruf leidet.'),[TR('Auffüllen'),'buy',{f:1}]);
  else if(days<0.6&&!autoOn&&!nocook)add('warn','betrieb','stock',TR('Lager fast leer'),TR('Die Ware reicht noch für etwa ')+Math.max(1,Math.round(days*24))+TR(' Stunden Betrieb.'),[TR('Auffüllen'),'buy',{f:1}]);
  for(const id in loc.broken){const M=MACH.find(m=>m.id===id);add('bad','ausbau','broken:'+id,M.n+TR(' defekt'),TR('Bringt bis zur Reparatur keine Leistung.')+(loc.staff.lead?TR(' Die Leitung lässt sie zum Tagesabschluss reparieren.'):''),[TR('Reparieren'),'repair',{m:id}]);}
  if(loc.ord<40)add('bad','betrieb','ord',TR('Ordnung kritisch: ')+n0(loc.ord)+' %',TR('Weniger Leistung, unzufriedene Gäste, Bußgeld bei einer Kontrolle.'),[TR('Kontrollgang'),'check',{}]);
  else if(loc.ord<60)add('warn','betrieb','ord',TR('Ordnung lässt nach: ')+n0(loc.ord)+' %',TR('Leistung und Zufriedenheit sinken bereits.'),[TR('Kontrollgang'),'check',{}]);
  if(c.cap>0&&c.foods.length&&c.demand>c.cap*1.1)add('warn','betrieb','cap',TR('Engpass ')+c.neck,TR('Es kommen etwa ')+n0(c.demand)+TR(' Gäste am Tag, ihr schafft ')+n0(c.cap)+TR('. Wer zu lange wartet, geht und schadet dem Ruf.'),c.neck===TR('Küche')?['Team','goto',{t:'team',k:'role:cook'}]:['Team','goto',{t:'team',k:'role:serv'}]);
  if(!nocook&&c.foods.length){
    const why=[];if(c.sat<-4)why.push(TR('Preis und Leistung passen nicht'));if(c.avgQ<T.exp-0.05)why.push(TR('Qualität unter Erwartung'));if(c.staffSat<-4)why.push(TR('schwaches Personal'));if(loc.ord<65)why.push(TR('Unordnung'));if(loc.last&&loc.last.lost>loc.last.served*0.15)why.push(TR('Gäste gehen unbedient'));
    if(loc.rep<25&&c.sTarget<loc.rep+2)add('bad','betrieb','rep',TR('Schlechter Ruf: ')+n0(loc.rep),TR('Kaum Laufkundschaft.')+(why.length?TR(' Ursache: ')+why.join(', ')+'.':''));
    else if(c.sTarget<loc.rep-9)add('warn','betrieb','rep',TR('Ruf sinkt'),TR('Gäste gehen unzufrieden.')+(why.length?TR(' Ursache: ')+why.join(', ')+'.':''));
  }
  if(S.card&&S.card.loc===loc.id){const V=cardView(S.card);if(V)add('warn','betrieb','card',TR('Entscheidung: ')+V.t,TR('Antworte bis Tag ')+S.card.until+TR(', sonst gilt „')+V.o[V.o.length-1][0]+'“.',[TR('Zeigen'),'goto',{t:'betrieb',k:'card'}]);}
  if(c.cmp&&c.compF>=0.12)add(c.compF>=0.28?'bad':'warn','betrieb','comp',TR('Konkurrenz: ')+c.cmp.n,TR('Zieht etwa ')+n0(c.compF*100)+TR(' % deiner Laufkundschaft ab')+(S.day<(c.cmp.promoUntil||0)?TR(', gerade mit Rabattaktion'):'')+TR('. Mit dem besseren Angebot hältst du dagegen.'),[TR('Ansehen'),'compInfo',{id:c.cmp.id}]);
  if(loc.popup&&loc.stock<c.ek*30&&S.day<=loc.popup)add('warn','betrieb','stock',TR('Pop-up braucht Ware'),TR('Ohne Vorrat verpasst du den Ansturm.'),[TR('Auffüllen'),'buy',{f:1}]);
  if(c.foods.length&&!loc.popup){const v=c.segs[1],vg=c.segs[2],vw=v.w+vg.w;
    if(!v.opt&&vw>=0.08)add(vw>=0.18?'bad':'warn','karte','veg',TR('Nichts für Vegetarier'),n0(vw*100)+TR(' % der Gäste im ')+AREAS[loc.area].n+TR(' essen vegetarisch oder vegan. Ohne passendes Hauptgericht bleiben sie weg und nehmen ihre Freunde mit. Pommes allein zählen nicht.'));
    else if(!vg.opt&&vg.w>=0.05)add('warn','karte','veg',TR('Nichts Veganes'),TR('Etwa ')+n0(vg.w*100)+TR(' % der Gäste hier essen vegan und finden kein Hauptgericht.'));
    else if(v.opt&&v.sat<c.segs[0].sat-8)add('warn','karte','veg',TR('Vegetarische Gäste unzufrieden'),TR('Sie achten stärker auf Qualität und Abwechslung. Einfach-Qualität enttäuscht sie, ein einziges Gericht ist ihnen zu wenig.'));}
  const RL=loc.regLog;
  if(RL&&RL.day===S.day-1&&loc.reg+RL.lost-RL.gain>=8){const net=RL.lost-RL.gain,base=loc.reg+net;
    if(net>base*0.05)add(net>base*0.1?'bad':'warn','betrieb','reg',TR('Stammkunden wandern ab: −')+n0(net),TR('Gestern ')+n0(RL.lost)+TR(' verloren, ')+n0(RL.gain)+TR(' gewonnen.')+(RL.why.length?TR(' Grund: ')+RL.why.join(', ')+'.':''),RL.why.includes(TR('Preise erhöht'))?[TR('Speisen'),'goto',{t:'karte'}]:null);}

  if(loc.last&&loc.last.res<-0.5)add('bad','betrieb','loss',TR('Gestern Verlust: ')+eur(loc.last.res),lossWhy(loc));
  else{const f=forecast(loc,c);if(f<-0.1*c.fix-20&&loc.last)add('warn','betrieb','loss',TR('Prognose im Minus: ')+eurS(f)+TR(' pro Tag'),TR('So wie es gerade läuft, deckt der Umsatz die Kosten nicht.'));}
  if(c.foods.length&&c.avgQ<T.exp-0.05&&loc.tier>=2)add('warn','karte','qual',TR('Qualität unter Erwartung'),TR('Gäste eines ')+gen(T.n)+TR(' erwarten „')+QN[T.exp-1]+TR('“, auf deiner Karte liegt der Schnitt bei ')+nf2.format(c.avgQ)+'.'+(loc.qual<T.exp?TR(' Kaufe dafür die nächste Qualitätsstufe.'):''));
  for(const x of c.foods.concat(c.drinks)){const id=x.P.id,m=x.m;
    if(m.price<x.ek*up-0.004)add('bad','karte','prod:'+id,x.P.n+TR(' unter Einkaufspreis'),TR('Jede Portion kostet ')+eur2(x.ek*up)+TR(' Ware und bringt ')+eur2(m.price)+'.');

  }
  for(const R of ROLES){if(R.id==='cook'&&nocook)continue;const w=Math.min(loc.want[R.id]||0,maxStaff(loc,R.id));
    if(loc.staff[R.id]<w&&!(loc.autoHire&&(loc.staff.lead||S.hq>0)&&R.id!=='cook'))add('warn','team','role:'+R.id,TR('Stelle frei: ')+R.n,(w-loc.staff[R.id])+TR(' von ')+w+TR(' unbesetzt.')+(loc.autoHire&&loc.staff.lead?TR(' Die Leitung sucht Ersatz.'):''));}
  const thief=loc.team.some(e=>e.trKnown&&e.tr==='dieb');
  if(loc.last&&loc.last.theft>0.5&&!thief)add('bad','team','theft',TR('Geld fehlt in der Kasse'),TR('Gestern fehlten ')+eur(loc.last.theft)+TR('. Jemand im Team greift zu, noch weißt du nicht, wer.'));
  for(const e of loc.team){const k='emp:'+e.id;
    if(e.trKnown&&(e.tr==='dieb'||e.tr==='giftig'))add('bad','team',k,e.name+' '+TRAIT[e.tr].n,e.tr==='dieb'?TR('Kann fristlos entlassen werden.'):TR('Die anderen arbeiten schlechter und kündigen eher.'));
    else if(e.trKnown&&(e.tr==='unzuv'||e.tr==='schlampig'))add('warn','team',k,e.name+' '+TRAIT[e.tr].n,TR('Kostet Leistung und Zufriedenheit.'));
    else if(S.day-e.day>=3&&e.sk<0.5&&!e.leaveDay)add('warn','team',k,e.name+TR(' ist ungeeignet'),roleName(e.role)+TR(' leistet nur einen Bruchteil, kostet aber ')+eur(e.pay)+TR(' am Tag.'));
    if(e.poach)add(loc.staff.lead?'warn':'bad','team',k,e.name+TR(' hat ein Abwerbeangebot'),e.poach.by+TR(' bietet ')+eur(e.poach.pay)+TR(' am Tag. ')+(loc.staff.lead?TR('Sonst entscheidet die Leitung.'):TR('Ohne Gegenangebot geht ')+e.name+TR(' nach Tag ')+e.poach.day+'.'));
    if(e.ask&&!loc.staff.lead)add('warn','team',k,e.name+TR(' will mehr Gehalt'),TR('Fordert ')+eur(e.ask.pay)+TR(' statt ')+eur(e.pay)+TR(' am Tag. Antwort bis Tag ')+e.ask.day+'.');
    if(moodOf(e)<35&&!e.leaveDay&&!e.temp)add('warn','team',k,e.name+TR(' ist unzufrieden'),TR('Arbeitet schlechter und kündigt eher. Gehalt, Überlastung oder Kollegen prüfen.'));
    if(e.leaveDay&&e.quit)add('warn','team',k,e.name+TR(' hat gekündigt'),TR('Geht nach Tag ')+(e.leaveDay-1)+TR('. Rechtzeitig Ersatz suchen.'));}
  P.sort((a,b)=>(a.k==='bad'?0:1)-(b.k==='bad'?0:1));
  return P;
}
function lossWhy(loc){const l=loc.last,it=[[TR('Personal'),l.wages],[TR('Miete'),l.rent],[TR('Wareneinsatz'),l.cogs],[TR('Verderb'),l.waste],[TR('Energie'),l.energy],['Marketing',l.mkt],[TR('Sonstiges'),l.other],[TR('Kassendifferenz'),l.theft||0]].sort((a,b)=>b[1]-a[1]);
  return TR('Umsatz ')+eur(l.rev)+TR('. Größte Posten: ')+it.slice(0,2).map(x=>x[0]+' '+eur(x[1])).join(', ')+'.';}
function coProblems(){
  const P=[],lim=dispoLimit(),cm=creditMax(),unc=uncovered(),add=(k,key,t,d)=>P.push({k,tab:'firma',key,t,d});
  if(S.strikes>0)add('bad','bank',TR('Mahnung ')+S.strikes+TR(' von 3'),TR('Kasse bis zum Tagesabschluss über ')+eur(-lim)+TR(' bringen, sonst ')+(S.strikes>=2?TR('Insolvenz'):TR('nächste Mahnung'))+'.');
  else if(S.cash<-lim)add('bad','bank',TR('Dispo-Rahmen überzogen'),TR('Bleibt die Kasse bis zum Tagesabschluss unter ')+eur(-lim)+TR(', gibt es eine Mahnung.'));
  else if(S.cash<0)add('warn','bank',TR('Konto im Minus'),TR('3 % Dispozinsen pro Tag, keine Investitionen möglich.'));
  if(S.loan>cm*0.75)add('warn','bank',TR('Kreditrahmen fast ausgeschöpft'),eur(S.loan)+TR(' von ')+eur(cm)+TR(', 1 % Zinsen pro Tag.'));
  if(unc)add('bad','hq',unc+(unc>1?TR(' Betriebe'):TR(' Betrieb'))+TR(' zu viel für deine Verwaltung'),TR('Überall verfällt die Ordnung schneller. Büro ausbauen oder Standorte schließen.'));
  if(S.tester){const weak=realLocs().filter(l=>l.tier>=1&&problems(l).some(p=>p.k==='bad')).map(l=>AREAS[l.area].n);add(weak.length?'bad':'warn','tester',TR('Restauranttester unterwegs'),TR('Kommt bis Tag ')+S.tester.by+TR(' in einen deiner Betriebe ab Foodtruck.')+(weak.length?TR(' Mit roten Problemen: ')+weak.join(', ')+'.':TR(' Halte überall Ordnung, Lager und Qualität hoch.')));}
  if(S.contract&&S.contract.type!=='tag'&&S.contract.until-S.day<=2)add('warn','contract',TR('Liefervertrag läuft aus'),'„'+CONTR[S.contract.type].n+TR('“ endet nach Tag ')+S.contract.until+TR('. Danach gelten wieder Tagespreise.'));
  if(S.card&&!S.locs.some(l=>l.id===S.card.loc))S.card=null;
  if(S.lastDay&&S.lastDay.total<-0.5)add('warn','result',TR('Firma gestern im Minus: ')+eur(S.lastDay.total),TR('Summe aller Betriebe nach Verwaltung und Zinsen.'));
  return P;
}
function pmap(list){const m={};for(const p of list){const o=m[p.key];if(!o)m[p.key]={k:p.k,t:[p.t]};else{o.t.push(p.t);if(p.k==='bad')o.k='bad';}}return m;}
function hc(k){const p=ui.pm&&ui.pm[k];return p?' hl hl-'+p.k:'';}
function hf(k){const p=ui.pm&&ui.pm[k];return p?'<div class="flag"><span aria-hidden="true">!</span>'+p.t.join(' · ')+'</div>':'';}
const pk=k=>' data-pk="'+k+'"';
const TABN={betrieb:TR('Laden'),karte:TR('Speisen'),team:'Team',ausbau:TR('Ausbau'),firma:TR('Büro')};
function probBtn(p){
  if(p.act)return B(p.act[0],p.act[1],p.act[2],{cls:'sm'+(p.act[1]==='goto'?'':' pri')});
  return B(TABN[p.tab]+' ›','goto',{t:p.tab,k:p.key},{cls:'sm'});
}
function probList(list,title,cur){
  if(!list.length)return '';
  return '<div class="probs" role="region" aria-label="'+title+'"><div class="probs-h">'+title+'</div>'+list.map(p=>'<div class="prob '+p.k+'"><div class="grow"><strong>'+p.t+'</strong><div class="small">'+p.d+'</div></div>'+(!p.act&&p.tab===cur?B(TR('Zeigen'),'goto',{t:p.tab,k:p.key},{cls:'sm'}):probBtn(p))+'</div>').join('')+'</div>';
}
function vacancy(loc){for(const R of ROLES)if(loc.staff[R.id]<Math.min(loc.want[R.id]||0,maxStaff(loc,R.id)))return R.n;return '';}
function status(loc,c){const P=problems(loc,c);return P.some(p=>p.k==='bad')?'bad':P.length?'warn':'good';}

function tips(loc,c){
  if(!c.foods.length)return TR('Auf der Karte steht kein Gericht. Ohne Angebot kommt niemand.');
  if(!(c.cooks>0))return TR('Hier kocht niemand. Schalte im Team eine Stellenanzeige für einen Koch oder arbeite selbst mit.');
  if(loc.stock<c.ek)return TR('Das Lager ist leer, Gäste gehen wieder und der Ruf leidet. Kaufe Ware nach.');
  if(Object.keys(loc.broken).length)return TR('Ein Gerät ist defekt und bringt bis zur Reparatur keine Leistung.');
  if(vacancy(loc))return TR('Die Stelle „')+vacancy(loc)+TR('“ ist frei geworden. ')+(loc.autoHire&&loc.staff.lead?TR('Die Leitung sucht Ersatz, das dauert ein paar Tage.'):TR('Sieh im Team nach Bewerbungen oder schalte eine Anzeige.'));
  if(loc.last&&loc.last.theft>1)return TR('In der Kasse fehlt Geld. Jemand im Team greift zu. Schau dir im Team vor allem die Neuzugänge an.');
  if(loc.ord<50)return TR('Die Ordnung ist schlecht: weniger Leistung, unzufriedene Gäste, Bußgeld bei einer Kontrolle. Mach einen Kontrollgang.');
  if(c.demand>c.cap*1.1)return TR('Engpass ')+c.neck+TR(': Es kommen mehr Gäste, als ihr schafft. ')+(c.neck===TR('Küche')?TR('Koch einstellen, Kochstation ausbauen oder Preise anheben.'):TR('Bedienung einstellen, Kassensystem ausbauen oder Preise anheben.'));
  if(loc.last&&loc.last.res<0)return TR('Gestern Verlust. Prüfe Preise und Einkaufskosten auf der Karte und ob Personal und Miete zum Andrang passen.');
  if(c.demand<c.cap*0.55)return TR('Ihr seid nicht ausgelastet. Günstigere Preise, größere Portionen oder Marketing bringen mehr Gäste.');
  if(loc.rep<c.sTarget-8)return TR('Der Ruf steigt gerade. Zufriedene Gäste bringen mit der Zeit mehr Andrang.');
  return TR('Läuft rund. Achte auf Ordnung und Lager, bevor du das Geld in den Ausbau steckst.');
}
function bon(loc){
  const l=loc.last;if(!l)return TR('<div class="bon"><div class="t">TAGESABSCHLUSS</div><hr><div>Noch kein abgeschlossener Tag.</div></div>');
  const L=(a,b)=>'<div class="l"><span>'+a+'</span><span>'+b+'</span></div>';
  return TR('<div class="bon"><div class="t">TAGESABSCHLUSS · TAG ')+l.day+'</div><hr>'+L(TR('Umsatz'),eur2(l.rev))+L(TR('Wareneinsatz'),eur2(-l.cogs))+L(TR('Verderb'),eur2(-l.waste))+L(TR('Personal'),eur2(-l.wages))+L(TR('Miete'),eur2(-l.rent))+L(TR('Energie'),eur2(-l.energy))+
    (l.mkt?L('Marketing',eur2(-l.mkt)):'')+(l.other?L(TR('Sonstiges'),eur2(-l.other)):'')+(l.theft>0.5?L(TR('Kassendifferenz'),eur2(-l.theft)):'')+(l.disc>0.5?L(TR('Stempelkarte'),eur2(-l.disc)):'')+(l.prov>0.5?L(TR('Lieferportal'),eur2(-l.prov)):'')+'<hr>'+'<div class="l sum"><span>ERGEBNIS</span><span>'+eur2(l.res)+'</span></div><hr>'+L(TR('Gäste bedient'),n0(l.served))+(l.regServed>=0.5?L(TR('davon Stammkunden'),n0(l.regServed)):'')+L(TR('Gäste gegangen'),n0(l.lost))+(l.reg!=null?L(TR('Stammkunden'),n0(l.reg)+' ('+(l.regGain-l.regLost>=0?'+':'−')+n0(Math.abs(l.regGain-l.regLost))+')'):'')+'</div>';
}
const K_='var(--shop-ink)',W_='var(--shop-wall)',G_='var(--shop-glass)',A_='var(--accent)',N_='var(--awn2)';
function awn(x,y,w,h,n){let o='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+A_+'"/>';const sw=w/(2*n);for(let i=0;i<n;i++)o+='<rect x="'+(x+sw*(2*i+1)).toFixed(2)+'" y="'+y+'" width="'+sw.toFixed(2)+'" height="'+h+'" fill="'+N_+'"/>';return o+'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="none" stroke="'+K_+'" stroke-width=".6"/>';}
function shopInner(t){
  const R=(x,y,w,h,f,ex)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+f+'"'+(ex||'')+'/>',st=' stroke="'+K_+'" stroke-width="1"';
  if(t===0)return '<path d="M5 16Q24 -4 43 16Z" fill="'+A_+'"'+st+'/><path d="M17 16Q20 3 24 2Q28 3 31 16Z" fill="'+N_+'"/>'+R(23.2,15,1.6,12,K_)+R(9,25,30,9,W_,' rx="1.5"'+st)+'<circle cx="16" cy="36.6" r="3.2" fill="'+K_+'"/><circle cx="32" cy="36.6" r="3.2" fill="'+K_+'"/>';
  if(t===1)return R(3,10,31,22,W_,' rx="2"'+st)+'<path d="M34 17h7l4 6v9h-11z" fill="'+A_+'"'+st+'/><path d="M36 19h4l2.5 4h-6.5z" fill="'+G_+'"/>'+R(8,17,20,8,G_,' stroke="'+K_+'" stroke-width=".8"')+awn(7,12,22,4.5,4)+'<circle cx="12" cy="34" r="4.2" fill="'+K_+'"/><circle cx="37" cy="34" r="4.2" fill="'+K_+'"/><circle cx="12" cy="34" r="1.4" fill="'+W_+'"/><circle cx="37" cy="34" r="1.4" fill="'+W_+'"/>';
  if(t===2)return R(6,15,36,25,W_,st)+R(4,11,40,5,K_,' rx="1"')+awn(6,16,36,6,6)+R(10,25,19,8,G_,' stroke="'+K_+'" stroke-width=".8"')+R(9,33,21,1.6,K_)+R(33,25,6.5,15,K_);
  if(t===3)return '<path d="M2 14L24 3L46 14Z" fill="var(--shop-roof)"'+st+'/>'+R(5,14,38,26,W_,st)+awn(7,18,34,5,6)+R(9,26,10,9,G_,' stroke="'+K_+'" stroke-width=".8"')+R(29,26,10,9,G_,' stroke="'+K_+'" stroke-width=".8"')+R(21,26,6,14,K_);
  if(t===4)return R(3,5,42,35,W_,st)+R(2,3,44,3,K_)+[7,17,27,37].map(x=>R(x,9,4.5,6,G_)).join('')+R(8,18,32,4,K_,' rx="1"')+awn(5,23,38,5,7)+R(7,30,12,8,G_,' stroke="'+K_+'" stroke-width=".8"')+R(29,30,12,8,G_,' stroke="'+K_+'" stroke-width=".8"')+R(21,29,6,11,K_);
  return '<path d="M3 12L24 2L45 12Z" fill="'+W_+'"'+st+'/><path d="M24 4.2l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="'+A_+'"/>'+R(5,12,38,28,W_,st)+[8,15.5,29.9,37.4].map(x=>R(x,13,2.6,27,N_,' stroke="'+K_+'" stroke-width=".5"')).join('')+R(11.2,18,3.8,9,G_)+R(33,18,3.8,9,G_)+awn(18.5,22,11,4,3)+R(20.5,27,7,13,K_);
}
function shop(t){return img('tier/t'+clamp(t,0,5),'shopimg');}
function scene(loc,c){
  const w=wxToday(),wet=w==='regen'||w==='sturm',x=S.dayT/DAY,ph=phaseName(x);
  const tint=ph===TR('Nacht')?'night':wet?'wet':w==='schnee'||w==='frost'?'cold':ph===TR('Abend')?'eve':ph===TR('Morgen')?'morn':'';
  const n=c.queueCap>0?Math.min(12,Math.round(loc.queue/c.queueCap*12)):0;
  let q='';for(let i=0;i<n;i++)q+=img('guest/g'+(i%3+1),'sc-g" style="--i:'+i);
  const closed=!(c.cooks>0)||!c.foods.length?TR('Geschlossen'):loc.stock<c.ek?TR('Ausverkauft'):'';
  const t=clamp(loc.tier,0,5),anim=ANIM.includes(t);
  return '<div class="scene '+tint+'" role="img" aria-label="'+TIERS[loc.tier].n+' '+AREAS[loc.area].n+', '+n+TR(' Gäste in der Schlange">')+(anim?img('anim/t'+t,'sc-bg'):img('bg/street','sc-bg')+img('tier/t'+t,'sc-shop'))+'<div class="sc-q">'+q+'</div><div class="sc-tint"></div>'+
    (closed?'<div class="sc-closed">'+closed+'</div>':'')+'</div>';
}
const ANIM=[1,2,3,4,5];
const APOS=[[50,54],[70,34],[20,18],[32,40],[82,80],[22,88],[72,58],[84,13],[50,21],[26,65],[58,107],[52,80]];
const MAPSVG='<img class="mapimg" src="art/bg/map.webp" alt="" aria-hidden="true">';
function locRows(){let h='';S.locs.forEach(loc=>{const c=calc(loc),P=problems(loc,c),st=P.some(p=>p.k==='bad')?'bad':P.length?'warn':'good';
  h+='<div class="card'+(st==='good'?'':' hl hl-'+st)+'"><div class="row"><div class="grow"><h3>'+locName(loc)+'</h3>'+chips([chip('cash',loc.last?eurS(loc.last.res):'–',loc.last?(loc.last.res<0?'bad':'good'):''),chip('star',n0(loc.rep)),chip('heart',n0(loc.reg||0)),chip('broom',n0(loc.ord)+' %',loc.ord<60?'warn':''),loc.staff.lead?'':chip('crown',TR('ohne Leitung'),'mute')])+'</div>'+B(TR('Öffnen'),'open',{id:loc.id},{cls:'sm'})+'</div>'+
    (P.length?'<div class="plist">'+P.slice(0,4).map(p=>'<button type="button" class="pchip '+p.k+'" data-a="goto" data-id="'+loc.id+'" data-t="'+p.tab+'" data-k="'+p.key+'">'+p.t+'</button>').join('')+(P.length>4?TR('<span class="small">und ')+(P.length-4)+' weitere</span>':'')+'</div>':'')+'</div>';});return h;}
function compList(){const C=S.comps||[];if(!C.length)return '';
  return TR('<div class="card"><h3>Konkurrenz in der Stadt</h3>')+C.map(cp=>{const loc=realLocs().find(l=>l.area===cp.area),c=loc&&S.day>=cp.open?calc(loc):null;
    return '<div class="evrow"><span class="cdot" aria-hidden="true">'+shop(2)+'</span><div class="grow"><strong>'+cp.n+'</strong> · '+AREAS[cp.area].n+'<div class="small">'+(S.day<cp.open?TR('eröffnet an Tag ')+cp.open:c?TR('zieht deinem Betrieb ')+n0(c.compF*100)+' % Laufkundschaft ab':TR('kein eigener Betrieb in der Lage'))+(S.day<(cp.promoUntil||0)?TR(' · Rabattaktion'):'')+'</div></div>'+B(TR('Ansehen'),'compInfo',{id:cp.id},{cls:'sm'})+'</div>';}).join('')+'</div>';}
function vStadt(){
  let h=TR('<div class="head"><div><h2>Stadtplan</h2></div></div>')+cardBox()+'<div class="map">'+MAPSVG;
  AREAS.forEach((A,i)=>{const loc=S.locs.find(l=>l.area===i),pos='left:'+APOS[i][0]+'%;top:'+(APOS[i][1]/1.22).toFixed(1)+'%',ev=evAt(i)||(S.cev||[]).find(e=>e.area===i&&e.start>S.day),evT=ev?'<span class="pinE'+(S.day>=ev.start?' on':'')+'">'+evDef(ev).n+(S.day>=ev.start?'':TR(' · Tag ')+ev.start)+'</span>':'';
    if(loc){const P=problems(loc),st=P.some(p=>p.k==='bad')?'bad':P.length?'warn':'good';
      h+='<button type="button" class="pin own '+st+(loc.id===S.sel?' cur':'')+'" style="'+pos+'" data-a="open" data-id="'+loc.id+'" aria-label="'+locName(loc)+TR(' öffnen')+(P.length?', '+P.length+' Probleme':'')+'">'+shop(loc.tier)+'<span class="st">'+(P.length||'')+'</span><span class="pinL">'+A.n+'</span><span class="pinS '+(loc.last&&loc.last.res<0?'neg':'')+'">'+(loc.stars?'★'.repeat(loc.stars)+' ':'')+(loc.last?eurS(loc.last.res):loc.popup?'Pop-up':TIERS[loc.tier].n)+'</span>'+evT+'</button>';}
    else h+='<button type="button" class="pin free" style="'+pos+'" data-a="plot" data-i="'+i+TR('" aria-label="Grundstück ')+A.n+TR(' ansehen"><span class="plus">+</span><span class="pinL">')+A.n+'</span>'+evT+'</button>';});
  (S.comps||[]).forEach(cp=>{const pos='left:'+(APOS[cp.area][0]-8)+'%;top:'+((APOS[cp.area][1]-9)/1.22).toFixed(1)+'%';h+='<button type="button" class="cmark'+(S.day<cp.open?' soon':'')+'" style="'+pos+'" data-a="compInfo" data-id="'+cp.id+TR('" aria-label="Konkurrenz ')+cp.n+TR(' im ')+AREAS[cp.area].n+'">'+shop(2)+'</button>';});
  const nP=S.locs.filter(l=>problems(l).length).length;
  h+='</div>'+compList()+questBox()+probList(coProblems(),TR('Probleme der Firma'),'')+wxBox()+TR('<div class="lbl">Deine Betriebe (')+realLocs().length+TR(' von 12)')+(nP?' · <span class="neg">'+nP+' mit Problemen</span>':'')+'</div>'+locRows();
  return h;
}
function locBar(loc){const n=S.locs.length,i=S.locs.indexOf(loc);
  return '<div class="locbar">'+B(TR('‹ Stadtplan'),'tab',{t:'stadt'},{cls:'sm'})+'<div class="grow">'+locName(loc)+(n>1?' · '+(i+1)+TR(' von ')+n:'')+'</div>'+(n>1?B('‹','nextLoc',{d:-1},{cls:'sm'})+B('›','nextLoc',{d:1},{cls:'sm'}):'')+'</div>';}
function spark(a){if(a.length<2)return '';const mx=Math.max(1,...a),W=100,H=26,st=W/(a.length-1),pts=a.map((v,i)=>(i*st).toFixed(1)+','+(H-2-v/mx*(H-6)).toFixed(1));
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><path d="M0,'+H+' L'+pts.join(' L')+' L'+W+','+H+'Z" fill="var(--accent)" opacity=".25"/><polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--accent-text)" stroke-width="1.6" vector-effect="non-scaling-stroke"/><circle cx="'+pts[pts.length-1].split(',')[0]+'" cy="'+pts[pts.length-1].split(',')[1]+'" r="2.2" fill="var(--accent-text)"/></svg>';}
function regStat(loc,c){
  const R=loc.regLog,sh=c.demand>0?c.regD/c.demand*100:0;
  return '<div class="stat wide'+hc('reg')+'"'+pk('reg')+'>'+hf('reg')+TR('<div class="row"><div class="lbl">Stammkunden</div><div class="num small">')+(R?TR('gestern <span class="pos">+')+n0(R.gain)+'</span> / <span class="'+(R.lost>R.gain?'neg':'')+'">−'+n0(R.lost)+'</span>':TR('noch keine Bilanz'))+'</div></div>'+
    '<div class="row top"><div class="v">'+n0(loc.reg||0)+'</div>'+spark(loc.regHist||[])+'</div>'+
    chips([chip('guests',n0(c.regD)+TR(' Gäste/Tag')),chip('percent',n0(sh)+TR(' % aller Gäste'))])+'</div>';
}
const WXI={sonne:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
 heiss:'<circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"/>',
 wolken:'<path d="M7 18.5h10.2a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.4A3.3 3.3 0 0 0 7 18.5z"/>',
 regen:'<path d="M7 15h10.2a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.4A3.3 3.3 0 0 0 7 15z"/><path d="M8.5 18l-1 2.8M12.5 18l-1 2.8M16.5 18l-1 2.8"/>',
 sturm:'<path d="M7 14.5h10.2a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.4A3.3 3.3 0 0 0 7 14.5z"/><path d="M12.8 14.5l-2.3 4h3l-2 4" />',
 schnee:'<path d="M7 15h10.2a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.4A3.3 3.3 0 0 0 7 15z"/><circle cx="8.5" cy="19" r=".9" fill="currentColor"/><circle cx="12" cy="21" r=".9" fill="currentColor"/><circle cx="15.5" cy="19" r=".9" fill="currentColor"/>',
 frost:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2"/>'};
function wxIcon(w){return img('ic/wx_'+w,'wxi');}
function wxLine(loc,c){const w=wxToday(),ev=evAt(loc.area),parts=[WX[w].n+' '+((S.wx&&S.wx.temp)||0)+TR('°: Laufkundschaft ')+pct(c.wxM)];
  if(ev)parts.push(evDef(ev).n+' '+pct(c.evM));if(loc.stars)parts.push('★'.repeat(loc.stars)+' '+pct(1+0.12*loc.stars));
  return '<div class="wxline">'+wxIcon(w)+'<span>'+parts.join(' · ')+TR('. Morgen ')+WX[S.wx.fc[0]].n+'.</span></div>';}
function gen(n){return n.endsWith('s')?n+'ses':n+'s';}
function starStr(x){const r=clamp(Math.round(x),0,5);return '★'.repeat(r)+'☆'.repeat(5-r);}
function reviewsBox(loc){const R=loc.reviews||[];if(!R.length)return '';const avg=R.reduce((a,r)=>a+r.s,0)/R.length;
  return TR('<div class="card"><div class="row"><h3>Bewertungen</h3><span class="stars" aria-label="Schnitt ')+avg.toFixed(1).replace('.',',')+TR(' von 5">')+starStr(avg)+' <span class="num small">'+avg.toFixed(1).replace('.',',')+'</span></span></div>'+
    R.slice(0,4).map(r=>'<div class="rev"><div class="row"><span class="stars" aria-label="'+r.s+TR(' von 5">')+starStr(r.s)+'</span><span class="small">'+r.n+TR(' · Tag ')+r.d+'</span></div><div>„'+r.t+'“</div></div>').join('')+'</div>';}
function cardBox(onlyLoc){const cd=S.card;if(!cd||(onlyLoc&&cd.loc!==onlyLoc))return '';const l=S.locs.find(x=>x.id===cd.loc),V=cardView(cd);if(!V)return '';
  return '<div class="ecard"'+(onlyLoc?pk('card'):'')+TR('><div class="ecard-h">Entscheidung · ')+locName(l)+'</div><h3>'+V.t+'</h3><p>'+V.x+'</p><div class="eopts">'+V.o.map((o,i)=>'<button type="button" class="eopt" data-a="cardOpt" data-i="'+i+'"'+(o[2]&&S.cash<o[2]?' disabled':'')+'><strong>'+o[0]+(o[2]?' · '+eur(o[2]):'')+'</strong>'+(o[1]?'<span>'+o[1]+'</span>':'')+'</button>').join('')+TR('</div><div class="small">Ohne Antwort bis Tag ')+cd.until+TR(' gilt „')+V.o[V.o.length-1][0]+'“.</div></div>';}
function wxBox(){const se=season();let h=TR('<div class="card"><div class="row"><h3>Wetter und Termine</h3><span class="small">')+SEASONS[se]+TR(', Tag ')+((S.day-1)%SEASON_LEN+1)+TR(' von ')+SEASON_LEN+'</span></div><div class="wxrow">';
  [[TR('Heute'),S.wx.w,(S.wx.temp||0)+'°'],[TR('Morgen'),S.wx.fc[0],TR('ziemlich sicher')],[TR('Übermorgen'),S.wx.fc[1],TR('unsicher')]].forEach(x=>{h+='<div class="wxd"><div class="lbl">'+x[0]+'</div>'+wxIcon(x[1])+'<div>'+WX[x[1]].n+'</div><div class="small">'+x[2]+'</div></div>';});
  const f=S.wx.fc[0],W=WX[f],sd=SEASON_DEM[season(S.day+1)],hot=f==='heiss'||(f==='sonne'&&season(S.day+1)===1),cold=f==='schnee'||f==='frost'||season(S.day+1)===3;
  h+=TR('</div><div class="lbl">Morgen</div>')+chips([chip('truck',TR('Stand/Truck ')+pct(W.out*sd[0]),W.out*sd[0]<0.9?'bad':W.out*sd[0]>1.05?'good':''),chip('rent','Restaurant '+pct(W.in*sd[1])),hot?chip('glass',TR('Getränke ↑'),'good'):'',hot?chip('flame','Grill ↑','good'):'',hot?chip('leaf','Bowls ↑','good'):'',cold||f==='regen'||f==='sturm'?chip('flame',TR('Warmes ↑'),'good'):'',cold?chip('glass',TR('Wein ↑'),'good'):'',season()===3?chip('box',TR('Ware +8 %'),'bad'):season()===1?chip('box',TR('Ware −4 %'),'good'):'']);
  const E=(S.cev||[]).slice().sort((a,b)=>a.start-b.start);
  h+=TR('<div class="row"><div class="lbl">Stadtereignisse</div>')+hb('popup')+'</div>'+(E.length?E.map(e=>{const d=evDef(e),act=S.day>=e.start,own=S.locs.find(l=>l.area===e.area);
    return '<div class="evrow'+(act?' on':'')+'">'+img('ev/'+e.type,'evimg')+'<div class="grow"><strong>'+d.n+'</strong> · '+AREAS[e.area].n+''+chips([chip('calendar',act?TR('bis Tag ')+e.end:'in '+(e.start-S.day)+(e.start-S.day===1?TR(' Tag'):TR(' Tagen')),act?'good':''),chip('guests',pct(d.mult),'good')].concat(Object.keys(d.pref).map(k=>chip(P_(k).drink?'glass':'dish',SHORT[k]||P_(k).n))))+'</div>'+
      (own?(own.popup?TR('<span class="pill good">Pop-up gebucht</span>'):B(TR('Vorbereiten'),'goto',{id:own.id,t:'betrieb',k:'prep'},{cls:'sm pri'})):B(TR('Pop-up-Stand'),'popup',{ev:e.id},{cls:'sm pri',cost:eur(popCost(e)),dis:S.cash<popCost(e)}))+'</div>';}).join(''):TR('<div class="small">Zurzeit ist nichts angekündigt.</div>'));
  return h+ht('popup',TR('Ein Pop-up-Stand läuft nur während des Ereignisses, mit einer Aushilfe in der Küche. Arbeitest du selbst mit, schafft er doppelt so viel. Ware kaufst du selbst ein, Restware wird zur Hälfte erstattet.'))+'</div>';}
function questBox(){const Q=S.quests||[];if(!Q.length)return '';
  return TR('<div class="card quests"><div class="row"><h3>Aufträge heute</h3><span class="small num">Serie: ')+(S.qStreak||0)+' '+((S.qStreak||0)===1?TR('Tag'):TR('Tage'))+'</span></div>'+Q.map(q=>{const pr=questProg(q);
    return '<div class="quest'+(q.done?' done':q.fail?' fail':'')+'"><div class="row top"><div class="grow">'+questText(q)+'</div><span class="num small">'+(q.done?'erledigt':q.fail?'verfehlt':'+'+eur(q.rew))+'</span></div>'+(q.done||q.fail?'':pr!=null?meter(pr*100,'acc'):TR('<div class="small">Wird zum Tagesabschluss geprüft.</div>'))+'</div>';}).join('')+TR('<div class="small">Alle drei geschafft: Bonus ')+eur(S.qBonus||0)+'.</div></div>';}
function tempCard(loc,a){const ev=(S.cev||[]).find(e=>e.id===a.ev);const z=a.zl<0?TR('kein Zeugnis'):'„… '+ZG[a.zl]+'.“';
  return '<div class="tcand'+(a.booked?' on':'')+'"><div class="row top"><div class="grow"><strong>'+a.name+', '+a.age+'</strong> '+rarB(a.rar)+'<div class="small">'+roleName(a.role)+' · '+a.exp+'</div><div class="small">'+z+' '+a.tk+'</div></div>'+
    '<div style="text-align:right"><div class="num">'+eur(a.rate)+TR('</div><div class="small">pro Tag</div></div></div>')+
    attrGrid(a,false,a.role)+'<div class="btns">'+(a.booked?TR('<span class="pill good">gebucht für Tag ')+a.start+(a.end>a.start?'–'+a.end:'')+'</span>'+(a.joined?'':B(TR('Stornieren'),'tCancel',{id:a.id},{cls:'sm',cost:TR('50 % zurück')})):B(TR('Buchen'),'tBook',{id:a.id},{cls:'sm pri',cost:ev?eur(a.rate*(ev.end-ev.start+1)):'',dis:!ev}))+'</div></div>';}
function prepBox(loc,c){const E=prepEvents(loc);if(!E.length)return '';let h='';
  for(const ev of E){const d=evDef(ev),act=S.day>=ev.start,dl=ev.start-S.day,base=c.demand/(c.evM||1),exp=base*d.mult,ap=(loc.tapps||[]).filter(a=>a.ev===ev.id),bk=ap.filter(a=>a.booked),open=ap.filter(a=>!a.booked);
    h+='<div class="card prep"'+pk('prep')+'><div class="row"><h3>'+(act?TR('Heute: '):TR('Vorbereitung: '))+d.n+'</h3><span class="pill '+(act?'good':dl<=2?'warn':'mute')+'">'+(act?TR('läuft bis Tag ')+ev.end:dl===1?TR('morgen'):'in '+dl+TR(' Tagen'))+'</span></div>'+
      chips([chip('calendar',TR('Tag ')+ev.start+(ev.end>ev.start?'–'+ev.end:'')),chip('guests','≈ '+n0(exp)+TR(' statt ')+n0(base),'warn'),chip('flame',TR('Küche ')+n0(c.cap),c.cap<exp?'bad':'good')].concat(Object.keys(d.pref).map(k=>chip(P_(k).drink?'glass':'dish',SHORT[k]||P_(k).n))));
    if(bk.length)h+=TR('<div class="lbl">Gebuchte Aushilfen</div>')+bk.map(a=>tempCard(loc,a)).join('');
    if(!act){h+=TR('<div class="row"><div class="lbl">Aushilfen suchen</div>')+hb('temp')+'</div>'+ht('temp',TR('Aushilfen arbeiten nur an den Ereignistagen und werden einmalig bezahlt, zusätzlich zu deinen festen Stellen. Je früher du suchst, desto mehr Auswahl hast du. Wer gut war, möchte vielleicht bleiben.'))+'<div class="btns">'+
        tempRoles(loc).map(R=>{const on=(loc.tsearch||[]).some(t=>t.ev===ev.id&&t.role===R.id);return B(on?R.n+' · Suche läuft':R.n+TR(' suchen'),'tSearch',{ev:ev.id,r:R.id},{cls:'sm'+(on?'':' pri'),cost:on?null:eur(tempFee(loc,R.id)),dis:on||S.cash<tempFee(loc,R.id)});}).join('')+'</div>';
      if(open.length)h+=TR('<div class="lbl">Bewerbungen (')+open.length+')</div>'+open.slice().reverse().map(a=>tempCard(loc,a)).join('');
      h+=chips([chip('box',TR('Lager auffüllen'),'warn')]);}
    h+='</div>';}
  return h;}
function offersBox(loc){const O=loc.toffers||[];if(!O.length)return '';
  return TR('<div class="card"><h3>Aushilfen, die bleiben möchten</h3>')+O.map(o=>{const pl=o.sk<0.5?[TR('ungeeignet'),'bad']:o.sk<0.85?[TR('schwach'),'warn']:o.sk<1.1?[TR('solide'),'mute']:o.sk<1.3?[TR('stark'),'good']:[TR('herausragend'),'good'];
    return '<div class="tcand"><div class="row top"><div class="grow"><strong>'+o.name+'</strong> '+rarB(o.rar)+'<div class="small">'+roleName(o.role)+TR(' · hat sich ')+pl[0]+TR(' geschlagen')+(o.trKnown&&o.tr?', '+TRAIT[o.tr].n:'')+'</div></div><div style="text-align:right"><div class="num">'+eur(o.pay)+TR('</div><div class="small">pro Tag fest</div></div></div>')+
      attrGrid(o,true,o.role)+'<div class="btns">'+B(TR('Fest übernehmen'),'tTake',{id:o.id},{cls:'sm pri',cost:eur(o.pay)})+B(TR('Verabschieden'),'tBye',{id:o.id},{cls:'sm'})+TR('</div><div class="small">Angebot gilt bis Tag ')+o.until+'.</div></div>';}).join('')+'</div>';}
const IC={
 guests:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 13.6c2.4.3 4 2.4 4 5"/>',
 cash:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>',
 rent:'<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
 star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
 heart:'<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>',
 broom:'<path d="M15 3l-4.5 8"/><path d="M7 12h8l2 9H5z"/><path d="M9 16v5M13 16v5"/>',
 box:'<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
 drop:'<path d="M12 3c3 4 5.5 7 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 10 9 7 12 3z"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
 flame:'<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 5-3 8a6 6 0 0 0 6 6z"/>',
 tray:'<path d="M3 17h18"/><path d="M5 17a7 7 0 0 1 14 0"/><path d="M12 8V6"/>',
 glass:'<path d="M7 4h10l-1.5 15h-7z"/><path d="M7.4 9h9.2"/>',
 leaf:'<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 chef:'<path d="M7 14v5h10v-5"/><path d="M7 14a4 4 0 0 1-1-7.8A4 4 0 0 1 12 4a4 4 0 0 1 6 2.2A4 4 0 0 1 17 14z"/>',
 crown:'<path d="M4 17l-1-9 5 4 4-7 4 7 5-4-1 9z"/><path d="M4 20h16"/>',
 shield:'<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/>',
 hands:'<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3 19c0-3 2.2-5 5-5s5 2 5 5M11 19c0-3 2.2-5 5-5s5 2 5 5"/>',
 smile:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
 check:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l3 3 5-6"/>',
 bolt:'<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
 truck:'<path d="M2.5 7h11v9h-11z"/><path d="M13.5 10h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
 trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8"/>',
 calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
 bank:'<path d="M3 9l9-5 9 5"/><path d="M5 10v7M10 10v7M14 10v7M19 10v7M3 20h18"/>',
 percent:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
 dish:'<path d="M3 16h18"/><path d="M5 16a7 7 0 0 1 14 0"/><path d="M12 7V5"/><path d="M6 19h12"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
 warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.01"/>',
 up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
 megaphone:'<path d="M4 10v4h3l8 4V6l-8 4z"/><path d="M18 9a4 4 0 0 1 0 6"/>'};
const ART='art/';
function img(src,cls,alt){return '<img class="'+cls+'" src="'+ART+src+'.webp" alt="'+(alt||'')+'"'+(alt?'':' aria-hidden="true"')+' loading="lazy" onerror="this.style.visibility=\'hidden\'">';}
function porSrc(name){return 'por/'+String(name||'').split(' ')[0];}
function por(name,cls){return img(porSrc(name),cls||'por');}
function ic(n){if(n)return img('ic/'+n,'ic');return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IC[n]||'')+'</svg>';}
function chip(n,txt,cls){return '<span class="chip2'+(cls?' '+cls:'')+'">'+ic(n)+'<span>'+txt+'</span></span>';}
function chips(a){return '<div class="chips2">'+a.filter(Boolean).join('')+'</div>';}
function hb(k){return '<button type="button" class="hbtn" data-a="help" data-k="'+k+'" aria-expanded="'+!!(ui.help&&ui.help[k])+TR('" aria-label="Erklärung anzeigen">')+ic('info')+'</button>';}
function ht(k,t){return ui.help&&ui.help[k]?'<div class="htext">'+t+'</div>':'';}
function h3h(title,k){return '<div class="row"><h3>'+title+'</h3>'+hb(k)+'</div>';}
const MACHIC={herd:['flame',TR('+30 % Küche')],kuehl:['box',TR('+40 % Lager')],bar:['glass',TR('Getränke')],kasse:['tray',TR('+20 % Service')],spuel:['broom',TR('Ordnung hält')],extra:['cash',TR('+5 % Umsatz')]};
const ROLEIC={cook:['chef',TR('kocht')],help:['broom',TR('+12 % Küche')],serv:['tray',TR('≈ 90 Gäste')],bar:['glass',TR('+130 Getränke')],lead:['crown',TR('organisiert')]};
const ATTRIC={fk:'chef',tm:'hands',fu:'crown',be:'shield',fr:'smile',zu:'check'};
function vBetrieb(loc,c){
  const T=TIERS[loc.tier],st=status(loc,c);
  const PL=ui.pl||problems(loc,c);
  let h=scene(loc,c)+'<div class="head"><div><h2>'+T.n+'</h2><p class="sub">'+AREAS[loc.area].n+(loc.stars?' · <span class="stars">'+'★'.repeat(loc.stars)+'</span>':'')+(loc.sig?' · '+loc.sig.name:'')+(S.ownerAt===loc.id?TR(' · du arbeitest hier mit'):'')+(loc.popup?TR(' · bis Tag ')+loc.popup:'')+'</p></div><span class="pill '+st+'">'+(st==='good'?TR('läuft'):PL.length+(PL.length===1?TR(' Problem'):TR(' Probleme')))+'</span></div>';
  h+=rushBanner(loc)+cardBox(loc.id)+prepBox(loc,c)+probList(PL,TR('Zu erledigen'),'betrieb');
  if(loc.offer){const o=loc.offer;h+=TR('<div class="event"><div><strong>Catering-Anfrage.</strong> ')+o.n+TR(' Portionen für ')+eur(o.pay)+TR('. Braucht ')+n0(Math.ceil(o.need))+TR(' Wareneinheiten aus dem Lager. Gilt bis zum Tagesabschluss.</div><div class="btns">')+B(TR('Liefern'),'accept',{},{cls:'sm pri',dis:loc.stock<o.need})+B(TR('Ablehnen'),'decline',{},{cls:'sm'})+'</div></div>';}
  const out=loc.team.filter(e=>!active(e));
  if(out.length)h+=TR('<div class="event"><div><strong>Ausfälle heute.</strong> ')+out.map(e=>e.name+' ('+roleName(e.role)+(S.t<e.sickUntil?TR(', krank'):S.t<(e.trainUntil||0)?TR(', in Schulung'):S.t<(e.awayUntil||0)?TR(', bei Dreharbeiten'):TR(', nicht erschienen'))+')').join(', ')+'.</div></div>';
  if(S.t<loc.boostUntil)h+=TR('<div class="event good"><div><strong>Food-Blog-Bericht.</strong> 40 % mehr Andrang. Wer jetzt nicht liefern kann, verliert Ruf.</div></div>');
  if(S.t<S.market.until)h+='<div class="event '+(S.market.mult<1?'good':'bad')+'"><div>'+S.market.label+'.</div></div>';
  if(!PL.length)h+='<div class="tip">'+tips(loc,c)+'</div>';
  const fc=forecast(loc,c),capTxt=isFinite(c.cap)?n0(c.cap):'∞',util=c.cap>0?c.demand/c.cap*100:100;
  h+='<div class="stats">'+
    TR('<div class="stat"><div class="lbl">Gäste heute</div><div class="v">')+n0(loc.today.served)+'</div><div class="small '+(loc.today.lost>=1?'neg':'')+'">'+n0(loc.today.lost)+TR(' gegangen</div></div>')+
    '<div class="stat'+hc('loss')+'"'+pk('loss')+'>'+hf('loss')+TR('<div class="lbl">Prognose pro Tag</div><div class="v ')+(fc<0?'neg':'')+'">'+eurS(fc)+TR('</div><div class="small">nach Fixkosten ')+eur(c.fix)+'</div></div>'+
    '<div class="stat wide'+hc('cap')+'"'+pk('cap')+'>'+hf('cap')+TR('<div class="row"><div class="lbl">Andrang und Kapazität</div><div class="num small">')+n0(c.demand)+' / '+capTxt+TR(' pro Tag</div></div>')+meter(util,util>100?'bad':util>85?'warn':'acc')+chips([chip('flame',TR('Küche ')+n0(c.prodCap),c.neck===TR('Küche')&&util>95?'warn':''),isFinite(c.servCap)?chip('tray','Service '+n0(c.servCap),c.neck==='Service'&&util>95?'warn':''):chip('tray',TR('Theke'))])+'</div>'+
    regStat(loc,c)+
    '<div class="stat'+hc('rep')+'"'+pk('rep')+'>'+hf('rep')+TR('<div class="row"><div class="lbl">Ruf</div><div class="num">')+n0(loc.rep)+'</div></div>'+meter(loc.rep,lvlCls(loc.rep),c.sTarget)+TR('<div class="small">Tendenz ')+(c.sTarget>loc.rep+1?TR('steigend'):c.sTarget<loc.rep-1?TR('fallend'):TR('stabil'))+TR(' (Ziel ')+n0(c.sTarget)+')</div></div>'+
    '<div class="stat'+hc('ord')+'"'+pk('ord')+'>'+hf('ord')+TR('<div class="row"><div class="lbl">Ordnung</div><div class="num">')+n0(loc.ord)+' %</div></div>'+meter(loc.ord,lvlCls(loc.ord))+B(TR('Kontrollgang'),'check',{},{cls:'sm',dis:loc.ord>97})+'</div>'+
  '</div>';
  // Lager
  const use=dailyUse(loc,c)+loc.stock*c.spoil,days=use>0?loc.stock/use:0,fill=loc.stock/c.store*100;
  const q50=Math.max(0,c.store*0.5-loc.stock),q100=Math.max(0,c.store-loc.stock);
  const autoOk=loc.tier>=1||loc.staff.lead>0;
  h+='<div class="card'+hc('stock')+'"'+pk('stock')+'>'+hf('stock')+TR('<div class="row"><h3>Lager ')+hb('lager')+'</h3><div class="num small">'+n0(loc.stock)+' / '+n0(c.store)+TR(' Einheiten</div></div>')+meter(fill,fill<20?'bad':fill<40?'warn':'acc')+
    chips([chip('clock',(days>=10?n0(days):days.toFixed(1).replace('.',','))+TR(' Tage')),chip('drop',n0(c.spoil*100)+TR(' % Verderb')),chip('tag',eur2(unitPrice(loc,1,false))+TR(' / Einheit'),marketMult()<1?'good':marketMult()>1?'bad':'')])+ht('lager',TR('Mengenrabatt: ab 500 Einheiten 4 %, ab 2.000 8 %, ab 8.000 12 %. Ware verdirbt jeden Tag ein Stück, eine bessere Kühlung senkt das.'))+
    '<div class="btns">'+B(TR('Auf halb voll'),'buy',{f:0.5},{cls:'sm',cost:eur(q50*unitPrice(loc,q50,false)),dis:q50<1})+B(TR('Auffüllen'),'buy',{f:1},{cls:'sm pri',cost:eur(q100*unitPrice(loc,q100,false)),dis:q100<1})+'</div>'+
    (autoOk?'<div class="row"><div class="grow">'+chip('truck',loc.staff.lead?TR('Leitung bestellt unter 25 %'):TR('Abo unter 25 % · +15 %'))+'</div><button type="button" class="switch" data-a="auto" aria-pressed="'+loc.auto+'">'+(loc.auto?TR('Nachbestellung an'):TR('Nachbestellung aus'))+'</button></div>':chips([chip('truck',TR('Nachbestellung ab Foodtruck'),'mute')]))+'</div>';
  const pcd=Math.max(0,S.pushCd-S.t),pOn=S.t<loc.pushUntil;
  h+=TR('<div class="card"><div class="row top"><div class="grow"><h3>Selbst anpacken</h3>')+chips([chip('bolt','+40 %'),chip('clock','20 s')])+'</div>'+B(pOn?TR('Läuft'):pcd>0?TR('Pause ')+Math.ceil(pcd)+' s':TR('Anpacken'),'push',{},{cls:'sm pri',dis:pOn||pcd>0})+'</div></div>';
  h+=bon(loc)+reviewsBox(loc);
  return h;
}
function queueDots(loc,c){const n=Math.round(c.queueCap),q=Math.round(loc.queue);let s='';for(let i=0;i<n;i++)s+='<s'+(i<q?' class="on"':'')+'></s>';return s;}
function qLabel(q){return q+' · '+QN[q-1];}
function feel(r){return r>=1.3?[TR('Schnäppchen'),'good']:r>=1.1?[TR('günstig'),'good']:r>=0.92?['fair','mute']:r>=0.78?['teuer','warn']:[TR('überteuert'),'bad'];}
function comboMains(loc){return PRODS.filter(P=>!P.drink&&!P.side&&P.t<=loc.tier&&loc.menu[P.id]&&loc.menu[P.id].on);}
function comboBox(loc,c){
  const max=COMBO_MAX[loc.tier],L=loc.combos||[],up=unitPrice(loc,1,loc.auto),ys=loc.csLast||{};
  let h=TR('<div class="card"><div class="row"><h3>Menüs ')+hb('menus')+'</h3><span class="small num">'+L.length+TR(' von ')+max+'</span></div>'+ht('menus',TR('Ein Menü bündelt Hauptgericht, Beilage und Getränk zu einem Preis unter der Summe der Einzelpreise. Wer es nimmt, gibt mehr aus als für das Gericht allein, und das Gericht wird beliebter. Dafür braucht die Küche mehr Zeit. Der Startpreis liegt 12 % unter der Summe.'));
  for(const cb of L){const k=comboCalc(loc,cb,c.all,c.drinks),main=c.all[cb.main],n=ys[cb.id]||0;
    h+='<div class="combo'+(cb.on?'':' off')+'"><div class="row"><button type="button" class="switch" data-a="cbTog" data-id="'+cb.id+'" aria-pressed="'+cb.on+'">'+comboName(cb)+'</button><span class="small num grow">'+(n>=0.5?TR('gestern ')+n0(n)+'×':'')+'</span>'+B(TR('Entfernen'),'cbDel',{id:cb.id},{cls:'sm'})+'</div>'+
      '<div class="small">'+comboParts(cb)+(k&&!k.bad?TR(' · einzeln ')+eur2(k.sum):'')+'</div>';
    if(!k||k.bad){h+='<div class="small wrn">'+(k?k.bad:TR('Hauptgericht steht nicht auf der Karte'))+TR('. Das Menü wird gerade nicht angeboten.</div></div>');continue;}
    const g=cb.price-k.ekAll*up,g1=main.m.price-main.ek*up;
    h+='<div class="row"><div class="rng"><button type="button" class="stp" data-a="cbStep" data-id="'+cb.id+TR('" data-d="-1" aria-label="Menü günstiger">−</button><output class="num">')+eur2(cb.price)+'</output><button type="button" class="stp" data-a="cbStep" data-id="'+cb.id+TR('" data-d="1" aria-label="Menü teurer">+</button></div>')+
      '<div class="grow">'+chips([chip('percent',k.save>=0?'−'+n0(k.save*100)+' %':TR('teurer'),'',),chip('guests',n0(k.take*100)+TR(' % nehmen es'))])+'</div></div>'+
      chips([chip('cash',eur2(g)+TR(' statt ')+eur2(g1),g>g1?'good':'warn'),chip('up',(cb.price-main.m.price>=0?'+':'')+eur2(cb.price-main.m.price)+TR(' je Gast'))])+'</div>';}
  if(L.length<max){const mains=comboMains(loc).filter(P=>!L.some(cb=>cb.main===P.id));
    if(mains.length){const cb=ui.cb=ui.cb||{};if(!mains.some(P=>P.id===cb.main))cb.main=mains[0].id;if(cb.side===undefined)cb.side=cb.main==='pommes'?'':'pommes';if(cb.drink===undefined)cb.drink=c.drinks[0]?c.drinks[0].P.id:'';
      h+=TR('<div class="combo new"><div class="lbl">Neues Menü</div><div class="cbsel"><label class="small" for="cbMain">Gericht</label><select id="cbMain" data-i="cbMain">')+mains.map(P=>'<option value="'+P.id+'"'+(P.id===cb.main?' selected':'')+'>'+P.n+'</option>').join('')+'</select>'+
        TR('<label class="small" for="cbSide">Beilage</label><select id="cbSide" data-i="cbSide"><option value="">keine</option>')+Object.keys(SIDES).filter(s=>s!==cb.main).map(s=>'<option value="'+s+'"'+(s===cb.side?' selected':'')+'>'+SIDES[s].n+'</option>').join('')+'</select>'+
        TR('<label class="small" for="cbDrink">Getränk</label><select id="cbDrink" data-i="cbDrink"><option value="">keins</option>')+c.drinks.map(d=>'<option value="'+d.P.id+'"'+(d.P.id===cb.drink?' selected':'')+'>'+d.P.n+'</option>').join('')+'</select></div>'+
        (c.drinks.length?'':TR('<div class="small">Getränke im Menü brauchen eine Getränkestation (Ausbau).</div>'))+
        '<div class="btns">'+B(TR('Menü anlegen'),'cbAdd',{},{cls:'sm pri',dis:!cb.side&&!cb.drink})+'</div></div>';}}
  else h+=TR('<div class="small">Mehr Menüs gibt es ab ')+(loc.tier<5?TR('der nächsten Ausbaustufe'):'—')+'.</div>';
  return h+'</div>';
}
function xBox(loc,c,P){
  const x=c.all[P.id],m=loc.menu[P.id],L=xFor(loc,P);if(!L.length||!m.x)return '';
  const open=ui.xOpen&&ui.xOpen[P.id],up=unitPrice(loc,1,loc.auto),ys=loc.xsLast||{},on=L.filter(e=>m.x[e.id]&&m.x[e.id].on);
  const yt=L.map(e=>{const n=ys[P.id+':'+e.id]||0;return n>=0.5?n0(n)+'× '+xName(e,P):'';}).filter(Boolean);
  let h='<div class="xbox"><div class="row"><div class="grow"><strong>Extras</strong> <span class="small num">'+(on.length?'≈ +'+eur2(x.xrev)+TR(' Umsatz, +')+eur2(x.xrev-x.xek*up)+' Gewinn je Portion':TR('alle aus'))+'</span>'+(yt.length?TR('<div class="small">Gestern: ')+yt.join(', ')+'</div>':'')+'</div>'+B(open?TR('Schließen'):TR('Bearbeiten'),'xOpen',{p:P.id},{cls:'sm'})+'</div>';
  if(!open)return h+'<div class="xchips">'+L.map(e=>{const o=m.x[e.id];return '<span class="xchip'+(o.on?'':' off')+'">'+xName(e,P)+' '+(o.on?eur2(o.price):TR('aus'))+'</span>';}).join('')+'</div></div>';
  for(const e of L){const o=m.x[e.id],d=x.xs.find(z=>z.x.id===e.id),b=xBase(e,P),gw=o.price-b.ek*up,f=d?feel(d.r):null;
    h+='<div class="xrow'+(o.on?'':' off')+'"><div class="row"><button type="button" class="switch" data-a="xTog" data-p="'+P.id+'" data-x="'+e.id+'" aria-pressed="'+o.on+'">'+xName(e,P)+'</button><div class="rng">'+
      '<button type="button" class="stp" data-a="xStep" data-p="'+P.id+'" data-x="'+e.id+'" data-d="-1" aria-label="'+xName(e,P)+TR(' günstiger"')+(o.price<=0.1?' disabled':'')+'>−</button><output class="num">'+eur2(o.price)+'</output><button type="button" class="stp" data-a="xStep" data-p="'+P.id+'" data-x="'+e.id+'" data-d="1" aria-label="'+xName(e,P)+TR(' teurer">+</button></div></div>')+
      '<div class="small num">'+(d?TR('bestellt von ')+n0(d.take*100)+' % · ':'')+'EK '+eur2(b.ek*up)+' · <span class="'+(gw<0?'neg':'pos')+TR('">Gewinn ')+eur2(gw)+'</span>'+(f?' · <span class="pill '+f[1]+'">'+f[0]+'</span>':'')+'</div></div>';}
  return h+'</div>';
}
function priceGauge(r){const pos=clamp((1.4-r)/(1.4-0.65),0,1),f=feel(r);return TR('<span class="pg" aria-label="Preis wirkt ')+f[0]+TR('"><span class="pg-t"><span>günstig</span><span>fair</span><span>teuer</span></span><span class="pg-b"><i style="left:')+(pos*100).toFixed(0)+'%"></i></span><span class="pg-l '+f[1]+'">'+f[0]+'</span></span>';}
function prodInfo(loc,c,P){
  const x=c.all[P.id],m=loc.menu[P.id],up=unitPrice(loc,1,loc.auto),ek=x.ek*up,gw=m.price-ek,f=feel(x.r);
  return '<span>EK '+eur2(ek)+'</span><span class="'+(gw<0?'neg':'pos')+TR('">Gewinn ')+eur2(gw)+' ('+n0(m.price>0?gw/m.price*100:0)+' %)</span>'+priceGauge(x.r)+
    (m.on&&x.s>0?'<span>'+n0(x.s*100)+' % der Bestellungen</span>':'')+((loc.reg||0)>=5&&m.ref&&m.price>m.ref*1.03?TR('<span>Stammkunden gewohnt: ')+eur2(m.ref)+'</span>':'');
}
function histRows(loc,id){const o=[];(loc.hist||[]).forEach(h=>{const x=h.it[id];if(x)o.push({d:h.d,n:x[0],pr:x[1],q:x[2],p:x[3],rev:x[4],gw:x[5]});});return o;}
function prodHist(loc,P){
  const m=loc.menu[P.id],rows=histRows(loc,P.id),today=loc.sold[P.id]||0;
  if(!rows.length)return TR('<div class="small">Verkaufsverlauf erscheint nach dem ersten Tagesabschluss.')+(today>=0.5?TR(' Heute bisher ')+n0(today)+' Stück.':'')+'</div>';
  const bars=rows.concat([{d:S.day,n:today,pr:m.price,q:m.q,p:m.p,now:1}]),mx=Math.max(1,...bars.map(b=>b.n)),bw=30,off=(8-bars.length)*bw;
  let g='';
  bars.forEach((b,i)=>{const pv=bars[i-1],chg=pv&&(Math.abs(pv.pr-b.pr)>0.001||pv.q!==b.q||Math.abs(pv.p-b.p)>0.001),h=Math.max(1,b.n/mx*32),x=off+i*bw+4,cx=x+(bw-8)/2;
    g+='<rect x="'+x+'" y="'+(46-h).toFixed(1)+'" width="'+(bw-8)+'" height="'+h.toFixed(1)+'" rx="2" fill="'+(chg?'var(--accent)':'var(--ink)')+'" opacity="'+(b.now?0.35:chg?1:0.7)+'"/>'+
      '<text x="'+cx+'" y="'+(43-h).toFixed(1)+'" text-anchor="middle" font-size="8.5" fill="var(--ink)">'+n0(b.n)+'</text>'+
      '<text x="'+cx+'" y="56" text-anchor="middle" font-size="7.5" fill="'+(chg?'var(--accent-text)':'var(--muted)')+'">'+nf2.format(b.pr)+'</text>'+
      '<text x="'+cx+'" y="65" text-anchor="middle" font-size="7" fill="var(--muted)">'+Math.round(b.p*100)+'%</text>'+
      '<text x="'+cx+'" y="74" text-anchor="middle" font-size="7" fill="var(--muted)">'+(b.now?TR('heute'):'Q'+b.q)+'</text>';});
  const L=rows[rows.length-1],V=rows[rows.length-2];
  let t=TR('Gestern ')+n0(L.n)+TR(' Stück zu ')+eur2(L.pr)+TR(': Umsatz ')+eur(L.rev)+TR(', Gewinn ')+eur(L.gw)+'.';
  if(V){const d=L.gw-V.gw;t+=TR(' Davor ')+n0(V.n)+TR(' Stück zu ')+eur2(V.pr)+TR(', Gewinn ')+eur(V.gw)+' <span class="'+(d<-0.5?'neg':d>0.5?'pos':'')+'">('+eurS(d)+')</span>.';}
  t+=TR(' Gelb markiert: erster Tag nach einer Änderung.');
  return '<div class="hist"><svg viewBox="0 0 240 77" role="img" aria-label="Verkaufte Stück der letzten Tage, darunter Preis, Menge und Qualität" style="font-family:var(--f-mono)">'+g+'</svg><div class="small num">'+t+'</div></div>';
}
function salesReport(loc){
  const H=loc.hist||[],L=H[H.length-1],V=H[H.length-2];
  let rows='',tn=0,ty=0,tg=0;
  for(const P of PRODS){const m=loc.menu[P.id];if(!m||P.t>loc.tier)continue;const n=loc.sold[P.id]||0,y=L&&L.it[P.id],v=V&&V.it[P.id];if(!m.on&&n<0.5&&!y)continue;
    const dy=y&&v?y[0]-v[0]:0,ar=y&&v&&Math.abs(dy)>=Math.max(1,v[0]*0.05)?(dy>0?' <span class="pos">▲</span>':' <span class="neg">▼</span>'):'';
    rows+='<div class="srow"><span>'+P.n+'</span><span>'+n0(n)+'</span><span>'+(y?n0(y[0])+ar:'–')+'</span><span>'+(y?eur(y[5]):'–')+'</span></div>';
    tn+=n;if(y){ty+=y[0];tg+=y[5];}}
  return TR('<div class="bon"><div class="t">VERKAUF NACH ARTIKEL</div><hr><div class="srow hd"><span>Artikel</span><span>heute</span><span>gestern</span><span>Gewinn</span></div>')+rows+TR('<hr><div class="srow sum"><span>Summe</span><span>')+n0(tn)+'</span><span>'+(L?n0(ty):'–')+'</span><span>'+(L?eur(tg):'–')+'</span></div>'+
    '</div>';
}
function hasRec(loc,p){return !!((loc.dev&&loc.dev[p])||(S.recipes&&S.recipes[p]));}
function devLine(loc,P){if(P.drink)return '';
  if(hasRec(loc,P.id))return '<div class="devb">'+ic('check')+TR(' Rezept verfeinert · gilt in allen Betrieben</div>');
  if(loc.devIng&&loc.devIng.p===P.id)return TR('<div class="small pos">Rezept in Entwicklung, fertig zum Tagesabschluss.</div>');
  const c=devCost(loc,P);return TR('<div class="row"><div class="small grow">Einmalig: Rezept verfeinern')+(loc.devIng?TR(' (die Küche entwickelt gerade ein anderes Gericht)'):'')+'</div>'+B(TR('Verfeinern'),'devDish',{p:P.id},{cls:'sm',cost:eur(c),dis:!!loc.devIng||S.cash<c})+'</div>';}
function prodCard(loc,c,P){
  const m=loc.menu[P.id],st=stepOf(P),maxP=Math.max(m.price,Math.ceil(P.v*QV[loc.qual-1]*2.4));
  const off=!m.on,blocked=P.drink&&(mLvl(loc,'bar')<1||(P.bar&&effStaff(loc,'bar')<1));
  return '<section class="card prod '+(off||blocked?'off':'')+hc('prod:'+P.id)+'"'+pk('prod:'+P.id)+'>'+hf('prod:'+P.id)+(loc.sig&&loc.sig.p===P.id?TR('<div class="sigb">Hausgericht · ')+loc.sig.name+' '+'★'.repeat(loc.sig.r)+'</div>':'')+'<div class="row">'+img('dish/'+P.id,'dimg')+'<h3 class="grow">'+P.n+(P.diet&&!P.side?' <span class="diet '+P.diet+'">'+DIETN[P.diet]+'</span>':'')+'</h3><button type="button" class="switch" data-a="togProd" data-p="'+P.id+'" aria-pressed="'+m.on+'">'+(m.on?TR('auf der Karte'):'gestrichen')+'</button></div>'+
    devLine(loc,P)+(blocked?'<div class="small wrn">'+(P.bar&&mLvl(loc,'bar')>=1?TR('Braucht einen Barkeeper.'):TR('Braucht eine Getränkestation (Ausbau).'))+'</div>':'')+
    '<div class="sl pr"><label for="pr-'+P.id+TR('">Preis</label><output id="o-pr-')+P.id+'">'+eur2(m.price)+'</output><div class="rng"><button type="button" class="stp" data-a="pStep" data-p="'+P.id+TR('" data-d="-1" aria-label="Preis senken">−</button><input type="range" id="pr-')+P.id+'" data-i="price" data-p="'+P.id+'" min="'+st+'" max="'+maxP+'" step="'+st+'" value="'+m.price+'"><button type="button" class="stp" data-a="pStep" data-p="'+P.id+TR('" data-d="1" aria-label="Preis erhöhen">+</button></div></div>')+
    '<div class="sl pr"><label for="ql-'+P.id+TR('">Qualität</label><output id="o-ql-')+P.id+'">'+qLabel(m.q)+'</output><div class="rng"><button type="button" class="stp" data-a="qStep" data-p="'+P.id+TR('" data-d="-1" aria-label="Qualität senken"')+(m.q<=1?' disabled':'')+'>−</button><input type="range" id="ql-'+P.id+'" data-i="q" data-p="'+P.id+'" min="1" max="'+Math.max(2,loc.qual)+'" step="1" value="'+m.q+'"'+(loc.qual<2?' disabled':'')+'><button type="button" class="stp" data-a="qStep" data-p="'+P.id+TR('" data-d="1" aria-label="Qualität erhöhen"')+(m.q>=loc.qual?' disabled':'')+'>+</button></div></div>'+
    '<div class="sl pr"><label for="pt-'+P.id+TR('">Menge</label><output id="o-pt-')+P.id+'">'+Math.round(m.p*100)+' %</output><div class="rng"><button type="button" class="stp" data-a="mStep" data-p="'+P.id+TR('" data-d="-1" aria-label="Menge verkleinern"')+(m.p<=0.705?' disabled':'')+'>−</button><input type="range" id="pt-'+P.id+'" data-i="p" data-p="'+P.id+'" min="70" max="150" step="5" value="'+Math.round(m.p*100)+'"><button type="button" class="stp" data-a="mStep" data-p="'+P.id+TR('" data-d="1" aria-label="Menge vergrößern"')+(m.p>=1.495?' disabled':'')+'>+</button></div></div>'+
    '<div class="calc" id="pc-'+P.id+'">'+prodInfo(loc,c,P)+'</div>'+xBox(loc,c,P)+prodHist(loc,P)+'</section>';
}
function vKarte(loc,c){
  const T=TIERS[loc.tier];
  let h=TR('<div class="head"><div><h2>Speisekarte</h2></div></div>');
  h+=probList(ui.pl.filter(p=>p.tab==='karte'),TR('Probleme auf der Karte'),'karte');
  h+='<div class="card'+hc('qual')+'"'+pk('qual')+'>'+hf('qual')+TR('<div class="row top"><div class="grow"><h3>Qualitätsstufe ')+loc.qual+' · '+QN[loc.qual-1]+' '+hb('qual')+'</h3>'+chips([chip('star',TR('erwartet ')+QN[T.exp-1],c.avgQ<T.exp-0.05?'warn':''),chip('dish',TR('Schnitt ')+nf2.format(c.avgQ||0))])+'</div>'+
    (loc.qual<T.maxQ?B(TR('Stufe ')+(loc.qual+1),'qual',{},{cls:'sm pri',cost:eur(QCOST[loc.qual]),dis:S.cash<QCOST[loc.qual]}):'<span class="pill mute">'+(loc.tier<5&&loc.qual<5?TR('mehr ab ')+TIERS[loc.tier+1].n:'Maximum')+'</span>')+'</div>'+
    ht('qual',TR('Die Stufe gibt vor, wie hoch der Qualitätsregler reicht. Höhere Qualität: Gäste zahlen mehr, der Einkauf wird teurer, die Küche braucht länger. Größere Portionen kosten Ware und heben den Ruf.'))+'</div>';
  {const fs=PRODS.filter(P=>!P.drink&&!P.side&&P.t<=loc.tier&&loc.menu[P.id]);if(!fs.some(P=>P.id===ui.sigP))ui.sigP=fs[0].id;const SP=P_(ui.sigP),sc=sigCost(loc,SP),pr=sigRating(loc,ui.sigP),st=r=>'★'.repeat(r)+'☆'.repeat(3-r);
    h+='<div class="card">'+h3h(TR('Hausgericht'),'sig')+(loc.sig?'<div><strong>'+loc.sig.name+'</strong> <span class="stars">'+st(loc.sig.r)+'</span></div>'+chips([chip('cash','+'+n0(12*loc.sig.r)+' %'),chip('guests',TR('beliebter')),chip('heart',TR('treuere Stammkunden'))])
      :loc.sigDev?TR('<div class="small pos">In Entwicklung: ')+SIGN[loc.sigDev.p]+' <span class="stars">'+st(loc.sigDev.r||1)+TR('</span>. Steht zum Tagesabschluss auf der Karte.</div>')
      :chips([chip('cash',TR('mehr Preis')),chip('guests',TR('beliebter')),chip('heart',TR('treuere Stammkunden')),chip('lock' in IC?'lock':'check',TR('einmalig'))])+ht('sig',TR('Jeder Betrieb legt einmal ein Hausgericht fest. Die Sterne hängen vom besten Koch, der Qualität und einem verfeinerten Rezept ab, und zwar zum Zeitpunkt der Entwicklung. Wer wartet, bis die Küche stark ist, bekommt mehr.'))+TR('<div><label class="lbl" for="selSig">Gericht</label><select id="selSig" data-i="sigP">')+fs.map(P=>'<option value="'+P.id+'"'+(P.id===ui.sigP?' selected':'')+'>'+P.n+(loc.dev[P.id]?' (verfeinert)':'')+'</option>').join('')+'</select></div>'+
        TR('<div class="row"><div class="small grow">Mit deiner Küche heute: <span class="stars">')+st(pr)+'</span> „'+SIGN[ui.sigP]+'“</div>'+B(TR('Festlegen'),'sigDev',{},{cls:'sm pri',cost:eur(sc),dis:S.cash<sc})+'</div>')+'</div>';}
  {const segs=c.segs||[],tot=c.walk+c.regD;h+='<div class="card'+hc('veg')+'"'+pk('veg')+'>'+hf('veg')+TR('<div class="row"><h3>Zielgruppen</h3>')+hb('seg')+'</div>'+
    segs.map(sg=>{const sat=sg.sat,lab=!sg.opt&&sg.k!=='o'?TR('kein Angebot'):sat>8?TR('begeistert'):sat>-2?TR('zufrieden'):sat>-10?TR('mäßig'):TR('unzufrieden');
      return '<div class="segrow"><div class="grow"><strong>'+sg.n+'</strong> <span class="small num">'+n0(sg.w0*100)+TR(' % der Gäste</span>')+chips([chip('dish',sg.k==='o'?TR('alle Gerichte'):sg.opt+(sg.opt===1?TR(' Gericht'):TR(' Gerichte')),sg.k!=='o'&&sg.opt<2?'warn':''),sg.opt||sg.k==='o'?chip('guests','≈ '+n0(tot*sg.share)+TR('/Tag')):''])+'</div><span class="pill '+(lab===TR('kein Angebot')||lab===TR('unzufrieden')?'bad':lab===TR('mäßig')?'warn':'good')+'">'+lab+'</span></div>';}).join('')+
    ht('seg',TR('Vegetarier und Veganer zahlen etwas mehr, achten aber stärker auf Qualität und wollen mindestens zwei Gerichte zur Auswahl. Fehlt ein Angebot, gehen auch ihre Freunde woanders hin. Der Anteil wächst mit der Zeit.'))+'</div>';}
  h+=comboBox(loc,c)+salesReport(loc);
  h+='<div class="board'+hc('nofood')+'"'+pk('nofood')+'>'+hf('nofood')+TR('<div class="chalk">Speisen</div><div class="num small" style="text-align:center">Ø Bon ')+eur2(c.price)+TR(' · Ø Einkauf ')+eur2(c.ek*unitPrice(loc,1,loc.auto))+'</div>';
  PRODS.filter(P=>!P.drink&&P.t<=loc.tier).forEach(P=>h+=prodCard(loc,c,P));
  h+=TR('</div><div class="board"><div class="chalk">Getränke</div>');
  PRODS.filter(P=>P.drink&&P.t<=loc.tier).forEach(P=>h+=prodCard(loc,c,P));
  h+='</div>';
  const next=PRODS.filter(P=>P.t===loc.tier+1).map(P=>P.n);
  if(next.length)h+=TR('<div class="card flat"><div class="small">Ab ')+TIERS[loc.tier+1].n+': '+next.join(', ')+'.</div></div>';
  return h;
}
function perfLabel(e){
  const d=S.day-e.day;if(d<1)return [TR('in Einarbeitung'),'mute'];
  const est=d<3?e.sk+((e.id*37%11)/10-0.5)*0.3:e.sk;
  const l=est<0.5?[TR('ungeeignet'),'bad']:est<0.85?[TR('schwach'),'warn']:est<1.1?[TR('solide'),'mute']:est<1.3?[TR('stark'),'good']:est<1.75?[TR('herausragend'),'good']:[TR('Weltklasse'),'good'];
  return [l[0]+(d<3?TR(' (erster Eindruck)'):''),l[1]];
}
function scl(v,lo,hi){let h='<span class="scl'+(v!=null?(v>=7.5?' hi':v>=4.5?' mid':' lo'):'')+'">';for(let i=1;i<=10;i++){const on=v!=null?i<=Math.round(v):(i>=lo&&i<=hi);h+='<i'+(on?' class="'+(v!=null?'on':'rg')+'"':'')+'></i>';}return h+'</span>';}
function attrGrid(o,exact,role){const K=ROLEKEY[role]||[];if(!o.at)return '';
  return '<div class="attrs">'+ATTR.map(([k,n])=>{const r=!exact&&o.est?o.est[k]:null,v=exact?o.at[k]:null,txt=exact?String(Math.round(v)):r?(r[0]===r[1]?r[0]:r[0]+'–'+r[1]):'?';
    const tri=!exact&&o.trial&&o.trial!=='pending'&&(k==='fk'||k==='be');
    return '<div class="attr'+(K.includes(k)?' key':'')+(tri?' tri':'')+'"><span class="an">'+ic(ATTRIC[k])+n+'</span>'+scl(v,r?r[0]:0,r?r[1]:0)+'<span class="av num">'+txt+'</span></div>';}).join('')+'</div>'+
    (exact?'':chips([chip('search',TR('geschätzt'),'mute'),o.trial&&o.trial!=='pending'?chip('check',TR('Probetag: genauer'),'good'):'']));}
function empRow(loc,e){
  const pl=perfLabel(e);let pills='<span class="pill '+pl[1]+'">'+pl[0]+'</span>';
  if(e.trKnown&&e.tr)pills+='<span class="pill '+TRAIT[e.tr].k+'">'+TRAIT[e.tr].n+'</span>';
  if(S.t<e.sickUntil)pills+=TR('<span class="pill warn">krank</span>');else if(e.absent)pills+=TR('<span class="pill warn">heute nicht erschienen</span>');
  if(e.leaveDay)pills+='<span class="pill mute">'+(e.quit?TR('hat gekündigt, '):'')+TR('geht nach Tag ')+(e.leaveDay-1)+'</span>';
  if(e.promo)pills+='<span class="pill good">'+PROMO[e.role]+'</span>';if(e.temp)pills+=TR('<span class="pill mute">Aushilfe')+(e.tempUntil?TR(' bis Tag ')+e.tempUntil:'')+'</span>';if(S.t<(e.trainUntil||0))pills+=TR('<span class="pill warn">in Schulung</span>');
  const md=moodOf(e),mt=md<35?TR('unzufrieden'):md<55?TR('mäßig'):md<80?TR('zufrieden'):TR('begeistert');
  const known=S.day-e.day>=3||!e.est;let x=attrGrid(e,known,e.role)+(known?'':TR('<div class="small">Genaue Werte zeigen sich nach drei Arbeitstagen.</div>'))+TR('<div class="mood"><span class="small">Stimmung</span>')+meter(md,lvlCls(md))+'<span class="small">'+mt+'</span></div>';
  if(e.ask)x+=TR('<div class="ask"><div class="small">Fordert <strong>')+eur(e.ask.pay)+TR('</strong> statt ')+eur(e.pay)+TR(' am Tag. Antwort bis Tag ')+e.ask.day+'.</div><div class="btns">'+B(TR('Zustimmen'),'askYes',{id:e.id},{cls:'sm pri'})+B(TR('Ablehnen'),'askNo',{id:e.id},{cls:'sm'})+'</div></div>';
  if(e.poach)x+='<div class="ask bad"><div class="small">'+e.poach.by+TR(' bietet <strong>')+eur(e.poach.pay)+TR('</strong> am Tag.</div><div class="btns">')+B(TR('Mitziehen'),'poachYes',{id:e.id},{cls:'sm pri',cost:eur(e.poach.pay)})+B(TR('Gehen lassen'),'poachNo',{id:e.id},{cls:'sm'})+'</div></div>';
  let b='';
  if(!e.leaveDay&&!e.temp){b=B(TR('Kündigen'),'dismiss',{id:e.id,m:'n'},{cls:'sm',cost:TR('Frist 3 Tage')})+B(TR('Aufhebungsvertrag'),'dismiss',{id:e.id,m:'a'},{cls:'sm',cost:eur(e.pay*4)});
    if(e.trKnown&&e.tr==='dieb')b=B(TR('Fristlos entlassen'),'dismiss',{id:e.id,m:'f'},{cls:'sm danger'})+b;
    if(!e.temp&&(e.trains||0)<4&&e.sk<rarOf(e).cap-0.01)b=B(TR('Schulung'),'train',{id:e.id},{cls:'sm',cost:eur(trainCost(loc,e)),dis:S.t<(e.trainUntil||0)||S.cash<trainCost(loc,e)})+b;
    if(canPromote(loc,e))b=B(TR('Zum ')+PROMO[e.role]+TR(' befördern'),'promote',{id:e.id},{cls:'sm pri',cost:TR('+25 % Gehalt')})+b;}
  return '<div class="emp'+hc('emp:'+e.id)+'"'+pk('emp:'+e.id)+'>'+hf('emp:'+e.id)+'<div class="row">'+por(e.name)+'<strong class="grow">'+e.name+' '+rarB(e.rar)+'</strong><span class="num">'+eur(e.pay)+TR(' / Tag</span></div><div class="pills">')+pills+'</div>'+x+(b?'<div class="btns">'+b+'</div>':'')+'</div>';
}
function rarB(r){r=r||0;return '<span class="rar r'+r+'">'+RAR[r].n+'</span>';}
function appCard(loc,a){
  const ref=wage(loc,a.role),free=loc.staff[a.role]<maxStaff(loc,a.role),left=a.exp_day-S.day+1;
  const z=a.zl<0?TR('Kein Zeugnis vorgelegt.'):'„… '+ZG[a.zl]+'.“'+(a.zh?' '+TRAIT[a.zh].z:'');
  const F=(k,v)=>'<dt>'+k+'</dt><dd>'+v+'</dd>';
  return '<div class="card app rr'+(a.rar||0)+'"><div class="row top">'+por(a.name,'por big')+'<div class="grow"><h3>'+a.name+', '+a.age+'</h3>'+rarB(a.rar)+TR('<div class="small">bewirbt sich als ')+roleName(a.role)+(a.hh?TR(' · vom Headhunter vermittelt'):'')+'</div></div><div style="text-align:right"><div class="num" style="font-size:18px">'+eur(a.pay)+TR('</div><div class="small">Gehaltswunsch / Tag<br>üblich ')+eur(ref*RAR[a.rar||0].pay)+'</div></div></div>'+
    '<dl class="facts">'+((a.rar||0)>0?F(TR('Stufe'),chips([chip('shield','belastbar'),chip('cash',TR('teurer'),'warn'),a.rar>=3?chip('hands',TR('hebt das Team'),'good'):''])):'')+F(TR('Erfahrung'),a.exp+'.')+F(TR('Zeugnis'),z)+F(TR('Gespräch'),a.tk+(a.th?' '+TRAIT[a.th].t:''))+(a.hh?F('Headhunter',TR('Fachlich geprüft, Leistung ')+(a.sk>=1.3?TR('herausragend'):TR('stark'))+'.'):'')+(a.trial?F(TR('Probetag'),a.trial==='pending'?TR('Läuft, Ergebnis zum Tagesabschluss.'):chips([chip(a.trialEst>=1.1?'smile':a.trialEst<0.85?'warn':'check',a.trial,a.trialEst>=1.1?'good':a.trialEst<0.85?'bad':'')])):'')+'</dl>'+attrGrid(a,false,a.role)+
    '<div class="btns">'+B(TR('Einstellen'),'hire',{id:a.id},{cls:'sm pri',cost:eur(a.pay),dis:!free||S.cash<a.pay})+(a.trial?'':B(ic('search')+TR(' Probetag'),'trial',{id:a.id},{cls:'sm',cost:eur(Math.round(a.pay*0.6)),dis:S.cash<a.pay*0.6}))+B(TR('Absagen'),'reject',{id:a.id},{cls:'sm'})+'</div>'+
    '<div class="small">'+(free?'':TR('Keine Stelle frei. '))+TR('Bewerbung gilt noch ')+left+(left===1?TR(' Tag.'):TR(' Tage.'))+'</div></div>';
}
function vTeam(loc,c){
  let h='<div class="head"><div><h2>Team</h2>'+chips([chip('cash',eur(c.wages)+TR(' Gehälter/Tag'))])+'</div></div>';
  h+=probList(ui.pl.filter(p=>p.tab==='team'),TR('Probleme im Team'),'team');
  h+=offersBox(loc);
  {const fc=feastCost(loc),cd=5-(S.day-(loc.feastDay||-99));h+=TR('<div class="card"><div class="row top"><div class="grow"><h3>Teamessen</h3>')+chips([chip('smile',TR('+8 Stimmung')),chip('clock',TR('5 Tage'))])+'</div>'+B(cd>0?TR('wieder in ')+cd+(cd===1?TR(' Tag'):TR(' Tagen')):TR('Einladen'),'feast',{},{cls:'sm pri',cost:cd>0?null:eur(fc),dis:cd>0||!loc.team.length||S.cash<fc})+'</div></div>';}
  h+=TR('<div class="card"><div class="row top"><div class="grow"><h3>Du selbst</h3>')+chips([chip('chef',TR('+1 Koch')),chip('broom',TR('Ordnung')),chip('search',TR('Durchblick'))])+'</div>'+(S.ownerAt===loc.id?TR('<span class="pill good">hier</span>'):B(TR('Hier mitarbeiten'),'owner',{},{cls:'sm pri'}))+'</div></div>';
  for(const R of ROLES){
    const mx=maxStaff(loc,R.id);
    if(!mx){const ft=TIERS.findIndex(t=>t[R.id]>0);h+='<div class="card flat"><div class="row"><h3>'+R.n+TR('</h3><span class="pill mute">ab ')+TIERS[ft].n+'</span></div>'+chips([chip(ROLEIC[R.id][0],ROLEIC[R.id][1],'mute')])+'</div>';continue;}
    const es=loc.team.filter(e=>e.role===R.id);
    h+='<div class="card'+hc('role:'+R.id)+'"'+pk('role:'+R.id)+'>'+hf('role:'+R.id)+'<div class="row top"><div class="grow"><h3>'+R.n+'</h3>'+chips([chip(ROLEIC[R.id][0],ROLEIC[R.id][1]),chip('cash',eur(wage(loc,R.id))+TR('/Tag'))])+'</div><div class="num" style="font-size:20px">'+es.length+' / '+mx+'</div></div>'+
      (es.length?es.map(e=>empRow(loc,e)).join(''):TR('<div class="small">Unbesetzt.</div>'))+'</div>';
  }
  const rs=ROLES.filter(r=>maxStaff(loc,r.id)>0),ar=adRole(loc);
  h+=TR('<div class="lbl">Bewerbungen (')+loc.apps.length+')</div>';
  h+='<div class="card">'+h3h(TR('Personal suchen'),'hire')+TR('<div><label class="lbl" for="selAdRole">Gesuchte Stelle</label><select id="selAdRole" data-i="adRole">')+rs.map(r=>'<option value="'+r.id+'"'+(r.id===ar?' selected':'')+'>'+r.n+'</option>').join('')+'</select></div>'+
    '<div class="btns">'+B(TR('Stellenanzeige'),'ad',{},{cls:'sm pri',cost:eur(adCost(loc,ar)),dis:S.cash<adCost(loc,ar)})+B('Headhunter','hunt',{},{cls:'sm',cost:eur(huntCost(loc,ar)),dis:S.cash<huntCost(loc,ar)})+'</div>'+
    (loc.ads.length||loc.hunts.length?TR('<div class="lbl" style="margin-top:6px">Läuft gerade</div>')+chips(loc.ads.map(a=>chip('megaphone',roleName(a.role)+' · '+Math.max(1,a.until-S.day+1)+' T','good')).concat(loc.hunts.map(h=>chip('search',roleName(h.role)+TR(' · morgen'),'good')))):'')+
    chips([chip('megaphone',TR('Anzeige: 3 Tage')),chip('search',TR('Headhunter: 2 Profis')),chip('star',TR('Ultra nur per Headhunter'))])+ht('hire',TR('Ohne Anzeige kommen nur selten Initiativbewerbungen. Eine Anzeige bringt drei Tage lang täglich Bewerbungen, darunter auch ungeeignete. Der Headhunter liefert zwei geprüfte Fachkräfte ab Stufe Selten, die mehr Gehalt verlangen. Nur über ihn sind Ultra-Fachkräfte zu finden, etwa bei einem von hundert Aufträgen. Lebenslauf, Zeugnis und Gespräch können täuschen, ein Probetag zeigt mehr. Wer eingestellt ist, geht erst nach Kündigungsfrist oder gegen Abfindung.'))+
    (loc.staff.lead?'<div class="row"><div class="grow">'+chip('crown',TR('Leitung stellt ein'))+'</div><button type="button" class="switch" data-a="autoHire" aria-pressed="'+loc.autoHire+'">'+(loc.autoHire?TR('Leitung stellt ein'):TR('Du stellst ein'))+'</button></div>':'')+'</div>';
  if(!loc.apps.length)h+=TR('<div class="card flat"><div class="small">Zurzeit liegt keine Bewerbung vor.</div></div>');
  loc.apps.slice().reverse().forEach(a=>h+=appCard(loc,a));
  return h;
}
function vAusbau(loc,c){
  const T=TIERS[loc.tier];
  let h=TR('<div class="head"><div><h2>Ausbau</h2>')+chips([chip('rent',eur(c.rent)+TR('/Tag')),chip('bolt',eur(c.energy)+TR('/Tag'))])+'</div></div>';
  h+=probList(ui.pl.filter(p=>p.tab==='ausbau'),TR('Defekte Geräte'),'ausbau');
  if(loc.tier<5){const N=TIERS[loc.tier+1],A=AREAS[loc.area];
    const np=PRODS.filter(P=>P.t===loc.tier+1).map(P=>P.n).join(', ');
    h+=TR('<div class="card"><div class="row top"><div class="grow"><h3>Zum ')+N.n+TR(' ausbauen</h3>')+chips([chip('guests',n0(T.dem*A.dem)+' → '+n0(N.dem*A.dem),'good'),chip('chef',N.cook+TR(' Köche')),N.serv?chip('tray',N.serv+TR(' Service')):'',N.lead&&!T.lead?chip('crown',TR('Leitung')):'',chip('dish','+'+PRODS.filter(P=>P.t===loc.tier+1).length+TR(' Gerichte'),'good'),chip('rent',eur(N.rent*A.rent)+TR('/Tag'),'bad'),N.exp>T.exp?chip('star',TR('erwartet ')+QN[N.exp-1],'warn'):''])+'</div></div>'+
      '<div class="btns">'+B(TR('Ausbauen'),'tierUp',{},{cls:'pri',cost:eur(N.cost),dis:S.cash<N.cost})+'</div></div>';
  }
  h+=TR('<div class="lbl">Geräte (bis Stufe ')+(loc.tier+1)+')</div>';
  for(const M of MACH){
    if(M.t>loc.tier){h+='<div class="card flat"><div class="row">'+img('mach/'+M.id,'mimg')+'<h3 class="grow">'+M.n+TR('</h3><span class="pill mute">ab ')+TIERS[M.t].n+'</span></div>'+chips([chip(MACHIC[M.id][0],MACHIC[M.id][1]+TR(' je Stufe'))])+'</div>';continue;}
    const L=loc.mach[M.id]||0,cost=M.base*Math.pow(3,L),br=loc.broken[M.id];
    h+='<div class="card'+hc('broken:'+M.id)+'"'+pk('broken:'+M.id)+'>'+hf('broken:'+M.id)+'<div class="row top">'+img('mach/'+M.id,'mimg')+'<div class="grow"><h3>'+M.n+'</h3>'+chips([chip(MACHIC[M.id][0],MACHIC[M.id][1]+TR(' je Stufe'))])+'</div><div class="num" style="font-size:20px">'+L+' / '+(loc.tier+1)+'</div></div>'+(br?TR('<div class="small neg">Defekt, bringt keine Leistung.</div>'):'')+
      '<div class="btns">'+(L<loc.tier+1?B(L?TR('Stufe ')+(L+1):TR('Kaufen'),'mUp',{m:M.id},{cls:'sm pri',cost:eur(cost),dis:S.cash<cost}):'')+(br?B(TR('Reparieren'),'repair',{m:M.id},{cls:'sm',cost:eur(repairCost(loc,M.id))}):'')+(L>0?B(TR('Verkaufen'),'mSell',{m:M.id},{cls:'sm',cost:'+'+eur(Math.round(0.4*M.base*Math.pow(3,L-1)))}):'')+'</div></div>';
  }
  h+='<div class="card">'+h3h('Marketing','mkt')+'<div class="seg" role="group" aria-label="Marketing">';
  MKT.forEach((m,i)=>{h+='<button type="button" data-a="mkt" data-l="'+i+'" aria-pressed="'+(loc.mkt===i)+'">'+m.n+'<small>'+(i?'+'+Math.round((m.f-1)*100)+' %':'±0 %')+'</small><small>'+eur(Math.round(m.c*Math.pow(loc.tier+1,2)))+'</small></button>';});
  h+='</div>'+ht('mkt',TR('Marketing bringt Laufkundschaft gegen tägliche Kosten. Zufriedene Gäste werden Stammkunden und bleiben, auch wenn du das Marketing wieder einstellst. Lohnt nur, wenn Küche und Service den Andrang schaffen.'))+
    TR('<div class="row top"><div class="grow"><h3>Stempelkarte</h3>')+chips([chip('heart',TR('−40 % Abwanderung'),'good'),chip('guests',TR('+35 % neue'),'good'),chip('percent',TR('8 % Rabatt'),'warn')])+'</div><button type="button" class="switch" data-a="stamp" aria-pressed="'+loc.stamp+'">'+(loc.stamp?TR('Stempelkarte an'):TR('Stempelkarte aus'))+'</button></div></div>';
  if(loc.delivery||loc.sponsor>=S.day||loc.filter)h+=TR('<div class="card"><h3>Vereinbarungen</h3>')+(loc.delivery?TR('<div class="row top"><div class="small grow">Lieferportal: 15 % mehr Gäste, auf deren Umsatz 25 % Provision.</div><button type="button" class="switch" data-a="delivery" aria-pressed="true">Lieferportal an</button></div>'):'')+(loc.sponsor>=S.day?TR('<div class="small">Trikotsponsoring bis Tag ')+loc.sponsor+': +10 % Laufkundschaft.</div>':'')+(loc.filter?TR('<div class="small">Abluftfilter eingebaut, die Nachbarn sind zufrieden.</div>'):'')+'</div>';
  if(realLocs().length>1&&!loc.popup)h+='<div class="btns">'+B(TR('Standort schließen'),'askClose',{},{cls:'danger sm'})+'</div>';
  return h;
}
function chart(){
  const d=S.hist;if(d.length<2)return TR('<div class="small">Die Kurve erscheint nach zwei abgeschlossenen Tagen.</div>');
  const mx=Math.max(1,...d.map(Math.abs)),hasNeg=d.some(x=>x<0),W=280,H=90,z=hasNeg?H/2:H-4,sc=(hasNeg?H/2-6:H-12)/mx,bw=W/14;
  let s='<svg class="chart" viewBox="0 0 '+W+' '+H+TR('" preserveAspectRatio="none" role="img" aria-label="Ergebnis der letzten ')+d.length+TR(' Tage"><line x1="0" x2="')+W+'" y1="'+z+'" y2="'+z+'" stroke="var(--line)"/>';
  d.forEach((v,i)=>{const hgt=Math.max(1,Math.abs(v)*sc);s+='<rect x="'+(i*bw+2).toFixed(1)+'" y="'+(v>=0?z-hgt:z).toFixed(1)+'" width="'+(bw-4).toFixed(1)+'" height="'+hgt.toFixed(1)+'" rx="2" fill="var(--'+(v>=0?'good':'bad')+')" opacity="'+(i===d.length-1?1:0.6)+'"/>';});
  return s+TR('</svg><div class="row small num"><span>bester Tag ')+eurS(Math.max(...d))+TR('</span><span>schwächster ')+eurS(Math.min(...d))+'</span></div>';
}
function vFirma(){
  const lim=dispoLimit(),cm=creditMax(),ch=Math.max(500,cm/4),unc=uncovered(),n=realLocs().length,ld=S.lastDay;
  let h=TR('<div class="head"><div><h2>Büro</h2><p class="sub">Tag ')+S.day+TR(' · Firmenwert ')+eur(companyValue())+TR(' · Rekord ')+eur(Math.max(S.best,companyValue()))+'</p></div></div>';
  h+=probList(coProblems(),TR('Probleme der Firma'),'firma');
  h+='<div class="card'+hc('result')+'"'+pk('result')+'>'+hf('result')+TR('<h3>Ergebnis der letzten Tage</h3>')+chart()+(ld?TR('<div class="small num">Tag ')+ld.day+': '+eurS(ld.total)+(ld.admin?TR(' · Verwaltung ')+eur(-ld.admin):'')+(ld.hq?TR(' · Büro ')+eur(-ld.hq):'')+(ld.interest?TR(' · Kreditzins ')+eur(-ld.interest):'')+(ld.dispo?TR(' · Dispozins ')+eur(-ld.dispo):'')+'</div>':'')+'</div>';
  h+='<div class="card'+hc('bank')+'"'+pk('bank')+'>'+hf('bank')+'<div class="row"><h3>Bank</h3>'+hb('bank')+TR('</div><div class="row"><span class="small">Kredit</span><span class="num">')+eur(S.loan)+TR(' von ')+eur(cm)+'</span></div>'+meter(S.loan/cm*100,S.loan>cm*0.75?'warn':'acc')+
    chips([chip('percent',TR('Kredit 1 %/Tag')),chip('percent',TR('Dispo 3 %/Tag'),'warn'),chip('warn',TR('Grenze ')+eur(-lim),'bad')])+ht('bank',TR('Liegt die Kasse an drei Tagesabschlüssen in Folge unter ')+eur(-lim)+TR(', ist die Firma insolvent.'))+
    '<div class="btns">'+B(TR('Kredit aufnehmen'),'loan',{},{cls:'sm',cost:'+'+eur(ch),dis:S.loan+ch>cm+1})+B(TR('Tilgen'),'repay',{},{cls:'sm pri',cost:eur(Math.min(S.loan,Math.max(0,S.cash))),dis:S.loan<=0||S.cash<=0})+'</div></div>';
  {const ct=S.contract||{type:'tag'},fee=contractFee();h+='<div class="card'+hc('contract')+'"'+pk('contract')+'>'+hf('contract')+TR('<div class="row"><h3>Einkauf</h3>')+hb('contract')+'</div><div class="seg" role="group" aria-label="Liefervertrag">'+Object.keys(CONTR).map(k=>'<button type="button" data-a="contract" data-c="'+k+'" aria-pressed="'+(ct.type===k)+'">'+CONTR[k].n+'<small>'+(k==='tag'?TR('schwankt'):k==='fest'?TR('+5 % fix'):'+35 %')+'</small></button>').join('')+'</div>'+chips([chip('tag',TR('heute ')+pct(unitPrice(S.locs[0],1,false))),ct.type!=='tag'?chip('calendar',TR('bis Tag ')+ct.until):'',ct.type!=='tag'?chip('warn',TR('Wechsel ')+eur(fee),'warn'):''])+ht('contract',Object.keys(CONTR).map(k=>'<strong>'+CONTR[k].n+':</strong> '+CONTR[k].d).join('<br>'))+'</div>';}
  {const A=S.meta.ach||{},n=ACH.filter(a=>A[a.id]).length,last=ACH.filter(a=>A[a.id]).sort((a,b)=>A[b.id]-A[a.id]).slice(0,3);h+=TR('<div class="card"><div class="row"><h3>Erfolge</h3><span class="num small">')+n+' / '+ACH.length+'</span></div>'+meter(n/ACH.length*100,'acc')+(last.length?TR('<div class="small">Zuletzt: ')+last.map(a=>a.n).join(', ')+'</div>':TR('<div class="small">Noch keiner. Der erste kommt mit dem ersten Gewinntag.</div>'))+'<div class="btns">'+B(TR('Alle Erfolge'),'achList',{},{cls:'sm'})+'</div></div>';}
  {const v=companyValue(),M=S.meta;h+=TR('<div class="card"><div class="row top"><div class="grow"><h3>Erfahrung</h3>')+chips([chip('trophy',M.ep+TR(' Punkte')),chip('cash',TR('Verkauf: +')+epFor(v)+' P'),M.runs?chip('calendar',M.runs+TR(' frühere Firmen')):''])+'</div></div><div class="btns">'+B(TR('Vorteile'),'perks',{},{cls:'sm'})+B(TR('Firma verkaufen'),'askSell',{},{cls:'sm danger',cost:epFor(v)+' P',dis:v<25000})+'</div>'+(v<25000?chips([chip('warn',TR('Verkauf ab 25.000 €'),'mute')]):'')+'</div>';}
  h+=TR('<div class="lbl">Standorte (')+realLocs().length+TR(' von 12)</div>')+locRows()+TR('<div class="small">Neue Standorte eröffnest du auf dem Stadtplan.</div>');
  // Verwaltung
  h+='<div class="card'+hc('hq')+'"'+pk('hq')+'>'+hf('hq')+'<div class="row top"><div class="grow"><h3>'+HQS[S.hq].n+'</h3>'+chips([chip('rent',TR('überblickt ')+(1+2*S.hq)),chip('guests',TR('führst ')+n,unc?'bad':'good'),unc?chip('broom',TR('Ordnung −')+Math.round(unc*35)+' %','bad'):''])+'</div></div>'+
    (n>1?TR('<div class="small num">Verwaltungskosten ')+eur(adminCost())+TR(' pro Tag')+(S.hq?', '+HQS[S.hq].n+' '+eur(HQS[S.hq].daily)+' pro Tag':'')+'</div>':'')+
    (S.hq<4?'<div class="btns">'+B(HQS[S.hq+1].n+TR(' einrichten'),'hq',{},{cls:'sm pri',cost:eur(HQS[S.hq+1].cost),dis:S.cash<HQS[S.hq+1].cost})+'</div>'+chips([chip('rent',TR('+2 Betriebe'),'good'),chip('cash',eur(HQS[S.hq+1].daily)+TR('/Tag'),'warn')]):'')+'</div>';
  h+=TR('<div class="card"><h3>Protokoll</h3><div class="log">')+(S.log.length?S.log.slice(0,12).map(l=>TR('<div><span>Tag ')+l.d+'</span><div class="'+(l.k==='bad'?'neg':l.k==='good'?'pos':'')+'">'+l.m+'</div></div>').join(''):TR('<div class="small" style="display:block">Noch keine Ereignisse.</div>'))+'</div></div>';
  h+=TR('<div class="card"><div class="row top"><div class="grow"><h3>Wetter auf dem Bildschirm</h3></div><button type="button" class="switch" data-a="fx" aria-pressed="')+(S.fx!==false)+'">'+(S.fx!==false?'an':TR('aus'))+'</button></div></div>';
  h+='<div class="card"><div class="row"><h3>'+(LANG==='en'?'Language':'Sprache')+'</h3><div class="seg" role="group" aria-label="Language"><button type="button" data-a="lang" aria-pressed="'+(LANG==='en')+'"'+(LANG==='en'?' disabled':'')+'>English</button><button type="button" data-a="lang" aria-pressed="'+(LANG==='de')+'"'+(LANG==='de'?' disabled':'')+'>Deutsch</button></div></div></div>';
  {const ss=soundSettings();h+='<div class="card"><h3>'+(LANG==='en'?'Sound':'Ton')+'</h3><div class="row"><span class="grow">'+(LANG==='en'?'Sound effects':'Geräusche')+'</span><button type="button" class="switch" data-a="sndFx" aria-pressed="'+ss.sfx+'">'+(ss.sfx?(LANG==='en'?'on':'an'):(LANG==='en'?'off':'aus'))+'</button></div><div class="row" style="margin-top:8px"><span class="grow">'+(LANG==='en'?'Music':'Musik')+'</span><button type="button" class="switch" data-a="sndMusic" aria-pressed="'+ss.music+'">'+(ss.music?(LANG==='en'?'on':'an'):(LANG==='en'?'off':'aus'))+'</button></div></div>';}
  h+=telCard();
  h+=TR('<div class="card"><h3>Spieltempo</h3><div class="seg" role="group" aria-label="Spieltempo">')+[[0.5,TR('Entspannt'),TR('2 Min/Tag')],[1,'Normal',TR('1 Min/Tag')],[1.5,TR('Zügig'),TR('40 s/Tag')]].map(x=>'<button type="button" data-a="speed" data-v="'+x[0]+'" aria-pressed="'+((S.speed||0.5)===x[0])+'">'+x[1]+'<small>'+x[2]+'</small></button>').join('')+'</div></div>';
  h+=TR('<div class="card"><h3>Spiel</h3><div class="btns">')+B(S.paused?TR('Fortsetzen'):TR('Pausieren'),'pause',{},{cls:'sm'})+B(TR('Spielstand sichern'),'saveBox',{},{cls:'sm'})+B(TR('Hilfe'),'intro',{},{cls:'sm'})+B(TR('Neu anfangen'),'askReset',{},{cls:'sm danger'})+'</div></div>';
  return h;
}
function pct(x){const p=Math.round((x-1)*100);return (p>0?'+':p<0?'−':'±')+Math.abs(p)+' %';}
ACT.intro=function(){modal(TR('So läuft dein Laden'),
  TR('<ul><li><strong>Kein Stress:</strong> Mit Restaurantleitung und Büro läuft vieles von selbst. Wer aktiv spielt, kommt schneller voran, muss es aber nicht. Das Spieltempo stellst du im Büro ein.</li><li><strong>Stadtplan:</strong> Tippe auf deinen Stand, um ihn zu führen. Freie Grundstücke kannst du später pachten.</li><li><strong>Ein Spieltag dauert zwei Minuten</strong> (im Büro einstellbar). Umsatz kommt laufend, Löhne, Miete und Energie werden zum Tagesabschluss abgebucht.</li>')+
  TR('<li><strong>Karte:</strong> Stelle je Gericht Preis, Qualität und Menge ein. Der Einkaufspreis folgt daraus, der Rest ist dein Gewinn. Zu teuer vertreibt Gäste, zu billig verschenkt Marge.</li>')+
  TR('<li><strong>Team:</strong> Bewerbungen kommen über Anzeigen oder Headhunter. Lies Erfahrung, Zeugnis und Gesprächsnotiz genau. Wie gut jemand wirklich ist, zeigt sich erst nach der Einstellung, und wer schadet, geht nicht von heute auf morgen.</li>')+
  TR('<li><strong>Küchenschicht:</strong> Einmal pro Spieltag kannst du selbst an Grill, Fritteuse und Herd. Wer gut gart und schnell liefert, bekommt Trinkgeld, Ruf und Stammkunden.</li>')+
  TR('<li><strong>Zielgruppen:</strong> Je nach Lage essen viele Gäste vegetarisch oder vegan. Ohne passendes Gericht bleiben sie weg, und sie erwarten gute Qualität.</li>')+
  TR('<li><strong>Stammkunden:</strong> Zufriedene Gäste kommen wieder, auch ohne Marketing. Preiserhöhungen, schlechtere Qualität und lange Wartezeiten vertreiben sie.</li>')+
  TR('<li><strong>Die Stadt lebt:</strong> Wetter und Jahreszeiten verschieben Andrang und Geschmack, Stadtfeste und Konkurrenten kommen und gehen, ein Restauranttester kann Sterne vergeben. Tägliche Aufträge und Entscheidungen bringen Bonusgeld.</li>')+
  TR('<li><strong>Lager und Ordnung</strong> brauchen dich: Ohne Ware und ohne Kontrollgänge sinken Leistung und Ruf.</li>')+
  TR('<li><strong>Minus ist erlaubt, aber teuer.</strong> Drei Tagesabschlüsse unter dem Dispo-Rahmen bedeuten Insolvenz. Kredit, Geräte verkaufen, Personal abbauen oder Standorte schließen können dich retten.</li>')+
  TR('<li><strong>Wenn du weg bist,</strong> laufen nur Betriebe mit Restaurantleitung weiter, mit einem Zehntel der Geschwindigkeit, höchstens 12 Stunden lang. Zu viele Standorte ohne Büro verwahrlosen.</li></ul>'),
  [[TR('Los geht’s'),'mClose','pri'],[LANG==='en'?'Auf Deutsch spielen':'Play in English','lang','']]);};

function renderHeader(){
  const $=id=>document.getElementById(id);
  const cash=$('cash');cash.textContent=eur(S.cash);cash.className='cash'+(S.cash<0?' neg':'');
  let fix=overheadDay();S.locs.forEach(l=>fix+=calc(l).fix);
  $('fix').textContent=eur(-fix);
  const y=$('yest');if(S.lastDay){y.textContent=eurS(S.lastDay.total);y.className=S.lastDay.total<0?'neg':'pos';}else{y.textContent='–';y.className='';}
  const x=S.dayT/DAY;$('dayInfo').textContent=TR('Tag ')+S.day+' · '+phaseName(x)+(S.paused?TR(' · Pause'):'');
  setHTML($('wxInfo'),wxIcon(wxToday())+'<span>'+SEASONS[season()]+' · '+WX[wxToday()].n+' '+((S.wx&&S.wx.temp)||0)+'°</span>');
  $('dayFill').style.width=(x*100).toFixed(1)+'%';$('dayCur').style.left='calc('+(x*100).toFixed(1)+'% - 1px)';
  const lim=dispoLimit();let al='';
  if(S.strikes>0)al=TR('Mahnung ')+S.strikes+TR(' von 3. Bringe die Kasse bis zum Tagesabschluss über ')+eur(-lim)+TR(', sonst folgt ')+(S.strikes>=2?TR('die Insolvenz'):TR('die nächste Mahnung'))+'.';
  else if(S.cash<-lim)al=TR('Dispo-Rahmen von ')+eur(-lim)+TR(' überzogen. Bleibt das bis zum Tagesabschluss so, gibt es eine Mahnung.');
  else if(S.cash<0)al=TR('Konto im Minus: 3 % Dispozinsen pro Tag, keine Investitionen möglich. Rahmen bis ')+eur(-lim)+'.';
  setHTML($('alert'),al);
  const PL=problems(cur()),cnt={stadt:[0,0],betrieb:[0,0],karte:[0,0],team:[0,0],ausbau:[0,0],firma:[0,0]};
  PL.forEach(p=>{cnt[p.tab][0]++;if(p.k==='bad')cnt[p.tab][1]++;});
  coProblems().forEach(p=>{cnt.firma[0]++;if(p.k==='bad')cnt.firma[1]++;});
  S.locs.forEach(l=>{if(l===cur())return;const P=problems(l);if(P.length){cnt.stadt[0]++;if(P.some(p=>p.k==='bad'))cnt.stadt[1]++;}});
  const hot=false;
  document.querySelectorAll('#tabs button').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.t===ui.tab);b.classList.toggle('hot',hot&&(b.dataset.t==='betrieb'||b.dataset.t==='stadt'));
    const x=cnt[b.dataset.t],bd=b.querySelector('.badge');if(!bd)return;const txt=String(x[0]||''),cl='badge'+(x[0]?(x[1]?' bad':' warn'):'');
    if(bd.textContent!==txt)bd.textContent=txt;if(bd.className!==cl)bd.className=cl;
    const lab=b.querySelector('span:last-child').textContent+(x[0]?', '+x[0]+(x[0]===1?TR(' Problem'):TR(' Probleme')):'');if(b.getAttribute('aria-label')!==lab)b.setAttribute('aria-label',lab);});
}
function render(){
  if(!S)return;
  renderHeader();
  const loc=cur(),c=calc(loc);
  ui.pl=problems(loc,c);ui.pm=pmap(ui.tab==='firma'?coProblems():ui.pl);
  const v=ui.tab==='stadt'?vStadt():ui.tab==='firma'?vFirma():locBar(loc)+(ui.tab==='karte'?vKarte(loc,c):ui.tab==='team'?vTeam(loc,c):ui.tab==='ausbau'?vAusbau(loc,c):vBetrieb(loc,c));
  setHTML(document.getElementById('view'),'<div class="wrap">'+v+'</div>');
  if(ui.jump){const el=document.querySelector('#view [data-pk="'+ui.jump+'"]');ui.jump=null;
    if(el){const rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;const top=document.getElementById('top').getBoundingClientRect().height;window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-top-14),behavior:rm?'auto':'smooth'});el.classList.remove('jump');void el.offsetWidth;el.classList.add('jump');}
    else window.scrollTo(0,0);}
  if(typeof showReports==='function')showReports();
  const mo=document.getElementById('modal');
  if(S.bankrupt&&!(ui.modal&&ui.modal.bk)){ui.modal={bk:1,title:TR('Insolvenz'),html:TR('<p>Nach drei Mahnungen dreht die Bank den Hahn zu. Dein Unternehmen hat ')+(S.day-1)+TR(' Tage bestanden, der höchste Firmenwert lag bei ')+eur(S.best)+TR('.</p><p>Für den nächsten Anlauf bekommst du ')+Math.floor(epFor(S.best)/2)+TR(' Erfahrungspunkte.</p><p class="small">Beim nächsten Mal: Rücklagen für den Tagesabschluss lassen, Verlustbringer früh schließen und erst wachsen, wenn ein Standort ohne dich läuft.</p>'),btns:[[TR('Neu anfangen'),'reset','pri']]};}
  if(ui.modal){const m=ui.modal,mh=typeof m.html==='function'?m.html():m.html,mb=typeof m.btns==='function'?m.btns():m.btns;setHTML(mo,'<div class="box"><h2>'+m.title+'</h2>'+mh+'<div class="btns">'+mb.map(b=>B(b[0],b[1],{},{cls:b[2],dis:b[3]})).join('')+'</div></div>');mo.classList.add('open');}
  else{mo.classList.remove('open');setHTML(mo,'');}
  if(typeof renderCall==='function')renderCall();
}
function updateProds(){
  const loc=cur(),c=calc(loc);
  for(const P of PRODS){const m=loc.menu[P.id];if(!m||P.t>loc.tier)continue;
    const a=document.getElementById('pc-'+P.id);if(a)a.innerHTML=prodInfo(loc,c,P);
    const o1=document.getElementById('o-pr-'+P.id),o2=document.getElementById('o-ql-'+P.id),o3=document.getElementById('o-pt-'+P.id);
    if(o1)o1.textContent=eur2(m.price);if(o2)o2.textContent=qLabel(m.q);if(o3)o3.textContent=Math.round(m.p*100)+' %';}
  document.getElementById('view').__h=null;
}

/* ===================== Speichern und Start ===================== */
const KEY='imbiss-imperium-v1';
function save(){if(!S)return;S.lastSeen=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function loadSave(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&d.v===1&&Array.isArray(d.locs)&&d.locs.length)return d;}catch(e){}return null;}
function awayReport(r){
  if(r.sec<45)return;
  const hh=Math.floor(r.sec/3600),mm=Math.round(r.sec%3600/60),dur=(hh?hh+' Std. ':'')+mm+TR(' Min.');
  let html;
  if(!r.open)html=TR('<p>Du warst ')+dur+TR(' weg. Ohne Restaurantleitung blieben deine Betriebe in der Zeit geschlossen: kein Umsatz, keine Kosten.</p>');
  else html=TR('<p>Du warst ')+dur+TR(' weg. ')+r.open+TR(' von ')+S.locs.length+TR(' Betrieben liefen mit Leitung weiter und haben ')+r.days+TR(' Tage abgeschlossen.</p><p class="num" style="font-size:20px">Kasse ')+eurS(r.delta)+'</p>'+(r.stopped?TR('<p class="neg">Die Kasse ist ins Minus gerutscht, danach ruhte der Betrieb.</p>'):'')+TR('<p class="small">Schau nach Ordnung, Lager und defekten Geräten.</p>');
  modal(TR('Willkommen zurück'),html,[[TR('Weiter'),'mClose','pri']]);
}
/* ----- Wetter über der ganzen Seite ----- */
const FX={w:null,parts:[],flash:0,next:0,dpr:1,W:0,H:0,run:false};
function fxKind(){if(!S||S.fx===false||ui.rush)return null;const w=wxToday();return w==='regen'||w==='sturm'||w==='schnee'||w==='heiss'||w==='frost'?w:null;}
function fxResize(){const c=document.getElementById('wxfx');if(!c)return;FX.dpr=Math.min(2,window.devicePixelRatio||1);FX.W=window.innerWidth;FX.H=window.innerHeight;c.width=FX.W*FX.dpr;c.height=FX.H*FX.dpr;FX.w=null;}
function fxSeed(k){const A=FX.W*FX.H/(390*800),P=[];const n=k==='sturm'?Math.round(230*A):k==='regen'?Math.round(130*A):k==='schnee'?Math.round(90*A):0;
  for(let i=0;i<n;i++)P.push({x:Math.random()*FX.W,y:Math.random()*FX.H,v:k==='schnee'?0.5+Math.random()*0.9:(k==='sturm'?14:10)+Math.random()*7,l:k==='schnee'?1.2+Math.random()*2.2:9+Math.random()*12,ph:Math.random()*6.28,o:0.35+Math.random()*0.35});FX.parts=P;}
function fxTint(k){const t=document.getElementById('wxtint');if(!t)return;
  const map={regen:'linear-gradient(180deg,rgba(70,90,110,.16),rgba(70,90,110,.05))',sturm:'linear-gradient(180deg,rgba(40,50,70,.26),rgba(40,50,70,.1))',schnee:'linear-gradient(180deg,rgba(225,235,245,.18),rgba(225,235,245,.04))',frost:'radial-gradient(ellipse at center,transparent 55%,rgba(190,220,245,.35))',heiss:'linear-gradient(180deg,rgba(255,170,60,.12),rgba(255,120,40,.04))'};
  t.style.background=map[k]||'none';t.style.opacity=k?'1':'0';}
function fxFrame(){
  const k=fxKind(),c=document.getElementById('wxfx');if(!c){return;}
  const rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(k!==FX.w){FX.w=k;fxSeed(k);fxTint(k);}
  const g=c.getContext('2d');g.setTransform(FX.dpr,0,0,FX.dpr,0,0);g.clearRect(0,0,FX.W,FX.H);
  if(k&&!document.hidden&&!rm&&FX.parts.length){
    if(k==='schnee'){g.fillStyle='#fff';g.strokeStyle='rgba(110,135,160,.55)';g.lineWidth=0.8;for(const p of FX.parts){p.y+=p.v;p.ph+=0.02;p.x+=Math.sin(p.ph)*0.6;if(p.y>FX.H+5){p.y=-5;p.x=Math.random()*FX.W;}g.globalAlpha=Math.min(1,p.o+0.35);g.beginPath();g.arc(p.x,p.y,p.l,0,6.283);g.fill();g.stroke();}}
    else{const wind=k==='sturm'?-4.5:-1.4;g.strokeStyle=k==='sturm'?'#6E87A0':'#7895B1';g.lineWidth=1.4;g.lineCap='round';
      for(const p of FX.parts){p.y+=p.v;p.x+=wind;if(p.y>FX.H+20||p.x<-20){p.y=-20-Math.random()*40;p.x=Math.random()*(FX.W+80);}g.globalAlpha=p.o;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x+wind*p.l/p.v,p.y+p.l);g.stroke();}
      if(k==='sturm'){const now=Date.now();if(now>FX.next){FX.flash=1;FX.next=now+6000+Math.random()*9000;}if(FX.flash>0){g.globalAlpha=FX.flash*0.35;g.fillStyle='#fff';g.fillRect(0,0,FX.W,FX.H);FX.flash-=0.06;}}}
    g.globalAlpha=1;}
  requestAnimationFrame(fxFrame);}
function fxStart(){if(FX.run)return;FX.run=true;fxResize();window.addEventListener('resize',fxResize);requestAnimationFrame(fxFrame);}
ACT.fx=function(){S.fx=S.fx===false;};

/* ---------- Anrufe aus den Betrieben ---------- */
IC.wrench='<path d="M14.5 3.5a4.5 4.5 0 0 0-4.2 6.1L3.8 16.1l4.1 4.1 6.5-6.5a4.5 4.5 0 0 0 6.1-4.2l-2.8 2.8-3.4-.7-.7-3.4z"/>';
IC.phone='<path d="M5 3.5h3.5l2 5-2.6 1.6a11.5 11.5 0 0 0 5 5l1.6-2.6 5 2V18a2.5 2.5 0 0 1-2.5 2.5A16.5 16.5 0 0 1 2.5 6 2.5 2.5 0 0 1 5 3.5z"/>';
const RING_MS=25000;
const SAY={stock:[TR('Chef, wir haben nichts mehr zum Verkaufen!'),TR('Die Ware ist komplett weg, die Leute gehen schon wieder.'),TR('Lager leer! Was soll ich den Gästen sagen?')],
  broken:[m=>TR('Chef, die ')+m+TR(' ist ausgefallen!'),m=>TR('Hier geht nichts mehr, die ')+m+TR(' ist kaputt.'),m=>TR('Die ')+m+TR(' qualmt und macht keinen Mucks mehr.')]};
function caller(loc){const T=loc.team.filter(e=>!e.temp&&!(e.leaveDay&&e.leaveDay<=S.day));if(!T.length)return null;
  const pr=T.filter(e=>e.role==='lead');const pool=pr.length&&Math.random()<0.6?pr:T;return pool[Math.floor(Math.random()*pool.length)];}
function callQueue(loc,type,m){const e=caller(loc);if(!e)return;ui.callQ=ui.callQ||[];
  if(ui.callQ.length>=3||ui.callQ.some(q=>q.lid===loc.id&&q.type===type&&q.m===m)||(ui.call&&ui.call.lid===loc.id&&ui.call.type===type&&ui.call.m===m))return;
  const say=SAY[type][Math.floor(Math.random()*3)];
  ui.callQ.push({lid:loc.id,type,m:m||null,eid:e.id,name:e.name,say:typeof say==='function'?say(MACH.find(x=>x.id===m).n):say,wrong:[]});}
function callOpen(loc,q){return q.type==='stock'?(function(){const c=calc(loc);return c.ek>0&&loc.stock<c.ek;})():!!loc.broken[q.m];}
function callCheck(){if(S.bankrupt)return;
  for(const loc of S.locs){if(loc.popup)continue;loc.callB=loc.callB||{};const c=calc(loc);
    const empty=c.foods.length>0&&c.ek>0&&loc.stock<c.ek&&c.cooks>0;
    if(empty&&!loc.callB.stock){loc.callB.stock=1;callQueue(loc,'stock');}else if(!empty&&loc.stock>=c.ek*3)loc.callB.stock=0;
    for(const id in loc.broken)if(!loc.callB['m:'+id]){loc.callB['m:'+id]=1;callQueue(loc,'broken',id);}
    for(const k in loc.callB)if(k.startsWith('m:')&&!loc.broken[k.slice(2)])delete loc.callB[k];}
  if(!ui.call&&ui.callQ&&ui.callQ.length&&!(ui.rush&&!ui.rush.over)){ui.call=Object.assign(ui.callQ.shift(),{st:'ring',t0:Date.now()});
    try{if(navigator.vibrate)navigator.vibrate([300,150,300,150,300]);}catch(e){}}}
function callTick(){const C=ui.call;if(C&&C.st==='ring'&&Date.now()-C.t0>RING_MS){addLog(TR('Verpasster Anruf von ')+C.name+'.','bad');if(typeof telEv==='function')telEv('anruf','verpasst:'+C.type);ui.call=null;}}
function callEmp(C){const loc=S.locs.find(l=>l.id===C.lid);return loc&&loc.team.find(e=>e.id===C.eid);}
ACT.callYes=function(){const C=ui.call;if(!C)return;C.st='talk';C.ta=Date.now();};
ACT.callNo=function(){const C=ui.call;if(!C)return;const e=callEmp(C);if(e)e.mood=Math.max(0,moodOf(e)-2);addLog(TR('Anruf von ')+C.name+TR(' abgelehnt.'),'bad');if(typeof telEv==='function')telEv('anruf','abgelehnt:'+C.type);ui.call=null;};
ACT.callPick=function(d){const C=ui.call;if(!C||C.st!=='talk')return;const id=+d.id,e=callEmp(C);
  if(id!==C.lid){if(!C.wrong.includes(id))C.wrong.push(id);if(e)e.mood=Math.max(0,moodOf(e)-3);
    const l=S.locs.find(x=>x.id===id);C.say=TR('Nein Chef, ich bin doch nicht ')+(l?TR('im ')+locName(l):'dort')+'!';return;}
  C.st='fix';const loc=S.locs.find(l=>l.id===C.lid);
  if(!C.wrong.length&&e)e.mood=Math.min(100,moodOf(e)+3);
  if(typeof telEv==='function')telEv('anruf',(C.wrong.length?'falsch'+C.wrong.length:'richtig')+':'+C.type+':'+Math.round((Date.now()-C.ta)/1000)+'s');
  C.say=!loc||!callOpen(loc,C)?TR('Hat sich schon erledigt, danke Chef!'):C.wrong.length?TR('Endlich! Genau, hier. Was machen wir?'):TR('Genau, Chef. Was machen wir?');};
function expressQty(loc){const c=calc(loc);return Math.max(0,Math.round(c.store*0.5-loc.stock));}
function expressCost(loc){const q=expressQty(loc);return Math.round(q*unitPrice(loc,Math.max(1,q),false)*1.25);}
ACT.callFix=function(d){const C=ui.call;if(!C)return;const loc=S.locs.find(l=>l.id===C.lid);if(!loc){ui.call=null;return;}
  if(d.f==='go'){S.sel=loc.id;ui.call=null;ACT.goto({id:loc.id,t:C.type==='stock'?'betrieb':'ausbau',k:C.type==='stock'?'stock':'broken:'+C.m});return;}
  if(d.f==='express'){const q=expressQty(loc),cost=expressCost(loc);if(q<1||S.cash-cost<-dispoLimit()){toast(TR('Eillieferung nicht bezahlbar.'),'bad');return;}
    S.cash-=cost;loc.stock+=q;loc.stockVal+=cost;loc.today.other+=0;addLog(locName(loc)+TR(': Eillieferung über ')+n0(q)+TR(' Einheiten, ')+eur(cost)+'.','');toast(TR('Eillieferung ist unterwegs'),'good');}
  if(d.f==='repair'){const cost=repairCost(loc,C.m);if(S.cash-cost<-dispoLimit()){toast(TR('Reparatur nicht bezahlbar.'),'bad');return;}
    S.cash-=cost;loc.today.other+=cost;delete loc.broken[C.m];addLog(locName(loc)+': '+MACH.find(x=>x.id===C.m).n+TR(' repariert.'),'good');toast(TR('Techniker ist unterwegs'),'good');}
  ui.call=null;};
ACT.callEnd=function(){ui.call=null;};
function initials(n){return n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();}
function renderCall(){const el=document.getElementById('call');if(!el)return;const C=ui.call;ring(!!(C&&C.st==='ring'));
  if(!C){el.classList.remove('open');setHTML(el,'');return;}
  const loc=S.locs.find(l=>l.id===C.lid);if(!loc){ui.call=null;el.classList.remove('open');setHTML(el,'');return;}
  let h='<div class="ph'+(C.st==='ring'?' ring':'')+TR('" role="alertdialog" aria-label="Anruf von ')+C.name+'"><div class="who"><div class="av">'+por(C.name,'avimg')+'</div><div class="grow"><div class="sub2">'+(C.st==='ring'?TR('Eingehender Anruf'):TR('Im Gespräch'))+'</div><div class="nm">'+C.name+'</div></div>';
  if(C.st==='ring'){const left=Math.max(0,Math.ceil((RING_MS-(Date.now()-C.t0))/1000));h+='<div class="num sub2">'+left+' s</div></div><div class="acts"><button type="button" class="rb no" data-a="callNo" aria-label="Ablehnen">'+ic('phone')+'</button><button type="button" class="rb ok" data-a="callYes" aria-label="Annehmen">'+ic('phone')+'</button></div>';}
  else{h+='</div><div class="bub">'+C.say+'</div>';
    if(C.st==='talk'){h+=TR('<div class="sub2">Wo arbeitet ')+C.name.split(' ')[0]+TR('?</div><div class="locs">')+S.locs.filter(l=>!l.popup).map(l=>'<button type="button" class="lb'+(C.wrong.includes(l.id)?' x':'')+'" data-a="callPick" data-id="'+l.id+'"'+(C.wrong.includes(l.id)?' disabled':'')+'>'+ic('rent')+'<span>'+locName(l)+'</span></button>').join('')+'</div><div class="btns">'+B(TR('Auflegen'),'callEnd',{},{cls:'sm'})+'</div>';}
    else{const open=callOpen(loc,C);h+='<div class="btns">'+(open?(C.type==='stock'?B(ic('truck')+TR(' Eillieferung'),'callFix',{f:'express'},{cls:'sm pri',cost:eur(expressCost(loc))}):B(ic('wrench')+TR(' Techniker'),'callFix',{f:'repair'},{cls:'sm pri',cost:eur(repairCost(loc,C.m))}))+B(TR('Hinfahren'),'callFix',{f:'go'},{cls:'sm'}):'')+B(TR('Auflegen'),'callEnd',{},{cls:'sm'})+'</div>';}}
  setHTML(el,h+'</div>');el.classList.add('open');}

/* ---------- Spielprotokoll: lokal + Artefakt-Datenbank ---------- */
const BUILD='2026-11-18b',TELK='imbiss-tel-v1';
let TEL=null;const TSY={db:null,st:'lokal',last:0,dirty:0,busy:0,dayDirty:0,err:''};
function rid(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-5);}
function telLoad(){try{TEL=JSON.parse(localStorage.getItem(TELK)||'null');}catch(e){TEL=null;}
  if(!TEL||TEL.v!==1)TEL={v:1,did:rid(),on:true,since:Date.now(),run:1,act:{},first:{},tabs:{},inp:{},sess:[],runs:[],days:[],ev:[],rush:[],away:{n:0,s:0},ms:{play:0,paused:0,rush:0},ach:{},dayAct:0,dayInp:0};
  TEL.ach=TEL.ach||{};}
function telSave(){if(!TEL)return;try{localStorage.setItem(TELK,JSON.stringify(TEL));}catch(e){}}
function telEv(k,m){if(!TEL||!TEL.on)return;TEL.ev.push([Date.now(),TEL.run,S?S.day:0,k,m||'']);if(TEL.ev.length>400)TEL.ev.splice(0,TEL.ev.length-400);TSY.dirty=1;}
function telAct(a,d){if(!TEL||!TEL.on||a==='telOn')return;let k=a;if(a==='help'&&d.k)k='help:'+d.k;else if((a==='tab'||a==='goto')&&d.t)k=a+':'+d.t;else if(a==='speed')k='speed:'+d.v;else if(a==='mkt'&&d.v!=null)k='mkt:'+d.v;
  TEL.act[k]=(TEL.act[k]||0)+1;if(!TEL.first[k])TEL.first[k]=[TEL.run,S?S.day:0,Date.now()];TEL.dayAct++;TSY.dirty=1;
  if(TEL.sess.length)TEL.sess[TEL.sess.length-1].a++;}
function telInp(k){if(!TEL||!TEL.on)return;TEL.inp[k]=(TEL.inp[k]||0)+1;if(!TEL.first['inp:'+k])TEL.first['inp:'+k]=[TEL.run,S?S.day:0,Date.now()];TEL.dayInp++;TSY.dirty=1;}
function telTick(sec){if(!TEL||!TEL.on||!S||sec>30||document.hidden)return;const ms=sec*1000;
  const t=ui.rush&&!ui.rush.over?'rush':ui.modal?'dialog':ui.tab;TEL.tabs[t]=(TEL.tabs[t]||0)+ms;TEL.ms.play+=ms;if(S.paused)TEL.ms.paused+=ms;
  const se=TEL.sess[TEL.sess.length-1];if(se){se.e=Date.now();se.d1=S.day;se.ms+=ms;}}
function telSession(){if(!TEL)return;TEL.sess.push({s:Date.now(),e:Date.now(),d0:S.day,d1:S.day,ms:0,a:0,r:TEL.run,w:typeof innerWidth!=='undefined'?innerWidth:0});if(TEL.sess.length>80)TEL.sess.splice(0,TEL.sess.length-80);TSY.dirty=1;}
function telAway(sec){if(!TEL||!TEL.on)return;TEL.away.n++;TEL.away.s+=Math.round(sec);telEv('weg',Math.round(sec/60)+' min');}
function telRush(R){if(!TEL||!TEL.on)return;TEL.rush.push([TEL.run,S.day,R.done,R.perfect,R.missed,R.burnt,Math.round(R.tips),R.best||0]);if(TEL.rush.length>150)TEL.rush.splice(0,TEL.rush.length-150);TSY.dirty=1;}
function telRun(why){if(!TEL)return;TEL.runs.push([TEL.run,why,S.day,Math.round(S.best||0),S.locs.length,S.maxTier,Date.now()]);telEv('ende',why);TEL.run++;TSY.dirty=1;TSY.dayDirty=1;telSave();telFlush(true);}
const NECK={'Küche':'k','Service':'s','Theke':'t','Lager':'l','Nachfrage':'n'};
function telDay(offline,total){if(!TEL||!TEL.on||!S)return;
  const L=S.locs.map(l=>{const t=l.last||{},c=calc(l);return [l.tier,l.area,Math.round(l.rep),Math.round(l.reg||0),Math.round(t.served||0),Math.round(t.lost||0),Math.round(t.res||0),l.team.filter(e=>!e.temp).length,l.qual,Math.round(l.ord),NECK[c.neck]||c.neck||'',l.staff.lead?1:0,Math.round(t.rev||0),c.foods.length,(l.combos||[]).length,l.sig?l.sig.r||1:0,l.mkt||0];});
  const pr={};if(!offline){for(const l of S.locs)for(const x of problems(l))pr[x.key.replace(/\d+/g,'#')]=1;for(const x of coProblems())pr['co:'+x.key]=1;}
  TEL.days.push({r:TEL.run,d:S.day,o:offline?1:0,c:Math.round(S.cash),n:Math.round(total),v:Math.round(companyValue()),ln:Math.round(S.loan||0),st:S.strikes,sp:S.speed||0.5,pa:S.paused?1:0,a:TEL.dayAct,i:TEL.dayInp,hq:S.hq,L,p:Object.keys(pr)});
  TEL.dayAct=0;TEL.dayInp=0;if(TEL.days.length>600)TEL.days.splice(0,TEL.days.length-600);
  const A=(S.meta&&S.meta.ach)||{};for(const k in A)if(!TEL.ach[k]){TEL.ach[k]=[TEL.run,S.day];telEv('erfolg',k);}
  if(S.strikes>0&&!offline)telEv('mahnung',String(S.strikes));
  const pl=TEL._lastLocs||0;if(S.locs.length!==pl){if(pl)telEv('betriebe',pl+'→'+S.locs.length);TEL._lastLocs=S.locs.length;}
  if((TEL._lastTier||0)<S.maxTier){if(TEL._lastTier!=null)telEv('stufe',String(S.maxTier));TEL._lastTier=S.maxTier;}
  if(S.bankrupt&&!TEL._bk){TEL._bk=1;telEv('insolvenz',TR('Tag ')+S.day);}if(!S.bankrupt)TEL._bk=0;
  TSY.dirty=1;TSY.dayDirty=1;}
function telSummary(){const loc=S.locs;return {did:TEL.did,build:BUILD,since:TEL.since,updated:Date.now(),run:TEL.run,act:TEL.act,first:TEL.first,tabs:TEL.tabs,inp:TEL.inp,sess:TEL.sess.slice(-40),runs:TEL.runs,ev:TEL.ev.slice(-200),rush:TEL.rush.slice(-60),away:TEL.away,ms:TEL.ms,ach:TEL.ach,
  allAct:Object.keys(ACT).filter(k=>typeof ACT[k]==='function'),
  now:{day:S.day,cash:Math.round(S.cash),best:Math.round(S.best||0),locs:loc.length,maxTier:S.maxTier,speed:S.speed||0.5,fx:S.fx!==false,ep:S.meta?S.meta.ep:0,runs:S.meta?S.meta.runs||0:0},
  dev:{w:typeof innerWidth!=='undefined'?innerWidth:0,touch:typeof navigator!=='undefined'&&navigator.maxTouchPoints>0?1:0,lang:typeof navigator!=='undefined'?navigator.language:''}};}
async function telFlush(force){const db=TSY.db;if(!TEL||!TEL.on||!db||TSY.busy)return;if(!force&&!TSY.dirty)return;TSY.busy=1;
  try{TSY.dirty=0;await db.doc('tel/'+TEL.did).set(telSummary());
    if(TSY.dayDirty){TSY.dayDirty=0;const run=TEL.run,D=TEL.days.filter(x=>x.r===run||x.r===run-1);const groups={};
      for(const x of D){const id=TEL.did+'-r'+x.r+'-'+Math.floor(x.d/30);(groups[id]=groups[id]||[]).push(x);}
      const ids=Object.keys(groups).slice(-2);for(const id of ids)await db.doc('teldays/'+id).set({did:TEL.did,id,days:groups[id]});}
    TSY.st='sync';TSY.last=Date.now();TSY.err='';}
  catch(e){TSY.st='fehler';TSY.err=String(e&&e.message||e).slice(0,80);TSY.dirty=1;}
  TSY.busy=0;}
function telInit(){telLoad();telSession();telSave();
  try{if(window.claude&&window.claude.use){window.claude.use('db').then(db=>{if(db){TSY.db=db;TSY.st='bereit';TSY.dayDirty=1;telFlush(true);}else TSY.st='lokal';}).catch(()=>{TSY.st='lokal';});}}catch(e){}
  setInterval(()=>{telSave();telFlush(false);},45000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){telSave();telFlush(true);}});}
ACT.telOn=function(){if(!TEL)return;TEL.on=!TEL.on;telSave();};
ACT.telCopy=function(){if(!TEL)return;const txt=JSON.stringify({summary:telSummary(),days:TEL.days.slice(-120)});
  const done=()=>toast(TR('Protokoll kopiert'),'good');
  try{navigator.clipboard.writeText(txt).then(done,()=>{ui.modal={title:TR('Spielprotokoll'),html:'<textarea readonly style="width:100%;height:240px;font:12px var(--f-mono)">'+txt.replace(/</g,'&lt;')+'</textarea>'};render();});}catch(e){}
  return 'keep';};
function telCard(){if(!TEL)return '';const days=TEL.days.length,min=Math.round(TEL.ms.play/60000),used=Object.keys(TEL.act).length;
  const st=!TEL.on?chip('warn',TR('aus'),'mute'):TSY.st==='sync'?chip('check','hochgeladen','good'):TSY.st==='fehler'?chip('warn',TR('Upload klemmt'),'warn'):chip('box',TR('nur lokal'));
  return TR('<div class="card"><div class="row top"><div class="grow"><div class="row"><h3>Spielprotokoll</h3>')+hb('tel')+'</div></div><button type="button" class="switch" data-a="telOn" aria-pressed="'+TEL.on+'">'+(TEL.on?'an':TR('aus'))+'</button></div>'+
    chips([st,chip('clock',min+' min'),chip('calendar',days+TR(' Tage')),chip('bolt',used+TR(' Aktionen')),chip('guests',TEL.sess.length+TR(' Sitzungen'))])+
    ht('tel',TR('Das Spiel merkt sich, was du nutzt und was nicht, wie lange du in welchem Bereich bist und wie sich Kasse, Betriebe und Probleme Tag für Tag entwickeln. Es wird mit dem Spiel gespeichert, damit Claude es auslesen und das Spiel gezielt verbessern kann. Es enthält keine persönlichen Daten außer Bildschirmbreite und Sprache.'))+
    '<div class="btns" style="margin-top:8px">'+B(TR('Protokoll kopieren'),'telCopy',{},{cls:'sm'})+'</div></div>';}
function i18nStatic(){
  if(LANG!=='en')return;document.title=TR('Imbiss-Imperium');document.documentElement.lang='en';
  document.querySelectorAll('.brand,.register .lbl,#tabs button>span:last-child').forEach(el=>{el.textContent=TR(el.textContent.trim());});
  const tb=document.getElementById('tabs');if(tb)tb.setAttribute('aria-label','Sections');const r=document.getElementById('rush');if(r)r.setAttribute('aria-label','Kitchen shift');}
ACT.sndFx=function(){setSfx(!soundSettings().sfx);};
ACT.sndMusic=function(){setMusic(!soundSettings().music);};
ACT.lang=function(){try{localStorage.setItem('sfe-lang',LANG==='en'?'de':'en');save&&save();}catch(e){}location.reload();};
function boot(data){i18nStatic();initAudio();
  S=(data&&data.v===1&&Array.isArray(data.locs)&&data.locs.length)?data:(loadSave()||newGame());
  if(S.maxTier==null)S.maxTier=Math.max(...S.locs.map(l=>l.tier));
  migrate();if(S.qDay!==S.day)genQuests();telInit();TEL._lastLocs=TEL._lastLocs||S.locs.length;if(TEL._lastTier==null)TEL._lastTier=S.maxTier;
  let p='M0 20';for(let i=0;i<=50;i++){const x=i/50;p+=' L'+(x*100).toFixed(1)+' '+(20-phase(Math.min(0.999,x))/1.5*17).toFixed(2);}
  document.getElementById('curve').setAttribute('d',p+' L100 20 Z');
  const gap=(Date.now()-(S.lastSeen||Date.now()))/1000;
  if(gap>30){telAway(gap);awayReport(away(gap));}
  if(S.intro)ACT.intro();
  let last=Date.now(),lastSave=Date.now();
  setInterval(()=>{
    const now=Date.now();let gap=(now-last)/1000;last=now;telTick(gap);callTick();
    if(gap>30){telAway(gap);awayReport(away(gap));}
    else if(!S.paused&&!S.bankrupt){gap*=S.speed||0.5;if(ui.rush&&!ui.rush.over)gap*=0.25;while(gap>0){const dt=Math.min(0.5,gap);step(dt,false);gap-=dt;if(S.bankrupt)break;}}
    if(now-lastSave>8000){save();lastSave=now;checkAch();}
    const ae=document.activeElement,busy=(now-ui.down<6000)||(ae&&(ae.tagName==='SELECT'||ae.tagName==='TEXTAREA'));
    if(!busy)render();else renderHeaderSafe();
  },250);
  function renderHeaderSafe(){const $=document.getElementById('cash');$.textContent=eur(S.cash);$.className='cash'+(S.cash<0?' neg':'');}
  document.addEventListener('pointerdown',()=>{ui.down=Date.now();});
  document.getElementById('rush').addEventListener('pointerdown',e=>{const t=e.target.closest('[data-rt]'),z=e.target.closest('[data-rs]');if(t||z){e.preventDefault();e.stopPropagation();ui.down=0;if(t)rushTap(t.dataset.rt);else rushSlotTap(z.dataset.rs);}});
  const up=()=>{ui.down=0;};
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
    const f=ACT[b.dataset.a];if(!f)return;telAct(b.dataset.a,b.dataset);{const a0=b.dataset.a,c0=S?S.cash:0;sfx('tap');setTimeout(()=>{if(S&&S.cash<c0-1&&CASH_ACTS.includes(a0))sfx('cash');},0);}
    const r=f(b.dataset);ui.down=0;if(r!=='keep')render();
  });
  document.addEventListener('input',e=>{
    const el=e.target,k=el.dataset&&el.dataset.i;if(!k)return;
    if(k==='newArea'||k==='newTier'||k==='adRole'||k==='sigP'||k==='cbMain'||k==='cbSide'||k==='cbDrink')return;
    const m=cur().menu[el.dataset.p];if(!m)return;
    if(k==='price')m.price=+el.value;else if(k==='q')m.q=clamp(+el.value,1,cur().qual);else if(k==='p')m.p=+el.value/100;
    updateProds();
  });
  document.addEventListener('change',e=>{
    const el=e.target,k=el.dataset&&el.dataset.i;if(!k)return;telInp(k);
    if(k==='newArea')ui.newArea=+el.value;if(k==='newTier')ui.newTier=+el.value;if(k==='adRole')ui.adRole=el.value;if(k==='sigP')ui.sigP=el.value;if(k==='cbMain'||k==='cbSide'||k==='cbDrink'){ui.cb=ui.cb||{};ui.cb[k==='cbMain'?'main':k==='cbSide'?'side':'drink']=el.value;}
    el.blur&&(k==='newArea'||k==='newTier'||k==='adRole'||k==='sigP'||k==='cbMain'||k==='cbSide'||k==='cbDrink')&&el.blur();render();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  window.addEventListener('pagehide',save);
  const hot=window.claude&&window.claude.hot;if(hot&&hot.snapshot)try{hot.snapshot(()=>S);}catch(e){}
  render();fxStart();
}
if(typeof document!=='undefined'){
  const hot=window.claude&&window.claude.hot;
  if(hot&&hot.ready)hot.ready(boot);else boot((hot&&hot.data)||{});
}else if(typeof module!=='undefined'){
  module.exports={problems,coProblems,genQuests,worldDay,CARDS,testerVisit,companyValue,realLocs,migrate:()=>migrate(),calcX:l=>calc(l),genApp,hireApp,staffDay,appScore,migrate,newGame,newLoc,step,calc,forecast,away,ACT,TIERS,PRODS,MACH,ROLES,AREAS,QCOST,DAY,wage,get S(){return S;},set S(v){S=v;},ui};
}
