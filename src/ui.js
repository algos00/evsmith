
(function(){
'use strict';
var A=ENG;
var DEX=POKEDEX_CHAMPIONS,MV=MOVES_CHAMPIONS;
var SPECIES=Object.keys(DEX).sort(function(a,b){return a.localeCompare(b)}),MOVEL=Object.keys(MV).filter(function(m){return MV[m].category!=='Status'&&!MV[m].unsupported}).sort();
var ABL=ABILITIES_CHAMPIONS.slice().sort(function(a,b){return a.localeCompare(b)}),ITL=ITEMS_CHAMPIONS.slice().sort(function(a,b){return a.localeCompare(b)}),NAT=Object.keys(NATURES).sort();
var SL={at:'Atk',df:'Def',sa:'SpA',sd:'SpD',sp:'Spe'};
var $i=function(id){return document.getElementById(id)};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var tick=function(){return new Promise(function(r){setTimeout(r,0)})};
function natLab(n){var m=NATURES[n];return m[0]?n+' (+'+SL[m[0]]+' −'+SL[m[1]]+')':n+' (neutral)';}
function nm(n){var m=NATURES[n]||['',''],o={at:1,df:1,sa:1,sd:1,sp:1};if(m[0]&&m[1]&&m[0]!==m[1]){o[m[0]]=1.1;o[m[1]]=0.9;}return o;}
function cls(x){return x>1?'p':(x<1?'m':'n');}
function repNat(keys,cl){if(!keys.length)return 'Hardy';for(var i=0;i<NAT.length;i++){var m=nm(NAT[i]);if(keys.every(function(k,j){return cls(m[k])===cl[j]}))return NAT[i];}return 'Hardy';}
var NATS=NAT.filter(function(n){var m=NATURES[n];return m[0]&&m[0]!==m[1]}).concat(['Hardy']);

/* ---------- motore ---------- */
function mkMe(M,sp,nat,mv,bo){return A.mkPoke({name:M.name,ability:M.ability,item:M.item,nature:nat,sp:sp,boosts:bo||{},status:M.status,abOn:M.abOn,fainted:M.fainted,moves:mv||[]});}
function myBoost(g){var m=MV[g.mv]||{},k=g.mv==='Body Press'?'df':(m.category==='Special'?'sa':'at'),o={};o[k]=+g.mbo||0;return o;}
function mkOpp(o,mv){return A.mkPoke({name:o.name,ability:o.ability,item:o.item,nature:o.nature,sp:o.sp,boosts:o.boosts||{},status:o.status,abOn:o.abOn,fainted:o.fainted,moves:mv?[{name:mv.move,crit:mv.crit,hits:mv.hits}]:[]});}
function norm(d){return typeof d==='number'?[d]:d;}
function sv(M,sp,nat,att){A.mkField(att.fo||FOG);var me=mkMe(M,sp,nat),o=mkOpp(att.opp,att),r=A.calc(me,o),x=r.theirs[0];return{rolls:norm(x.damage),lists:(x.parts&&x.parts.length?x.parts:[norm(x.damage)]),hp:me.maxHP,desc:x.description,me:me};}
function conv(lists,hp,surv){var m=new Map([[0,1]]);lists.forEach(function(L){var n=new Map();m.forEach(function(c,v){L.forEach(function(x){n.set(v+x,(n.get(v+x)||0)+c)})});m=n});var t=0,ok=0;m.forEach(function(c,v){t+=c;if(surv?v<hp:v>=hp)ok+=c});return ok/t;}
function gp(M,sp,nat,G){var hp=0,L=[];if(G.myAt!=null)sp=Object.assign({at:G.myAt},sp);G.atts.forEach(function(a){var x=sv(M,sp,nat,a);hp=x.hp;x.lists.forEach(function(l){L.push(l)});});return conv(L,hp,true);}
var FOG={};
function ko(M,sp,nat,K){var me=mkMe(M,sp,nat,[{name:K.move,crit:K.crit,hits:K.hits}],K.mb),o=mkOpp(K.opp),f0=K.fo||FOG;A.mkField(K.hh?Object.assign({},f0,{helpingHandL:1}):f0);var r=A.calc(me,o);var x=r.mine[0],rolls=norm(x.damage),hp=Math.max(1,Math.round(o.maxHP*K.pct/100));return{p:conv((x.parts&&x.parts.length?x.parts:[rolls]),hp,false),rolls:rolls,hp:hp,full:o.maxHP,desc:x.description};}
function binMin(f){if(!f(32))return 33;var lo=0,hi=32;while(lo<hi){var m=(lo+hi)>>1;if(f(m))hi=m;else lo=m+1}return lo;}
function depOf(M,G){var f=false,s=false;function H(sp){return G.atts.map(function(a){var r=sv(M,sp,'Hardy',a).rolls;return r[r.length-1]})}
var b=H({}),d=H({df:32}),e=H({sd:32});b.forEach(function(v,i){if(d[i]!==v)f=true;if(e[i]!==v)s=true});return f&&s?'ds':f?'d':s?'s':'h';}
function buildTab(M,G,dep,nat){
 var th=G.thr-1e-9,ok=function(h,d,s){return gp(M,{hp:h,df:d,sd:s},nat,G)>=th},i,h,d;
 if(dep==='h'){var t=[];for(h=0;h<=32;h++)t.push(ok(h,0,0));return t;}
 var out=[];
 if(dep==='d'||dep==='s'){for(h=0;h<=32;h++)out.push(binMin(function(x){return dep==='d'?ok(h,x,0):ok(h,0,x)}));return out;}
 for(h=0;h<=32;h++){var row=[],prev=binMin(function(s){return ok(h,0,s)});row.push(prev);
  for(d=1;d<=32;d++){var s=prev;if(s>32){if(ok(h,d,32))s=binMin(function(x){return ok(h,d,x)});}else{while(s>0&&ok(h,d,s-1))s--;}row.push(s);prev=s;}
  out.push(row);}
 return out;}
function koDep(M,K){var r=function(sp){var x=ko(M,sp,'Hardy',K).rolls;return x[x.length-1]},b=r({});if(r({at:32})!==b)return 'at';if(r({sa:32})!==b)return 'sa';if(r({df:32})!==b)return 'df';if(r({sp:32})!==b)return 'sp';return 'none';}
function koNeed(M,K,key,nat){if(key==='none')return ko(M,{},nat,K).p>=K.thr-1e-9?0:33;if(key==='sp'){var arr=[];for(var x=0;x<=32;x++)arr.push(ko(M,{sp:x},nat,K).p>=K.thr-1e-9);return arr;}return binMin(function(x){var sp={};sp[key]=x;return ko(M,sp,nat,K).p>=K.thr-1e-9});}
function koPts(M,K,nat){var key=K.key;if(key!=='at'&&key!=='sa'&&key!=='df')return null;
 var f=function(hh){return koNeed(M,Object.assign({},K,{hh:hh}),key,nat)};return{k:key,no:f(false),hh:f(true)};}
function spdOk(M,S,nat){A.mkField(S.fo||FOG);var o=[];for(var s=0;s<=32;s++){var r=A.calc(mkMe(M,{sp:s},nat),mkOpp(S.opp));o.push(S.mode==='under'?r.mySpeed<r.oppSpeed:r.mySpeed>r.oppSpeed);}return o;}

/* ---------- ottimizzatore ---------- */
/* ---------- come spendere i punti avanzati ---------- */
function spendFree(M,S,free,mode,nat,ctx){
 var S1={hp:S.hp,at:S.at,df:S.df,sa:S.sa,sd:S.sd,sp:S.sp},why=[];
 if(free<=0||mode==='none')return{S:S1,why:why,left:free};
 var bs=DEX[M.name].bs,room=function(k){return M.lock[k]==null?32-S1[k]:0;},left=free;
 var kos=((ctx&&ctx.kos)||[]).filter(function(K){return !K.meta}),cw={at:0,sa:0},names={at:[],sa:[]};
 kos.forEach(function(K){var m=MV[K.move];if(!m||K.move==='Body Press')return;var k=m.category==='Special'?'sa':'at';cw[k]+=K.w;if(names[k].indexOf(K.move)<0)names[k].push(K.move);});
 var o=(cw.at>0||cw.sa>0)?(cw.at>=cw.sa?'at':'sa'):null;
 var take=function(k,n){n=Math.min(n,room(k),left);if(n>0){S1[k]+=n;left-=n;}return n;};
 var doOff=function(stat,reason){var n=take(stat,32);if(n>0)why.push(NM[stat]+' +'+n+' — '+reason);};
 var doSpeed=function(minShare){
  var others=Object.keys(TDATA).filter(function(n){return DEX[n]}).map(function(n){return{t:A.statOf(DEX[n].bs.sp,32,'Hardy','sp'),w:TDATA[n].u}}),totW=others.reduce(function(a,x){return a+x.w},0);
  var st=function(x){var v=A.statOf(bs.sp,x,nat,'sp');return M.item==='Choice Scarf'?Math.floor(v*1.5):v;},cnt=function(x){var v=st(x),n=0;others.forEach(function(t){if(t.t<v)n+=t.w});return n;};
  var cap=S1.sp+Math.min(room('sp'),left),c0=cnt(S1.sp),best=c0,bx=S1.sp;
  for(var x=S1.sp+1;x<=cap;x++){if(cnt(x)>best){best=cnt(x);bx=x;}}
  var gain=(best-c0)/totW;
  if(bx>S1.sp&&gain>=minShare){var n=bx-S1.sp;S1.sp=bx;left-=n;why.push('Spe +'+n+' — you outspeed '+Math.round(best/totW*100)+'% of the Pokémon used in tournaments ('+Math.round(gain*100)+'% more than before); more points would not pass anyone else');return;}
  if(minShare>0)why.push('Speed: no points added — the points left would not pass at least '+Math.round(minShare*100)+'% more of the tournament Pokémon.');};
 if(mode==='smart'){
  if(o)doOff(o,'your KO goals use '+(o==='at'?'physical':'special')+' attacks ('+names[o].slice(0,2).join(', ')+'), so every extra point makes them safer');
  else why.push('Offense: no points added — you gave no KO goal, so I do not know which attack stat matters. Add a KO goal or choose the Offense mode.');
  doSpeed(0.10);
  why.push('Bulk: no points added — nothing you asked for needs them. Turn on the tournament meta to spend them on the attacks you are most likely to face.');
 }else if(mode==='offense'){var os=o||(bs.at>=bs.sa?'at':'sa');doOff(os,o?'your KO goals use '+(o==='at'?'physical':'special')+' attacks':'your higher base attack stat (you chose the Offense mode)');}
 else if(mode==='speed'){doSpeed(0);}
 else if(mode==='resist'){
  var gs=(ctx&&ctx.groups)||[],hpR=room('hp'),dfR=room('df'),sdR=room('sd'),total=Math.min(left,hpR+dfR+sdR),memo={},wsum=gs.reduce(function(t,G){return t+G.w},0);
  var score=function(h,d,e){var key=h+'|'+d+'|'+e;if(memo[key]!==undefined)return memo[key];var sp=Object.assign({},S1,{hp:S1.hp+h,df:S1.df+d,sd:S1.sd+e}),v;
   if(gs.length){v=0;gs.forEach(function(G){var tot=0,hp=1;G.atts.forEach(function(a){var x=sv(M,sp,nat,a);hp=x.hp;tot+=x.rolls[x.rolls.length-1];});v+=G.w*Math.max(-1,Math.min(1,(hp-tot)/hp));});v/=wsum;}
   else{var H=A.hpOf(bs.hp,sp.hp),D=A.statOf(bs.df,sp.df,nat,'df'),E=A.statOf(bs.sd,sp.sd,nat,'sd');v=Math.min(H*D,H*E);}
   return memo[key]=v;};
  var bestV=-Infinity,bestT=null,bal=function(h,d,e){var H=A.hpOf(bs.hp,S1.hp+h),D=A.statOf(bs.df,S1.df+d,nat,'df'),E=A.statOf(bs.sd,S1.sd+e,nat,'sd');return Math.min(H*D,H*E);};
  for(var ah=0;ah<=Math.min(hpR,total);ah++)for(var ad=0;ad<=Math.min(dfR,total-ah);ad++){var ae=total-ah-ad;if(ae<0||ae>sdR)continue;var vv=score(ah,ad,ae);
   if(vv>bestV+1e-12||(Math.abs(vv-bestV)<=1e-12&&bestT&&bal(ah,ad,ae)>bal(bestT[0],bestT[1],bestT[2]))){bestV=vv;bestT=[ah,ad,ae];}}
  if(bestT&&total>0){S1.hp+=bestT[0];S1.df+=bestT[1];S1.sd+=bestT[2];left-=total;var pr=[];['hp','df','sd'].forEach(function(k,i){if(bestT[i])pr.push(NM[k]+' +'+bestT[i])});
   why.push(pr.join(', ')+' — you chose the Resistance mode: '+(gs.length?'this split gives the best average HP margin (weighted by priority) against the attacks in your Survive goals':'with no Survive goal it keeps physical and special bulk balanced'));}}
 else if(mode==='bulk'){var added={hp:0,df:0,sd:0},sb=function(){var h=A.hpOf(bs.hp,S1.hp),d=A.statOf(bs.df,S1.df,nat,'df'),e=A.statOf(bs.sd,S1.sd,nat,'sd');return Math.min(h*d,h*e);};
  while(left>0){var bk=null,bv=-1;['hp','df','sd'].forEach(function(k){if(room(k)>0){S1[k]++;var v=sb();S1[k]--;if(v>bv){bv=v;bk=k;}}});if(!bk)break;S1[bk]++;left--;added[bk]++;}
  var parts=[];['hp','df','sd'].forEach(function(k){if(added[k])parts.push(NM[k]+' +'+added[k])});
  if(parts.length)why.push(parts.join(', ')+' — you chose the Bulk mode: it keeps physical and special bulk balanced');}
 return{S:S1,why:why,left:left};}
/* ---------- why every point is there ---------- */
function goalTests(M,nat,groups,kos,spds){var T=[];
 groups.forEach(function(G){T.push({meta:!!G.meta,label:'Survive '+G.atts.map(function(a){return a.opp.name+' '+a.move}).join(' + '),f:function(S){return gp(M,S,nat,G)>=G.thr-1e-9;}});});
 kos.forEach(function(K){T.push({meta:false,label:'KO with '+K.move+' on '+K.opp.name,f:function(S){return ko(M,S,nat,K).p>=K.thr-1e-9;}});});
 spds.forEach(function(Sg){T.push({meta:!!Sg.meta,label:(Sg.mode==='under'?'Slower than ':'Faster than ')+Sg.opp.name,f:function(S){A.mkField(Sg.fo||FOG);var r=A.calc(mkMe(M,S,nat),mkOpp(Sg.opp));return Sg.mode==='under'?r.mySpeed<r.oppSpeed:r.mySpeed>r.oppSpeed;}});});
 return T;}
/* a goal "pins" a stat when it is met with S but fails as soon as that stat loses one point (the others unchanged) */
function pinsOf(M,nat,S,tests){var out={};['hp','at','df','sa','sd','sp'].forEach(function(k){out[k]=[];if(!S[k]||M.lock[k]!=null)return;var T=Object.assign({},S);T[k]--;
 tests.forEach(function(t){if(t.f(S)&&!t.f(T))out[k].push({label:t.label,meta:t.meta});});});return out;}
async function solve(M,goals,fo,say,opts){
 FOG=fo||{};A.mkField(FOG);var LIMIT=(opts&&opts.limit)||66;
 var groups=[],kos=[],spds=[];
 goals.forEach(function(g,i){
  if(g.t==='surv'){var at={opp:oppCfg(g),move:g.mv,crit:g.crit,hits:+g.hits||0,g:g,fo:flatField(g.f)},last=groups[groups.length-1];
   if(g.join&&i>0&&goals[i-1].t==='surv'&&last&&last.atts.length<3)last.atts.push(at);else groups.push({atts:[at],thr:+g.thr,w:+g.w,meta:!!g.meta});}
  else if(g.t==='ko')kos.push({g:g,fo:flatField(g.f),opp:oppCfg(g),move:g.mv,crit:g.crit,hits:+g.hits||0,mb:myBoost(g),hh:!!g.hh,thr:+g.thr,w:+g.w,pct:+g.pct||100});
  else spds.push({g:g,fo:flatField(g.f),opp:oppCfg(g),mode:g.mode,w:+g.w,meta:!!g.meta});});
 groups.forEach(function(G){G.fp=G.atts.some(function(a){return a.move==='Foul Play'});G.dep=depOf(M,G);});
 var fpG=groups.filter(function(G){return G.fp});
 kos.forEach(function(K){K.key=koDep(M,K);});
 var tabC={},koC={},spC={},results=[];
 var natList=M.nature==='*'?NATS:[M.nature];
 for(var ni=0;ni<natList.length;ni++){
  var n=natList[ni],mods=nm(n);say('Trying nature '+n+' ('+(ni+1)+'/'+natList.length+')…');await tick();
  var tabKeys=function(G){return G.dep==='d'?['df']:G.dep==='s'?['sd']:G.dep==='ds'?['df','sd']:[];};
  var tabFor=function(G,gi,fresh){var keys=tabKeys(G),cl=keys.map(function(k){return cls(mods[k])}),key=gi+'|'+cl.join('');
   if(G.fp)return buildTab(M,G,G.dep,n); /* Foul Play also depends on the nature's effect on Atk: use the real nature */
   if(fresh)return buildTab(M,G,G.dep,repNat(keys,cl));if(!tabC[key])tabC[key]=buildTab(M,G,G.dep,repNat(keys,cl));return tabC[key];};
  var tabs=groups.map(function(G,gi){return G.fp?null:tabFor(G,gi,false);});
  var needs=kos.map(function(K,ki){if(K.key==='none'){var kk=ki+'|none';if(!koC[kk])koC[kk]=koNeed(M,K,'none',n);return koC[kk];}var c=cls(mods[K.key]),kk=ki+'|'+c;if(!koC[kk])koC[kk]=koNeed(M,K,K.key,repNat([K.key],[c]));return koC[kk];});
  var sps=spds.map(function(S,si){var c=cls(mods.sp),kk=si+'|'+c;if(!spC[kk])spC[kk]=spdOk(M,S,repNat(['sp'],[c]));return spC[kk];});
  var rg=function(v){return v==null?Array.from({length:33},function(_,i){return i}):[v]},HR=rg(M.lock.hp),DR=rg(M.lock.df),SR=rg(M.lock.sd),SPR=rg(M.lock.sp);
  var dfK=[];kos.forEach(function(K,i){if(K.key==='df'&&needs[i]<=32)dfK.push({n:needs[i],w:K.w});});var BSB=DEX[M.name].bs,mH=function(h){return Math.floor((2*BSB.hp+31)/2)+60+h},mS=function(b,sp,k){return Math.floor((Math.floor((2*b+31)/2)+5+sp)*nm(n)[k])};
  var aC=M.lock.at==null?[0]:[M.lock.at],cC=M.lock.sa==null?[0]:[M.lock.sa];needs.forEach(function(nd,i){if(nd<=32){if(kos[i].key==='at'&&M.lock.at==null)aC.push(nd);if(kos[i].key==='sa'&&M.lock.sa==null)cC.push(nd);}});
  /* best defensive spend for every budget, then the best way to add Atk / SpA / Spe on top; aList = Atk values to try */
  var search=function(tabs,aList){
   var best=[],h,d,s,gi;for(var q=0;q<=LIMIT;q++)best.push(null);
   for(var hi=0;hi<HR.length;hi++)for(var di=0;di<DR.length;di++)for(var si=0;si<SR.length;si++){h=HR[hi];d=DR[di];s=SR[si];var cost=h+d+s;if(cost>LIMIT)continue;var W=0,C=0;
    for(gi=0;gi<groups.length;gi++){var t=tabs[gi],dep=groups[gi].dep,okp=dep==='h'?t[h]:dep==='d'?d>=t[h]:dep==='s'?s>=t[h]:s>=t[h][d];if(okp){W+=groups[gi].w;C++;}}
    dfK.forEach(function(x){if(d>=x.n){W+=x.w;C++;}});var bkv=mH(h)*mS(BSB.df,d,'df')*mS(BSB.sd,s,'sd');var b=best[cost];if(!b||W>b.W||(W===b.W&&C>b.C)||(W===b.W&&C===b.C&&bkv>b.bk))best[cost]={W:W,C:C,h:h,d:d,s:s,cost:cost,bk:bkv};}
   var at=[best[0]];for(q=1;q<=LIMIT;q++){var p=at[q-1],c=best[q];at.push(c&&(!p||c.W>p.W||(c.W===p.W&&c.C>p.C))?c:p);}
   var bestN=null;
   aList.forEach(function(a){cC.forEach(function(c){for(var spi=0;spi<SPR.length;spi++){var sp=SPR[spi];var used=a+c+sp;if(used>LIMIT)continue;var W=0,C=0;
    kos.forEach(function(K,i){var nd=needs[i],okk;if(K.key==='df')return;if(K.key==='sp')okk=nd[sp];else{okk=nd<=32&&(K.key==='at'?a>=nd:K.key==='sa'?c>=nd:nd===0);}if(okk){W+=K.w;C++;}});
    spds.forEach(function(S,i){if(sps[i][sp]){W+=S.w;C++;}});
    var bk=at[LIMIT-used];if(!bk)continue;W+=bk.W;C+=bk.C;var tot=used+bk.cost;
    if(!bestN||W>bestN.W||(W===bestN.W&&C>bestN.C)||(W===bestN.W&&C===bestN.C&&tot<bestN.tot))bestN={W:W,C:C,tot:tot,n:n,a:a,c:c,sp:sp,h:bk.h,d:bk.d,sd:bk.s};}});});
   return bestN;};
  var bestN=null;
  if(!fpG.length)bestN=search(tabs,aC);
  else aC.forEach(function(a0){ /* Foul Play hits with the Atk of the target: its survive table depends on the Atk chosen for this Pokémon */
   fpG.forEach(function(G){G.myAt=a0;});
   var tA=groups.map(function(G,gi){return G.fp?tabFor(G,gi,true):tabs[gi];}),r=search(tA,[a0]);
   if(r&&(!bestN||r.W>bestN.W||(r.W===bestN.W&&r.C>bestN.C)||(r.W===bestN.W&&r.C===bestN.C&&r.tot<bestN.tot)))bestN=r;});
  if(bestN)results.push(bestN);
 }
 fpG.forEach(function(G){G.myAt=null;});
 results.sort(function(x,y){return y.W-x.W||y.C-x.C||x.tot-y.tot});
 var B=results[0];if(!B)return null;
 /* spread minima = risultato principale; i punti avanzati sono mostrati a parte */
 var S={hp:B.h,at:B.a,df:B.d,sa:B.c,sd:B.sd,sp:B.sp},free=66-(S.hp+S.at+S.df+S.sa+S.sd+S.sp),effort=[];
 var Sbase=Object.assign({},S),pins=pinsOf(M,B.n,Sbase,goalTests(M,B.n,groups,kos,spds));
 /* if some goal cannot be reached, use the free points to get as close as possible, uso i punti avanzati per avvicinarmi il più possibile */
 (function(){var items=[];
  groups.forEach(function(G){if(!G.meta&&gp(M,S,B.n,G)<G.thr-1e-9)items.push({w:G.w,t:'surv',G:G});});
  kos.forEach(function(K){if(ko(M,S,B.n,K).p<K.thr-1e-9)items.push({w:K.w,t:'ko',K:K});});
  spds.forEach(function(Sg){A.mkField(Sg.fo||FOG);var r0=A.calc(mkMe(M,S,B.n),mkOpp(Sg.opp)),k0=Sg.mode==='under'?r0.mySpeed<r0.oppSpeed:r0.mySpeed>r0.oppSpeed;if(!k0&&!Sg.meta)items.push({w:Sg.w,t:'spd',Sg:Sg});});
  items.sort(function(a,b){return b.w-a.w});
  items.forEach(function(it){if(free<=0)return;
   if(it.t==='ko'){var k=it.K.key;if((k==='at'||k==='sa'||k==='df')&&M.lock[k]==null&&S[k]<32){var ad=Math.min(free,32-S[k]);S[k]+=ad;free-=ad;effort.push({k:k,n:ad,label:it.K.move+' on '+it.K.opp.name});}}
   else if(it.t==='spd'){if(it.Sg.mode==='over'&&M.lock.sp==null&&S.sp<32){var ad2=Math.min(free,32-S.sp);S.sp+=ad2;free-=ad2;effort.push({k:'sp',n:ad2,label:'Faster than '+it.Sg.opp.name});}}
   else{var G=it.G,dep=G.dep,ks=['hp'].concat(dep==='d'||dep==='ds'?['df']:[]).concat(dep==='s'||dep==='ds'?['sd']:[]),added={};
    var frac=function(){var tot=0,hp=1;G.atts.forEach(function(a){var x=sv(M,S,B.n,a);hp=x.hp;tot+=x.rolls[x.rolls.length-1];});return tot/hp;};
    while(free>0){var bk=null,bf=9e9;ks.forEach(function(k){if(M.lock[k]==null&&S[k]<32){S[k]++;var f=frac();S[k]--;if(f<bf){bf=f;bk=k;}}});if(!bk)break;S[bk]++;free--;added[bk]=(added[bk]||0)+1;}
    Object.keys(added).forEach(function(k){effort.push({k:k,n:added[k],label:'Survive '+G.atts.map(function(a){return a.opp.name+' '+a.move}).join(' + ')});});}});})();
 var sf=spendFree(M,S,free,M.fm||'smart',B.n,{kos:kos,groups:groups}),S1=sf.S;
 if(fpG.length&&S1.at>S.at&&fpG.some(function(G){return gp(M,S,B.n,G)>=G.thr-1e-9&&gp(M,S1,B.n,G)<G.thr-1e-9;})){sf.left+=S1.at-S.at;S1.at=S.at;sf.why.push('Atk kept at '+S.at+': more Atk would make Foul Play hit harder than your Survive goal allows.');}
 var rep={S:S,S1:S1,left:sf.left,why:sf.why,effort:effort,base:Sbase,pins:pins,nat:B.n,free:free,alts:results.slice(1,4).map(function(r){return{n:r.n,W:r.W,C:r.C,tot:r.tot}}),top:B,goals:[]};
 /* verifica finale con il motore */
 var me=mkMe(M,S,B.n);rep.stats={hp:me.maxHP,at:me.rawStats.at,df:me.rawStats.df,sa:me.rawStats.sa,sd:me.rawStats.sd,sp:me.rawStats.sp};
 groups.forEach(function(G){var L=[],hp=0,desc=[];G.atts.forEach(function(a){var x=sv(M,S,B.n,a);x.lists.forEach(function(l){L.push(l)});hp=x.hp;desc.push(x.desc)});
  var p=conv(L,hp,true),mn=0,mx=0;L.forEach(function(r){mn+=r[0];mx+=r[r.length-1]});
  rep.goals.push({t:'surv',meta:!!G.meta,ok:p>=G.thr-1e-9,p:p,lo:mn/hp*100,hi:mx/hp*100,label:G.atts.map(function(a){return a.opp.name+' '+a.move}).join(' + '),desc:desc.join(' | '),w:G.w});});
 kos.forEach(function(K){var x=ko(M,S,B.n,K),r=x.rolls,okk=x.p>=K.thr-1e-9,o={t:'ko',ok:okk,p:x.p,lo:r[0]/x.full*100,hi:r[r.length-1]/x.full*100,label:K.move+' on '+K.opp.name,desc:x.desc,w:K.w,pts:koPts(M,K,B.n)};
  if(!okk&&!K.hh){var xh=ko(M,S,B.n,Object.assign({},K,{hh:true})),rh=xh.rolls;o.hh={ok:xh.p>=K.thr-1e-9,p:xh.p,lo:rh[0]/xh.full*100,hi:rh[rh.length-1]/xh.full*100};}
  rep.goals.push(o);});
 spds.forEach(function(Sg){A.mkField(Sg.fo||FOG);var r=A.calc(mkMe(M,S,B.n),mkOpp(Sg.opp)),okk=Sg.mode==='under'?r.mySpeed<r.oppSpeed:r.mySpeed>r.oppSpeed;rep.goals.push({t:'spd',meta:!!Sg.meta,ok:okk,my:r.mySpeed,opp:r.oppSpeed,label:(Sg.mode==='under'?'Slower than ':'Faster than ')+Sg.opp.name,w:Sg.w});});
 return rep;}

/* ---------- UI ---------- */
function opts(arr,sel,blank){return (blank!==undefined?'<option value="">'+blank+'</option>':'')+arr.map(function(x){return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'}).join('');}
var STA=['Asleep','Badly Poisoned','Burned','Frozen','Healthy','Paralyzed','Poisoned'];
$i('mAb').innerHTML=opts(ABL,'');$i('mIt').innerHTML=opts(ITL,'','(no item)');$i('mSt').innerHTML=opts(STA,'Healthy');
$i('mNa').innerHTML='<option value="*">Auto: try every nature</option>'+NAT.map(function(n){return '<option value="'+n+'">'+natLab(n)+'</option>'}).join('');
var WE=[['auto','Auto (from abilities)'],['','None'],['Sun','Sun'],['Rain','Rain'],['Sand','Sandstorm'],['Snow','Snow']],TE=[['auto','Auto (from abilities)'],['','None'],['Electric','Electric'],['Grassy','Grassy'],['Misty','Misty'],['Psychic','Psychic']];
$i('tmWe').innerHTML=WE.map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>'}).join('');$i('tmTe').innerHTML=TE.map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>'}).join('');
var CK=[['tailwind','Tailwind'],['reflect','Reflect'],['lightScreen','Light Screen'],['auroraVeil','Aurora Veil'],['helpingHand','Helping Hand'],['friendGuard','Friend Guard']];
/* autocomplete fatto a mano (le liste del browser danno problemi con le tastiere dei telefoni) */
var acBox=document.createElement('div');acBox.id='acbox';acBox.hidden=true;document.body.appendChild(acBox);var acIn=null;
function learnSet(sp){var l=LEARNSETS[sp];if(!l)return null;var o={};l.forEach(function(i){o[MOVE_NAMES[i]]=1});return o;}
function acShow(inp){acIn=inp;var q=inp.value.trim().toLowerCase(),items=[];
 if(inp.dataset.ac==='mon'){SPECIES.forEach(function(x){if(x.toLowerCase().indexOf(q)>=0)items.push({n:x,note:TDATA[x]?TDATA[x].u+'% usage':''})});}
 else{var sp=inp.dataset.ms==='me'?$i('mSp').value.trim():((goals[inp.dataset.i]||{}).sp),ls=learnSet(sp);
  MOVEL.forEach(function(x){if(x.toLowerCase().indexOf(q)>=0)items.push({n:x,no:!!ls&&!ls[x]});});}
 items.sort(function(a,b){return (a.no?1:0)-(b.no?1:0)||((a.n.toLowerCase().indexOf(q)===0?0:1)-(b.n.toLowerCase().indexOf(q)===0?0:1))||a.n.localeCompare(b.n)});
 items=items.slice(0,8);
 if(!q||!items.length||(items.length===1&&items[0].n.toLowerCase()===q)){acBox.hidden=true;return;}
 acBox.innerHTML=items.map(function(x){return '<div class="aci" data-v="'+esc(x.n)+'">'+esc(x.n)+(x.note?' <span class="mu">· '+x.note+'</span>':'')+(x.no?' <span class="mu">(can’t learn it)</span>':'')+'</div>'}).join('');
 var r=inp.getBoundingClientRect();acBox.style.left=(r.left+window.pageXOffset)+'px';acBox.style.top=(r.bottom+window.pageYOffset+2)+'px';acBox.style.width=r.width+'px';acBox.hidden=false;}
document.addEventListener('input',function(e){if(e.target.classList&&e.target.classList.contains('ac'))acShow(e.target);});
document.addEventListener('focusout',function(e){if(e.target===acIn)setTimeout(function(){acBox.hidden=true;},200);});
acBox.addEventListener('pointerdown',function(e){var t=e.target.closest('.aci');if(!t||!acIn)return;e.preventDefault();var inp=acIn;inp.value=t.dataset.v;acBox.hidden=true;inp.dispatchEvent(new Event('change',{bubbles:true}));if(inp.blur)inp.blur();});
function abOpts(sp,sel,blank){var pre=blank?'<option value=""'+(sel===''?' selected':'')+'>(not known)</option>':'';return pre+abOpts0(sp,sel);}
function abOpts0(sp,sel){var d=DEX[sp],own=d?d.abs.slice().sort():[],rest=ABL.filter(function(x){return own.indexOf(x)<0}),o=function(a){return a.map(function(x){return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'}).join('')};return own.length?o(own)+'<optgroup label="Other abilities">'+o(rest)+'</optgroup>':o(ABL);}
function itemLocked(sp){return !!LOCK_ITEM_LOOKUP[sp];}
/* abilities whose effect needs a situation you must say is true (the engine applies the boost only when it is switched on) */
var SIT={Blaze:'Its HP is at 1/3 or less (Fire moves ×1.5)',Torrent:'Its HP is at 1/3 or less (Water moves ×1.5)',Overgrow:'Its HP is at 1/3 or less (Grass moves ×1.5)',Swarm:'Its HP is at 1/3 or less (Bug moves ×1.5)','Flash Fire':'It already absorbed a Fire move (Fire moves ×1.5)',Stakeout:'The target just switched in (attack ×2)',Electromorphosis:'It is charged: it was hit since its last move (Electric moves ×2)','Supreme Overlord':'Allies that fainted (power +10% each, up to 5)'};
function sitBlock(ab,on,fainted,at){if(!SIT[ab])return '';
 if(ab==='Supreme Overlord')return '<div class="sit"><label>'+esc(SIT[ab])+'</label><select '+at.fa+'>'+[0,1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+(+fainted===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select></div>';
 return '<div class="sit"><label class="ck"><input type="checkbox" '+at.on+(on?' checked':'')+'> '+esc(SIT[ab])+'</label></div>';}
var mySit={on:false,fa:0};
function defAb(sp){var m=META_BY[sp],a=m?metaSet(m).ab:'';return a||DEX[sp].ab;}
var lastMe='';
function drawMySit(){$i('mSit').innerHTML=sitBlock($i('mAb').value,mySit.on,mySit.fa,{on:'id="mAbOn"',fa:'id="mFaint"'});}
$i('mSp').onchange=function(){var d=DEX[this.value];if(!d)return;$i('mAb').innerHTML=abOpts(this.value,defAb(this.value));mySit.on=false;drawMySit();$i('mIt').disabled=itemLocked(this.value);
 if(this.value!==lastMe){lastMe=this.value;$i('mIt').value='';$i('mNa').value='*';$i('mSt').value='Healthy';['hp','at','df','sa','sd','sp'].forEach(function(k){$i('lk_'+k).value='';});}};
var BO=[['6','+6'],['5','+5'],['4','+4'],['3','+3'],['2','+2'],['1','+1'],['0','0'],['-1','−1'],['-2','−2'],['-3','−3'],['-4','−4'],['-5','−5'],['-6','−6']],goals=[];
var THR=[];for(var q=16;q>=1;q--)THR.push([String(q/16),q===16?'100% (always)':(q*6.25)+'%']);
function newGoal(t){return{f:{weather:'auto',terrain:'auto'},note:'',t:t,sp:'',ab:'',it:'',na:'Hardy',st:'Healthy',mv:'',spA:32,hp:0,df:0,sd:0,spe:t==='spd'?32:0,bo:0,mbo:0,thr:'1',w:'10',join:false,mode:'over',pct:100,set:'',crit:false,hits:0,hh:false,abOn:false,fainted:0};}
function sel(i,k,arr,cur){return '<select data-i="'+i+'" data-k="'+k+'">'+arr.map(function(x){return '<option value="'+x[0]+'"'+(String(x[0])===String(cur)?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>';}
function num(i,k,v,mx){return '<input type="number" min="0" max="'+(mx||32)+'" data-i="'+i+'" data-k="'+k+'" value="'+v+'">';}
function moveExtras(g,i){var h='<label class="ck"><input type="checkbox" data-i="'+i+'" data-k="crit"'+(g.crit?' checked':'')+'> Critical hit</label>',m=MV[g.mv];
 if(m&&m.hitRange&&m.hitRange.length===2)h+='<label>Number of hits</label>'+sel(i,'hits',[['0','Default (3)'],['2','2'],['3','3'],['4','4'],['5','5']],g.hits);return h;}
function newField(){return{weather:'auto',terrain:'auto'};}
function flatField(f){f=f||newField();var o={weather:f.weather===undefined?'auto':f.weather,terrain:f.terrain===undefined?'auto':f.terrain};Object.keys(f).forEach(function(k){if(k!=='weather'&&k!=='terrain'&&f[k])o[k]=1;});return o;}
function fieldSummary(f){f=f||newField();var p=[],lab=function(arr,v){var r=arr.filter(function(x){return x[0]===v})[0];return r?r[1]:v;};
 if(f.weather!=='auto')p.push(lab(WE,f.weather));if(f.terrain!=='auto')p.push(lab(TE,f.terrain));
 CK.forEach(function(c){['L','R'].forEach(function(sd){if(f[c[0]+sd])p.push((sd==='L'?'you: ':'foe: ')+c[1]);});});
 return p.length?' · '+p.join(', '):' · automatic';}
function fieldBlock(g,i){var f=g.f||(g.f=newField());
 var dd=function(k,arr){return '<select data-i="'+i+'" data-k="f.'+k+'">'+arr.map(function(x){return '<option value="'+x[0]+'"'+(String(x[0])===String(f[k])?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>';};
 var ck=function(sd){return CK.map(function(c){return '<label class="ck"><input type="checkbox" data-i="'+i+'" data-k="f.'+c[0]+sd+'"'+(f[c[0]+sd]?' checked':'')+'> '+c[1]+'</label>'}).join('');};
 return '<details class="fld" data-i="'+i+'"'+(g.fOpen?' open':'')+'><summary>Field &amp; weather'+esc(fieldSummary(f))+'</summary><div class="g2"><div><label>Weather</label>'+dd('weather',WE)+'</div><div><label>Terrain</label>'+dd('terrain',TE)+'</div></div><div class="g2"><div><label><b>Your side</b></label>'+ck('L')+'</div><div><label><b>Opponent’s side</b></label>'+ck('R')+'</div></div></details>';}
function card(g,i){var T={surv:'🛡️ Survive',ko:'⚔️ Get a KO on',spd:'💨 Speed vs'}[g.t];
 var h='<div class="gc t-'+g.t+'"><div class="gh"><b>'+T+'</b><button class="x" data-del="'+i+'">✕</button></div>';
 h+='<input class="ac" data-ac="mon" autocomplete="off" autocapitalize="off" spellcheck="false" data-i="'+i+'" data-k="sp" value="'+esc(g.sp)+'" placeholder="Opponent Pokémon">'+metaBtn(g,i);
 h+='<div class="g2"><div><label>Ability</label><select data-i="'+i+'" data-k="ab">'+abOpts(g.sp,g.ab,true)+'</select></div><div><label>Item</label><select data-i="'+i+'" data-k="it"'+(itemLocked(g.sp)?' disabled':'')+'>'+opts(ITL,g.it,'(no item)')+'</select></div></div>';
 if(g.t==='surv')h+=sitBlock(g.ab,g.abOn,g.fainted,{on:'data-i="'+i+'" data-k="abOn"',fa:'data-i="'+i+'" data-k="fainted"'});
 h+='<div class="g2"><div><label>Nature</label><select data-i="'+i+'" data-k="na">'+NAT.map(function(n){return '<option value="'+n+'"'+(n===g.na?' selected':'')+'>'+natLab(n)+'</option>'}).join('')+'</select></div><div><label>Status</label><select data-i="'+i+'" data-k="st">'+opts(STA,g.st)+'</select></div></div>';
 if(g.t==='surv')h+='<label>Opponent’s move</label><input class="ac" data-ac="move" data-ms="opp" autocomplete="off" autocapitalize="off" spellcheck="false" data-i="'+i+'" data-k="mv" value="'+esc(g.mv)+'" placeholder="e.g. Wood Hammer"><div class="g2"><div><label>Attack points</label>'+num(i,'spA',g.spA)+'</div><div><label>Attack boost</label>'+sel(i,'bo',BO,g.bo)+'</div></div>'+moveExtras(g,i);
 if(g.t==='ko')h+='<label>Your move</label><input class="ac" data-ac="move" data-ms="me" autocomplete="off" autocapitalize="off" spellcheck="false" data-i="'+i+'" data-k="mv" value="'+esc(g.mv)+'" placeholder="e.g. Flare Blitz"><p class="mu">Your Atk/SpA points: set them in section 1 if you want them fixed (empty = the app finds the minimum).</p><div class="g3"><div><label>HP</label>'+num(i,'hp',g.hp)+'</div><div><label>Def</label>'+num(i,'df',g.df)+'</div><div><label>SpD</label>'+num(i,'sd',g.sd)+'</div></div><div class="g3"><div><label>HP left %</label>'+num(i,'pct',g.pct,100)+'</div><div><label>Their def boost</label>'+sel(i,'bo',BO,g.bo)+'</div><div><label>Your boost</label>'+sel(i,'mbo',BO,g.mbo)+'</div></div>'+moveExtras(g,i)+'<label class="ck"><input type="checkbox" data-i="'+i+'" data-k="hh"'+(g.hh?' checked':'')+'> Count Helping Hand (my ally helps)</label>';
 if(g.t==='spd')h+='<div class="g2"><div><label>Speed points</label>'+num(i,'spe',g.spe)+'</div><div><label>Speed boost</label>'+sel(i,'bo',BO,g.bo)+'</div></div><label>You want to…</label>'+sel(i,'mode',[['over','Outspeed it'],['under','Stay slower (Trick Room)']],g.mode);
 if(g.t!=='spd')h+='<label>'+(g.t==='ko'?'Chance to KO must be at least':'Chance to survive must be at least')+'</label>'+sel(i,'thr',THR,g.thr);
 h+=fieldBlock(g,i);h+='<label>Priority</label>'+sel(i,'w',[['1000','Required'],['10','Important'],['1','Nice to have']],g.w);
 if(g.t==='surv'&&i>0&&goals[i-1].t==='surv')h+='<label class="ck"><input type="checkbox" data-i="'+i+'" data-k="join"'+(g.join?' checked':'')+'> I also take the hit above, same turn</label>';
 return h+'</div>';}
/* ---------- dati d'uso dei tornei (tutti i Pokémon; dove non so, vuoto) ---------- */
var META_BY={};META.forEach(function(m){META_BY[m.n]=m;});
var TOP=Object.keys(TDATA).filter(function(n){return DEX[n]}).map(function(n){return{n:n,u:TDATA[n].u,r:TDATA[n].r}}).sort(function(a,b){return a.r-b.r});
function soleAb(sp){var d=DEX[sp];return d&&d.abs.length===1?d.abs[0]:'';}
function metaSet(m){var d=DEX[m.n],ab=soleAb(m.n);for(var i=0;!ab&&i<m.ab.length;i++){if(d.abs.indexOf(m.ab[i])>=0)ab=m.ab[i];}return{ab:ab,it:itemLocked(m.n)?'':(m.it[0]||'')};}
function dmgMoves(m,k){var out=[];m.mv.forEach(function(v){if(out.length<k&&MV[v]&&MV[v].category!=='Status'&&!MV[v].unsupported)out.push(v)});return out;}
function natFor(m,mv){return m.na&&m.na.length?m.na[0][0]:(MV[mv].category==='Special'?'Modest':'Adamant');}
function metaBtn(g,i){var m=META_BY[g.sp],t=TDATA[g.sp];
 if(m)return '<button class="add" style="margin:6px 0" data-meta="'+i+'">📊 Use the most used tournament set ('+m.u+'% of teams)</button>'+(g.note?'<p class="ok" style="margin:2px 0 8px;font-size:13px">'+esc(g.note)+'</p>':'');
 if(DEX[g.sp])return '<p class="mu">'+(t?'Used in '+t.u+'% of tournament teams, but ':'')+'no certain tournament set for this Pokémon: ability, item and move are left empty.</p>';return '';}
function fillFromMeta(g){var m=META_BY[g.sp];
 if(m){var s=metaSet(m);g.ab=s.ab;g.it=s.it;if(g.t==='surv'){var mv=dmgMoves(m,1)[0];if(mv){g.mv=mv;g.na=natFor(m,mv);}g.spA=32;}if(g.t==='spd')g.spe=32;}
 else{g.ab=soleAb(g.sp);g.it='';}}
function applyMeta(i){var g=goals[i];fillFromMeta(g);var bits=[];if(g.ab)bits.push(g.ab);if(g.it)bits.push(g.it);if(g.t==='surv'&&g.mv)bits.push(g.mv);if(g.t==='surv'&&g.na)bits.push(g.na);g.note='✔ Filled: '+(bits.join(' · ')||'nothing to fill')+'. Tournaments do not publish Stat Points, so those stay as you set them.';draw();}
function metaGoals(){var atk=$i('tmOn').checked,spd=$i('tmSpd').checked;if(!atk&&!spd)return[];
 var n=+$i('tmN').value,k=+$i('tmM').value,off=$i('tmNat').value==='off',gs=[],f={weather:$i('tmWe').value,terrain:$i('tmTe').value},RK=[1,.7,.5,.35];
 TOP.slice(0,n).forEach(function(t){var m=META_BY[t.n],s=m?metaSet(m):{ab:soleAb(t.n),it:''};
  if(atk&&m)dmgMoves(m,k).forEach(function(mv,ri){var acc=(MV[mv].acc||100)/100,g=newGoal('surv');g.sp=t.n;g.ab=s.ab;g.it=s.it;g.na=(m.na&&m.na.length)?m.na[0][0]:(off?(MV[mv].category==='Special'?'Modest':'Adamant'):'Hardy');g.mv=mv;g.spA=32;g.thr='1';g.w=String(Math.max(1,Math.round(t.u*10*RK[ri]*acc)));g.f=Object.assign({},f);g.meta=true;gs.push(g);});
  if(spd){var g2=newGoal('spd');g2.sp=t.n;g2.ab=s.ab;g2.it=s.it;g2.na='Hardy';g2.spe=32;g2.w=String(Math.max(1,Math.round(t.u*10)));g2.f=Object.assign({},f);g2.mode='over';g2.meta=true;gs.push(g2);}});
 return gs;}
/* tabella di tutti i Pokémon */
function amRender(){var q=$i('amQ').value.trim().toLowerCase(),T=$i('amT'),pc=function(m,k,n){return m.pc&&m.pc[k]&&m.pc[k][n]!==undefined?' '+m.pc[k][n]+'%':'';};
 var rows=SPECIES.filter(function(n){return !q||n.toLowerCase().indexOf(q)>=0}).map(function(n){var t=TDATA[n],m=META_BY[n];
  return '<tr><td>'+esc(n)+'</td><td>'+(t?t.u+'% <span class="mu">#'+t.r+'</span>':'')+'</td><td>'+(m?m.ab.slice(0,2).map(function(a){return esc(a)+pc(m,'ab',a)}).join(', '):'')+'</td><td>'+(m?m.it.slice(0,3).map(function(a){return esc(a)+pc(m,'it',a)}).join(', '):'')+'</td><td>'+(m?m.mv.slice(0,4).map(function(a){return esc(a)+pc(m,'mv',a)}).join(', '):'')+'</td><td>'+(m&&m.na?m.na.slice(0,2).map(function(a){return esc(a[0])+' '+a[1]+'%'}).join(', '):'')+'</td></tr>';}).join('');
 T.innerHTML='<tr><th>Pokémon</th><th>Usage</th><th>Ability</th><th>Items</th><th>Moves</th><th>Nature</th></tr>'+rows;}
$i('allMon').addEventListener('toggle',amRender);$i('amQ').addEventListener('input',amRender);
/* ---------- share & export (pure functions: no DOM access) ---------- */
function b64enc(t){return btoa(unescape(encodeURIComponent(t))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64dec(t){t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';return decodeURIComponent(escape(atob(t)));}
function pickOf(list,v,d){return list.indexOf(v)>=0?v:d;}
function intOf(v,lo,hi,d){v=Math.round(+v);return isFinite(v)?Math.max(lo,Math.min(hi,v)):d;}
/* everything that comes from a link or from storage is untrusted: rebuild it from validated values only */
function cleanGoal(g){if(!g||['surv','ko','spd'].indexOf(g.t)<0)return null;var o=newGoal(g.t),f=g.f||{},ok=function(a){return a.map(function(x){return x[0]})};
 o.sp=DEX[g.sp]?g.sp:'';o.ab=g.ab&&ABL.indexOf(g.ab)>=0?g.ab:'';o.it=g.it&&ITL.indexOf(g.it)>=0?g.it:'';o.na=pickOf(Object.keys(NATURES),g.na,'Hardy');o.st=pickOf(STA,g.st,'Healthy');
 o.mv=MV[g.mv]?g.mv:'';o.spA=intOf(g.spA,0,32,32);o.hp=intOf(g.hp,0,32,0);o.df=intOf(g.df,0,32,0);o.sd=intOf(g.sd,0,32,0);o.spe=intOf(g.spe,0,32,o.spe);o.pct=intOf(g.pct,0,100,100);
 o.bo=intOf(g.bo,-6,6,0);o.mbo=intOf(g.mbo,-6,6,0);o.hits=intOf(g.hits,0,5,0);o.thr=pickOf(ok(THR),String(g.thr),'1');o.w=pickOf(['1000','10','1'],String(g.w),'10');
 o.mode=pickOf(['over','under'],g.mode,'over');o.join=g.join===true;o.abOn=g.abOn===true;o.fainted=intOf(g.fainted,0,5,0);o.crit=g.crit===true;o.hh=g.hh===true;
 o.f={weather:pickOf(ok(WE),f.weather,'auto'),terrain:pickOf(ok(TE),f.terrain,'auto')};
 CK.forEach(function(c){['L','R'].forEach(function(sd){if(f[c[0]+sd]===true)o.f[c[0]+sd]=true;});});return o;}
function cleanState(raw){if(!raw||typeof raw!=='object'||raw.v!==1)return null;var m=raw.m||{},t=raw.t||{},lk={};
 ['hp','at','df','sa','sd','sp'].forEach(function(k){var v=m.lk&&m.lk[k];lk[k]=v===''||v==null?'':intOf(v,0,32,'');});
 var sp=DEX[m.sp]?m.sp:'Incineroar';
 return{v:1,m:{sp:sp,ab:m.ab&&ABL.indexOf(m.ab)>=0?m.ab:DEX[sp].ab,it:m.it&&ITL.indexOf(m.it)>=0?m.it:'',na:m.na==='*'?'*':pickOf(Object.keys(NATURES),m.na,'*'),st:pickOf(STA,m.st,'Healthy'),fm:pickOf(['smart','bulk','resist','offense','speed','none'],m.fm,'smart'),abOn:m.abOn===true&&!!SIT[m.ab&&ABL.indexOf(m.ab)>=0?m.ab:DEX[sp].ab],fainted:intOf(m.fainted,0,5,0),lk:lk},
  t:{on:t.on===true,spd:t.spd===true,n:pickOf(['5','8','10','12','15','20','25','40','60'],String(t.n),'12'),m:pickOf(['1','2','3'],String(t.m),'2'),nat:pickOf(['off','neu'],t.nat,'off'),we:pickOf(WE.map(function(x){return x[0]}),t.we,'auto'),te:pickOf(TE.map(function(x){return x[0]}),t.te,'auto'),b:pickOf(['12','24','36','66'],String(t.b),'24')},
  g:(Array.isArray(raw.g)?raw.g.slice(0,30):[]).map(cleanGoal).filter(Boolean)};}
function encodeShare(st){return b64enc(JSON.stringify(st));}
function decodeShare(txt){try{return cleanState(JSON.parse(b64dec(txt)));}catch(e){return null;}}
/* Pokémon Showdown import text. In Showdown's Champions format the EVs line holds Stat Points directly (0-32 per stat). */
function sdSpecies(n){var m=/^Mega (.+?)( [XYZ])?$/.exec(n);return m?m[1]+'-Mega'+(m[2]?'-'+m[2].trim():''):n;}
function showdownSet(o){var K=[['hp','HP'],['at','Atk'],['df','Def'],['sa','SpA'],['sd','SpD'],['sp','Spe']],
 ev=K.filter(function(k){return o.S[k[0]]>0}).map(function(k){return o.S[k[0]]+' '+k[1]}),L=[sdSpecies(o.name)+(o.item?' @ '+o.item:''),'Ability: '+o.ability,'Level: 50'];
 if(ev.length)L.push('EVs: '+ev.join(' / '));if(o.nature)L.push(o.nature+' Nature');o.moves.forEach(function(m){L.push('- '+m)});return L.join('\n');}
/* ---------- end share & export ---------- */
function draw(){$i('goals').innerHTML=goals.length?goals.map(card).join(''):'<p class="mu">Add at least one goal with the buttons below.</p>';}
$i('goals').onchange=function(e){var t=e.target,i=t.dataset.i;if(i===undefined)return;var g=goals[i],k=t.dataset.k,prevSp=g.sp;
 if(k.indexOf('f.')===0){g.f=g.f||newField();g.f[k.slice(2)]=t.type==='checkbox'?t.checked:t.value;var dt=t.closest('details'),sm=dt&&dt.querySelector('summary');if(sm)sm.innerHTML='Field &amp; weather'+esc(fieldSummary(g.f));return;}
 if(t.type==='checkbox'){g[k]=t.checked;draw();return;}
 var v=t.value;if(['spA','hp','df','sd','spe','pct'].indexOf(k)>=0)v=Math.max(0,Math.min(k==='pct'?100:32,+v||0));if(k==='bo'||k==='mbo')v=+v;g[k]=v;
 if(k==='sp'){if(DEX[v]&&v!==prevSp){var nd=newGoal(g.t);g.ab='';g.it='';g.na='Hardy';g.st='Healthy';g.spA=nd.spA;g.hp=nd.hp;g.df=nd.df;g.sd=nd.sd;g.spe=nd.spe;g.bo=0;g.mbo=0;g.abOn=false;g.fainted=0;g.note='';fillFromMeta(g);}draw();}
 if(k==='fainted')g.fainted=Math.max(0,Math.min(5,+v||0));
 if(k==='ab'){g.abOn=false;draw();}
 if(k==='mv'){draw();}
};
$i('goals').addEventListener('toggle',function(e){var d=e.target;if(d.classList&&d.classList.contains('fld')&&goals[d.dataset.i])goals[d.dataset.i].fOpen=d.open;},true);
$i('goals').onclick=function(e){var mi=e.target.dataset.meta;if(mi!==undefined){applyMeta(+mi);return;}var d=e.target.dataset.del;if(d===undefined)return;goals.splice(+d,1);draw();};
$i('addSurv').onclick=function(){goals.push(newGoal('surv'));draw();};
$i('addKo').onclick=function(){goals.push(newGoal('ko'));draw();};
$i('addSpd').onclick=function(){goals.push(newGoal('spd'));draw();};
function oppCfg(g){var sp={hp:0,at:0,df:0,sa:0,sd:0,sp:0},bo={};
 if(g.t==='surv'){var m=MV[g.mv],k=m&&m.category==='Special'?'sa':'at';sp[k]=g.spA;bo[k]=g.bo;}
 if(g.t==='ko'){sp.hp=g.hp;sp.df=g.df;sp.sd=g.sd;bo={df:g.bo,sd:g.bo};}
 if(g.t==='spd'){sp.sp=g.spe;bo={sp:g.bo};}
 return{name:g.sp,ability:g.ab||'None',item:g.it,nature:g.na,status:g.st||'Healthy',sp:sp,boosts:bo,abOn:!!g.abOn,fainted:+g.fainted||0};}
function err(m){var r=$i('res');r.hidden=false;r.innerHTML='<p class="bad">'+m+'</p>';}
$i('go').onclick=async function(){
 var btn=this,res=$i('res');
 var M={name:$i('mSp').value.trim(),ability:$i('mAb').value,item:$i('mIt').value,nature:$i('mNa').value,status:$i('mSt').value,fm:$i('fm').value,abOn:mySit.on,fainted:mySit.fa,lock:{}};
 var lsum=0;['hp','at','df','sa','sd','sp'].forEach(function(k){var v=$i('lk_'+k).value;M.lock[k]=v===''?null:Math.max(0,Math.min(32,+v||0));lsum+=M.lock[k]||0;});
 if(lsum>66)return err('The fixed points add up to more than 66.');
 if(!DEX[M.name])return err('Pick a valid Pokémon for your own Pokémon (choose from the list).');
 if(!goals.length&&!$i('tmOn').checked&&!$i('tmSpd').checked)return err('Add at least one goal, or turn on one of the tournament meta options.');
 for(var i=0;i<goals.length;i++){var g=goals[i],n=i+1;
  if(!DEX[g.sp])return err('Goal '+n+': pick an opponent Pokémon from the list.');
  if(g.t!=='spd'&&!MV[g.mv])return err('Goal '+n+': pick a move from the list.');
  if(g.t!=='spd'&&MV[g.mv].unsupported)return err('Goal '+n+': that move is not supported (its power depends on special conditions).');
  if(g.t==='surv'&&MV[g.mv].category==='Status')return err('Goal '+n+': the move must deal damage.');
  if(g.t==='ko'&&MV[g.mv].category==='Status')return err('Goal '+n+': your move must deal damage.');}
 btn.disabled=true;res.hidden=false;
 var say=function(m){res.innerHTML='<p class="mu"><span class="spin"></span> '+m+'</p>'};
 try{var t0=Date.now(),mg=metaGoals(),r;
  if(mg.length){var B=+$i('tmB').value,r0=goals.length?await solve(M,goals,{},say):null,base=r0?r0.top.tot:0,lim=B>=66?66:Math.max(base,Math.min(66,base+B));
   r=await solve(M,goals.concat(mg),{},say,{limit:lim});if(r){r.metaBase=base;r.metaLimit=B;}}
  else r=await solve(M,goals,{},say);
  if(!r)err('I could not find any possible spread.');else show(r,M,Date.now()-t0);}
 catch(e){err('Calculation error: '+esc(e.message));console.error(e);}
 btn.disabled=false;};
function ruler(S,K){var c='',n=0;K.forEach(function(k,ki){for(var i=0;i<S[k];i++){c+='<i class="c'+ki+'" style="--d:'+(n++*12)+'ms"></i>';}});for(;n<66;n++)c+='<i class="f"></i>';return '<div class="ruler">'+c+'</div>';}
var NM={hp:'HP',at:'Atk',df:'Def',sa:'SpA',sd:'SpD',sp:'Spe'};
var LAST=null;
function setMoves(){var out=[];goals.forEach(function(g){if(g.t==='ko'&&MV[g.mv]&&out.indexOf(g.mv)<0&&out.length<4)out.push(g.mv)});return out;}
function setText(r,M,which){return showdownSet({name:M.name,item:M.item||LOCK_ITEM_LOOKUP[M.name]||'',ability:M.ability,nature:r.nat,S:which==='full'?r.S1:r.S,moves:setMoves()});}
function exportHtml(r,M){LAST={r:r,M:M};var K=['hp','at','df','sa','sd','sp'],differs=K.some(function(k){return r.S[k]!==r.S1[k]});
 return '<h2>Export</h2><p class="mu">Paste it in Pokémon Showdown (Teambuilder → Import). Stat Points go in the EVs line, as in Showdown’s Champions format. Moves come from your KO goals.</p><div class="g2"><button class="add" data-exp="min" type="button">Copy set (minimum spread)</button>'+(differs?'<button class="add" data-exp="full" type="button">Copy set (with suggested leftover)</button>':'')+'</div><details><summary>Show the text</summary><pre style="white-space:pre-wrap;user-select:all">'+esc(setText(r,M,'min'))+'</pre></details>';}
$i('res').addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-exp]');if(!b||!LAST)return;copyText(setText(LAST.r,LAST.M,b.dataset.exp),'Set copied.');});
function whyHtml(r,M){var K=['hp','at','df','sa','sd','sp'],rows=K.filter(function(k){return r.base[k]>0}).map(function(k){var p=r.pins[k]||[],mine=p.filter(function(x){return !x.meta}),meta=p.filter(function(x){return x.meta}),t;
  if(M.lock[k]!=null)t='fixed by you';else{var parts=[];if(mine.length)parts.push(mine.map(function(x){return esc(x.label)}).join('; '));if(meta.length)parts.push(meta.length+' tournament-meta goal'+(meta.length>1?'s':'')+(mine.length?'':': '+meta.slice(0,3).map(function(x){return esc(x.label)}).join('; ')+(meta.length>3?'…':'')));
   t=parts.length?parts.join(' · '):'no single goal needs the last point on its own: it is a trade-off between HP, Def and SpD';}
  return '<li><b>'+NM[k]+' '+r.base[k]+'</b> — '+t+'</li>';});
 return rows.length?'<details class="why"><summary>Why these points?</summary><ul style="margin:6px 0 0 18px;padding:0">'+rows.join('')+'</ul></details>':'';}
function show(r,M,ms){var K=['hp','at','df','sa','sd','sp'],mineG=r.goals.filter(function(g){return !g.meta}),metaG=r.goals.filter(function(g){return g.meta}),badAll=mineG.filter(function(g){return !g.ok}),h='<h2>'+(badAll.length?'Best spread found':'Minimum spread found')+'</h2>'+ruler(r.S,K)+'<div class="sp">'+K.map(function(k,i){return '<div class="s'+i+'"><b>'+r.S[k]+'</b><span>'+NM[k]+'</span></div>'}).join('')+'</div>';
 h+='<p><b>Nature: '+natLab(r.nat)+'</b></p><p class="mu">Stats at level 50: '+K.map(function(k){return NM[k]+' '+r.stats[k]}).join(' · ')+'</p>';
 h+=whyHtml(r,M);
 if(r.free>0){h+='<p><b>Free points left: '+r.free+'</b> <span class="mu">(you are not forced to use them)</span></p><p class="mu">Suggested way to spend them ('+(r.left===undefined?r.free:r.left)+' stay free):</p><div class="sp">'+K.map(function(k,i){return '<div class="s'+i+'"><b>'+r.S1[k]+'</b><span>'+NM[k]+'</span></div>'}).join('')+'</div>'+(r.why&&r.why.length?'<ul class="mu" style="margin:6px 0 0 18px;padding:0">'+r.why.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'');}
 if(r.effort&&r.effort.length)h+='<p class="mu">Extra points put toward goals that could not be fully reached: '+r.effort.map(function(e){return NM[e.k]+' +'+e.n+' ('+e.label+')'}).join(', ')+'.</p>';
 var bad=badAll,hardBad=bad.filter(function(g){return !(g.hh&&g.hh.ok)});
 h+=!mineG.length?'':!bad.length?'<p class="ok">All goals are satisfied! 🎉</p>':(hardBad.length?'<p class="bad">I could not satisfy every goal: I gave up the least important ones first and put the extra points toward the closest ones.</p>':'<p class="ok">Every goal works. 🤝 marks the ones that need Helping Hand.</p>');
 var ptsLab=function(n){return n>32?'not reachable':String(n)},ptsRow=function(g){var q=g.pts;if(!q)return '';return '<br><span class="mu">Minimum '+NM[q.k]+' points: '+ptsLab(q.no)+' without Helping Hand · '+ptsLab(q.hh)+' with it'+(q.no<=32&&q.hh<q.no?' (saves '+(q.no-q.hh)+')':'')+'</span>';};
 var rowH=function(g){var v=g.t==='spd'?'you '+g.my+' · them '+g.opp:g.lo.toFixed(1)+'–'+g.hi.toFixed(1)+'% · '+(g.p*100).toFixed(g.p===1||g.p===0?0:1)+'%';
  return '<tr><td>'+(g.ok?'✅':(g.hh&&g.hh.ok?'🤝':'❌'))+' '+esc(g.label)+(g.desc?'<br><span class="mu">'+esc(g.desc)+'</span>':'')+ptsRow(g)+(g.hh?'<br><span class="mu">With Helping Hand: '+g.hh.lo.toFixed(1)+'–'+g.hh.hi.toFixed(1)+'% · '+(g.hh.p*100).toFixed(g.hh.p===1||g.hh.p===0?0:1)+'% '+(g.hh.ok?'✅':'❌')+'</span>':'')+'</td><td>'+v+'</td></tr>'};
 var metaHtml='';
 if(metaG.length){var ms=metaG.filter(function(g){return g.t==='surv'}),mp=metaG.filter(function(g){return g.t==='spd'}),wt=function(a){return a.reduce(function(t,g){return t+g.w},0)},wok=function(a){return wt(a.filter(function(g){return g.ok}))};
  metaHtml='<h2>Tournament meta</h2><p>'+(ms.length?'Survives <b>'+ms.filter(function(g){return g.ok}).length+' of '+ms.length+'</b> of the most used attacks (<b>'+Math.round(wok(ms)/wt(ms)*100)+'%</b> of the usage weight)':'')+(mp.length?(ms.length?' · ':'')+'outspeeds <b>'+mp.filter(function(g){return g.ok}).length+' of '+mp.length+'</b> top Pokémon (<b>'+Math.round(wok(mp)/wt(mp)*100)+'%</b> of the usage weight)':'')+'.'+(r.metaBase!==undefined?' The meta used <b>'+Math.max(0,r.top.tot-r.metaBase)+'</b> extra points (limit: '+(r.metaLimit>=66?'none':'up to '+r.metaLimit)+').':'')+'</p><details><summary>See each one</summary><table>'+metaG.map(rowH).join('')+'</table></details>';}
 h+=(mineG.length?'<h2>Goals</h2><table>'+mineG.map(rowH).join('')+'</table>':'')+metaHtml;
 if(r.alts.length)h+='<h2>Other natures</h2><p class="mu">'+r.alts.map(function(a){return natLab(a.n)+(a.W===r.top.W&&a.C===r.top.C?' (same result)':' (meets fewer goals)')}).join(' · ')+'</p>';
 h+=exportHtml(r,M);
 h+='<p class="mu">Calculated in '+(ms/1000).toFixed(1)+' s with the EVSmith damage engine.</p>';
 $i('res').innerHTML=h;if($i('res').scrollIntoView)$i('res').scrollIntoView({behavior:'smooth'});}
(function(){if(typeof TMETA==='undefined')return;$i('metaTxt').textContent=TMETA.source+', '+TMETA.format+', tournaments with '+TMETA.minPlayers+'+ players over the last '+TMETA.days+' days ('+TMETA.teams.toLocaleString('en-US')+' teams). Collected on '+TMETA.date+' and not updated automatically; where no reliable data exists, the field is left empty.';})();
$i('mSp').value='Incineroar';$i('mSp').onchange();$i('mAb').onchange=function(){mySit.on=false;drawMySit();};$i('mSit').addEventListener('change',function(e){if(e.target.id==='mAbOn')mySit.on=e.target.checked;if(e.target.id==='mFaint')mySit.fa=+e.target.value;});drawMySit();draw();
/* ---------- saved state, share link, export (DOM side) ---------- */
var LS_KEY='evsmith.state.v1',toolT=null;
function readState(){var lk={};['hp','at','df','sa','sd','sp'].forEach(function(k){lk[k]=$i('lk_'+k).value;});
 return{v:1,m:{sp:$i('mSp').value.trim(),ab:$i('mAb').value,it:$i('mIt').value,na:$i('mNa').value,st:$i('mSt').value,fm:$i('fm').value,abOn:mySit.on,fainted:mySit.fa,lk:lk},
  t:{on:$i('tmOn').checked,spd:$i('tmSpd').checked,n:$i('tmN').value,m:$i('tmM').value,nat:$i('tmNat').value,we:$i('tmWe').value,te:$i('tmTe').value,b:$i('tmB').value},
  g:goals.map(function(g){var o={};Object.keys(g).forEach(function(k){if(k!=='fOpen'&&k!=='note')o[k]=g[k]});return o;})};}
function applyState(st){var m=st.m,t=st.t;$i('mSp').value=m.sp;lastMe=m.sp;$i('mAb').innerHTML=abOpts(m.sp,m.ab);$i('mIt').disabled=itemLocked(m.sp);$i('mIt').value=m.it;mySit.on=m.abOn;mySit.fa=m.fainted;drawMySit();
 $i('mNa').value=m.na;$i('mSt').value=m.st;$i('fm').value=m.fm;['hp','at','df','sa','sd','sp'].forEach(function(k){$i('lk_'+k).value=m.lk[k];});
 $i('tmOn').checked=t.on;$i('tmSpd').checked=t.spd;$i('tmN').value=t.n;$i('tmM').value=t.m;$i('tmNat').value=t.nat;$i('tmWe').value=t.we;$i('tmTe').value=t.te;$i('tmB').value=t.b;goals=st.g;draw();}
function saveLocal(){try{window.localStorage.setItem(LS_KEY,JSON.stringify(readState()));}catch(e){}}
function queueSave(){clearTimeout(toolT);toolT=setTimeout(saveLocal,300);}
function say2(msg){var el=$i('toolMsg');el.textContent=msg;clearTimeout(say2.t);say2.t=setTimeout(function(){el.textContent='';},3500);}
function copyText(txt,okMsg){var done=function(){say2(okMsg)},fail=function(){say2('Could not copy: select the text and copy it by hand.')};
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done,function(){legacyCopy(txt)?done():fail();});}else legacyCopy(txt)?done():fail();}
function legacyCopy(txt){try{var ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);return ok;}catch(e){return false;}}
function shareUrl(){return location.href.split('#')[0]+'#s='+encodeShare(readState());}
$i('shareBtn').onclick=function(){copyText(shareUrl(),'Link copied: it contains your Pokémon, goals and options.');};
$i('resetBtn').onclick=function(){if(!confirm('Reset your Pokémon, goals and options?'))return;goals=[];['hp','at','df','sa','sd','sp'].forEach(function(k){$i('lk_'+k).value='';});
 $i('mSp').value='Incineroar';lastMe='';$i('mSp').onchange();$i('fm').value='smart';$i('tmOn').checked=false;$i('tmSpd').checked=false;$i('res').hidden=true;draw();try{window.localStorage.removeItem(LS_KEY);}catch(e){}
 if(location.hash)history.replaceState(null,'',location.href.split('#')[0]);say2('Everything was reset.');};
document.addEventListener('change',queueSave);document.addEventListener('click',queueSave);
(function(){var st=null;try{if(/^#s=/.test(location.hash))st=decodeShare(location.hash.slice(3));else{var raw=window.localStorage.getItem(LS_KEY);if(raw)st=cleanState(JSON.parse(raw));}}catch(e){st=null;}
 if(st){applyState(st);if(/^#s=/.test(location.hash))say2('Setup loaded from the link.');}else if(/^#s=/.test(location.hash))say2('This link could not be read.');})();
})();

