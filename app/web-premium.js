// Web replacement for premium.js: Supabase email-code sign-in and Razorpay subscriptions.
// Exposes the same CLATPremium interface the app uses, plus CLATWebAccount for web-boot.js.
(() => {
 const cfg=globalThis.CLATWebConfig||{},configured=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey);
 const SESSION='clat-web-session-v1',ENT='clat-web-entitlement-v1',DAY=86400000;
 const plans={quarterly:{label:'3 months',note:'Billed every 3 months',per:'/ 3 months'},annual:{label:'1 year',note:'Billed annually',per:'/ year'}};
 const productIds={quarterly:'com.clatspeed.premium.quarterly',annual:'com.clatspeed.premium.annual'};
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const write=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch{}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=t=>new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
 let session=read(SESSION),entitlement=read(ENT),selected='annual',busy=false,message='',refreshing=null;
 const listeners=new Set(),notify=()=>{listeners.forEach(f=>{try{f();}catch(e){console.warn(e);}});renderDialog();};

 // ------------------------------------------------------------------ session + API
 function saveSession(d){
  session=d?{access_token:d.access_token,refresh_token:d.refresh_token,expires_at:d.expires_at||Math.floor(Date.now()/1000)+(d.expires_in||3600),email:d.user?.email||session?.email,user_id:d.user?.id||session?.user_id}:null;
  write(SESSION,session);
 }
 async function token(){
  if(!session)return null;
  if(session.expires_at-60>Date.now()/1000)return session.access_token;
  refreshing||=fetch(cfg.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})})
   .then(async r=>{const d=await r.json().catch(()=>null);if(r.ok&&d?.access_token)saveSession(d);else if(r.status>=400&&r.status<500)clearLocal();})
   .finally(()=>{refreshing=null;});
  await refreshing.catch(()=>{});
  return session&&session.expires_at-60>Date.now()/1000?session.access_token:null;
 }
 async function api(path,{method='GET',body,signedIn=true}={}){
  const bearer=signedIn?await token():cfg.supabaseAnonKey;
  if(signedIn&&!bearer){const e=new Error('Please sign in again.');e.status=401;throw e;}
  const r=await fetch(cfg.supabaseUrl+path,{method,headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
  if(!r.ok){const e=new Error(data?.error||data?.msg||data?.error_description||data?.message||`Request failed (${r.status})`);e.status=r.status;throw e;}
  return data;
 }
 function clearLocal(){session=null;entitlement=null;write(SESSION,null);write(ENT,null);}

 // ------------------------------------------------------------------ entitlement
 const active=()=>(entitlement?.rows||[]).filter(r=>r.current_end&&Date.parse(r.current_end)>Date.now());
 const hasAccess=()=>!!session&&active().length>0;
 async function refresh(){
  if(!configured||!session)return hasAccess();
  const before=hasAccess();
  const rows=await api('/rest/v1/subscriptions?select=source,plan,status,current_end,cancel_at_cycle_end&order=current_end.desc.nullslast');
  entitlement={checked:Date.now(),rows:Array.isArray(rows)?rows:[]};write(ENT,entitlement);
  if(before!==hasAccess())notify();
  return hasAccess();
 }

 // ------------------------------------------------------------------ checkout
 const loadCheckout=()=>globalThis.Razorpay?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=ok;s.onerror=()=>no(new Error('Couldn’t reach Razorpay. Check your connection and try again.'));document.head.append(s);});
 async function checkout(){
  if(busy)return;
  if(!session){openDialog('email','buy');return;}
  busy=true;message='Opening secure checkout…';notify();
  try{
   if(await refresh()){busy=false;message='Premium is already active on this account.';notify();return;}
   const [sub]=await Promise.all([api('/functions/v1/create-subscription',{method:'POST',body:{plan:selected}}),loadCheckout()]);
   const rzp=new globalThis.Razorpay({key:sub.key_id,subscription_id:sub.subscription_id,name:'CLAT CHAMP',description:'Premium · '+plans[selected].label,
    image:new URL('brand-icon.png',location.href).href,prefill:{email:session.email},theme:{color:'#6241db'},
    handler:async response=>{
     message='Payment received. Unlocking Premium…';notify();
     try{
      await api('/functions/v1/verify-subscription',{method:'POST',body:response});
      for(let i=0;i<5&&!(await refresh());i++)await new Promise(r=>setTimeout(r,1500));
      if(hasAccess()){message='Premium is active. Loading all sets…';notify();setTimeout(()=>location.reload(),700);return;}
      message='Payment received. Premium will unlock shortly — reload this page in a minute.';
     }catch(e){message='Payment received, but confirmation is delayed. Reload in a minute; contact support@clatchamp.com if Premium doesn’t unlock.';}
     busy=false;notify();
    },
    modal:{ondismiss(){if(busy&&!/Payment received/.test(message)){busy=false;message='';notify();}}}});
   rzp.on('payment.failed',r=>{busy=false;message='Payment didn’t go through: '+(r?.error?.description||'please try again.');notify();});
   message='';rzp.open();
  }catch(e){busy=false;message=e.status===401?'Please sign in again.':e.message;if(e.status===401){clearLocal();}notify();}
 }
 async function cancelRenewal(){
  if(busy||!confirm('Cancel automatic renewal? Premium stays active until the end of the period you have paid for.'))return;
  busy=true;message='Cancelling renewal…';notify();
  try{await api('/functions/v1/cancel-subscription',{method:'POST',body:{}});await refresh();message='Renewal cancelled. Premium stays active until the end of your paid period.';}
  catch(e){message=e.message;}
  busy=false;notify();
 }

 // ------------------------------------------------------------------ account dialog
 let dialog=null,step='email',after=null,email='',dialogError='';
 function openDialog(next,then=null){
  if(!configured)return;
  step=next||(session?'account':'email');after=then;dialogError='';
  if(!dialog){dialog=document.createElement('dialog');dialog.className='wa-dialog';dialog.setAttribute('aria-labelledby','wa-title');document.body.append(dialog);
   dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();const b=e.target.closest('[data-wa]');if(b)dialogAction(b.dataset.wa);});
   dialog.addEventListener('submit',e=>{e.preventDefault();dialogAction(e.target.dataset.wa);});}
  renderDialog();if(!dialog.open)dialog.showModal();dialog.querySelector('input')?.focus();
 }
 function renderDialog(){
  if(!dialog)return;
  const err=dialogError?`<p class="wa-error" role="alert">${esc(dialogError)}</p>`:'';
  const close='<button type="button" class="wa-close" data-wa="close" aria-label="Close">✕</button>';
  let html='';
  if(step==='email')html=`${close}<h2 id="wa-title">Sign in to CLAT CHAMP</h2><p>We’ll email you a 6-digit code. No password needed.</p><form data-wa="send"><label for="wa-email">Email</label><input id="wa-email" type="email" autocomplete="email" required value="${esc(email)}" ${busy?'disabled':''}>${err}<button class="cs-primary" ${busy?'disabled':''}>${busy?'Sending…':'Email me a code'}</button></form><p class="wa-small">Sign-in and purchases are for a parent or guardian, or learners aged 18 or over. Your practice progress stays in this browser. See our <a href="/terms/">Terms</a> and <a href="/privacy/">Privacy Policy</a>.</p>`;
  if(step==='code')html=`${close}<h2 id="wa-title">Check your email</h2><p>Enter the 6-digit code sent to <b>${esc(email)}</b>.</p><form data-wa="verify"><label for="wa-code">Code</label><input id="wa-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required ${busy?'disabled':''}>${err}<button class="cs-primary" ${busy?'disabled':''}>${busy?'Checking…':'Sign in'}</button></form><button type="button" class="cs-text-button" data-wa="back">Use a different email</button>`;
  if(step==='account'){
   const rows=entitlement?.rows||[],now=active()[0],razor=rows.find(r=>r.source==='razorpay'&&r.current_end&&Date.parse(r.current_end)>Date.now());
   html=`${close}<h2 id="wa-title">Your account</h2><p class="wa-email">${esc(session?.email)}</p>
   ${now?`<div class="pm-active">✓ Premium active · ${esc(plans[now.plan]?.label||'')}</div><p>${now.cancel_at_cycle_end||now.status==='cancelled'?'Ends':'Renews'} on ${date(now.current_end)}.</p>`:'<p>No active Premium subscription on this account.</p>'}
   ${err}${message?`<p class="wa-note" role="status">${esc(message)}</p>`:''}
   ${razor&&!razor.cancel_at_cycle_end&&razor.status!=='cancelled'?`<button type="button" class="cs-text-button" data-wa="cancel" ${busy?'disabled':''}>Cancel automatic renewal</button>`:''}
   <button type="button" class="cs-text-button" data-wa="refresh" ${busy?'disabled':''}>Refresh status</button>
   <button type="button" class="cs-text-button" data-wa="signout" ${busy?'disabled':''}>Sign out</button>
   <p class="wa-small">Signing out keeps practice progress saved in this browser. Questions about billing: <a href="mailto:support@clatchamp.com">support@clatchamp.com</a> · <a href="/refunds/">Cancellation &amp; refunds</a></p>`;
  }
  dialog.innerHTML=html;
 }
 async function dialogAction(a){
  if(a==='close'){dialog.close();return;}
  if(a==='back'){step='email';dialogError='';renderDialog();return;}
  if(a==='send'){
   email=dialog.querySelector('#wa-email').value.trim().toLowerCase();busy=true;dialogError='';renderDialog();
   try{await api('/auth/v1/otp',{method:'POST',signedIn:false,body:{email,create_user:true}});step='code';}
   catch(e){dialogError=e.status===429?'Too many attempts. Please wait a minute and try again.':'Couldn’t send the code: '+e.message;}
   busy=false;renderDialog();dialog.querySelector('input')?.focus();return;
  }
  if(a==='verify'){
   const code=dialog.querySelector('#wa-code').value.trim();busy=true;dialogError='';renderDialog();
   try{
    const d=await api('/auth/v1/verify',{method:'POST',signedIn:false,body:{type:'email',email,token:code}});
    saveSession(d);await refresh().catch(()=>{});busy=false;
    if(hasAccess()){dialog.close();message='Premium is active. Loading all sets…';notify();setTimeout(()=>location.reload(),700);return;}
    const next=after;after=null;step='account';notify();
    if(next==='buy'){dialog.close();checkout();}
   }catch(e){busy=false;dialogError=e.status===400||e.status===403?'That code is incorrect or has expired.':e.message;renderDialog();}
   return;
  }
  if(a==='refresh'){busy=true;message='';renderDialog();try{await refresh();message='Status updated.';}catch(e){dialogError=e.message;}busy=false;notify();return;}
  if(a==='cancel'){cancelRenewal();return;}
  if(a==='signout'){
   const had=hasAccess();api('/auth/v1/logout',{method:'POST'}).catch(()=>{});clearLocal();message='';dialog.close();
   if(had)location.reload();else notify();
  }
 }
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-web-account]');if(b){e.preventDefault();openDialog();}});

 // ------------------------------------------------------------------ CLATPremium interface
 function controls(){
  const priceButtons=Object.keys(plans).reverse().map(p=>`<button class="pm-plan" data-practice="premium-plan" data-product="${productIds[p]}" aria-pressed="${selected===p}" ${busy?'disabled':''}><span>${plans[p].label}<small>${plans[p].note}</small></span><strong>${esc(cfg.prices?.[p])}</strong></button>`).join('');
  if(!configured)return `<div class="pm-plans" role="group" aria-label="Subscription plans">${priceButtons}</div><button class="cs-primary" disabled>Premium subscriptions open shortly</button><p class="pm-billing">We’re finishing secure payments for Premium. Everything free — one full set per subject, Mock 1 and Question of the Day — works now.</p>`;
  if(hasAccess()){const now=active()[0];return `<div class="pm-active">✓ Premium active · All five subjects</div><p class="pm-billing">${now.cancel_at_cycle_end||now.status==='cancelled'?'Ends':'Renews'} on ${date(now.current_end)}.</p><button class="cs-text-button" data-web-account>Manage account</button>`;}
  return `<div class="pm-plans" role="group" aria-label="Subscription plans">${priceButtons}</div>
  <button class="cs-primary" data-practice="premium-buy" ${busy?'disabled':''}>${busy?'Please wait…':`Subscribe · ${esc(cfg.prices?.[selected])} ${plans[selected].per}`}</button>
  <p class="pm-billing">Secure payment by Razorpay (UPI, cards, net banking). Renews automatically until you cancel; cancel any time and keep Premium until the end of the paid period. Web Premium is used in this browser after signing in.</p>
  ${message?`<p class="pm-availability" role="status" aria-live="polite">${esc(message)}</p>`:''}
  <div class="pm-account-actions">${session?`<span class="wa-signed">Signed in as ${esc(session.email)}</span><button class="cs-text-button" data-web-account>Account</button>`:'<button class="cs-text-button" data-web-account>Already subscribed? Sign in</button>'}</div>
  <p class="pm-billing"><a href="/terms/">Terms of Use</a> · <a href="/privacy/">Privacy Policy</a> · <a href="/refunds/">Cancellation &amp; refunds</a></p>`;
 }
 globalThis.CLATPremium={hasAccess,controls,
  status:()=>({hasAccess:hasAccess(),busy,message}),
  subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},
  receive(){},
  action(action,id){
   if(action==='premium-plan'){const p=Object.keys(productIds).find(k=>productIds[k]===id);if(p&&!busy){selected=p;notify();}return;}
   if(action==='premium-buy'){if(!configured)return;checkout();return;}
   if(action==='premium-restore'||action==='premium-manage'){if(!configured){message='Premium subscriptions open shortly.';notify();return;}openDialog(session?'account':'email');return;}
   if(action==='premium-refresh'){refresh().catch(e=>{message=e.message;notify();});}
  }};
 // Settings shows this summary; the full policy lives on the website.
 if(globalThis.CLATInfo)globalThis.CLATInfo.privacy=()=>`<div class="st-policy"><p>The web version keeps your profile and practice progress in this browser. It isn’t uploaded to CLAT CHAMP.</p><p>If you sign in, we store your email address and subscription status with our database provider to provide Premium. Razorpay processes payments; we never receive your card or UPI details.</p><p><a href="/privacy/">Read the full Privacy Policy</a> · <a href="/terms/">Terms</a> · <a href="/refunds/">Cancellation &amp; refunds</a></p></div>`;
 globalThis.CLATWebAccount={configured,hasAccess,refresh,signedIn:()=>!!session,
  contentIndex:()=>api('/rest/v1/content_items?select=id,content_version'),
  content:ids=>api('/rest/v1/content_items?select=id,kind,content_version,payload&id=in.('+ids.map(encodeURIComponent).join(',')+')'),
  daily:day=>api('/functions/v1/daily-set?date='+day,{signedIn:false})};
})();
