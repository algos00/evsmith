
(function(){
'use strict';
var A=ENG;
var DEX=POKEDEX_CHAMPIONS,MV=MOVES_CHAMPIONS;
var SPECIES=Object.keys(DEX).sort(function(a,b){return a.localeCompare(b)}),MOVEL=Object.keys(MV).filter(function(m){return MV[m].category!=='Status'&&!MV[m].unsupported}).sort();
var ABL=ABILITIES_CHAMPIONS.slice().sort(function(a,b){return a.localeCompare(b)}),ITL=ITEMS_CHAMPIONS.slice().sort(function(a,b){return a.localeCompare(b)}),NAT=Object.keys(NATURES).sort();
var LANG='en';
/* interface language: English texts are the keys; I18N_IT (src/i18n.js) holds the Italian ones. {0}, {1}… are replaced by the arguments. */
/* N_ marks a text for translation where it is defined; tr() translates it where it is shown */
function N_(s){return s;}
function tr(s,a){var r=(LANG==='it'&&typeof I18N_IT!=='undefined'&&I18N_IT[s]!==undefined)?I18N_IT[s]:s;return a?r.replace(/\{(\d+)\}/g,function(m,i){return a[+i]}):r;}
var SL={at:'Atk',df:'Def',sa:'SpA',sd:'SpD',sp:'Spe'};
var $i=function(id){return document.getElementById(id)};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var tick=function(){return new Promise(function(r){setTimeout(r,0)})};
function natLab(n){var m=NATURES[n];return m[0]?n+' (+'+SL[m[0]]+' −'+SL[m[1]]+')':n+' ('+tr('neutral')+')';}
function nm(n){var m=NATURES[n]||['',''],o={at:1,df:1,sa:1,sd:1,sp:1};if(m[0]&&m[1]&&m[0]!==m[1]){o[m[0]]=1.1;o[m[1]]=0.9;}return o;}
function cls(x){return x>1?'p':(x<1?'m':'n');}
function repNat(keys,cl){if(!keys.length)return 'Hardy';for(var i=0;i<NAT.length;i++){var m=nm(NAT[i]);if(keys.every(function(k,j){return cls(m[k])===cl[j]}))return NAT[i];}return 'Hardy';}
var NATS=NAT.filter(function(n){var m=NATURES[n];return m[0]&&m[0]!==m[1]}).concat(['Hardy']);

/* ---------- motore ---------- */
function mkMe(M,sp,nat,mv,bo){return A.mkPoke({name:M.name,ability:M.ability,item:M.item,nature:nat,sp:sp,boosts:bo||{},status:M.status,abOn:M.abOn,fainted:M.fainted,moves:mv||[]});}
function myBoost(g){var m=MV[g.mv]||{},k=g.mv==='Body Press'?'df':(m.category==='Special'?'sa':'at'),o={};o[k]=+g.mbo||0;return o;}
function mkOpp(o,mv){return A.mkPoke({name:o.name,ability:o.ability,item:o.item,nature:o.nature,sp:o.sp,boosts:o.boosts||{},status:o.status,abOn:o.abOn,fainted:o.fainted,moves:mv?[{name:mv.move,crit:mv.crit,hits:mv.hits}]:[]});}
function norm(d){return typeof d==='number'?[d]:d;}
function sv(M,sp,nat,att){A.mkField(att.fo||FOG);var me=mkMe(M,sp,nat,undefined,att.mbo),o=mkOpp(att.opp,att),r=A.calc(me,o),x=r.theirs[0];return{rolls:norm(x.damage),lists:(x.parts&&x.parts.length?x.parts:[norm(x.damage)]),hp:me.maxHP,desc:x.description,me:me};}
function conv(lists,hp,surv){var m=new Map([[0,1]]);lists.forEach(function(L){var n=new Map();m.forEach(function(c,v){L.forEach(function(x){n.set(v+x,(n.get(v+x)||0)+c)})});m=n});var t=0,ok=0;m.forEach(function(c,v){t+=c;if(surv?v<hp:v>=hp)ok+=c});return ok/t;}
function gp(M,sp,nat,G){var hp=0,L=[];if(G.myAt!=null)sp=Object.assign({at:G.myAt},sp);G.atts.forEach(function(a){var x=sv(M,sp,nat,a);hp=x.hp;x.lists.forEach(function(l){L.push(l)});});return conv(L,hp,true);}
var FOG={};
function ko(M,sp,nat,K){var me=mkMe(M,sp,nat,[{name:K.move,crit:K.crit,hits:K.hits}],K.mb),o=mkOpp(K.opp),f0=K.fo||FOG;A.mkField(K.hh===undefined?f0:Object.assign({},f0,{helpingHandL:K.hh?1:0}));var r=A.calc(me,o);var x=r.mine[0],rolls=norm(x.damage),hp=Math.max(1,Math.round(o.maxHP*K.pct/100));return{p:conv((x.parts&&x.parts.length?x.parts:[rolls]),hp,false),rolls:rolls,hp:hp,full:o.maxHP,desc:x.description};}
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
/* Extra HP optimizations: the HP stat is tuned with leftover points so that it fits what the player ticked (n = any whole number) */
var HPOPT=[['recovery',N_('Recovery'),'16n',function(s){return s%16===0}],['poisonheal',N_('Poison Heal'),'8n',function(s){return s%8===0}],['lifeorb',N_('Life Orb'),'10n-1',function(s){return s%10===9}],['substitute',N_('Substitute'),'4n+1',function(s){return s%4===1}],['residual',N_('Residual damage'),'16n-1',function(s){return s%16===15}],['sitrus',N_('Sitrus Berry'),'4n',function(s){return s%4===0}],['poison',N_('Poison'),'8n-1',function(s){return s%8===7}],['maxhp',N_('Max HP'),N_('prefer high HP')],['minhp',N_('Min HP'),N_('prefer low HP')]];
function tuneHp(base,hp0,room,sel){var conds=HPOPT.filter(function(r){return r[3]&&sel.indexOf(r[0])>=0}),high=sel.indexOf('maxhp')>=0&&sel.indexOf('minhp')<0,best=null;
 if(base===1)room=0;
 for(var a=0;a<=room;a++){var st=A.hpOf(base,hp0+a),ok=conds.filter(function(r){return r[3](st)});
  if(!best||ok.length>best.ok.length||(ok.length===best.ok.length&&high&&a>best.add))best={add:a,stat:st,ok:ok};}
 return{best:best,conds:conds.length,high:high};}
function spendFree(M,S,free,mode,nat,ctx){
 var S1={hp:S.hp,at:S.at,df:S.df,sa:S.sa,sd:S.sd,sp:S.sp},why=[];
 if(free<=0)return{S:S1,why:why,left:free};
 var bs=DEX[M.name].bs,room=function(k){return M.lock[k]==null?32-S1[k]:0;},left=free;
 if(M.hpOpt&&M.hpOpt.length&&room('hp')>0){var tn=tuneHp(bs.hp,S1.hp,Math.min(left,room('hp')),M.hpOpt),b=tn.best,was=A.hpOf(bs.hp,S1.hp),nm2=b.ok.map(function(r){return tr(r[1])+' ('+r[2]+')'}).join(', ');
  if(b.add>0){S1.hp+=b.add;left-=b.add;why.push(tr('HP +{0} — HP stat {1} → {2}',[b.add,was,b.stat])+(nm2?tr(', fits {0}',[nm2]):'')+(tn.high&&!tn.conds?tr(' (you chose Max HP)'):''));}
  else if(tn.conds&&b.ok.length)why.push(tr('HP stat {0} already fits {1}: no HP points added for it.',[was,nm2]));
  else if(tn.conds)why.push(tr('HP tuning: none of the ticked HP conditions can be reached with the points left (HP stat stays {0}).',[was]));}
 if(mode==='none'||left<=0)return{S:S1,why:why,left:left};
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
  if(bx>S1.sp&&gain>=minShare){var n=bx-S1.sp;S1.sp=bx;left-=n;why.push('Spe +'+n+' — '+tr('you outspeed {0}% of the Pokémon used in tournaments ({1}% more than before); more points would not pass anyone else',[Math.round(best/totW*100),Math.round(gain*100)]));return;}
  if(minShare>0)why.push(tr('Speed: no points added — the points left would not pass at least {0}% more of the tournament Pokémon.',[Math.round(minShare*100)]));};
 if(mode==='smart'){
  if(o)doOff(o,tr(o==='at'?N_('your KO goals use physical attacks ({0}), so every extra point makes them safer'):N_('your KO goals use special attacks ({0}), so every extra point makes them safer'),[names[o].slice(0,2).join(', ')]));
  else why.push(tr('Offense: no points added — you gave no KO goal, so I do not know which attack stat matters. Add a KO goal or choose the Offense mode.'));
  doSpeed(0.10);
  why.push(tr('Bulk: no points added — nothing you asked for needs them. Turn on the tournament meta to spend them on the attacks you are most likely to face.'));
 }else if(mode==='offense'){var os=o||(bs.at>=bs.sa?'at':'sa');doOff(os,o?tr(o==='at'?N_('your KO goals use physical attacks'):N_('your KO goals use special attacks')):tr('your higher base attack stat (you chose the Offense mode)'));}
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
   why.push(pr.join(', ')+' — '+tr(gs.length?N_('you chose the Resistance mode: this split gives the best average HP margin (weighted by priority) against the attacks in your Survive goals'):N_('you chose the Resistance mode: with no Survive goal it keeps physical and special bulk balanced')));}}
 else if(mode==='bulk'){var added={hp:0,df:0,sd:0},sb=function(){var h=A.hpOf(bs.hp,S1.hp),d=A.statOf(bs.df,S1.df,nat,'df'),e=A.statOf(bs.sd,S1.sd,nat,'sd');return Math.min(h*d,h*e);};
  while(left>0){var bk=null,bv=-1;['hp','df','sd'].forEach(function(k){if(room(k)>0){S1[k]++;var v=sb();S1[k]--;if(v>bv){bv=v;bk=k;}}});if(!bk)break;S1[bk]++;left--;added[bk]++;}
  var parts=[];['hp','df','sd'].forEach(function(k){if(added[k])parts.push(NM[k]+' +'+added[k])});
  if(parts.length)why.push(parts.join(', ')+' — '+tr('you chose the Bulk mode: it keeps physical and special bulk balanced'));}
 return{S:S1,why:why,left:left};}
/* ---------- why every point is there ---------- */
function goalTests(M,nat,groups,kos,spds){var T=[];
 groups.forEach(function(G){T.push({meta:!!G.meta,label:tr('Survive {0}',[G.atts.map(function(a){return a.opp.name+' '+a.move}).join(' + ')]),f:function(S){return gp(M,S,nat,G)>=G.thr-1e-9;}});});
 kos.forEach(function(K){T.push({meta:!!K.meta,label:tr('KO with {0} on {1}',[K.move,K.opp.name]),f:function(S){return ko(M,S,nat,K).p>=K.thr-1e-9;}});});
 spds.forEach(function(Sg){T.push({meta:!!Sg.meta,label:tr(Sg.mode==='under'?N_('Slower than {0}'):N_('Faster than {0}'),[Sg.opp.name]),f:function(S){A.mkField(Sg.fo||FOG);var r=A.calc(mkMe(M,S,nat),mkOpp(Sg.opp));return Sg.mode==='under'?r.mySpeed<r.oppSpeed:r.mySpeed>r.oppSpeed;}});});
 return T;}
/* a goal "pins" a stat when it is met with S but fails as soon as that stat loses one point (the others unchanged) */
function pinsOf(M,nat,S,tests){var out={};['hp','at','df','sa','sd','sp'].forEach(function(k){out[k]=[];if(!S[k]||M.lock[k]!=null)return;var T=Object.assign({},S);T[k]--;
 tests.forEach(function(t){if(t.f(S)&&!t.f(T))out[k].push({label:t.label,meta:t.meta});});});return out;}
/* boosts on my own Def / SpD for a Survive goal (undefined when there are none) */
function defBoost(g){var o={};if(+g.db)o.df=+g.db;if(+g.sb)o.sd=+g.sb;return o.df||o.sd?o:undefined;}
function buildGoals(goals){
var groups=[],kos=[],spds=[];
 goals.forEach(function(g,i){
  if(g.t==='surv'){var at={opp:oppCfg(g),move:g.mv,crit:g.crit,hits:+g.hits||0,mbo:defBoost(g),g:g,fo:flatField(g.f)},last=groups[groups.length-1];
   if(g.join&&i>0&&goals[i-1].t==='surv'&&last&&last.atts.length<3)last.atts.push(at);else groups.push({atts:[at],thr:+g.thr,w:+g.w,meta:!!g.meta,ix:i});}
  else if(g.t==='ko')kos.push({ix:i,meta:!!g.meta,g:g,fo:flatField(g.f),opp:oppCfg(g),move:g.mv,crit:g.crit,hits:+g.hits||0,mb:myBoost(g),thr:+g.thr,w:+g.w,pct:+g.pct||100});
  else spds.push({ix:i,g:g,fo:flatField(g.f),opp:oppCfg(g),mode:g.mode,w:+g.w,meta:!!g.meta});});
 return{groups:groups,kos:kos,spds:spds};}
