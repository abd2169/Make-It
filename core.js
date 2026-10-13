/* ===== helpers & storage ===== */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const rd=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch{return d}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const ymd=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>ymd(new Date());
const shift=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return ymd(d)};
const nice=s=>s===today()?"Today":new Date(s+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
const r0=Math.round;
const opts=(arr,sel)=>arr.map(([v,l])=>`<option value="${v}" ${v==sel?"selected":""}>${l}</option>`).join("");
const DIET={vegetarian:/[mf]/,vegan:/[mfed]/,"gluten-free":/g/,"dairy-free":/d/};
const DEF={profile:{kcal:2250,prot:170,carb:250,fat:70,w:85,tw:80,h:178,age:30,sex:"m",act:1.55,goal:"lose"},log:{},weights:[],workouts:{},custom:[],split:{days:{},modes:{}},goals:{}};
let U=null,S={};
function loadUser(n){U=n;Object.keys(DEF).forEach(k=>{S[k]=rd("mi:"+n+":"+k,JSON.parse(JSON.stringify(DEF[k])))})}
const put=k=>wr("mi:"+U+":"+k,S[k]);
/* entry = {id, meal, name, g, per:{c,p,cb,f} per 100g} */
const ent=e=>({c:e.per.c*e.g/100,p:e.per.p*e.g/100,cb:e.per.cb*e.g/100,f:e.per.f*e.g/100});
const tot=a=>a.reduce((t,e)=>{const n=ent(e);t.c+=n.c;t.p+=n.p;t.cb+=n.cb;t.f+=n.f;return t},{c:0,p:0,cb:0,f:0});

/* ===== accounts (stored in this browser only) ===== */
async function hash(pw,salt){
  const s=salt+":"+pw;
  try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
  catch{let h=5381;for(const c of s)h=((h<<5)+h+c.charCodeAt(0))|0;return "x"+h}
}
function authView(mode){
  $("#app").hidden=true;$("#auth").hidden=false;
  const up=mode==="up";
  $("#auth").innerHTML=`<div class="card authbox"><h1>🍳 Make It</h1>
  <p class="muted">${up?"Create your account":"Welcome back"}</p>
  <label>Username<input id="a_u" autocomplete="username"></label><br>
  <label>Password<input id="a_p" type="password" autocomplete="${up?"new-password":"current-password"}"></label>
  <p id="a_err" class="err"></p>
  <button onclick="doAuth('${mode}')">${up?"Sign up":"Log in"}</button>
  <button class="alt" onclick="authView('${up?"in":"up"}')">${up?"I already have an account":"Create an account"}</button>
  <p class="muted"><small>Accounts live in this browser only (no server), so they don't sync between devices and aren't real security.</small></p></div>`;
}
async function doAuth(mode){
  const name=$("#a_u").value.trim().toLowerCase(),pw=$("#a_p").value,err=$("#a_err"),users=rd("mi:users",{});
  if(name.length<2){err.textContent="Username needs at least 2 characters.";return}
  if(pw.length<4){err.textContent="Password needs at least 4 characters.";return}
  if(mode==="up"){
    if(users[name]){err.textContent="That username is taken.";return}
    const salt=uid();users[name]={salt,h:await hash(pw,salt)};
    const first=!Object.keys(rd("mi:users",{})).length;
    wr("mi:users",users);
    if(first){const op=rd("profile",null),ow=rd("weights",null);if(op)wr("mi:"+name+":profile",{...DEF.profile,...op});if(ow)wr("mi:"+name+":weights",ow)}
  }else{
    const u=users[name];
    if(!u||u.h!==await hash(pw,u.salt)){err.textContent="Wrong username or password.";return}
  }
  wr("mi:session",name);enter(name);
}
function logout(){if(typeof stopScan==="function")stopScan();wr("mi:session",null);U=null;authView("in")}
function enter(name){
  loadUser(name);$("#auth").hidden=true;$("#app").hidden=false;
  $("#nav").innerHTML=TABS.map(([k,l])=>`<button id="n_${k}" onclick="tab('${k}')">${l}</button>`).join("");
  tab("home");
}
function start(){
  const users=rd("mi:users",{}),s=rd("mi:session",null);
  if(s&&users[s])enter(s);else authView(Object.keys(users).length?"in":"up");
}

/* ===== tabs ===== */
const TABS=[["home","Home"],["food","Food"],["meals","Recipes"],["workouts","Workouts"],["progress","Progress"],["profile","Profile"]];
function tab(k){
  if(typeof stopScan==="function")stopScan();
  document.querySelectorAll(".tab").forEach(e=>e.classList.toggle("on",e.id===k));
  TABS.forEach(([t])=>$("#n_"+t).classList.toggle("on",t===k));
  ({home,food:foodTab,meals:mealsTab,workouts:workoutTab,progress,profile:prof})[k]();
}

/* ===== body stats ===== */
// S.weights = [{d, w, mk (muscle mass kg), bf (body fat %), waist, chest, hips, arm, thigh, m (old muscle %)}]
const METRICS=[["w","Weight","kg","#6a9e87"],["mk","Muscle mass","kg","#5f8fc0"],["bf","Body fat","%","#e08a5a"],["waist","Waist","cm","#9a78b8"],["chest","Chest","cm","#9a78b8"],["hips","Hips","cm","#9a78b8"],["arm","Arm","cm","#9a78b8"],["thigh","Thigh","cm","#9a78b8"]];
const fmt=v=>Math.round(v*10)/10;
const short=d=>new Date(d+"T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short"});
const val=(e,k)=>k==="mk"?(e.mk!=null&&e.mk!==""?+e.mk:(e.w&&e.m?e.w*e.m/100:null)):(e[k]==null||e[k]===""?null:+e[k]);
const seriesOf=k=>[...S.weights].sort((a,b)=>a.d.localeCompare(b.d)).map(e=>({d:e.d,v:val(e,k)})).filter(x=>x.v!=null);
const goalOf=k=>{const g=k==="w"?S.profile.tw:S.goals[k];return g===undefined||g===""||g===null||isNaN(+g)?null:+g};

