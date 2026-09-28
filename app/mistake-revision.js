// A revision queue is separate from scored set attempts and unlock/streak credit.
globalThis.CLATMistakes=(()=>{
 const key='clat-speed-mistakes-v1';let data={items:{},seen:{},session:null};
 try{const x=JSON.parse(localStorage.getItem(key)||'null');if(x&&x.items&&x.seen)data=x;}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}};
 const id=(s,i)=>`${s.id}:${s.keyVersion||1}:${i}`;
 function record(set,attempt){
  const token=attempt.attemptId||JSON.stringify([attempt.answers,attempt.seconds,attempt.readSeconds]);
  if(data.seen[set.id]===token)return save();
  set.questions.forEach((q,i)=>{const k=id(set,i),old=data.items[k];if(attempt.answers[i]!==q.correct)data.items[k]={setId:set.id,index:i,version:set.keyVersion||1,wrong:attempt.answers[i],resolved:false,updated:new Date().toISOString()};else if(old)old.resolved=true;});
  data.seen[set.id]=token;return save();
 }
 const resolve=(key,sets)=>{const x=data.items[key],set=x&&sets.find(s=>s.id===x.setId);return set&&x.version===(set.keyVersion||1)&&set.questions[x.index]?{key,item:x,set,question:set.questions[x.index]}:null;};
 const queue=(sets,section)=>Object.keys(data.items).map(k=>resolve(k,sets)).filter(x=>x&&!x.item.resolved&&(!section||x.set.section===section));
 return {record,queue,resolve,save,data};
})();
globalThis.createCLATRevision=function(root,screen,sets,onBack){
 const model=globalThis.CLATMistakes;let scope=null,view='home',run=null;
 const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
 const button=(label,a,disabled=false)=>`<button class="cs-primary" data-revision="${a}" ${disabled?'disabled':''}>${label}</button>`;
 const back=()=>'<button class="cs-text-button" data-revision="back">Back to practice</button>';
 const entries=()=>model.queue(sets,scope);
 const material=set=>`<details><summary>Read the passage</summary><div class="cs-reading">${set.diagram?`<figure class="cs-math-diagram"><img src="${set.diagram.src}" alt="${set.diagram.alt}"></figure>`:''}${set.paragraphs.map(p=>`<p>${p}</p>`).join('')}</div></details>`;
 const validRun=x=>x&&Array.isArray(x.keys)&&x.keys.length>0&&x.keys.length<=5&&x.keys.every(k=>model.resolve(k,sets))&&Array.isArray(x.answers)&&x.answers.length===x.keys.length&&x.answers.every(a=>a===null||Number.isInteger(a)&&a>=0&&a<4)&&Number.isInteger(x.q)&&x.q>=0&&x.q<x.keys.length&&['questions','results'].includes(x.phase)&&(x.phase!=='results'||x.answerFormat===2||x.answers.every(a=>a!==null));
 const save=()=>{model.data.session=run;model.save();};
 function render(){
  if(view==='home'){
   const items=entries(),pending=validRun(model.data.session)&&model.data.session.phase==='questions';
   screen.innerHTML=`<div class="cs-kicker">Revision${scope?' · '+scope:''}</div><h1>Learn from<br>your mistakes.</h1><p>Retry questions from completed sets, with the original material available. See all answers and explanations at the end.</p>${pending?`<div class="cs-feedback"><h3>You have a revision in progress</h3><p>Continue where you left off, including if you started in another subject.</p>${button('Continue revision','resume')}</div>`:''}${items.length?`<div class="cs-feedback"><h3>${items.length} ${items.length===1?'question':'questions'} to revisit</h3><p>Short sessions, drawn from your saved mistakes.</p></div><div class="cs-footer">${button('Start revision','start')}</div>`:`<div class="cs-feedback"><h3>Nothing to revisit right now</h3><p>Missed questions from completed practice sets and daily workouts will appear here.</p></div>`}<p style="margin-top:20px">Revision does not change your original scores or unlock new sets.</p>${back()}`;
  }
  if(view==='questions'){
   const entry=model.resolve(run.keys[run.q],sets),q=entry.question;
   screen.innerHTML=`<div class="cs-meta"><span>Revision · ${entry.set.section}</span><span>${run.q+1} / ${run.keys.length}</span></div><p style="margin-top:16px">${entry.set.title}</p><h2>${q.text}</h2>${material(entry.set)}<div class="cs-options">${q.options.map((o,i)=>`<button class="cs-option" data-revision="answer" data-choice="${i}" aria-pressed="${run.answers[run.q]===i}"><span class="cs-letter">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}</div><div class="cs-footer">${button('Skip question','skip')}${button(run.q===run.keys.length-1?'See revision results':'Next question','next')}<p class="cs-label">Unanswered questions score 0.</p>${run.q?'<button class="cs-text-button" data-revision="previous">Previous question</button>':''}<button class="cs-text-button" data-revision="back">Save and return to practice</button></div>`;
  }
  if(view==='results'){
   const correct=run.keys.reduce((n,k,i)=>n+(run.answers[i]===model.resolve(k,sets).question.correct),0);
   screen.innerHTML=`<div class="cs-kicker">Revision complete</div><h1>Keep building<br>understanding.</h1><div class="cs-feedback" role="status"><h3>${correct} of ${run.keys.length} correct this time</h3><div class="cs-result">${globalThis.CLATScoring.card(correct,run.keys.length,globalThis.CLATScoring.unanswered(run.answers))}</div><p>Correct answers leave your revision queue. Missed questions stay for another try.</p></div>${run.keys.map((k,i)=>{const e=model.resolve(k,sets),q=e.question,t=e.set.solutionTable;return `<div class="cs-feedback"><div class="cs-kicker">${e.set.section} · ${run.answers[i]===q.correct?'Correct':'Try again later'}</div><h3>${q.text}</h3><p>Your answer: ${run.answers[i]===null?'Unanswered · 0 marks':'ABCD'[run.answers[i]]+' · '+q.options[run.answers[i]]}</p>${globalThis.CLATExplanations?.has(q)?'':`<p>Correct answer: ${'ABCD'[q.correct]} · ${q.options[q.correct]}</p>`}${globalThis.CLATExplanations?.render(q)||`<h3>Why this answer works</h3><p>${q.why}</p>`}${material(e.set)}${t?`<details><summary>See the worked table</summary><div class="cs-table-scroll"><table class="cs-worked-table"><caption>${t.caption}</caption><thead><tr>${t.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:''}${e.set.sources?.length?`<details><summary>Fact-checking sources</summary>${e.set.sources.map(s=>`<p><a href="${s.url}">${s.title}</a></p>`).join('')}</details>`:''}</div>`;}).join('')}<div class="cs-footer">${button('Back to revision','done')}${back()}</div>`;
  }
  globalThis.lucide?.createIcons();
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!root.contains(b)||!b.dataset.revision||b.disabled)return;
  let a=b.dataset.revision;
  if(a==='skip'&&view==='questions'){run.answers[run.q]=null;a='next';}
  if(a==='back'){onBack();return;}
  if(a==='start'){
   // Resume rather than silently discarding an unfinished revision.
   if(validRun(model.data.session)&&model.data.session.phase==='questions')run=model.data.session;
   else{const list=entries().sort((a,b)=>(a.item.lastTried||'').localeCompare(b.item.lastTried||''));if(!list.length)return;run={keys:list.slice(0,5).map(x=>x.key),answers:Array(Math.min(5,list.length)).fill(null),q:0,phase:'questions'};}
   view='questions';save();
  }
  if(a==='resume'&&validRun(model.data.session)){run=model.data.session;view=run.phase;}
  if(a==='answer'&&view==='questions'){const v=Number(b.dataset.choice);if(Number.isInteger(v)&&v>=0&&v<4)run.answers[run.q]=v;save();}
  if(a==='clear'&&view==='questions'){run.answers[run.q]=null;save();}
  if(a==='previous'&&view==='questions'&&run.q>0){run.q--;save();}
  if(a==='next'&&view==='questions'){if(run.q<run.keys.length-1)run.q++;else{run.keys.forEach((k,i)=>{const e=model.resolve(k,sets);e.item.resolved=run.answers[i]===e.question.correct;e.item.lastTried=new Date().toISOString();});globalThis.CLATFullMarks?.complete(run,run.keys.reduce((n,k,i)=>n+(run.answers[i]===model.resolve(k,sets).question.correct),0),run.keys.length);run.answerFormat=2;run.phase='results';view='results';}save();}
  if(a==='done'){run=null;model.data.session=null;model.save();view='home';}
  render();if(!['answer','clear'].includes(a))root.scrollIntoView?.({block:'start',behavior:'instant'});
 });
 return {open(section=null){scope=section;view='home';render();},render};
};