/* report of every goal for a given spread: chance, damage range, minimum points with and without Helping Hand */
function verify(M,S,nat,groups,kos,spds){var rep={goals:[]};
 var me=mkMe(M,S,nat);rep.stats={hp:me.maxHP,at:me.rawStats.at,df:me.rawStats.df,sa:me.rawStats.sa,sd:me.rawStats.sd,sp:me.rawStats.sp};
 groups.forEach(function(G){var L=[],hp=0,desc=[];G.atts.forEach(function(a){var x=sv(M,S,nat,a);x.lists.forEach(function(l){L.push(l)});hp=x.hp;desc.push(x.desc)});
  var p=conv(L,hp,true),mn=0,mx=0;L.forEach(function(r){mn+=r[0];mx+=r[r.length-1]});
  rep.goals.push({ix:G.ix,t:'surv',meta:!!G.meta,ok:p>=G.thr-1e-9,p:p,lo:mn/hp*100,hi:mx/hp*100,label:G.atts.map(function(a){return a.opp.name+' '+a.move}).join(' + '),desc:desc.join(' | '),w:G.w});});
 kos.forEach(function(K){var x=ko(M,S,nat,K),r=x.rolls,okk=x.p>=K.thr-1e-9,o={ix:K.ix,meta:!!K.meta,t:'ko',ok:okk,p:x.p,lo:r[0]/x.full*100,hi:r[r.length-1]/x.full*100,label:tr('{0} on {1}',[K.move,K.opp.name]),desc:x.desc,w:K.w,pts:K.meta?null:koPts(M,K,nat)};
  if(!okk&&!K.fo.helpingHandL){var xh=ko(M,S,nat,Object.assign({},K,{hh:true})),rh=xh.rolls;o.hh={ok:xh.p>=K.thr-1e-9,p:xh.p,lo:rh[0]/xh.full*100,hi:rh[rh.length-1]/xh.full*100};}
  rep.goals.push(o);});
 spds.forEach(function(Sg){A.mkField(Sg.fo||FOG);var r=A.calc(mkMe(M,S,nat),mkOpp(Sg.opp)),okk=Sg.mode==='under'?r.mySpeed<r.oppSpeed:r.mySpeed>r.oppSpeed;rep.goals.push({ix:Sg.ix,t:'spd',meta:!!Sg.meta,ok:okk,my:r.mySpeed,opp:r.oppSpeed,label:tr(Sg.mode==='under'?N_('Slower than {0}'):N_('Faster than {0}'),[Sg.opp.name]),w:Sg.w});});
 rep.goals.sort(function(a,b){return a.ix-b.ix});return rep;}
/* check a spread you already have (no optimization) */
function checkSpread(M,goals,S,nat){FOG={};A.mkField(FOG);var bg=buildGoals(goals),vf=verify(M,S,nat,bg.groups,bg.kos,bg.spds),sum=0;['hp','at','df','sa','sd','sp'].forEach(function(k){sum+=S[k]});
 return{check:true,S:S,S1:S,left:0,why:[],effort:[],base:S,pins:{},nat:nat,free:66-sum,alts:[],top:{tot:sum},goals:vf.goals,stats:vf.stats};}
/* ---------- exhaustive optimizer ---------- */
/* Every spread (each stat <= 32, total <= LIMIT) is judged by a score compared lexicographically (see AGENTS.md):
   1. goals met, in the order of the goal list;  2. ("Perfect spread" only) the ticked HP Optimizations in their order (Recovery...);
   3. ("Perfect spread" only) the margins of all goals together, worst first (leximin: lift the weakest margin, then the next one...): every goal weighs the same;
   4. ("Perfect spread" only) the stat the nature raises ends on a "bump" (the last point gave +2) or at 0;  5. Max / Min HP;  6. fewer points.
   Damage depends on few stats, so the search is split in two blocks that are exact together: defence (HP, Def, SpD; Atk too for Foul Play)
   and offence (Atk, SpA, Spe). For every point cost the best score of each block is kept and every pair of costs is merged.
   A score is {f: coordinates that add up between blocks, g: margin elements}; leximin ignores which block an element comes from. */
var EPS=1e-12;
function numAsc(a,b){return a-b;}
function zeroV(n){var v=new Array(n);for(var i=0;i<n;i++)v[i]=0;return v;}
function newP(V){return{f:zeroV(V),g:[]};}
function copyP(a){return{f:a.f.slice(),g:a.g.slice()};}
function mergeP(a,b){var f=new Float64Array(a.f.length),i;for(i=0;i<f.length;i++)f[i]=a.f[i]+b.f[i];var g=new Float64Array(a.g.length+b.g.length);g.set(a.g);g.set(b.g,a.g.length);g.sort();return{f:f,g:g};}
function freezeP(c){c.f=Float64Array.from(c.f);c.g=Float64Array.from(c.g).sort();return c;}
/* compare the coordinates that rank before the margins */
function cmpF(a,b,NF){for(var i=0;i<NF;i++){var d=a[i]-b[i];if(d>EPS)return 1;if(d<-EPS)return -1;}return 0;}
/* NF = coordinates that rank before the margins */
function cmpP(a,b,NF){var i,d;
 for(i=0;i<NF;i++){d=a.f[i]-b.f[i];if(d>EPS)return 1;if(d<-EPS)return -1;}
 for(i=0;i<a.g.length;i++){d=a.g[i]-b.g[i];if(d>EPS)return 1;if(d<-EPS)return -1;}
 for(i=NF;i<a.f.length;i++){d=a.f[i]-b.f[i];if(d>EPS)return 1;if(d<-EPS)return -1;}
 return 0;}
/* margins are compared in whole percent of HP (rounded against the Pokémon), so equal-looking spreads tie and HP Optimizations can decide between them */
function pct(x){return Math.ceil(x*100-1e-9);}
/* sorted distribution of the summed damage of several attacks (every roll combination equally likely) */
function distOf(lists){var m=new Map([[0,1]]);lists.forEach(function(L){var n=new Map();m.forEach(function(c,v){L.forEach(function(x){n.set(v+x,(n.get(v+x)||0)+c)})});m=n});
 var v=Array.from(m.keys()).sort(numAsc),c=[],t=0;v.forEach(function(k){t+=m.get(k);c.push(t)});return{v:v,c:c,N:t,max:v[v.length-1]};}
/* chance that the summed damage is below hp */
function pBelow(D,hp){var lo=0,hi=D.v.length;while(lo<hi){var m=(lo+hi)>>1;if(D.v[m]<hp)lo=m+1;else hi=m;}return lo?D.c[lo-1]/D.N:0;}
/* a point on a stat is "well spent" when the last one bought +2 (the nature's rounding), or when none was bought */
function isBump(b,k,nat,x){return !x||A.statOf(b,x,nat,k)-A.statOf(b,x-1,nat,k)===2;}
/* HP Optimizations as score coordinates: one 0/1 per ticked condition (in the list's order), then Max HP / Min HP */
function hpCoords(M){var sel=M.hpOpt||[],conds=HPOPT.filter(function(r){return r[3]&&sel.indexOf(r[0])>=0}),high=sel.indexOf('maxhp')>=0,low=sel.indexOf('minhp')>=0;
 return{conds:conds,n:conds.length+1,of:function(stat){var o=conds.map(function(r){return r[3](stat)?1:0});o.push(high&&!low?stat:(low&&!high?-stat:0));return o;}};}
async function solve(M,goals,fo,say,opts){
 FOG=fo||{};A.mkField(FOG);var LIMIT=(opts&&opts.limit)||66,perfect=((opts&&opts.mode)||M.pm)==='perfect';
 var bg=buildGoals(goals),groups=bg.groups,kos=bg.kos,spds=bg.spds;
 groups.forEach(function(G){G.fp=G.atts.some(function(a){return a.move==='Foul Play'});G.dep=depOf(M,G);});
 var fpG=groups.filter(function(G){return G.fp});
 kos.forEach(function(K){K.key=koDep(M,K);});
 var items=[];groups.forEach(function(G){items.push({t:'g',o:G,ix:G.ix})});kos.forEach(function(K){items.push({t:'k',o:K,ix:K.ix})});spds.forEach(function(S){items.push({t:'s',o:S,ix:S.ix})});
 items.sort(function(a,b){return a.ix-b.ix});items.forEach(function(it,j){it.j=j});
 var N=items.length,hc=hpCoords(M),NC=hc.n-1,NF=N+NC,bOff=NF,pOff=bOff+1,V=pOff+1,bs=DEX[M.name].bs;
 /* f layout: goals met [0,N), HP conditions [N,N+NC), stat-bump bonus, Max/Min HP preference. g: two margin elements per Survive / KO goal that is met (100 when it is not) */
 var setItem=function(c,j,sat,p,m){c.f[j]=sat?1:0;if(perfect&&items[j].t!=='s'){c.g.push(sat?p*100:100,sat?m:100);}};
 var natList=M.nature==='*'?NATS:[M.nature],results=[],dAll={},oAll={};
 var rg=function(v){return v==null?Array.from({length:33},function(_,i){return i}):[v]},HR=rg(M.lock.hp),DR=rg(M.lock.df),SR=rg(M.lock.sd),AR0=rg(M.lock.at),CR=rg(M.lock.sa),PR=rg(M.lock.sp);
 for(var ni=0;ni<natList.length;ni++){
  var n=natList[ni];say(tr('Trying nature {0} ({1}/{2})…',[n,ni+1,natList.length]));await tick();
  var th=function(x){return x.thr-1e-9};
  /* offence block: Atk / SpA / Spe contributions of the KO and Speed goals */
  var base0=newP(V),cA=[],cC=[],cP=[],cD=[],i0;for(i0=0;i0<=32;i0++){cA.push(newP(V));cC.push(newP(V));cP.push(newP(V));cD.push(newP(V));}
  items.forEach(function(it){var j=it.j,K=it.o;
   if(it.t==='k'){var tgt=K.key==='at'?cA:K.key==='sa'?cC:K.key==='sp'?cP:K.key==='df'?cD:null;
    var put=function(c,x){var r=ko(M,x,n,K);setItem(c,j,r.p>=th(K),r.p,Math.min(100,Math.floor(r.rolls[0]/r.hp*100+1e-9)));};
    if(!tgt)put(base0,{});else for(var x=0;x<=32;x++)put(tgt[x],K.key==='at'?{at:x}:K.key==='sa'?{sa:x}:K.key==='sp'?{sp:x}:{df:x});}
   else if(it.t==='s'){var ok=spdOk(M,K,n);for(var x2=0;x2<=32;x2++)setItem(cP[x2],j,ok[x2],0,0);}});
  /* the stat the nature raises: a point is well spent when the last one bought gave +2 (or when none was bought) */
  var nmod=NATURES[n]||['',''],bk=nmod[0]&&nmod[0]!==nmod[1]&&nmod[0]!=='hp'?nmod[0]:null;
  var bumpAt=function(x){return isBump(bs[bk],bk,n,x)?1:0;};
  if(perfect&&bk){var tb=bk==='at'?cA:bk==='sa'?cC:bk==='sp'?cP:null;if(tb)for(var xb=0;xb<=32;xb++)tb[xb].f[bOff]+=bumpAt(xb);}
  [cA,cC,cP,cD].forEach(function(T){T.forEach(freezeP);});freezeP(base0);
  var hv=[];for(var h0=0;h0<=32;h0++)hv.push(perfect?hc.of(A.hpOf(bs.hp,h0)):null);
  var bestN=null;
  var runFor=function(aFix){
   var AR=aFix==null?AR0:[aFix];
   fpG.forEach(function(G){G.myAt=aFix;});
   /* defence block */
   var dcache=groups.map(function(){return new Map()});
   var distFor=function(gi,d,s){var G=groups[gi],key=G.dep==='h'?0:G.dep==='d'?d:G.dep==='s'?s:d*64+s,m=dcache[gi],D=m.get(key);
    if(!D){var L=[];G.atts.forEach(function(a){sv(M,{df:d,sd:s,at:aFix==null?0:aFix},n,a).lists.forEach(function(l){L.push(l)})});D=distOf(L);m.set(key,D);}return D;};
   /* the blocks only see the nature through the multipliers of the stats they use: natures with the same effect share one result (not with Foul Play, which uses my Atk) */
   var nmn=nm(n),cl=function(k){return cls(nmn[k])},dKey=fpG.length?null:cl('df')+cl('sd')+(bk==='df'||bk==='sd'?bk:'-'),oKey=fpG.length?null:cl('at')+cl('sa')+cl('sp')+(bk==='at'||bk==='sa'||bk==='sp'?bk:'-');
   var bestD=dKey?dAll[dKey]:null,q;
   if(!bestD){bestD=[];for(q=0;q<=LIMIT;q++)bestD.push(null);
   var gItems=items.filter(function(it){return it.t==='g'});
   var mS=function(b,sp,k){return Math.floor((Math.floor((2*b+31)/2)+5+sp)*nmn[k])},dfS=[],sdS=[],xs;for(xs=0;xs<=32;xs++){dfS.push(mS(bs.df,xs,'df'));sdS.push(mS(bs.sd,xs,'sd'));}
   var GD=cD[0].g.length+2*gItems.length*(perfect?1:0),fb=new Float64Array(V),gb=new Float64Array(GD);
   for(var hi=0;hi<HR.length;hi++)for(var di=0;di<DR.length;di++){var d=DR[di],h=HR[hi];if(h+d>LIMIT)continue;
    for(var si=0;si<SR.length;si++){var s=SR[si],cost=h+d+s;if(cost>LIMIT)continue;
     var hs=A.hpOf(bs.hp,h),cdd=cD[d],mnv=cdd.g.length?cdd.g[0]:1e9;fb.set(cdd.f);var k=0,z;
     if(perfect){for(;k<cdd.g.length;k++)gb[k]=cdd.g[k];if(bk==='df')fb[bOff]+=bumpAt(d);else if(bk==='sd')fb[bOff]+=bumpAt(s);var hh=hv[h];for(z=0;z<hh.length;z++)fb[z<NC?N+z:pOff]+=hh[z];}
     for(var g=0;g<gItems.length;g++){var it=gItems[g],G=it.o,D=distFor(groups.indexOf(G),d,s),p=pBelow(D,hs),sat=p>=th(G);fb[it.j]=sat?1:0;if(perfect){var e1=sat?p*100:100,e2=sat?100-pct(D.max/hs):100;gb[k++]=e1;gb[k++]=e2;if(e1<mnv)mnv=e1;if(e2<mnv)mnv=e2;}}
     var b=bestD[cost],c0=b?cmpF(fb,b.v.f,NF):1;if(c0<0)continue;
     if(perfect){if(c0===0&&mnv<b.v.g[0]-EPS)continue;gb.sort();}
     var bkv=hs*dfS[d]*sdS[s],cm=c0>0?1:cmpP({f:fb,g:gb},b.v,NF);
     if(cm>0||(cm===0&&bkv>b.bk))bestD[cost]={v:{f:fb.slice(),g:gb.slice()},h:h,d:d,s:s,bk:bkv};}}
   if(dKey)dAll[dKey]=bestD;}
   /* offence block */
   var bestO=oKey?oAll[oKey]:null;
   if(!bestO){bestO=[];for(q=0;q<=LIMIT;q++)bestO.push(null);
   var GO=base0.g.length+cA[0].g.length+cC[0].g.length+cP[0].g.length,fo=new Float64Array(V),go=new Float64Array(GO);
   for(var ai=0;ai<AR.length;ai++)for(var ci=0;ci<CR.length;ci++){var a=AR[ai],c=CR[ci];if(a+c>LIMIT)continue;
    var ac=mergeP(base0,mergeP(cA[a],cC[c]));
    for(var pi=0;pi<PR.length;pi++){var sp=PR[pi],cost2=a+c+sp;if(cost2>LIMIT)continue;
     var cpp=cP[sp],x;for(x=0;x<V;x++)fo[x]=ac.f[x]+cpp.f[x];go.set(ac.g);go.set(cpp.g,ac.g.length);go.sort();
     var b2=bestO[cost2];if(!b2||cmpP({f:fo,g:go},b2.v,NF)>0)bestO[cost2]={v:{f:fo.slice(),g:go.slice()},a:a,c:c,sp:sp};}}
   if(oKey)oAll[oKey]=bestO;}
   for(var c1=0;c1<=LIMIT;c1++){var bd=bestD[c1];if(!bd)continue;
    for(var c2=0;c2<=LIMIT-c1;c2++){var bo=bestO[c2];if(!bo)continue;
     var vv=mergeP(bd.v,bo.v),tot=c1+c2,cm2=bestN?cmpP(vv,bestN.v,NF):1;
     if(cm2>0||(cm2===0&&(tot<bestN.tot||(tot===bestN.tot&&bd.bk>bestN.bk))))bestN={v:vv,tot:tot,bk:bd.bk,n:n,h:bd.h,d:bd.d,sd:bd.s,a:bo.a,c:bo.c,sp:bo.sp};}}
  };
  if(!fpG.length)runFor(null);
  else AR0.forEach(function(a0){runFor(a0);}); /* Foul Play hits with the Atk of the target: the defence block depends on the Atk chosen */
  if(bestN)results.push(bestN);
 }
 fpG.forEach(function(G){G.myAt=null;});
 results.sort(function(x,y){return cmpP(y.v,x.v,NF)||x.tot-y.tot});
 var B=results[0];if(!B)return null;
 var sigOf=function(r){return r.v.f.slice(0,N).join('')};B.sig=sigOf(B);B.C=B.v.f.slice(0,N).reduce(function(t,x){return t+x},0);
 var S={hp:B.h,at:B.a,df:B.d,sa:B.c,sd:B.sd,sp:B.sp},free=66-(S.hp+S.at+S.df+S.sa+S.sd+S.sp),effort=[];
 var Sbase=Object.assign({},S),pins=pinsOf(M,B.n,Sbase,goalTests(M,B.n,groups,kos,spds));
 /* "Minimum points" with a goal out of reach: put the free points toward the closest ones, in the order of the list */
 if(!perfect)(function(){var its=[];
  items.forEach(function(it){if(it.o.meta)return;
   if(it.t==='g'&&gp(M,S,B.n,it.o)<it.o.thr-1e-9)its.push(it);
   else if(it.t==='k'&&ko(M,S,B.n,it.o).p<it.o.thr-1e-9)its.push(it);
   else if(it.t==='s'){A.mkField(it.o.fo||FOG);var r0=A.calc(mkMe(M,S,B.n),mkOpp(it.o.opp));if(!(it.o.mode==='under'?r0.mySpeed<r0.oppSpeed:r0.mySpeed>r0.oppSpeed))its.push(it);}});
  its.forEach(function(it){if(free<=0)return;
   if(it.t==='k'){var k=it.o.key;if((k==='at'||k==='sa'||k==='df')&&M.lock[k]==null&&S[k]<32){var ad=Math.min(free,32-S[k]);S[k]+=ad;free-=ad;effort.push({k:k,n:ad,label:tr('{0} on {1}',[it.o.move,it.o.opp.name])});}}
   else if(it.t==='s'){if(it.o.mode==='over'&&M.lock.sp==null&&S.sp<32){var ad2=Math.min(free,32-S.sp);S.sp+=ad2;free-=ad2;effort.push({k:'sp',n:ad2,label:tr('Faster than {0}',[it.o.opp.name])});}}
   else{var G=it.o,dep=G.dep,ks=['hp'].concat(dep==='d'||dep==='ds'?['df']:[]).concat(dep==='s'||dep==='ds'?['sd']:[]),added={};
    var frac=function(){var tot=0,hp=1;G.atts.forEach(function(a){var x=sv(M,S,B.n,a);hp=x.hp;tot+=x.rolls[x.rolls.length-1];});return tot/hp;};
    while(free>0){var bk=null,bf=9e9;ks.forEach(function(k){if(M.lock[k]==null&&S[k]<32){S[k]++;var f=frac();S[k]--;if(f<bf){bf=f;bk=k;}}});if(!bk)break;S[bk]++;free--;added[bk]=(added[bk]||0)+1;}
    Object.keys(added).forEach(function(k){effort.push({k:k,n:added[k],label:tr('Survive {0}',[G.atts.map(function(a){return a.opp.name+' '+a.move}).join(' + ')])});});}});})();
 var sf=spendFree(M,S,free,M.fm||'smart',B.n,{kos:kos,groups:groups}),S1=sf.S;
 if(fpG.length&&S1.at>S.at&&fpG.some(function(G){return gp(M,S,B.n,G)>=G.thr-1e-9&&gp(M,S1,B.n,G)<G.thr-1e-9;})){sf.left+=S1.at-S.at;S1.at=S.at;sf.why.push(tr('Atk kept at {0}: more Atk would make Foul Play hit harder than your Survive goal allows.',[S.at]));}
 /* "Perfect spread": leftover points never leave the stat the nature raises one point short of a bump (7 SpA -> 5 when the 6th and 7th bought +1 each) */
 var bkF=(function(){var m=NATURES[B.n]||['',''];return m[0]&&m[0]!==m[1]&&m[0]!=='hp'?m[0]:null;})();
 if(perfect&&bkF&&S1[bkF]>S[bkF]&&!isBump(bs[bkF],bkF,B.n,S1[bkF])){var y=S1[bkF]-1;while(y>S[bkF]&&!isBump(bs[bkF],bkF,B.n,y))y--;
  if(y>=S[bkF]&&isBump(bs[bkF],bkF,B.n,y)){sf.left+=S1[bkF]-y;sf.why.push(tr('{0} kept at {1}: the next points would not raise the stat by 2 (the nature’s bump), so they stay free.',[NM[bkF],y]));S1[bkF]=y;}}
 var rep={S:S,S1:S1,left:sf.left,why:sf.why,effort:effort,base:Sbase,pins:pins,nat:B.n,free:free,mode:perfect?'perfect':'min',
  alts:results.slice(1,4).map(function(r){r.sig=sigOf(r);return{n:r.n,sig:r.sig,tot:r.tot,same:perfect?cmpP(r.v,B.v,NF)===0:r.sig===B.sig}}),top:B,goals:[]};
 var vf=verify(M,S,B.n,groups,kos,spds);rep.stats=vf.stats;rep.goals=vf.goals;
 return rep;}

