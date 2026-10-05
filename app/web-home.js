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
 // ------------------------------------------------------------------ first set + rewards
 // New learners get one obvious first step (a short, accessible Legal set); every finished set then
 // shows what the learner earned: a baseline, personal bests, a milestone and a clear next set.
 // All figures come from the learner's own attempts; 238 WPM is the published adult average
 // (Brysbaert 2019), the same figure the free speed test uses.
 const AVG_WPM=238,ORDER=['Legal Reasoning','English Language','Logical Reasoning','Current Affairs & GK','Quantitative Techniques'];
 const label=s=>shortNames[s]||s;
 const route=r=>globalThis.CLATWebRoute?.go?.(r);
 const doneIds=()=>new Set((globalThis.CLATProgress?.activityRows?.()||[]).map(r=>r.setId).filter(Boolean));
 function playable(){
  let daily=null;try{daily=JSON.parse(localStorage.getItem('clat-web-daily-v1')||'null')?.id;}catch{}
  const premium=globalThis.CLATPremium?.hasAccess?.();
  return (globalThis.CLATPracticeSets||[]).filter(s=>!s.stub&&s.collection!=='Starter samples'&&(premium||s.id!==daily));
 }
 function firstSet(){const sets=playable();return sets.find(s=>s.id==='legal-2024-01')||sets.find(s=>s.section==='Legal Reasoning')||sets[0]||null;}
 function nextSet(after){
  const done=doneIds(),sets=playable().filter(s=>!done.has(s.id)&&s.id!==after.id);
  const start=Math.max(0,ORDER.indexOf(after.section));
  for(let i=1;i<=ORDER.length;i++){const sec=ORDER[(start+i)%ORDER.length],s=sets.find(x=>x.section===sec);if(s)return s;}
  return null;
 }
 const mins=s=>Math.max(4,Math.round(s.paragraphs.join(' ').split(/\s+/).length/200+s.questions.length*0.9));
 function firstCard(rows){
  if(rows.length)return '';
  const s=firstSet();if(!s)return '';
  return `<section class="wh-first"><div><p class="wh-first-k">Start here</p><h2>Your first set: ${s.questions.length} ${esc(label(s.section))} questions</h2><p>One short passage, about ${mins(s)} minutes. At the end you’ll see your reading speed and accuracy.</p></div><button class="wh-first-go" data-wh="first-set" data-set="${esc(s.id)}">Start your first set →</button></section>`;
 }
 // Straight after sign-up: one focused screen that leads into the first set, before the dashboard.
 // "Skip to dashboard" (or finishing any set) retires it for good on this browser.
 const SKIP='clat-web-welcome-skipped';
 const skipped=()=>{try{return !!localStorage.getItem(SKIP);}catch{return true;}};
 function welcome(first,icon){
  const s=firstSet();if(!s)return '';
  return `<section class="wh wh-welcome"><div class="ww">
   <h1>${first?`Welcome, ${esc(first)}.`:'Welcome.'}</h1>
   <p class="ww-lead">First, let’s measure your reading speed and accuracy. Everything you practise from here is compared with this.</p>
   <div class="ww-set"><span class="wh-icon wh-${tone[s.section]||'lr'}">${icon(s.icon||'scale')}</span><div><b>${s.questions.length} ${esc(label(s.section))} questions</b><small>One short passage · about ${mins(s)} minutes</small></div></div>
   <ol class="ww-steps"><li>Read the passage. The timer measures your reading speed.</li><li>Answer the questions.</li><li>See your words per minute and accuracy, with an explanation for every answer.</li></ol>
   <div class="ww-go"><button class="wh-first-go" data-wh="first-set" data-set="${esc(s.id)}">Start your first set →</button><button class="ww-skip" data-wh="welcome-skip">Skip to dashboard</button></div>
  </div></section>`;
 }
 // Mocks screen: until a first set is done, point out that a mock is two hours and a set is minutes.
 function mockNudge(){
  if((globalThis.CLATProgress?.activityRows?.()||[]).length)return '';
  const s=firstSet();if(!s)return '';
  return `<div class="ww-nudge"><p>A full mock takes 2 hours. Start with a ${mins(s)}-minute practice set to get your baseline first.</p><button data-wh-nudge="${esc(s.id)}">Try a ${mins(s)}-minute set →</button></div>`;
 }
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-wh-nudge]');if(b)route('practice/set/'+b.dataset.whNudge);});
 function reward(set,attempt,correct){
  try{
   const rows=globalThis.CLATProgress?.activityRows?.()||[];
   const mine=rows.filter(r=>r.setId===set.id),others=rows.filter(r=>r.setId!==set.id);
   if(mine.length&&others.some(r=>(when(r)||0)>(when(mine[mine.length-1])||0)))return ''; // an old result reopened
   const n=set.questions.length,wpm=mine.find(r=>r.wpm)?.wpm||null,first=!others.length;
   const premium=globalThis.CLATPremium?.hasAccess?.();
   const lines=[];
   let head='';
   if(first){
    head=`<p class="wr-badge">✓ First set done</p><h2>${correct/n>=0.8?'Strong start.':correct/n>=0.5?'Good start.':'You’ve made a start.'} This is your baseline.</h2>`;
    if(wpm){const pct=Math.round((wpm/AVG_WPM-1)*100);
     lines.push(`Reading speed <b>${wpm} WPM</b>`+(pct>=1?`, ${pct}% faster than the ${AVG_WPM} WPM adult average.`:pct>=-1?`, right at the ${AVG_WPM} WPM adult average.`:`. The adult average is ${AVG_WPM} WPM, and timed practice is how that gap closes.`));}
    lines.push(`Accuracy <b>${correct} of ${n}</b>.${correct<n?' Every question you missed is saved in Revision, with an explanation.':''}`);
    lines.push('Every set from now on is compared with this, so you can watch both climb.');
   }else{
    const bestW=Math.max(0,...others.map(r=>r.wpm||0)),bestA=Math.max(0,...others.map(r=>r.total?r.correct/r.total:0));
    const count=new Set(rows.map(r=>r.setId||r.id)).size;
    if(wpm&&bestW&&wpm>bestW)lines.push(`New personal best speed: <b>${wpm} WPM</b> (up from ${bestW}).`);
    if(correct/n>bestA)lines.push(`Best accuracy yet: <b>${correct} of ${n}</b>.`);
    if([3,5,10,25,50,100].includes(count))lines.push(`That’s <b>${count} sets</b> finished.`);
    if(!lines.length)return nextLine(set,premium,false);
    head=`<p class="wr-badge">✓ ${/best/i.test(lines.join(''))?'New personal best':'Milestone'}</p>`;
   }
   return `<section class="wr-reward" role="status">${head}${lines.map(l=>`<p>${l}</p>`).join('')}${nextLine(set,premium,true)}</section>`;
  }catch(e){console.warn('reward',e);return '';}
 }
 function nextLine(set,premium,inside){
  const nx=nextSet(set),more=(globalThis.CLATPracticeSets||[]).filter(s=>s.section===set.section&&s.collection!=='Starter samples').length-1;
  const go=nx?`<button class="wr-next" data-wr="next" data-set="${esc(nx.id)}">Next: ${esc(label(nx.section))} →</button>`:'';
  const prem=!premium&&more>0?`<p class="wr-prem">Premium has ${more} more ${esc(label(set.section))} sets like this and 10 full mocks, from ₹1,499. <button class="wr-link" data-wr="premium">See plans</button></p>`:'';
  if(!go&&!prem)return '';
  return inside?`<div class="wr-actions">${go}${prem}</div>`:`<section class="wr-reward wr-quiet"><div class="wr-actions">${go}${prem}</div></section>`;
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-wr]');if(!b)return;
  if(b.dataset.wr==='next')route('practice/set/'+b.dataset.set);
  if(b.dataset.wr==='premium')route('practice/premium');
 });
 globalThis.CLATWebReward={result:reward,mockNudge};

 // Phones only: offer "Add to home screen" (Chrome's own install prompt, or Safari's Share menu on iPhone).
 const HIDE='clat-web-install-hidden';
 function install(){
  const ua=navigator.userAgent;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const phone=matchMedia('(max-width:900px) and (pointer:coarse)').matches;
  let hidden=false;try{hidden=!!localStorage.getItem(HIDE);}catch{}
  if(standalone||!phone||hidden)return '';
  const ios=/iPhone|iPad|iPod/.test(ua)&&!/CriOS|FxiOS|EdgiOS/.test(ua);
  const hide='<button class="wh-ghost" data-wh="install-hide">Not now</button>';
  if(globalThis.CLATInstallPrompt)return `<section class="wh-band wh-install"><div><h3>Add CLAT Champ to your home screen</h3><p>It opens full screen, with no app store download.</p></div><div class="wh-band-end"><button class="wh-violet" data-wh="install">Add to home screen</button>${hide}</div></section>`;
  if(ios)return `<section class="wh-band wh-install"><div><h3>Add CLAT Champ to your home screen</h3><p>In Safari, open the Share menu and choose <b>Add to Home Screen</b>. It opens full screen, with no app store download.</p></div><div class="wh-band-end">${hide}</div></section>`;
  return '';
 }
 addEventListener('clat-install-ready',()=>ctx?.rerender?.());
 addEventListener('appinstalled',()=>{globalThis.CLATInstallPrompt=null;ctx?.rerender?.();});
 function render(c){
  ctx=c;const {settings,freshWorkout,sections,icon}=c;
  const now=new Date(),profile=settings.profile(),first=(n=>n?n[0].toUpperCase()+n.slice(1):'')((profile.name||'').trim().split(/\s+/)[0]);
  const greet='Hello';
  const progress=globalThis.CLATProgress,rows=progress?.activityRows?.()||[];
  if(!rows.length&&!skipped()){const w=welcome(first,icon);if(w)return w;}
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
   ${firstCard(rows)}
   <div class="wh-grid">${speedPanel(rows,now)}<div class="wh-today">${freshWorkout.card()}</div></div>
   <div class="wh-sec"><h2>Practise by subject</h2><button class="wh-link" data-action="open-practice">All sets →</button></div><div class="wh-subjects">${subj}</div>
   <div class="wh-cards">
    <section class="wh-card"><span class="wh-icon wh-lg">${icon('list-checks')}</span><h3>Revision list</h3><p>${revise?`${revise} ${revise===1?'question':'questions'} you got wrong, with explanations.`:'Questions you get wrong collect here, with explanations, to try again later.'}</p><button class="wh-ghost" data-action="progress-revision">${revise?'Revise':'Open revision list'}</button></section>
    <section class="wh-card"><span class="wh-icon wh-lr">${icon('clipboard-list')}</span><h3>Full-length mocks</h3><p>${mocksTaken?`${mocksTaken} ${mocksTaken===1?'mock':'mocks'} finished. `:''}120 questions in 120 minutes, marked like CLAT.${premium?'':' Mock 01 is free.'}</p><button class="wh-ghost" data-action="open-mocks">${mocksTaken?'Open mocks':'Start Mock 01'}</button></section>
    ${week(rows,now,icon)}
   </div>
   ${install()}
   ${premium?`<section class="wh-band"><div><h3>Premium</h3><p>Your Premium subscription is active.</p></div><button class="wh-ghost" data-action="open-premium">Manage</button></section>`:`<section class="wh-band"><div><h3>Premium</h3><p>All 1,000+ questions and 10 full-length mocks.</p></div><div class="wh-band-end"><span>From <b>₹1,499</b></span><button class="wh-violet" data-action="open-premium">See plans</button></div></section>`}
   ${globalThis.CLATWebSync?.note(icon)||''}</section>`;
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-wh]');if(!b||!ctx)return;
  if(b.dataset.wh==='first-set'){route('practice/set/'+b.dataset.set);return;}
  if(b.dataset.wh==='welcome-skip'){try{localStorage.setItem(SKIP,'1');}catch{}}
  if(b.dataset.wh==='install-hide'){try{localStorage.setItem(HIDE,'1');}catch{}}
  if(b.dataset.wh==='install'&&globalThis.CLATInstallPrompt){const ev=globalThis.CLATInstallPrompt;globalThis.CLATInstallPrompt=null;ev.prompt();ev.userChoice?.finally?.(()=>ctx.rerender?.());}
  if(b.dataset.wh==='year-edit')yearEdit=true;
  if(b.dataset.wh==='year-cancel')yearEdit=false;
  if(b.dataset.wh==='year'){ctx.settings.saveProfile({...ctx.settings.profile(),examYear:b.dataset.year});yearEdit=false;}
  ctx.rerender?.();
 });
 globalThis.CLATWebHome={render};
})();