/* one clear line chart: labelled axis, dates, last value, dashed goal line */
function lineChart(pts,unit,goal,color){
  if(!pts.length)return `<p class="muted">No entries yet. Log your first one above.</p>`;
  const W=600,H=230,L=50,R=18,T=26,B=34,t=d=>new Date(d+"T12:00:00").getTime();
  const t0=t(pts[0].d),t1=t(pts[pts.length-1].d);
  let lo=Math.min(...pts.map(p=>p.v)),hi=Math.max(...pts.map(p=>p.v));
  if(goal!=null){lo=Math.min(lo,goal);hi=Math.max(hi,goal)}
  const pad=(hi-lo)*.18||Math.max(1,hi*.03);lo-=pad;hi+=pad;
  const X=d=>pts.length<2||t1===t0?(L+W-R)/2:L+(t(d)-t0)/(t1-t0)*(W-L-R),Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  const dec=(hi-lo)>8?0:1,last=pts[pts.length-1];
  const grid=[0,1,2,3].map(i=>{const v=lo+(hi-lo)*i/3,y=Y(v);return `<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#eef2ef"/><text x="${L-8}" y="${y+4}" font-size="12" fill="#8a9892" text-anchor="end">${v.toFixed(dec)}</text>`}).join("");
  const gl=goal!=null?`<line x1="${L}" x2="${W-R}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="#d4a72c" stroke-width="2" stroke-dasharray="6 5"/><text x="${W-R}" y="${Y(goal)-6}" font-size="12" fill="#a8841c" text-anchor="end">Goal ${fmt(goal)}</text>`:"";
  const line=pts.length>1?`<polyline fill="none" stroke="${color}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p=>X(p.d)+","+Y(p.v)).join(" ")}"/>`:"";
  const dots=pts.map(p=>`<circle cx="${X(p.d)}" cy="${Y(p.v)}" r="${p===last?6:3.5}" fill="${p===last?color:"#fff"}" stroke="${color}" stroke-width="2.5"/>`).join("");
  const lx=X(last.d);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit} over time">${grid}${gl}${line}${dots}
  <text x="${lx}" y="${Y(last.v)-12}" font-size="14" font-weight="700" fill="${color}" text-anchor="${lx>W-70?"end":"middle"}">${fmt(last.v)} ${unit}</text>
  <text x="${L}" y="${H-10}" font-size="12" fill="#8a9892">${short(pts[0].d)}</text>
  ${pts.length>1?`<text x="${W-R}" y="${H-10}" font-size="12" fill="#8a9892" text-anchor="end">${short(last.d)}</text>`:""}</svg>`;
}
function weeklyRate(pts){
  if(pts.length<4)return null;
  const t=pts.map(p=>new Date(p.d+"T12:00:00").getTime()/864e5);
  if(t[t.length-1]-t[0]<7)return null;
  const mt=t.reduce((a,b)=>a+b,0)/t.length,mv=pts.reduce((a,p)=>a+p.v,0)/pts.length;
  let n=0,d=0;pts.forEach((p,i)=>{n+=(t[i]-mt)*(p.v-mv);d+=(t[i]-mt)**2});
  return d?n/d*7:null;
}

/* ===== HOME ===== */
function ring(label,v,t,unit,col){
  const pct=t>0?Math.min(1,v/t):0,C=2*Math.PI*42,done=t>0&&v>=t;
  return `<div class="ringbox"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="rbg"/>
  <circle cx="50" cy="50" r="42" class="rfg" style="stroke:${done?"#d4a72c":col}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-pct)).toFixed(1)}" transform="rotate(-90 50 50)"/>
  <text x="50" y="49" class="rnum">${r0(v)}/${t}</text><text x="50" y="62" class="rlab">${unit}</text></svg>
  <div class="rname">${label}${done?" ✓":""}</div></div>`;
}
// one progress line per measurement that has been logged (weight always shown)
function progressLines(){
  return METRICS.filter(([k])=>k==="w"||seriesOf(k).length).map(([k,l,u,col])=>{
    const s=seriesOf(k),g=goalOf(k),cur=s.length?s[s.length-1].v:(k==="w"?S.profile.w:null),start=s.length?s[0].v:cur;
    if(g==null)return `<div class="pb"><div class="row" style="border:0"><span>${l}</span><b>${fmt(cur)} ${u}</b></div><small><a style="margin:0" onclick="goProg('${k}')">Set a goal</a> to see your progress line</small></div>`;
    let pct=start===g?(cur===g?1:0):(cur-start)/(g-start);pct=Math.max(0,Math.min(1,pct));
    const left=Math.abs(cur-g),txt=left<0.05?"Goal reached 🎉":`${fmt(left)} ${u} to go`;
    return `<div class="pb"><div class="row" style="border:0"><span>${l}</span><span><b>${fmt(cur)} ${u}</b> <small>→ ${fmt(g)} ${u}</small></span></div>
    <div class="track"><i style="width:${r0(pct*100)}%;background:${col}"></i></div><small>${txt}</small></div>`;
  }).join("");
}
function goProg(k){PM=k;tab("progress")}
function home(){
  const P=S.profile,t=tot(S.log[today()]||[]),hr=new Date().getHours();
  const hi=hr<12?"Good morning":hr<18?"Good afternoon":"Good evening";
  const hits=[["Calories",t.c,P.kcal],["Protein",t.p,P.prot],["Carbs",t.cb,P.carb],["Fat",t.f,P.fat]].filter(x=>x[2]>0&&x[1]>=x[2]).map(x=>x[0]);
  const rc=P.kcal-t.c,rp=P.prot-t.p;
  $("#home").innerHTML=`<div class="card hero"><h2>Welcome, ${esc(U)}</h2><p>${hi}. Here's your day.</p></div>
  ${trainingHome()}
  <div class="card"><h2>Your progress</h2>${progressLines()}
  <button class="alt" onclick="tab('progress')">Log measurements →</button></div>
  <div class="card"><h2>Today's goals</h2>
  <div class="rings">${ring("Calories",t.c,P.kcal,"kcal","#e9a57a")}${ring("Protein",t.p,P.prot,"g protein","#6a9e87")}${ring("Carbs",t.cb,P.carb,"g carbs","#7aa7c7")}${ring("Fat",t.f,P.fat,"g fat","#c4a3c9")}</div>
  <p class="big">${rc>0?`You have <b>${r0(rc)} kcal</b> and <b>${Math.max(0,r0(rp))}g protein</b> left.`:"You've reached your calorie target for today."}</p>
  ${hits.map(h=>`<span class="chip">🎉 ${h} goal reached</span>`).join("")}
  <button onclick="tab('food')">Log food →</button></div>`;
}

/* ===== PROGRESS ===== */
let PM="w",PR=90,FLASH="",LV=null,LDM="today";
const START={mk:30,bf:20,waist:80,chest:95,hips:95,arm:32,thigh:55};
const startVal=()=>{const s=seriesOf(PM);return s.length?s[s.length-1].v:(PM==="w"?S.profile.w:START[PM])};
const pickMetric=m=>{PM=m;LV=null;LDM="today";FLASH="";progress()};
function stepVal(d){const el=$("#lv"),base=el.value!==""?+el.value:startVal();el.value=fmt(base+d)}
function setLD(m){LV=$("#lv").value;LDM=m;progress()}
function historyHtml(k,unit,all,g){
  const rows=[...all].reverse().slice(0,30);let out="",lastMonth="";
  rows.forEach(x=>{
    const i=all.indexOf(x),prev=i>0?all[i-1].v:null,dt=new Date(x.d+"T12:00:00");
    const mo=dt.toLocaleDateString(undefined,{month:"long",year:"numeric"});
    if(mo!==lastMonth){out+=`<div class="hm">${mo}</div>`;lastMonth=mo}
    let delta="",cls="neutral";
    if(prev!=null){const d=x.v-prev;if(Math.abs(d)<0.05)delta="–";else{delta=(d>0?"▲ ":"▼ ")+fmt(Math.abs(d));if(g!=null)cls=Math.abs(x.v-g)<Math.abs(prev-g)?"good":"bad"}}
    out+=`<div class="hrow"><div class="hd"><b>${dt.getDate()}</b><small>${dt.toLocaleDateString(undefined,{weekday:"short"})}</small></div><div class="hv">${fmt(x.v)}<span> ${unit}</span></div><span class="delta ${cls}">${delta}</span><button class="x" onclick="delMetric('${k}','${x.d}')" title="Delete">✕</button></div>`;
  });
  return out||'<p class="muted">No entries yet.</p>';
}
function progress(){
  const [k,label,unit,color]=METRICS.find(x=>x[0]===PM),all=seriesOf(k);
  const pts=PR?all.filter(x=>x.d>=shift(today(),-PR)):all,last=all.length?all[all.length-1].v:null,g=goalOf(k);
  let change="Log at least two entries to see your trend.";
  if(pts.length>1){const d=pts[pts.length-1].v-pts[0].v;change=Math.abs(d)<0.05?`No change since ${short(pts[0].d)}`:`${d<0?"▼ Down":"▲ Up"} ${fmt(Math.abs(d))} ${unit} since ${short(pts[0].d)}`}
  const rt=PM==="w"?weeklyRate(pts):null;
  const tiles=METRICS.map(([m,l,u])=>{const s=seriesOf(m),lv=s.length?s[s.length-1].v:null,d=s.length>1?lv-s[0].v:null;
    return `<button class="tile ${PM===m?"on":""}" onclick="pickMetric('${m}')"><small>${l}</small><b>${lv==null?"—":fmt(lv)+" "+u}</b><small>${d==null?"&nbsp;":(d>=0?"▲ +":"▼ ")+fmt(d)}</small></button>`}).join("");
  const ranges=[[30,"30d"],[90,"90d"],[0,"All"]].map(([d,l])=>`<button class="${PR===d?"on":""}" onclick="PR=${d};progress()">${l}</button>`).join("");
  const dates=[["today","Today"],["yday","Yesterday"],["pick","Pick date"]].map(([m,l])=>`<button class="${LDM===m?"on":""}" onclick="setLD('${m}')">${l}</button>`).join("");
  $("#progress").innerHTML=`<div class="tiles">${tiles}</div>
  <div class="card"><div class="mh"><h2>${label}</h2><div class="mchips" style="margin:0">${ranges}</div></div>
  <div class="bigv">${last==null?"—":fmt(last)+" <span>"+unit+"</span>"}</div>
  <p class="muted">${change}${rt!=null?` · about ${rt>=0?"+":""}${rt.toFixed(2)} ${unit}/week`:""}</p>
  ${lineChart(pts,unit,g,color)}</div>
  <div class="card logcard"><h3>Log ${label.toLowerCase()}</h3>
  <div class="stepper"><button class="rb" onclick="stepVal(-0.1)" aria-label="less">−</button>
  <div class="sv"><input class="bigin" id="lv" type="number" step="0.1" inputmode="decimal" value="${LV!==null?LV:fmt(startVal())}" onkeydown="if(event.key==='Enter')saveMetric()"><span>${unit}</span></div>
  <button class="rb" onclick="stepVal(0.1)" aria-label="more">+</button></div>
  <div class="dates">${dates}</div>
  ${LDM==="pick"?`<div style="text-align:center;margin-top:8px"><input id="ld" type="date" value="${today()}" max="${today()}"></div>`:""}
  <button class="wide" onclick="saveMetric()">Save ${label.toLowerCase()}</button>
  <p class="muted" style="text-align:center;min-height:20px">${FLASH}</p></div>
  <div class="card"><h3>${label} goal</h3><div class="logline"><input id="lg" type="number" step="0.1" value="${g==null?"":g}" placeholder="Set a goal"><span class="u">${unit}</span><button class="s alt" onclick="setGoalM()">Save goal</button></div>
  <p class="muted"><small>Goals power the progress lines on your Home page.</small></p></div>
  <div class="card"><h3>History</h3>${historyHtml(k,unit,all,g)}</div>`;
}
function saveMetric(){
  const v=$("#lv").value;if(v==="")return;
  const d=LDM==="yday"?shift(today(),-1):LDM==="pick"?($("#ld").value||today()):today();
  let e=S.weights.find(x=>x.d===d);if(!e){e={d};S.weights.push(e)}
  e[PM]=+v;if(PM==="mk")delete e.m;put("weights");
  const m=METRICS.find(x=>x[0]===PM);FLASH=`Saved ✓  ${m[1]} ${fmt(+v)} ${m[2]}`;LV=null;LDM="today";progress();
}
function setGoalM(){
  const v=$("#lg").value;
  if(PM==="w"){S.profile.tw=v===""?0:+v;put("profile")}else{if(v==="")delete S.goals[PM];else S.goals[PM]=+v;put("goals")}
  FLASH="Goal saved ✓";progress();
}
function delMetric(k,d){
  const e=S.weights.find(x=>x.d===d);if(!e)return;
  delete e[k];if(k==="mk")delete e.m;
  if(!Object.keys(e).some(x=>x!=="d"))S.weights=S.weights.filter(x=>x!==e);
  put("weights");progress();
}

/* ===== PROFILE ===== */
const PF=[["kcal","Calories"],["prot","Protein (g)"],["carb","Carbs (g)"],["fat","Fat (g)"],["w","Current weight (kg)"],["tw","Target weight (kg)"],["h","Height (cm)"],["age","Age"]];
function prof(){
  const P=S.profile;
  $("#profile").innerHTML=`<div class="card"><h2>Profile &amp; goals</h2><div class="grid">
  ${PF.map(([k,l])=>`<label>${l}<input id="p_${k}" type="number" value="${P[k]}"></label>`).join("")}
  <label>Sex<select id="p_sex">${opts([["m","Male"],["f","Female"]],P.sex)}</select></label>
  <label>Activity<select id="p_act">${opts([[1.2,"Sedentary"],[1.375,"Light"],[1.55,"Moderate"],[1.725,"Very active"]],P.act)}</select></label>
  <label>Goal<select id="p_goal">${opts([["lose","Lose weight"],["maintain","Maintain"],["gain","Gain weight"]],P.goal)}</select></label></div>
  <button onclick="calc()">Calculate targets for me</button><button class="alt" onclick="saveP(true)">Save</button>
  <p class="muted">Calculated targets use Mifflin-St Jeor: -500 kcal to lose, +300 to gain, 2g protein per kg. A starting point, so adjust from your weight trend.</p></div>`;
}
function readP(){PF.forEach(([k])=>S.profile[k]=+$("#p_"+k).value);["sex","goal"].forEach(k=>S.profile[k]=$("#p_"+k).value);S.profile.act=+$("#p_act").value}
function saveP(msg){readP();put("profile");if(msg)alert("Saved")}
function calc(){
  readP();const P=S.profile;
  const bmr=10*P.w+6.25*P.h-5*P.age+(P.sex==="m"?5:-161);
  P.kcal=r0(bmr*P.act+{lose:-500,maintain:0,gain:300}[P.goal]);
  P.prot=r0(P.w*2);P.fat=r0(P.kcal*.25/9);
  P.carb=Math.max(0,r0((P.kcal-P.prot*4-P.fat*9)/4));
  put("profile");prof();
}
window.addEventListener("load",start);