/* ---------- UI ---------- */
/* lab = optional function giving the visible text of a value (the value itself is never translated) */
function opts(arr,sel,blank,lab){return (blank!==undefined?'<option value="">'+blank+'</option>':'')+arr.map(function(x){return '<option value="'+esc(x)+'"'+(x===sel?' selected':'')+'>'+esc(lab?lab(x):x)+'</option>'}).join('');}
var STA=[N_('Asleep'),N_('Badly Poisoned'),N_('Burned'),N_('Frozen'),N_('Healthy'),N_('Paralyzed'),N_('Poisoned')];
$i('mAb').innerHTML=opts(ABL,'');
var WE=[['auto',N_('Auto (from abilities)')],['',N_('None')],['Sun',N_('Sun')],['Rain',N_('Rain')],['Sand',N_('Sandstorm')],['Snow',N_('Snow')]],TE=[['auto',N_('Auto (from abilities)')],['',N_('None')],['Electric',N_('Electric')],['Grassy',N_('Grassy')],['Misty',N_('Misty')],['Psychic',N_('Psychic')]];
/* selects of section 1 and 3 whose texts depend on the language: rebuilt keeping the chosen value */
function fillSelects(){var keep=function(id,html){var el=$i(id),v=el.value;el.innerHTML=html;if(v!=='')el.value=v;},pair=function(a){return a.map(function(x){return '<option value="'+x[0]+'">'+esc(tr(x[1]))+'</option>'}).join('');};
 keep('mIt',opts(ITL,$i('mIt').value,tr('(no item)')));keep('mSt',opts(STA,$i('mSt').value||'Healthy',undefined,tr));
 keep('mNa','<option value="*">'+esc(tr('Auto: try every nature'))+'</option>'+NAT.map(function(n){return '<option value="'+n+'">'+natLab(n)+'</option>'}).join(''));
 keep('tmWe',pair(WE));keep('tmTe',pair(TE));}
fillSelects();
var CK=[['tailwind',N_('Tailwind')],['reflect',N_('Reflect')],['lightScreen',N_('Light Screen')],['auroraVeil',N_('Aurora Veil')],['helpingHand',N_('Helping Hand')],['friendGuard',N_('Friend Guard')]];
/* autocomplete fatto a mano (le liste del browser danno problemi con le tastiere dei telefoni) */
var acBox=document.createElement('div');acBox.id='acbox';acBox.hidden=true;acBox.setAttribute('role','listbox');acBox.setAttribute('aria-label',tr('Suggestions'));document.body.appendChild(acBox);var acIn=null,acAct=-1;
var acLive=document.createElement('div');acLive.className='sr';acLive.setAttribute('aria-live','polite');document.body.appendChild(acLive);
var STONES=Object.keys(LOCK_ITEM_LOOKUP).map(function(k){return LOCK_ITEM_LOOKUP[k]}).filter(function(x,i,a){return a.indexOf(x)===i&&ITL.indexOf(x)<0});
function learnSet(sp){var l=LEARNSETS[sp];if(!l)return null;var o={};l.forEach(function(i){o[MOVE_NAMES[i]]=1});return o;}
function acHide(){acBox.hidden=true;acAct=-1;if(acIn){acIn.setAttribute('aria-expanded','false');acIn.removeAttribute('aria-activedescendant');}}
function acPick(v){var inp=acIn;if(!inp)return;inp.value=v;acHide();inp.dispatchEvent(new Event('change',{bubbles:true}));}
function acMark(n){var items=acBox.children;if(!items.length)return;acAct=(n+items.length)%items.length;for(var i=0;i<items.length;i++){items[i].classList.toggle('act',i===acAct);items[i].setAttribute('aria-selected',i===acAct?'true':'false');}
 acIn.setAttribute('aria-activedescendant',items[acAct].id);if(items[acAct].scrollIntoView)items[acAct].scrollIntoView({block:'nearest'});}
/* force = open the list even when nothing is typed (arrow down) */
function acShow(inp,force){acIn=inp;var q=inp.value.trim().toLowerCase(),items=[];
 inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');inp.setAttribute('aria-haspopup','listbox');inp.setAttribute('aria-controls','acbox');
 if(inp.dataset.ac==='mon'){SPECIES.forEach(function(x){if(x.toLowerCase().indexOf(q)>=0)items.push({n:x,note:TDATA[x]?tr('{0}% usage',[TDATA[x].u]):'',r:TDATA[x]?TDATA[x].r:9999})});}
 else if(inp.dataset.ac==='item'){ITL.concat(STONES).forEach(function(x){if(x.toLowerCase().indexOf(q)>=0)items.push({n:x});});}
 else if(inp.dataset.ac==='tmove'){var tl=learnSet(inp.dataset.sp);Object.keys(MV).forEach(function(x){if(x.toLowerCase().indexOf(q)>=0)items.push({n:x,note:tr(MV[x].type),no:!!tl&&!tl[x]});});}
 else{var sp=inp.dataset.ms==='me'?$i('mSp').value.trim():((goals[inp.dataset.i]||{}).sp),ls=learnSet(sp);
  MOVEL.forEach(function(x){if(x.toLowerCase().indexOf(q)>=0)items.push({n:x,no:!!ls&&!ls[x]});});}
 items.sort(function(a,b){return (a.no?1:0)-(b.no?1:0)||((a.n.toLowerCase().indexOf(q)===0?0:1)-(b.n.toLowerCase().indexOf(q)===0?0:1))||(q?0:(a.r||0)-(b.r||0))||a.n.localeCompare(b.n)});
 items=items.slice(0,8);
 if((!q&&!force)||!items.length||(items.length===1&&items[0].n.toLowerCase()===q)){acHide();return;}
 var isMon=inp.dataset.ac==='mon';acBox.innerHTML=items.map(function(x,ix){return '<div class="aci" role="option" aria-selected="false" id="aco-'+ix+'" data-v="'+esc(x.n)+'">'+(isMon?'<span class="av xs" data-ini="'+esc(x.n[0])+'">'+spriteImg(x.n,'small','')+'</span>':'')+'<span class="aci-t">'+esc(x.n)+(x.note?' <span class="mu">· '+x.note+'</span>':'')+(x.no?' <span class="mu">('+tr('can’t learn it')+')</span>':'')+'</span>'+(isMon?'<span class="tys">'+typeChips(x.n)+'</span>':'')+'</div>'}).join('');
 var r=inp.getBoundingClientRect();acBox.style.left=(r.left+window.pageXOffset)+'px';acBox.style.top=(r.bottom+window.pageYOffset+2)+'px';acBox.style.width=r.width+'px';acBox.hidden=false;acAct=-1;inp.setAttribute('aria-expanded','true');acLive.textContent=tr('{0} suggestions: use the arrow keys and Enter',[items.length]);}
