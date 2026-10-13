/* ===== FOOD PAGE ===== */
let FD=null,OPEN=null,PANE="quick",PICK=null,CAND=[],EDIT=null,PREFILL=null;
const MEALS_DEF=[["b","Breakfast","🌅"],["l","Lunch","🥪"],["d","Dinner","🍽️"],["s","Snacks","🍎"]];
// typical portion (grams) used by the quick "+" button
const DEFG={chicken:150,turkey:150,beef:150,salmon:150,whitefish:150,tuna:100,shrimp:150,egg:100,tofu:150,chickpeas:120,beans:120,lentils:60,cottage:100,yogurt:150,cheese:30,parmesan:10,cremefr:30,milk:200,rice:75,pasta:80,quinoa:60,couscous:60,oats:50,bread:40,tortilla:60,potato:200,sweetpotato:200,onion:50,tomato:80,passata:150,pepper:80,broccoli:100,spinach:50,mushroom:80,carrot:60,cucumber:80,avocado:70,banana:100,pbutter:20,coconut:60,pesto:15,oil:10,soy:15};
const foodList=()=>Object.keys(FOOD).map(k=>({name:FOOD[k][2],per:{c:FOOD[k][0],p:FOOD[k][1],cb:MAC[k][0],f:MAC[k][1]},g:DEFG[k]||100}));

function foodTab(){
  stopScan();if(!FD)FD=today();
  const day=S.log[FD]||[],t=tot(day),P=S.profile;
  $("#food").innerHTML=`<div class="card dnav"><button class="s alt" onclick="fdate(-1)">‹</button><b>${nice(FD)}</b><button class="s alt" onclick="fdate(1)">›</button></div>
  <div class="card"><div class="row" style="border:0"><span>Eaten</span><b>${r0(t.c)} / ${P.kcal} kcal</b></div>
  <div class="row" style="border:0"><span>Protein</span><b>${r0(t.p)} / ${P.prot} g</b></div></div>
  ${MEALS_DEF.map(mealCard).join("")}`;
}
function fdate(n){FD=shift(FD,n);OPEN=null;EDIT=null;foodTab()}
function mealCard([m,label,icon]){
  const L=(S.log[FD]||[]).filter(e=>e.meal===m),t=tot(L);
  return `<div class="card"><div class="mh"><h2>${icon} ${label}</h2><small>${r0(t.c)} kcal · ${r0(t.p)}P · ${r0(t.cb)}C · ${r0(t.f)}F</small></div>
  ${L.map(rowE).join("")}
  ${OPEN===m?panel(m):`<button class="logbtn" onclick="openP('${m}')">+ Log food</button>`}</div>`;
}
function rowE(e){
  const n=ent(e);
  if(EDIT===e.id)return `<div class="row"><span>${esc(e.name)}<br><input id="eg" type="number" value="${e.g}" style="width:90px"> g <button class="s" onclick="setG('${e.id}')">Save</button></span><a onclick="edit(null)">cancel</a></div>`;
  return `<div class="row"><span class="ename" onclick="edit('${e.id}')">${esc(e.name)}<br><small>${e.g}g · ${r0(n.c)} kcal · ${r0(n.p)}P · tap to edit</small></span><a onclick="delE('${e.id}')">✕</a></div>`;
}
function edit(id){EDIT=id;foodTab()}
function setG(id){const g=+$("#eg").value,e=(S.log[FD]||[]).find(x=>x.id===id);if(e&&g>0){e.g=g;put("log")}EDIT=null;foodTab()}
function delE(id){S.log[FD]=(S.log[FD]||[]).filter(x=>x.id!==id);put("log");foodTab()}
function openP(m){stopScan();OPEN=m;PANE="quick";PICK=null;BCRES=null;PLATE=[];PREFILL=null;foodTab()}
function pane(k){stopScan();PANE=k;PICK=null;PREFILL=null;foodTab()}
function addE(name,g,per){
  (S.log[FD]=S.log[FD]||[]).push({id:uid(),meal:OPEN,name,g:r0(g*10)/10,per});
  put("log");PICK=null;PREFILL=null;foodTab();
}
function panel(m){
  const seg=[["quick","Quick add"],["scan","📷 Barcode"],["label","🏷️ Label"],["plate","🍽️ Plate"],["custom","Custom"]];
  return `<div class="panel"><div class="seg">${seg.map(([k,l])=>`<button class="${PANE===k?"on":""}" onclick="pane('${k}')">${l}</button>`).join("")}<button class="alt" onclick="openP(null)">Close</button></div>${paneHtml()}</div>`;
}
function paneHtml(){
  if(PANE==="quick")return `<input id="fq" placeholder="Search foods, e.g. chicken" style="width:100%" oninput="PICK=null;$('#flist').innerHTML=listHtml(this.value)"><div id="flist">${listHtml("")}</div>`;
  if(PANE==="scan")return barcodePane();
  if(PANE==="label")return labelPane();
  if(PANE==="plate")return platePane();
  const pf=PREFILL||{},v=x=>x==null?"":r0(x*10)/10;
  return `${pf.msg?`<p class="muted">${pf.msg}</p>`:""}
  <div class="grid"><label>Name<input id="c_n" value="${esc(pf.n||"")}"></label><label>Amount eaten (g)<input id="c_g" type="number" value="${pf.g||100}"></label></div>
  <p class="muted">Nutrition per 100g (from the label):</p>
  <div class="grid"><label>Calories<input id="c_c" type="number" value="${pf.c==null?"":r0(pf.c)}"></label><label>Protein<input id="c_p" type="number" value="${v(pf.p)}"></label><label>Carbs<input id="c_cb" type="number" value="${v(pf.cb)}"></label><label>Fat<input id="c_f" type="number" value="${v(pf.f)}"></label></div>
  <button onclick="addCustom()">Add &amp; save food</button>`;
}

