/* ===== RECIPES PAGE ===== */
let IDEA={meal:"d",time:30,diet:""},IDEAS=[];
function mealsTab(){
  $("#meals").innerHTML=`<div class="card"><h2>🍳 Recipes for what's left today</h2><div class="grid">
  <label>Meal<select id="i_meal" onchange="ideasDraw()">${opts([["b","Breakfast"],["l","Lunch"],["d","Dinner"]],IDEA.meal)}</select></label>
  <label>Max time<select id="i_time" onchange="ideasDraw()">${opts([[10,"10 min"],[20,"20 min"],[30,"30 min"],[60,"60 min"]],IDEA.time)}</select></label>
  <label>Diet<select id="i_diet" onchange="ideasDraw()"><option value="">None</option>${Object.keys(DIET).map(d=>`<option ${d===IDEA.diet?"selected":""}>${d}</option>`).join("")}</select></label></div>
  <p id="i_rem" class="muted"></p></div><div id="i_out"></div>`;
  ideasDraw();
}
function ideasDraw(){
  IDEA={meal:$("#i_meal").value,time:+$("#i_time").value,diet:$("#i_diet").value};
  const t=tot(S.log[today()]||[]),rc=Math.max(250,S.profile.kcal-t.c),rp=Math.max(0,S.profile.prot-t.p);
  $("#i_rem").innerHTML=`Remaining today: <b>${r0(rc)} kcal</b>, <b>${r0(rp)}g protein</b>. Portions are scaled to fit.`;
  const sumI=a=>a.reduce((s,{k,g})=>{s.c+=FOOD[k][0]*g/100;s.p+=FOOD[k][1]*g/100;s.cb+=MAC[k][0]*g/100;s.f+=MAC[k][1]*g/100;return s},{c:0,p:0,cb:0,f:0});
  IDEAS=R.filter(r=>r.m.includes(IDEA.meal)&&r.t<=IDEA.time&&(!IDEA.diet||!DIET[IDEA.diet].test(r.i.split(",").map(x=>FOOD[x.split(":")[0]][3]).join(""))))
   .map(r=>{
     const base=r.i.split(",").map(x=>{const[k,g]=x.split(":");return{k,g:+g}});
     const s=Math.min(1.6,Math.max(.5,rc/sumI(base).c));
     const items=base.map(({k,g})=>({k,g:k==="egg"?Math.max(50,r0(g*s/50)*50):Math.max(5,r0(g*s/5)*5)}));
     const n=sumI(items),err=Math.abs(n.c-rc)/rc+(rp?Math.max(0,rp-n.p)/rp*1.5:0);
     return{r,items,n,err};
   }).sort((a,b)=>a.err-b.err).slice(0,3);
  $("#i_out").innerHTML=IDEAS.length?IDEAS.map(({r,items,n},i)=>`<div class="card">
   <h2>${esc(r.n)}</h2>
   <p class="muted"><small>${r.u?`${esc(r.src)} · <a href="${esc(r.u)}" target="_blank" rel="noopener">view original</a>`:"Classic home recipe (own build)"}${r.ref?`<br>${esc(r.ref)}`:""}</small></p>
   <div class="stats"><span>⏱️ ${r.t} min</span><span>🔥 ${r0(n.c)} kcal</span><span>🥩 ${r0(n.p)}g</span><span>🍞 ${r0(n.cb)}g</span><span>🧈 ${r0(n.f)}g</span></div>
   <b>Ingredients</b><ul>${items.map(x=>`<li>${x.g}g ${esc(FOOD[x.k][2].toLowerCase())}</li>`).join("")}</ul>
   <b>Instructions</b><ol>${r.s.split(";").map(x=>x.split("|")).map(([a,m])=>`<li>${esc(a)} — ${m} min</li>`).join("")}</ol>
   <button onclick="logIdea(${i})">Log to ${{b:"Breakfast",l:"Lunch",d:"Dinner"}[IDEA.meal]}</button></div>`).join(""):'<div class="card muted">No recipes match. Try more time or a different meal.</div>';
}
function logIdea(i){
  const {items}=IDEAS[i],d=today();
  items.forEach(({k,g})=>(S.log[d]=S.log[d]||[]).push({id:uid(),meal:IDEA.meal,name:FOOD[k][2],g,per:{c:FOOD[k][0],p:FOOD[k][1],cb:MAC[k][0],f:MAC[k][1]}}));
  put("log");FD=d;OPEN=null;tab("food");
}