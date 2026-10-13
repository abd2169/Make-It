/* ===== WORKOUTS ===== */
let WDT=null,WV="today",SPD=null,ADDING=false;
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const FULLD=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const dayIdx=d=>(new Date(d+"T12:00:00").getDay()+6)%7;
const MODES={wr:"Weight × reps",r:"Reps only",t:"Time (sec)",d:"Distance + time"};
const FIELDS={wr:["w","r"],r:["r"],t:["t"],d:["d","t"]};
const HEAD={wr:["KG","REPS"],r:["REPS"],t:["SEC"],d:["KM","MIN"]};
const EXS=["Bench Press","Incline Dumbbell Press","Overhead Press","Dumbbell Shoulder Press","Lateral Raise","Chest Fly","Push-up","Dip","Triceps Pushdown","Squat","Leg Press","Lunge","Walking Lunge","Romanian Deadlift","Deadlift","Hip Thrust","Leg Curl","Leg Extension","Calf Raise","Barbell Row","Seated Cable Row","Lat Pulldown","Pull-up","Face Pull","Biceps Curl","Hammer Curl","Plank","Side Plank","Dead Hang","Sit-up","Treadmill Run","Run","Walk","Cycling","Rowing Machine","Swim"];
const guessMode=n=>{
  n=n.toLowerCase();
  if(/\brun|\bjog|\bwalk\b|\bcycl|\bbike|\bswim|rowing|treadmill|cardio|elliptical|stair|\bhik/.test(n))return "d";
  if(/plank|dead hang|wall sit|stretch|yoga|l-sit|\bhold/.test(n))return "t";
  if(/push-?up|pull-?up|chin-?up|sit-?up|crunch|burpee|\bdips?\b|bodyweight/.test(n))return "r";
  return "wr";
};
const modeOf=n=>S.split.modes[n.toLowerCase()]||guessMode(n);
const exList=()=>S.workouts[WDT]||(S.workouts[WDT]=[]);
const exById=id=>exList().find(x=>x.id===id);
const hasData=s=>s.w||s.r||s.t||s.d;
const blank=()=>({w:"",r:"",t:"",d:"",done:false});
const splitSet=()=>Object.values(S.split.days).some(d=>d.name||d.ex.length);
function planFor(date){const d=S.split.days[dayIdx(date)];if(!d)return{name:"",ex:[]};return{name:d.name||(d.ex.length?"Workout":""),ex:d.ex||[]}}
function allEx(){
  const seen=new Set(),out=[];
  const add=n=>{const k=n.toLowerCase();if(n&&!seen.has(k)){seen.add(k);out.push(n)}};
  EXS.forEach(add);Object.values(S.workouts).forEach(l=>l.forEach(e=>add(e.name)));Object.values(S.split.days).forEach(d=>d.ex.forEach(add));
  return out;
}
function recentEx(){
  const seen=new Set(),out=[];
  for(const d of Object.keys(S.workouts).sort().reverse())for(const e of S.workouts[d]){const k=e.name.toLowerCase();if(!seen.has(k)){seen.add(k);out.push(e.name);if(out.length>=6)return out}}
  return out;
}
function lastEntry(name){
  const k=name.toLowerCase();
  for(const d of Object.keys(S.workouts).filter(d=>d<WDT).sort().reverse()){
    const e=S.workouts[d].find(x=>x.name.toLowerCase()===k&&x.sets.some(hasData));if(e)return{d,e};
  }
  return null;
}
function newEx(name,mode){
  const m=mode||modeOf(name),last=lastEntry(name),n=last?Math.max(1,last.e.sets.filter(hasData).length):1;
  return{id:uid(),name,mode:m,sets:Array.from({length:n},blank)};
}
// what to suggest for set i: same set last session, else last set last session, else the set above
const srcFor=(e,i,ps)=>ps[i]||ps[ps.length-1]||(i>0?e.sets[i-1]:null);
const prevOf=e=>{const l=lastEntry(e.name);return l?l.e.sets.filter(hasData):[]};
const prevTxt=(m,s)=>!s?"–":m==="wr"?`${s.w||0}×${s.r||0}`:m==="r"?`${s.r||0}`:m==="t"?`${s.t||0}s`:`${s.d||0}km·${s.t||0}m`;
function wsum(L){
  const sets=L.reduce((a,e)=>a+e.sets.length,0),done=L.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  const vol=L.reduce((a,e)=>e.mode==="wr"?a+e.sets.reduce((b,s)=>b+(+s.w||0)*(+s.r||0),0):a,0);
  return `${L.length} exercise${L.length>1?"s":""} · ${done}/${sets} sets done${vol?` · ${r0(vol)} kg volume`:""}`;
}

