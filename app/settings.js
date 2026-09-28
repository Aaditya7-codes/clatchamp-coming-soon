// Profile and motion preferences are local and separate from scored attempts.
globalThis.createCLATSettings=function(root,onChange){
 const key='clat-speed-settings-v1';
 const defaults={version:1,name:'',examYear:'',stage:'',textSize:'standard',font:'serif',spacing:'standard',reduceMotion:false};
 const stages={'class-11':'Class 11','class-12':'Class 12','gap-year':'Gap year / repeat attempt',other:'Other'};
 const sizes={standard:18,large:20,larger:22};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function clean(x){x=x&&typeof x==='object'&&!Array.isArray(x)?x:{};return {...defaults,name:typeof x.name==='string'?x.name.trim().slice(0,40):'',examYear:/^20\d{2}$/.test(String(x.examYear))?String(x.examYear):'',stage:stages[x.stage]?x.stage:'',textSize:'standard',font:'serif',spacing:'standard',reduceMotion:x.reduceMotion===true};}
 let state={...defaults},draft={...defaults},editing=false,message='',failed=false,premiumActionStarted=false;
 try{state=clean(JSON.parse(localStorage.getItem(key)||'null'));}catch{}
 function apply(){
  root.style.setProperty('--reading-size',sizes[state.textSize]+'px');
  root.style.setProperty('--reading-font',state.font==='serif'?'Georgia,serif':'-apple-system,BlinkMacSystemFont,system-ui,sans-serif');
  root.style.setProperty('--reading-line',state.spacing==='roomy'?'2':'1.75');
  root.setAttribute?.('data-reduce-motion',String(state.reduceMotion));
 }
 function save(next,success){try{localStorage.setItem(key,JSON.stringify(next));state=next;apply();failed=false;message=success;return true;}catch{failed=true;message='Couldn’t save your changes. Please try again.';return false;}}
 function refresh(){onChange();}
 const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
 const choices=(field,items,label)=>`<div class="st-choices" role="group" aria-label="${label}">${items.map(([value,text])=>`<button data-settings="preference" data-field="${field}" data-value="${value}" aria-pressed="${state[field]===value}">${text}</button>`).join('')}</div>`;
 // Official exam dates, verified 12 September 2026. CLAT years refer to admission years.
 // https://clat2027.consortiumofnlus.ac.in/clat-2027/ug-instructions.html
 // https://consortiumofnlus.ac.in/clat-2026/notifications/CLAT2026-Result-Notification.pdf
 function homeIntro(now=new Date()){
  const dates={'2026':[2025,11,7],'2027':[2026,11,6]};
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  let year=state.examYear||'2027';
  if((dates[year]&&Date.UTC(...dates[year])<today)||Number(year)<now.getFullYear()){
   year=Object.keys(dates).find(y=>Date.UTC(...dates[y])>=today)||String(Math.max(now.getFullYear()+1,...Object.keys(dates).map(y=>Number(y)+1)));
  }
  const exam=dates[year];
  const days=exam?Math.round((Date.UTC(...exam)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000):null;
  const countdown=days===null?'<span class="dash-countdown-note">Date to be announced</span>':days===0?'<span class="dash-countdown-note">Exam today</span>':`<strong>${days}</strong><span>${days===1?'day':'days'} to go</span>`;
  return `<div class="dash-intro"><div class="dash-date-row"><div class="cs-kicker">${now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div><div class="dash-countdown" aria-label="CLAT ${year} countdown"><span class="dash-countdown-year">CLAT ${year}</span><div>${countdown}</div></div></div><h1>Hi${state.name?', <span class="dash-title-accent">'+esc(state.name)+'</span>':' there'}</h1></div>`;
 }
 function render(){
  const currentYear=new Date().getFullYear(),years=[...new Set([...(state.examYear?[Number(state.examYear)]:[]),...Array.from({length:6},(_,i)=>currentYear+i)])].sort((a,b)=>a-b);
  const initials=state.name?state.name.split(/\s+/).slice(0,2).map(s=>Array.from(s)[0]).join('').toUpperCase():'CS';
  const premium=globalThis.CLATPremium?.status?.()||{hasAccess:false,busy:false,message:''};
  const appInfo=globalThis.CLATAppInfo;
  return `<div class="st-heading"><div class="cs-kicker">Make it yours</div><h1>Settings</h1><p>Your profile and preferences.</p></div>
  <section class="st-profile"><div class="st-avatar" aria-hidden="true">${esc(initials)}</div><div class="st-profile-copy"><h2>${esc(state.name||'Student profile')}</h2>${state.stage?'<p>'+esc(stages[state.stage])+'</p>':''}<span>Saved on this device</span></div><button class="st-edit" data-settings="edit-profile" aria-label="Edit profile">${icon('pencil')}</button></section>
  ${editing?`<form class="st-form" id="st-profile-form"><h2>Edit profile</h2><label for="st-name">Name <span>Optional</span></label><input id="st-name" name="name" type="text" autocomplete="given-name" maxlength="40" placeholder="What should we call you?" value="${esc(draft.name)}"><label for="st-year">Target CLAT year</label><select id="st-year" name="examYear"><option value="">Not decided yet</option>${years.map(y=>`<option value="${y}" ${String(y)===draft.examYear?'selected':''}>${y}</option>`).join('')}</select><label for="st-stage">Preparation stage</label><select id="st-stage" name="stage"><option value="">Choose your stage</option>${Object.entries(stages).map(([value,label])=>`<option value="${value}" ${value===draft.stage?'selected':''}>${label}</option>`).join('')}</select><p class="st-caption">These details are for your profile.</p><div class="st-form-actions"><button type="submit" class="cs-primary">Save profile</button><button type="button" class="cs-text-button" data-settings="cancel-profile">Cancel</button></div></form>`:''}
  <div class="st-status ${failed?'is-error':''}" role="status" aria-live="polite">${esc(message)}</div>
  ${!editing?`<section class="st-panel st-target"><h2><label for="st-target-year">Target year</label></h2><select id="st-target-year" aria-label="Target CLAT year"><option value="">Not decided yet</option>${years.map(y=>`<option value="${y}" ${String(y)===state.examYear?'selected':''}>CLAT ${y}</option>`).join('')}</select></section>`:''}
  <section class="st-panel st-membership"><div class="st-membership-heading"><h2>${icon('gem')}Premium</h2><span class="st-membership-status">${premium.hasAccess?'Active':'Free plan'}</span></div><p>${premium.hasAccess?'Five sets per subject are ready. Complete one to open the next in that subject, while sets remain.':'Your Question of the Day and one complete set per subject are free.'}</p>
  ${!premium.hasAccess?`<button class="cs-primary st-premium-button" data-action="open-premium">${icon('gem')}Explore Premium</button>`:''}
  <div class="st-membership-actions"><button data-settings="manage-subscription" ${premium.busy?'disabled':''}>Manage subscription ${icon('arrow-up-right')}</button><button data-settings="restore-purchases" ${premium.busy?'disabled':''}>Sign in to Premium ${icon('rotate-ccw')}</button></div>
  ${premiumActionStarted?`<p class="st-purchase-status" role="status" aria-live="polite">${esc(premium.busy?'Please wait…':premium.message||'Subscription information is up to date.')}</p>`:''}
  <p class="st-caption">Signing in restores Premium in this browser, not your practice history.</p></section>
  <section class="st-info st-settings-group"><h2>Help & support</h2>
  <details><summary>${icon('mail')}Contact support</summary><p>For app issues or subscription questions:</p><p><a href="mailto:support@clatchamp.com">support@clatchamp.com</a></p><p>Include your app version and a brief description of the issue.</p></details>
  <details><summary>${icon('flag')}Report a question error</summary><p>Include the subject, passage title, question number and what needs correcting.</p><p><a href="mailto:support@clatchamp.com?subject=Question%20error">support@clatchamp.com</a></p></details>
  <details><summary>${icon('message-circle')}General enquiries</summary><p><a href="mailto:contact@clatchamp.com">contact@clatchamp.com</a></p></details>
  <details><summary>${icon('shield-check')}Privacy enquiries</summary><p><a href="mailto:privacy@clatchamp.com">privacy@clatchamp.com</a></p></details>
  <details><summary>${icon('circle-help')}Scoring & progress</summary><h3>Scoring</h3><p>Each correct answer earns 1 mark. Each incorrect answer loses 0.25 marks. Accuracy measures correct answers divided by total questions; it is separate from your marks.</p><h3>Your dashboard</h3><p>Practice totals count each distinct set once across subject practice and Question of the Day. Accuracy and average time use the first completion. The horizontal axis shows set completion order, not dates. Initial assessments appear separately under Starting baseline.</p><p>Overall accuracy uses the questions in each set’s first completed attempt. Median reading speed is shown for a selected subject, using the first valid timed reading of each set. If that comes from a retake, its graph point is hollow and labelled Repeat reading; original accuracy and time do not change. Timing counts show how many measurements are available. Average attempt time includes reading and question time, excluding pauses.</p><h3>Reading speed</h3><p>Words per minute measures the first timed reading, excluding question time. Missing or unreliable readings have no speed point, and graph lines do not bridge those gaps. Readings under 3 seconds or above 1,000 WPM are flagged and excluded from speed summaries. This is an accidental-tap safeguard, not a scientific reading-speed limit. Raw measurements and scores remain saved. Compare speed alongside accuracy; practice results do not predict a CLAT score.</p><h3>Premium progression</h3><p>Premium starts with five ready sets per subject. Each first completion opens one more set in the same subject, regardless of score, until you finish the library. Completed sets stay available to review and reattempt. Question of the Day attempts do not unlock extra subject sets.</p><h3>Reattempts</h3><p>Completed sets appear under Practice → Reattempt questions. Completing a retry updates the score shown for that set, while the dashboard continues to use your first completed attempt. Retries do not unlock extra sets.</p></details></section>
  <section class="st-info st-settings-group"><h2>Privacy & information</h2>
  <details><summary>${icon('shield-check')}Privacy Policy</summary>${globalThis.CLATInfo?.privacy()||''}</details>
  <a class="st-link-row" href="/terms/">${icon('file-text')}Terms of Use${icon('arrow-up-right')}</a>
  <details><summary>${icon('hard-drive')}Saved data</summary><p>Your profile and study progress are saved locally. Progress is kept in this browser on this computer and is not synced to other devices. Clearing this site’s data in your browser settings removes it, so avoid doing that as a troubleshooting step.</p><p>Updates to CLAT CHAMP keep your saved progress. Signing in restores Premium access only. Cancelling Premium does not delete your study history.</p></details>
  <details><summary>${icon('info')}About CLAT CHAMP</summary><p>Independent practice for CLAT students across all five subjects, with explanations, reading-speed measurement and progress tracking.</p><p>CLAT CHAMP is not affiliated with or endorsed by the Consortium of National Law Universities. Practice results do not guarantee an exam score or admission.</p><p>Practice you have opened works offline in this browser. Sign-in, purchases and new content need an internet connection.</p></details></section>
  ${appInfo?`<p class="st-version">CLAT CHAMP · Version ${esc(appInfo.version)} (${esc(appInfo.build)})</p>`:''}

`;
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!root.contains(b)||!b.dataset.settings)return;
  const action=b.dataset.settings;
  if(action==='manage-subscription'||action==='restore-purchases'){premiumActionStarted=true;globalThis.CLATPremium?.action(action==='manage-subscription'?'premium-manage':'premium-restore');return;}
  if(action==='edit-profile'){draft={...state};editing=true;message='';failed=false;refresh();return;}
  if(action==='cancel-profile'){editing=false;message='';failed=false;refresh();return;}
  let next={...state};
  if(action!=='toggle-motion')return;
  next.reduceMotion=!state.reduceMotion;
  save(next,'Preferences saved.');refresh();
 });
 const updateDraft=e=>{const field={'st-name':'name','st-year':'examYear','st-stage':'stage'}[e.target.id];if(editing&&field)draft[field]=e.target.value;};
 root.addEventListener('input',updateDraft);root.addEventListener('change',updateDraft);
 root.addEventListener('change',e=>{
  if(e.target.id!=='st-target-year')return;
  save(clean({...state,examYear:e.target.value}),'Target year saved.');refresh();
 });
 root.addEventListener('submit',e=>{
  if(e.target.id!=='st-profile-form')return;e.preventDefault();
  const form=e.target;
  const next=clean({...state,name:form.elements.namedItem('name').value,examYear:form.elements.namedItem('examYear').value,stage:form.elements.namedItem('stage').value});
  if(save(next,'Profile saved.'))editing=false;
  refresh();
 });
 apply();
 return {render,homeIntro,saveProfile:profile=>save(clean({...state,...profile}),'Profile saved.'),profile:()=>({name:state.name,examYear:state.examYear,stage:state.stage})};
};
