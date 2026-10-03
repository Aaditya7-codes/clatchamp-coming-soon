// Sign-up gate for the web portal. Runs before the app loads: a learner who isn't signed in sees a
// full-page "Create your free account" (or "Sign in") screen instead of the practice portal.
// Sign-up asks for the learner's first name, the age/consent confirmation, then Google or an email code.
// If the account server can't be reached, the learner may practise as a guest; progress is merged
// into their account the next time they sign in.
(() => {
 const auth=globalThis.CLATWebAuth,cfg=globalThis.CLATWebConfig||{};
 const AFTER='clat-web-after-sign-in',SETTINGS='clat-speed-settings-v1',ONBOARDING='clat-speed-onboarding-v1';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
 const G='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>';

 let mode=/(^|[?&])signin(=|&|$)/.test(location.search)?'signin':'signup',step='start',name='',email='',consent=false,error='',busy=false,offline=false,page=null,resolveGuest=null;

 // After an account is created or signed in: keep the learner's first name, skip the old welcome
 // screens (the dashboard opens directly) and reload so progress is merged before the app starts.
 function finish(session){
  if(mode==='signup'&&name){const s=read(SETTINGS)||{version:1,name:'',examYear:'',stage:'',textSize:'standard',font:'serif',spacing:'standard',reduceMotion:false};write(SETTINGS,{...s,name:name.slice(0,40)});}
  const o=read(ONBOARDING)||{};write(ONBOARDING,{...o,version:2,contentVersion:globalThis.CLATOnboardingStarter?.version||o.contentVersion||3,complete:true});
  auth.saveSession(session);
  try{sessionStorage.setItem(AFTER,JSON.stringify('welcome'));}catch{}
  location.replace(location.pathname);
 }
 const nameOk=()=>/\p{L}/u.test(name);
 function check(needsEmail){
  if(mode==='signup'&&!nameOk())return 'Enter your first name.';
  if(mode==='signup'&&!consent)return 'Please tick the box to confirm your age or a parent’s or guardian’s agreement.';
  if(needsEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return 'Enter a valid email address, like name@gmail.com.';
  return '';
 }
 function keep(){
  const n=page?.querySelector('#su-name'),e=page?.querySelector('#su-email'),c=page?.querySelector('#su-consent');
  if(n)name=n.value.trim();if(e)email=e.value.trim().toLowerCase();if(c)consent=c.checked;
 }

 function render(){
  const up=mode==='signup',dis=busy?'disabled':'';
  const err=error?`<p class="su-error" role="alert">${esc(error)}</p>`:'';
  const gets=`<ul class="su-gets"><li><b>Reading speed and accuracy</b> tracked after every set</li><li><b>Free practice</b> in all five subjects, plus a full-length mock</li><li><b>Your progress saved</b> on any computer you sign in to</li></ul>`;
  let card;
  if(step==='code'){
   card=`<h2>Check your inbox</h2><p class="su-sub">We sent a 6-digit code to <b>${esc(email)}</b>. It expires in 10 minutes. If it isn’t there, look in Spam or Promotions.</p>
    <form data-su="verify"><label for="su-code">6-digit code</label><input id="su-code" class="su-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required ${dis}>
    ${err}<button class="su-primary" ${dis}>${busy?'Checking…':up?'Create my account':'Sign in'}</button></form>
    <p class="su-small"><button type="button" class="su-link" data-su="back">Use a different email</button> · <button type="button" class="su-link" data-su="resend" ${dis}>Send a new code</button></p>`;
  }else{
   card=`<h2>${up?'Sign up free':'Sign in'}</h2><p class="su-sub">${up?'No card needed.':'Use the same Google account or email you signed up with.'}</p>
    ${up?`<label for="su-name">Your first name</label><input id="su-name" class="su-input" autocomplete="given-name" maxlength="40" placeholder="e.g. Riya" value="${esc(name)}" ${dis}>
    <p class="su-hint">The learner’s name, even if you sign up with a parent’s Google account.</p>
    <label class="su-consent"><input type="checkbox" id="su-consent" ${consent?'checked':''} ${dis}><span>I’m 18 or older, or my parent or guardian agrees to me creating this account. I accept the <a href="/terms/" target="_blank" rel="noopener">Terms</a> and <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>`:''}
    ${auth.google&&!busy&&(!up||(consent&&nameOk()))?'<div class="su-gsi" id="su-gsi"></div>':(auth.google?`<button type="button" class="su-google" data-su="google" ${dis}>${G}${up?'Sign up with Google':'Sign in with Google'}</button>`:'')}
    <p class="su-or"><span>or with your email</span></p>
    <form data-su="send" novalidate><label for="su-email">Email address</label><input id="su-email" class="su-input" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(email)}" ${dis}>
    ${err}<button class="su-primary" ${dis}>${busy?'Sending…':'Email me a sign-in code'}</button></form>
    <p class="su-swap">${up?'Already have an account? <button type="button" class="su-link" data-su="mode">Sign in</button>':'New to CLAT Champ? <button type="button" class="su-link" data-su="mode">Create a free account</button>'}</p>`;
  }
  const guest=offline?`<div class="su-offline" role="status"><p><b>We can’t reach the sign-in server right now.</b> You can practise without an account for now. Your progress is kept in this browser and added to your account when you sign in.</p><button type="button" class="su-secondary" data-su="guest">Practise without an account for now</button></div>`:'';
  page.innerHTML=`<header class="su-bar"><a class="su-brand" href="/"><img src="brand-icon.png" alt="" width="28" height="28">CLAT CHAMP</a></header>
   <main class="su-main"><div class="su-copy"><h1>${up?'Create your <em>free account.</em>':'Welcome <em>back.</em>'}</h1>
   <p class="su-lede">${up?'It takes a few seconds, and your progress follows you to any computer.':'Sign in to pick up where you left off.'}</p>${gets}</div>
   <div class="su-card">${card}</div></main>${guest}`;
  const gsi=page.querySelector('#su-gsi');
  if(gsi)auth.renderGoogle(gsi,(e,d)=>{if(e){error=e.status===400||e.status===401?'Google sign-in didn’t complete. Please try again.':e.message;render();return;}finish(d);})
   .catch(e=>{error=e.message;render();});
 }

 async function action(a){
  keep();
  if(a==='mode'){mode=mode==='signup'?'signin':'signup';error='';render();return;}
  if(a==='back'){step='start';error='';render();return;}
  if(a==='guest'){page.remove();resolveGuest?.();return;}
  if(a==='google'){error=check(false);render();return;}
  if(a==='send'||a==='resend'){
   error=check(true);if(error){render();return;}
   busy=true;render();
   try{await auth.api('/auth/v1/otp',{method:'POST',signedIn:false,body:{email,create_user:mode==='signup'}});step='code';error=a==='resend'?'':'';}
   catch(e){error=e.status===429?'Too many attempts. Please wait a minute and try again.':mode==='signin'&&(e.status===400||e.status===422)?'We couldn’t find an account for that email. Create a free account instead.':'Couldn’t send the code: '+e.message;}
   busy=false;render();page.querySelector(step==='code'?'#su-code':'#su-email')?.focus();return;
  }
  if(a==='verify'){
   const code=page.querySelector('#su-code').value.trim();
   if(!/^\d{6}$/.test(code)){error='Enter the 6-digit code from the email.';render();return;}
   busy=true;error='';render();
   try{finish(await auth.api('/auth/v1/verify',{method:'POST',signedIn:false,body:{type:'email',email,token:code}}));}
   catch(e){busy=false;error=e.status===400||e.status===403?'That code is incorrect or has expired.':e.message;render();}
  }
 }

 // Returns a promise that only resolves if the learner chooses to practise as a guest.
 function gate(){
  return new Promise(resolve=>{
   resolveGuest=resolve;
   page=document.createElement('section');page.className='su-page';page.setAttribute('aria-label',mode==='signup'?'Create your free account':'Sign in');
   document.body.append(page);
   page.addEventListener('click',e=>{const b=e.target.closest('[data-su]');if(b&&b.tagName!=='FORM'){e.preventDefault();action(b.dataset.su);}});
   page.addEventListener('submit',e=>{e.preventDefault();action(e.target.dataset.su);});
   page.addEventListener('change',e=>{if(e.target.id==='su-consent'){keep();error='';render();page.querySelector('#su-gsi,.su-google')?.scrollIntoView?.({block:'nearest'});}});
   page.addEventListener('input',e=>{if(e.target.id==='su-name'){const was=nameOk();keep();if(was!==nameOk()&&consent){render();const n=page.querySelector('#su-name');n.focus();n.setSelectionRange(n.value.length,n.value.length);}}});
   render();page.querySelector('#su-name,#su-email')?.focus();
   // Offer guest practice only when the account server can't be reached.
   const ctl=new AbortController();setTimeout(()=>ctl.abort(),8000);
   fetch(cfg.supabaseUrl+'/auth/v1/health',{headers:{apikey:cfg.supabaseAnonKey},signal:ctl.signal})
    .then(r=>{if(!r.ok)throw 0;}).catch(()=>{offline=true;render();});
  });
 }
 globalThis.CLATWebSignup={gate};
})();