/* quick add list */
function recents(){
  const out=[],seen=new Set();
  for(const d of Object.keys(S.log).sort().reverse())for(const e of [...S.log[d]].reverse()){
    const k=e.name.toLowerCase();if(seen.has(k))continue;seen.add(k);out.push({name:e.name,per:e.per,g:e.g});if(out.length>=8)return out;
  }
  return out;
}
function listHtml(q){
  q=(q||"").toLowerCase().trim();const seen=new Set();
  CAND=[...recents(),...S.custom,...foodList()].filter(x=>{const k=x.name.toLowerCase();if(seen.has(k)||(q&&!k.includes(q)))return false;seen.add(k);return true}).slice(0,40);
  if(!CAND.length)return '<p class="muted">No match. Try the Barcode, Label or Custom tab.</p>';
  return CAND.map((x,i)=>PICK===i
   ?`<div class="row"><span>${esc(x.name)}<br><input id="pg" type="number" value="${x.g}" style="width:90px"> g</span><button class="s" onclick="addC(${i},true)">Add</button></div>`
   :`<div class="row"><span class="ename" onclick="pickC(${i})">${esc(x.name)}<br><small>${r0(x.per.c*x.g/100)} kcal · ${r0(x.per.p*x.g/100)}P at ${x.g}g · tap to change amount</small></span><button class="s" onclick="addC(${i})">+ ${x.g}g</button></div>`).join("");
}
function pickC(i){PICK=i;$("#flist").innerHTML=listHtml($("#fq").value)}
function addC(i,useInput){const x=CAND[i],g=useInput?+$("#pg").value:x.g;if(x&&g>0)addE(x.name,g,x.per)}
function addCustom(){
  const name=$("#c_n").value.trim(),g=+$("#c_g").value,per={c:+$("#c_c").value||0,p:+$("#c_p").value||0,cb:+$("#c_cb").value||0,f:+$("#c_f").value||0};
  if(!name||!(g>0))return alert("Enter a name and amount.");
  S.custom=S.custom.filter(x=>x.name.toLowerCase()!==name.toLowerCase());S.custom.unshift({name,per,g});put("custom");addE(name,g,per);
}
// photo -> JPEG (used for label uploads)
function toJpeg(file){
  return new Promise((ok,no)=>{
    const fr=new FileReader();fr.onerror=()=>no(new Error("Couldn't read the photo"));
    fr.onload=()=>{const img=new Image();img.onerror=()=>no(new Error("Couldn't open the photo"));
      img.onload=()=>{const s=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=r0(img.width*s);c.height=r0(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.85).split(",")[1])};
      img.src=fr.result};
    fr.readAsDataURL(file);
  });
}