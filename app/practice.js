// Editorial starts with persistent, evidence-based replenishment.
globalThis.CLATNav = active => `<div class="cs-tab-spacer"></div><nav class="cs-tabbar" aria-label="Main navigation">${[['home','house','Home','tab-home'],['practice','library','Practice','open-practice'],['mocks','clipboard-list','Mocks','open-mocks'],['progress','chart-no-axes-column','Progress','tab-progress'],['revision','list-checks','Revision','progress-revision'],['settings','settings','Settings','tab-settings']].map(([id,icon,label,action])=>`<button data-action="${action}" ${active===id?'aria-current="page"':''}><i data-lucide="${icon}" aria-hidden="true"></i><span>${label}</span>${id==='revision'&&globalThis.CLATMistakes?.queue(globalThis.CLATPracticeSets).length?`<em class="cs-tab-count">${globalThis.CLATMistakes.queue(globalThis.CLATPracticeSets).length}</em>`:''}</button>`).join('')}</nav>`;
globalThis.createCLATPractice = function(root, screen, onHome) {
 const sets=globalThis.CLATPracticeSets, key='clat-speed-practice-v1';
 let attemptId=null,saveFailed=false;
 const journalKey='clat-speed-completions-v1';let journal={};
 const write=(k,value)=>{try{localStorage.setItem(k,JSON.stringify(value));return true;}catch{return false;}};
 let view='bank', current=sets[0], answers=[],q=0,started=0,readSeconds=0,attempt=null,review=[],r=0,history={};
 const bankSets=sets.filter(s=>s.collection!=='Starter samples');
 const sections=[...new Set(sets.map(s=>s.section))];
 const allGroup=section=>bankSets.filter(s=>s.section===section);
 const ordered=section=>{
  const ids=globalThis.CLATPracticeOrder.order[section]||[];
  const rank=new Map(ids.map((id,i)=>[id,i]));
  return allGroup(section).slice().sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity)||a.id.localeCompare(b.id));
 };
 // Keep granted unfinished practice fixed while future grants can respond to skills.
 let personalisation;
 const premium=()=>globalThis.CLATPremium?.hasAccess()===true;
 const freeSet=section=>ordered(section)[0];
 const available=section=>{
  if(!premium())return [freeSet(section)].filter(Boolean);
  const ready=personalisation.available(section).filter(s=>!history[s.id]);
  // Preserve unfinished work started before rolling access was introduced.
  const continuing=ordered(section).filter(s=>pending[s.id]&&!history[s.id]&&!ready.some(x=>x.id===s.id));
  return [...ready,...continuing];
 };
 const dailyExcludedIds=()=>[...new Set([...sections.flatMap(section=>[freeSet(section)?.id,...personalisation.available(section).map(s=>s.id)]),...Object.keys(history),...Object.keys(pending)].filter(Boolean))];
 const completed=section=>sets.filter(s=>s.section===section&&history[s.id]);
 const accessible=s=>!!s&&(premium()?(!!history[s.id]||available(s.section).some(x=>x.id===s.id)):freeSet(s.section)?.id===s.id);
 const group=section=>available(section);
 let premiumReturn='bank';
 const showPremium=()=>{premiumReturn=view;view='premium';};
 const showAccess=()=>{if(premium())view='rolling-locked';else showPremium();};
 let sectionTab='available',newUnlock=null,setReturn='section',reattemptSection=sections[0];

 const version=s=>s.keyVersion||1;
 const outdated=(s,a)=>(a?.keyVersion||1)!==version(s);
 const scoreFor=(s,a)=>{const keys=outdated(s,a)?globalThis.CLATPreviousKeys?.[s.id]?.[a.keyVersion||1]:s.questions.map(q=>q.correct);return keys?keys.reduce((n,k,i)=>n+(a.answers[i]===k),0):null;};
 const valid=(a,s)=>a&&(!outdated(s,a)||Array.isArray(globalThis.CLATPreviousKeys?.[s.id]?.[a.keyVersion||1]))&&Array.isArray(a.answers)&&a.answers.length===s.questions.length&&a.answers.every(v=>(v===null&&a.answerFormat===2)||Number.isInteger(v)&&v>=0&&v<4)&&Number.isFinite(a.seconds)&&a.seconds>0&&Number.isFinite(a.readSeconds)&&a.readSeconds>=0;
 try {const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const s of sets)if(valid(saved[s.id],s))history[s.id]=saved[s.id];}catch{}
 try{const saved=JSON.parse(localStorage.getItem(journalKey)||'{}');for(const tx of Object.values(saved||{})){
  const set=sets.find(s=>s.id===tx?.setId);
  if(set&&typeof tx.id==='string'&&typeof tx.title==='string'&&typeof tx.advancePractice==='boolean'&&typeof tx.date==='string'&&Number.isFinite(Date.parse(tx.date))&&valid(tx.value,set)&&!outdated(set,tx.value)&&tx.value.attemptId===tx.id)journal[tx.id]=tx;
 }}catch{}
 // An interrupted first completion still needs its recommendation evidence.
 const recommendationHistory=Object.fromEntries(Object.entries(history).filter(([,a])=>!journal[a.attemptId]?.advancePractice));
 personalisation=globalThis.createCLATPersonalisation(bankSets,ordered,recommendationHistory);
 for(const set of sets)if(history[set.id]&&!outdated(set,history[set.id]))globalThis.CLATMistakes.record(set,history[set.id]);
 let revisionReturn='bank';
 const revision=globalThis.createCLATRevision(root,screen,sets,()=>{view=revisionReturn;render();});
 globalThis.CLATProgress?.migrate(sets.filter(s=>history[s.id]&&!history[s.id].attemptId).map(s=>({id:'legacy-'+s.id,setId:s.id,section:s.section,title:s.section,seconds:history[s.id].seconds,total:s.questions.length,correct:scoreFor(s,history[s.id]),wpm:globalThis.CLATScoring.reading(s)&&history[s.id].readSeconds>0?s.paragraphs.join(' ').split(/\s+/).length*60/history[s.id].readSeconds:null})));
 function syncAchievements(){
  const first=globalThis.CLATProgress?.firstAttempts?.()||[];
  globalThis.CLATAchievements?.sync(bankSets.flatMap(s=>{
   const result=first.find(a=>(a.setId===s.id||a.id==='legacy-'+s.id||history[s.id]?.attemptId===a.id)&&a.total===s.questions.length);
   if(!result&&journal[history[s.id]?.attemptId])return [];
   return result?[{id:s.id,section:s.section,total:s.questions.length,correct:result.correct}]:history[s.id]?[{id:s.id,section:s.section,total:s.questions.length,correct:null}]:[];
  }));
 }
 const pendingKey='clat-speed-practice-pending-v1';let pending={},pausedAt=null;
 try {const saved=JSON.parse(localStorage.getItem(pendingKey)||'{}');for(const set of sets){const x=saved[set.id];if(x&&!outdated(set,x)&&['reading','questions'].includes(x.view)&&Array.isArray(x.answers)&&x.answers.length===set.questions.length&&x.answers.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<4)&&Number.isInteger(x.q)&&x.q>=0&&x.q<set.questions.length&&Number.isFinite(x.elapsed)&&x.elapsed>=0&&Number.isFinite(x.readSeconds)&&x.readSeconds>=0)pending[set.id]=x;}}catch{}
 const savePending=()=>{const ok=write(pendingKey,pending);saveFailed=!ok||Object.keys(journal).length>0;return ok;};
 function checkpoint(){if(!['reading','questions'].includes(view))return;pending[current.id]={keyVersion:version(current),view,answers:[...answers],q,elapsed:Math.max(0,((pausedAt??performance.now())-started)/1000),readSeconds,attemptId};savePending();}
 function pauseClock(){if(pausedAt===null&&['reading','questions'].includes(view)){pausedAt=performance.now();checkpoint();}}
 function resumeClock(){if(pausedAt!==null&&['reading','questions'].includes(view)){started+=performance.now()-pausedAt;pausedAt=null;}}
 globalThis.addEventListener?.('pagehide',pauseClock);
 globalThis.addEventListener?.('pageshow',resumeClock);
 globalThis.document?.addEventListener?.('visibilitychange',()=>{if(document.hidden)pauseClock();else resumeClock();});
 // Write-ahead recovery journal: never discard the last answer checkpoint until
 // history, analytics and their derived state have been persisted. Replays use
 // the original ID and date and therefore cannot count a retry as a new attempt.
 function commit(tx){
  const set=sets.find(s=>s.id===tx.setId),value=tx.value;let unlocked=null;
  if(tx.advancePractice){
   const next={...history,[set.id]:value};if(!write(key,next))return false;
   history[set.id]=value;
  }
  if(!globalThis.CLATProgress.record({id:tx.id,title:tx.title,section:set.section,setId:set.id,setTitle:set.title,seconds:value.seconds,total:set.questions.length,correct:scoreFor(set,value),unanswered:globalThis.CLATScoring.unanswered(value.answers),...globalThis.CLATScoring.measurement(set,value.readSeconds),date:tx.date}))return false;
  if(globalThis.CLATMistakes.record(set,value)===false)return false;
  if(tx.advancePractice){unlocked=personalisation.complete(set,value.answers);if(personalisation.persist()===false)return false;}
  syncAchievements();
  if(tx.advancePractice&&pending[set.id]?.attemptId===tx.id){
   const next={...pending};delete next[set.id];if(!write(pendingKey,next))return false;pending=next;
  }
  const next={...journal};delete next[tx.id];if(!write(journalKey,next))return false;journal=next;
  if(unlocked&&premium())newUnlock=unlocked;
  return true;
 }
 function retryCompletions(){
  if(!write(journalKey,journal)){saveFailed=true;return false;}
  for(const tx of Object.values(journal))if(!commit(tx)){saveFailed=true;return false;}
  saveFailed=false;return true;
 }
 function submitSet(set,value,id,title=set.section,advancePractice=true){
  value={...value,answerFormat:2,keyVersion:version(set),attemptId:id,date:new Date().toISOString()};
  if(!valid(value,set)||typeof id!=='string'||(advancePractice&&!accessible(set)))return false;
  journal[id]??={setId:set.id,value,id,title,advancePractice,date:value.date};
  const ok=retryCompletions();
  return advancePractice?(ok?newUnlock:null):ok;
 }
 if(Object.keys(journal).length)retryCompletions();
 // Repair an interrupted older completion by exact identity, never by subject.
 for(const set of sets){const value=history[set.id];if(value?.attemptId&&!outdated(set,value)&&!globalThis.CLATProgress.all().some(a=>a.id===value.attemptId)){
  journal[value.attemptId]??={setId:set.id,value,id:value.attemptId,title:set.section,advancePractice:true,date:value.date||new Date().toISOString()};
 }}
 if(Object.keys(journal).length)retryCompletions();
 // Do not freeze incomplete first-result evidence into badges during recovery.
 if(!Object.keys(journal).length)syncAchievements();
 const score=a=>scoreFor(current,a);
 const count=()=>current.paragraphs.join(' ').trim().split(/\s+/).length;
 const button=(label,action,disabled=false)=>`<button class="cs-primary" data-practice="${action}" ${disabled?'disabled':''}>${label}</button>`;
 const back=(label,action)=>`<button class="cs-text-button cs-action-secondary" data-practice="${action}">${label}</button>`;
 const passage=()=>`<div class="cs-reading">${current.diagram?`<figure class="cs-math-diagram"><img src="${current.diagram.src}" alt="${current.diagram.alt}" /></figure>`:''}${current.paragraphs.map(p=>`<p>${p}</p>`).join('')}</div>`;
 const workedTable=()=>{const t=current.solutionTable;return t?`<details><summary>See the worked table</summary><div class="cs-table-scroll"><table class="cs-worked-table"><caption>${t.caption}</caption><thead><tr>${t.headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map((v,i)=>i===0?`<th scope="row">${v}</th>`:`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:'';};
 const time=s=>`${Math.floor(s/60)}m ${Math.floor(s%60)}s`;
 const end=()=>{if(globalThis.lucide)lucide.createIcons();};
 function render(){
  if(view==='revision'){revision.render();return;}
  const n=current.questions.length;
  if(view==='bank')screen.innerHTML=`<section class="practice-chooser"><header class="practice-heading"><div class="cs-kicker">Practice</div><h1>Choose a subject</h1></header><div class="cs-options cs-subject-list">${sections.map(section=>{const first=freeSet(section);return `<button class="cs-option" data-practice="section" data-set="${first.id}"><span class="cs-node"><i data-lucide="${first.icon}" aria-hidden="true"></i></span><span>${section}</span><span style="margin-left:auto" aria-hidden="true">›</span></button>`;}).join('')}</div>${premium()?'':`<button class="cs-primary practice-premium" data-practice="premium"><i data-lucide="gem" aria-hidden="true"></i><span>Upgrade to Premium</span></button>`}</section>`;
  if(view==='rolling-locked')screen.innerHTML=`<div class="cs-kicker">Premium practice</div><h1>Complete a set to open the next</h1><p>Five sets per subject are ready at a time. Finish any available set to open one more in that subject, regardless of your score.</p>${back('Back to available sets','available')}`;
  if(view==='premium'){screen.innerHTML=`<section class="pm-offer pm-offer-polished"><div class="pm-unlock pm-offer-card"><div class="pm-metal-label">CLAT CHAMP PREMIUM</div><h1>Unlock your full<br>CLAT practice</h1><ul class="pm-benefits"><li>1,010+ questions across all five subjects.</li><li>10 Full Length Mock Tests.</li><li>Aligned with the latest CLAT 2027 syllabus.</li><li>Track your accuracy and reading speed.</li><li>Detailed explanations for every question.</li><li>Unlimited reattempts of completed sets.</li></ul>${globalThis.CLATPremium?.controls?.()||'<p>Premium purchases are not available yet.</p>'}</div>${back('Back','premium-back')}</section>`;}


  if(view==='reattempts'){
   const labels={'English Language':'English','Current Affairs & GK':'GK','Legal Reasoning':'Legal','Logical Reasoning':'Logical','Quantitative Techniques':'Quant'};
   const list=completed(reattemptSection);
   screen.innerHTML=`<div class="cs-kicker">Practice again</div><h1>Reattempt questions</h1><p>Choose a set to try again. Your previous score stays saved until you finish.</p><div class="cs-reattempt-tabs" role="group" aria-label="Reattempt subject">${sections.map(section=>`<button data-practice="reattempt-subject" data-subject="${section}" aria-pressed="${section===reattemptSection}">${labels[section]}</button>`).join('')}</div><h2 class="cs-reattempt-heading">${reattemptSection}</h2><div class="cs-options">${list.length?list.map(set=>`<button class="cs-option cs-reattempt-card" data-practice="reattempt-set" data-set="${set.id}"><span class="cs-reattempt-copy"><b>${set.title}</b><small>${pending[set.id]?'Reattempt in progress':outdated(set,history[set.id])?'Questions updated since your last attempt':'Completed set'}</small></span><span class="cs-reattempt-score"><small>${outdated(set,history[set.id])?'Earlier score':'Previous score'}</small><strong>${globalThis.CLATScoring.marks(scoreFor(set,history[set.id]),set.questions.length,globalThis.CLATScoring.unanswered(history[set.id].answers))}/${set.questions.length}</strong></span><span aria-hidden="true">›</span></button>`).join(''):'<div class="cs-feedback"><h3>No completed sets yet</h3><p>Finish a set in this subject and it will appear here with your score.</p></div>'}</div>${back('All sections','bank')}`;
  }
  if(view==='section'){
   const ss=sectionTab==='completed'?completed(current.section):available(current.section);
   const free=freeSet(current.section),locked=ordered(current.section).filter(s=>s.id!==free.id&&!history[s.id]),remaining=locked.reduce((n,s)=>n+s.questions.length,0);
   const card=s=>`<button class="cs-option cs-set-card" data-practice="set-intro" data-set="${s.id}"><div><span class="cs-kicker">${history[s.id]?'COMPLETED':s.id===free.id&&!premium()?'FREE SET':pending[s.id]?'IN PROGRESS':'READY'}</span><h3>${s.title}</h3><small>${s.questions.length} questions</small></div><span aria-hidden="true">›</span></button>`;
   screen.innerHTML=`<div class="cs-kicker">Practice</div><h1>${current.section}</h1><div class="pm-subject-total"><strong>${allGroup(current.section).reduce((n,s)=>n+s.questions.length,0)}</strong><span>questions to practise</span></div>${premium()?'<p class="cs-rolling-note">Five ready sets per subject. Complete one to open the next in this subject. Reattempts stay available separately.</p>':''}<div class="cs-practice-tabs" role="group" aria-label="Practice collection"><button data-practice="available" aria-pressed="${sectionTab==='available'}">Available</button><button data-practice="completed" aria-pressed="${sectionTab==='completed'}">Completed</button></div><div class="cs-options">${ss.length?ss.map(card).join(''):sectionTab==='completed'?'<div class="cs-feedback"><h3>No completed sets yet</h3><p>Your completed sets will appear here.</p></div>':'<div class="cs-feedback"><h3>You’re up to date</h3><p>You’ve completed every available set in this subject. Your completed sets are ready to reattempt.</p></div>'}</div>${!premium()?`<section class="pm-unlock"><span class="pm-metal-label">PREMIUM</span><h2>Unlock your full CLAT practice</h2><ul class="pm-benefits"><li>1,010+ questions across all five subjects.</li><li>10 Full Length Mock Tests.</li><li>Aligned with the latest CLAT 2027 syllabus.</li><li>Track your accuracy and reading speed.</li><li>Detailed explanations for every question.</li><li>Unlimited reattempts of completed sets.</li></ul><button class="pm-question-preview" data-practice="premium" aria-label="Unlock Premium questions"><div class="pm-preview-questions" aria-hidden="true">${(locked[0]?.questions||[]).slice(0,3).map((q,i)=>`<div class="pm-preview-line"><span>QUESTION ${i+1}</span><p>${q.text}</p></div>`).join('')}</div><span class="pm-preview-lock" aria-hidden="true"><i data-lucide="lock"></i></span></button>${button('Unlock Premium','premium')}</section>`:''}${sectionTab==='completed'?'<button class="cs-text-button" data-practice="reattempt-current">Reattempt questions in this subject</button>':''}${back('All sections','bank')}`;
  }

  if(view==='intro'){
   const details=`<p class="cs-label">${n} questions</p>`;
   screen.innerHTML=`<div class="cs-kicker">${current.section}</div><h1>${current.title}</h1>${details}<div class="cs-action-stack">${button(pending[current.id]?'Continue set':history[current.id]?'Practise again':'Start set','start')}${history[current.id]?back('View last result','last'):''}${back(setReturn==='reattempts'?'Back to reattempts':'Back to section','section-back')}</div>`;
  }
  if(view==='reading')screen.innerHTML=`<div class="cs-kicker">${current.section}</div><h2>${current.title}</h2><p>Read the passage carefully and answer the questions that follow.</p><div class="cs-meta"><span>${count()} words</span></div>${passage()}<div class="cs-action-stack">${button('I’ve finished reading','finish')}${back('Exit set','exit')}</div>`;
  if(view==='questions'){const x=current.questions[q];screen.innerHTML=`<div class="cs-meta"><span>${current.section}</span><span>${q+1} / ${n}</span></div><div class="cs-progress" style="margin-top:16px">${current.questions.map((_,i)=>`<span class="${answers[i]!==null?'done':''}"></span>`).join('')}</div>${!globalThis.CLATScoring.reading(current)?`<details ${q===0?'open':''}><summary>Read the passage</summary>${passage()}</details>`:''}<h2>${x.text}</h2><div class="cs-options">${x.options.map((o,i)=>`<button class="cs-option" data-practice="answer" data-choice="${i}" aria-pressed="${answers[q]===i}"><span class="cs-letter">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}</div>${globalThis.CLATScoring.reading(current)?`<details><summary>Read the passage</summary>${passage()}</details>`:''}<div class="cs-footer cs-question-navigation">${q>0?back('Previous question','previous'):''}${back('Exit set','exit')}</div><div class="cs-question-actions"><div class="cs-label" role="status">${answers[q]===null?'Unanswered · 0 marks':'Answer '+'ABCD'[answers[q]]+' selected'}</div><div class="cs-question-controls">${back('Skip question','skip')}${button(q===n-1?'See my results':'Next question','next')}</div></div>`;}
  if(view==='exit')screen.innerHTML=`<div class="cs-kicker">Practice · Pause</div><h1>Leave this set?</h1><p>${saveFailed?'Your latest changes are not saved yet. Keep this tab open and retry saving.':'Your place is saved. You can continue this set later. Any previously completed result stays saved.'}</p>${button('Continue practising','resume')}${back('Leave set','leave')}`;
  if(view==='result'&&outdated(current,attempt)){
   screen.innerHTML=`<div class="cs-kicker">Your saved result</div><h1>Updated practice.</h1><p>This set has been revised. Your earlier score is preserved; its answers are kept separate from the updated questions.</p><div class="cs-result">${globalThis.CLATScoring.card(score(attempt),n,globalThis.CLATScoring.unanswered(attempt.answers))}<div class="cs-stat"><span>Earlier accuracy</span><strong>${Math.round(score(attempt)/n*100)}%</strong><span>${score(attempt)} of ${n} correct</span></div></div>${button('Try the updated set','start')}${back(setReturn==='reattempts'?'Back to reattempts':'Back to section','section-back')}`;end();return;
  }
  if(view==='result')screen.innerHTML=`<div class="cs-kicker">Practice set · Complete</div><div class="cs-complete-icon"><i data-lucide="check-check"></i></div><h1>Your results</h1><p>${current.title}</p>${globalThis.CLATScoring.results(score(attempt),current,attempt.answers,attempt.seconds,attempt.readSeconds)}<div class="cs-action-stack cs-result-actions">${newUnlock?`<div class="cs-feedback cs-unlock-card" role="status"><div class="cs-kicker">New practice unlocked</div><h3>${newUnlock.title}</h3>${personalisation.reason(newUnlock.id)?`<p>${personalisation.reason(newUnlock.id)}</p>`:''}<button class="cs-text-button" data-practice="set-intro" data-set="${newUnlock.id}">Try next</button></div>`:''}${button('Review all answers','review')}${score(attempt)<n?`<button class="cs-text-button cs-action-secondary" data-practice="mistakes">${globalThis.CLATScoring.unanswered(attempt.answers)?'Review wrong & unanswered':'Revisit '+(n-score(attempt))+' '+(n-score(attempt)===1?'mistake':'mistakes')}</button>`:''}${back(setReturn==='reattempts'?'Back to reattempts':'Back to section','section-back')}${back('Go to Home','home')}</div>`;
  if(view==='review'){const i=review[r],x=current.questions[i],a=attempt.answers[i];screen.innerHTML=`<div class="cs-meta"><span>REVIEW · ${r+1} / ${review.length}</span><span>Question ${i+1}</span></div><div class="cs-review-status">${a===null?'Unanswered':a===x.correct?'Correct':'Let’s work through this'}</div><h2>${x.text}</h2><div class="cs-choice-review"><div class="cs-kicker">Your answer${a===null?'':' · '+'ABCD'[a]}</div><p>${a===null?'Unanswered · 0 marks':x.options[a]}</p>${a!==x.correct&&!globalThis.CLATExplanations?.has(x)?`<div class="cs-kicker">Correct answer · ${'ABCD'[x.correct]}</div><p>${x.options[x.correct]}</p>`:''}</div>${globalThis.CLATExplanations?.render(x)||`<h3>Why this answer works</h3><p>${x.why}</p>`}${workedTable()}${current.sources?.length?`<details><summary>Fact-checking sources</summary>${current.sources.map(source=>`<p><a href="${source.url}" style="color:#c4b4ff">${source.title}</a></p>`).join('')}</details>`:''}<details><summary>Read the passage</summary>${passage()}</details><div class="cs-footer">${button(r===review.length-1?'Back to results':'Next explanation',r===review.length-1?'result':'review-next')}${r>0?back('Previous explanation','review-previous'):''}${r<review.length-1?back('Back to results','result'):''}${back('Go to Home','home')}</div>`;}
  if(view==='bank'||view==='section'||view==='intro'||view==='reattempts')screen.innerHTML+=globalThis.CLATNav('practice');
  if(saveFailed)screen.innerHTML='<div class="cs-feedback" role="alert"><h3>Your progress is not fully saved</h3><p>Keep this tab open and retry saving before leaving. Your answers are still available in this session.</p>'+button('Retry saving','retry-save')+'</div>'+screen.innerHTML;
  end();
 }
 globalThis.CLATPremium?.subscribe?.(()=>{if(screen.querySelector?.('.pm-offer'))render();});
 let resume='questions';
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!root.contains(b)||!b.dataset.practice||b.disabled)return;
  let a=b.dataset.practice;
  if(a==='skip'&&view==='questions'){answers[q]=null;a='next';}
  if(a==='retry-save'){retryCompletions();savePending();render();return;}
  if(['premium-plan','premium-buy','premium-restore','premium-manage','premium-refresh','premium-diagnostics'].includes(a)){globalThis.CLATPremium?.action?.(a,b.dataset.product);return;}
  if(a==='home'){pauseClock();if(saveFailed){resumeClock();render();return;}onHome();return;}
  if(a==='premium'){showPremium();render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(a==='premium-back'){view=premiumReturn;render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(a==='revision-all'||a==='revision-subject'){pauseClock();revisionReturn=a==='revision-all'?'bank':'section';view='revision';revision.open(a==='revision-subject'?current.section:null);root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(a==='bank'){view='bank';setReturn='section';}
  if(a==='reattempts'||a==='reattempt-current'){pauseClock();if(a==='reattempt-current')reattemptSection=current.section;view='reattempts';}
  if(a==='reattempt-subject'){if(!sections.includes(b.dataset.subject))return;reattemptSection=b.dataset.subject;view='reattempts';}
  if(a==='reattempt-set'){const selected=sets.find(s=>s.id===b.dataset.set);if(!selected||!history[selected.id])return;current=selected;reattemptSection=selected.section;setReturn='reattempts';newUnlock=null;if(accessible(selected))view='intro';else{attempt=history[selected.id];view='result';}}
  if(a==='section'){setReturn='section';current=sets.find(s=>s.id===b.dataset.set)||current;sectionTab='available';view='section';}
  if(a==='set-intro'){const selected=sets.find(s=>s.id===b.dataset.set);if(!selected)return;if(!accessible(selected)){if(history[selected.id]){current=selected;attempt=history[selected.id];newUnlock=null;view='result';render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}current=selected;showAccess();render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}current=selected;setReturn='section';newUnlock=null;view='intro';}
  if(a==='available'||a==='completed'){sectionTab=a;view='section';}
  if(a==='section-back')view=setReturn;
  if(a==='last'){if(!history[current.id])return;attempt=history[current.id];newUnlock=null;view='result';}
  if(a==='start'){if(Object.keys(journal).length&&!retryCompletions()){render();return;}if(!accessible(current)){showAccess();render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}newUnlock=null;pausedAt=null;const saved=pending[current.id];if(saved){attemptId=saved.attemptId||globalThis.CLATProgress.id();answers=[...saved.answers];q=saved.q;readSeconds=saved.readSeconds;started=performance.now()-saved.elapsed*1000;view=saved.view;}else{attemptId=globalThis.CLATProgress.id();answers=Array(current.questions.length).fill(null);q=0;readSeconds=0;started=performance.now();view=globalThis.CLATScoring.reading(current)?'reading':'questions';}}
  if(a==='finish'&&view==='reading'){readSeconds=Math.max(.001,(performance.now()-started)/1000);view='questions';}
  if(a==='answer'&&view==='questions'){const choice=Number(b.dataset.choice);if(Number.isInteger(choice)&&choice>=0&&choice<4)answers[q]=choice;}
  if(a==='clear'&&view==='questions')answers[q]=null;
  if(a==='previous'&&view==='questions'&&q>0)q--;
  if(['answer','next','finish'].includes(a)&&['questions','reading'].includes(view)&&!accessible(current)){pauseClock();showAccess();render();return;}
  if(a==='next'&&view==='questions'){if(q<current.questions.length-1)q++;else{checkpoint();attempt={answerFormat:2,keyVersion:version(current),answers:[...answers],seconds:Math.max(.001,(performance.now()-started)/1000),readSeconds};newUnlock=submitSet(current,attempt,attemptId);globalThis.CLATFullMarks?.complete(attemptId,score(attempt),current.questions.length);view='result';}}
  if(a==='review'||a==='mistakes'){if(!attempt||outdated(current,attempt))return;review=current.questions.map((_,i)=>i).filter(i=>a==='review'||attempt.answers[i]!==current.questions[i].correct);r=0;view=review.length?'review':'result';}
  if(a==='review-next'&&r<review.length-1)r++;
  if(a==='review-previous'&&r>0)r--;
  if(a==='result')view='result';
  if(a==='exit'){pauseClock();resume=view;view='exit';}
  if(a==='resume'){view=resume;resumeClock();}
  if(a==='leave'){if(saveFailed){render();return;}view=setReturn;}
  checkpoint();render();if(!['answer','clear'].includes(a))root.scrollIntoView?.({block:'start',behavior:'instant'});
 });
 return {openPremium(){pauseClock();premiumReturn='bank';view='premium';render();},openRevision(){pauseClock();revisionReturn='bank';view='revision';revision.open();},recommendation:id=>personalisation.reason(id),dailyExcludedIds,dailyCandidates:()=>sections.flatMap(section=>personalisation.available(section)),completedIds:()=>Object.keys(history),submitDaily:(set,value,id)=>submitSet(set,value,id,'Question of the Day · '+set.section,false),submitPractice:(set,value,id)=>submitSet(set,value,id),pause:pauseClock,open(id){pauseClock();setReturn='section';const selected=sets.find(s=>s.id===id);if(selected)current=selected;sectionTab='available';newUnlock=null;view=selected?'section':'bank';render();},summary(){return sections.map(section=>{const ss=allGroup(section),first=ss[0]||sets.find(s=>s.section===section),completed=ss.filter(s=>history[s.id]);return {id:first.id,section,icon:first.icon,setCount:ss.length,questionCount:ss.reduce((n,s)=>n+s.questions.length,0),completedCount:completed.length,complete:ss.length>0&&completed.length===ss.length,accuracy:completed.length?Math.round(completed.reduce((n,s)=>n+scoreFor(s,history[s.id]),0)/completed.reduce((n,s)=>n+s.questions.length,0)*100):null};});},render};
};
