// Full-length mocks have their own storage and timer; practice state is never written.
globalThis.createCLATMocks=function(root,screen){
 const papers=globalThis.CLATMocksData.papers,key='clat-champ-mocks-v1';
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const flat=p=>p.sets.flatMap(s=>s.questions.map(q=>({...q,set:s})));
 let db={version:1,pending:{},attempts:[]},active=false,view='list',paper=papers[0],run=null,result=null,reviewIndex=0,filter='all',collection='available',saveFailed=false;
 const premium=()=>!!globalThis.CLATPremium?.hasAccess?.();
 const unlocked=p=>p.id===papers[0].id||premium();
 const valid=(x,p)=>x&&x.contentVersion===p.contentVersion&&Array.isArray(x.answers)&&x.answers.length===120&&x.answers.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<4)&&typeof x.id==='string';
 try{const s=JSON.parse(localStorage.getItem(key)||'null');if(s?.version===1){for(const p of papers){const x=s.pending?.[p.id];if(valid(x,p)&&Number.isFinite(x.deadline)&&Number.isFinite(x.started)&&x.deadline>x.started&&Number.isInteger(x.q)&&x.q>=0&&x.q<120&&Array.isArray(x.flags)&&x.flags.length===120&&x.flags.every(v=>typeof v==='boolean'))db.pending[p.id]=x;}if(Array.isArray(s.attempts)){const seen=new Set();db.attempts=s.attempts.filter(x=>{const p=x&&papers.find(p=>p.id===x.paperId);if(!p||!valid(x,p)||!Number.isFinite(x.finished)||!Number.isFinite(x.seconds)||x.seconds<0||seen.has(x.id))return false;seen.add(x.id);return true;});}}}catch{}
 function save(){try{localStorage.setItem(key,JSON.stringify(db));saveFailed=false;}catch{saveFailed=true;}}
 const button=(text,action,attrs='',primary=false)=>`<button class="${primary?'cs-primary':'cs-text-button'}" data-mock="${action}" ${attrs}>${text}</button>`;
 const remaining=()=>Math.max(0,Math.ceil((run.deadline-Date.now())/1000));
 const clock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
 function score(p,a){const qs=flat(p),correct=qs.filter((q,i)=>a.answers[i]===q.correct).length,unanswered=a.answers.filter(v=>v===null).length,wrong=120-correct-unanswered;return {correct,wrong,unanswered,marks:correct-wrong*.25};}
 function finish(expired=false){if(!run||db.attempts.some(a=>a.id===run.id))return;result={...run,paperId:paper.id,finished:Date.now(),seconds:Math.min(paper.durationSeconds,Math.max(0,(Date.now()-run.started)/1000)),expired};db.attempts.push(result);delete db.pending[paper.id];run=null;save();view='result';globalThis.CLATFullMarks?.complete(result.id,score(paper,result).correct,120);}
 function start(){if(!unlocked(paper)){view='premium';return;}run=db.pending[paper.id];if(!run){const now=Date.now();run={id:globalThis.CLATProgress.id(),contentVersion:paper.contentVersion,started:now,deadline:now+paper.durationSeconds*1000,answers:Array(120).fill(null),flags:Array(120).fill(false),q:0};db.pending[paper.id]=run;save();}view='exam';if(remaining()===0)finish(true);}
 function passage(q,open=false){return `<details class="mock-passage" ${open?'open':''}><summary>Read the passage · ${esc(q.set.title)}</summary><div class="cs-reading">${q.set.paragraphs.map((p,i)=>`<p><small>[${i+1}]</small> ${esc(p)}</p>`).join('')}</div></details>`;}
 function render(){if(!active)return;
  if(run&&['exam','submit'].includes(view)&&remaining()===0)finish(true);
  let html='';
  if(view==='list'){
   const shown=papers.filter(p=>collection==='completed'?db.attempts.some(a=>a.paperId===p.id):unlocked(p)&&!db.attempts.some(a=>a.paperId===p.id));
   html=`<div class="cs-kicker">Full-length practice</div><h1>Mocks</h1><div class="pm-subject-total"><strong>${papers.length}</strong><span>full-length mocks</span></div><div class="cs-practice-tabs" role="group" aria-label="Mock collection"><button data-mock="available" aria-pressed="${collection==='available'}">Available</button><button data-mock="completed" aria-pressed="${collection==='completed'}">Completed</button></div><div class="cs-options">${shown.length?shown.map(p=>{const attempts=db.attempts.filter(a=>a.paperId===p.id),last=attempts.at(-1),pending=db.pending[p.id];return `<div class="mock-collection-card"><button class="cs-option cs-set-card" data-mock="${last?'saved':'intro'}" ${last?`data-attempt="${esc(last.id)}"`:`data-paper="${p.id}" aria-label="${pending?'Resume':'View'} ${esc(p.title)}"`}><div><span class="cs-kicker">${last?'COMPLETED':p.id===papers[0].id&&!premium()?'FREE MOCK':pending?'IN PROGRESS':'READY'}</span><h3>${esc(p.title)}</h3><small>120 questions · 120 minutes</small><small>${last?`Last score: ${score(p,last).marks} / 120`:'English · GK · Legal · Logical · Quant'}</small></div><span aria-hidden="true">›</span></button>${last?button(pending?'Resume mock':'Attempt again','intro',`data-paper="${p.id}"`):''}</div>`;}).join(''):`<div class="cs-feedback"><h3>${collection==='completed'?'No completed mocks yet':'You’re up to date'}</h3><p>${collection==='completed'?'Your completed mocks will appear here.':'Find your results and reattempts in Completed.'}</p></div>`}</div>${!premium()?`<section class="pm-unlock"><span class="pm-metal-label">PREMIUM</span><h2>Unlock all 10 mocks</h2><ul class="pm-benefits"><li>1,010+ questions across all five subjects.</li><li>10 Full Length Mock Tests.</li><li>Aligned with the latest CLAT 2027 syllabus.</li><li>Track your accuracy and reading speed.</li><li>Detailed explanations for every question.</li><li>Unlimited reattempts of completed sets.</li></ul>${button('Unlock Premium','premium','',true)}</section>`:''}${collection==='completed'&&db.attempts.length?`<h2>Attempt history</h2><div class="mock-history">${db.attempts.slice().reverse().map(a=>{const p=papers.find(p=>p.id===a.paperId);return button(`${esc(p.title)} · ${score(p,a).marks}/120 · ${esc(new Date(a.finished).toLocaleDateString())}`,'saved',`data-attempt="${esc(a.id)}"`);}).join('')}</div>`:''}${globalThis.CLATNav('mocks')}`;
  }
  if(view==='premium')html=`${button('← All mocks','list')}<section class="pm-unlock mock-premium"><span class="pm-metal-label">CLAT CHAMP PREMIUM</span><h1>Unlock all 10 mocks</h1><ul class="pm-benefits"><li>1,010+ questions across all five subjects.</li><li>10 Full Length Mock Tests.</li><li>Aligned with the latest CLAT 2027 syllabus.</li><li>Track your accuracy and reading speed.</li><li>Detailed explanations for every question.</li><li>Unlimited reattempts of completed sets.</li></ul>${globalThis.CLATPremium?.controls?.().replace(/data-practice=/g,'data-mock=')||'<p>Premium purchases are not available yet.</p>'}</section>${globalThis.CLATNav('mocks')}`;
  if(view==='intro')html=`${button('← All mocks','list')}<div class="cs-kicker">Full-length mock</div><h1>${esc(paper.title)}</h1><div class="cs-feedback"><p>120 questions · 120 minutes</p><p><b>+1</b> for a correct answer · <b>−0.25</b> for a wrong answer · <b>0</b> for an unanswered question.</p><p>Move freely between sections, clear answers and flag questions for review.</p><p>The timer continues if you leave or close the app. Your answers are saved on this device. When time runs out, the attempt is submitted.</p></div><div class="mock-sections">${[...new Set(paper.sets.map(s=>s.section))].map(s=>`<p><b>${esc(s)}</b><span>${paper.sets.filter(x=>x.section===s).reduce((n,x)=>n+x.questions.length,0)} questions</span></p>`).join('')}</div>${button(db.pending[paper.id]?'Resume mock':'Start 120-minute mock','start','',true)}${globalThis.CLATNav('mocks')}`;
  if(view==='exam'||view==='submit'){
   const qs=flat(paper),q=qs[run.q],answered=run.answers.filter(x=>x!==null).length;
   html=`<div class="mock-toolbar"><b>${esc(paper.title)}</b><span role="timer" aria-label="Time remaining" id="mock-clock">${clock(remaining())}</span></div><p class="mock-status">${answered}/120 answered · ${run.flags.filter(Boolean).length} flagged</p>`;
   if(view==='submit')html+=`<h2>Submit this mock?</h2><p>${120-answered} unanswered · ${run.flags.filter(Boolean).length} flagged. You cannot change answers after submitting.</p><div class="cs-action-stack mock-confirm-actions">${button('Submit mock','confirm-submit','',true)}${button('Keep answering','cancel-submit')}</div>`;
   else html+=`<details class="mock-navigator"><summary>Sections & question navigator</summary>${[...new Set(qs.map(q=>q.set.section))].map(sec=>`<h3>${esc(sec)}</h3><div class="mock-grid">${qs.map((x,i)=>x.set.section===sec?`<button data-mock="jump" data-index="${i}" class="${run.answers[i]!==null?'answered ':''}${run.flags[i]?'flagged ':''}" ${i===run.q?'aria-current="true"':''} aria-label="Question ${i+1}${run.answers[i]!==null?', answered':', unanswered'}${run.flags[i]?', flagged':''}">${i+1}${run.flags[i]?' ⚑':''}</button>`:'').join('')}</div>`).join('')}<p>Filled: answered · ⚑: flagged</p></details><div class="cs-kicker">${esc(q.set.section)} · Question ${run.q+1} of 120</div>${passage(q,run.q===0||qs[run.q-1].set.id!==q.set.id)}<h2 class="mock-question">${esc(q.text)}</h2><div class="cs-options">${q.options.map((o,i)=>`<button class="cs-option" data-mock="answer" data-choice="${i}" aria-pressed="${run.answers[run.q]===i}"><b>${'ABCD'[i]}</b><span>${esc(o)}</span></button>`).join('')}</div><div class="mock-actions">${button('Skip question','skip')}${button(run.flags[run.q]?'Unflag question':'Flag for review','flag',`aria-pressed="${!!run.flags[run.q]}"`)}</div><div class="mock-actions">${button('Previous','previous',run.q===0?'disabled':'')}${button(run.q===119?'Review & submit':'Next','next','',true)}</div>`;
   html+=`<div class="cs-action-stack mock-exit-actions">${view==='exam'?button('Submit mock','submit'):''}${button('Save & return to mocks','list')}</div><p class="mock-note">The timer keeps running when you leave.</p>`;
  }
  if(view==='result'){
   const s=score(paper,result);html=`${button('← All mocks','list')}<div class="cs-kicker">${result.expired?'Time complete':'Mock complete'}</div><h1>${esc(paper.title)}</h1><div class="cs-result mock-score">${globalThis.CLATScoring.card(s.correct,120,s.unanswered)}</div><div class="mock-sections"><p>Correct <b>${s.correct}</b></p><p>Wrong <b>${s.wrong}</b></p><p>Unanswered <b>${s.unanswered}</b></p><p>Time used <b>${clock(Math.round(result.seconds))}</b></p></div><h2>By section</h2>${[...new Set(paper.sets.map(s=>s.section))].map(sec=>{const items=flat(paper).map((q,i)=>({q,i})).filter(x=>x.q.set.section===sec),c=items.filter(x=>result.answers[x.i]===x.q.correct).length,u=items.filter(x=>result.answers[x.i]===null).length;return `<div class="mock-section-result"><b>${esc(sec)}</b><span>${c-(items.length-c-u)*.25} / ${items.length}</span></div>`;}).join('')}<div class="cs-action-stack mock-result-actions">${button('Review all answers','review','data-filter="all"',true)}${button('Review wrong & unanswered','review','data-filter="missed"')}</div>${globalThis.CLATNav('mocks')}`;
  }
  if(view==='review'){
   const qs=flat(paper),indices=qs.map((_,i)=>i).filter(i=>filter==='all'||result.answers[i]!==qs[i].correct),i=indices[reviewIndex];
   if(i===undefined)html=`<h2>No missed questions</h2>${button('Back to results','result')}`;
   else{const q=qs[i],a=result.answers[i];html=`${button('← Results','result')}<div class="cs-kicker">${esc(paper.title)} · Question ${i+1} · ${reviewIndex+1}/${indices.length} in review</div><h2 class="mock-question">${esc(q.text)}</h2><p>Your answer: <b>${a===null?'Unanswered':esc('ABCD'[a]+'. '+q.options[a])}</b></p>${passage(q)}${globalThis.CLATExplanations.render(q)}<div class="mock-actions">${button('Previous','review-prev',reviewIndex===0?'disabled':'')}${button(reviewIndex===indices.length-1?'Back to results':'Next explanation',reviewIndex===indices.length-1?'result':'review-next','',true)}</div>`;}
  }
  screen.innerHTML=`<section class="mock-screen">${saveFailed?'<div role="alert"><p>This attempt could not be saved. Keep the app open to retain your answers.</p>'+button('Retry saving','retry-save')+'</div>':''}${html}</section>`;globalThis.lucide?.createIcons({attrs:{width:18,height:18}});
 }
 root.addEventListener('click',e=>{const b=e.target.closest('button[data-mock]');if(!b||!root.contains(b)||b.disabled||!active)return;let a=b.dataset.mock;
  if(run&&['exam','submit'].includes(view)&&remaining()===0){finish(true);render();return;}
  if(a==='retry-save')save();
  else if(a==='intro'){const p=papers.find(p=>p.id===b.dataset.paper);if(!p)return;paper=p;run=null;view=unlocked(p)?'intro':'premium';}
  else if(a==='available'||a==='completed'){collection=a;run=null;view='list';}
  else if(a==='premium'){run=null;view='premium';}
  else if(a.startsWith('premium-')){globalThis.CLATPremium?.action?.(a,b.dataset.product);return;}
  else if(a==='start')start();
  else if(a==='list'){run=null;view='list';}
  else if(a==='saved'){result=db.attempts.find(x=>x.id===b.dataset.attempt);if(!result)return;paper=papers.find(p=>p.id===result.paperId);run=null;view='result';}
  else if(a==='review'){filter=b.dataset.filter;reviewIndex=0;view='review';}
  else if(a==='result')view='result';
  else if(a==='review-prev'&&reviewIndex>0)reviewIndex--;
  else if(a==='review-next')reviewIndex++;
  else if(run){
   if(a==='answer'&&view==='exam'){const c=Number(b.dataset.choice);if(Number.isInteger(c)&&c>=0&&c<4)run.answers[run.q]=c;}
   if(a==='skip'&&view==='exam'){run.answers[run.q]=null;a='next';}
   if(a==='clear')run.answers[run.q]=null;
   if(a==='flag')run.flags[run.q]=!run.flags[run.q];
   if(a==='jump'){const i=Number(b.dataset.index);if(Number.isInteger(i)&&i>=0&&i<120)run.q=i;}
   if(a==='previous'&&run.q>0)run.q--;
   if(a==='next'){if(run.q<119)run.q++;else view='submit';}
   if(a==='submit')view='submit';
   if(a==='cancel-submit')view='exam';
   if(a==='confirm-submit'&&view==='submit')finish();
   save();
  }
  render();if(!['answer','clear','flag'].includes(a))root.scrollIntoView?.({block:'start',behavior:'instant'});
 });
 globalThis.setInterval?.(()=>{if(!active||!run||!['exam','submit'].includes(view))return;if(remaining()===0){finish(true);render();}else{const t=screen.querySelector?.('#mock-clock');if(t)t.textContent=clock(remaining());}},1000);
 globalThis.CLATPremium?.subscribe?.(()=>{if(!active)return;if(view==='premium'&&premium())view='list';if(['list','intro','premium'].includes(view)){if(view==='intro'&&!unlocked(paper))view='premium';render();}});
 globalThis.addEventListener?.('pagehide',()=>{if(run)save();});
 return {open(){active=true;for(const p of papers){const pending=db.pending[p.id];if(pending&&pending.deadline<=Date.now()){paper=p;run=pending;finish(true);}}run=null;view='list';render();},leave(){active=false;if(run)save();},render};
};
