/* ---------- Teambuilding: partner suggestions (no DOM access) ---------- */
/* A team is {type, slots:[{sp,it,ab,na,mv:[4],sp6:{hp..}}]}. Every candidate gets four sub-scores from 0 to 1:
   meta (how often it is on the same tournament teams), type (shared weaknesses it covers, types it adds attacks against),
   style (fit with the chosen team type) and roles (useful moves the team does not have yet). */
(function(G){
'use strict';
function N_(s){return s;}
var DEX=G.POKEDEX_CHAMPIONS,MV=G.MOVES_CHAMPIONS,LOCK=G.LOCK_ITEM_LOOKUP,LS=G.LEARNSETS,MN=G.MOVE_NAMES,TD=G.TDATA||{},TYPES=G.ENG.TYPES,te=G.ENG.te;
var WEIGHTS={meta:.35,type:.30,style:.20,roles:.15};
var STYLES={none:N_('Balanced'),tr:'Trick Room',tw:'Tailwind',rain:N_('Rain'),sun:N_('Sun'),sand:N_('Sandstorm'),snow:N_('Snow')};
var STYLE={
 tr:{mv:['Trick Room'],ab:[]},
 tw:{mv:['Tailwind'],ab:[]},
 rain:{mv:['Rain Dance'],ab:['Drizzle'],use:['Swift Swim','Rain Dish','Hydration','Dry Skin'],umv:['Hurricane','Thunder','Weather Ball','Electro Shot'],boost:'Water',hurt:'Fire'},
 sun:{mv:['Sunny Day'],ab:['Drought'],use:['Chlorophyll','Solar Power','Protosynthesis','Flower Gift'],umv:['Solar Beam','Solar Blade','Weather Ball'],boost:'Fire',hurt:'Water'},
 sand:{mv:['Sandstorm'],ab:['Sand Stream'],use:['Sand Rush','Sand Force','Sand Veil'],umv:[],boost:'Rock'},
 snow:{mv:['Snowscape','Chilly Reception'],ab:['Snow Warning'],use:['Slush Rush','Ice Body','Snow Cloak'],umv:['Blizzard','Aurora Veil','Weather Ball'],boost:'Ice'}
};
var ROLES=[
 {id:'speed',w:1,mv:['Tailwind','Trick Room','Icy Wind','Electroweb','Thunder Wave'],why:N_('Adds speed control ({0}), which your team does not have')},
 {id:'fakeout',w:.8,mv:['Fake Out'],why:N_('Brings {0}, which your team does not have')},
 {id:'redirect',w:.7,mv:['Follow Me','Rage Powder'],why:N_('Can draw attacks away from its partners ({0})')},
 {id:'intimidate',w:.6,mv:[],ab:['Intimidate'],why:N_('Brings {0}, which your team does not have')},
 {id:'disrupt',w:.4,mv:['Taunt','Encore','Spore','Will-O-Wisp','Snarl','Parting Shot'],why:N_('Adds a way to disrupt opponents ({0})')}
];
var SETUP=['Swords Dance','Nasty Plot','Dragon Dance','Calm Mind','Quiver Dance','Bulk Up','Shell Smash','Trick Room'];
/* moves that also hit the partner next to the user */
var ALLY={Earthquake:'Ground',Bulldoze:'Ground',Surf:'Water',Discharge:'Electric','Lava Plume':'Fire','Sludge Wave':'Poison'};
var IMMUNE={Levitate:'Ground','Earth Eater':'Ground','Flash Fire':'Fire','Well-Baked Body':'Fire','Water Absorb':'Water','Storm Drain':'Water','Dry Skin':'Water','Volt Absorb':'Electric','Lightning Rod':'Electric','Motor Drive':'Electric','Sap Sipper':'Grass'};
var HALF={'Thick Fat':['Fire','Ice'],Heatproof:['Fire'],'Water Bubble':['Fire'],'Purifying Salt':['Ghost']};

var META_BY={};(G.META||[]).forEach(function(m){META_BY[m.n]=m;});
var DATA=null,IX={};
function setData(d){DATA=d||null;IX={};if(DATA)DATA.mons.forEach(function(n,i){IX[n]=i;});}
setData(G.TEAMDATA);

/* own keys only: typed or stored text like "constructor" is not a Pokémon or a move */
function has(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function isMega(n){return /^Mega /.test(n);}
function megaBase(n){return n.replace(/^Mega /,'').replace(/ [XYZ]$/,'');}
/* Species Clause: forms of the same species cannot share a team */
function baseKey(n){var b=isMega(n)?megaBase(n):n;return b==='Kommo-o'?b:b.split('-')[0];}
/* the Pokémon the slot really is in battle: a Mega Stone turns it into its Mega form */
function effName(sp,it){if(!has(DEX,sp)||isMega(sp)||!it)return sp;
 for(var m in LOCK){if(LOCK[m]===it&&DEX[m]&&(megaBase(m)===sp||(m==='Mega Floette'&&sp==='Floette-Eternal')||(/^Meowstic/.test(sp)&&m===(sp==='Meowstic-F'?'Mega Meowstic-F':'Mega Meowstic-M'))))return m;}return sp;}
function types(n){var d=DEX[n];return [d.t1,d.t2].filter(Boolean);}
function mult(atk,ty,ab){if(IMMUNE[ab]===atk)return 0;var m=ty.reduce(function(x,t){return x*te(atk,t)},1);if(HALF[ab]&&HALF[ab].indexOf(atk)>=0)m*=.5;return m;}
function isDamage(m){return has(MV,m)&&MV[m].category!=='Status';}
function canLearn(n,m){if(!has(LS,n))return false;var l=LS[n];for(var i=0;i<l.length;i++)if(MN[l[i]]===m)return true;return false;}

/* ---------- what a candidate usually brings ---------- */
var PROF={};
function profile(n){var key=(DATA?'d':'m')+n;if(PROF[key]&&PROF[key].data===DATA)return PROF[key];
 var i=IX[n],p={mv:{},ab:{},src:'none',data:DATA};
 if(DATA&&i!==undefined&&DATA.sets[i]){p.mv=DATA.sets[i].mv;p.ab=DATA.sets[i].ab;p.src='teams';}
 else if(META_BY[n]&&META_BY[n].pc){p.mv=META_BY[n].pc.mv;p.ab=META_BY[n].pc.ab;p.src='meta';}
 var abs=DEX[n].abs;
 p.main=isMega(n)||abs.length===1?DEX[n].ab:Object.keys(p.ab).filter(function(a){return abs.indexOf(a)>=0}).sort(function(a,b){return p.ab[b]-p.ab[a]})[0]||'';
 return PROF[key]=p;}
function abShare(n,p,a){if((isMega(n)||DEX[n].abs.length===1)&&DEX[n].ab===a)return 100;return p.ab[a]||0;}
function mvShare(p,m){return p.mv[m]||0;}
/* damaging move types a candidate is expected to use */
function attackTypes(n,p){var o=[];Object.keys(p.mv).forEach(function(m){if(p.mv[m]>=30&&isDamage(m)&&o.indexOf(MV[m].type)<0)o.push(MV[m].type);});return o.length?o:types(n);}
function usage(n){if(TD[n])return TD[n].u;var i=IX[n];return DATA&&i!==undefined&&DATA.n.all?Math.round((DATA.solo.all[i]||0)/DATA.n.all*1000)/10:0;}

/* ---------- the user's team ---------- */
function members(slots){var out=[];(slots||[]).forEach(function(s){if(!s||!has(DEX,s.sp))return;var n=effName(s.sp,s.it),d=DEX[n],mv=(s.mv||[]).filter(function(m){return has(MV,m)}),
  own=s.ab||(DEX[s.sp].abs.length===1?DEX[s.sp].ab:''),ab=isMega(n)?d.ab:own;
  out.push({sp:s.sp,name:n,key:baseKey(n),types:types(n),ab:ab,abs:[ab,own].filter(Boolean),mv:mv,it:s.it||''});});return out;}
function analyse(ms){var weak={},res={},need={},total=0,covered={};
 TYPES.forEach(function(t){weak[t]=0;res[t]=0;ms.forEach(function(m){var x=mult(t,m.types,m.ab);if(x>1)weak[t]++;else if(x<1)res[t]++;});need[t]=weak[t]?Math.max(0,weak[t]-res[t]):0;total+=need[t];});
 ms.forEach(function(m){var at=m.mv.filter(isDamage).map(function(x){return MV[x].type});if(!at.length)at=m.types;
  at.forEach(function(a){TYPES.forEach(function(d){if(te(a,d)>1)covered[d]=1;});});});
 return{weak:weak,res:res,need:need,total:total,covered:covered};}
function hasAny(ms,mv,ab){return ms.some(function(m){return mv.some(function(x){return m.mv.indexOf(x)>=0})||(ab||[]).some(function(a){return m.abs.indexOf(a)>=0})});}

function clamp(x){return Math.max(0,Math.min(1,x));}
function why(list,cat,w,text,args,warn){list.push({cat:cat,w:w,k:text,a:args||[],warn:!!warn});}

function metaScore(c,ms,type,R){var u=usage(c),ci=IX[c];
 if(DATA){var sum=0,n=0,best=null;ms.forEach(function(m){var mi=IX[m.name];if(mi===undefined)return;
   var tag=type!=='none'&&(DATA.solo[type][mi]||0)>=20?type:'all',tot=DATA.solo[tag][mi]||0;if(!tot)return;
   var cnt=0;if(ci!==undefined){[[mi,ci],[ci,mi]].forEach(function(q){(DATA.pair[tag][q[0]]||[]).forEach(function(e){if(e[0]===q[1])cnt=Math.max(cnt,e[1]);});});}
   var r=Math.min(1,cnt/tot);sum+=r;n++;if(!best||r>best.r)best={r:r,m:m.name,tag:tag};});
  if(n){var avg=sum/n,s=.75*clamp(avg/.35)+.25*clamp(u/25);
   if(best.r>=.08)why(R,'meta',s,best.tag==='all'?N_('On {0}% of the tournament teams with {1}'):N_('On {0}% of the {2} tournament teams with {1}'),[Math.round(best.r*100),best.m,{style:best.tag}]);
   else if(u>=8)why(R,'meta',s*.6,N_('Used by {0}% of tournament teams'),[u]);
   return s;}}
 var su=clamp(u/25);if(u>=5)why(R,'meta',su,N_('Used by {0}% of tournament teams'),[u]);return su;}

function typeScore(c,p,T,R){var ab=p.main,ty=types(c),gain=0,pen=0,good=[],imm=[],bad=[];
 TYPES.forEach(function(t){var x=mult(t,ty,ab);
  if(T.need[t]&&x<1){gain+=T.need[t]*(x===0?1.25:1);(x===0?imm:good).push(t);}
  if(T.weak[t]&&x>1){pen+=(T.need[t]||.25*T.weak[t])*(x>=4?1.5:1);if(T.need[t])bad.push(t);}});
 var byNeed=function(a,b){return T.need[b]-T.need[a]},uncovered=TYPES.filter(function(d){return !T.covered[d]}),
  at=attackTypes(c,p),fresh=uncovered.filter(function(d){return at.some(function(a){return te(a,d)>1})});
 var def=clamp(.5+(gain-pen)/(T.total+2)),off=uncovered.length?clamp(fresh.length/Math.min(uncovered.length,4)):0;
 if(imm.length)why(R,'type',def+.05,N_('Immune to {0}, which your team is weak to'),[{types:imm.sort(byNeed).slice(0,3)}]);
 if(good.length)why(R,imm.length?'type2':'type',def,N_('Resists {0}, which your team is weak to'),[{types:good.sort(byNeed).slice(0,3)}]);
 if(fresh.length)why(R,'offense',off*.6,N_('Can hit {0} super effectively, which your team cannot yet'),[{types:fresh.slice(0,3)}]);
 if(bad.length)why(R,'weak',pen,N_('Adds to your weakness to {0}'),[{types:bad.sort(byNeed).slice(0,3)}],true);
 return .75*def+.25*off;}

function styleScore(c,p,ms,type,R){var S=STYLE[type],d=DEX[c],spe=d.bs.sp,conflict=false,role=0;
 var has=hasAny(ms,S.mv,S.ab),setter=0,via='';
 /* a way to set up the team type counts only if the Pokémon really uses it (at least a quarter of its sets) */
 S.ab.forEach(function(a){var u=abShare(c,p,a),v=u>=25?clamp(u/60):0;if(v>setter){setter=v;via=a;}});
 S.mv.forEach(function(m){var u=mvShare(p,m),v=u>=25?clamp(u/50)*(S.ab.length?.5:1):0;if(v>setter){setter=v;via=m;}});
 var learn=!setter&&p.src==='none'&&S.mv.filter(function(m){return canLearn(c,m)})[0];if(learn){setter=.2;via=learn;}
 var use=0,useWhy=null,note=function(v,text,args){if(v>use){use=v;useWhy=[text,args];}};
 if(type==='tr'){if(spe<=50)note(.9,N_('Very slow (base Speed {0}): it moves early under Trick Room'),[spe]);else if(spe<=70)note(.6,N_('Slow (base Speed {0}): it benefits from Trick Room'),[spe]);
  else if(spe>=95)why(R,'fast',.4,N_('Fast (base Speed {0}): it moves late under Trick Room'),[spe],true);}
 else if(type==='tw'){if(spe>=60&&spe<=115&&Math.max(d.bs.at,d.bs.sa)>=100)note(.7,N_('Strong attacker that gets much faster under Tailwind (base Speed {0})'),[spe]);}
 else{(S.use||[]).forEach(function(a){if(abShare(c,p,a)>=30)note(.8,N_('Gets stronger in this weather thanks to {0}'),[a]);});
  (S.umv||[]).forEach(function(m){if(mvShare(p,m)>=30)note(.5,N_('Uses {0}, which this weather improves'),[m]);});
  if(S.boost&&types(c).indexOf(S.boost)>=0)note(.45,N_('Its {0} type benefits from this weather'),[{types:[S.boost]}]);
  if(S.hurt&&types(c).indexOf(S.hurt)>=0)why(R,'hurt',.3,N_('This weather weakens its {0} moves'),[{types:[S.hurt]}],true);
  Object.keys(STYLE).forEach(function(o){if(o===type)return;STYLE[o].ab.forEach(function(a){if(abShare(c,p,a)>=50){conflict=true;why(R,'conflict',2,N_('Brings other weather ({0}) that would replace yours'),[a],true);}});});}
 if(!has){role=Math.max(setter,use*.5);if(setter>0)why(R,'style',.6+setter,learn?N_('Can learn {0} to set up your team type (no tournament sets for it)'):N_('Sets up your team type with {0}'),[via]);}
 else{role=Math.max(use,setter*.4);if(setter>=.5&&!use)why(R,'style',setter*.4,N_('Second way to set up your team type ({0})'),[via]);}
 if(useWhy)why(R,has?'style':'style2',use,useWhy[0],useWhy[1]);
 var s=role,i=IX[c];
 if(DATA&&DATA.n[type]>=20){var share=(i===undefined?0:DATA.solo[type][i]||0)/DATA.n[type];s=.65*role+.35*clamp(share/.3);
  if(share>=.1)why(R,'share',share+.3,N_('On {0}% of {1} teams in tournaments'),[Math.round(share*100),{style:type}]);}
 return{s:conflict?0:s,conflict:conflict};}

function roleScore(c,p,ms,type,R){var sum=0;
 ROLES.forEach(function(r){var mv=r.mv;
  if(r.id==='speed'){if(type==='tr')return;if(type==='tw')mv=mv.filter(function(m){return m!=='Trick Room'});}
  if(hasAny(ms,r.id==='speed'?r.mv:mv,r.ab))return;
  var best=0,via='';mv.forEach(function(m){var s=mvShare(p,m);if(s>best){best=s;via=m;}});(r.ab||[]).forEach(function(a){var s=abShare(c,p,a);if(s>best){best=s;via=a;}});
  if(best>=25){var v=r.w*clamp(best/60);sum+=v;why(R,'role-'+r.id,v*.8,r.why,[via]);}
  else if(p.src==='none'){var l=mv.filter(function(m){return canLearn(c,m)})[0];if(l){sum+=r.w*.15;why(R,'role-'+r.id,r.w*.1,N_('Can learn {0} (no tournament sets for it)'),[l]);}}});
 var red=['Follow Me','Rage Powder'].filter(function(m){return mvShare(p,m)>=25})[0];
 if(red)ms.some(function(m){var s=m.mv.filter(function(x){return SETUP.indexOf(x)>=0})[0];if(!s)return false;sum+=.5;why(R,'combo',.7,N_('{0} can protect {1} while it uses {2}'),[red,m.name,s]);return true;});
 ms.some(function(m){var a=m.mv.filter(function(x){return ALLY[x]&&mult(ALLY[x],types(c),p.main)===0})[0];if(!a)return false;sum+=.6;why(R,'ally',.8,N_('Immune to {0} from your {1}, which also hits partners'),[a,m.name]);return true;});
 var ph=0,sp=0;ms.forEach(function(m){m.mv.forEach(function(x){if(!isDamage(x))return;if(MV[x].category==='Physical')ph++;else sp++;});});
 if(ph+sp>=3){var cp=0,cs=0;Object.keys(p.mv).forEach(function(x){if(!isDamage(x))return;if(MV[x].category==='Physical')cp+=p.mv[x];else cs+=p.mv[x];});
  if(!cp&&!cs){cp=DEX[c].bs.at>DEX[c].bs.sa+15?1:0;cs=DEX[c].bs.sa>DEX[c].bs.at+15?1:0;}
  if(ph/(ph+sp)>=.75&&cs>cp){sum+=.5;why(R,'balance',.45,N_('Adds special attacks: your moves are mostly physical'));}
  if(sp/(ph+sp)>=.75&&cp>cs){sum+=.5;why(R,'balance',.45,N_('Adds physical attacks: your moves are mostly special'));}}
 return clamp(sum/2);}

/* the three strongest reasons (one per kind), plus the most important drawback */
function pickReasons(R){var seen={},good=[],bad=null;
 R.slice().sort(function(a,b){return b.w-a.w}).forEach(function(r){if(r.warn){if(!bad)bad=r;return;}if(good.length<3&&!seen[r.cat]){seen[r.cat]=1;good.push(r);}});
 return bad?good.concat([bad]):good;}

function pool(){var o={};Object.keys(TD).forEach(function(n){if(DEX[n]&&TD[n].u>=.5)o[n]=1;});if(DATA)DATA.mons.forEach(function(n){if(DEX[n])o[n]=1;});return Object.keys(o);}

function evaluate(c,ms,type,T){var p=profile(c),R=[],parts={},conflict=false;
 parts.meta=metaScore(c,ms,type,R);
 if(ms.length){parts.type=typeScore(c,p,T,R);parts.roles=roleScore(c,p,ms,type,R);}
 if(type!=='none'){var st=styleScore(c,p,ms,type,R);parts.style=st.s;conflict=st.conflict;}
 var sum=0,w=0;Object.keys(parts).forEach(function(k){sum+=parts[k]*WEIGHTS[k];w+=WEIGHTS[k];});
 var total=w?sum/w:0,megas=ms.filter(function(m){return isMega(m.name)}).length;
 if(conflict)total*=.6;
 if(isMega(c)&&megas>=2){total*=.6;why(R,'mega',3,N_('Your team already has {0} Mega Pokémon, and only one can Mega Evolve per battle'),[megas],true);}
 var reasons=pickReasons(R);
 if(!reasons.some(function(r){return !r.warn}))reasons.unshift({cat:'meta',w:0,k:N_('Used by {0}% of tournament teams'),a:[usage(c)],warn:false});
 return{name:c,score:Math.round(total*100),parts:parts,reasons:reasons,total:total};}

function suggest(team,limit){var type=has(STYLE,team.type)?team.type:'none',ms=members(team.slots),T=analyse(ms),taken={};
 ms.forEach(function(m){taken[m.key]=1;});
 var all=pool().filter(function(n){return !taken[baseKey(n)]}).map(function(n){return evaluate(n,ms,type,T)});
 all.sort(function(a,b){return b.total-a.total||usage(b.name)-usage(a.name)||a.name.localeCompare(b.name)});
 var out=[],seen={};for(var i=0;i<all.length&&out.length<(limit||8);i++){var k=baseKey(all[i].name);if(!seen[k]){seen[k]=1;out.push(all[i]);}}
 return out;}

/* rule problems of the team the user typed */
function problems(slots){var out=[],sp={},it={},megas=0;
 (slots||[]).forEach(function(s,i){if(!s||!s.sp)return;if(!has(DEX,s.sp)){out.push({k:N_('Slot {0}: pick a Pokémon from the list.'),a:[i+1]});return;}
  var n=effName(s.sp,s.it),key=baseKey(n);if(sp[key])out.push({k:N_('{0} is on the team twice.'),a:[key]});sp[key]=1;if(isMega(n))megas++;
  if(s.it){if(it[s.it])out.push({k:N_('Two Pokémon hold {0}.'),a:[s.it]});it[s.it]=1;}
  var mv={};(s.mv||[]).forEach(function(m){if(!m)return;if(!has(MV,m))out.push({k:N_('{0}: “{1}” is not a move in this game.'),a:[s.sp,m]});else{if(!canLearn(s.sp,m)&&!canLearn(n,m))out.push({k:N_('{0} cannot learn {1}.'),a:[s.sp,m]});if(mv[m])out.push({k:N_('{0} has {1} twice.'),a:[s.sp,m]});mv[m]=1;}});
  var t=0;['hp','at','df','sa','sd','sp'].forEach(function(k){t+=(s.pts&&+s.pts[k])||0;});if(t>66)out.push({k:N_('{0} uses {1} Stat Points (the limit is 66).'),a:[s.sp,t]});});
 if(megas>2)out.push({k:N_('{0} Mega Pokémon: only one can Mega Evolve per battle.'),a:[megas]});
 return out;}

G.TEAM={STYLES:STYLES,WEIGHTS:WEIGHTS,suggest:suggest,members:members,analyse:analyse,problems:problems,effName:effName,baseKey:baseKey,mult:mult,setData:setData,data:function(){return DATA},pool:pool};
})(typeof window!=='undefined'?window:globalThis);
