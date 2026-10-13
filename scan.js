/* ===== CAMERA SCANNERS — everything runs on your device, no API key ===== */
let scan=null,BCRES=null,PLATE=[],busy=false,lastKey=null,lastPlate="",OCRW=null,CLIP=null;
const TESS_URL="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const ZX_URL="https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
const CLIP_URL="https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

function loadScript(url,isLoaded){
  return new Promise((ok,no)=>{if(isLoaded())return ok();const s=document.createElement("script");s.src=url;s.onload=ok;s.onerror=()=>no(new Error("couldn't load a helper library (check your internet connection)"));document.head.appendChild(s)});
}
const note=(t,err)=>{const m=$("#scanmsg");if(m)m.innerHTML=err?'<span class="err">'+esc(t)+'</span>':esc(t)};
async function openCam(){
  const v=$("#vid");
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("Camera isn't available here");
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280}}});
  v.hidden=false;v.srcObject=stream;await v.play();return stream;
}
function stopScan(){
  if(!scan)return;
  try{clearInterval(scan.timer)}catch{}
  try{scan.stream&&scan.stream.getTracks().forEach(t=>t.stop())}catch{}
  try{scan.reader&&scan.reader.reset()}catch{}
  scan=null;busy=false;const v=$("#vid");if(v){v.hidden=true;v.srcObject=null}
}
function grab(max){
  const v=$("#vid");if(!v||!v.videoWidth)return null;
  const s=Math.min(1,max/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement("canvas");
  c.width=r0(v.videoWidth*s);c.height=r0(v.videoHeight*s);c.getContext("2d").drawImage(v,0,0,c.width,c.height);
  return c.toDataURL("image/jpeg",.85);
}

/* ---------- BARCODE ---------- */
function barcodePane(){
  return `<p class="muted">Open the camera and point it at a barcode. It's detected automatically.</p>
  <video id="vid" playsinline muted hidden></video><p id="scanmsg" class="muted"></p>
  <button onclick="startBarcode()">Open camera</button>
  <div class="grid" style="margin-top:10px"><input id="bc" inputmode="numeric" placeholder="or type the barcode"><button class="s" onclick="lookup($('#bc').value)">Look up</button></div>
  <div id="bcres">${bcHtml()}</div>`;
}
async function startBarcode(){
  stopScan();const v=$("#vid");
  try{
    if("BarcodeDetector" in window){
      const stream=await openCam();
      const det=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]});
      scan={stream,timer:setInterval(async()=>{try{const r=await det.detect(v);if(r.length){const c=r[0].rawValue;stopScan();lookup(c)}}catch{}},400)};
    }else{
      note("Loading scanner…");v.hidden=false;await loadScript(ZX_URL,()=>window.ZXing);
      const reader=new ZXing.BrowserMultiFormatReader();scan={reader};
      reader.decodeFromVideoDevice(null,"vid",res=>{if(res){const c=res.getText();stopScan();lookup(c)}});
    }
    note("Scanning… hold the barcode steady.");
  }catch(e){stopScan();note("Couldn't start the camera ("+(e.message||e.name)+"). You can type the barcode instead.",true)}
}
function parseOFF(j){
  if(!j||j.status!==1||!j.product)return null;
  const n=j.product.nutriments||{};let c=n["energy-kcal_100g"];
  if(c==null&&n["energy_100g"]!=null)c=n["energy_100g"]/4.184;
  if(c==null)return null;
  const brand=j.product.brands?String(j.product.brands).split(",")[0]:"";
  const name=[brand,j.product.product_name].filter(Boolean).join(" ")||"Scanned product";
  const sv=+j.product.serving_quantity;
  return {name,per:{c:+c,p:+(n.proteins_100g||0),cb:+(n.carbohydrates_100g||0),f:+(n.fat_100g||0)},g:sv>0?sv:100};
}
async function lookup(code){
  code=String(code||"").replace(/\D/g,"");const out=$("#bcres");
  if(!code){out.innerHTML='<p class="err">Enter a barcode number.</p>';return}
  out.innerHTML='<p class="muted">Looking up '+code+'…</p>';
  try{
    const r=await fetch("https://world.openfoodfacts.org/api/v2/product/"+code+".json?fields=product_name,brands,nutriments,serving_quantity");
    const p=parseOFF(await r.json());
    if(!p){BCRES=null;out.innerHTML='<p class="err">Not found in Open Food Facts. Try the Label tab.</p>';return}
    BCRES=p;out.innerHTML=bcHtml();
  }catch{out.innerHTML='<p class="err">Lookup failed. Check your internet connection.</p>'}
}
function bcHtml(){
  if(!BCRES)return "";const p=BCRES.per;
  return `<div class="row"><span><b>${esc(BCRES.name)}</b><br><small>Per 100g: ${r0(p.c)} kcal · ${p.p.toFixed(1)}P · ${p.cb.toFixed(1)}C · ${p.f.toFixed(1)}F</small></span></div>
  <div class="grid" style="margin-top:8px"><label>Amount (g)<input id="bg" type="number" value="${BCRES.g}"></label><button class="s" onclick="addBC()">Add</button></div>
  <p class="muted"><small>From Open Food Facts (free community database). Compare with the pack if it matters.</small></p>`;
}
function addBC(){const g=+$("#bg").value;if(BCRES&&g>0)addE(BCRES.name,g,BCRES.per)}

