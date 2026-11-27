/* ---------- Teambuilding: interface ---------- */
(function(){
'use strict';
var U=window.EVUI,T=window.TEAM,A=window.ENG,DEX=POKEDEX_CHAMPIONS,tr=U.tr,esc=U.esc;
function N_(s){return s;}
function $i(id){return document.getElementById(id);}
var KEY='evsmith.team.v1',STATS=[['hp','HP'],['at','Atk'],['df','Def'],['sa','SpA'],['sd','SpD'],['sp','Spe']],MAX=6,MAXTEAMS=50,NAMELEN=40;
/* team is always the saved team being edited: store.teams[store.active] */
var store={active:0,teams:[newTeam()]},team=store.teams[0],last=[],listHtml='';

function has(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function isMon(n){return has(DEX,n);}
function blank(){return{sp:'',it:'',ab:'',na:'',mv:['','','',''],pts:{hp:0,at:0,df:0,sa:0,sd:0,sp:0}};}
function str(x,n){return typeof x==='string'?x.slice(0,n||40):'';}
function newTeam(){return{name:'',slots:[blank()]};}
/* storage can hold anything: keep only what the form can show (v1 held a single team without a name) */
function clean(raw){if(!raw||typeof raw!=='object')return null;
 var list=raw.v===1?[raw]:raw.v===2&&Array.isArray(raw.teams)?raw.teams:[];
 var teams=list.slice(0,MAXTEAMS).map(cleanTeam).filter(Boolean),a=Math.floor(+raw.active)||0;
 return teams.length?{active:a>=0&&a<teams.length?a:0,teams:teams}:null;}
function cleanTeam(raw){if(!raw||typeof raw!=='object'||!Array.isArray(raw.slots))return null;
 var slots=raw.slots.slice(0,MAX).map(function(s){var o=blank();if(!s||typeof s!=='object')return o;o.sp=str(s.sp);o.of=isMon(o.sp)?o.sp:str(s.of);o.it=str(s.it);o.ab=str(s.ab);o.na=has(NATURES,str(s.na))?str(s.na):'';
  o.mv=[0,1,2,3].map(function(i){return str(s.mv&&s.mv[i])});STATS.forEach(function(k){o.pts[k[0]]=points(s.pts&&s.pts[k[0]]);});return o;});
 return{name:str(raw.name,NAMELEN),slots:slots.length?slots:[blank()]};}
function points(v){v=Math.round(+v);return isFinite(v)?Math.max(0,Math.min(32,v)):0;}
function save(){try{window.localStorage.setItem(KEY,JSON.stringify({v:2,active:store.active,teams:store.teams}));}catch(e){}}

/* a new species starts empty: only what the game forces (Mega Stone, single ability) is filled in */
function setSpecies(name){var n=blank();n.sp=n.of=name;if(isMon(name)){var d=DEX[name];if(LOCK_ITEM_LOOKUP[name])n.it=LOCK_ITEM_LOOKUP[name];if(d.abs.length===1)n.ab=d.abs[0];}return n;}
function option(v,label,cur){return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(label)+'</option>';}
function acInput(i,f,kind,value,label,extra){return '<input class="ac" data-ac="'+kind+'" data-f="'+f+'" value="'+esc(value)+'" aria-label="'+esc(tr('{0}, slot {1}',[label,i+1]))+'" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="'+esc(label)+'"'+(extra||'')+'>';}
function statsOf(s){var n=T.effName(s.sp,s.it),d=DEX[n],o={};STATS.forEach(function(k){var b=d.bs[k[0]],p=s.pts[k[0]];o[k[0]]={base:b,v:k[0]==='hp'?A.hpOf(b,p):A.statOf(b,p,s.na||'Hardy',k[0])};});return o;}
function total(s){return STATS.reduce(function(t,k){return t+s.pts[k[0]]},0);}

function card(s,i){var d=isMon(s.sp)?DEX[s.sp]:null,del=team.slots.length>1||s.sp?'<button type="button" class="x" data-tdel="'+i+'" aria-label="'+esc(tr('Remove slot {0}',[i+1]))+'">✕</button>':'';
 if(!d)return '<article class="set empty" data-slot="'+i+'"><div class="set-h"><b>#'+(i+1)+'</b>'+del+'</div><label>Pokémon</label>'+acInput(i,'sp','mon',s.sp,'Pokémon')+'</article>';
 var n=T.effName(s.sp,s.it),e=DEX[n],mega=n!==s.sp,isM=/^Mega /.test(s.sp),st=statsOf(s),c1=U.TYC[e.t1],c2=U.TYC[e.t2||e.t1],abs=d.abs;
 return '<article class="set" data-slot="'+i+'" style="--c1:'+c1+';--c2:'+c2+'"><div class="set-h"><b>#'+(i+1)+'</b><span class="mu">'+(mega?esc(tr('Mega Evolves into {0} ({1})',[n,e.ab])):'')+'</span>'+del+'</div><div class="set-grid">'+
  '<div class="set-mon"><span class="av big" data-ini="'+esc(n[0])+'">'+U.spriteImg(n,'big','')+'</span><div class="set-id">'+acInput(i,'sp','mon',s.sp,'Pokémon')+'<div class="tys">'+U.typeChips(n)+'</div></div></div>'+
  '<div><label>'+tr('Item')+'</label>'+acInput(i,'it','item',s.it,tr('Item'),isM?' disabled':'')+'<label>'+tr('Ability')+'</label><select data-f="ab" aria-label="'+esc(tr('{0}, slot {1}',[tr('Ability'),i+1]))+'">'+(abs.length>1?option('','—',s.ab):'')+abs.map(function(a){return option(a,a,s.ab)}).join('')+(s.ab&&abs.indexOf(s.ab)<0?option(s.ab,s.ab,s.ab):'')+'</select>'+
  '<label>'+tr('Nature')+'</label><select data-f="na" aria-label="'+esc(tr('{0}, slot {1}',[tr('Nature'),i+1]))+'">'+option('','—',s.na)+Object.keys(NATURES).sort().map(function(x){return option(x,U.natLab(x),s.na)}).join('')+'</select></div>'+
  '<div><label>'+tr('Moves')+'</label>'+s.mv.map(function(m,k){return acInput(i,'mv'+k,'tmove',m,tr('Move {0}',[k+1]),' data-sp="'+esc(s.sp)+'"')}).join('')+'</div>'+
  '<div class="stats"><div class="st-h"><span>'+tr('Stat Points')+'</span><span class="st-tot'+(total(s)>66?' bad':'')+'">'+total(s)+'/66</span></div>'+
  '<div class="st-row st-lab"><span></span><span>'+tr('Base')+'</span><span>'+tr('Points')+'</span><span>'+tr('Stat')+'</span></div>'+
  STATS.map(function(k,ki){return '<div class="st-row s'+ki+'"><span>'+k[1]+'</span><span class="mu">'+st[k[0]].base+'</span><input type="number" min="0" max="32" inputmode="numeric" data-f="p_'+k[0]+'" value="'+(s.pts[k[0]]||'')+'" placeholder="0" aria-label="'+esc(tr('{0}, slot {1}',[k[1]+' '+tr('Stat Points'),i+1]))+'"><b data-v="'+k[0]+'">'+st[k[0]].v+'</b></div>'}).join('')+'</div></div></article>';}

function drawSlots(){$i('teamSlots').innerHTML=team.slots.map(card).join('');$i('addMon').hidden=team.slots.length>=MAX;}
/* reason arguments: plain text or a list of types */
function arg(a){if(a&&a.types)return a.types.map(function(t){return tr(t)}).join(', ');return String(a);}
function say(r){return esc(tr(r.k,r.a.map(arg)));}
function full(){return team.slots.filter(function(s){return isMon(s.sp)}).length>=MAX;}

function teamLabel(t,i){return t.name.trim()||tr('Team {0}',[i+1]);}
function teamMons(t){return t.slots.filter(function(s){return isMon(s.sp)}).map(function(s){return T.effName(s.sp,s.it)});}
function rowLabel(t,i,mons){return teamLabel(t,i)+(mons.length?': '+mons.join(', '):'');}
function teamRow(t,i){var mons=teamMons(t);
 return '<li><button type="button" class="team-row" data-team="'+i+'"'+(i===store.active?' aria-current="true"':'')+' aria-label="'+esc(rowLabel(t,i,mons))+'"><span class="team-row-name">'+esc(teamLabel(t,i))+'</span><span class="team-mons">'+
  (mons.length?mons.map(function(n){return '<span class="pk" title="'+esc(n)+'" data-ini="'+esc(n.charAt(0))+'">'+U.spriteImg(n,'pixel','')+'</span>'}).join(''):'<span class="mu">'+esc(tr('empty'))+'</span>')+'</span></button></li>';}
/* the list is rebuilt only when it changes, so the pictures do not flash on every edit */
function drawList(){var h=store.teams.map(teamRow).join('');if(h===listHtml)return;var box=$i('teamList'),had=box.contains(document.activeElement),top=box.scrollTop;box.innerHTML=listHtml=h;box.scrollTop=top;
 if(had)box.querySelector('[aria-current]').focus();}
function drawTeams(){drawList();
 $i('teamName').value=team.name;$i('teamName').placeholder=tr('Team {0}',[store.active+1]);
 $i('teamNew').disabled=store.teams.length>=MAXTEAMS;$i('teamDel').disabled=store.teams.length<2;}

function drawSide(){drawList();var ms=T.members(team.slots),an=T.analyse(ms),pr=T.problems(team.slots),data=T.data(),isFull=full();
 $i('teamIssues').innerHTML=pr.length?'<ul class="issues">'+pr.map(function(p){return '<li>⚠️ '+esc(tr(p.k,p.a))+'</li>'}).join('')+'</ul>':'';
 var weak=Object.keys(an.need).filter(function(t){return an.need[t]>0}).sort(function(a,b){return an.need[b]-an.need[a]||an.weak[b]-an.weak[a]});
 $i('teamWeak').innerHTML=!ms.length?'<p class="mu">'+tr('Add a Pokémon to see your team’s weaknesses and suggested partners.')+'</p>':weak.length?'<ul class="weak">'+weak.map(function(t){return '<li><span class="ty" style="--c:'+U.TYC[t]+';--ct:'+U.tyInk(U.TYC[t])+'">'+esc(tr(t))+'</span> <span class="mu">'+esc(tr('weak: {0} · resist: {1}',[an.weak[t],an.res[t]]))+'</span></li>'}).join('')+'</ul>':'<p class="ok">'+tr('No type has more weak Pokémon than resisting ones.')+'</p>';
 /* partners only make sense next to at least one Pokémon */
 $i('sugCard').hidden=!ms.length;
 $i('sugNote').textContent=data?tr('Based on {0} tournament team lists ({1}, collected on {2}).',[data.info.teams,data.info.source,data.info.date]):tr('Teammate data has not been collected yet: suggestions use overall usage, types and moves.');
 last=ms.length?T.suggest(team,8):[];
 $i('sugList').innerHTML=(isFull?'<p class="mu">'+tr('Your team is full: remove a Pokémon to add a suggestion.')+'</p>':'')+'<ol class="sugs">'+last.map(function(s,i){var d=DEX[s.name];
  return '<li class="sug" style="--c1:'+U.TYC[d.t1]+'"><span class="av lg" data-ini="'+esc(s.name[0])+'">'+U.spriteImg(s.name,'small','')+'</span><div class="sug-in"><div class="sug-h"><b>'+esc(s.name)+'</b><span class="score" title="'+esc(tr('Fit score from 0 to 100'))+'">'+s.score+'<small>/100</small></span></div><div class="tys">'+U.typeChips(s.name)+'</div><ul class="reasons">'+s.reasons.map(function(r){return '<li'+(r.warn?' class="warn"':'')+'>'+(r.warn?'⚠️ ':'')+say(r)+'</li>'}).join('')+'</ul>'+(isFull?'':'<button type="button" class="mini" data-add="'+i+'" aria-label="'+esc(tr('Add {0} to the team',[s.name]))+'">'+tr('+ Add to team')+'</button>')+'</div></li>'}).join('')+'</ol>';}
function drawInfo(){var data=T.data();$i('teamTxt').textContent=data?tr('{0}: {1} team lists, {2}, last {3} days, collected on {4}. Only counts are stored.',[data.info.source,data.info.teams,data.info.format,data.info.days,data.info.date]):tr('not collected yet.');}
function drawAll(){$i('teamImpTxt').setAttribute('aria-label',tr('Team text'));drawTeams();drawSlots();drawSide();drawInfo();}

/* redraw the set cards without losing the focused field (the change event fires before the focus moves on) */
function redrawKeepingFocus(){setTimeout(function(){var a=document.activeElement,box=a&&a.closest&&a.closest('#teamSlots .set'),key=box?[box.dataset.slot,a.dataset.f]:null;drawSlots();
 if(key&&key[1]){var el=document.querySelector('#teamSlots .set[data-slot="'+key[0]+'"] [data-f="'+key[1]+'"]');if(el)el.focus({preventScroll:true});}},0);}
function canon(list,v){var q=v.trim().toLowerCase();for(var i=0;i<list.length;i++)if(list[i].toLowerCase()===q)return list[i];return v.trim();}

$i('teamSlots').addEventListener('change',function(e){var t=e.target,box=t.closest('.set');if(!box)return;var i=+box.dataset.slot,s=team.slots[i],f=t.dataset.f;if(!s||!f)return;
 if(f==='sp'){var v=canon(Object.keys(DEX),t.value);if(v===s.sp)return;
  /* a half-typed or cleared name keeps the rest of the set: only a different Pokémon starts a new one */
  if(isMon(v)&&v!==s.of)team.slots[i]=setSpecies(v);else s.sp=v;redrawKeepingFocus();}
 else if(f==='it'){s.it=canon(U.items,t.value);redrawKeepingFocus();}
 else if(f.slice(0,2)==='mv'){s.mv[+f.slice(2)]=canon(Object.keys(MOVES_CHAMPIONS),t.value);t.value=s.mv[+f.slice(2)];}
 else if(f==='ab')s.ab=t.value;
 else if(f==='na'){s.na=t.value;redrawKeepingFocus();}
 else if(f.slice(0,2)==='p_'){s.pts[f.slice(2)]=points(t.value);t.value=s.pts[f.slice(2)]||'';}
 save();drawSide();});
/* Stat Points update the final stats while typing */
$i('teamSlots').addEventListener('input',function(e){var t=e.target,f=t.dataset.f,box=t.closest('.set');if(!f||f.slice(0,2)!=='p_'||!box)return;var s=team.slots[+box.dataset.slot];s.pts[f.slice(2)]=points(t.value);
 var st=statsOf(s),tot=box.querySelector('.st-tot');box.querySelector('[data-v="'+f.slice(2)+'"]').textContent=st[f.slice(2)].v;tot.textContent=total(s)+'/66';tot.classList.toggle('bad',total(s)>66);});
$i('teamSlots').addEventListener('click',function(e){var b=e.target.closest('[data-tdel]');if(!b)return;team.slots.splice(+b.dataset.tdel,1);if(!team.slots.length)team.slots.push(blank());drawSlots();save();drawSide();$i('addMon').focus();});
$i('addMon').onclick=function(){if(team.slots.length>=MAX)return;team.slots.push(blank());drawSlots();save();var el=document.querySelector('#teamSlots .set:last-child [data-f="sp"]');if(el)el.focus();};
$i('sugList').addEventListener('click',function(e){var b=e.target.closest('[data-add]');if(!b||full())return;var s=last[+b.dataset.add];if(!s)return;
 /* a suggested Mega form is added as such; its stone is forced by the game */
 var i=team.slots.findIndex(function(x){return !x.sp});if(i<0){team.slots.push(blank());i=team.slots.length-1;}team.slots[i]=setSpecies(s.name);drawSlots();save();drawSide();U.notify(tr('{0} added to the team.',[s.name]));});

function exportText(){return team.slots.filter(function(s){return isMon(s.sp)}).map(function(s){return U.showdownSet({name:s.sp,item:s.it,ability:s.ab,nature:s.na,S:s.pts,moves:s.mv.filter(Boolean)})}).join('\n\n');}
/* Showdown team text: one block per Pokémon, separated by empty lines. A backup adds "=== [format] Name ===" before
   each team: the first team and its name are read. */
function importText(text){var all=String(text||'').replace(/\r/g,''),head=/^[ \t]*===[ \t]*(?:\[[^\]\n]*\])?(.*?)===[ \t]*$/gm,h=head.exec(all),name='';
 if(h){var next=head.exec(all);name=str(h[1].trim(),NAMELEN);all=all.slice(h.index+h[0].length,next?next.index:all.length);}
 var blocks=all.split(/\n\s*\n/).filter(function(b){return b.trim()}),slots=[],warn=[];
 blocks.slice(0,MAX).forEach(function(b){b=b.trim();var p=U.parseShowdownSet(b);warn=warn.concat(p.warn);if(!p.name)return;var s=setSpecies(p.name),first=b.split('\n')[0],stone=first.indexOf(' @ ')>=0?first.slice(first.lastIndexOf(' @ ')+3).trim():'';
  /* Mega Stones are not in the item list the set reader knows: take them from the first line */
  if(!p.item&&U.items.indexOf(stone)>=0){p.item=stone;warn=warn.filter(function(w){return w.indexOf('“'+stone+'”')<0});}
  if(p.item&&!LOCK_ITEM_LOOKUP[p.name])s.it=p.item;if(p.ability)s.ab=p.ability;s.na=p.nature;p.moves.forEach(function(m,k){s.mv[k]=m});if(p.ev)STATS.forEach(function(k){s.pts[k[0]]=points(p.ev[k[0]])});slots.push(s);});
 return{name:name,slots:slots,warn:warn};}
$i('teamImpBtn').onclick=function(){var r=importText($i('teamImpTxt').value);if(!r.slots.length){$i('teamImpMsg').textContent=r.warn[0]||tr('No Pokémon found in the text.');return;}
 team.slots=r.slots;if(r.name)team.name=r.name;drawTeams();drawSlots();save();drawSide();$i('teamImpMsg').textContent=[tr('{0} Pokémon imported.',[r.slots.length])].concat(r.warn).join(' ');};
$i('teamCopy').onclick=function(){var t=exportText();if(!t){U.notify(tr('The team is empty.'));return;}$i('teamImpTxt').value=t;U.copy(t,tr('Team copied.'));};
$i('teamClear').onclick=function(){if(!confirm(tr('Remove every Pokémon from the team?')))return;team.slots=[blank()];clearText();drawSlots();save();drawSide();};
function clearText(){$i('teamImpTxt').value='';$i('teamImpMsg').textContent='';}
function openTeam(i){store.active=i;team=store.teams[i];clearText();drawTeams();drawSlots();save();drawSide();}
$i('teamList').addEventListener('click',function(e){var b=e.target.closest('[data-team]');if(!b)return;var i=+b.dataset.team;if(i!==store.active&&store.teams[i])openTeam(i);});
/* typing a name only changes the text of its row, not the pictures */
$i('teamName').addEventListener('input',function(){team.name=str(this.value,NAMELEN);var b=$i('teamList').querySelector('[aria-current]');b.querySelector('.team-row-name').textContent=teamLabel(team,store.active);b.setAttribute('aria-label',rowLabel(team,store.active,teamMons(team)));listHtml=store.teams.map(teamRow).join('');save();});
$i('teamNew').onclick=function(){if(store.teams.length>=MAXTEAMS)return;store.teams.push(newTeam());openTeam(store.teams.length-1);$i('teamName').focus();};
$i('teamDel').onclick=function(){if(store.teams.length<2||!confirm(tr('Delete the team “{0}”?',[teamLabel(team,store.active)])))return;store.teams.splice(store.active,1);openTeam(Math.min(store.active,store.teams.length-1));$i('teamList').querySelector('[aria-current]').focus();};

try{var raw=window.localStorage.getItem(KEY),st=raw&&clean(JSON.parse(raw));if(st){store=st;team=store.teams[store.active];}}catch(e){}
U.onLang.push(drawAll);
drawAll();
})();
