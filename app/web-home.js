// Home dashboard for the web portal (replaces the phone layout's home screen via a build patch).
// Leads with reading speed and accuracy, then today's question, revision, subjects, mocks and Premium.
// Everything shown is computed from the learner's own saved attempts; nothing is invented.
(() => {
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const DAY=86400000;
 const examDates={'2026':[2025,11,7],'2027':[2026,11,6]};
 const shortNames={'English Language':'English','Current Affairs & GK':'Current Affairs & GK','Legal Reasoning':'Legal Reasoning','Logical Reasoning':'Logical Reasoning','Quantitative Techniques':'Quantitative Techniques'};
 const tone={'English Language':'en','Current Affairs & GK':'gk','Legal Reasoning':'lr','Logical Reasoning':'lg','Quantitative Techniques':'qt'};
 const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
 const when=r=>{const t=Date.parse(r.date||r.finished||'');return Number.isFinite(t)?t:null;};

 let yearEdit=false,ctx=null;
 function countdown(profile,now){
  if(yearEdit)return `<div class="wh-count wh-count-edit" role="group" aria-label="Which CLAT are you taking?">${['2027','2028','2029'].map(y=>`<button data-wh="year" data-year="${y}" aria-pressed="${(profile.examYear||'2027')===y}">${y}</button>`).join('')}<button data-wh="year-cancel" class="wh-x" aria-label="Cancel">✕</button></div>`;
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  let year=profile.examYear||'2027';
  if(examDates[year]&&Date.UTC(...examDates[year])<today)year=Object.keys(examDates).find(y=>Date.UTC(...examDates[y])>=today)||String(now.getFullYear()+1);
  const d=examDates[year];
  if(!d)return `<button class="wh-count" data-wh="year-edit"><span>CLAT ${esc(year)}<br><small>Date to be announced</small></span><em>Change</em></button>`;
  const days=Math.round((Date.UTC(...d)-today)/DAY),date=new Date(Date.UTC(...d)).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
  return `<button class="wh-count" data-wh="year-edit" aria-label="CLAT ${year}: ${days} days to go. Change your CLAT year"><b>${days}</b><span>${days===1?'day':'days'} to CLAT ${esc(year)}<br><small>${date}</small></span><em>Change</em></button>`;
 }

 function chart(vals){
  const lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max(20,(hi-lo)*0.15),min=Math.max(0,Math.floor((lo-pad)/25)*25),max=Math.ceil((hi+pad)/25)*25;
  const x=i=>vals.length===1?310:40+i*540/(vals.length-1),y=v=>150-(v-min)*130/(max-min||1);
  const line=vals.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const mid=Math.round((min+max)/2);
  return `<svg class="wh-chart" viewBox="0 0 600 176" role="img" aria-label="Reading speed over your last ${vals.length} ${vals.length===1?'set':'sets'}, from ${vals[0]} to ${vals[vals.length-1]} words per minute.">
   <path class="g" d="M40 150H580M40 85H580M40 20H580"/><text x="32" y="154" text-anchor="end">${min}</text><text x="32" y="89" text-anchor="end">${mid}</text><text x="32" y="24" text-anchor="end">${max}</text>
   ${vals.length>1?`<path class="a" d="${line}L580 150L40 150Z"/><path class="l" d="${line}"/>`:''}
   ${vals.map((v,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i===vals.length-1?5:3.5}"${i===vals.length-1?' class="last"':''}/>`).join('')}
   <text x="40" y="172">${vals.length>1?vals.length+' sets ago':''}</text><text x="580" y="172" text-anchor="end">Latest</text></svg>`;
 }

 function speedPanel(rows,now){
  const timed=rows.filter(r=>r.wpm!==null&&r.wpm>0);
  const answered=rows.filter(r=>r.total>0);
  if(!timed.length&&!answered.length){
   return `<section class="wh-panel wh-hero"><div class="wh-top"><h2>Reading speed and accuracy</h2></div>
    <div class="wh-stats wh-blank"><div><b>–<small>WPM</small></b><p>Reading speed</p></div><div><b>–<small>%</small></b><p>Answer accuracy</p></div></div>
    <div class="wh-empty-chart" aria-hidden="true"><svg viewBox="0 0 600 120" preserveAspectRatio="none"><path d="M0 110H600M0 60H600M0 10H600"/><path class="d" d="M0 92 C150 88 250 70 330 62 S520 34 600 26"/></svg><span>Your first set starts this chart</span></div>
    <div class="wh-foot"><p class="wh-lead">Speed and accuracy are measured after every set you finish, so you can watch both climb before exam day.</p><button class="wh-mint" data-action="open-practice">Start practising</button></div></section>`;
  }
  const last=timed.slice(-10).map(r=>Math.round(r.wpm));
  const recent=answered.slice(-10),acc=recent.length?Math.round(100*recent.reduce((s,r)=>s+(r.correct||0),0)/recent.reduce((s,r)=>s+r.total,0)):null;
  const wpmNow=last.length?Math.round(avg(last.slice(-3))):null;
  // "vs last week" only when there is practice in both of the last two 7-day windows.
  const t=now.getTime(),inWin=(r,a,b)=>{const w=when(r);return w!==null&&w>t-b*DAY&&w<=t-a*DAY;};
  const change=(sel,val)=>{const a=avg(sel(0,7).map(val)),b=avg(sel(7,14).map(val));return a!==null&&b!==null&&b>0?Math.round(100*(a-b)/b):null;};
  const dW=change((a,b)=>timed.filter(r=>inWin(r,a,b)),r=>r.wpm);
  const dA=change((a,b)=>answered.filter(r=>inWin(r,a,b)),r=>r.correct/r.total);
  const delta=d=>d===null?'':`<p class="wh-delta ${d<0?'down':''}">${d<0?'↓':'↑'} ${Math.abs(d)}% vs last week</p>`;
  return `<section class="wh-panel wh-hero"><div class="wh-top"><h2>Reading speed and accuracy</h2><button class="wh-link" data-action="tab-progress">Full progress →</button></div>
   <div class="wh-stats"><div><b>${wpmNow??'—'}<small>WPM</small></b><p>Reading speed</p>${delta(dW)}</div><div><b>${acc??'—'}<small>%</small></b><p>Answer accuracy</p>${delta(dA)}</div></div>
   ${last.length?chart(last):''}
   ${last.length===1?'<p class="wh-lead">Your starting point. Every set you finish adds a point to this chart.</p>':''}</section>`;
 }

 function week(rows,now,icon){
  const t=now.getTime(),recent=rows.filter(r=>{const w=when(r);return w!==null&&w>t-7*DAY;});
  if(!recent.length)return rows.length?'':`<section class="wh-card"><span class="wh-icon wh-en">${icon('calendar-days')}</span><h3>Your first week</h3><p>Try one set in each subject, do Question of the Day on three days, and take Mock 01.</p><button class="wh-ghost" data-action="open-practice">Start a set</button></section>`;
  const days=new Set(recent.map(r=>new Date(when(r)).toDateString())).size;
  const prev=rows.filter(r=>{const w=when(r);return w!==null&&w>t-14*DAY&&w<=t-7*DAY&&r.wpm>0;}).map(r=>r.wpm),cur=recent.filter(r=>r.wpm>0).map(r=>r.wpm);
  const d=prev.length&&cur.length?Math.round(avg(cur)-avg(prev)):null;
  const parts=[`${recent.length} ${recent.length===1?'set':'sets'} done`,`${days} ${days===1?'day':'days'} practised`];
  if(d)parts.push(`reading speed ${d>0?'up':'down'} ${Math.abs(d)} WPM`);
  return `<section class="wh-card"><span class="wh-icon wh-en">${icon('calendar-days')}</span><h3>This week</h3><p>${parts.join(' · ')}.</p><button class="wh-ghost" data-action="tab-progress">Full progress</button></section>`;
 }
 function render(c){
  ctx=c;const {settings,freshWorkout,sections,icon}=c;
  const now=new Date(),profile=settings.profile(),first=(n=>n?n[0].toUpperCase()+n.slice(1):'')((profile.name||'').trim().split(/\s+/)[0]);
  const greet='Hello';
  const progress=globalThis.CLATProgress,rows=progress?.activityRows?.()||[];
  const revise=globalThis.CLATMistakes?.queue(globalThis.CLATPracticeSets).length||0;
  const premium=globalThis.CLATPremium?.hasAccess?.();
  const mocksTaken=(read('clat-champ-mocks-v1')?.attempts||[]).filter(a=>a.finished).length;
  // Weakest subject: lowest accuracy, once at least two subjects have finished sets.
  const tried=sections.filter(s=>s.completedCount>0&&Number.isFinite(s.accuracy));
  const weakest=tried.length>=2?tried.reduce((a,b)=>b.accuracy<a.accuracy?b:a):null;
  const sets=globalThis.CLATPracticeSets||[];
  const subj=sections.map(s=>{
   const free=1; // free practice is one set per subject (Question of the Day's set is separate)
   const sw=rows.filter(r=>r.section===s.section&&r.wpm!==null&&r.wpm>0).slice(-5).map(r=>r.wpm),swpm=sw.length?Math.round(avg(sw)):null;
   const line=s.completedCount>0?[Number.isFinite(s.accuracy)?Math.round(s.accuracy)+'%':'',swpm?swpm+' WPM':''].filter(Boolean).join(' · ')||`${s.completedCount} of ${s.setCount} sets`
    :premium?`${s.setCount} sets`:`${free} free ${free===1?'set':'sets'}`;
   return `<button class="wh-subject" data-action="open-practice" data-set="${esc(s.id)}"><span class="wh-icon wh-${tone[s.section]||'en'}">${icon(s.icon)}</span><b>${esc(shortNames[s.section]||s.section)}</b><small>${line}</small>${weakest&&weakest.id===s.id?'<small class="wh-weak">Needs work</small>':''}</button>`;
  }).join('');
  return `<section class="wh">
   <div class="wh-head"><div><p class="wh-date">${now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p><h1>${greet}${first?', '+esc(first):''}</h1></div>${countdown(profile,now)}</div>
   <div class="wh-grid">${speedPanel(rows,now)}<div class="wh-today">${freshWorkout.card()}</div></div>
   <div class="wh-sec"><h2>Practise by subject</h2><button class="wh-link" data-action="open-practice">All sets →</button></div><div class="wh-subjects">${subj}</div>
   <div class="wh-cards">
    <section class="wh-card"><span class="wh-icon wh-lg">${icon('list-checks')}</span><h3>Revision list</h3><p>${revise?`${revise} ${revise===1?'question':'questions'} you got wrong, with explanations.`:'Questions you get wrong collect here, with explanations, to try again later.'}</p><button class="wh-ghost" data-action="progress-revision">${revise?'Revise':'Open revision list'}</button></section>
    <section class="wh-card"><span class="wh-icon wh-lr">${icon('clipboard-list')}</span><h3>Full-length mocks</h3><p>${mocksTaken?`${mocksTaken} ${mocksTaken===1?'mock':'mocks'} finished. `:''}120 questions in 120 minutes, marked like CLAT.${premium?'':' Mock 01 is free.'}</p><button class="wh-ghost" data-action="open-mocks">${mocksTaken?'Open mocks':'Start Mock 01'}</button></section>
    ${week(rows,now,icon)}
   </div>
   ${premium?`<section class="wh-band"><div><h3>Premium</h3><p>Your Premium subscription is active.</p></div><button class="wh-ghost" data-action="open-premium">Manage</button></section>`:`<section class="wh-band"><div><h3>Premium</h3><p>All 1,000+ questions and 10 full-length mocks.</p></div><div class="wh-band-end"><span>From <b>₹1,499</b></span><button class="wh-violet" data-action="open-premium">See plans</button></div></section>`}
   ${globalThis.CLATWebSync?.note(icon)||''}</section>`;
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-wh]');if(!b||!ctx)return;
  if(b.dataset.wh==='year-edit')yearEdit=true;
  if(b.dataset.wh==='year-cancel')yearEdit=false;
  if(b.dataset.wh==='year'){ctx.settings.saveProfile({...ctx.settings.profile(),examYear:b.dataset.year});yearEdit=false;}
  ctx.rerender?.();
 });
 globalThis.CLATWebHome={render};
})();