document.addEventListener('input',function(e){if(e.target.classList&&e.target.classList.contains('ac'))acShow(e.target);});
document.addEventListener('focusout',function(e){if(e.target===acIn)setTimeout(acHide,200);});
document.addEventListener('keydown',function(e){var t=e.target;if(!t.classList||!t.classList.contains('ac'))return;var open=!acBox.hidden&&acIn===t,k=e.key;
 if(k==='ArrowDown'){e.preventDefault();if(!open){acShow(t,true);if(!acBox.hidden)acMark(0);}else acMark(acAct+1);}
 else if(k==='ArrowUp'&&open){e.preventDefault();acMark(acAct<=0?-1:acAct-1);}
 else if(k==='Enter'&&open&&acAct>=0){e.preventDefault();acPick(acBox.children[acAct].dataset.v);}
 else if(k==='Escape'&&open){e.preventDefault();e.stopPropagation();acHide();}
 else if(k==='Tab'&&open){acHide();}});
acBox.addEventListener('pointerdown',function(e){var t=e.target.closest('.aci');if(!t||!acIn)return;e.preventDefault();var inp=acIn;acPick(t.dataset.v);if(inp.blur)inp.blur();});
/* every visible label names the field that follows it (goal cards are generated, so this runs after each draw) */
function a11yLabels(){document.querySelectorAll('[data-al]').forEach(function(n){n.removeAttribute('aria-label');n.removeAttribute('data-al');});
 document.querySelectorAll('label:not(.ck)').forEach(function(l){var n=l.nextElementSibling;if(!n||!/^(INPUT|SELECT|TEXTAREA)$/.test(n.tagName)||l.htmlFor||n.getAttribute('aria-label'))return;if(n.id)l.htmlFor=n.id;else{n.setAttribute('aria-label',l.textContent.trim());n.dataset.al=1;}});
 document.querySelectorAll('input:not([aria-label]):not([type=checkbox]),select:not([aria-label]),textarea:not([aria-label])').forEach(function(n){if(!n.id||!document.querySelector('label[for="'+n.id+'"]')){n.setAttribute('aria-label',n.placeholder||n.id||tr('field'));n.dataset.al=1;}});
 document.querySelectorAll('.ac:not([aria-label])').forEach(function(i){{i.setAttribute('aria-label',i.placeholder||tr('Pokémon or move'));i.dataset.al=1;}});
 document.querySelectorAll('.x[data-del]').forEach(function(b){b.setAttribute('aria-label',tr('Remove goal {0}',[+b.dataset.del+1]));});}