/* ---------- NUTRITION LABEL (live OCR) ---------- */
function labelPane(){
  return `<p class="muted">Open the camera and hold the nutrition table in view. When it has read calories, protein, carbs and fat, it stops and shows them for you to confirm.</p>
  <video id="vid" playsinline muted hidden></video><p id="scanmsg" class="muted"></p>
  <button onclick="startLabel()">Open camera</button><button class="alt" onclick="labelNow()">Capture now</button>
  <details style="margin-top:12px"><summary class="muted">Already threw the packaging away? Upload a photo of the label</summary>
  <input type="file" accept="image/*" onchange="labelUpload(this.files[0])" style="margin-top:8px"></details>`;
}
/* turn label text into per-100g values */
function parseLabel(raw){
  const t=String(raw||"").toLowerCase().replace(/(\d),(\d)/g,"$1.$2").replace(/\s+/g," ");
  const num=re=>{const m=t.match(re);return m?parseFloat(m[1]):null};
  let c=num(/(\d+(?:\.\d+)?)\s*kcal/);
  if(c==null){const kj=num(/(\d+(?:\.\d+)?)\s*kj/);if(kj!=null)c=kj/4.184}
  if(c==null)c=num(/calories\D{0,6}(\d+(?:\.\d+)?)/);
  const p=num(/protein\D{0,12}?(\d+(?:\.\d+)?)\s*g/),cb=num(/carbohydrate\D{0,15}?(\d+(?:\.\d+)?)\s*g/),f=num(/fat\D{0,12}?(\d+(?:\.\d+)?)\s*g/);
  if(c==null&&p==null&&cb==null&&f==null)return null;
  const sv=num(/serving size[^()]*?\(?\s*(\d+(?:\.\d+)?)\s*g/);
  let basis="assumed",k=1;
  if(/100\s*(g|ml)/.test(t))basis="per100";
  else if(sv>0){basis="serving";k=100/sv}
  const v=x=>x==null?null:Math.round(x*k*10)/10;
  return {c:v(c),p:v(p),cb:v(cb),f:v(f),basis,serving:basis==="serving"?sv:null};
}
// are all four values present and do they make sense together? (guards against misread digits)
function labelValid(r){
  if(!r||[r.c,r.p,r.cb,r.f].some(x=>x==null)||!(r.c>0))return false;
  if(r.p>100||r.cb>100||r.f>100||r.p+r.cb+r.f>105||r.c>950)return false;
  return Math.abs(4*r.p+4*r.cb+9*r.f-r.c)<=0.2*r.c+15;
}
// accept only when two reads in a row agree
function labelFeed(r){
  if(!labelValid(r)){lastKey=null;return null}
  const key=[r.c,r.p,r.cb,r.f].map(x=>r0(x)).join("|");
  if(key===lastKey)return r;
  lastKey=key;return null;
}
async function ocrText(img){
  await loadScript(TESS_URL,()=>window.Tesseract);
  try{if(!OCRW)OCRW=await Tesseract.createWorker("eng");return (await OCRW.recognize(img)).data.text}
  catch{return (await Tesseract.recognize(img,"eng")).data.text}
}
function usePrefill(r){
  const how=r.basis==="per100"?"per 100g":r.basis==="serving"?`converted from a ${r.serving}g serving to per 100g`:"couldn't tell if these are per 100g or per serving, so I assumed per 100g";
  const miss=[["calories",r.c],["protein",r.p],["carbs",r.cb],["fat",r.f]].filter(x=>x[1]==null).map(x=>x[0]);
  PREFILL={n:"",g:r.serving||100,c:r.c,p:r.p,cb:r.cb,f:r.f,msg:`✅ Read from the label (${how}).${miss.length?" Couldn't read: "+miss.join(", ")+".":""} <b>Check the numbers against the pack</b>, add a name, then tap Add.`};
  stopScan();PANE="custom";foodTab();
}
async function startLabel(){
  stopScan();lastKey=null;
  try{
    const stream=await openCam();scan={stream};
    note("Loading the text reader… the first time takes a moment.");
    await loadScript(TESS_URL,()=>window.Tesseract);
    if(!scan)return;
    scan.timer=setInterval(labelTick,1800);note("Hold the nutrition table steady in view…");
  }catch(e){stopScan();note("Couldn't start the camera ("+(e.message||e.name)+"). Use the upload option below.",true)}
}
async function labelTick(){
  if(busy||!scan)return;busy=true;
  try{
    const img=grab(1280);if(!img)return;
    const r=parseLabel(await ocrText(img));if(!scan)return;
    const hit=labelFeed(r);
    if(hit)usePrefill(hit);
    else note(r?"Reading… keep the whole table in view and steady.":"Looking for a nutrition table…");
  }catch(e){note(e.message,true)}finally{busy=false}
}
async function labelNow(){
  if(!scan){note("Open the camera first.",true);return}
  note("Reading…");
  try{const img=grab(1280);const r=img&&parseLabel(await ocrText(img));r?usePrefill(r):note("Couldn't find a nutrition table. Move closer and try again.",true)}
  catch(e){note(e.message,true)}
}
async function labelUpload(file){
  if(!file)return;note("Reading your photo… the first time takes a moment.");
  try{const b=await toJpeg(file);const r=parseLabel(await ocrText("data:image/jpeg;base64,"+b));
    if(r)usePrefill(r);else note("Couldn't find a nutrition table in that photo. Try a sharper, straight-on one, or type it in Custom.",true)}
  catch(e){note(e.message,true)}
}

/* ---------- PLATE (on-device food recogniser) ---------- */
// id, what the model looks for, name, kcal, protein, carbs, fat (per 100g, as eaten/cooked), typical grams
// Standard cooked-food values from general knowledge (not individually verified)
const PLATE_DB=[
["chicken","grilled chicken breast","Chicken breast (cooked)",165,31,0,3.6,150],
["beef","cooked minced beef","Beef mince (cooked, lean)",175,26,0,7.5,120],
["salmon","baked salmon fillet","Salmon (cooked)",206,22,0,12,130],
["fish","baked white fish fillet","White fish (cooked)",105,23,0,0.9,150],
["shrimp","cooked shrimp","Shrimp (cooked)",99,24,0.2,0.3,100],
["eggs","boiled eggs","Eggs (boiled)",155,12.6,1.1,10.6,100],
["tofu","fried tofu","Firm tofu",144,17.3,2.8,8.7,150],
["rice","cooked white rice","Rice (cooked)",130,2.7,28,0.3,180],
["pasta","cooked pasta","Pasta (cooked)",158,5.8,31,0.9,200],
["quinoa","cooked quinoa","Quinoa (cooked)",120,4.4,21,1.9,150],
["potato","boiled potatoes","Potatoes (boiled)",87,1.9,20,0.1,200],
["fries","french fries","French fries",312,3.4,41,15,100],
["sweetpotato","baked sweet potato","Sweet potato (baked)",90,2,21,0.2,200],
["bread","slices of bread","Bread",250,9,46,3,60],
["broccoli","steamed broccoli","Broccoli (cooked)",35,2.4,7.2,0.4,100],
["salad","green salad leaves","Green salad",23,2.9,3.6,0.4,60],
["tomato","sliced tomatoes","Tomatoes",18,0.9,3.9,0.2,80],
["cucumber","sliced cucumber","Cucumber",15,0.7,3.6,0.1,80],
["carrot","cooked carrots","Carrots (cooked)",35,0.8,8,0.2,80],
["avocado","sliced avocado","Avocado",160,2,8.5,14.7,70],
["banana","a banana","Banana",89,1.1,23,0.3,100],
["apple","an apple","Apple",52,0.3,14,0.2,150],
["porridge","a bowl of oatmeal porridge","Porridge (cooked oats)",71,2.5,12,1.5,250],
["yogurt","a bowl of greek yogurt","Greek yogurt",60,10,3.6,0.4,150],
["cottage","cottage cheese","Cottage cheese",98,11,3.4,4.3,100],
["cheese","slices of cheese","Cheddar cheese",403,22.9,3.4,33.3,30],
["pizza","a slice of pizza","Pizza",266,11,33,10,120],
["beans","cooked beans","Beans (cooked)",132,8.9,24,0.5,120],
["chickpeas","cooked chickpeas","Chickpeas (cooked)",164,8.9,27,2.6,120],
["lentils","cooked lentils","Lentils (cooked)",116,9,20,0.4,150]
];
const plateLabel=d=>"a photo of "+d[1];
function platePane(){
  return `<p class="muted">Open the camera and point it at your plate. It suggests what it sees. You set the amounts, because a photo can't judge portion size.</p>
  <video id="vid" playsinline muted hidden></video><p id="scanmsg" class="muted"></p>
  <button onclick="startPlate()">Open camera</button><button class="alt" onclick="plateNow()">Capture now</button>
  <div id="plres">${plateHtml()}</div>`;
}
async function getClip(){
  if(CLIP)return CLIP;
  const {pipeline}=await import(CLIP_URL);
  const pipe=await pipeline("zero-shot-image-classification","Xenova/clip-vit-base-patch32");
  const labels=PLATE_DB.map(plateLabel);
  CLIP=async img=>(await pipe(img,labels)).sort((a,b)=>b.score-a.score);
  return CLIP;
}
function plateSugs(res,minScore){
  return res.filter((x,i)=>i===0||x.score>=minScore).slice(0,4).map(x=>{
    const d=PLATE_DB.find(p=>plateLabel(p)===x.label);
    return d?{name:d[2],g:d[7],on:true,per:{c:d[3],p:d[4],cb:d[5],f:d[6]},score:x.score}:null;
  }).filter(Boolean);
}
// auto-catch: the same top guess, confident, on two checks in a row
function plateFeed(res){
  const top=res&&res[0];
  if(!top||top.score<0.3){lastPlate="";return null}
  if(top.label===lastPlate)return plateSugs(res,0.1);
  lastPlate=top.label;return null;
}
function showPlate(list){stopScan();PLATE=list;$("#plres").innerHTML=plateHtml();note(list.length?"Got it. Tick what's on your plate and set the grams.":"Couldn't recognise anything. Try the Quick add or Custom tab.")}
async function startPlate(){
  stopScan();lastPlate="";PLATE=[];$("#plres").innerHTML="";
  try{
    const stream=await openCam();scan={stream};
    note("Loading the food recogniser… the first time downloads a model, so it can take a while.");
    await getClip();if(!scan)return;
    scan.timer=setInterval(plateTick,2500);note("Hold your plate in view…");
  }catch(e){stopScan();note("Couldn't start ("+(e.message||e.name)+").",true)}
}
async function plateTick(){
  if(busy||!scan)return;busy=true;
  try{const img=grab(448);if(!img)return;const res=await (await getClip())(img);if(!scan)return;const hit=plateFeed(res);if(hit)showPlate(hit)}
  catch(e){note(e.message,true)}finally{busy=false}
}
async function plateNow(){
  if(!scan){note("Open the camera first.",true);return}
  note("Looking…");
  try{const img=grab(448);const res=img&&await (await getClip())(img);res?showPlate(plateSugs(res,0.05)):note("No picture yet. Wait a second and try again.",true)}
  catch(e){note(e.message,true)}
}
function plateHtml(){
  if(!PLATE.length)return "";
  return PLATE.map((x,i)=>`<div class="row"><span><label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" ${x.on?"checked":""} onchange="PLATE[${i}].on=this.checked"> ${esc(x.name)}</label>
  <small>${r0(x.per.c*x.g/100)} kcal · ${r0(x.per.p*x.g/100)}P · ${r0(x.per.cb*x.g/100)}C · ${r0(x.per.f*x.g/100)}F</small></span>
  <span><input type="number" value="${r0(x.g)}" style="width:80px" onchange="PLATE[${i}].g=+this.value||1;$('#plres').innerHTML=plateHtml()"> g</span></div>`).join("")+`<button onclick="addPlate()">Add selected</button>`;
}
function addPlate(){
  const sel=PLATE.filter(x=>x.on);if(!sel.length)return;
  sel.forEach(x=>(S.log[FD]=S.log[FD]||[]).push({id:uid(),meal:OPEN,name:x.name,g:r0(x.g),per:x.per}));
  put("log");PLATE=[];foodTab();
}