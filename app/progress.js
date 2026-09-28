// Completed attempts form an append-only local history. Legacy results lack dates.
globalThis.CLATProgress=(()=>{
 const key='clat-speed-attempts-v1';let attempts=[],demo=false;
 const valid=a=>a&&typeof a.id==='string'&&typeof a.title==='string'&&Number.isInteger(a.total)&&a.total>0&&Number.isInteger(a.correct)&&a.correct>=0&&a.correct<=a.total&&(a.wpm===null||(Number.isFinite(a.wpm)&&a.wpm>0));
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))attempts=saved.filter(valid);}catch{}
 // Publish to the in-memory dashboard only after the append is durable.
 const record=a=>{if(!valid(a))return false;if(attempts.some(x=>x.id===a.id))return true;const next=[...attempts,a];try{localStorage.setItem(key,JSON.stringify(next));attempts=next;return true;}catch{return false;}};
 const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function migrate(items){let migrated=[];try{migrated=JSON.parse(localStorage.getItem(key+'-imported')||'[]');if(!Array.isArray(migrated))migrated=[];}catch{}for(const a of items){if(!migrated.includes(a.id)){const exists=attempts.some(x=>x.id===a.id||(a.setId&&x.setId===a.setId)||(a.title==='Diagnostic'&&x.title==='Diagnostic'));if(exists||record({...a,date:null,imported:true}))migrated.push(a.id);}}try{localStorage.setItem(key+'-imported',JSON.stringify(migrated));}catch{}}
 // Dashboard projection only: keep the raw history intact for reviews and recovery.
 function firstAttempts(){
  const sets=globalThis.CLATPracticeSets||[],known=new Set(sets.map(s=>s.id)),savedByAttempt=new Map();
  try{const saved=JSON.parse(localStorage.getItem('clat-speed-practice-v1')||'{}');for(const [setId,result] of Object.entries(saved||{}))if(result?.attemptId)savedByAttempt.set(result.attemptId,setId);}catch{}
  const seen=new Set();
  return attempts.filter(a=>{
   const legacyId=a.id.startsWith('legacy-')?a.id.slice(7):null;
   const setId=a.setId||savedByAttempt.get(a.id)||(known.has(legacyId)?legacyId:null);
   // Old subject-only titles cannot reliably identify a set; never merge by subject.
   const identity=setId?'set:'+setId:a.title==='Diagnostic'?'diagnostic:original':a.title==='Daily workout'?'daily:original':'attempt:'+a.id;
   if(seen.has(identity))return false;
   seen.add(identity);return true;
  });
 }
 const isBaseline=a=>a.kind==='baseline'||a.title==='Diagnostic';
 const usable=a=>globalThis.CLATScoring.usableSpeed(a);
 function dashboardRows(){
  return firstAttempts().filter(a=>!isBaseline(a)).map(a=>{
   const source=usable(a)?a:a.setId?attempts.find(x=>x.setId===a.setId&&!isBaseline(x)&&usable(x)):null;
   return {...a,wpm:source?.wpm??null,speedAttemptId:source?.id??null,repeatReading:!!source&&source.id!==a.id};
  });
 }
 function baselines(){
  const seen=new Set();return attempts.filter(a=>{if(!isBaseline(a))return false;const type=a.baselineType||'diagnostic';if(seen.has(type))return false;seen.add(type);return true;});
 }
 // Include each baseline once without changing the underlying Practice projection.
 function activityRows(){const order=new Map(attempts.map((a,i)=>[a.id,i]));return [...dashboardRows(),...baselines().map(a=>({...a,wpm:usable(a)?a.wpm:null,repeatReading:false}))].sort((a,b)=>order.get(a.id)-order.get(b.id));}
 const duration=seconds=>{if(seconds===null)return '—';const rounded=Math.round(seconds);return `${Math.floor(rounded/60)}m ${String(rounded%60).padStart(2,'0')}s`;};
 const names={'English Language':'English','Current Affairs & GK':'GK','Legal Reasoning':'Legal','Logical Reasoning':'Logical','Quantitative Techniques':'Quant'};
 let subject='all',metric='accuracy';
 const sectionOf=a=>isBaseline(a)?'English Language':Object.keys(names).find(s=>a.section===s||a.title===s||a.title==='Daily workout · '+s)||null;
 const accuracy=rows=>{const n=rows.reduce((s,a)=>s+a.total,0);return n?Math.round(rows.reduce((s,a)=>s+a.correct,0)/n*100):null;};
 const median=values=>{const v=[...values].sort((a,b)=>a-b),n=v.length;return n?Math.round(n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2):null;};
 const num=v=>v===null?'—':v;
 function plot(rows){
  const speed=metric==='wpm',data=rows.map((a,i)=>({...a,number:i+1})).filter(a=>!speed||a.wpm!==null),values=data.map(a=>speed?a.wpm:a.correct/a.total*100);
  const count=rows.length,max=speed?Math.max(100,Math.ceil(values.reduce((m,v)=>Math.max(m,v),0)/100)*100):100;
  const x=n=>count===1?184:52+(n-1)/Math.max(1,count-1)*264,y=v=>140-v/max*112;
  const pts=values.map((v,i)=>[x(data[i].number),y(v)]),line=pts.map((p,i)=>(i&&data[i].number===data[i-1].number+1?'L':'M')+p.join(',')).join(' ');
  // Keep the full history, thinning axis labels rather than dropping results.
  const rawStep=Math.max(1,(count-1)/4),power=10**Math.floor(Math.log10(rawStep)),step=[1,2,5,10].map(n=>n*power).find(n=>n>=rawStep);
  const ticks=count?[1]:[];
  for(let n=step;n<count;n+=step)if(n>1&&n-1>=step*.55&&count-n>=step*.55)ticks.push(n);
  if(count>1)ticks.push(count);
  return `<svg class="pf-plot" viewBox="0 0 332 201" role="img" aria-label="${speed?'Reading speed in words per minute':'Accuracy in percent'} across ${count} completed activities; ${data.length} measured attempts: ${values.map(Math.round).join(', ')}"><defs><linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${speed?'#ab98f3':'#7ed8c4'}" stop-opacity=".22"/><stop offset="100%" stop-color="#7ed8c4" stop-opacity="0"/></linearGradient></defs>${[0,.5,1].map(f=>`<line x1="52" x2="316" y1="${y(f*max)}" y2="${y(f*max)}" stroke="#ffffff12" stroke-dasharray="2 5"/><text x="44" y="${y(f*max)+4}" text-anchor="end">${Math.round(f*max)}${speed?'':'%'}</text>`).join('')}${pts.length>1?`${speed?'':`<path d="${line} L${pts.at(-1)[0]},140 L${pts[0][0]},140 Z" fill="url(#pf-area)"/>`}<path d="${line}" fill="none" stroke="${speed?'#bba4ff':'#7ed8c4'}" stroke-width="${data.length>40?1.5:2.5}" stroke-linejoin="round"/>`:''}${pts.map(([px,py],i)=>`<circle cx="${px}" cy="${py}" r="${speed&&data[i].repeatReading?4:i===pts.length-1?4.5:data.length>40?1:3}" fill="${speed&&data[i].repeatReading?'#211d2e':speed?'#bba4ff':'#7ed8c4'}" stroke="${speed&&data[i].repeatReading?'#bba4ff':'#211d2e'}" stroke-width="${speed&&data[i].repeatReading?2:data.length>40?0:2}"><title>Activity ${data[i].number} · ${isBaseline(data[i])?'Baseline · ':''}${escape(names[sectionOf(data[i])]||'Unclassified')}${speed&&data[i].repeatReading?' · Repeat reading':''} · ${escape(data[i].setTitle||data[i].title)}: ${Math.round(values[i])}${speed?' WPM':'%'}</title></circle>`).join('')}${ticks.map(n=>`<text class="pf-axis-tick" x="${x(n)}" y="164" text-anchor="${count===1?'middle':n===1?'start':n===count?'end':'middle'}">${n}</text>`).join('')}${count?'<text x="184" y="190" text-anchor="middle">Activity completion order</text>':''}${!data.length?`<text x="184" y="88" text-anchor="middle">${count&&speed?'No valid readings yet':'No results yet'}</text>`:''}</svg><p class="pf-history-note">${count} completed ${count===1?'activity':'activities'}${rows.some(isBaseline)?' · Includes baseline':''}${speed?' · WPM':''}</p>`;
 }
 function render(baseline,context={}){

  const unique=activityRows(),all=subject==='all'?unique:unique.filter(a=>sectionOf(a)===subject),reading=all.filter(a=>a.wpm!==null);
  const acc=accuracy(all),speed=median(reading.map(a=>a.wpm));
  const timed=all.filter(a=>Number.isFinite(a.seconds)&&a.seconds>0),average=timed.length?timed.reduce((n,a)=>n+a.seconds,0)/timed.length:null;
  const subjects=context.subjects||[],selected=subjects.find(s=>s.section===subject);
  return `<div class="pf-heading"><h1>Dashboard</h1></div>
  <button class="pf-overview" data-action="progress-subject" data-subject="all" aria-pressed="${subject==='all'}"><i data-lucide="layout-dashboard" aria-hidden="true"></i><span><strong>Overview</strong><small>All subjects</small></span><i data-lucide="${subject==='all'?'circle-check':'chevron-right'}" aria-hidden="true"></i></button>
  <div class="pf-subject-label">Subject wise</div>
  <div class="pf-filters" role="group" aria-label="Filter dashboard by subject">${Object.entries(names).map(([id,label])=>`<button data-action="progress-subject" data-subject="${escape(id)}" aria-label="${escape(id)}" aria-pressed="${subject===id}">${label}</button>`).join('')}</div>
  ${subject==='all'?'':`<div class="pf-scope"><span>${escape(subject)}</span></div>`}
  <section class="pf-scorecard pf-equal-metrics" aria-label="Dashboard summary">${[
   ['Completed activities',all.length.toLocaleString(),'','First completion per set + baseline'],
   ['Average attempt time',duration(average),'',timed.length+' recorded timings'],
   ['Question accuracy',num(acc),acc===null?'':'%','Correct / all questions'],
   ['Median reading speed',num(speed),speed===null?'':'WPM',reading.length+' valid readings'+(subject==='all'?' · Across subjects':'')]
  ].map(([label,value,unit,note])=>`<div class="pf-metric"><div class="pf-metric-title">${label}</div><strong>${value}${unit?`<span>${unit}</span>`:''}</strong><small>${note}</small></div>`).join('')}</section>
  <section class="pf-chart"><div class="pf-chart-header"><h2>Your Progress</h2><div class="pf-switch" role="group" aria-label="Chart metric"><button data-action="progress-metric" data-metric="wpm" aria-pressed="${metric==='wpm'}">Speed</button><button data-action="progress-metric" data-metric="accuracy" aria-pressed="${metric==='accuracy'}">Accuracy</button></div></div>${plot(all)}${all.length?`<details class="pf-activity-key"><summary>Activity details</summary>${metric==='wpm'?'<p>The line follows your recorded readings. Different subjects and passages vary in difficulty. Hollow points show repeat readings; missing or unreliable readings are omitted.</p>':''}${all.map((a,i)=>`<p>${i+1} · ${escape(names[sectionOf(a)]||'Unclassified')} · ${isBaseline(a)?'Baseline':escape(a.setTitle||a.title)}: <b>${metric==='wpm'?(a.wpm===null?'No reliable reading':Math.round(a.wpm)+' WPM') :Math.round(a.correct/a.total*100)+'%'}</b>${a.repeatReading&&metric==='wpm'?' · Repeat reading':''}</p>`).join('')}</details>`:''}</section>
  ${selected?`<button class="pf-practise" data-action="open-practice" data-set="${escape(selected.id)}">Practise ${escape(names[subject])}<i data-lucide="arrow-right" aria-hidden="true"></i></button>`:''}

  <section class="pf-baselines"><h2>Starting baseline</h2><p>English assessments · included in activity totals and graphs</p>${baselines().length?baselines().map(a=>`<div class="pf-baseline"><h3>${a.baselineType==='onboarding'?'Introductory speed check':'Diagnostic'}</h3><p>${a.correct} / ${a.total} correct · ${usable(a)?Math.round(a.wpm)+' WPM':a.speedStatus==='unreliable'?'Reading too brief · speed excluded':'No reliable reading speed'}</p><p>${Number.isFinite(a.seconds)&&a.seconds>0?'Total time: '+duration(a.seconds):'Total time not recorded'}</p></div>`).join(''):'<p>No baseline recorded yet.</p>'}</section>
  ${globalThis.CLATAchievements?.render()||''}
`;
 }

 return {record,migrate,id,render,firstAttempts:()=>firstAttempts().map(a=>({...a})),dashboardRows:()=>dashboardRows().map(a=>({...a})),activityRows:()=>activityRows().map(a=>({...a})),baselines:()=>baselines().map(a=>({...a})),selectSubject(value){if(value==='all'||names[value])subject=value;},selectMetric(value){if(['accuracy','wpm'].includes(value))metric=value;},toggle(){demo=!demo;},real(){demo=false;},all:()=>attempts.map(a=>({...a}))};
})();