function abOpts(sp,sel,blank){var pre=blank?'<option value=""'+(sel===''?' selected':'')+'>'+tr('(not known)')+'</option>':'';return pre+abOpts0(sp,sel);}
function abOpts0(sp,sel){var d=DEX[sp],own=d?d.abs.slice().sort():[],rest=ABL.filter(function(x){return own.indexOf(x)<0}),o=function(a){return a.map(function(x){return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'}).join('')};return own.length?o(own)+'<optgroup label="'+esc(tr('Other abilities'))+'">'+o(rest)+'</optgroup>':o(ABL);}
function itemLocked(sp){return !!LOCK_ITEM_LOOKUP[sp];}
/* abilities whose effect needs a situation you must say is true (the engine applies the boost only when it is switched on) */
var SIT={Blaze:N_('Its HP is at 1/3 or less (Fire moves ×1.5)'),Torrent:N_('Its HP is at 1/3 or less (Water moves ×1.5)'),Overgrow:N_('Its HP is at 1/3 or less (Grass moves ×1.5)'),Swarm:N_('Its HP is at 1/3 or less (Bug moves ×1.5)'),'Flash Fire':N_('It already absorbed a Fire move (Fire moves ×1.5)'),Stakeout:N_('The target just switched in (attack ×2)'),Electromorphosis:N_('It is charged: it was hit since its last move (Electric moves ×2)'),'Supreme Overlord':N_('Allies that fainted (power +10% each, up to 5)')};
function sitBlock(ab,on,fainted,at){if(!SIT[ab])return '';
 if(ab==='Supreme Overlord')return '<div class="sit"><label>'+esc(tr(SIT[ab]))+'</label><select '+at.fa+'>'+[0,1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+(+fainted===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select></div>';
 return '<div class="sit"><label class="ck"><input type="checkbox" '+at.on+(on?' checked':'')+'> '+esc(tr(SIT[ab]))+'</label></div>';}
var mySit={on:false,fa:0};
function defAb(sp){var m=META_BY[sp],a=m?metaSet(m).ab:'';return a||DEX[sp].ab;}
var lastMe='';
function drawMySit(){$i('mSit').innerHTML=sitBlock($i('mAb').value,mySit.on,mySit.fa,{on:'id="mAbOn"',fa:'id="mFaint"'});}
$i('mSp').onchange=function(){var d=DEX[this.value];if(!d)return;$i('mAb').innerHTML=abOpts(this.value,defAb(this.value));mySit.on=false;drawMySit();$i('mIt').disabled=itemLocked(this.value);
 if(this.value!==lastMe){lastMe=this.value;$i('mIt').value='';$i('mNa').value='*';$i('mSt').value='Healthy';['hp','at','df','sa','sd','sp'].forEach(function(k){$i('lk_'+k).value='';});}};
var BO=[['6','+6'],['5','+5'],['4','+4'],['3','+3'],['2','+2'],['1','+1'],['0','0'],['-1','−1'],['-2','−2'],['-3','−3'],['-4','−4'],['-5','−5'],['-6','−6']],goals=[];
var THR=[];for(var q=16;q>=1;q--)THR.push([String(q/16),q===16?N_('100% (always)'):(q*6.25)+'%']);
function newGoal(t){return{f:{weather:'auto',terrain:'auto'},note:'',t:t,sp:'',ab:'',it:'',na:'Hardy',st:'Healthy',mv:'',spA:32,hp:0,df:0,sd:0,spe:t==='spd'?32:0,bo:0,mbo:0,thr:'1',w:'10',join:false,mode:'over',pct:100,set:'',crit:false,hits:0,db:0,sb:0,abOn:false,fainted:0};}
function sel(i,k,arr,cur){return '<select data-i="'+i+'" data-k="'+k+'">'+arr.map(function(x){return '<option value="'+x[0]+'"'+(String(x[0])===String(cur)?' selected':'')+'>'+esc(tr(x[1]))+'</option>'}).join('')+'</select>';}
function num(i,k,v,mx){return '<input type="number" min="0" max="'+(mx||32)+'" data-i="'+i+'" data-k="'+k+'" value="'+v+'">';}
function moveExtras(g,i){var h='<label class="ck"><input type="checkbox" data-i="'+i+'" data-k="crit"'+(g.crit?' checked':'')+'> '+tr('Critical hit')+'</label>',m=MV[g.mv];
 if(m&&m.hitRange&&m.hitRange.length===2)h+='<label>'+tr('Number of hits')+'</label>'+sel(i,'hits',[['0',N_('Default (3)')],['2','2'],['3','3'],['4','4'],['5','5']],g.hits);return h;}
function newField(){return{weather:'auto',terrain:'auto'};}
function flatField(f){f=f||newField();var o={weather:f.weather===undefined?'auto':f.weather,terrain:f.terrain===undefined?'auto':f.terrain};Object.keys(f).forEach(function(k){if(k!=='weather'&&k!=='terrain'&&f[k])o[k]=1;});return o;}
function fieldSummary(f){f=f||newField();var p=[],lab=function(arr,v){var r=arr.filter(function(x){return x[0]===v})[0];return r?tr(r[1]):v;};
 if(f.weather!=='auto')p.push(lab(WE,f.weather));if(f.terrain!=='auto')p.push(lab(TE,f.terrain));
 CK.forEach(function(c){['L','R'].forEach(function(sd){if(f[c[0]+sd])p.push((sd==='L'?tr('you: '):tr('foe: '))+tr(c[1]));});});
 return p.length?' · '+p.join(', '):' · '+tr('automatic');}
function fieldBlock(g,i){var f=g.f||(g.f=newField());
 var dd=function(k,arr){return '<select data-i="'+i+'" data-k="f.'+k+'">'+arr.map(function(x){return '<option value="'+x[0]+'"'+(String(x[0])===String(f[k])?' selected':'')+'>'+esc(tr(x[1]))+'</option>'}).join('')+'</select>';};
 var ck=function(sd){return CK.map(function(c){return '<label class="ck"><input type="checkbox" data-i="'+i+'" data-k="f.'+c[0]+sd+'"'+(f[c[0]+sd]?' checked':'')+'> '+tr(c[1])+'</label>'}).join('');};
 return '<details class="fld" data-i="'+i+'"'+(g.fOpen?' open':'')+'><summary>'+tr('Field, Weather &amp; Multiplicator')+esc(fieldSummary(f))+'</summary><div class="g2"><div><label>'+tr('Weather')+'</label>'+dd('weather',WE)+'</div><div><label>'+tr('Terrain')+'</label>'+dd('terrain',TE)+'</div></div><div class="g2"><div><label><b>'+tr('Your side')+'</b></label>'+ck('L')+'</div><div><label><b>'+tr('Opponent’s side')+'</b></label>'+ck('R')+'</div></div></details>';}
function oppHead(g,i){var d=DEX[g.sp],c1=d?TYC[d.t1]:'#8aa',c2=d?TYC[d.t2||d.t1]:'#8aa';
 return '<div class="opp" style="--c1:'+c1+';--c2:'+c2+'"><span class="av lg" data-ini="'+esc((g.sp||'?')[0])+'">'+(d?spriteImg(g.sp,'big',''):'')+'</span><div class="opp-in"><input class="ac" data-ac="mon" autocomplete="off" autocapitalize="off" spellcheck="false" data-i="'+i+'" data-k="sp" value="'+esc(g.sp)+'" placeholder="'+esc(tr('Opponent Pokémon'))+'"><div class="tys">'+typeChips(g.sp)+'</div></div></div>';}
function card(g,i){var T={surv:'🛡️ '+tr('Survive'),ko:'⚔️ '+tr('Get a KO on'),spd:'💨 '+tr('Speed vs')}[g.t];
 var h='<div class="gc t-'+g.t+'" data-card="'+i+'"><div class="gh"><b><span class="ord" title="'+esc(tr('Priority: the first goal counts most'))+'">#'+(i+1)+'</span> '+T+'</b><span class="gb"><span class="mv" draggable="true" data-drag="'+i+'" title="'+esc(tr('Drag to change the priority'))+'" aria-hidden="true">⠿</span><button class="x" data-up="'+i+'"'+(i===0?' disabled':'')+' aria-label="'+esc(tr('Move up (higher priority)'))+'" title="'+esc(tr('Move up (higher priority)'))+'">↑</button><button class="x" data-dn="'+i+'"'+(i===goals.length-1?' disabled':'')+' aria-label="'+esc(tr('Move down (lower priority)'))+'" title="'+esc(tr('Move down (lower priority)'))+'">↓</button><button class="x" data-del="'+i+'">✕</button></span></div>';
 h+=oppHead(g,i)+metaBtn(g,i);
 h+='<div class="g2"><div><label>'+tr('Ability')+'</label><select data-i="'+i+'" data-k="ab">'+abOpts(g.sp,g.ab,true)+'</select></div><div><label>'+tr('Item')+'</label><select data-i="'+i+'" data-k="it"'+(itemLocked(g.sp)?' disabled':'')+'>'+opts(ITL,g.it,tr('(no item)'))+'</select></div></div>';
 if(g.t==='surv')h+=sitBlock(g.ab,g.abOn,g.fainted,{on:'data-i="'+i+'" data-k="abOn"',fa:'data-i="'+i+'" data-k="fainted"'});
 h+='<div class="g2"><div><label>'+tr('Nature')+'</label><select data-i="'+i+'" data-k="na">'+NAT.map(function(n){return '<option value="'+n+'"'+(n===g.na?' selected':'')+'>'+natLab(n)+'</option>'}).join('')+'</select></div><div><label>'+tr('Status')+'</label><select data-i="'+i+'" data-k="st">'+opts(STA,g.st,undefined,tr)+'</select></div></div>';
 if(g.t==='surv')h+='<label>'+tr('Opponent’s move')+'</label><input class="ac" data-ac="move" data-ms="opp" autocomplete="off" autocapitalize="off" spellcheck="false" data-i="'+i+'" data-k="mv" value="'+esc(g.mv)+'" placeholder="'+esc(tr('e.g. {0}',['Wood Hammer']))+'"><div class="g2"><div><label>'+tr('Attack points')+'</label>'+num(i,'spA',g.spA)+'</div><div><label>'+tr('Attack boost')+'</label>'+sel(i,'bo',BO,g.bo)+'</div></div><div class="g2"><div><label>'+tr('Your Def boost')+'</label>'+sel(i,'db',BO,g.db)+'</div><div><label>'+tr('Your SpD boost')+'</label>'+sel(i,'sb',BO,g.sb)+'</div></div>'+moveExtras(g,i);
 if(g.t==='ko')h+='<label>'+tr('Your move')+'</label><input class="ac" data-ac="move" data-ms="me" autocomplete="off" autocapitalize="off" spellcheck="false" data-i="'+i+'" data-k="mv" value="'+esc(g.mv)+'" placeholder="'+esc(tr('e.g. {0}',['Flare Blitz']))+'"><p class="mu">'+tr('Your Atk/SpA points: set them in section 1 if you want them fixed (empty = the app finds the minimum).')+'</p><div class="g3"><div><label>HP</label>'+num(i,'hp',g.hp)+'</div><div><label>Def</label>'+num(i,'df',g.df)+'</div><div><label>SpD</label>'+num(i,'sd',g.sd)+'</div></div><div class="g3"><div><label>'+tr('HP left %')+'</label>'+num(i,'pct',g.pct,100)+'</div><div><label>'+tr('Their def boost')+'</label>'+sel(i,'bo',BO,g.bo)+'</div><div><label>'+tr('Your boost')+'</label>'+sel(i,'mbo',BO,g.mbo)+'</div></div>'+moveExtras(g,i);
 if(g.t==='spd')h+='<div class="g2"><div><label>'+tr('Speed points')+'</label>'+num(i,'spe',g.spe)+'</div><div><label>'+tr('Speed boost')+'</label>'+sel(i,'bo',BO,g.bo)+'</div></div><label>'+tr('You want to…')+'</label>'+sel(i,'mode',[['over',N_('Outspeed it')],['under',N_('Stay slower (Trick Room)')]],g.mode);
 if(g.t!=='spd')h+='<label>'+(g.t==='ko'?tr('Chance to KO must be at least'):tr('Chance to survive must be at least'))+'</label>'+sel(i,'thr',THR,g.thr);
 h+=fieldBlock(g,i);
 if(g.t==='surv'&&i>0&&goals[i-1].t==='surv')h+='<label class="ck"><input type="checkbox" data-i="'+i+'" data-k="join"'+(g.join?' checked':'')+'> '+tr('I also take the hit above, same turn')+'</label>';
 return h+'</div>';}
/* ---------- dati d'uso dei tornei (tutti i Pokémon; dove non so, vuoto) ---------- */
var META_BY={};META.forEach(function(m){META_BY[m.n]=m;});
var TOP=Object.keys(TDATA).filter(function(n){return DEX[n]}).map(function(n){return{n:n,u:TDATA[n].u,r:TDATA[n].r}}).sort(function(a,b){return a.r-b.r});
function soleAb(sp){var d=DEX[sp];return d&&d.abs.length===1?d.abs[0]:'';}
function metaSet(m){var d=DEX[m.n],ab=soleAb(m.n);for(var i=0;!ab&&i<m.ab.length;i++){if(d.abs.indexOf(m.ab[i])>=0)ab=m.ab[i];}return{ab:ab,it:itemLocked(m.n)?'':(m.it[0]||'')};}
function dmgMoves(m,k){var out=[];m.mv.forEach(function(v){if(out.length<k&&MV[v]&&MV[v].category!=='Status'&&!MV[v].unsupported)out.push(v)});return out;}
function natFor(m,mv){return m.na&&m.na.length?m.na[0][0]:(MV[mv].category==='Special'?'Modest':'Adamant');}
function metaBtn(g,i){var m=META_BY[g.sp],t=TDATA[g.sp];
 if(m)return '<button class="add" style="margin:6px 0" data-meta="'+i+'">📊 '+tr('Use the most used tournament set ({0}% of teams)',[m.u])+'</button>'+(g.note?'<p class="ok" style="margin:2px 0 8px;font-size:13px">'+esc(g.note)+'</p>':'');
 if(DEX[g.sp])return '<p class="mu">'+(t?tr('Used in {0}% of tournament teams, but no certain tournament set for this Pokémon: ability, item and move are left empty.',[t.u]):tr('No certain tournament set for this Pokémon: ability, item and move are left empty.'))+'</p>';return '';}
function fillFromMeta(g){var m=META_BY[g.sp];
 if(m){var s=metaSet(m);g.ab=s.ab;g.it=s.it;if(g.t==='surv'){var mv=dmgMoves(m,1)[0];if(mv){g.mv=mv;g.na=natFor(m,mv);}g.spA=32;}if(g.t==='spd')g.spe=32;}
 else{g.ab=soleAb(g.sp);g.it='';}}
function applyMeta(i){var g=goals[i];fillFromMeta(g);var bits=[];if(g.ab)bits.push(g.ab);if(g.it)bits.push(g.it);if(g.t==='surv'&&g.mv)bits.push(g.mv);if(g.t==='surv'&&g.na)bits.push(g.na);g.note='✔ '+tr('Filled: {0}. Tournaments do not publish Stat Points, so those stay as you set them.',[bits.join(' · ')||tr('nothing to fill')]);draw();}
var META_MAX=60;
function metaGoals(){var atk=$i('tmOn').checked,spd=$i('tmSpd').checked,kod=$i('tmKo').checked;if(!atk&&!spd&&!kod)return[];
 var n=+$i('tmN').value,k=+$i('tmM').value,off=$i('tmNat').value==='off',gs=[],f={weather:$i('tmWe').value,terrain:$i('tmTe').value},RK=[1,.7,.5,.35];
 TOP.slice(0,n).forEach(function(t){var m=META_BY[t.n],s=m?metaSet(m):{ab:soleAb(t.n),it:''};
  if(atk&&m)dmgMoves(m,k).forEach(function(mv,ri){var acc=(MV[mv].acc||100)/100,g=newGoal('surv');g.sp=t.n;g.ab=s.ab;g.it=s.it;g.na=(m.na&&m.na.length)?m.na[0][0]:(off?(MV[mv].category==='Special'?'Modest':'Adamant'):'Hardy');g.mv=mv;g.spA=32;g.thr='1';g.w=String(Math.max(1,Math.round(t.u*10*RK[ri]*acc)));g.f=Object.assign({},f);g.meta=true;gs.push(g);});
  if(kod&&DEX[t.n]){var kmv=[];goals.forEach(function(g){if(g.t==='ko'&&MV[g.mv]&&MV[g.mv].category!=='Status'&&kmv.indexOf(g.mv)<0&&kmv.length<3)kmv.push(g.mv);});
   kmv.forEach(function(mv){var g3=newGoal('ko'),ph=MV[mv].category==='Physical'||!!MV[mv].dealsPhysicalDamage;g3.sp=t.n;g3.ab=s.ab;g3.it=s.it;g3.na=(m&&m.na&&m.na.length)?m.na[0][0]:'Hardy';g3.mv=mv;g3.hp=32;g3[ph?'df':'sd']=+$i('tmKb').value;g3.thr=$i('tmKt').value;g3.pct=+$i('tmKp').value;g3.w=String(Math.max(1,Math.round(t.u*10)));g3.f=Object.assign({},f);g3.meta=true;gs.push(g3);});}
  if(spd){var g2=newGoal('spd');g2.sp=t.n;g2.ab=s.ab;g2.it=s.it;g2.na='Hardy';g2.spe=32;g2.w=String(Math.max(1,Math.round(t.u*10)));g2.f=Object.assign({},f);g2.mode='over';g2.meta=true;gs.push(g2);}});
 /* every meta goal is one more item in the exhaustive search: keep the most used ones so the calculation stays within seconds */
 if(gs.length>META_MAX){gs=gs.slice(0,META_MAX);gs.cut=true;}
 return gs;}
/* tabella di tutti i Pokémon */
function amRender(){var q=$i('amQ').value.trim().toLowerCase(),T=$i('amT'),pc=function(m,k,n){return m.pc&&m.pc[k]&&m.pc[k][n]!==undefined?' '+m.pc[k][n]+'%':'';};
 var rows=SPECIES.filter(function(n){return !q||n.toLowerCase().indexOf(q)>=0}).map(function(n){var t=TDATA[n],m=META_BY[n];
  return '<tr><td class="nm"><span class="av xs" data-ini="'+esc(n[0])+'">'+spriteImg(n,'small','')+'</span>'+esc(n)+'</td><td>'+(t?t.u+'% <span class="mu">#'+t.r+'</span>':'')+'</td><td>'+(m?m.ab.slice(0,2).map(function(a){return esc(a)+pc(m,'ab',a)}).join(', '):'')+'</td><td>'+(m?m.it.slice(0,3).map(function(a){return esc(a)+pc(m,'it',a)}).join(', '):'')+'</td><td>'+(m?m.mv.slice(0,4).map(function(a){return esc(a)+pc(m,'mv',a)}).join(', '):'')+'</td><td>'+(m&&m.na?m.na.slice(0,2).map(function(a){return esc(a[0])+' '+a[1]+'%'}).join(', '):'')+'</td></tr>';}).join('');
 T.innerHTML='<tr><th>Pokémon</th><th>'+tr('Usage')+'</th><th>'+tr('Ability')+'</th><th>'+tr('Items')+'</th><th>'+tr('Moves')+'</th><th>'+tr('Nature')+'</th></tr>'+rows;}
$i('allMon').addEventListener('toggle',amRender);$i('amQ').addEventListener('input',amRender);
/* ---------- display helpers (pure functions: no DOM access) ---------- */
var TYC={Normal:'#A8A77A',Fire:'#EE8130',Water:'#6390F0',Electric:'#F7D02C',Grass:'#7AC74C',Ice:'#96D9D6',Fighting:'#C22E28',Poison:'#A33EA1',Ground:'#E2BF65',Flying:'#A98FF3',Psychic:'#F95587',Bug:'#A6B91A',Rock:'#B6A136',Ghost:'#735797',Dragon:'#6F35FC',Dark:'#705746',Steel:'#B7B7CE',Fairy:'#D685AD'};
function lumOf(h){var n=parseInt(h.slice(1),16),c=[n>>16,n>>8&255,n&255].map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrastOf(a,b){var x=lumOf(a),y=lumOf(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function mixHex(a,b,t){var x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),h=function(sh){var u=Math.round((x>>sh&255)*(1-t)+(y>>sh&255)*t);return ('0'+u.toString(16)).slice(-2)};return '#'+h(16)+h(8)+h(0);}
function tyInk(hex){return contrastOf(hex,'#ffffff')>=contrastOf(hex,'#10201d')?'#ffffff':'#10201d';}
/* colours for the main button and the number badges: the type colours are shaded until the text on them has at least 4.5:1 contrast */
function btnColors(c1,c2){var best=null;['#ffffff','#10201d'].forEach(function(ink){var to=ink==='#ffffff'?'#000000':'#ffffff',cost=0,fit=function(c){var t=0,x=c;while(contrastOf(x,ink)<4.6&&t<1){t+=.03;x=mixHex(c,to,t);}cost+=t;return x;},a=fit(c1),b=fit(c2);if(!best||cost<best.cost)best={a:a,b:b,ink:ink,cost:cost};});return best;}
function typeChips(sp){var d=DEX[sp];if(!d)return '';return [d.t1,d.t2].filter(Boolean).map(function(t){return '<span class="ty" style="--c:'+TYC[t]+';--ct:'+tyInk(TYC[t])+'">'+tr(t)+'</span>';}).join('');}
/* Sprites are never stored in this project: they are loaded at runtime from the PokéAPI sprites repository.
   spriteUrls returns the addresses to try in order (the page moves to the next one when an image is missing). */
var SPRITE_HOST='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
function spriteUrls(sp,kind){var id=SPRITES[sp],b=SPRITE_BASE[sp];if(!id)return [];
 var art=function(i){return SPRITE_HOST+'other/official-artwork/'+i+'.png'},home=function(i){return SPRITE_HOST+'other/home/'+i+'.png'},fr=function(i){return SPRITE_HOST+i+'.png'};
 var l=kind==='big'?[art(id),home(id),fr(id)]:[fr(id),art(id)];if(b)l=l.concat(kind==='big'?[art(b),fr(b)]:[fr(b)]);return l;}
function spriteImg(sp,kind,cls,pri){var u=spriteUrls(sp,kind);if(!u.length)return '';return '<img class="spr '+(cls||'')+'" src="'+u[0]+'" data-fb="'+u.slice(1).join('|')+'" alt="" '+(pri==='high'?'loading="eager" ':'loading="lazy" ')+'fetchpriority="'+(pri||'auto')+'" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" draggable="false">';}
/* hexagon chart of a spread (same orientation and colours as the logo); S2 = optional second spread drawn dashed */
function radar(S,S2,labels){var K=['hp','at','df','sa','sd','sp'],C=130,R=84,pt=function(i,f){var a=(-90+i*60)*Math.PI/180;return [(C+R*f*Math.cos(a)).toFixed(1),(C+R*f*Math.sin(a)).toFixed(1)];},poly=function(f){return K.map(function(k,i){return pt(i,f(k)).join(',')}).join(' ');};
 var h='<svg class="radar" viewBox="0 0 260 260" role="img" aria-label="'+tr('Spread chart')+'"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--s0)"/><stop offset=".5" stop-color="var(--s2)"/><stop offset="1" stop-color="var(--s4)"/></linearGradient></defs>';
 [.25,.5,.75,1].forEach(function(f){h+='<polygon class="rg-ring" points="'+poly(function(){return f})+'"/>';});
 K.forEach(function(k,i){var p=pt(i,1);h+='<line class="rg-ax" x1="'+C+'" y1="'+C+'" x2="'+p[0]+'" y2="'+p[1]+'"/>';});
 h+='<g class="rg-draw"><polygon class="rg-fill" points="'+poly(function(k){return Math.max(.03,S[k]/32)})+'"/>';
 if(S2)h+='<polygon class="rg-fill2" points="'+poly(function(k){return Math.max(.03,S2[k]/32)})+'"/>';
 K.forEach(function(k,i){var p=pt(i,Math.max(.03,S[k]/32));h+='<circle class="rg-dot" cx="'+p[0]+'" cy="'+p[1]+'" r="5.5" style="fill:var(--s'+i+')"/>';});h+='</g>';
 K.forEach(function(k,i){var p=pt(i,1.3),a=Math.abs(p[0]-C)<4?'middle':(p[0]>C?'start':'end');h+='<text class="rg-lab" x="'+(a==='start'?+p[0]-12:a==='end'?+p[0]+12:p[0])+'" y="'+(+p[1]-2)+'" text-anchor="'+a+'" style="fill:var(--s'+i+')">'+labels[k]+'</text><text class="rg-val" x="'+(a==='start'?+p[0]-12:a==='end'?+p[0]+12:p[0])+'" y="'+(+p[1]+14)+'" text-anchor="'+a+'">'+S[k]+(S2&&S2[k]!==S[k]?'→'+S2[k]:'')+'</text>';});
 return h+'</svg>';}
/* ---------- end display helpers ---------- */
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
 o.mode=pickOf(['over','under'],g.mode,'over');o.join=g.join===true;o.abOn=g.abOn===true;o.fainted=intOf(g.fainted,0,5,0);o.crit=g.crit===true;o.db=intOf(g.db,-6,6,0);o.sb=intOf(g.sb,-6,6,0);
 o.f={weather:pickOf(ok(WE),f.weather,'auto'),terrain:pickOf(ok(TE),f.terrain,'auto')};
 CK.forEach(function(c){['L','R'].forEach(function(sd){if(f[c[0]+sd]===true)o.f[c[0]+sd]=true;});});
 if(g.hh===true)o.f.helpingHandL=true; /* older saves had a separate "Count Helping Hand" box on KO goals */
 return o;}
/* goal order = priority. A Survive goal joined to the one above ("same turn") travels with it, so moves work on blocks. */
function blocksOf(gs){var b=[];gs.forEach(function(g,i){if(i>0&&g.join&&g.t==='surv'&&gs[i-1].t==='surv'&&b.length)b[b.length-1].push(g);else b.push([g]);});return b;}
function blockIndex(gs,i){var bl=blocksOf(gs),s=0,k;for(k=0;k<bl.length;k++){if(i>=s&&i<s+bl[k].length)return k;s+=bl[k].length;}return 0;}
function moveBlock(gs,from,to){var bl=blocksOf(gs),bi=blockIndex(gs,from),bt=Math.max(0,Math.min(bl.length-1,to)),mv=bl.splice(bi,1)[0];if(mv[0].join)mv[0].join=false;bl.splice(bt,0,mv);return [].concat.apply([],bl);}
/* same order, priority weights for the Resistance mode: the first goal weighs most (tournament-meta goals keep their usage weight) */
function ranked(gs){return gs.map(function(g,i){return g.meta?g:Object.assign({},g,{w:String(gs.length-i)});});}
/* saves from before the priority list (no o:2) carried Required / Important / Nice to have in w: turn it into an order, keeping joined goals together */
function legacyOrder(gs){var bl=blocksOf(gs).map(function(b,i){return{b:b,i:i,w:+b[0].w||0};});bl.sort(function(x,y){return y.w-x.w||x.i-y.i;});return [].concat.apply([],bl.map(function(x){return x.b;}));}
function cleanState(raw){if(!raw||typeof raw!=='object'||raw.v!==1)return null;var m=raw.m||{},t=raw.t||{},lk={};
 ['hp','at','df','sa','sd','sp'].forEach(function(k){var v=m.lk&&m.lk[k];lk[k]=v===''||v==null?'':intOf(v,0,32,'');});
 var sp=DEX[m.sp]?m.sp:'Incineroar';
 return{v:1,m:{sp:sp,ab:m.ab&&ABL.indexOf(m.ab)>=0?m.ab:DEX[sp].ab,it:m.it&&ITL.indexOf(m.it)>=0?m.it:'',na:m.na==='*'?'*':pickOf(Object.keys(NATURES),m.na,'*'),st:pickOf(STA,m.st,'Healthy'),fm:pickOf(['smart','bulk','resist','offense','speed','none'],m.fm,'smart'),pm:pickOf(['min','perfect'],m.pm,'min'),abOn:m.abOn===true&&!!SIT[m.ab&&ABL.indexOf(m.ab)>=0?m.ab:DEX[sp].ab],fainted:intOf(m.fainted,0,5,0),ho:(Array.isArray(m.ho)?m.ho:[]).filter(function(k,i,a){return HPOPT.some(function(r){return r[0]===k})&&a.indexOf(k)===i}).filter(function(k,i,a){return !(k==='minhp'&&a.indexOf('maxhp')>=0)}),lk:lk},
  t:{on:t.on===true,spd:t.spd===true,ko:t.ko===true,kb:pickOf(['0','16','32'],String(t.kb),'16'),kt:pickOf(['1','0.5','0.25'],String(t.kt),'1'),kp:pickOf(['100','75','50','33'],String(t.kp),'50'),n:pickOf(['5','8','10','12','15','20','25','40','60'],String(t.n),'12'),m:pickOf(['1','2','3'],String(t.m),'2'),nat:pickOf(['off','neu'],t.nat,'off'),we:pickOf(WE.map(function(x){return x[0]}),t.we,'auto'),te:pickOf(TE.map(function(x){return x[0]}),t.te,'auto'),b:pickOf(['12','24','36','66'],String(t.b),'24')},
  g:(function(gs){return raw.o===2?gs:legacyOrder(gs);})((Array.isArray(raw.g)?raw.g.slice(0,30):[]).map(cleanGoal).filter(Boolean)),o:2};}
function encodeShare(st){return b64enc(JSON.stringify(st));}
function decodeShare(txt){try{return cleanState(JSON.parse(b64dec(txt)));}catch(e){return null;}}
/* Pokémon Showdown import text. In Showdown's Champions format the EVs line holds Stat Points directly (0-32 per stat). */
function sdSpecies(n){var m=/^Mega (.+?)( [XYZ])?$/.exec(n);return m?m[1]+'-Mega'+(m[2]?'-'+m[2].trim():''):n;}
function showdownSet(o){var K=[['hp','HP'],['at','Atk'],['df','Def'],['sa','SpA'],['sd','SpD'],['sp','Spe']],
 ev=K.filter(function(k){return o.S[k[0]]>0}).map(function(k){return o.S[k[0]]+' '+k[1]}),L=[sdSpecies(o.name)+(o.item?' @ '+o.item:'')].concat(o.ability?['Ability: '+o.ability]:[],['Level: 50']);
 if(ev.length)L.push('EVs: '+ev.join(' / '));if(o.nature)L.push(o.nature+' Nature');o.moves.forEach(function(m){L.push('- '+m)});return L.join('\n');}
/* Reads a Pokémon Showdown set (the text of Teambuilder → Export). Returns what it understood and warnings about the rest. */
var DEXN=null;
function nz(x){return String(x).toLowerCase().replace(/[^a-z0-9]/g,'');}
function findSpecies(x){if(!DEXN){DEXN={};Object.keys(DEX).forEach(function(k){DEXN[nz(k)]=k;});}
 var m=/^(.+?)-Mega(?:-([XYZ]))?$/i.exec(x),c=m?['Mega '+m[1]+(m[2]?' '+m[2].toUpperCase():''),x]:[x];for(var i=0;i<c.length;i++)if(DEXN[nz(c[i])])return DEXN[nz(c[i])];return '';}
function parseShowdownSet(text){var out={name:'',item:'',ability:'',nature:'',ev:null,moves:[],warn:[]},lines=String(text||'').split(/\r?\n/).map(function(l){return l.trim()}).filter(Boolean);
 if(!lines.length){out.warn.push(tr('The text is empty.'));return out;}
 var first=lines[0],at=first.lastIndexOf(' @ '),itemTxt='';if(at>=0){itemTxt=first.slice(at+3).trim();first=first.slice(0,at);}
 first=first.replace(/\s*\((M|F)\)\s*$/i,'').trim();
 var cands=[first],par=/\(([^()]+)\)\s*$/.exec(first);if(par)cands.unshift(par[1].trim());
 for(var i=0;i<cands.length&&!out.name;i++)out.name=findSpecies(cands[i]);
 if(!out.name)out.warn.push(tr('I do not know the Pokémon “{0}”.',[first.slice(0,40)]));
 if(itemTxt){if(ITL.indexOf(itemTxt)>=0)out.item=itemTxt;else if(!(out.name&&LOCK_ITEM_LOOKUP[out.name]===itemTxt))out.warn.push(tr('The item “{0}” is not in this game’s list: left empty.',[itemTxt.slice(0,30)]));}
 var evs=null;
 lines.slice(1).forEach(function(l){var m;
  if((m=/^Ability:\s*(.+)$/i.exec(l))){if(ABL.indexOf(m[1].trim())>=0)out.ability=m[1].trim();else out.warn.push(tr('The ability “{0}” is not in this game’s list.',[m[1].trim().slice(0,30)]));}
  else if((m=/^EVs?:\s*(.+)$/i.exec(l))){evs={hp:0,at:0,df:0,sa:0,sd:0,sp:0};var map={hp:'hp',atk:'at',def:'df',spa:'sa',spd:'sd',spe:'sp'};m[1].split('/').forEach(function(t){var q=/^\s*(\d+)\s*(HP|Atk|Def|SpA|SpD|Spe)\s*$/i.exec(t);if(q)evs[map[q[2].toLowerCase()]]=+q[1];});}
  else if((m=/^([A-Za-z]+)\s+Nature$/i.exec(l))){var nn=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();if(NATURES[nn])out.nature=nn;else out.warn.push(tr('Unknown nature “{0}”.',[m[1].slice(0,20)]));}
  else if((m=/^-\s*(.+)$/.exec(l))){var mv=m[1].trim();if(MV[mv]&&out.moves.length<4)out.moves.push(mv);else if(!MV[mv])out.warn.push(tr('The move “{0}” is not in this game’s list.',[mv.slice(0,30)]));}});
 if(evs){var K=['hp','at','df','sa','sd','sp'],tot=0,mx=0;K.forEach(function(k){tot+=evs[k];mx=Math.max(mx,evs[k]);});
  if(mx>32||tot>66){K.forEach(function(k){evs[k]=Math.min(32,Math.round(evs[k]/8));});out.warn.push(tr('These looked like classic EVs (up to 252): converted to Stat Points (divided by 8).'));}
  out.ev=evs;}
 return out;}
/* ---------- end share & export ---------- */
/* removing a focused field fires a native change/blur: ignore that nested event while the cards are being redrawn */
var drawing=false;
function draw(){drawing=true;try{drawCards();}finally{drawing=false;}}
function drawCards(){$i('goals').innerHTML=goals.length?goals.map(card).join(''):'<p class="mu">'+tr('Add at least one goal with the buttons below.')+'</p>';a11yLabels();}
$i('goals').onchange=function(e){if(drawing)return;var t=e.target,i=t.dataset.i;if(i===undefined)return;var g=goals[i],k=t.dataset.k,prevSp=g.sp;
 if(k.indexOf('f.')===0){g.f=g.f||newField();g.f[k.slice(2)]=t.type==='checkbox'?t.checked:t.value;var dt=t.closest('details'),sm=dt&&dt.querySelector('summary');if(sm)sm.innerHTML=tr('Field, Weather &amp; Multiplicator')+esc(fieldSummary(g.f));return;}
 if(t.type==='checkbox'){g[k]=t.checked;draw();return;}
 var v=t.value;if(['spA','hp','df','sd','spe','pct'].indexOf(k)>=0)v=Math.max(0,Math.min(k==='pct'?100:32,+v||0));if(k==='bo'||k==='mbo'||k==='db'||k==='sb')v=+v;g[k]=v;
 if(k==='sp'){if(DEX[v]&&v!==prevSp){var nd=newGoal(g.t);g.ab='';g.it='';g.na='Hardy';g.st='Healthy';g.spA=nd.spA;g.hp=nd.hp;g.df=nd.df;g.sd=nd.sd;g.spe=nd.spe;g.bo=0;g.mbo=0;g.abOn=false;g.fainted=0;g.note='';fillFromMeta(g);}draw();}
 if(k==='fainted')g.fainted=Math.max(0,Math.min(5,+v||0));
 if(k==='ab'){g.abOn=false;draw();}
 if(k==='mv'){draw();}
};
$i('goals').addEventListener('toggle',function(e){var d=e.target;if(d.classList&&d.classList.contains('fld')&&goals[d.dataset.i])goals[d.dataset.i].fOpen=d.open;},true);
$i('goals').onclick=function(e){var mi=e.target.dataset.meta;if(mi!==undefined){applyMeta(+mi);return;}
 var up=e.target.dataset.up,dn=e.target.dataset.dn;
 if(up!==undefined||dn!==undefined){var i=+(up!==undefined?up:dn),h=goals[i];goals=moveBlock(goals,i,blockIndex(goals,i)+(up!==undefined?-1:1));draw();var nb=document.querySelector('[data-'+(up!==undefined?'up':'dn')+'="'+goals.indexOf(h)+'"]');if(nb)nb.focus();return;}
 var d=e.target.dataset.del;if(d===undefined)return;goals.splice(+d,1);draw();};
var dragFrom=null;
$i('goals').addEventListener('dragstart',function(e){var h=e.target.closest&&e.target.closest('[data-drag]');if(!h)return;dragFrom=+h.dataset.drag;try{e.dataTransfer.setData('text/plain',String(dragFrom));e.dataTransfer.effectAllowed='move';var c=h.closest('.gc');if(c&&e.dataTransfer.setDragImage)e.dataTransfer.setDragImage(c,20,20);}catch(x){}});
$i('goals').addEventListener('dragover',function(e){if(dragFrom===null)return;var c=e.target.closest&&e.target.closest('.gc');if(c){e.preventDefault();document.querySelectorAll('.gc.over').forEach(function(x){x.classList.remove('over')});c.classList.add('over');}});
$i('goals').addEventListener('drop',function(e){if(dragFrom===null)return;var c=e.target.closest&&e.target.closest('.gc');e.preventDefault();if(c)goals=moveBlock(goals,dragFrom,blockIndex(goals,+c.dataset.card));dragFrom=null;draw();});
$i('goals').addEventListener('dragend',function(){dragFrom=null;document.querySelectorAll('.gc.over').forEach(function(x){x.classList.remove('over')});});
$i('addSurv').onclick=function(){goals.push(newGoal('surv'));draw();};
$i('addKo').onclick=function(){goals.push(newGoal('ko'));draw();};
$i('addSpd').onclick=function(){goals.push(newGoal('spd'));draw();};
function oppCfg(g){var sp={hp:0,at:0,df:0,sa:0,sd:0,sp:0},bo={};
 if(g.t==='surv'){var m=MV[g.mv],k=m&&m.category==='Special'?'sa':'at';sp[k]=g.spA;bo[k]=g.bo;}
 if(g.t==='ko'){sp.hp=g.hp;sp.df=g.df;sp.sd=g.sd;bo={df:g.bo,sd:g.bo};}
 if(g.t==='spd'){sp.sp=g.spe;bo={sp:g.bo};}
 return{name:g.sp,ability:g.ab||'None',item:g.it,nature:g.na,status:g.st||'Healthy',sp:sp,boosts:bo,abOn:!!g.abOn,fainted:+g.fainted||0};}
function err(m){var r=$i('res');r.hidden=false;r.innerHTML='<p class="bad">'+m+'</p>';}
function fail(m){err(m);return null;}
function gather(){
 var M={name:$i('mSp').value.trim(),ability:$i('mAb').value,item:$i('mIt').value,nature:$i('mNa').value,status:$i('mSt').value,fm:$i('fm').value,pm:$i('pm').value,abOn:mySit.on,fainted:mySit.fa,hpOpt:hpOptSel(),lock:{}};
 var lsum=0;['hp','at','df','sa','sd','sp'].forEach(function(k){var v=$i('lk_'+k).value;M.lock[k]=v===''?null:Math.max(0,Math.min(32,+v||0));lsum+=M.lock[k]||0;});
 if(lsum>66)return fail(tr('The fixed points add up to more than 66.'));
 if(!DEX[M.name])return fail(tr('Pick a valid Pokémon for your own Pokémon (choose from the list).'));
 if($i('tmKo').checked&&!goals.some(function(g){return g.t==='ko'}))return fail(tr('Tournament-meta KOs use the moves of your “Get a KO” goals: add one first.'));
 if(!goals.length&&!$i('tmOn').checked&&!$i('tmSpd').checked&&!$i('tmKo').checked)return fail(tr('Add at least one goal, or turn on one of the tournament meta options.'));
 for(var i=0;i<goals.length;i++){var g=goals[i],n=i+1;
  if(!DEX[g.sp])return fail(tr('Goal {0}: pick an opponent Pokémon from the list.',[n]));
  if(g.t!=='spd'&&!MV[g.mv])return fail(tr('Goal {0}: pick a move from the list.',[n]));
  if(g.t!=='spd'&&MV[g.mv].unsupported)return fail(tr('Goal {0}: that move is not supported (its power depends on special conditions).',[n]));
  if(g.t==='surv'&&MV[g.mv].category==='Status')return fail(tr('Goal {0}: the move must deal damage.',[n]));
  if(g.t==='ko'&&MV[g.mv].category==='Status')return fail(tr('Goal {0}: your move must deal damage.',[n]));}
 return M;}
$i('go').onclick=async function(){
 var btn=this,res=$i('res'),M=gather();if(!M)return;
 btn.disabled=true;res.hidden=false;
 var say=function(m){res.innerHTML='<p class="mu"><span class="spin"></span> '+m+'</p>'};
 try{var t0=Date.now(),mg=metaGoals(),r;
  if(mg.length){var B=+$i('tmB').value,r0=goals.length?await solve(M,ranked(goals),{},say,{mode:'min'}):null,base=r0?r0.top.tot:0,lim=B>=66?66:Math.max(base,Math.min(66,base+B));
   r=await solve(M,ranked(goals).concat(mg),{},say,{limit:lim});if(r){r.metaBase=base;r.metaLimit=B;r.metaCut=!!mg.cut;}}
  else r=await solve(M,ranked(goals),{},say);
  if(!r)err(tr('I could not find any possible spread.'));else show(r,M,Date.now()-t0);}
 catch(e){err(tr('Calculation error: {0}',[esc(e.message)]));console.error(e);}
 btn.disabled=false;};
$i('check').onclick=function(){var M=gather();if(!M)return;if(M.nature==='*')return err(tr('Choose a nature (not “Auto”) to check a spread.'));
 var S={};['hp','at','df','sa','sd','sp'].forEach(function(k){S[k]=M.lock[k]||0});
 try{$i('res').hidden=false;show(checkSpread(M,ranked(goals).concat(metaGoals()),S,M.nature),M,0);}catch(e){err(tr('Calculation error: {0}',[esc(e.message)]));console.error(e);}};
function ruler(S,K){var c='',n=0;K.forEach(function(k,ki){for(var i=0;i<S[k];i++){c+='<i class="c'+ki+'" style="--d:'+(n++*12)+'ms"></i>';}});for(;n<66;n++)c+='<i class="f"></i>';return '<div class="ruler">'+c+'</div>';}
var NM={hp:'HP',at:'Atk',df:'Def',sa:'SpA',sd:'SpD',sp:'Spe'};
var LAST=null;
function setMoves(){var out=[];goals.forEach(function(g){if(g.t==='ko'&&MV[g.mv]&&out.indexOf(g.mv)<0&&out.length<4)out.push(g.mv)});return out;}
function setText(r,M,which){return showdownSet({name:M.name,item:M.item||LOCK_ITEM_LOOKUP[M.name]||'',ability:M.ability,nature:r.nat,S:which==='full'?r.S1:r.S,moves:setMoves()});}
function exportHtml(r,M){LAST={r:r,M:M};var K=['hp','at','df','sa','sd','sp'],differs=K.some(function(k){return r.S[k]!==r.S1[k]});
 return '<h2>'+tr('Export')+'</h2><p class="mu">'+tr('Paste it in Pokémon Showdown (Teambuilder → Import). Stat Points go in the EVs line, as in Showdown’s Champions format. Moves come from your KO goals.')+'</p><div class="g2"><button class="add" data-exp="min" type="button">'+tr('Copy set (minimum spread)')+'</button>'+(differs?'<button class="add" data-exp="full" type="button">'+tr('Copy set (with suggested leftover)')+'</button>':'')+'</div><details><summary>'+tr('Show the text')+'</summary><pre style="white-space:pre-wrap;user-select:all">'+esc(setText(r,M,'min'))+'</pre></details>';}
$i('res').addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-exp]');if(!b||!LAST)return;copyText(setText(LAST.r,LAST.M,b.dataset.exp),tr('Set copied.'));});
function resTop(r,M){var K=['hp','at','df','sa','sd','sp'],d=DEX[M.name]||{},c1=TYC[d.t1]||'#8aa',c2=TYC[d.t2||d.t1]||'#8aa',diff=r.free>0&&K.some(function(k){return r.S[k]!==r.S1[k]});
 return '<div class="res-top" style="--c1:'+c1+';--c2:'+c2+'"><div class="portrait"><span class="av big" data-ini="'+esc(M.name[0])+'">'+spriteImg(M.name,'big','','high')+'</span><div class="pn">'+esc(M.name)+'</div><div class="tys">'+typeChips(M.name)+'</div><div class="nat">'+natLab(r.nat)+'</div></div>'+radar(r.S,diff?r.S1:null,NM)+'</div>';}
function whyHtml(r,M){var K=['hp','at','df','sa','sd','sp'],rows=K.filter(function(k){return r.base[k]>0}).map(function(k){var p=r.pins[k]||[],mine=p.filter(function(x){return !x.meta}),meta=p.filter(function(x){return x.meta}),t;
  if(M.lock[k]!=null)t=tr('fixed by you');else{var parts=[];if(mine.length)parts.push(mine.map(function(x){return esc(x.label)}).join('; '));if(meta.length)parts.push(tr(meta.length>1?N_('{0} tournament-meta goals'):N_('{0} tournament-meta goal'),[meta.length])+(mine.length?'':': '+meta.slice(0,3).map(function(x){return esc(x.label)}).join('; ')+(meta.length>3?'…':'')));
   t=parts.length?parts.join(' · '):tr('no single goal needs the last point on its own: it is a trade-off between HP, Def and SpD');}
  return '<li><b>'+NM[k]+' '+r.base[k]+'</b> — '+t+'</li>';});
 return rows.length?'<details class="why"><summary>'+tr('Why these points?')+'</summary><ul style="margin:6px 0 0 18px;padding:0">'+rows.join('')+'</ul></details>':'';}
var LASTSHOW=null;
/* quiet = redraw in place (language change) without scrolling to the result */
function show(r,M,ms,quiet){var K=['hp','at','df','sa','sd','sp'],mineG=r.goals.filter(function(g){return !g.meta}),metaG=r.goals.filter(function(g){return g.meta}),badAll=mineG.filter(function(g){return !g.ok}),h='<h2>'+tr(r.check?(badAll.length?N_('Your spread: some goals fail'):N_('Your spread: every goal works')):badAll.length?N_('Best spread found'):(r.mode==='perfect'?N_('Perfect spread found'):N_('Minimum spread found')))+'</h2>'+resTop(r,M)+ruler(r.S,K)+'<div class="sp">'+K.map(function(k,i){return '<div class="s'+i+'"><b>'+r.S[k]+'</b><span>'+NM[k]+'</span><i>'+r.stats[k]+'</i></div>'}).join('')+'</div>';
 if(!r.check)h+=whyHtml(r,M);
 if(r.check&&r.free>0)h+='<p class="mu">'+tr('Points not used: {0} of 66.',[r.free])+'</p>';
 if(!r.check&&r.free>0){h+='<p><b>'+tr('Free points left: {0}',[r.free])+'</b> <span class="mu">('+tr('you are not forced to use them')+')</span></p><p class="mu">'+tr('Suggested way to spend them ({0} stay free):',[r.left===undefined?r.free:r.left])+'</p><div class="sp">'+K.map(function(k,i){return '<div class="s'+i+'"><b>'+r.S1[k]+'</b><span>'+NM[k]+'</span></div>'}).join('')+'</div>'+(r.why&&r.why.length?'<ul class="mu" style="margin:6px 0 0 18px;padding:0">'+r.why.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'');}
 if(r.effort&&r.effort.length)h+='<p class="mu">'+tr('Extra points put toward goals that could not be fully reached: {0}.',[r.effort.map(function(e){return NM[e.k]+' +'+e.n+' ('+esc(e.label)+')'}).join(', ')])+'</p>';
 var bad=badAll,hardBad=bad.filter(function(g){return !(g.hh&&g.hh.ok)});
 h+=!mineG.length?'':!bad.length?'<p class="ok">'+tr('All goals are satisfied!')+' 🎉</p>':(r.check?'<p class="bad">'+tr('This spread does not meet every goal. ❌ marks the ones that fail.')+'</p>':hardBad.length?'<p class="bad">'+tr('I could not satisfy every goal: I gave up the ones lower in your list first.')+'</p>':'<p class="ok">'+tr('Every goal works. 🤝 marks the ones that need Helping Hand.')+'</p>');
 var ptsLab=function(n){return n>32?tr('not reachable'):String(n)},ptsRow=function(g){var q=g.pts;if(!q)return '';return '<br><span class="mu">'+tr('Minimum {0} points: {1} without Helping Hand · {2} with it',[NM[q.k],ptsLab(q.no),ptsLab(q.hh)])+(q.no<=32&&q.hh<q.no?' '+tr('(saves {0})',[q.no-q.hh]):'')+'</span>';};
 var rowH=function(g){var v=g.t==='spd'?tr('you {0} · them {1}',[g.my,g.opp]):g.lo.toFixed(1)+'–'+g.hi.toFixed(1)+'% · '+(g.p*100).toFixed(g.p===1||g.p===0?0:1)+'%';
  return '<tr><td>'+(g.ok?'✅':(g.hh&&g.hh.ok?'🤝':'❌'))+' '+(g.meta?'':'<b>#'+(g.ix+1)+'</b> ')+esc(g.label)+(g.desc?'<br><span class="mu">'+esc(g.desc)+'</span>':'')+ptsRow(g)+(g.hh?'<br><span class="mu">'+tr('With Helping Hand:')+' '+g.hh.lo.toFixed(1)+'–'+g.hh.hi.toFixed(1)+'% · '+(g.hh.p*100).toFixed(g.hh.p===1||g.hh.p===0?0:1)+'% '+(g.hh.ok?'✅':'❌')+'</span>':'')+'</td><td>'+v+'</td></tr>'};
 var metaHtml='';
 if(metaG.length){var mk=metaG.filter(function(g){return g.t==='ko'}),ms=metaG.filter(function(g){return g.t==='surv'}),mp=metaG.filter(function(g){return g.t==='spd'}),wt=function(a){return a.reduce(function(t,g){return t+g.w},0)},wok=function(a){return wt(a.filter(function(g){return g.ok}))};
  metaHtml='<h2>'+tr('Tournament meta')+'</h2><p>'+(ms.length?tr('Survives <b>{0} of {1}</b> of the most used attacks (<b>{2}%</b> of the usage weight)',[ms.filter(function(g){return g.ok}).length,ms.length,Math.round(wok(ms)/wt(ms)*100)]):'')+(mp.length?(ms.length?' · '+tr('outspeeds <b>{0} of {1}</b> top Pokémon (<b>{2}%</b> of the usage weight)',[mp.filter(function(g){return g.ok}).length,mp.length,Math.round(wok(mp)/wt(mp)*100)]):tr('Outspeeds <b>{0} of {1}</b> top Pokémon (<b>{2}%</b> of the usage weight)',[mp.filter(function(g){return g.ok}).length,mp.length,Math.round(wok(mp)/wt(mp)*100)])):'')+(mk.length?(ms.length||mp.length?' · '+tr('knocks out <b>{0} of {1}</b> of the most used Pokémon (<b>{2}%</b> of the usage weight)',[mk.filter(function(g){return g.ok}).length,mk.length,Math.round(wok(mk)/wt(mk)*100)]):tr('Knocks out <b>{0} of {1}</b> of the most used Pokémon (<b>{2}%</b> of the usage weight)',[mk.filter(function(g){return g.ok}).length,mk.length,Math.round(wok(mk)/wt(mk)*100)])):'')+'.'+(r.metaBase!==undefined?' '+tr('The meta used <b>{0}</b> extra points (limit: {1}).',[Math.max(0,r.top.tot-r.metaBase),r.metaLimit>=66?tr('none'):tr('up to {0}',[r.metaLimit])]):'')+(r.metaCut?' '+tr('Only the {0} most used goals of the meta are used, to keep the calculation fast.',[META_MAX]):'')+'</p><details><summary>'+tr('See each one')+'</summary><table>'+metaG.map(rowH).join('')+'</table></details>';}
 h+=(mineG.length?'<h2>'+tr('Goals')+'</h2><table>'+mineG.map(rowH).join('')+'</table>':'')+metaHtml;
 if(r.alts.length)h+='<h2>'+tr('Other natures')+'</h2><p class="mu">'+r.alts.map(function(a){return natLab(a.n)+' ('+(a.same?tr('same result'):(a.sig===r.top.sig?tr('same goals, smaller margins'):tr('meets fewer goals')))+')'}).join(' · ')+'</p>';
 h+=exportHtml(r,M);
 h+='<p class="mu">'+tr('Calculated in {0} s with the EVSmith damage engine.',[(ms/1000).toFixed(1)])+'</p>';
 $i('res').innerHTML=h;LASTSHOW={r:r,M:M,ms:ms};if(!quiet&&$i('res').scrollIntoView)$i('res').scrollIntoView({behavior:'smooth'});}
function metaInfo(){if(typeof TMETA==='undefined')return;$i('metaTxt').textContent=tr('{0}, {1}, tournaments with {2}+ players over the last {3} days ({4} teams). Collected on {5} and not updated automatically; where no reliable data exists, the field is left empty.',[TMETA.source,TMETA.format,TMETA.minPlayers,TMETA.days,TMETA.teams.toLocaleString(LANG==='it'?'it-IT':'en-US'),TMETA.date]);}
metaInfo();
$i('mSp').value='Incineroar';$i('mSp').onchange();$i('mAb').onchange=function(){mySit.on=false;drawMySit();};$i('mSit').addEventListener('change',function(e){if(e.target.id==='mAbOn')mySit.on=e.target.checked;if(e.target.id==='mFaint')mySit.fa=+e.target.value;});drawMySit();draw();
function drawHpOpt(){var on=hpOptSel();$i('hpOptList').innerHTML=HPOPT.map(function(r){return '<label class="ck"><input type="checkbox" data-hpopt="'+r[0]+'"'+(on.indexOf(r[0])>=0?' checked':'')+'> '+tr(r[1])+' <span class="mu fm">'+tr(r[2])+'</span></label>'}).join('');}
drawHpOpt();
function hpOptSel(){return [].slice.call(document.querySelectorAll('[data-hpopt]')).filter(function(x){return x.checked}).map(function(x){return x.dataset.hpopt});}
function hpOptSum(){var n=hpOptSel().length;$i('hpOptSum').textContent=n?'· '+tr('{0} on',[n]):'';}
$i('hpOptList').addEventListener('change',function(e){var k=e.target.dataset.hpopt,o=k==='maxhp'?'minhp':k==='minhp'?'maxhp':'';if(o&&e.target.checked)document.querySelector('[data-hpopt="'+o+'"]').checked=false;hpOptSum();});
/* ---------- pictures: showcase of your Pokémon, hero art, image fallbacks ---------- */
document.addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='IMG'||t.dataset.fb===undefined)return;var l=t.dataset.fb?t.dataset.fb.split('|'):[];if(l.length){t.dataset.fb=l.slice(1).join('|');t.src=l[0];}else t.classList.add('nospr');},true);
document.addEventListener('load',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.classList.contains('spr'))t.classList.add('ok');},true);
function drawShowcase(){var sp=$i('mSp').value.trim(),d=DEX[sp],el=$i('showcase');
 if(!d){el.innerHTML='';el.className='';return;}
 var c1=TYC[d.t1],c2=TYC[d.t2||d.t1],t=TDATA[sp],K=['hp','at','df','sa','sd','sp'],root=document.documentElement.style;
 root.setProperty('--ty1',c1);root.setProperty('--ty2',c2);var bc=btnColors(c1,c2);root.setProperty('--go1',bc.a);root.setProperty('--go2',bc.b);root.setProperty('--ink',bc.ink);el.className='showcase';el.style.cssText='--c1:'+c1+';--c2:'+c2;
 el.innerHTML='<div class="sc-art"><span class="av hero" data-ini="'+esc(sp[0])+'">'+spriteImg(sp,'big','','high')+'</span></div><div class="sc-info"><div class="sc-name">'+esc(sp)+'</div><div class="tys">'+typeChips(sp)+(t?'<span class="use">#'+t.r+' · '+tr('{0}% of teams',[t.u])+'</span>':'')+'</div><div class="bars">'+K.map(function(k,i){return '<div class="bar s'+i+'"><span>'+NM[k]+'</span><i style="--w:'+Math.min(100,d.bs[k]/180*100).toFixed(1)+'%"></i><b>'+d.bs[k]+'</b></div>'}).join('')+'</div></div>';}
/* the header pictures are decoration: they load after the page, at low priority */
function renderHero(){$i('heroArt').innerHTML=TOP.slice(0,5).map(function(t,i){return '<span class="ha ha'+i+'" title="'+esc(t.n)+'">'+spriteImg(t.n,'big','','low')+'</span>'}).join('');}
if(document.readyState==='complete')setTimeout(renderHero,150);else window.addEventListener('load',function(){setTimeout(renderHero,150);});
$i('mSp').addEventListener('change',drawShowcase);drawShowcase();
/* ---------- import a Showdown set ---------- */
$i('impBtn').onclick=function(){var o=parseShowdownSet($i('impTxt').value),msg=$i('impMsg');
 if(!o.name){msg.innerHTML='<span class="bad">'+esc(o.warn[0]||tr('I could not read a Pokémon.'))+'</span>';return;}
 $i('mSp').value=o.name;lastMe=o.name;$i('mAb').innerHTML=abOpts(o.name,o.ability||defAb(o.name));mySit.on=false;drawMySit();$i('mIt').disabled=itemLocked(o.name);$i('mIt').value=o.item;
 $i('mNa').value=o.nature||'*';$i('mSt').value='Healthy';['hp','at','df','sa','sd','sp'].forEach(function(k){$i('lk_'+k).value=o.ev?o.ev[k]:'';});drawShowcase();queueSave();
 msg.innerHTML='<span class="ok">'+(o.ev?tr('Filled {0}: the points are now fixed in “Fix some of your points”. Press “Check my spread” to test them, or “Find the best spread” to keep them and let the app decide the rest.',[esc(o.name)]):tr('Filled {0}.',[esc(o.name)]))+'</span>'+(o.warn.length?'<ul style="margin:6px 0 0 18px;padding:0">'+o.warn.map(function(w){return '<li>'+esc(w)+'</li>'}).join('')+'</ul>':'');};
/* ---------- saved state, share link, export (DOM side) ---------- */
var LS_KEY='evsmith.state.v1',toolT=null;
function readState(){var lk={};['hp','at','df','sa','sd','sp'].forEach(function(k){lk[k]=$i('lk_'+k).value;});
 return{v:1,o:2,m:{sp:$i('mSp').value.trim(),ab:$i('mAb').value,it:$i('mIt').value,na:$i('mNa').value,st:$i('mSt').value,fm:$i('fm').value,pm:$i('pm').value,abOn:mySit.on,fainted:mySit.fa,ho:hpOptSel(),lk:lk},
  t:{on:$i('tmOn').checked,spd:$i('tmSpd').checked,ko:$i('tmKo').checked,kb:$i('tmKb').value,kt:$i('tmKt').value,kp:$i('tmKp').value,n:$i('tmN').value,m:$i('tmM').value,nat:$i('tmNat').value,we:$i('tmWe').value,te:$i('tmTe').value,b:$i('tmB').value},
  g:goals.map(function(g){var o={};Object.keys(g).forEach(function(k){if(k!=='fOpen'&&k!=='note')o[k]=g[k]});return o;})};}
function applyState(st){var m=st.m,t=st.t;$i('mSp').value=m.sp;lastMe=m.sp;drawShowcase();$i('mAb').innerHTML=abOpts(m.sp,m.ab);$i('mIt').disabled=itemLocked(m.sp);$i('mIt').value=m.it;mySit.on=m.abOn;mySit.fa=m.fainted;drawMySit();document.querySelectorAll('[data-hpopt]').forEach(function(x){x.checked=m.ho.indexOf(x.dataset.hpopt)>=0});hpOptSum();
 $i('mNa').value=m.na;$i('mSt').value=m.st;$i('fm').value=m.fm;$i('pm').value=m.pm;['hp','at','df','sa','sd','sp'].forEach(function(k){$i('lk_'+k).value=m.lk[k];});
 $i('tmOn').checked=t.on;$i('tmSpd').checked=t.spd;$i('tmKo').checked=t.ko;$i('tmKb').value=t.kb;$i('tmKt').value=t.kt;$i('tmKp').value=t.kp;$i('tmN').value=t.n;$i('tmM').value=t.m;$i('tmNat').value=t.nat;$i('tmWe').value=t.we;$i('tmTe').value=t.te;$i('tmB').value=t.b;goals=st.g;draw();}
function saveLocal(){try{window.localStorage.setItem(LS_KEY,JSON.stringify(readState()));}catch(e){}}
function queueSave(){clearTimeout(toolT);toolT=setTimeout(saveLocal,300);}
function say2(msg){var els=document.querySelectorAll('.toolmsg'),set=function(t){els.forEach(function(el){el.textContent=t;});};set(msg);clearTimeout(say2.t);say2.t=setTimeout(function(){set('');},3500);}
function copyText(txt,okMsg){var done=function(){say2(okMsg)},fail=function(){say2(tr('Could not copy: select the text and copy it by hand.'))};
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done,function(){legacyCopy(txt)?done():fail();});}else legacyCopy(txt)?done():fail();}
function legacyCopy(txt){try{var ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);return ok;}catch(e){return false;}}
function shareUrl(){return location.href.split('#')[0]+'#s='+encodeShare(readState());}
$i('shareBtn').onclick=function(){copyText(shareUrl(),tr('Link copied: it contains your Pokémon, goals and options.'));};
$i('resetBtn').onclick=function(){if(!confirm(tr('Reset your Pokémon, goals and options?')))return;goals=[];['hp','at','df','sa','sd','sp'].forEach(function(k){$i('lk_'+k).value='';});
 $i('mSp').value='Incineroar';lastMe='';$i('mSp').onchange();$i('fm').value='smart';document.querySelectorAll('[data-hpopt]').forEach(function(x){x.checked=false});hpOptSum();$i('tmOn').checked=false;$i('tmSpd').checked=false;$i('res').hidden=true;LASTSHOW=null;draw();try{window.localStorage.removeItem(LS_KEY);}catch(e){}
 if(location.hash)history.replaceState(null,'',location.href.split('#')[0]);say2(tr('Everything was reset.'));};
