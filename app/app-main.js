(()=>{
 const root=document.getElementById('clat-prototype'), screen=root.querySelector('#cs-screen');
 const state={step:5,answers:Array(5).fill(null),question:0,start:0,seconds:0,reading:false,accent:'Violet',rounded:true};
 let completedBaseline=null,diagnosticPausedAt=null,diagnosticStarted=0;
 function pauseDiagnostic(){if(((state.step===2&&state.reading)||state.step===3)&&diagnosticPausedAt===null)diagnosticPausedAt=performance.now();}
 function resumeDiagnostic(){if(diagnosticPausedAt!==null){const gap=performance.now()-diagnosticPausedAt;if(state.reading)state.start+=gap;diagnosticStarted+=gap;diagnosticPausedAt=null;}}
 globalThis.addEventListener?.('pagehide',pauseDiagnostic);
 globalThis.addEventListener?.('pageshow',resumeDiagnostic);
 globalThis.document?.addEventListener?.('visibilitychange',()=>{if(document.hidden)pauseDiagnostic();else resumeDiagnostic();});
 const paragraphs=[
 'When a city library extended its opening hours, monthly attendance rose by nearly a third. Several councillors called the increase proof that longer hours were working. The director welcomed the additional visitors but resisted that conclusion. During the same month, the library had also launched a publicity campaign and introduced free evening workshops. Most of the increase, moreover, occurred during the original opening hours.',
 'A survey offered a more complicated picture. Many visitors said that the campaign had reminded them of services they had forgotten. Others came specifically for the workshops. A smaller group, including people who worked late, valued the extended schedule even though they visited infrequently. Their numbers were modest, but the director argued that a public service should consider whom it enabled to participate, not merely how many visits it recorded.',
 'The council faced a genuine trade-off. Keeping the building open required additional spending on staff and electricity. That money could instead buy books or improve access for people with disabilities. Yet cancelling the new hours solely because they attracted fewer visitors might disadvantage residents whose working lives already limited their choices. Neither total attendance nor the cost of an individual visit could settle the issue alone.',
 'Before recommending a permanent schedule, the director proposed a further trial. The library would compare otherwise similar evenings with and without workshops, record when visitors arrived, and ask which opening times they could realistically use. This would not remove every uncertainty, but it would help distinguish the effects of publicity, events, and later access. The purpose was not to defend an attractive headline. It was to make a decision that balanced evidence about demand with a clear account of the people the library existed to serve.'
 ];
 const passage=paragraphs.join(' ');
 const passageMarkup=()=>paragraphs.map(p=>`<p>${p}</p>`).join('');
 const questions=[
 {text:'Which statement best captures the central argument of the passage?',options:['Longer opening hours should be retained whenever attendance rises.','Public service decisions should combine careful evidence with attention to access.','Publicity campaigns are more useful than changes to library services.','Libraries should prioritise the services with the lowest cost per visit.'],correct:1,why:'The passage calls for distinguishing causes of demand while considering who can access the library.'},
 {text:'What can reasonably be inferred about the residents who worked late?',options:['They accounted for most of the increase in attendance.','They visited only when an evening workshop was offered.','Their low visit numbers may understate the value of later access to them.','They preferred new books to longer opening hours.'],correct:2,why:'The director says that infrequent visitors may still benefit from access unavailable under the original schedule.'},
 {text:'In context, what does “trade-off” most nearly mean?',options:['A choice involving competing benefits and costs','An agreement to exchange library books','A temporary disagreement about visitor records','A decision with no meaningful disadvantages'],correct:0,why:'Money spent on later hours cannot also fund books or accessibility improvements; each option has benefits and costs.'},
 {text:'Which finding would most strengthen the case for retaining later hours independently of workshops?',options:['The publicity campaign reached more residents than expected.','Workshop attendance was higher than attendance at other events.','Most new visitors arrived before the original closing time.','Residents unable to visit earlier regularly used later hours on evenings without workshops.'],correct:3,why:'This would show demand for later access itself among people who cannot use the earlier hours.'},
 {text:'Which description best fits the author’s tone?',options:['Celebratory and certain about the new schedule','Measured and analytical about the decision','Dismissive of residents who rarely visit','Nostalgic for the library’s previous services'],correct:1,why:'The author weighs evidence, uncertainty, costs, and access without declaring a simple winner.'}
 ];
 const score=()=>questions.reduce((n,q,i)=>n+(state.answers[i]===q.correct?1:0),0);
 const words=passage.split(/\s+/).length;
 const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
 const primary=(text,action,disabled=false)=>`<button class="cs-primary" data-action="${action}" ${disabled?'disabled':''}>${text}${icon('arrow-right')}</button>`;
 const progress=n=>`<div class="cs-progress" aria-label="Step ${n} of 3">${[1,2,3].map(i=>`<span class="${i<=n?'done':''}"></span>`).join('')}</div>`;
 const back=()=>'<button class="cs-text-button" data-action="back">← Back</button>';
 const daily={view:'home',answers:Array(5).fill(null),q:0,review:0,start:0,seconds:0,complete:false,reward:false,canEarn:false};
 const dailyParagraphs=[
 'A town council proposed planting trees along its busiest streets to reduce summer heat. The proposal attracted broad support until officials announced that some parking spaces would be removed. Shopkeepers feared that customers would go elsewhere, while residents argued that shaded pavements would encourage more people to walk. Both groups spoke confidently, although neither had collected evidence about how customers currently reached the shops.',
 'The council commissioned a survey. It found that most customers arrived on foot or by public transport, but a smaller group depended on nearby parking. These included some older residents and people carrying heavy purchases. The findings weakened the claim that every lost parking space would necessarily damage trade. They did not establish that parking was unimportant, or that trees would automatically increase sales.',
 'One councillor proposed a trial on a single street. Temporary planters would replace a few spaces, while accessible parking and a loading area would remain. Researchers would record temperatures, pedestrian numbers, and shop sales before and during the trial. A similar street without planters would provide a comparison. The trial would run across several weeks, rather than one unusually hot weekend.',
 'Even then, interpreting the results would require care. A festival or road closure could change shopping patterns independently of the trees. The council would need to record such events and consider them when assessing the figures. The strongest case for the proposal was therefore conditional: trees might improve comfort without seriously harming access, but the design should respond to what the trial revealed. A useful experiment would help the town revise its assumptions, rather than merely supply a victory for either side.'
 ];
 const dq=[
 {skill:'Main argument',text:'Which statement best expresses the author’s main argument?',options:['Trees will increase sales because most customers already walk.','The council should test the proposal carefully and adapt it to the evidence.','Parking spaces should be preserved whenever a shopkeeper objects.','A survey alone is enough to decide whether trees should be planted.'],correct:1,paragraph:3,evidence:'A useful experiment would help the town revise its assumptions, rather than merely supply a victory for either side.',why:'The author supports a careful trial that can change the proposal. The conclusion is conditional, not a promise that trees will succeed.',reasons:['This turns a possible benefit into a guaranteed sales increase.','This includes both testing the proposal and responding to the findings.','The author weighs access needs but gives no group an automatic veto.','The passage proposes a trial precisely because the survey cannot settle the decision.'],tip:'Choose the answer that captures the whole argument, including its limits.'},
 {skill:'Inference',text:'What does the survey suggest about nearby parking?',options:['It is unnecessary because most customers do not use it.','It matters only to shopkeepers, not to customers.','It can remain important even if relatively few customers rely on it.','Removing it would certainly reduce total sales.'],correct:2,paragraph:1,evidence:'They did not establish that parking was unimportant, or that trees would automatically increase sales.',why:'The survey identifies people who depend on parking. A smaller group can have an important access need.',reasons:['A majority does not erase the needs of the remaining customers.','The passage names customers who depend on parking.','This preserves the distinction between how many people use something and how much they need it.','The survey does not establish a definite effect on sales.'],tip:'An inference must follow from the text without becoming more certain than the evidence.'},
 {skill:'Purpose',text:'Why include a similar street without planters?',options:['To help distinguish the trial’s effects from changes affecting both streets','To guarantee that temperatures remain identical on both streets','To show that all streets should retain their parking spaces','To avoid collecting information before the trial'],correct:0,paragraph:2,evidence:'A similar street without planters would provide a comparison.',why:'A comparison street helps researchers judge whether a change is specific to the trial or part of a broader pattern.',reasons:['A comparison can help separate the intervention from wider changes.','A comparison does not guarantee identical conditions.','The comparison is a research tool, not a predetermined policy conclusion.','The passage explicitly requires data from before and during the trial.'],tip:'For purpose questions, ask what the detail contributes to the reasoning.'},
 {skill:'Evidence',text:'Which finding would most weaken the claim that the planters caused higher sales?',options:['Shaded areas were cooler during the trial.','Accessible parking remained available throughout the trial.','More pedestrians used the trial street after the planters arrived.','A festival held only on the trial street attracted many extra shoppers.'],correct:3,paragraph:3,evidence:'A festival or road closure could change shopping patterns independently of the trees.',why:'The festival supplies an alternative explanation for increased sales on that street.',reasons:['Cooler temperatures are consistent with the intended benefit.','Keeping accessible parking does not explain a sales increase.','More pedestrians could be part of the proposed effect, rather than an alternative cause.','The festival could explain the sales rise without the planters causing it.'],tip:'To challenge a causal claim, look for another cause of the same result.'},
 {skill:'Meaning in context',text:'What does “conditional” mean in the final paragraph?',options:['Certain to succeed once the council approves it','Dependent on circumstances and what the evidence shows','Concerned only with the cost of the project','Designed to delay a decision permanently'],correct:1,paragraph:3,evidence:'trees might improve comfort without seriously harming access, but the design should respond to what the trial revealed.',why:'Words such as “might” and “should respond” show that support depends on the outcome of the trial.',reasons:['The author explicitly leaves the outcome uncertain.','The proposal is supported subject to what happens and what is learned.','The discussion concerns comfort, access, and evidence, not just money.','Testing a proposal is not the same as postponing it indefinitely.'],tip:'Use the surrounding sentence to check a word’s meaning.'}
 ];
 const dw=dailyParagraphs.join(' ').split(/\s+/).length;
 const ds=()=>dq.reduce((n,q,i)=>n+(daily.answers[i]===q.correct?1:0),0);
 const dpass=()=>dailyParagraphs.map(p=>`<p>${p}</p>`).join('');
 const dbutton=(label,action,disabled=false)=>primary(label,'daily-'+action,disabled);
 const dback=(label,action)=>`<button class="cs-text-button" data-action="daily-${action}">← ${label}</button>`;
 function renderDaily(){
  const actualBaseline=completedBaseline!==null;
  const baselineWpm=actualBaseline?Math.round(words*60/completedBaseline.seconds):240;
  const baselineAccuracy=actualBaseline?questions.reduce((n,q,i)=>n+(completedBaseline.answers[i]===q.correct),0)*20:80;
  if(daily.view==='home'){
   daily.complete=globalThis.CLATWorkoutRewards.hasToday()&&daily.seconds>0&&daily.answers.every(a=>a!==null);
   const sections=practice?.summary()||[];
   const sectionNotes={'English Language':'Comprehension & vocabulary','Current Affairs & GK':'Events & general knowledge','Legal Reasoning':'Principles & application','Logical Reasoning':'Arguments & inference','Quantitative Techniques':'Numbers & data'};
   const shortNames={'English Language':'English','Current Affairs & GK':'Current Affairs & GK','Legal Reasoning':'Legal Reasoning','Logical Reasoning':'Logical Reasoning','Quantitative Techniques':'Quantitative Techniques'};
   screen.innerHTML=globalThis.CLATWebHome.render({settings,freshWorkout,sections,icon,rerender:render});
  }
  if(daily.view==='progress')screen.innerHTML=globalThis.CLATProgress.render(actualBaseline?{wpm:baselineWpm,accuracy:baselineAccuracy}:null,{subjects:practice.summary(),mistakes:globalThis.CLATMistakes.queue(globalThis.CLATPracticeSets).length});
  if(daily.view==='settings')screen.innerHTML=settings.render();
  if(['home','progress','settings'].includes(daily.view))screen.innerHTML+=globalThis.CLATNav(daily.view);
  if(daily.view==='intro')screen.innerHTML=`<div class="cs-kicker">Day 01 · Before you read</div><h2>Find the claim.<br>Then find its support.</h2><p>Today’s passage weighs a proposal to add trees to a shopping street.</p><div class="cs-feedback"><div class="cs-kicker">Try this as you read</div><h3>What is the author asking me to accept?</h3><p>Keep a one-sentence answer in mind. Notice words such as “but”, “therefore”, and “might”: they can reveal a turn or a limit in the argument.</p></div><div class="cs-path"><div class="cs-lesson"><span class="cs-node">${icon('book-open')}</span><div>Read the passage<small>Your first reading sets the WPM.</small></div></div><div class="cs-lesson"><span class="cs-node">${icon('target')}</span><div>Answer the questions<small>You can refer back to the passage.</small></div></div><div class="cs-lesson"><span class="cs-node">${icon('lightbulb')}</span><div>Learn from every choice<small>See the evidence and the tempting traps.</small></div></div></div><div class="cs-footer">${dbutton('Start reading','read')}${dback('Home','home')}</div>`;
  if(daily.view==='reading')screen.innerHTML=`<div class="cs-kicker">Day 01</div><h2>Trees, trade,<br>and a fair trial.</h2><div class="cs-reading"><div class="cs-meta"><span>${dw} words</span></div>${dpass()}</div>${dbutton('I’ve finished reading','finish')}`;
  if(daily.view==='questions'){const q=dq[daily.q];screen.innerHTML=`<div class="cs-meta"><span>DAY 01 · ANSWER</span><span>${daily.q+1} / 5</span></div><div class="cs-progress" style="margin-top:16px">${dq.map((_,i)=>`<span class="${i<=daily.q?'done':''}"></span>`).join('')}</div><h2>${q.text}</h2><p>Select the best answer.</p><div class="cs-options">${q.options.map((o,i)=>`<button class="cs-option" data-daily-answer="${i}" aria-pressed="${daily.answers[daily.q]===i}"><span class="cs-letter">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}</div><details><summary>Read the passage</summary><div class="cs-reading">${dpass()}</div></details><div class="cs-footer">${dback('Skip question','answer-skip')}${dbutton(daily.q===4?'See my results':'Next question','answer-next')}${daily.q>0?dback('Previous question','answer-back'):''}</div>`;}
  if(daily.view==='results'){const pulse=daily.reward;daily.reward=false;screen.innerHTML=`<div class="cs-kicker">Your workout results</div><div class="cs-answer-reward ${ds()>0?'is-correct':''} ${pulse?'cs-reward-enter cs-reward-pulse':''}" role="status">${icon(ds()>0?'circle-check':'lightbulb')}<span>${ds()>0?`${ds()} of 5 correct. ${ds()===5?'Beautifully done.':'Keep practicing.'}`:'A starting point. Let’s learn from these answers.'}</span>${ds()>0?`<span class="cs-reward-spark" aria-hidden="true">${icon('sparkles')}</span>`:''}</div><div class="cs-result">${globalThis.CLATScoring.card(ds(),5,globalThis.CLATScoring.unanswered(daily.answers))}<div class="cs-stat"><span>Reading speed</span><strong>${Math.round(dw*60/daily.seconds).toLocaleString()}</strong><span>WPM · First reading</span></div><div class="cs-stat"><span>Accuracy</span><strong>${ds()*20}%</strong><span>Across all five answers</span></div></div><h2>Your answers</h2>${dq.map((q,i)=>`<div class="cs-feedback"><div class="cs-kicker">Question ${i+1} · ${daily.answers[i]===null?'Unanswered':daily.answers[i]===q.correct?'Correct':'Incorrect'}</div><h3>${q.text}</h3><p>Your answer: ${daily.answers[i]===null?'Unanswered · 0 marks':'ABCD'[daily.answers[i]]+' · '+q.options[daily.answers[i]]}</p>${daily.answers[i]!==q.correct?`<p>Correct answer: ${'ABCD'[q.correct]} · ${q.options[q.correct]}</p>`:''}<details><summary>See detailed explanation</summary><p>${q.why}</p></details></div>`).join('')}<div class="cs-footer">${dbutton('Home','home')}</div>`;}
  if(daily.view==='review'){const q=dq[daily.review],choice=daily.answers[daily.review],right=choice===q.correct;const marked=dailyParagraphs[q.paragraph].replace(q.evidence,`<mark>${q.evidence}</mark>`);screen.innerHTML=`<div class="cs-meta"><span>DAY 01 · GUIDED REVIEW</span><span>${daily.review+1} / 5</span></div><div class="cs-review-status">${icon(right?'circle-check':'lightbulb')}${right?'Correct · Keep the reasoning':'Let’s work through this'}<span>${q.skill}</span></div><h2 class="cs-review-question">${q.text}</h2><div class="cs-choice-review"><div class="cs-kicker">Your answer${choice===null?'':' · '+'ABCD'[choice]}</div><p>${choice===null?'Unanswered · 0 marks':q.options[choice]}</p>${!right?`<div class="cs-kicker">Correct answer · ${'ABCD'[q.correct]}</div><p>${q.options[q.correct]}</p>`:''}</div><div class="cs-kicker" style="margin-top:22px">Evidence · Paragraph ${q.paragraph+1}</div><div class="cs-evidence">${marked}</div><h3>Why this answer works</h3><p>${q.why}</p><details ${!right?'open':''}><summary>${right?'Why the other choices fail':'Why your choice falls short'}</summary>${q.options.map((o,i)=>i!==q.correct?`<div class="cs-trap"><span class="cs-kicker">${'ABCD'[i]}${choice===i?' · YOUR CHOICE':''}</span><p>${q.reasons[i]}</p></div>`:'').join('')}</details><div class="cs-feedback"><div class="cs-kicker">Take this into your next passage</div><p>${q.tip}</p></div><div class="cs-footer">${dbutton(daily.review===4?'Finish workout':'Next explanation','review-next')}${daily.review>0?dback('Previous explanation','review-back'):''}</div>`;}
  if(daily.view==='summary')screen.innerHTML=`<div class="cs-kicker">Day 01 · Workout complete</div><div class="cs-complete-icon">${icon('check-check')}</div><h1>One workout.<br><span class="cs-highlight">One step forward.</span></h1><p>You read the passage, answered five questions, and reviewed the reasoning.</p><div class="cs-result">${globalThis.CLATScoring.card(ds(),5,globalThis.CLATScoring.unanswered(daily.answers))}<div class="cs-stat"><span>Reading speed</span><strong>${Math.round(dw*60/daily.seconds).toLocaleString()}</strong><span>WPM · First reading</span></div><div class="cs-stat"><span>Accuracy</span><strong>${ds()*20}%</strong><span>${ds()} of 5 correct</span></div></div><div class="cs-feedback"><div class="cs-kicker">Your next practice step</div><h3>${ds()===5?'Check the limits of a claim':dq[daily.answers.findIndex((a,i)=>a!==dq[i].correct)].skill}</h3><p>${ds()===5?'Keep noticing qualifiers such as “might” and “only”. They help you reject answers that promise more than the passage does.':dq[daily.answers.findIndex((a,i)=>a!==dq[i].correct)].tip}</p></div><p style="margin-top:18px">We’ll look for progress across comparable passages. Today’s workout alone doesn’t establish an improvement over your diagnostic.</p><div class="cs-footer">${dbutton('Back to home','home')}<button class="cs-text-button" data-action="daily-review">Review explanations again</button></div>`;
 }
 let diagnosticAttemptId=null,dailyAttemptId=null;
 let practiceActive=false,workoutActive=false,mocksActive=false;
 const mocks=globalThis.createCLATMocks(root,screen);
 const practice=globalThis.createCLATPractice?.(root,screen,()=>{practiceActive=false;daily.view='home';render();});
 const freshWorkout=globalThis.createCLATDaily(root,screen,practice,()=>{workoutActive=false;daily.view='home';render();});
 const settings=globalThis.createCLATSettings(root,()=>{if(daily.view==='settings'&&!practiceActive&&!workoutActive&&!mocksActive)render();});
 const onboarding=globalThis.createCLATOnboarding?.(root,screen,settings,route=>{state.step=route==='diagnostic'?2:5;state.reading=false;daily.view='home';if(route==='practice'){practiceActive=true;practice.open();}else render();root.scrollIntoView?.({block:'start',behavior:'instant'});});
 const recoveredStarter=globalThis.CLATOnboardingRecovery;
 if(recoveredStarter){
  const starter=globalThis.CLATOnboardingStarter;
  globalThis.CLATProgress?.record({id:'baseline-onboarding-v'+starter.version,kind:'baseline',baselineType:'onboarding',title:'Introductory speed check',section:'English Language',total:starter.questions.length,correct:starter.questions.reduce((n,q,i)=>n+(recoveredStarter.answers[i]===q.correct),0),unanswered:globalThis.CLATScoring.unanswered(recoveredStarter.answers),...globalThis.CLATScoring.measurement(starter,recoveredStarter.readSeconds),date:recoveredStarter.resultDate||new Date().toISOString()});
 }
 globalThis.CLATPremium?.subscribe(()=>{if(!mocksActive&&!practiceActive&&!workoutActive&&!onboarding?.active()&&state.step>=5&&['home','settings'].includes(daily.view))render();});

 const storageKey='clat-speed-progress-v1';
 try {
  const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(saved && saved.version===1){
   if(saved.baseline && saved.baseline.answers.length===5 && saved.baseline.answers.every(a=>(a===null&&saved.baseline.answerFormat===2)||Number.isInteger(a)&&a>=0&&a<4) && saved.baseline.seconds>0){
    state.answers=saved.baseline.answers;state.seconds=saved.baseline.seconds;completedBaseline={answerFormat:saved.baseline.answerFormat,seconds:state.seconds,answers:[...state.answers]};
   }
   if(saved.workout && saved.workout.answers.length===5 && saved.workout.answers.every(a=>(a===null&&saved.workout.answerFormat===2)||Number.isInteger(a)&&a>=0&&a<4) && saved.workout.seconds>0){
    daily.answers=saved.workout.answers;daily.seconds=saved.workout.seconds;daily.complete=true;
   }
  }
 } catch(error) { console.warn('Saved progress could not be restored.'); }
 const legacyAttempts=[];
 if(completedBaseline&&state.seconds>0)legacyAttempts.push({id:'legacy-diagnostic',title:'Diagnostic',total:questions.length,correct:score(),wpm:words*60/state.seconds});
 if(daily.complete)legacyAttempts.push({id:'legacy-daily',title:'Daily workout',total:dq.length,correct:ds(),wpm:dw*60/daily.seconds});
 globalThis.CLATProgress?.migrate(legacyAttempts);
 function saveProgress(){
  try {
   const saved={version:1};
   if(completedBaseline)saved.baseline=completedBaseline;
   if(daily.complete)saved.workout={answerFormat:2,seconds:daily.seconds,answers:daily.answers};
   localStorage.setItem(storageKey,JSON.stringify(saved));
  } catch(error) { console.warn('Progress could not be saved.'); }
 }
 function render(){
  saveProgress();

  if(onboarding?.active()){onboarding.render();return;}
  if(mocksActive){mocks.render();return;}
  if(workoutActive){freshWorkout.render();return;}
  if(practiceActive){practice.render();return;}
  root.style.setProperty('--cs-accent',state.accent==='Violet'?'#6241db':'#315fbe');root.querySelector('.cs-phone').style.borderRadius=state.rounded?'28px':'12px';
  if(state.step>=5){renderDaily();if(globalThis.lucide)lucide.createIcons({attrs:{width:18,height:18}});return;}
  if(state.step===2)screen.innerHTML=`${progress(1)}<div class="cs-kicker">Your diagnostic</div><h2>${state.reading?'Read at your own pace.':'Find your starting point.'}</h2><p>${state.reading?'Read the passage carefully and answer the questions that follow.':'Read a passage, then answer questions. We’ll measure your reading speed and answer accuracy.'}</p>${state.reading?`<div class="cs-reading"><div class="cs-meta"><span>${words} words</span></div>${passageMarkup()}</div>`:`<div class="cs-reading"><div class="cs-lesson"><span class="cs-node">${icon('book-open')}</span><div>One passage<small>${words} words · English comprehension</small></div></div><div class="cs-lesson"><span class="cs-node">${icon('circle-help')}</span><div>Check your understanding<small>Main idea, inference, vocabulary and reasoning</small></div></div><div class="cs-lesson"><span class="cs-node">${icon('gauge')}</span><div>Speed + accuracy<small>Words per minute · Percentage correct</small></div></div></div><p>Your reading timer starts when you tap below. Time spent answering questions won’t affect your WPM.</p>`}<div class="cs-footer">${primary(state.reading?'I’ve finished reading':'Start reading',state.reading?'finish':'read')}<button class="cs-text-button" data-action="diagnostic-exit">${state.reading?'Back to instructions':'Back to Home'}</button></div>`;
  if(state.step===3){const q=questions[state.question];screen.innerHTML=`${progress(2)}<div class="cs-kicker">Question ${state.question+1} of ${questions.length}</div><h2>${q.text}</h2><p>Select the best answer.</p><div class="cs-options">${q.options.map((a,i)=>`<button class="cs-option" data-answer="${i}" aria-pressed="${state.answers[state.question]===i}"><span>${a}</span><span class="cs-radio"></span></button>`).join('')}</div><details><summary>Read the passage</summary>${passageMarkup()}</details><div class="cs-footer"><button class="cs-text-button" data-action="question-skip">Skip question</button>${primary(state.question===4?'See my results':'Next question','question-next')}<p class="cs-label">Unanswered questions score 0.</p>${state.question>0?'<button class="cs-text-button" data-action="question-back">Previous question</button>':''}</div>`;}
  if(state.step===4)screen.innerHTML=`${progress(3)}<div class="cs-kicker">Diagnostic complete</div><h2>Your starting point.</h2><p>Speed and understanding, side by side.</p><div class="cs-result">${globalThis.CLATScoring.card(score(),questions.length,globalThis.CLATScoring.unanswered(state.answers))}<div class="cs-stat"><span>Speed · WPM</span><strong>${globalThis.CLATScoring.usableSpeed(globalThis.CLATScoring.measurement({paragraphs},state.seconds))?Math.round(words*60/state.seconds).toLocaleString():'—'}</strong><span>Words per minute</span></div><div class="cs-stat"><span>Accuracy</span><strong>${score()/questions.length*100}%</strong><span>${score()} of ${questions.length} correct</span></div></div><div class="cs-meta"><span>${words} words read</span><span>${Math.round(state.seconds)} seconds</span></div><div class="cs-feedback">${globalThis.CLATScoring.measurement({paragraphs},state.seconds).speedStatus==='unreliable'?'Reading too brief for a reliable estimate. Excluded from speed tracking.':'Your WPM measures the first reading only.'} Accuracy is the percentage of questions answered correctly.</div><p style="margin-top:16px">This is your first snapshot. Future passages will help track your progress.</p><details><summary>Review my answers</summary>${questions.map((q,i)=>`<div class="cs-feedback"><span class="cs-kicker">Question ${i+1} · ${state.answers[i]===null?'Unanswered':state.answers[i]===q.correct?'Correct':'Incorrect'}</span><p>${q.text}</p><p>Your answer: ${state.answers[i]===null?'Unanswered · 0 marks':q.options[state.answers[i]]}</p><p>Correct answer: ${q.options[q.correct]}</p><p>${q.why}</p></div>`).join('')}</details><div class="cs-footer">${primary('Go to Home','next')}</div>`;
  if(globalThis.lucide)lucide.createIcons({attrs:{width:18,height:18}});
 }
 globalThis.CLATWebRoute={
  current:()=>mocksActive?'mocks':workoutActive?'daily':practiceActive?practice.route():daily.view,
  go(r){
   const area=String(r||'home').split('/')[0];
   if(area==='mocks'){practice.pause();freshWorkout.pause();practiceActive=false;workoutActive=false;mocksActive=true;state.step=5;mocks.open();return;}
   mocks.leave();mocksActive=false;
   if(area==='daily'){practice.pause();practiceActive=false;workoutActive=true;freshWorkout.open();return;}
   if(area==='revision'){freshWorkout.pause();workoutActive=false;practiceActive=true;practice.openRevision();return;}
   if(area==='practice'){freshWorkout.pause();workoutActive=false;practiceActive=true;practice.goto(r);return;}
   freshWorkout.pause();workoutActive=false;practice.pause();practiceActive=false;state.step=5;daily.view=['progress','settings'].includes(area)?area:'home';render();
  }};
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!root.contains(b))return;
  if(b.disabled)return;
  if(b.dataset.wh||b.dataset.mock||b.dataset.onboarding||b.form?.id==='ob-profile-form'||b.dataset.practice||b.dataset.workout||b.dataset.revision||b.dataset.settings||(b.type==='submit'&&b.form?.id==='st-profile-form'))return;
  if(b.dataset.action==='open-mocks'){practice.pause();freshWorkout.pause();practiceActive=false;workoutActive=false;mocksActive=true;state.step=5;mocks.open();return;}
  if(['tab-home','tab-progress','tab-settings','open-practice','open-premium','daily-fresh','progress-revision'].includes(b.dataset.action)){mocks.leave();mocksActive=false;}
  if(b.dataset.action==='daily-fresh'){practice.pause();practiceActive=false;workoutActive=true;freshWorkout.open();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(b.dataset.action==='progress-revision'){freshWorkout.pause();workoutActive=false;practiceActive=true;practice.openRevision();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(b.dataset.action==='achievement-detail'){globalThis.CLATAchievements.select(b.dataset.badge);render();root.querySelector('.ac-detail')?.scrollIntoView?.({block:'center',behavior:'instant'});return;}
  if(b.dataset.action==='progress-subject'){globalThis.CLATProgress.selectSubject(b.dataset.subject);render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(b.dataset.action==='progress-metric'){globalThis.CLATProgress.selectMetric(b.dataset.metric);render();return;}
  if(b.dataset.action==='progress-demo'){globalThis.CLATProgress.toggle();render();return;}
  if(['tab-home','tab-progress','tab-settings'].includes(b.dataset.action)){freshWorkout.pause();workoutActive=false;practice.pause();practiceActive=false;state.step=5;daily.view=b.dataset.action.slice(4);render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(b.dataset.action==='open-premium'){freshWorkout.pause();workoutActive=false;practiceActive=true;practice.openPremium();root.scrollIntoView?.({block:'start',behavior:'instant'});return;}
  if(b.dataset.action==='open-practice'){freshWorkout.pause();workoutActive=false;practiceActive=true;practice.open(b.dataset.set);root.scrollIntoView?.({block:'start'});return;}
  if(b.dataset.dailyAnswer!==undefined){daily.answers[daily.q]=Number(b.dataset.dailyAnswer);render();return;}
  if(b.dataset.answer!==undefined)state.answers[state.question]=Number(b.dataset.answer);
  let a=b.dataset.action;
  if(a==='question-skip'&&state.step===3){state.answers[state.question]=null;a='question-next';}
  if(a&&a.startsWith('daily-')){
   let action=a.slice(6);
   if(action==='answer-skip'&&daily.view==='questions'){daily.answers[daily.q]=null;action='answer-next';}
   if(action==='home')daily.view='home';
   if(action==='intro')daily.view='intro';
   if(action==='read'){dailyAttemptId=globalThis.CLATProgress.id();daily.view='reading';daily.start=performance.now();daily.answers=Array(5).fill(null);daily.reward=false;daily.canEarn=true;daily.q=0;daily.review=0;}
   if(action==='finish'){daily.seconds=Math.max(.001,(performance.now()-daily.start)/1000);daily.view='questions';}
   if(action==='answer-clear'&&daily.view==='questions')daily.answers[daily.q]=null;
   if(action==='answer-next'&&daily.view==='questions'){if(daily.q<4)daily.q++;else{globalThis.CLATProgress.record({id:dailyAttemptId,title:'Daily workout',total:dq.length,correct:ds(),unanswered:globalThis.CLATScoring.unanswered(daily.answers),wpm:dw*60/daily.seconds,date:new Date().toISOString()});daily.view='results';daily.reward=true;daily.review=0;globalThis.CLATFullMarks?.complete(dailyAttemptId,ds(),dq.length);}}
   if(action==='answer-back'&&daily.q>0)daily.q--;
   if(action==='review'){daily.view='review';daily.review=0;}
   if(action==='review-next'){if(daily.review<4)daily.review++;else{daily.view='summary';daily.complete=true;if(daily.canEarn){globalThis.CLATWorkoutRewards.complete();daily.canEarn=false;}}}
   if(action==='review-back'&&daily.review>0)daily.review--;
   if(action==='diagnostic'){state.step=2;state.reading=false;daily.view='home';}
   render();root.scrollIntoView?.({block:'start',behavior:'instant'});return;
  }
  if(a==='diagnostic-exit'){if(state.reading){state.reading=false;state.step=2;}else{state.step=5;daily.view='home';}}
  if(a==='next')state.step++;
  if(a==='back'){state.step--;state.reading=false;}
  if(a==='read'){diagnosticPausedAt=null;diagnosticAttemptId=globalThis.CLATProgress.id();state.start=performance.now();diagnosticStarted=state.start;state.reading=true;state.answers=Array(5).fill(null);state.question=0;}
  if(a==='finish'&&state.step===2&&state.reading){state.seconds=Math.max(0.001,(performance.now()-state.start)/1000);state.reading=false;state.step=3;}
  if(a==='question-clear'&&state.step===3)state.answers[state.question]=null;
  if(a==='question-next'&&state.step===3){if(state.question<4)state.question++;else{globalThis.CLATProgress.record({id:diagnosticAttemptId,title:'Diagnostic',kind:'baseline',baselineType:'diagnostic',section:'English Language',seconds:Math.max(.001,((diagnosticPausedAt??performance.now())-diagnosticStarted)/1000),total:questions.length,correct:score(),unanswered:globalThis.CLATScoring.unanswered(state.answers),...globalThis.CLATScoring.measurement({paragraphs},state.seconds),date:new Date().toISOString()});completedBaseline={answerFormat:2,seconds:state.seconds,answers:[...state.answers]};state.step=4;globalThis.CLATFullMarks?.complete(diagnosticAttemptId,score(),questions.length);}}
  if(a==='question-back'&&state.question>0)state.question--;
  if(a==='restart'){state.step=0;state.answers=Array(5).fill(null);state.question=0;state.reading=false;state.seconds=0;}
  render();
  if(a)root.scrollIntoView({block:'start',behavior:'instant'});
 });
 render();
 if(globalThis.Tweak){const tweak=new Tweak({container:root,onChange:render});tweak.addSelect(state,'accent',{label:'Accent direction',options:['Violet','Blue']});tweak.addToggle(state,'rounded',{label:'Soft corners'});}
})();