/* ----- Home: one line only ----- */
function trainingHome(){
  const plan=planFor(today()),dn=FULLD[dayIdx(today())];
  const label=plan.name?(/day$/i.test(plan.name)?plan.name:plan.name+" day"):(splitSet()?"Rest day":"No split set up yet");
  return `<div class="card" style="cursor:pointer;padding:14px 18px" onclick="tab('workouts')"><div class="row" style="border:0;padding:0"><span>🏋️ <b>${dn}</b> · ${esc(label)}</span><span class="muted">›</span></div></div>`;
}

/* ----- Page shell ----- */
function workoutTab(){
  if(!WDT)WDT=today();
  $("#workouts").innerHTML=`<div class="seg big">${[["today","Workout"],["split","My split"]].map(([k,l])=>`<button class="${WV===k?"on":""}" onclick="wview('${k}')">${l}</button>`).join("")}</div>`+(WV==="today"?dayView():splitView());
}
function wview(v){WV=v;SPD=null;ADDING=false;workoutTab()}
function adding(b){ADDING=b;workoutTab()}
function wdate(n){WDT=shift(WDT,n);ADDING=false;workoutTab()}

/* ----- Workout view: every exercise shows its set table straight away ----- */
function dayView(){
  const L=S.workouts[WDT]||[],plan=planFor(WDT),have=new Set(L.map(x=>x.name.toLowerCase())),missing=plan.ex.filter(x=>!have.has(x.toLowerCase()));
  let top="";
  if(missing.length&&!L.length)top=`<button class="startbtn" onclick="usePlan()">▶ Start ${esc(plan.name)} <small style="color:#e6f2ec">· ${plan.ex.length} exercises</small></button><div style="height:12px"></div>`;
  else if(missing.length)top=`<button class="logbtn" style="margin:0 0 12px" onclick="usePlan()">+ Add ${missing.length} remaining planned exercise${missing.length>1?"s":""}</button>`;
  else if(!L.length)top=`<div class="card" style="text-align:center"><div style="font-size:32px">${splitSet()?"😴":"🏋️"}</div><p class="muted" style="margin:6px 0 0">${splitSet()?"Rest day. Nothing planned.":"No exercises yet."} Tap <b>Add exercise</b> to start.</p></div>`;
  return `<div class="card dnav"><button class="s alt" onclick="wdate(-1)">‹</button><b>${nice(WDT)} · ${DAYS[dayIdx(WDT)]}</b><button class="s alt" onclick="wdate(1)">›</button></div>
  ${top}${L.map(exCard).join("")}
  ${L.length?`<div class="sumbar" id="wsum">${wsum(L)}</div>`:""}
  ${ADDING?pickerCard("log"):`<button class="addex" onclick="adding(true)">+ Add exercise</button>`}`;
}
function exCard(e){
  const ps=prevOf(e),F=FIELDS[e.mode],cols=`32px 1fr repeat(${F.length},68px) 42px`;
  return `<div class="card ex2"><div class="eh"><div><h2>${esc(e.name)}</h2><select class="chipsel" onchange="setMode('${e.id}',this.value)">${opts(Object.entries(MODES),e.mode)}</select></div><button class="x" onclick="delEx('${e.id}')" title="Remove exercise">✕</button></div>
  <div class="sh" style="grid-template-columns:${cols}"><span>SET</span><span>PREVIOUS</span>${HEAD[e.mode].map(h=>`<span>${h}</span>`).join("")}<span>✓</span></div>
  ${e.sets.map((s,i)=>setRow(e,s,i,ps,cols)).join("")}
  <button class="addset" onclick="addSet('${e.id}')">+ Add set</button></div>`;
}
function setRow(e,s,i,ps,cols){
  const src=srcFor(e,i,ps);
  const inp=FIELDS[e.mode].map(f=>{const p=src&&src[f]!==""&&src[f]!=null?src[f]:"0",st=f==="w"?.5:f==="d"?.01:(e.mode==="d"&&f==="t")?.1:1;
    return `<input type="number" step="${st}" inputmode="decimal" value="${s[f]??""}" placeholder="${p}" onchange="setSet('${e.id}',${i},'${f}',this.value)">`}).join("");
  return `<div class="sr ${s.done?"done":""}" style="grid-template-columns:${cols}"><span class="n">${i+1}</span><span class="pv">${prevTxt(e.mode,ps[i])}</span>${inp}<button class="ck ${s.done?"on":""}" onclick="toggleDone('${e.id}',${i})" aria-label="Done">✓</button></div>`;
}
function setSet(id,i,f,v){
  const e=exById(id);e.sets[i][f]=v===""?"":+v;put("workouts");
  const el=$("#wsum");if(el)el.textContent=wsum(exList());
}
// ticking a set with empty boxes fills them from last time
function toggleDone(id,i){
  const e=exById(id),s=e.sets[i],ps=prevOf(e);
  if(!s.done){const src=srcFor(e,i,ps);FIELDS[e.mode].forEach(f=>{if((s[f]===""||s[f]==null)&&src&&src[f]!==""&&src[f]!=null)s[f]=src[f]})}
  s.done=!s.done;put("workouts");workoutTab();
}
function setMode(id,m){const e=exById(id);e.mode=m;S.split.modes[e.name.toLowerCase()]=m;put("split");put("workouts");workoutTab()}
function addSet(id){exById(id).sets.push(blank());put("workouts");workoutTab()}
function delEx(id){S.workouts[WDT]=exList().filter(x=>x.id!==id);put("workouts");workoutTab()}
function usePlan(){
  const have=new Set(exList().map(x=>x.name.toLowerCase()));
  planFor(WDT).ex.forEach(n=>{if(!have.has(n.toLowerCase()))exList().push(newEx(n))});
  put("workouts");workoutTab();
}

