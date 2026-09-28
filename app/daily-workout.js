// A local-calendar assignment stays fixed for its day; active sessions never swap mid-question.
globalThis.createCLATDaily=function(root,screen,practice,onHome){
 const key='clat-speed-daily-rotation-v1',sets=globalThis.CLATPracticeSets.filter(s=>s.collection!=='Starter samples'&&(s.section!=='Current Affairs & GK'||s.newsWindow));
 const sections=Object.keys(globalThis.CLATPracticeOrder.order);
 const day=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 let data={days:{},sessions:{}},date=null,set=null,session=null,view='intro',clock=null,reward=false,active=false,saveFailed=false;
 const map=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 let restored=null;try{restored=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));saveFailed=false;return true;}catch{saveFailed=true;return false;}};
 const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
 const button=(label,a,disabled=false)=>`<button class="cs-primary" data-workout="${a}" ${disabled?'disabled':''}>${label}</button>`;
 const link=(label,a)=>`<button class="cs-text-button cs-action-secondary" data-workout="${a}">${label}</button>`;
 const valid=(x,s)=>map(x)&&typeof x.id==='string'&&typeof x.submitted==='boolean'&&typeof x.complete==='boolean'&&(x.keyVersion||1)===(s.keyVersion||1)&&Array.isArray(x.answers)&&x.answers.length===s.questions.length&&x.answers.every(a=>a===null||Number.isInteger(a)&&a>=0&&a<4)&&Number.isFinite(x.elapsed)&&x.elapsed>=0&&Number.isFinite(x.readSeconds)&&x.readSeconds>=0&&Number.isInteger(x.q)&&x.q>=0&&x.q<s.questions.length&&Number.isInteger(x.review)&&x.review>=0&&x.review<s.questions.length&&['intro','reading','questions','results','review','summary'].includes(x.phase)&&(!x.submitted||x.answerFormat===2||x.answers.every(a=>a!==null))&&(x.submitted||!['results','review','summary'].includes(x.phase));
 // Repair each container/record independently; never let one bad session hide
 // another day's valid work. Preserve a recognised assignment even without a session.
 if(map(restored?.days))for(const [stamp,id] of Object.entries(restored.days))if(/^\d{4}-\d{2}-\d{2}$/.test(stamp)&&sets.some(s=>s.id===id))data.days[stamp]=id;
 const repairedDays=new Set();
 if(map(restored?.sessions))for(const [stamp,x] of Object.entries(restored.sessions)){
  const assigned=sets.find(s=>s.id===data.days[stamp]);if(assigned){if(valid(x,assigned))data.sessions[stamp]=x;else repairedDays.add(stamp);}
 }
 function assignment(d=new Date()){
  const stamp=day(d),existing=sets.find(s=>s.id===data.days[stamp]);
  const excluded=new Set(practice.dailyExcludedIds());
  const separate=sets.filter(s=>!excluded.has(s.id)&&!s.stub);
  // After all separate content is exhausted, revision is preferable to an empty daily card.
  const pool=separate.length?separate:sets.filter(s=>!s.stub);
  const saved=data.sessions[stamp];
  const started=existing&&saved&&(saved.submitted||(valid(saved,existing)&&(saved.phase!=='intro'||saved.answers.some(a=>a!==null)||saved.elapsed>0)));
  // Repair an old overlapping assignment only before the learner starts it.
  if(existing&&(repairedDays.has(stamp)||started||!excluded.has(existing.id)||!separate.length))return existing;
  if(existing)delete data.sessions[stamp];
  const seen=new Set(Object.values(data.days));
  let eligible=pool.filter(s=>!seen.has(s.id));
  // Exhausting a pool starts another rotation; prefer the least recently assigned sets.
  if(!eligible.length){const last=id=>Object.keys(data.days).filter(k=>data.days[k]===id).sort().at(-1)||'';const oldest=pool.map(s=>last(s.id)).sort()[0];eligible=pool.filter(s=>last(s.id)===oldest);}
  const offset=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000)%sections.length;
  let chosen=globalThis.CLATWebDaily?.pick?.(stamp,sets);for(let i=0;i<sections.length&&!chosen;i++)chosen=eligible.find(s=>s.section===sections[(offset+i)%sections.length]);
  data.days[stamp]=chosen.id;save();return chosen;
 }
 // Older builds saved submitted workouts before streak credit. Reconcile on Home too.
 function syncCompletions(){
  for(const [stamp,x] of Object.entries(data.sessions)){
   const assigned=sets.find(s=>s.id===data.days[stamp]);
   if(/^\d{4}-\d{2}-\d{2}$/.test(stamp)&&stamp<=day()&&assigned&&valid(x,assigned)&&x.submitted)globalThis.CLATWorkoutRewards.complete(new Date(stamp+'T12:00:00'));
  }
 }
 function pause(){if(clock!==null&&session){const elapsed=Math.max(0,(performance.now()-clock)/1000);session.elapsed+=elapsed;if(view==='reading')session.readSeconds+=elapsed;clock=null;save();}}
 function startClock(){if(active&&!session?.finishing&&clock===null&&['reading','questions'].includes(view))clock=performance.now();}
 globalThis.addEventListener?.('pagehide',pause);
 globalThis.addEventListener?.('pageshow',startClock);
 globalThis.document?.addEventListener?.('visibilitychange',()=>{if(document.hidden)pause();else startClock();});
 function open(){
  pause();active=true;date=day();set=assignment();session=data.sessions[date];
  if(!valid(session,set))session=data.sessions[date]={keyVersion:set.keyVersion||1,answers:Array(set.questions.length).fill(null),q:0,review:0,elapsed:0,readSeconds:0,phase:'intro',submitted:false,complete:false,id:'daily-'+date+'-'+set.id+'-v'+(set.keyVersion||1)};
  if(session.submitted&&!session.complete){session.complete=true;globalThis.CLATWorkoutRewards.complete(new Date(date+'T12:00:00'));}
  view=session.submitted?'results':session.phase;if(session.finishing&&!session.submitted)finish();startClock();render();
 }
 function finish(){
  // Persist the complete answers and stable identity before touching analytics.
  session.answerFormat=2;session.finishing=true;session.phase='questions';view='questions';
  if(!save())return false;
  if(practice.submitDaily(set,{answers:[...session.answers],seconds:Math.max(.001,session.elapsed),readSeconds:session.readSeconds},session.id)===false){saveFailed=true;return false;}
  session.submitted=true;session.complete=true;session.finishing=false;session.phase='results';
  if(!save()){session.submitted=false;session.complete=false;session.finishing=true;session.phase='questions';return false;}
  globalThis.CLATWorkoutRewards.complete(new Date(date+'T12:00:00'));view='results';reward=true;globalThis.CLATFullMarks?.complete(session.id,score(),set.questions.length);return true;
 }
 const score=()=>set.questions.reduce((n,q,i)=>n+(session.answers[i]===q.correct),0);
 const words=()=>set.paragraphs.join(' ').trim().split(/\s+/).length;
 const passage=()=>`${set.diagram?`<figure class="cs-math-diagram"><img src="${set.diagram.src}" alt="${set.diagram.alt}"></figure>`:''}${set.paragraphs.map(p=>`<p>${p}</p>`).join('')}`;
 const metrics=()=>globalThis.CLATScoring.results(score(),set,session.answers,session.elapsed,session.readSeconds);
 const explanation=q=>{const t=set.solutionTable;return `<div class="dw-explanation">${globalThis.CLATExplanations?.render(q)||`<h3>Why this answer works</h3><p>${q.why}</p>`}${t?`<details><summary>See the worked table</summary><div class="cs-table-scroll"><table class="cs-worked-table"><caption>${t.caption}</caption><thead><tr>${t.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:''}<details><summary>Read the passage</summary><div class="cs-reading">${passage()}</div></details>${set.sources?.length?`<details><summary>Fact-checking sources</summary>${set.sources.map(s=>`<p><a href="${s.url}">${s.title}</a></p>`).join('')}</details>`:''}</div>`;};
 const reviewIndices=()=>set.questions.map((_,i)=>i).filter(i=>session.reviewMode!=='missed'||session.answers[i]!==set.questions[i].correct);
 function render(){
  const qs=set.questions,n=qs.length;session.phase=view;save();if(session.finishing&&!session.submitted)saveFailed=true;
  let body='';
  if(view==='intro')body=`<section class="dw-intro"><div class="cs-kicker">Question of the Day · ${set.section}</div><div class="dw-intro-art">${studyArt(set.section)}</div><h1>${set.title}</h1><p class="cs-label">${n} questions</p><div class="dw-intro-actions cs-action-stack">${button('Start set','start')}${link('Go to Home','home')}</div></section>`;
  if(view==='reading')body=`<div class="cs-kicker">${set.section}</div><h2>${set.title}</h2><p>Read the passage carefully and answer the questions that follow.</p><div class="cs-meta"><span>${words()} words</span></div><div class="cs-reading">${passage()}</div><div class="cs-action-stack">${button('I’ve finished reading','finish')}${link('Save and return home','home')}</div>`;
  if(view==='questions'){const q=qs[session.q];body=`<div class="cs-meta"><span>${set.section}</span><span>${session.q+1} / ${n}</span></div><div class="cs-progress" style="margin-top:16px">${qs.map((_,i)=>`<span class="${session.answers[i]!==null?'done':''}"></span>`).join('')}</div><h2>${q.text}</h2><div class="cs-options">${q.options.map((o,i)=>`<button class="cs-option" data-workout="answer" data-choice="${i}" aria-pressed="${session.answers[session.q]===i}"><span class="cs-letter">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}</div><details><summary>Read the passage</summary><div class="cs-reading">${passage()}</div></details><div class="cs-footer cs-question-navigation">${session.q?link('Previous question','previous'):''}${link('Save and return home','home')}</div><div class="cs-question-actions"><div class="cs-label" role="status">${session.answers[session.q]===null?'Unanswered · 0 marks':'Answer '+'ABCD'[session.answers[session.q]]+' selected'}</div><div class="cs-question-controls">${link('Skip question','skip')}${button(session.q===n-1?'See my results':'Next question','next')}</div></div>`;}
  if(view==='results'){
   body=`<div class="cs-kicker">Question of the Day · Complete</div><h1>Your results</h1><p>${set.title}</p>${metrics()}<div class="cs-action-stack cs-result-actions">${button('Review all answers','review-all')}${score()<n?link(globalThis.CLATScoring.unanswered(session.answers)?'Review wrong & unanswered':'Revisit '+(n-score())+' '+(n-score()===1?'mistake':'mistakes'),'review-missed'):''}${link('Go to Home','home')}</div>`;reward=false;
  }
  if(view==='review'){
   const indices=reviewIndices(),position=Math.min(session.review,indices.length-1),i=indices[position];
   if(i===undefined){view='results';render();return;}
   const q=qs[i],choice=session.answers[i];
   body=`<div class="cs-meta"><span>REVIEW · ${position+1} / ${indices.length}</span><span>Question ${i+1}</span></div><div class="cs-review-status">${choice===null?'Unanswered':choice===q.correct?'Correct':'Let’s work through this'}</div><h2>${q.text}</h2><div class="cs-choice-review"><div class="cs-kicker">Your answer${choice===null?'':' · '+'ABCD'[choice]}</div><p>${choice===null?'Unanswered · 0 marks':q.options[choice]}</p></div>${explanation(q)}<div class="cs-footer">${button(position===indices.length-1?'Back to results':'Next explanation',position===indices.length-1?'results':'review-next')}${position>0?link('Previous explanation','review-previous'):''}${position<indices.length-1?link('Back to results','results'):''}${link('Go to Home','home')}</div>`;
  }
  screen.innerHTML=(saveFailed?'<div class="cs-feedback" role="alert"><h3>Your progress is not fully saved</h3><p>Keep this tab open and retry saving before leaving.</p>'+button('Retry saving','retry-save')+'</div>':'')+body;globalThis.lucide?.createIcons();
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!root.contains(b)||!b.dataset.workout||b.disabled)return;
  let a=b.dataset.workout;
  pause();
  if(a==='retry-save'){if(session.finishing&&!session.submitted)finish();else save();startClock();render();return;}
  if(a==='home'){if((session.finishing&&!finish())||!save()){render();return;}active=false;onHome();return;}
  if(session.finishing&&!session.submitted){render();return;}
  if(a==='start'&&view==='intro')view=globalThis.CLATScoring.reading(set)?'reading':'questions';
  if(a==='finish'&&view==='reading')view='questions';
  if(a==='answer'&&view==='questions'){const v=Number(b.dataset.choice);if(Number.isInteger(v)&&v>=0&&v<4)session.answers[session.q]=v;}
  if(a==='skip'&&view==='questions'){session.answers[session.q]=null;a='next';}
  if(a==='clear'&&view==='questions')session.answers[session.q]=null;
  if(a==='previous'&&view==='questions'&&session.q>0)session.q--;
  if(a==='next'&&view==='questions'){if(session.q<set.questions.length-1)session.q++;else if(!session.submitted){
   finish();
  }}
  if(session.submitted){
   if(a==='review-all'||a==='review-missed'){session.reviewMode=a==='review-missed'?'missed':'all';session.review=0;view='review';}
   if(a==='review-next'&&view==='review'&&session.review<reviewIndices().length-1)session.review++;
   if(a==='review-previous'&&view==='review'&&session.review>0)session.review--;
   if(a==='results')view='results';
  }
  startClock();render();if(!['answer','clear'].includes(a))root.scrollIntoView?.({block:'start',behavior:'instant'});
 });
 const studyArt=section=>{
  const base='<path d="M22 27L92 13l18 87-71 15z" fill="#8970bc" opacity=".28"/><path d="M14 18L84 8l18 86-72 13z" fill="#302249" stroke="#bca5e5" stroke-opacity=".48"/><path d="M28 33l41-6M30 40l30-5" stroke="#baa4db" stroke-width="3" stroke-linecap="round" opacity=".5"/>';
  const pictures={
   'Logical Reasoning':'<path d="M50 51l4 18m0 0L38 88m16-19l25 12" stroke="#c9b1f3" stroke-width="2"/><rect x="39" y="46" width="22" height="14" rx="4" transform="rotate(-8 50 53)" fill="#d5c3f2"/><circle cx="36" cy="88" r="9" fill="#b6a0ed"/><circle cx="80" cy="82" r="10" fill="#a3e6ce"/><path d="M76 82l3 3 5-6" fill="none" stroke="#25564a" stroke-width="2" stroke-linecap="round"/>',
   'English Language':'<path d="M33 53l41-7M35 63l41-7M37 73l27-4M39 83l33-5" stroke="#d8c9ed" stroke-width="3" stroke-linecap="round"/><path d="M34 63l29-5" stroke="#a3e6ce" stroke-width="7" opacity=".65"/><path d="M79 34l11-2 6 32-7-4-5 6z" fill="#b9a0f1"/>',
   'Legal Reasoning':'<rect x="32" y="49" width="40" height="11" rx="3" transform="rotate(-8 32 49)" fill="#bda8e1"/><path d="M36 69l24-4M38 79l31-5M40 89l22-3" stroke="#d4c4eb" stroke-width="3" stroke-linecap="round"/><circle cx="83" cy="80" r="14" fill="#a3e6ce"/><path d="M77 80l4 4 8-10" stroke="#285b4c" stroke-width="3" fill="none" stroke-linecap="round"/>',
   'Current Affairs & GK':'<circle cx="59" cy="71" r="24" fill="#5b477b" stroke="#c5b2e8" stroke-width="1.5"/><ellipse cx="59" cy="71" rx="11" ry="24" fill="none" stroke="#b8a5d9"/><path d="M35 71h48M39 58h40M39 84h40" stroke="#b8a5d9"/><circle cx="74" cy="59" r="5" fill="#a3e6ce"/>',
   'Quantitative Techniques':'<path d="M36 54v37h50" fill="none" stroke="#b8a5d9" stroke-width="1.5"/><rect x="43" y="71" width="9" height="15" rx="2" fill="#baa3e6"/><rect x="57" y="61" width="9" height="25" rx="2" fill="#d2bff4"/><rect x="71" y="48" width="9" height="38" rx="2" fill="#a3e6ce"/>'
  };
  return `<div class="dash-study-art" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none">${base}${pictures[section]||pictures['English Language']}</svg></div>`;
 };
 return {open,render,pause(){pause();active=false;},assignment,card(){const selected=assignment(),x=data.sessions[day()],saved=valid(x,selected)?x:null;syncCompletions();const streak=globalThis.CLATWorkoutRewards.streak();return `<section class="dash-hero" aria-label="Question of the Day"><div class="cs-meta"><span class="cs-kicker">Question of the Day</span><span class="dash-streak" aria-label="${streak} ${streak===1?'day':'days'} daily practice streak"><strong>${streak}</strong> ${streak===1?'day':'days'} streak</span></div><div class="dash-subject-feature"><h2>${selected.section}</h2>${studyArt(selected.section)}</div><div class="dash-set-detail"><p>${selected.title}</p></div><div class="cs-workout-meta"><span>${selected.questions.length} questions</span></div>${saved?.submitted?`<div class="dash-workout-footer"><div class="dash-workout-success" role="status"><span class="dash-success-tick">${icon('check')}</span><strong>Completed</strong></div><button class="cs-text-button dash-workout-review" data-action="daily-fresh">Review today’s question${icon('arrow-right')}</button></div>`:`<button class="cs-primary" data-action="daily-fresh">${saved&&saved.phase!=='intro'?'Continue today’s question':'Start today’s question'}${icon('arrow-right')}</button>`}</section>`;}};
};
