// Capture learner evidence before other modules initialise their stores.
(()=>{
 const key='clat-speed-onboarding-v1',starter=globalThis.CLATOnboardingStarter;
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const saved=read(key),native=globalThis.CLATNativeOnboardingCheckpoint;
 const nativeResult=native?.version===2&&native.contentVersion===starter.version&&native.phase==='results'&&Array.isArray(native.answers)&&native.answers.length===starter.questions.length&&native.answers.every(a=>a===null||Number.isInteger(a)&&a>=0&&a<4);
 const recovered=nativeResult&&!saved?.complete&&!['results','review','summary','profile'].includes(saved?.phase);
 const prior=recovered?native:saved;
 if(recovered)globalThis.CLATOnboardingRecovery=prior;
 const known=['progress','attempts','practice','practice-pending','settings','daily-rotation','personalisation','workout-days','mistakes','achievements'];
 const returning=known.some(k=>{try{return localStorage.getItem('clat-speed-'+k+'-v1')!==null;}catch{return false;}});
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stages={'class-11':'Class 11','class-12':'Class 12','gap-year':'Gap year / repeat attempt',other:'Other'};
 const cleanDraft=d=>({name:typeof d?.name==='string'?d.name.slice(0,40):'',examYear:/^20\d{2}$/.test(String(d?.examYear))?String(d.examYear):'',stage:stages[d?.stage]?d.stage:''});
 const base={version:2,contentVersion:starter.version,complete:false,answerFormat:2,phase:'welcome',answers:Array(starter.questions.length).fill(null),question:0,review:0,readSeconds:0,readingDone:false,draft:cleanDraft(prior?.draft)};
 const validAnswers=a=>Array.isArray(a)&&a.length===starter.questions.length&&a.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<4);
 let state={...base,complete:prior?.version===1||prior?.version===2?prior.complete===true:returning};
 if(prior?.version===2&&prior.contentVersion===starter.version){
  state={...state,readSeconds:Number.isFinite(prior.readSeconds)&&prior.readSeconds>=0?prior.readSeconds:0,readingDone:prior.readingDone===true,phase:['welcome','introduction','reading','questions','results','review','summary','profile'].includes(prior.phase)?prior.phase:'welcome',answers:validAnswers(prior.answers)?[...prior.answers]:Array(starter.questions.length).fill(null),question:Number.isInteger(prior.question)?Math.max(0,Math.min(starter.questions.length-1,prior.question)):0,review:Number.isInteger(prior.review)?Math.max(0,Math.min(starter.questions.length-1,prior.review)):0};
  if(['results','review','summary','profile'].includes(state.phase)&&prior.answerFormat!==2&&state.answers.includes(null))state.phase='questions';
 }
 if(state.phase==='welcome'&&!['2027','2028','2029'].includes(state.draft.examYear))state.draft.examYear='2027';
 let error='';
 function persist(next){try{localStorage.setItem(key,JSON.stringify(next));state=next;error='';return true;}catch{error='Couldn’t save your starter. Please try again.';return false;}}
 // Incomplete older onboarding returns to the new welcome; drafts and completion survive.
 persist(state);
 globalThis.createCLATOnboarding=(root,screen,settings,onFinish)=>{
  const questions=starter.questions;
  let readingClock=null,rewardPlayed=false;
  const tick=()=>{if(readingClock!==null){const now=performance.now();state.readSeconds+=(now-readingClock)/1000;readingClock=now;persist({...state});}};
  const pauseReading=()=>{tick();readingClock=null;};
  const startReading=()=>{if(!state.readingDone)readingClock=performance.now();render();};
  globalThis.setInterval?.(()=>{if(readingClock!==null)tick();},1000);
  globalThis.addEventListener?.('pagehide',pauseReading);
  globalThis.document?.addEventListener?.('visibilitychange',()=>{if(document.hidden&&readingClock!==null){pauseReading();render();}});
  const wordCount=starter.paragraphs.join(' ').trim().split(/\s+/).length;
  const speed=()=>{const m=globalThis.CLATScoring.measurement(starter,state.readSeconds);return globalThis.CLATScoring.usableSpeed(m)?m.wpm:null;};
  const button=(label,action,primary=false,disabled=false)=>`<button type="button" class="${primary?'cs-primary':'cs-text-button'}" data-onboarding="${action}" ${disabled?'disabled':''}>${label}</button>`;
  const passage=()=>`<div class="cs-reading ob-passage">${starter.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div>`;
  const passageDetails=()=>`<details class="ob-reference"><summary>Read the passage</summary>${passage()}</details>`;
  const total=()=>questions.reduce((n,q,i)=>n+(state.answers[i]===q.correct),0);
  const scroll=()=>root.scrollIntoView?.({block:'start',behavior:'instant'});
  function render(){
   let content='',actions='',heading='YOUR FIRST PASSAGE',celebrate=false;
   const phase=state.phase;
   if(phase==='welcome'){
    heading='WELCOME';const d=state.draft;
    content=`<h1>Let’s get<br><span>to know you.</span></h1><form class="st-form ob-setup-form" id="ob-setup-form"><label for="ob-name">Name</label><input id="ob-name" name="name" type="text" autocomplete="given-name" maxlength="40" placeholder="Your name" value="${esc(d.name)}"><fieldset class="ob-years"><legend>CLAT target year</legend><div role="group" aria-label="CLAT target year">${['2027','2028','2029'].map(y=>`<button type="button" data-onboarding="setup-year" data-year="${y}" aria-pressed="${d.examYear===y}">${y}</button>`).join('')}</div></fieldset></form>`;
    actions=button('Continue','setup-next',true);
   }
   if(phase==='introduction'){
    heading='YOUR STARTING POINT';
    content=`<div class="ob-starter-intro"><h1>Find your<br><span>reading speed.</span></h1><div class="ob-speed-art" aria-hidden="true"><svg viewBox="0 0 340 190" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ob-page" x1="76" y1="12" x2="205" y2="178" gradientUnits="userSpaceOnUse"><stop stop-color="#51406c"/><stop offset="1" stop-color="#282137"/></linearGradient><linearGradient id="ob-dial" x1="201" y1="70" x2="295" y2="164" gradientUnits="userSpaceOnUse"><stop stop-color="#37443f"/><stop offset="1" stop-color="#222c2e"/></linearGradient></defs><ellipse cx="170" cy="165" rx="114" ry="14" fill="#100d18" opacity=".45"/><path d="M30 61H65M18 79H54M35 97H62" stroke="#88749f" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/><g transform="rotate(-8 139 90)"><rect x="85" y="25" width="123" height="145" rx="13" fill="#211b2f" stroke="#69547f" stroke-opacity=".5"/><rect x="74" y="15" width="123" height="145" rx="13" fill="url(#ob-page)" stroke="#af93d3" stroke-opacity=".55"/><path d="M95 40H145" stroke="#dbc5f5" stroke-width="5" stroke-linecap="round"/><path d="M95 60H173M95 73H164" stroke="#ab97c2" stroke-width="3" stroke-linecap="round"/><rect x="88" y="86" width="94" height="16" rx="4" fill="#b8edda" fill-opacity=".16"/><path d="M95 94H170" stroke="#b8edda" stroke-width="3" stroke-linecap="round"/><path d="M95 115H172M95 128H152" stroke="#ab97c2" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/></g><path d="M205 49C240 28 285 46 302 75" stroke="#b8edda" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/><path d="M217 38C249 26 276 33 295 52" stroke="#b8edda" stroke-opacity=".12" stroke-width="2" stroke-linecap="round"/><rect x="239" y="62" width="20" height="8" rx="3" fill="#b8edda"/><path d="M249 70V77" stroke="#b8edda" stroke-width="4"/><circle cx="249" cy="121" r="46" fill="url(#ob-dial)" stroke="#b8edda" stroke-opacity=".6" stroke-width="1.5"/><path d="M218 105A35 35 0 0 1 280 105" stroke="#b8edda" stroke-opacity=".2" stroke-width="5" stroke-linecap="round"/><path d="M249 90V94M279 121H275M249 152V148M219 121H223" stroke="#b8edda" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/><path d="M249 121L265 102" stroke="#c6f4e3" stroke-width="3" stroke-linecap="round"/><circle cx="249" cy="121" r="4" fill="#c6f4e3"/></svg></div><p class="ob-starter-description">Read a short passage at your natural speed, then answer five questions to check your understanding.</p><p class="ob-starter-meta">English · 1 passage · 5 questions</p></div>`;
    actions=button('Check my speed','try',true)+button('Skip','explore');
   }
   if(phase==='reading'){
    heading='PASSAGE';content=`<h1>${esc(starter.title)}</h1><p>Read the passage carefully and answer the questions that follow.</p>${passage()}`;
    actions=(!state.readingDone&&readingClock===null?button('Resume reading','resume-reading',true):button(state.readingDone?'Back to questions':'I’ve finished reading','questions',true))+button('Back','welcome');
   }
   if(phase==='questions'){
    const q=questions[state.question];heading=`QUESTION ${state.question+1} OF ${questions.length}`;
    content=`<h2 class="ob-question">${esc(q.text)}</h2><p>Choose the best answer.</p><div class="cs-options">${q.options.map((o,i)=>`<button type="button" class="cs-option" data-onboarding="answer" data-choice="${i}" aria-pressed="${state.answers[state.question]===i}"><span class="cs-letter">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>${passageDetails()}`;
    actions=button('Skip question','skip')+button(state.question===questions.length-1?'See my results':'Next question','next',true)+button(state.question?'Previous question':'Back to passage',state.question?'previous':'reading');
   }
   if(phase==='results'){
    heading='STARTING POINT COMPLETE';
    const correct=total(),perfect=correct===questions.length,saved=globalThis.CLATAchievements?.awardOnboarding();
    celebrate=perfect&&!rewardPlayed;if(perfect)rewardPlayed=true;
    content=`<div class="ob-celebration ${perfect?'is-perfect':''}"><div class="ob-score-halo" role="img" aria-label="${correct} of ${questions.length} correct"><svg viewBox="0 0 180 180" aria-hidden="true">${perfect?`<defs><linearGradient id="ob-ribbon-satin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#76618f"/><stop offset=".22" stop-color="#d8c8ec"/><stop offset=".42" stop-color="#fbf6ff"/><stop offset=".5" stop-color="#aa93c5"/><stop offset=".72" stop-color="#e6d9f5"/><stop offset="1" stop-color="#83659e"/></linearGradient><linearGradient id="ob-medal-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#739e92"/><stop offset=".28" stop-color="#edfff7"/><stop offset=".5" stop-color="#98c7b6"/><stop offset=".7" stop-color="#e0fff2"/><stop offset="1" stop-color="#6b9789"/></linearGradient><linearGradient id="ob-ribbon-light"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="ob-ribbon-clip"><path d="M17 132Q90 145 163 132V153Q90 166 17 153Z"/></clipPath></defs><g class="ob-ribbon-decoration ob-ribbon-tails"><path d="M44 130L32 185L53 176L66 193L79 143M101 143L114 193L127 176L148 185L136 130" fill="url(#ob-ribbon-satin)"/><path d="M50 144L43 173M130 144L137 173" stroke="#f1e5ff" stroke-opacity=".4"/><path d="M-12 52l-6-8M-17 91h-9M192 52l6-8M197 91h9" stroke="#c7b4ff" stroke-width="2" stroke-linecap="round"/><path d="M1 16l-3-7M179 16l3-7" stroke="#b8edda" stroke-width="2" stroke-linecap="round"/></g>`:''}<circle class="ob-ring-track" cx="90" cy="90" r="76"/><circle class="ob-ring-fill" cx="90" cy="90" r="76" pathLength="100" stroke-dasharray="${correct/questions.length*100} 100"/>${perfect?`<g class="ob-ribbon-decoration ob-ribbon-banner"><path d="M17 137L-5 135L1 147L-5 159L24 159L24 144M163 137L185 135L179 147L185 159L156 159L156 144" fill="#81639f"/><path d="M17 137L24 144V159L17 153M163 137L156 144V159L163 153" fill="#59436f"/><path d="M17 132Q90 145 163 132V153Q90 166 17 153Z" fill="url(#ob-ribbon-satin)"/><path fill="none" d="M20 135Q90 147 160 135" stroke="#f4eaff" stroke-opacity=".6"/><text x="90" y="151" text-anchor="middle" fill="#32253f" font-family="-apple-system,system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="2">PERFECT</text><g clip-path="url(#ob-ribbon-clip)"><rect class="ob-ribbon-light" x="-45" y="125" width="55" height="45" fill="url(#ob-ribbon-light)"/></g></g>`:''}</svg><div class="ob-score-number"><strong>${correct}<span>/${questions.length}</span></strong><small>CORRECT</small></div><span class="ob-score-seal" aria-hidden="true"><i data-lucide="${perfect?'check':'flag'}"></i></span></div><h1>${perfect?'A perfect start.':'Your speed check is complete.'}</h1><p>${perfect?'Five questions. Every one correct.':'You’ve taken your first reading-speed check.'}</p></div><div class="cs-result">${globalThis.CLATScoring.card(correct,questions.length,globalThis.CLATScoring.unanswered(state.answers))}</div><div class="ob-speed-stat"><span><i data-lucide="gauge" aria-hidden="true"></i> Reading speed</span><strong>${speed()===null?'—':speed()} WPM</strong></div><p class="ob-estimate">${state.readSeconds>0&&speed()===null?'Reading too brief for a reliable estimate. Excluded from speed tracking.':'Your starting estimate from one passage.'}</p><section class="ob-earned" aria-label="Earned badges"><div class="ob-earned-heading"><span>${perfect?'TWO BADGES EARNED':'YOUR FIRST BADGE'}</span><span>${saved===false?'Save pending':'Saved to Progress'}</span></div><div class="ob-badge-row"><div class="ob-earned-badge"><span class="ob-badge-symbol"><i data-lucide="flag" aria-hidden="true"></i></span><span><strong>First Lap</strong><small>Speed check complete</small></span><i data-lucide="check" aria-hidden="true"></i></div>${perfect?`<div class="ob-earned-badge ob-perfect-badge"><span class="ob-badge-symbol"><i data-lucide="target" aria-hidden="true"></i></span><span><strong>Perfect Set</strong><small>All five answers correct</small></span><i data-lucide="check" aria-hidden="true"></i></div>`:''}</div>${saved===false?'<p class="ob-error">Badges couldn’t be saved yet. We’ll retry when you open Progress.</p>':''}</section>`;
    actions=button('Review my answers','review-answers',true)+button('Skip to Home','skip-home');
   }
   if(phase==='review'){
    const i=state.review,q=questions[i],choice=state.answers[i],right=choice===q.correct;heading='YOUR ANSWERS';
    content=`<div class="ob-review-heading"><span class="ob-review-status ${right?'is-correct':''}"><i data-lucide="${right?'check':'search'}" aria-hidden="true"></i>${right?'Correct':'Let’s take a closer look'}</span><span>${i+1} / ${questions.length}</span></div><h2 class="ob-question">${esc(q.text)}</h2><div class="ob-answer"><span>Your answer${choice===null?'':' · '+'ABCD'[choice]}</span><p>${choice===null?'Unanswered · 0 marks':esc(q.options[choice])}</p>${right?'':`<span>Best answer · ${'ABCD'[q.correct]}</span><p>${esc(q.options[q.correct])}</p>`}</div><h3>Evidence in the passage</h3><blockquote class="ob-evidence">${esc(q.evidence)}</blockquote><h3>Why the best answer works</h3><p>${esc(q.why)}</p><h3>${choice===null?'A tempting alternative':right?'A tempting alternative':'Why your choice falls short'}</h3>${right||choice===null?`<p class="ob-alternative">${'ABCD'[q.foil]} · ${esc(q.options[q.foil])}</p>`:''}<p>${esc(q.reasons[right||choice===null?q.foil:choice])}</p><div class="ob-note"><h3>Try this next time</h3><p>${esc(q.tip)}</p></div>${passageDetails()}`;
    actions=button(i===questions.length-1?'Home':'Next explanation','review-next',true)+(i?button('Previous explanation','review-previous'):'');
   }
   if(phase==='summary'){
    heading='YOUR NEXT PASSAGE';content=`<h1>Put it into practice.</h1><p>Choose a subject for your next full practice set.</p>`;
    actions=button('Continue practising','practice',true)+button('Review answer again','review');
   }
   if(phase==='profile'){
    heading='OPTIONAL PROFILE';const d=state.draft,years=[...new Set([...(d.examYear?[Number(d.examYear)]:[]),...Array.from({length:6},(_,i)=>new Date().getFullYear()+i)])].sort((a,b)=>a-b);
    content=`<h1>Make it<br><span>yours.</span></h1><p>All details are optional.${globalThis.CLATWebAuth.configured?' Sign in any time to save them to your account.':''}</p><form class="st-form" id="ob-profile-form"><label for="ob-name">Name <span>Optional</span></label><input id="ob-name" name="name" autocomplete="given-name" maxlength="40" placeholder="What should we call you?" value="${esc(d.name)}"><label for="ob-year">Target CLAT year</label><select id="ob-year" name="examYear"><option value="">Not decided yet</option>${years.map(y=>`<option value="${y}" ${String(y)===d.examYear?'selected':''}>${y}</option>`).join('')}</select><label for="ob-stage">Preparation stage</label><select id="ob-stage" name="stage"><option value="">Choose your stage</option>${Object.entries(stages).map(([v,t])=>`<option value="${v}" ${d.stage===v?'selected':''}>${t}</option>`).join('')}</select><button type="submit" class="cs-primary">Save and practise</button></form>`;
    actions=button('Continue without profile','practice')+button('Back','summary');
   }
   screen.innerHTML=`<div class="ob-flow ob-${phase}${celebrate?' ob-reward-play':''}"><div class="ob-top"><span>${heading}</span></div>${content}<p class="ob-error" role="alert">${esc(error)}</p><div class="ob-actions">${actions}</div></div>`;
   globalThis.lucide?.createIcons();
  }
  function move(next,resetScroll=true){if(state.phase==='reading'&&next.phase&&next.phase!=='reading')pauseReading();persist({...state,...next});render();if(resetScroll)scroll();}
  function finish(route){if(persist({...state,complete:true})){onFinish(route);}else render();}
  const updateDraft=e=>{if(state.complete||!['welcome','profile'].includes(state.phase))return;const field={'ob-name':'name','ob-year':'examYear','ob-stage':'stage'}[e.target.id];if(field){state.draft=cleanDraft({...state.draft,[field]:e.target.value});persist({...state});}};
  root.addEventListener('input',updateDraft);root.addEventListener('change',updateDraft);
  function continueSetup(){
   const draft=cleanDraft({...state.draft,examYear:['2027','2028','2029'].includes(state.draft.examYear)?state.draft.examYear:'2027'});
   if(settings.saveProfile(draft))move({phase:'introduction',draft});
   else{error='Couldn’t save your profile. Please try again.';render();}
  }
  root.addEventListener('submit',e=>{
   if(e.target.id==='ob-setup-form'){e.preventDefault();if(state.phase==='welcome'&&!state.complete)continueSetup();return;}

   if(e.target.id!=='ob-profile-form')return;e.preventDefault();if(state.complete||state.phase!=='profile')return;
   const draft=cleanDraft(Object.fromEntries(['name','examYear','stage'].map(k=>[k,e.target.elements.namedItem(k).value])));state.draft=draft;
   if(settings.saveProfile(draft))finish('practice');else{error='Couldn’t save your profile. Please try again, or continue without it.';render();}
  });
  root.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b||!root.contains(b)||!b.dataset.onboarding||b.disabled||state.complete)return;
   let a=b.dataset.onboarding;const phase=state.phase;
   if(a==='skip'&&phase==='questions'){const answers=[...state.answers];answers[state.question]=null;if(!persist({...state,answers})){render();return;}a='next';}
   if(a==='setup-year'&&phase==='welcome'&&['2027','2028','2029'].includes(b.dataset.year))return move({draft:cleanDraft({...state.draft,examYear:b.dataset.year})},false);
   if(a==='setup-next'&&phase==='welcome')return continueSetup();
   if(a==='explore'&&phase==='introduction')return finish('home');
   if(a==='try'&&phase==='introduction'){move({phase:'reading'});return startReading();}
   if(a==='resume-reading'&&phase==='reading')return startReading();
   if(a==='welcome'&&phase==='reading')return move({phase:'introduction'});
   if(a==='questions'&&phase==='reading'){pauseReading();return move({phase:'questions',readingDone:true});}
   if(a==='reading'&&phase==='questions')return move({phase:'reading'});
   if(a==='answer'&&phase==='questions'){const choice=Number(b.dataset.choice);if(Number.isInteger(choice)&&choice>=0&&choice<4){const answers=[...state.answers];answers[state.question]=choice;move({answers},false);}return;}
   if(a==='previous'&&phase==='questions')return move({question:Math.max(0,state.question-1)});
   if(a==='clear'&&phase==='questions'){const answers=[...state.answers];answers[state.question]=null;return move({answers},false);}
   if(a==='next'&&phase==='questions'){
    if(state.question<questions.length-1){move({question:state.question+1});return;}
    const result={...state,phase:'results',review:0,resultDate:new Date().toISOString()};
    const commit=()=>{
     if(!persist(result)){render();return;}
     globalThis.CLATFullMarks?.complete('onboarding-'+starter.version,total(),questions.length);
     render();scroll();
     globalThis.CLATProgress?.record({id:'baseline-onboarding-v'+starter.version,kind:'baseline',baselineType:'onboarding',title:'Introductory speed check',section:'English Language',total:questions.length,correct:total(),unanswered:globalThis.CLATScoring.unanswered(state.answers),...globalThis.CLATScoring.measurement(starter,state.readSeconds),date:result.resultDate});
    };
    const checkpoint=globalThis.webkit?.messageHandlers?.onboardingCheckpoint;
    if(!checkpoint?.postMessage){commit();return;}
    b.disabled=true;b.textContent='Saving…';
    checkpoint.postMessage({state:result}).then(ok=>{if(ok)commit();else{error='Couldn’t save your result. Please try again.';render();}}).catch(()=>{error='Couldn’t save your result. Please try again.';render();});
    return;
   }
   if(a==='skip-home'&&phase==='results')return finish('home');
   if(a==='review-answers'&&phase==='results')return move({phase:'review',review:0});
   if(a==='review-question'&&phase==='review'){const i=Number(b.dataset.question);if(Number.isInteger(i)&&i>=0&&i<questions.length)move({review:i});return;}
   if(a==='review-next'&&phase==='review')return state.review===questions.length-1?finish('home'):move({review:state.review+1});
   if(a==='review-previous'&&phase==='review')return move({review:Math.max(0,state.review-1)});
   if(a==='review'&&phase==='summary')return move({phase:'review',review:0});
   if(a==='profile'&&phase==='summary'){const profile=settings.profile?.()||{};return move({phase:'profile',draft:cleanDraft({...profile,...Object.fromEntries(Object.entries(state.draft).filter(([,v])=>v))})});}
   if(a==='summary'&&phase==='profile')return move({phase:'summary'});
   if(a==='practice'&&['summary','profile'].includes(phase))return finish('practice');
  });
  return {active:()=>!state.complete,render};
 };
})();