/* ----- Add exercise: tap one, or type your own ----- */
function pickerCard(target){
  return `<div class="card"><div class="mh"><h2>Add exercise</h2><a onclick="adding(false)">close</a></div>
  <input id="exq" placeholder="Search, or type your own" style="width:100%" oninput="$('#exl').innerHTML=exListHtml(this.value,'${target}')" onkeydown="if(event.key==='Enter')pickTyped('${target}')">
  <div id="exl">${exListHtml("",target)}</div></div>`;
}
function exListHtml(q,target){
  q=(q||"").trim();const ql=q.toLowerCase(),names=allEx();
  const row=(n,pre)=>`<div class="row ename" data-n="${esc(n)}" onclick="pickEx(this.dataset.n,'${target}')"><span>${pre||""}${esc(n)}</span><small>${MODES[modeOf(n)]}</small></div>`;
  if(!q){const rec=recentEx();return (rec.length?`<div class="hm">Recent</div>${rec.map(n=>row(n)).join("")}`:"")+`<div class="hm">All exercises</div>`+names.slice(0,40).map(n=>row(n)).join("")}
  let h=names.filter(n=>n.toLowerCase().includes(ql)).slice(0,30).map(n=>row(n)).join("");
  if(!names.some(n=>n.toLowerCase()===ql))h=row(q,"➕ Add ")+h;
  return h;
}
function pickTyped(target){const q=$("#exq").value.trim();if(q)pickEx(q,target)}
function pickEx(name,target){
  if(target==="log"){exList().push(newEx(name));ADDING=false;put("workouts")}
  else{dayOf(SPD).ex.push(name);put("split")}
  workoutTab();
}