document.addEventListener('change',queueSave);document.addEventListener('click',queueSave);
a11yLabels();
/* ---------- sections: the page always opens on the home screen, the buttons choose the tool ---------- */
var VIEWS=['home','ev','team'],HOMEMSG='';
function drawHomeMsg(){document.querySelectorAll('.home-msg').forEach(function(el){el.textContent=HOMEMSG?tr(HOMEMSG):'';});}
function homeNote(m){HOMEMSG=m;drawHomeMsg();}
function setView(v){v=VIEWS.indexOf(v)>=0?v:'home';var root=document.documentElement;if(root.getAttribute('data-view')===v)return;root.setAttribute('data-view',v);acHide();
 document.querySelectorAll('.nav [data-go]').forEach(function(b){if(b.dataset.go===v)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 window.scrollTo(0,0);}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-go]');if(!b)return;var v=b.dataset.go;if(v===document.documentElement.getAttribute('data-view'))return;
 /* the address stays as it is (it may hold a shared setup): the history entry only remembers the section, so Back works */
 try{window.history.pushState({view:v},'');}catch(err){}setView(v);
 var f=document.querySelector(v==='home'?(document.documentElement.classList.contains('has-stage')?'.stage [data-go="ev"]':'.home-alt [data-go="ev"]'):'.nav [data-go="'+v+'"]');if(f)f.focus({preventScroll:true});});
