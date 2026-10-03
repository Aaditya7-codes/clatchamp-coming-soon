// Web replacement for premium.js: accounts (Google or email code), Razorpay subscriptions and the
// account dialog. Exposes the CLATPremium interface the app uses, plus CLATWebAccount for web-boot.js.
(() => {
 const auth=globalThis.CLATWebAuth,sync=globalThis.CLATWebSync,cfg=globalThis.CLATWebConfig||{},configured=auth.configured,payOpen=()=>cfg.paymentsOpen===true||(cfg.paymentsPreview||[]).includes(String(auth.email()||'').toLowerCase()); // closed until web-config.json says paymentsOpen: true; paymentsPreview lists accounts that may test live payments first
 const ENT='clat-web-entitlement-v1',AFTER='clat-web-after-sign-in';
 const plans={quarterly:{label:'3 months',note:'Billed every 3 months',per:'/ 3 months'},annual:{label:'1 year',note:'Billed annually',per:'/ year'}};
 const productIds={quarterly:'com.clatspeed.premium.quarterly',annual:'com.clatspeed.premium.annual'};
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const write=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch{}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=t=>new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
 const session=()=>auth.session();
 let entitlement=auth.signedIn()?read(ENT):null,selected='annual',busy=false,message='';
 const listeners=new Set(),notify=()=>{listeners.forEach(f=>{try{f();}catch(e){console.warn(e);}});renderDialog();renderHeader();};

 // ------------------------------------------------------------------ entitlement
 const active=()=>(entitlement?.rows||[]).filter(r=>r.current_end&&Date.parse(r.current_end)>Date.now());
 const renewing=()=>(entitlement?.rows||[]).find(r=>r.source==='razorpay'&&r.current_end&&Date.parse(r.current_end)>Date.now()&&!r.cancel_at_cycle_end&&r.status!=='cancelled');
 const hasAccess=()=>auth.signedIn()&&active().length>0;
 async function refresh(){
  if(!configured||!auth.signedIn())return hasAccess();
  const before=hasAccess();
  const rows=await auth.api('/rest/v1/subscriptions?select=source,plan,status,current_end,cancel_at_cycle_end&order=current_end.desc.nullslast');
  entitlement={checked:Date.now(),rows:Array.isArray(rows)?rows:[]};write(ENT,entitlement);
  if(before!==hasAccess())notify();
  return hasAccess();
 }

 // ------------------------------------------------------------------ checkout
 const loadCheckout=()=>globalThis.Razorpay?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=ok;s.onerror=()=>no(new Error('Couldn’t reach Razorpay. Check your connection and try again.'));document.head.append(s);});
 async function checkout(){
  if(busy)return;
  if(!auth.signedIn()){openDialog('email','buy');return;}
  busy=true;message='Opening secure checkout…';notify();
  try{
   if(await refresh()){busy=false;message='Premium is already active on this account.';notify();return;}
   const [sub]=await Promise.all([auth.api('/functions/v1/create-subscription',{method:'POST',body:{plan:selected}}),loadCheckout()]);
   const rzp=new globalThis.Razorpay({key:sub.key_id,subscription_id:sub.subscription_id,name:'CLAT CHAMP',description:'Premium · '+plans[selected].label,
    image:new URL('brand-icon.png',location.href).href,prefill:{email:auth.email()},theme:{color:'#6241db'},
    handler:async response=>{
     message='Payment received. Unlocking Premium…';notify();
     try{
      await auth.api('/functions/v1/verify-subscription',{method:'POST',body:response});
      for(let i=0;i<5&&!(await refresh());i++)await new Promise(r=>setTimeout(r,1500));
      if(hasAccess()){message='Premium is active. Loading all sets…';notify();await sync.flush();setTimeout(()=>location.reload(),700);return;}
      message='Payment received. Premium will unlock shortly — reload this page in a minute.';
     }catch{message='Payment received, but confirmation is delayed. Reload in a minute; contact support@clatchamp.com if Premium doesn’t unlock.';}
     busy=false;notify();
    },
    modal:{ondismiss(){if(busy&&!/Payment received/.test(message)){busy=false;message='';notify();}}}});
   rzp.on('payment.failed',r=>{busy=false;message='Payment didn’t go through: '+(r?.error?.description||'please try again.');notify();});
   message='';rzp.open();
  }catch(e){busy=false;message=e.status===401?'Please sign in again.':e.message;if(e.status===401)auth.clear();notify();}
 }
 async function cancelRenewal(){
  if(busy||!confirm('Cancel automatic renewal? Premium stays active until the end of the period you have paid for.'))return;
  busy=true;message='Cancelling renewal…';notify();
  try{await auth.api('/functions/v1/cancel-subscription',{method:'POST',body:{}});await refresh();message='Renewal cancelled. Premium stays active until the end of your paid period.';}
  catch(e){message=e.message;}
  busy=false;notify();
 }

 // ------------------------------------------------------------------ sign-in, sign-out, delete
 const remember=then=>{try{then?sessionStorage.setItem(AFTER,then):sessionStorage.removeItem(AFTER);}catch{}};
 // Reload after signing in so this browser's progress and the account's are merged before the app loads.
 function signedIn(d){saveEnt(null);auth.saveSession(d);remember(after||'welcome');location.reload();}
 const saveEnt=v=>{entitlement=v;write(ENT,v);};
 async function signOut(){
  busy=true;message='Saving your progress…';renderDialog();
  const saved=await sync.flush().catch(()=>false);
  busy=false;message='';
  if(!saved&&!confirm('Some recent progress hasn’t reached your account yet. If you sign out now, it will be lost. Sign out anyway?')){renderDialog();return;}
  auth.api('/auth/v1/logout',{method:'POST'}).catch(()=>{});
  sync.forget();saveEnt(null);auth.clear();location.reload();
 }
 async function deleteAccount(){
  busy=true;dialogError='';message='Deleting your account…';renderDialog();
  try{await auth.api('/functions/v1/delete-account',{method:'POST',body:{}});}
  catch(e){busy=false;message='';dialogError=e.message;renderDialog();return;}
  sync.forget();saveEnt(null);auth.clear();remember('deleted');location.reload();
 }

 // ------------------------------------------------------------------ account dialog
 let dialog=null,step='email',after=null,email='',dialogError='',consent=false;
 function openDialog(next,then=null){
  if(!configured)return;
  step=next||(auth.signedIn()?'account':'email');after=then;dialogError='';
  if(!dialog){dialog=document.createElement('dialog');dialog.className='wa-dialog';dialog.setAttribute('aria-labelledby','wa-title');document.body.append(dialog);
   dialog.addEventListener('click',e=>{if(e.target===dialog&&!busy)dialog.close();const b=e.target.closest('[data-wa]');if(b&&b.tagName!=='FORM')dialogAction(b.dataset.wa);});
   dialog.addEventListener('change',e=>{if(e.target.id==='wa-consent'){consent=e.target.checked;if(consent&&dialogError)dialogError='';const em=dialog.querySelector('#wa-email');if(em)email=em.value;renderDialog();}});
   dialog.addEventListener('submit',e=>{e.preventDefault();dialogAction(e.target.dataset.wa);});}
  renderDialog();if(!dialog.open)dialog.showModal();dialog.querySelector('input:not([type=checkbox])')?.focus();
 }
 const legal='<a href="/terms/">Terms</a> · <a href="/privacy/">Privacy Policy</a>';
 function mountGoogle(){
  const el=dialog?.querySelector('#wa-gsi');if(!el)return;
  auth.renderGoogle(el,(err,d)=>{if(err){dialogError=err.status===400||err.status===401?'Google sign-in didn’t complete. Please try again.':err.message;renderDialog();return;}signedIn(d);})
   .catch(e=>{dialogError=e.message;renderDialog();});
 }
 function renderDialog(){
  if(!dialog)return;
  const err=dialogError?`<p class="wa-error" role="alert">${esc(dialogError)}</p>`:'';
  const note=message?`<p class="wa-note" role="status">${esc(message)}</p>`:'';
  const close='<button type="button" class="wa-close" data-wa="close" aria-label="Close">✕</button>';
  const dis=busy?'disabled':'';
  let html='';
  if(step==='email')html=`${close}<h2 id="wa-title">${after==='buy'?'Sign in to subscribe':'Sign in or create a free account'}</h2>
   <p>Your profile and practice progress are saved to your account, so you can carry on from any computer.</p>
   <label class="wa-consent"><input type="checkbox" id="wa-consent" ${consent?'checked':''} ${dis}><span>I’m 18 or older, or my parent or guardian agrees to me creating this account.</span></label>
   ${auth.google&&consent&&!busy?'<div class="wa-gsi" id="wa-gsi" aria-live="polite"></div>':`<button type="button" class="wa-google" data-wa="google" ${dis}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>Continue with Google</button>`}
   <p class="wa-or"><span>or use your email</span></p>
   <form data-wa="send"><label for="wa-email">Email</label><input id="wa-email" type="email" autocomplete="email" required value="${esc(email)}" ${dis}>${err}<button class="cs-primary" ${dis}>${busy?'Sending…':'Email me a sign-in code'}</button></form>
   <p class="wa-small">New here? Signing in creates your free account. You can practise without one, but progress then stays in this browser only. ${legal}</p>`;
  if(step==='code')html=`${close}<h2 id="wa-title">Check your email</h2><p>Enter the 6-digit code sent to <b>${esc(email)}</b>.</p><form data-wa="verify"><label for="wa-code">Code</label><input id="wa-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required ${dis}>${err}<button class="cs-primary" ${dis}>${busy?'Checking…':'Sign in'}</button></form><button type="button" class="cs-text-button" data-wa="back">Use a different email</button>`;
  if(step==='account'){
   const now=active()[0],renew=renewing(),st=sync.status();
   html=`${close}<h2 id="wa-title">Your account</h2><p class="wa-email">${esc(auth.email())}</p>
   <p class="wa-sync wa-sync-${st.state}">${esc(sync.text())}</p>
   ${st.state==='stale'?'<button type="button" class="cs-primary" data-web-reload>Reload to combine progress</button>':''}
   <h3>Premium</h3>
   ${now?`<div class="pm-active">✓ Premium active · ${esc(plans[now.plan]?.label||'')}</div><p>${now.cancel_at_cycle_end||now.status==='cancelled'?'Ends':'Renews'} on ${date(now.current_end)}.</p>`:'<p>No active Premium subscription on this account.</p>'}
   ${err}${note}
   ${renew?`<button type="button" class="cs-text-button" data-wa="cancel" ${dis}>Cancel automatic renewal</button>`:''}
   <button type="button" class="cs-text-button" data-wa="refresh" ${dis}>Refresh Premium status</button>
   <button type="button" class="cs-text-button" data-wa="signout" ${dis}>Sign out of this browser</button>
   <button type="button" class="cs-text-button wa-danger" data-wa="delete-ask" ${dis}>Delete my account</button>
   <p class="wa-small">Signing out removes your progress from this browser; it stays in your account. Billing questions: <a href="mailto:support@clatchamp.com">support@clatchamp.com</a> · <a href="/refunds/">Cancellation &amp; refunds</a></p>`;
  }
  if(step==='delete'){
   const renew=renewing();
   html=`${close}<h2 id="wa-title">Delete your account?</h2>
   <p>This permanently deletes your account, your profile and all practice progress saved to it, and signs you out. It can’t be undone.</p>
   ${renew?'<p><b>Your Premium subscription will stop immediately</b> and the rest of the paid period won’t be refunded. To keep Premium until it ends, cancel renewal instead and delete your account later.</p>':''}
   ${err}${note}
   <div class="wa-actions"><button type="button" class="cs-primary wa-danger-button" data-wa="delete" ${dis}>${busy?'Deleting…':'Delete my account'}</button><button type="button" class="cs-text-button" data-wa="account" ${dis}>Keep my account</button></div>`;
  }
  dialog.innerHTML=html;mountGoogle();
 }
 async function dialogAction(a){
  if(a==='close'){if(!busy)dialog.close();return;}
  if(a==='back'){step='email';dialogError='';renderDialog();return;}
  if(a==='account'){step='account';dialogError='';message='';renderDialog();return;}
  if(a==='google'){
   if(!consent){dialogError='Please confirm the box above to continue.';renderDialog();return;}
   remember(after||'welcome');location.href=auth.googleUrl();return;
  }
  if(a==='send'){
   if(!consent){dialogError='Please confirm the box above to continue.';renderDialog();return;}
   email=dialog.querySelector('#wa-email').value.trim().toLowerCase();busy=true;dialogError='';renderDialog();
   try{await auth.api('/auth/v1/otp',{method:'POST',signedIn:false,body:{email,create_user:true}});step='code';}
   catch(e){dialogError=e.status===429?'Too many attempts. Please wait a minute and try again.':'Couldn’t send the code: '+e.message;}
   busy=false;renderDialog();dialog.querySelector('input:not([type=checkbox])')?.focus();return;
  }
  if(a==='verify'){
   const code=dialog.querySelector('#wa-code').value.trim();busy=true;dialogError='';renderDialog();
   try{signedIn(await auth.api('/auth/v1/verify',{method:'POST',signedIn:false,body:{type:'email',email,token:code}}));}
   catch(e){busy=false;dialogError=e.status===400||e.status===403?'That code is incorrect or has expired.':e.message;renderDialog();}
   return;
  }
  if(a==='refresh'){busy=true;message='';renderDialog();try{await refresh();message='Status updated.';}catch(e){dialogError=e.message;}busy=false;notify();return;}
  if(a==='cancel'){cancelRenewal();return;}
  if(a==='signout'){signOut();return;}
  if(a==='delete-ask'){step='delete';dialogError='';message='';renderDialog();return;}
  if(a==='delete'){deleteAccount();}
 }
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-web-account]');if(b){e.preventDefault();openDialog();}});

 // ------------------------------------------------------------------ header account button + notices
 function renderHeader(){
  if(!configured)return;
  const top=document.querySelector('#clat-prototype .cs-top');if(!top)return;
  let b=top.querySelector('.wa-header');
  if(!b){b=document.createElement('button');b.type='button';b.className='wa-header';b.dataset.webAccount='';top.append(b);}
  const st=sync.status().state;
  b.innerHTML=auth.signedIn()?`<span class="wa-avatar" aria-hidden="true">${esc((auth.email()[0]||'?').toUpperCase())}</span><span class="wa-header-label">Account</span>${st==='stale'||st==='offline'?'<span class="wa-dot" aria-hidden="true"></span>':''}`:'<span class="wa-header-label">Sign in</span>';
  b.setAttribute('aria-label',auth.signedIn()?`Your account (${auth.email()})`:'Sign in or create a free account');
 }
 function toast(text){const t=document.createElement('p');t.className='wa-toast';t.setAttribute('role','status');t.textContent=text;document.body.append(t);setTimeout(()=>t.remove(),5000);}
 sync.subscribe(()=>{renderHeader();if(dialog?.open&&step==='account')renderDialog();});
 renderHeader();
 if(configured){
  let then=null;try{then=sessionStorage.getItem(AFTER);sessionStorage.removeItem(AFTER);}catch{}
  addEventListener('clat-web-ready',()=>{
   if(auth.returnError()){consent=true;openDialog('email');dialogError=auth.returnError();renderDialog();return;}
   if(then==='deleted'){toast('Your account has been deleted.');return;}
   if(!auth.signedIn()||!then)return;
   if(then==='buy'){checkout();return;}
   toast(`Signed in as ${auth.email()}. Your progress is saved to your account.`);
  },{once:true});
 }

 // ------------------------------------------------------------------ CLATPremium interface
 function controls(){
  const priceButtons=Object.keys(plans).reverse().map(p=>`<button class="pm-plan" data-practice="premium-plan" data-product="${productIds[p]}" aria-pressed="${selected===p}" ${busy?'disabled':''}><span>${plans[p].label}<small>${plans[p].note}</small></span><strong>${esc(cfg.prices?.[p])}</strong></button>`).join('');
  if(configured&&hasAccess()){const now=active()[0];return `<div class="pm-active">✓ Premium active · All five subjects</div><p class="pm-billing">${now.cancel_at_cycle_end||now.status==='cancelled'?'Ends':'Renews'} on ${date(now.current_end)}.</p><button class="cs-text-button" data-web-account>Manage account</button>`;}
  if(!configured||!payOpen())return `<div class="pm-plans" role="group" aria-label="Subscription plans">${priceButtons}</div><button class="cs-primary" disabled>Premium subscriptions open shortly</button><p class="pm-billing">We’re finishing secure payments for Premium. Everything free — one full set per subject, Mock 1 and Question of the Day — works now.</p>`;
  if(hasAccess()){const now=active()[0];return `<div class="pm-active">✓ Premium active · All five subjects</div><p class="pm-billing">${now.cancel_at_cycle_end||now.status==='cancelled'?'Ends':'Renews'} on ${date(now.current_end)}.</p><button class="cs-text-button" data-web-account>Manage account</button>`;}
  return `<div class="pm-plans" role="group" aria-label="Subscription plans">${priceButtons}</div>
  <button class="cs-primary" data-practice="premium-buy" ${busy?'disabled':''}>${busy?'Please wait…':`Subscribe · ${esc(cfg.prices?.[selected])} ${plans[selected].per}`}</button>
  <p class="pm-billing">Secure payment by Razorpay (UPI, cards, net banking). Renews automatically until you cancel; cancel any time and keep Premium until the end of the paid period. Premium works on any computer where you sign in.</p>
  ${message?`<p class="pm-availability" role="status" aria-live="polite">${esc(message)}</p>`:''}
  <div class="pm-account-actions">${auth.signedIn()?`<span class="wa-signed">Signed in as ${esc(auth.email())}</span><button class="cs-text-button" data-web-account>Account</button>`:'<button class="cs-text-button" data-web-account>Already subscribed? Sign in</button>'}</div>
  <p class="pm-billing"><a href="/terms/">Terms of Use</a> · <a href="/privacy/">Privacy Policy</a> · <a href="/refunds/">Cancellation &amp; refunds</a></p>`;
 }
 globalThis.CLATPremium={hasAccess,controls,
  status:()=>({hasAccess:hasAccess(),busy,message}),
  subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},
  receive(){},
  action(action,id){
   if(action==='premium-plan'){const p=Object.keys(productIds).find(k=>productIds[k]===id);if(p&&!busy){selected=p;notify();}return;}
   if(action==='premium-buy'){if(!configured||!payOpen())return;checkout();return;}
   if(action==='premium-restore'||action==='premium-manage'){if(!configured){message='Premium subscriptions open shortly.';notify();return;}openDialog();return;}
   if(action==='premium-refresh'){refresh().catch(e=>{message=e.message;notify();});}
  }};
 // Settings shows this summary; the full policy lives on the website.
 if(globalThis.CLATInfo)globalThis.CLATInfo.privacy=()=>`<div class="st-policy"><p>You can practise without an account; your profile and progress then stay in this browser.</p><p>If you create an account, we store your email address, your profile (name, target year and preparation stage) and your practice progress with our database provider, so you can continue on any computer. For Premium we also store your subscription status. Razorpay processes payments; we never receive your card or UPI details.</p><p>You can delete your account and its saved progress at any time from <b>Account</b>.</p><p><a href="/privacy/">Read the full Privacy Policy</a> · <a href="/terms/">Terms</a> · <a href="/refunds/">Cancellation &amp; refunds</a></p></div>`;
 globalThis.CLATWebAccount={configured,hasAccess,refresh,signedIn:auth.signedIn,
  contentIndex:()=>auth.api('/rest/v1/content_items?select=id,content_version'),
  content:ids=>auth.api('/rest/v1/content_items?select=id,kind,content_version,payload&id=in.('+ids.map(encodeURIComponent).join(',')+')'),
  daily:day=>auth.api('/functions/v1/daily-set?date='+day,{signedIn:false})};
})();