/* ----- My split ----- */
const T_PUSH=["Bench Press","Overhead Press","Incline Dumbbell Press","Lateral Raise","Triceps Pushdown"];
const T_PULL=["Barbell Row","Lat Pulldown","Seated Cable Row","Face Pull","Biceps Curl"];
const T_LEGS=["Squat","Romanian Deadlift","Leg Press","Leg Curl","Calf Raise"];
const T_UP=["Bench Press","Barbell Row","Overhead Press","Lat Pulldown","Biceps Curl","Triceps Pushdown"];
const T_LOW=["Squat","Romanian Deadlift","Leg Press","Leg Curl","Calf Raise","Plank"];
const T_FULL=["Squat","Bench Press","Barbell Row","Overhead Press","Romanian Deadlift","Plank"];
const TPL={
  ppl:{label:"Push / Pull / Legs",days:{0:["Push",T_PUSH],1:["Pull",T_PULL],2:["Legs",T_LEGS],3:["Push",T_PUSH],4:["Pull",T_PULL],5:["Legs",T_LEGS]}},
  ul:{label:"Upper / Lower",days:{0:["Upper",T_UP],1:["Lower",T_LOW],3:["Upper",T_UP],4:["Lower",T_LOW]}},
  fb:{label:"Full body ×3",days:{0:["Full body",T_FULL],2:["Full body",T_FULL],4:["Full body",T_FULL]}}
};
const dayOf=i=>S.split.days[i]||(S.split.days[i]={name:"",ex:[]});
function splitView(){
  if(SPD!==null)return splitDayView();
  return `<div class="card"><h2>🗓️ My weekly split</h2><p class="muted">Tap a day to choose what you train.</p>
  <div class="week">${DAYS.map((d,i)=>{const day=S.split.days[i],nm=day&&(day.name||(day.ex.length?"Workout":""));
    return `<button class="daytile ${nm?"set":""}" onclick="editDay(${i})"><b>${d}</b><span>${nm?esc(nm):"Rest"}</span><small>${day&&day.ex.length?day.ex.length+" exercises":"&nbsp;"}</small></button>`}).join("")}</div></div>
  <div class="card"><h3>Or start from a template</h3><div class="tpl">${Object.entries(TPL).map(([k,t])=>`<button class="alt" onclick="applyTpl('${k}')">${t.label}</button>`).join("")}</div></div>`;
}
function editDay(i){SPD=i;ADDING=false;workoutTab()}
function splitDayView(){
  const i=SPD,day=S.split.days[i]||{name:"",ex:[]};
  return `<div class="card"><div class="mh"><a style="margin:0" onclick="editDay(null)">‹ Back</a><h2 style="margin:0">${FULLD[i]}</h2><span></span></div>
  <label style="margin-top:12px">What do you train?<input id="dn" value="${esc(day.name)}" placeholder="e.g. Push" onchange="splitName(${i},this.value)"></label>
  <div class="tpl">${["Push","Pull","Legs","Upper","Lower","Full body"].map(n=>`<button class="alt" onclick="splitName(${i},'${n}');editDay(${i})">${n}</button>`).join("")}<button class="alt" onclick="splitRest(${i})">😴 Rest day</button></div></div>
  <div class="card"><h3>Exercises</h3>${day.ex.map((x,j)=>`<div class="row"><span>${esc(x)}</span><span><a onclick="splitMove(${i},${j},-1)">↑</a><a onclick="splitMove(${i},${j},1)">↓</a><a onclick="splitDel(${i},${j})">✕</a></span></div>`).join("")||'<p class="muted">No exercises yet.</p>'}
  ${ADDING?pickerCard("split"):`<button class="logbtn" onclick="adding(true)">+ Add exercise</button>`}</div>`;
}
function applyTpl(k){
  if(splitSet()&&!confirm("Replace your current split with this template?"))return;
  S.split.days={};Object.entries(TPL[k].days).forEach(([i,[name,ex]])=>{S.split.days[i]={name,ex:[...ex]}});
  put("split");workoutTab();
}
function splitName(i,v){dayOf(i).name=v.trim();put("split")}
function splitRest(i){S.split.days[i]={name:"",ex:[]};put("split");editDay(null)}
function splitDel(i,j){dayOf(i).ex.splice(j,1);put("split");workoutTab()}
function splitMove(i,j,d){const a=dayOf(i).ex,k=j+d;if(k<0||k>=a.length)return;[a[j],a[k]]=[a[k],a[j]];put("split");workoutTab()}