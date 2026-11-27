
/* EVSmith damage engine — scritto da zero (livello 50, doppi, Pokémon Champions).
   Usa i dati di gioco di data.js. Le regole seguono il calcolo standard dei danni (Gen 9). */
(function(G){
'use strict';
var TYPES=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
var CH=["111111111111h011h1","1hh122111112h1h121","12h1h111211121h111","112hh111021111h111","1h21h11h2h1h21h1h1","1hh12h1122111121h1","2111121h1hhh20122h","1111211hh111hh1102","1212h112101h211121","111h21211112h111h1","1111112211h11110h1","1h1121hh1h211h12hh","121112h1h2121111h1","011111111121121h11","1111111111111121h0","111111h11121121h1h","1hhh121111112111h2","1h11112h11111122h1"];
function te(a,d){var i=TYPES.indexOf(a),j=TYPES.indexOf(d);if(i<0||j<0)return 1;var c=CH[i][j];return c==='2'?2:c==='h'?.5:c==='0'?0:1;}
var DEX=G.POKEDEX_CHAMPIONS,MV=G.MOVES_CHAMPIONS,NAT=G.NATURES,LOCK=G.LOCK_ITEM_LOOKUP;
var K5=['at','df','sa','sd','sp'];
function natMod(n,k){var m=NAT[n]||['',''];return m[0]===m[1]?1:(m[0]===k?1.1:(m[1]===k?0.9:1));}
function statOf(b,sp,nat,k){return Math.floor(((Math.floor((b*2+31)*50/100)+5)+sp)*natMod(nat,k));}
function hpOf(b,sp){return b===1?1:Math.floor((b*2+31)*50/100)+50+10+sp;}
function stg(s){return s>=0?(2+s)/2:2/(2-s);}
function rnd(x){return x%1>0.5?Math.ceil(x):Math.floor(x);}
function am(v,m){return rnd(v*m/4096);}
function chain(list){var m=4096;list.forEach(function(x){m=(m*x+2048)>>12;});return m;}
/* abilities that need a battle situation: turned on by hand (Blaze-type at 1/3 HP or less, Flash Fire after absorbing Fire, Stakeout vs a Pokémon that just came in, Electromorphosis charged) */
var LOWHP={Blaze:'Fire',Torrent:'Water',Overgrow:'Grass',Swarm:'Bug'},OVERLORD=[4096,4506,4915,5325,5734,6144];
var BERRY={Occa:'Fire',Passho:'Water',Wacan:'Electric',Rindo:'Grass',Yache:'Ice',Chople:'Fighting',Kebia:'Poison',Shuca:'Ground',Coba:'Flying',Payapa:'Psychic',Tanga:'Bug',Charti:'Rock',Kasib:'Ghost',Haban:'Dragon',Colbur:'Dark',Babiri:'Steel',Roseli:'Fairy',Chilan:'Normal'};
var TYPEITEM={'Silver Powder':'Bug','Metal Coat':'Steel','Soft Sand':'Ground','Hard Stone':'Rock','Miracle Seed':'Grass','Black Glasses':'Dark','Black Belt':'Fighting','Magnet':'Electric','Mystic Water':'Water','Sharp Beak':'Flying','Poison Barb':'Poison','Never-Melt Ice':'Ice','Spell Tag':'Ghost','Twisted Spoon':'Psychic','Charcoal':'Fire','Dragon Fang':'Dragon','Silk Scarf':'Normal','Fairy Feather':'Fairy'};
var CRASH={'High Jump Kick':1,'Jump Kick':1,'Supercell Slam':1,'Axe Kick':1};
var ATE={Aerilate:'Flying',Pixilate:'Fairy',Refrigerate:'Ice',Dragonize:'Dragon'};
var WSET={Drought:'Sun',Drizzle:'Rain','Sand Stream':'Sand','Snow Warning':'Snow'}; /* Sand Spit and Seed Sower only trigger when hit: choose them by hand */
var TSET={'Electric Surge':'Electric','Grassy Surge':'Grassy','Psychic Surge':'Psychic','Misty Surge':'Misty'};
/* abilità dei difensori che Mold Breaker ignora */
var IGN={Levitate:1,'Volt Absorb':1,'Lightning Rod':1,'Motor Drive':1,'Water Absorb':1,'Dry Skin':1,'Flash Fire':1,'Sap Sipper':1,'Earth Eater':1,Soundproof:1,Bulletproof:1,Multiscale:1,Filter:1,'Solid Rock':1,'Fur Coat':1,'Thick Fat':1,Heatproof:1,'Water Bubble':1,'Marvel Scale':1,'Punk Rock':1,'Purifying Salt':1,Fluffy:1,Unaware:1,'Grass Pelt':1,'Heavy Metal':1,'Light Metal':1,'Shell Armor':1,'Battle Armor':1,'Friend Guard':1,'Mirror Armor':1,'Clear Body':1,'White Smoke':1,'Hyper Cutter':1,'Aura Guard':1};
var NO_INTI={'Clear Body':1,'White Smoke':1,'Full Metal Body':1,'Hyper Cutter':1,'Inner Focus':1,Oblivious:1,'Own Tempo':1,Scrappy:1};

function mkMove(n,o){var d=MV[n]||{type:'Normal',category:'Status',bp:0},m={};for(var k in d)m[k]=d[k];m.name=n;
 var hr=d.hitRange,h=1;if(typeof hr==='number')h=hr;else if(hr&&hr.length===2)h=3;m.hits=h;m.crit=false;
 if(o){if(o.crit)m.crit=true;if(+o.hits)m.hits=+o.hits;}return m;}
function mkPoke(c){var d=DEX[c.name],p={name:c.name};p.t1=d.t1;p.t2=d.t2||'';p.types=[d.t1].concat(d.t2?[d.t2]:[]);
 var s=c.sp||{};p.sps={hp:s.hp||0,at:s.at||0,df:s.df||0,sa:s.sa||0,sd:s.sd||0,sp:s.sp||0};
 p.nature=c.nature||'Hardy';p.maxHP=hpOf(d.bs.hp,p.sps.hp);p.curHP=p.maxHP;
 p.rawStats={};p.boosts={};K5.forEach(function(k){p.rawStats[k]=statOf(d.bs[k],p.sps[k],p.nature,k);p.boosts[k]=(c.boosts&&c.boosts[k])||0;});
 p.ab=c.ability||d.ab||'';p.ability=p.ab;var lk=LOCK[c.name];p.item=lk!==undefined?lk:(c.item||'');
 p.status=c.status||'Healthy';p.weight=d.w||1;p.abOn=!!c.abOn;p.fainted=Math.max(0,Math.min(5,+c.fainted||0));
 var ms=(c.moves||[]).map(function(x){return typeof x==='string'?mkMove(x):mkMove(x.name,x)});p.moves=ms;return p;}

var FIELD={};
function mkField(o){FIELD=o||{};return FIELD;}
function sideOn(k,s){return !!FIELD[k+s];}
/* clima/terreno: manuale oppure automatico dalle abilità (vince il più lento) */
function rawSpeed(p){return p.rawStats.sp;}
function resolve(me,opp){
 var W=FIELD.weather,T=FIELD.terrain,ps=[me,opp];
 function auto(map){var c=ps.filter(function(p){return map[p.ab]});if(!c.length)return '';if(c.length===1)return map[c[0].ab];
  var slow=rawSpeed(me)<rawSpeed(opp)?me:(rawSpeed(opp)<rawSpeed(me)?opp:opp);return map[slow.ab];}
 var cn=ps.some(function(p){return p.ab==='Cloud Nine'||p.ab==='Air Lock'});
 return{weather:(W==='auto'||W===undefined)?auto(WSET):W,terrain:(T==='auto'||T===undefined)?auto(TSET):T,cn:cn};}
function effB(p,k){return Math.max(-6,Math.min(6,p.boosts[k]||0));}
function inti(src,tgt,bounced){ /* Intimidate */
 if(src.ab!=='Intimidate')return;
 if(tgt.ab==='Mirror Armor'&&!bounced){inti({ab:'Intimidate'},src,true);return;}
 if(NO_INTI[tgt.ab])return;
 var d=tgt.ab==='Contrary'?1:tgt.ab==='Simple'?-2:tgt.ab==='Guard Dog'?1:-1;
 tgt.boosts.at=Math.max(-6,Math.min(6,(tgt.boosts.at||0)+d));
 if(d<0&&tgt.ab==='Defiant')tgt.boosts.at=Math.min(6,tgt.boosts.at+2);
 if(d<0&&tgt.ab==='Competitive')tgt.boosts.sa=Math.min(6,(tgt.boosts.sa||0)+2);}
function speedOf(p,ctx,side){var s=Math.floor(p.rawStats.sp*stg(p.boosts.sp||0));
 if(p.item==='Choice Scarf')s=am(s,6144);
 var w=ctx.cn?'':ctx.weather;
 if((p.ab==='Swift Swim'&&w==='Rain')||(p.ab==='Chlorophyll'&&w==='Sun')||(p.ab==='Sand Rush'&&w==='Sand')||(p.ab==='Slush Rush'&&w==='Snow'))s*=2;
 if(sideOn('tailwind',side))s=s*2;
 if(p.ab==='Surge Surfer'&&ctx.terrain==='Electric')s*=2;
 if(p.ab==='Quick Feet'&&p.status!=='Healthy')s=am(s,6144);else if(p.status==='Paralyzed')s=Math.floor(s/2);
 if(p.item==='Iron Ball')s=Math.floor(s/2);
 return s;}
function grounded(p,abIgnored){return p.types.indexOf('Flying')<0&&(abIgnored?true:(p.ab!=='Levitate'&&p.ab!=='Eelevate'))&&p.item!=='Air Balloon';}

function oneHit(a,d,mv,ctx,aSide,hitNo,crit,child){
 var dSide=aSide==='L'?'R':'L',abA=a.ab,abD=d.ab;
 if(abA==='Mold Breaker'&&IGN[abD])abD='';
 var wx=ctx.cn?'':ctx.weather;if(abA==='Mega Sol')wx='Sun';
 var tr=ctx.terrain,type=mv.type,bp=mv.bp,cat=mv.category,physical=cat==='Physical',notes=[];
 /* tipo della mossa */
 if(mv.name==='Weather Ball'){bp=wx?100:50;type={Sun:'Fire',Rain:'Water',Sand:'Rock',Snow:'Ice'}[wx]||'Normal';}
 if(mv.name==='Terrain Pulse'&&tr&&grounded(a,false)){bp=100;type={Electric:'Electric',Grassy:'Grass',Misty:'Fairy',Psychic:'Psychic'}[tr];}
 if(mv.name==='Raging Bull'&&/^Tauros-Paldea/.test(a.name)){type=/Aqua/.test(a.name)?'Water':/Blaze/.test(a.name)?'Fire':'Fighting';}
 if(mv.name==='Aura Wheel'&&/^Morpeko/.test(a.name))type=/Hangry/.test(a.name)?'Dark':'Electric';
 if(mv.name==='Revelation Dance'&&/^Oricorio/.test(a.name))type=a.types[0];
 var ate=false;if(type==='Normal'&&ATE[abA]&&!/^(Judgment|Multi-Attack|Natural Gift|Revelation Dance|Techno Blast|Terrain Pulse|Weather Ball)$/.test(mv.name)){type=ATE[abA];ate=true;}
 if(abA==='Liquid Voice'&&mv.isSound)type='Water';
 var aTypes=(abA==='Libero'||abA==='Protean')?[type]:a.types;
 /* immunità */
 var imm=false;
 if((abD==='Levitate'||abD==='Eelevate')&&type==='Ground')imm=true;
 if(d.item==='Air Balloon'&&type==='Ground')imm=true;
 if((abD==='Volt Absorb'||abD==='Lightning Rod'||abD==='Motor Drive')&&type==='Electric')imm=true;
 if((abD==='Water Absorb'||abD==='Dry Skin')&&type==='Water')imm=true;
 if(abD==='Flash Fire'&&type==='Fire')imm=true;
 if(abD==='Sap Sipper'&&type==='Grass')imm=true;
 if(abD==='Earth Eater'&&type==='Ground')imm=true;
 if(abD==='Soundproof'&&mv.isSound)imm=true;
 if(abD==='Bulletproof'&&mv.isBullet)imm=true;
 if(imm)return{r:null,notes:[abD||d.item]};
 if(mv.isPriority&&((tr==='Psychic'&&grounded(d,abA==='Mold Breaker'))||abD==='Armor Tail'||abD==='Queenly Majesty'||abD==='Dazzling'))return{r:null,notes:[]};
 if(abD==='Damp'||abA==='Damp'){if(/^(Self-Destruct|Explosion|Mind Blown|Misty Explosion)$/.test(mv.name))return{r:null,notes:[]};}
 /* efficacia */
 var eff=1;d.types.forEach(function(t){var x=te(type,t);
  if(mv.name==='Freeze-Dry'&&t==='Water')x=2;
  if(x===0&&(mv.name==='Future Sight'||mv.name==='Doom Desire'))x=1;
  if(x===0&&abA==='Scrappy'&&t==='Ghost'&&(type==='Normal'||type==='Fighting'))x=1;
  if(mv.name==='Thousand Arrows'&&t==='Flying')x=1;
  if(mv.name==='Flying Press')x*=te('Flying',t);
  eff*=x;});
 if(eff===0)return{r:null,notes:[]};
 /* potenza base speciale */
 var n=mv.name,dst=d.status!=='Healthy';
 if(n==='Facade'&&a.status!=='Healthy'&&a.status!=='Asleep'&&a.status!=='Frozen')bp*=2;
 if((n==='Hex'||n==='Infernal Parade')&&dst)bp*=2;
 if((n==='Venoshock'||n==='Barb Barrage')&&(d.status==='Poisoned'||d.status==='Badly Poisoned'))bp*=2;
 var bm=[];
 if(n==='Knock Off'&&d.item&&!/ite( [XYZ])?$/.test(d.item)&&d.item!=='Leek')bm.push(6144);
 if(n==='Acrobatics'&&!a.item)bp*=2;
 if(n==='Rising Voltage'&&tr==='Electric'&&grounded(d,abA==='Mold Breaker'))bm.push(8192);
 if(n==='Expanding Force'&&tr==='Psychic'&&grounded(a,false))bm.push(6144);
 if(n==='Low Kick'||n==='Grass Knot'){var w=d.weight*(abD==='Heavy Metal'?2:abD==='Light Metal'?.5:1);bp=w<10?20:w<25?40:w<50?60:w<100?80:w<200?100:120;}
 if(n==='Heavy Slam'||n==='Heat Crash'){var wa=a.weight*(abA==='Heavy Metal'?2:abA==='Light Metal'?.5:1),wd=d.weight*(abD==='Heavy Metal'?2:abD==='Light Metal'?.5:1),r=wa/wd;bp=r>=5?120:r>=4?100:r>=3?80:r>=2?60:40;}
 if(a.abOn&&LOWHP[abA]&&(n==='Eruption'||n==='Water Spout'||n==='Dragon Energy')){bp=Math.max(1,Math.floor(150*Math.floor(a.maxHP/3)/a.maxHP));} /* at 1/3 HP these moves lose power */
 if(n==='Gyro Ball')bp=Math.min(150,Math.floor(25*ctx.dSpeed/Math.max(1,ctx.aSpeed))+1);
 if(n==='Electro Ball'){var q=ctx.aSpeed/Math.max(1,ctx.dSpeed);bp=q>=4?150:q>=3?120:q>=2?80:q>=1?60:40;}
 if(n==='Stored Power'||n==='Power Trip'){var pb=0;K5.forEach(function(k){if(a.boosts[k]>0)pb+=a.boosts[k]});bp=20+20*pb;}
 if(n==='Solar Beam'||n==='Solar Blade'){if(wx&&wx!=='Sun'&&abA!=='Mega Sol')bm.push(2048);}
 if((n==='Earthquake'||n==='Bulldoze'||n==='Magnitude')&&tr==='Grassy'&&grounded(d,abA==='Mold Breaker'))bm.push(2048);
 if(n==='Misty Explosion'&&tr==='Misty'&&grounded(a,false))bm.push(6144);
 if(n==='Triple Axel')bp=20*hitNo;if(n==='Triple Kick')bp=10*hitNo;
 /* danno fisso */
 if(n==='Seismic Toss'||n==='Night Shade')return{r:[50],fixed:true,notes:[]};
 if(n==='Dragon Rage')return{r:[40],fixed:true,notes:[]};
 if(n==='Sonic Boom')return{r:[20],fixed:true,notes:[]};
 if(n==='Super Fang'||n==="Nature's Madness"||n==='Ruination')return{r:[Math.max(1,Math.floor(d.curHP/2))],fixed:true,notes:[]};
 /* modificatori della potenza */
 if(FIELD['helpingHand'+aSide]){bm.push(6144);notes.push('Helping Hand');}
 if(abA==='Analytic'&&ctx.aSpeed<=ctx.dSpeed){bm.push(5325);notes.push(abA);}
 if(abA==='Steely Spirit'&&type==='Steel'){bm.push(6144);notes.push(abA);}
 if(abA==='Supreme Overlord'&&a.fainted>0){bm.push(OVERLORD[a.fainted]);notes.push(abA+' '+a.fainted);}
 if(abA==='Electromorphosis'&&a.abOn&&type==='Electric'){bm.push(8192);notes.push('Charge');}
 if(abA==='Technician'&&bp<=60){bm.push(6144);notes.push(abA);}
 if(abA==='Iron Fist'&&mv.isPunch){bm.push(4915);notes.push(abA);}
 if(abA==='Strong Jaw'&&mv.isBite){bm.push(6144);notes.push(abA);}
 if(abA==='Tough Claws'&&mv.makesContact){bm.push(5325);notes.push(abA);}
 if(abA==='Reckless'&&(mv.recoilHP||CRASH[n])){bm.push(4915);notes.push(abA);}
 if(abA==='Sharpness'&&mv.isSlice){bm.push(6144);notes.push(abA);}
 if(abA==='Mega Launcher'&&mv.isPulse){bm.push(6144);notes.push(abA);}
 if(abA==='Punk Rock'&&mv.isSound){bm.push(5325);notes.push(abA);}
 if(abA==='Sheer Force'&&mv.hasSecondaryEffect){bm.push(5325);notes.push(abA);}
 if(abA==='Sand Force'&&wx==='Sand'&&(type==='Rock'||type==='Ground'||type==='Steel')){bm.push(5325);notes.push(abA);}
 if(ate){bm.push(4915);notes.push(abA);}
 if(type==='Fairy'&&(abA==='Fairy Aura'||d.ab==='Fairy Aura')){bm.push(5448);notes.push('Fairy Aura');}
 if(physical&&a.item==='Muscle Band'||!physical&&a.item==='Wise Glasses'){bm.push(4505);notes.push(a.item);}
 if(a.item==='Normal Gem'&&type==='Normal'){bm.push(5325);notes.push('Normal Gem');}
 if(TYPEITEM[a.item]===type){bm.push(4915);notes.push(a.item);}
 if(tr==='Electric'&&type==='Electric'&&grounded(a,false)){bm.push(5325);notes.push('Electric Terrain');}
 if(tr==='Grassy'&&type==='Grass'&&grounded(a,false)){bm.push(5325);notes.push('Grassy Terrain');}
 if(tr==='Psychic'&&type==='Psychic'&&grounded(a,false)){bm.push(5325);notes.push('Psychic Terrain');}
 if(tr==='Misty'&&type==='Dragon'&&grounded(d,abA==='Mold Breaker')){bm.push(2048);notes.push('Misty Terrain');}
 if(abD==='Dry Skin'&&type==='Fire'){bm.push(5120);}
 bp=Math.max(1,am(bp,chain(bm)));
 /* attacco */
 var atkP=a,atkK=physical?'at':'sa',defK=(physical||mv.dealsPhysicalDamage)?'df':'sd';
 if(n==='Foul Play'){atkP=d;atkK='at';}else if(n==='Body Press')atkK='df';
 var ab=effB(atkP,atkK);if(n==='Electro Shot'||n==='Meteor Beam')ab=Math.min(6,ab+1);if(crit&&ab<0)ab=0;if(abD==='Unaware'&&atkP===a)ab=0;
 var atk=Math.floor(atkP.rawStats[atkK]*stg(ab)),am_=[];
 var atkAb=a.ab;
 if(physical&&(atkAb==='Huge Power'||atkAb==='Pure Power')){am_.push(8192);notes.push(atkAb);}
 if(physical&&atkAb==='Hustle'){am_.push(6144);notes.push(atkAb);}
 if(a.abOn&&((LOWHP[atkAb]&&LOWHP[atkAb]===type)||(atkAb==='Flash Fire'&&type==='Fire'))){am_.push(6144);notes.push(atkAb);}
 if(a.abOn&&atkAb==='Stakeout'){am_.push(8192);notes.push(atkAb);}
 if(physical&&atkAb==='Guts'&&a.status!=='Healthy'){am_.push(6144);notes.push(atkAb);}
 if(!physical&&atkAb==='Solar Power'&&wx==='Sun'){am_.push(6144);notes.push(atkAb);}
 if(atkAb==='Fire Mane'&&type==='Fire'){am_.push(6144);notes.push(atkAb);}
 if(atkAb==='Water Bubble'&&type==='Water'){am_.push(8192);notes.push(atkAb);}
 if(a.item==='Light Ball'&&/^Pikachu/.test(a.name)){am_.push(8192);notes.push('Light Ball');}
 if(abD==='Thick Fat'&&(type==='Fire'||type==='Ice'))am_.push(2048);
 if(abD==='Heatproof'&&type==='Fire')am_.push(2048);
 if(abD==='Water Bubble'&&type==='Fire')am_.push(2048);
 if(abD==='Purifying Salt'&&type==='Ghost')am_.push(2048);
 atk=Math.max(1,am(atk,chain(am_)));
 /* difesa */
 var dm=[],dn=[];
 var db=effB(d,defK);if((d.item==='Grassy Seed'&&tr==='Grassy'&&defK==='df')||(d.item==='Electric Seed'&&tr==='Electric'&&defK==='df')||(d.item==='Misty Seed'&&tr==='Misty'&&defK==='sd')||(d.item==='Psychic Seed'&&tr==='Psychic'&&defK==='sd')){db=Math.min(6,db+1);dn.push(d.item);}if(crit&&db>0)db=0;if(abA==='Unaware'||mv.ignoresDefenseBoosts)db=0;
 var def=Math.floor(d.rawStats[defK]*stg(db));
 if(wx==='Sand'&&d.types.indexOf('Rock')>=0&&defK==='sd')dm.push(6144);
 if(wx==='Snow'&&d.types.indexOf('Ice')>=0&&defK==='df')dm.push(6144);
 if(defK==='df'&&abD==='Marvel Scale'&&dst){dm.push(6144);dn.push(abD);}
 if(defK==='df'&&abD==='Fur Coat'){dm.push(8192);dn.push(abD);}
 if(defK==='df'&&abD==='Grass Pelt'&&tr==='Grassy'){dm.push(6144);dn.push(abD);}
 def=Math.max(1,am(def,chain(dm)));
 /* danno base */
 var base=Math.floor(Math.floor(Math.floor(2*50/5+2)*bp*atk/def)/50)+2;
 if((mv.isSpread||(n==='Expanding Force'&&tr==='Psychic'&&grounded(a,false)))&&FIELD.spread!==false)base=am(base,3072);
 if(child)base=am(base,1024); /* Parental Bond's second hit: 25% of the base damage, before the random roll */
 if((wx==='Sun'&&type==='Fire')||(wx==='Rain'&&type==='Water'))base=am(base,6144);
 else if((wx==='Sun'&&type==='Water')||(wx==='Rain'&&type==='Fire'))base=am(base,2048);
 if(crit)base=am(base,6144);
 /* modificatori finali */
 var stab=4096;if(aTypes.indexOf(type)>=0)stab=abA==='Adaptability'?8192:6144;
 var burn=a.status==='Burned'&&physical&&abA!=='Guts'&&!mv.ignoresBurn;
 var fm=[];
 var scr=!crit&&abA!=='Infiltrator'&&!mv.ignoresScreens;
 if(scr&&(sideOn('auroraVeil',dSide)||(physical&&sideOn('reflect',dSide))||(!physical&&sideOn('lightScreen',dSide))))fm.push(2732);
 if(sideOn('friendGuard',dSide)&&abA!=='Mold Breaker')fm.push(3072);
 if(abD==='Multiscale'&&hitNo===1&&d.curHP===d.maxHP){fm.push(2048);dn.push(abD);}
 if((abD==='Fluffy'||abD==='Aura Guard')&&mv.makesContact)fm.push(2048);
 if(abD==='Fluffy'&&type==='Fire')fm.push(8192);
 if(abD==='Punk Rock'&&mv.isSound)fm.push(2048);
 if((abD==='Filter'||abD==='Solid Rock')&&eff>1){fm.push(3072);dn.push(abD);}
 if(a.item==='Life Orb'){fm.push(5324);notes.push('Life Orb');}
 if(a.item==='Expert Belt'&&eff>1){fm.push(4915);notes.push('Expert Belt');}
 if(crit&&abA==='Sniper')fm.push(6144);
 if((n==='Collision Course'||n==='Electro Drift')&&eff>1)fm.push(5461);
 var bt=d.item.replace(' Berry','');
 if(d.item&&/ Berry$/.test(d.item)&&hitNo===1&&BERRY[bt]===type&&abA!=='Unnerve'&&(eff>1||bt==='Chilan')){fm.push(d.ab==='Ripen'?1024:2048);dn.push(d.item);}
 var fmod=chain(fm),rolls=[];
 for(var i=0;i<16;i++){
  var x=Math.floor(base*(85+i)/100);
  if(stab!==4096)x=rnd(x*stab/4096);
  x=Math.floor(x*eff);
  if(burn)x=Math.floor(x/2);
  if(fmod!==4096)x=rnd(x*fmod/4096);
  rolls.push(Math.max(1,x));}
 return{r:rolls,notes:notes,dn:dn,type:type,eff:eff,atkK:atkK,defK:defK,ab:ab,wx:wx,tr:tr};}

function toBlade(a){var d=DEX['Aegislash-Blade'];if(!d)return a;var b=Object.assign({},a);b.rawStats={};K5.forEach(function(k){b.rawStats[k]=statOf(d.bs[k],a.sps[k],a.nature,k)});b.types=[d.t1].concat(d.t2?[d.t2]:[]);b.weight=d.w||a.weight;return b;}
function calcMove(a,d,mv,ctx,aSide){
 if(a&&a.name==='Aegislash'&&a.ab==='Stance Change'&&mv&&mv.category!=='Status'&&!mv._blade){a=toBlade(a);mv=Object.assign({},mv,{_blade:1});}
 if(mv&&(mv.name==='Shell Side Arm'||mv.name==='Photon Geyser')&&!mv._pick){
  var A_=function(p,k){return Math.floor(p.rawStats[k]*stg(effB(p,k)))};
  var phys=mv.name==='Photon Geyser'?A_(a,'at')>A_(a,'sa'):(A_(a,'at')/A_(d,'df'))>(A_(a,'sa')/A_(d,'sd'));
  mv=Object.assign({},mv,{category:phys?'Physical':'Special',_pick:1,makesContact:phys&&mv.name==='Shell Side Arm'?true:mv.makesContact});}
 var out={damage:[0],description:''};
 if(!mv||mv.category==='Status'||mv.name==='(No Move)')return out;
 var crit=mv.crit||!!mv.alwaysCrit||(a.ab==='Merciless'&&(d.status==='Poisoned'||d.status==='Badly Poisoned'));if(crit&&(d.ab==='Shell Armor'||d.ab==='Battle Armor')&&a.ab!=='Mold Breaker')crit=false;
 var hits=mv.hits||1;if(a.ab==='Skill Link'&&mv.hitRange&&mv.hitRange.length===2)hits=mv.hitRange[1];
 var tot=null,first=null,parts=[];
 var pb=a.ab==='Parental Bond'&&hits===1&&!mv.isSpread;if(pb)hits=2;
 for(var h=1;h<=hits;h++){
  var o=oneHit(a,d,mv,ctx,aSide,h,crit,pb&&h===2);
  if(!o.r){out.damage=[0];out.description=a.name+' '+mv.name+' vs. '+d.name+': no effect';return out;}
  if(!first)first=o;
  var rr=o.r;
  parts.push(rr.slice());tot=tot?tot.map(function(v,i){return v+(rr[i%rr.length])}):rr.slice();}
 out.damage=tot;out.parts=parts;
 var ak=first.atkK,pl=function(p,k){var m=NAT[p.nature]||['',''];return m[0]!==m[1]&&m[0]===k?'+':''};
 var lbl={at:'Atk',df:'Def',sa:'SpA',sd:'SpD',sp:'Spe'};
 var ap=(ak==='df'&&mv.name==='Body Press')?a:(mv.name==='Foul Play'?d:a);
 var dK=first.defK;
 out.description=(first.ab>0?'+'+first.ab+' ':first.ab<0?first.ab+' ':'')+ap.sps[ak]+pl(ap,ak)+' '+lbl[ak]+' '+first.notes.filter(function(x,i,s){return s.indexOf(x)===i}).join(' ')+' '+a.name+' '+mv.name+(hits>1?' ('+hits+' hits)':'')+(crit?' (crit)':'')+' vs. '+d.sps.hp+' HP / '+d.sps[dK]+pl(d,dK)+' '+lbl[dK]+' '+(first.dn||[]).join(' ')+' '+d.name+(first.wx?' in '+first.wx:'')+(first.tr?' on '+first.tr+' Terrain':'');
 out.description=out.description.replace(/\s+/g,' ');
 return out;}

function calc(me,opp){
 var NOTRACE={Trace:1,Imposter:1,'Neutralizing Gas':1,Receiver:1,'Power of Alchemy':1,Disguise:1,'Stance Change':1,Illusion:1};
 if(me.ab==='Trace'&&!NOTRACE[opp.ab])me.ab=opp.ab;else if(opp.ab==='Trace'&&!NOTRACE[me.ab])opp.ab=me.ab;
 var ctx=resolve(me,opp);
 [me,opp].forEach(function(p){if(p.ab==='Forecast'&&/^Castform/.test(p.name)&&!ctx.cn){var ft={Sun:'Fire',Rain:'Water',Snow:'Ice'}[ctx.weather];if(ft){p.types=[ft];p.t1=ft;p.t2='';}}});
 [me,opp].forEach(function(p){if(p.ab==='Mimicry'&&ctx.terrain){var t={Electric:'Electric',Grassy:'Grass',Misty:'Fairy',Psychic:'Psychic'}[ctx.terrain];if(t){p.types=[t];p.t1=t;p.t2='';}}});
 inti(me,opp);inti(opp,me);
 ctx.mySpeed=speedOf(me,ctx,'L');ctx.oppSpeed=speedOf(opp,ctx,'R');
 var res={mine:[],theirs:[],mySpeed:ctx.mySpeed,oppSpeed:ctx.oppSpeed};
 var c1={weather:ctx.weather,terrain:ctx.terrain,cn:ctx.cn,aSpeed:ctx.mySpeed,dSpeed:ctx.oppSpeed},c2={weather:ctx.weather,terrain:ctx.terrain,cn:ctx.cn,aSpeed:ctx.oppSpeed,dSpeed:ctx.mySpeed};
 me.moves.slice(0,1).forEach(function(m){res.mine.push(calcMove(me,opp,m,c1,'L'))});
 opp.moves.slice(0,1).forEach(function(m){res.theirs.push(calcMove(opp,me,m,c2,'R'))});
 if(!res.mine.length)res.mine.push({damage:[0],description:''});if(!res.theirs.length)res.theirs.push({damage:[0],description:''});
 return res;}
G.ENG={mkPoke:mkPoke,mkField:mkField,calc:calc,statOf:statOf,hpOf:hpOf,te:te,TYPES:TYPES};
})(typeof window!=='undefined'?window:globalThis);