window.addEventListener('popstate',function(e){setView(e.state&&e.state.view);});
/* after a reload the page is on the home screen again: the current history entry must say so too */
try{window.history.replaceState(null,'');}catch(err){}
/* what the Teambuilding script uses */
var EVUI=window.EVUI={items:ITL.concat(STONES),tr:tr,esc:esc,spriteImg:spriteImg,typeChips:typeChips,TYC:TYC,tyInk:tyInk,natLab:natLab,showdownSet:showdownSet,parseShowdownSet:parseShowdownSet,copy:copyText,notify:say2,onLang:[]};
/* ---------- interface language ---------- */
var LANG_KEY='evsmith.lang';
/* static texts of the page: the English HTML is the key (kept on the element the first time) */
function applyStatic(){var it=LANG==='it'&&typeof I18N_IT!=='undefined',get=function(k){return it&&I18N_IT[k]!==undefined?I18N_IT[k]:k;};
 document.querySelectorAll('[data-i18n]').forEach(function(el){if(el._en===undefined)el._en=el.innerHTML.trim();el.innerHTML=get(el._en);});
 document.querySelectorAll('[data-i18n-ph]').forEach(function(el){if(el._enPh===undefined)el._enPh=el.getAttribute('placeholder');el.setAttribute('placeholder',get(el._enPh));});
 document.querySelectorAll('[data-i18n-title]').forEach(function(el){if(el._enT===undefined)el._enT=el.getAttribute('title');el.setAttribute('title',get(el._enT));});
 document.documentElement.lang=LANG;document.querySelectorAll('.lang-btn').forEach(function(b){b.textContent=LANG==='it'?'🌐 English':'🌐 Italiano';b.setAttribute('lang',LANG==='it'?'en':'it');});drawHomeMsg();}
