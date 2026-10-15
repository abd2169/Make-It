/* ===== ONLINE FOOD SEARCH =====
   Generic foods: USDA FoodData Central.  Packaged foods: Open Food Facts (crowd-sourced, worldwide).
   USDA key: DEMO_KEY works but allows only about 30 searches an hour. For your own, sign up free at
   https://fdc.nal.usda.gov/api-key-signup.html and paste the key below. */
const USDA_KEY="DEMO_KEY";
let ONL=[],ONRES=null,ONC={},ONT=[],ONPICK=null;

// drop obviously wrong entries (crowd-sourced data can be sloppy): macros must roughly add up to the calories
const plausible=p=>p.c>=0&&p.c<=950&&p.p>=0&&p.cb>=0&&p.f>=0&&p.p+p.cb+p.f<=105&&Math.abs(4*p.p+4*p.cb+9*p.f-p.c)<=0.35*p.c+25;
function offItem(p){
  const n=p.nutriments||{};let c=n["energy-kcal_100g"];
  if(c==null&&n["energy_100g"]!=null)c=n["energy_100g"]/4.184;
  const brand=p.brands?String(p.brands).split(",")[0].trim():"";
  const name=[brand,p.product_name].filter(Boolean).join(" ").trim();
  if(!name||c==null)return null;
  const per={c:+c,p:+(n.proteins_100g||0),cb:+(n.carbohydrates_100g||0),f:+(n.fat_100g||0)};
  if(!plausible(per))return null;
  const sv=+p.serving_quantity;
  return {name,per,g:sv>0&&sv<=1000?sv:100,src:"Open Food Facts"};
}
function usdaItem(food){
  const get=(...ids)=>{for(const x of food.foodNutrients||[]){const id=String(x.nutrientNumber!=null?x.nutrientNumber:x.nutrientId);if(ids.includes(id)&&x.value!=null)return +x.value}return null};
  let c=get("208","1008","957","2047","958","2048");
  if(c==null){const kj=get("268","1062");if(kj!=null)c=kj/4.184}
  const p=get("203","1003"),fat=get("204","1004"),cb=get("205","1005");
  if(!food.description||p==null||fat==null||cb==null)return null;
  if(c==null)c=4*p+4*cb+9*fat;
  const per={c,p,cb,f:fat};
  return plausible(per)?{name:food.description,per,g:100,src:"USDA"}:null;
}
async function searchOnline(q){
  const key=q.trim().toLowerCase();if(ONC[key])return ONC[key];
  const enc=encodeURIComponent(q.trim());
  const get=u=>fetch(u).then(r=>{if(!r.ok)throw new Error("http "+r.status);return r.json()});
  const [off,usda]=await Promise.allSettled([
    get(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=12&sort_by=unique_scans_n&fields=code,product_name,brands,nutriments,serving_quantity`).then(j=>(j.products||[]).map(offItem).filter(Boolean)),
    get(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${enc}&dataType=Foundation,SR%20Legacy&pageSize=10&api_key=${USDA_KEY}`).then(j=>(j.foods||[]).map(usdaItem).filter(Boolean))
  ]);
  const out={off:off.status==="fulfilled"?off.value:null,usda:usda.status==="fulfilled"?usda.value:null};
  if(out.off||out.usda)ONC[key]=out;
  return out;
}
function onlineHtml(){
  const r=ONRES;if(!r)return "";
  let h="",i=0;ONL=[];
  const row=x=>{const k=ONL.push(x)-1;return ONPICK===k
    ?`<div class="row"><span>${esc(x.name)}<br><input id="og" type="number" value="${x.g}" style="width:90px"> g</span><button class="s" onclick="addO(${k},true)">Add</button></div>`
    :`<div class="row"><span class="ename" onclick="pickO(${k})">${esc(x.name)}<br><small>${r0(x.per.c)} kcal · ${r0(x.per.p)}P · ${r0(x.per.cb)}C · ${r0(x.per.f)}F per 100g · ${x.src}</small></span><button class="s" onclick="addO(${k})">+ ${x.g}g</button></div>`};
  if(r.usda&&r.usda.length)h+=`<div class="hm">Generic foods (USDA)</div>`+r.usda.map(row).join("");
  if(r.off&&r.off.length)h+=`<div class="hm">Packaged foods (Open Food Facts)</div>`+r.off.map(row).join("");
  const bad=[r.usda===null?"USDA":"",r.off===null?"Open Food Facts":""].filter(Boolean);
  if(bad.length)h+=`<p class="err">${bad.join(" and ")} didn't respond. Check your connection and try again in a minute.</p>`;
  if(!h)h='<p class="muted">Nothing found. Try fewer or simpler words, scan the barcode, or add it in Custom.</p>';
  return h+'<p class="muted"><small>Packaged-food data is added by the public, so double-check it against the pack if it matters.</small></p>';
}
async function onlineGo(){
  const q=($("#fq")?$("#fq").value:"").trim(),box=$("#olist");if(!box)return;
  if(q.length<2){box.innerHTML='<p class="muted">Type what you\'re looking for first.</p>';return}
  const now=Date.now();ONT=ONT.filter(t=>now-t<60000);
  if(!ONC[q.toLowerCase()]&&ONT.length>=8){box.innerHTML='<p class="muted">Slow down a little. The free food database allows about 10 searches a minute.</p>';return}
  if(!ONC[q.toLowerCase()])ONT.push(now);
  box.innerHTML='<p class="muted">Searching…</p>';ONPICK=null;
  try{ONRES=await searchOnline(q)}catch{ONRES={off:null,usda:null}}
  box.innerHTML=onlineHtml();
}
function pickO(k){ONPICK=k;$("#olist").innerHTML=onlineHtml()}
function addO(k,useInput){const x=ONL[k],g=useInput?+$("#og").value:x.g;if(x&&g>0)addE(x.name,g,x.per)}