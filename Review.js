/* ===== WEEKLY CHECK-IN: weight trend + food + steps + lifts -> small, safe adjustments ===== */
const avgOf=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
// values of a body metric from `from` days ago to `to` days ago (inclusive)
function windowVals(k,from,to){const lo=shift(today(),-from),hi=shift(today(),-to);return seriesOf(k).filter(x=>x.d>=lo&&x.d<=hi).map(x=>x.v)}
function intakeAvg(){
  const days=[];for(let i=0;i<7;i++){const L=S.log[shift(today(),-i)]||[];if(L.length)days.push(tot(L).c)}
  return {avg:avgOf(days),days:days.length};
}
// strength signal: best estimated one-rep max (Epley) per exercise, this week vs last week
function liftSignal(){
  const t=today(),a0=shift(t,-6),b0=shift(t,-13),b1=shift(t,-7),best={};
  for(const d of Object.keys(S.workouts)){
    const inA=d>=a0&&d<=t,inB=d>=b0&&d<=b1;if(!inA&&!inB)continue;
    for(const e of S.workouts[d]){if(e.mode!=="wr")continue;
      for(const s of e.sets){const w=+s.w,r=+s.r;if(!(w>0&&r>0))continue;
        const o=best[e.name.toLowerCase()]=best[e.name.toLowerCase()]||{},k=inA?"a":"b";o[k]=Math.max(o[k]||0,w*(1+r/30))}}
  }
  const ch=Object.values(best).filter(o=>o.a&&o.b).map(o=>(o.a/o.b-1)*100);
  const sessions=Object.keys(S.workouts).filter(d=>d>=a0&&d<=t&&S.workouts[d].some(e=>e.sets.some(s=>s.w||s.r||s.t||s.d))).length;
  return {n:ch.length,pct:ch.length?avgOf(ch):null,sessions};
}
function weeklyReview(){
  const P=S.profile,goal=P.goal,tw=+P.tw||0,T=P.kcal;
  const w1=windowVals("w",6,0),w0=windowVals("w",13,7);
  if(w1.length<3)return {state:"need",title:"Weekly check-in",lines:[`Log your weight at least 3 times this week to get your check-in. You have ${w1.length} so far.`],tips:[]};
  if(goal==="maintain"&&!tw)return {state:"need",title:"Weekly check-in",lines:["Set the weight you want to maintain in Profile (Target weight)."],tips:[]};
  const A1=avgOf(w1),A0=w0.length>=2?avgOf(w0):null,ch=A0!=null?A1-A0:null;
  const it=intakeAvg(),kc=it.days>=3?r0(it.avg):null,steps=avgOf(windowVals("steps",6,0)),lift=liftSignal();
  const lines=[`Your 7-day average weight is <b>${fmt(A1)} kg</b>${ch!=null?` (${ch>=0?"+":""}${fmt(ch)} kg vs last week)`:""}.`],tips=[];let state="good",title="";
  const stepsTxt=steps!=null?`you're averaging about ${r0(steps)} steps a day`:"";
  const eatTxt=kc!=null&&Math.abs(kc-T)>T*0.1?`You logged about ${kc} kcal a day against a ${T} target, so check your tracking before changing the target.`:"";
  const liftUp=lift.n>0&&lift.pct>2,liftDown=lift.n>0&&lift.pct<-3;
  if(goal==="maintain"){
    const tol=Math.max(0.5,tw*0.006),diff=A1-tw;
    if(Math.abs(diff)<=tol){
      title="On target ✅";lines.push(`That's within ${fmt(Math.abs(diff))} kg of the ${fmt(tw)} kg you're maintaining. Keep doing what you're doing.`);
      if(ch!=null&&Math.abs(ch)>tol*0.8){state="watch";title="On target, but drifting";tips.push(`Your average moved ${ch>0?"up":"down"} ${fmt(Math.abs(ch))} kg this week. It's still in range. If it keeps going the same way next week, ${ch>0?"trim about 100 kcal a day or add about 1,000 steps":"add about 100–150 kcal a day"}.`)}
    }else if(diff<0){
      state="adjust";title="Below your maintenance weight";
      lines.push(`That's <b>${fmt(Math.abs(diff))} kg below</b> the ${fmt(tw)} kg you want to maintain.`);
      tips.push(`Add about <b>100–150 kcal a day</b> (a snack or a bigger portion), then re-check next week.`);
      if(steps!=null&&steps>=10000)tips.push(`Another lever: ${stepsTxt}. Trimming 1,000–2,000 of those steps would also help.`);
      if(liftDown)tips.push(`Your strength is down about ${fmt(Math.abs(lift.pct))}%, a sign you may be under-fuelled for training. Eating more is the better lever than cutting activity.`);
      if(eatTxt)tips.push(eatTxt);
    }else{
      state="adjust";title="Above your maintenance weight";
      lines.push(`That's <b>${fmt(diff)} kg above</b> the ${fmt(tw)} kg you want to maintain.`);
      tips.push(`Trim about <b>100–150 kcal a day</b>, or add <b>1,000–2,000 steps a day</b> (very roughly 50–100 kcal), then re-check next week.`);
      if(steps!=null)tips.push(`Right now ${stepsTxt}.`);
      if(liftUp&&ch!=null&&ch<=0.4)tips.push(`Your lifts are up about ${fmt(lift.pct)}%, so some of this may be muscle. If you're happy with how you look, you can hold steady.`);
      if(eatTxt)tips.push(eatTxt);
    }
  }else if(ch==null){
    state="need";title="Need one more week";lines.push("Keep logging. I need a previous week of weigh-ins (at least 2) to judge your trend.");
  }else{
    const pct=ch/A0*100,lo=goal==="lose"?-1.0:0.1,hi=goal==="lose"?-0.25:0.5;
    if(pct>=lo&&pct<=hi){title="Right on pace ✅";lines.push(`Your rate (${pct>=0?"+":""}${pct.toFixed(2)}% of bodyweight a week) is where it should be.`)}
    else{
      state="adjust";
      const tooLow=goal==="lose"?pct>hi:pct<lo;   // lose: not losing enough. gain: not gaining enough
      title=goal==="lose"?(tooLow?"Losing slower than planned":"Losing quite fast"):(tooLow?"Gaining slower than planned":"Gaining quite fast");
      lines.push(`Your rate is ${pct>=0?"+":""}${pct.toFixed(2)}% of bodyweight a week.`);
      if(goal==="lose"&&tooLow)tips.push(`Trim about <b>100–150 kcal a day</b> or add <b>1,000–2,000 steps</b>, then re-check next week.`);
      if(goal==="lose"&&!tooLow)tips.push(`Add about <b>100–150 kcal a day</b>. Losing this fast risks muscle and energy.`);
      if(goal==="gain"&&tooLow)tips.push(`Add about <b>150–200 kcal a day</b>, then re-check next week.`);
      if(goal==="gain"&&!tooLow)tips.push(`Trim about <b>100 kcal a day</b> to keep the gain mostly lean.`);
      if(liftDown)tips.push(`Your strength is down about ${fmt(Math.abs(lift.pct))}%. Don't cut calories further. Hold or eat a little more.`);
      if(eatTxt)tips.push(eatTxt);
    }
  }
  if(lift.n>0)lines.push(`Lifts: your best estimated lifts are ${lift.pct>=0?"up":"down"} <b>${fmt(Math.abs(lift.pct))}%</b> across ${lift.n} exercise${lift.n>1?"s":""} (${lift.sessions} session${lift.sessions===1?"":"s"} this week).`);
  else if(lift.sessions)lines.push(`You trained ${lift.sessions} time${lift.sessions===1?"":"s"} this week. Log the same lifts two weeks in a row and I'll compare your strength.`);
  if(steps==null)lines.push(`Tip: log your daily steps in Progress and I'll factor them in.`);
  return {state,title,lines,tips};
}
function reviewCard(){
  const r=weeklyReview(),cls={good:"ok",watch:"watch",adjust:"adj",need:"need"}[r.state];
  return `<div class="card rv ${cls}"><div class="mh"><h2>📋 Weekly check-in</h2><small>last 7 days</small></div>
  ${r.state!=="need"?`<div class="rvt">${r.title}</div>`:""}
  ${r.lines.map(x=>`<p>${x}</p>`).join("")}
  ${r.tips.length?`<div class="rvtips">${r.tips.map(x=>`<p>👉 ${x}</p>`).join("")}</div>`:""}
  <p class="muted"><small>Small adjustments, then re-check. These are estimates, not medical advice.</small></p></div>`;
}