function setLang(l){LANG=l==='it'?'it':'en';applyStatic();fillSelects();acBox.setAttribute('aria-label',tr('Suggestions'));drawHpOpt();hpOptSum();drawMySit();drawShowcase();metaInfo();draw();if($i('allMon').open)amRender();
 if(LASTSHOW&&!$i('res').hidden)show(LASTSHOW.r,LASTSHOW.M,LASTSHOW.ms,true);
 EVUI.onLang.forEach(function(f){f();});}
document.querySelectorAll('.lang-btn').forEach(function(b){b.onclick=function(){setLang(LANG==='it'?'en':'it');try{window.localStorage.setItem(LANG_KEY,LANG);}catch(e){}};});
(function(){var l=null;try{l=window.localStorage.getItem(LANG_KEY);}catch(e){}if(l!=='it')l='en';setLang(l);})();
/* installable app + offline cache, only when served over http(s) (not when the file is opened directly) */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',function(){var l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);navigator.serviceWorker.register('sw.js').catch(function(){});});
(function(){var st=null;try{if(/^#s=/.test(location.hash))st=decodeShare(location.hash.slice(3));else{var raw=window.localStorage.getItem(LS_KEY);if(raw)st=cleanState(JSON.parse(raw));}}catch(e){st=null;}
 if(st){applyState(st);if(/^#s=/.test(location.hash))homeNote(N_('Setup loaded from the link: open the EV Builder to see it.'));}else if(/^#s=/.test(location.hash))homeNote(N_('This link could not be read.'));})();
})();

