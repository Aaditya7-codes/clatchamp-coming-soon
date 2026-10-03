// Account session for the web portal (Supabase Auth over plain fetch). Loads before the app.
// Also completes a Google sign-in: Supabase redirects back with the tokens in the URL fragment.
(() => {
 const cfg=globalThis.CLATWebConfig||{},configured=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey);
 const SESSION='clat-web-session-v1',ENT='clat-web-entitlement-v1';
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const write=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch{}};
 let session=read(SESSION),refreshing=null,returnError='',justSignedIn=false;

 function saveSession(d){
  session=d?{access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Number(d.expires_at)||Math.floor(Date.now()/1000)+(Number(d.expires_in)||3600),
   email:d.user?.email||d.email||session?.email,user_id:d.user?.id||d.user_id||session?.user_id}:null;
  write(SESSION,session);
 }
 function clear(){session=null;write(SESSION,null);write(ENT,null);}

 if(configured&&/[#&](access_token|error)=/.test(location.hash)){
  const p=new URLSearchParams(location.hash.slice(1));
  if(p.get('access_token')){
   try{
    const claims=JSON.parse(atob(p.get('access_token').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    saveSession({access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_at:p.get('expires_at'),expires_in:p.get('expires_in'),email:claims.email,user_id:claims.sub});
    justSignedIn=true;
   }catch{returnError='Google sign-in didn’t complete. Please try again.';}
  }else returnError=p.get('error_description')?.replace(/\+/g,' ')||'Google sign-in didn’t complete. Please try again.';
  history.replaceState(null,'',location.pathname+location.search);
 }

 async function token(){
  if(!session)return null;
  if(session.expires_at-60>Date.now()/1000)return session.access_token;
  refreshing||=fetch(cfg.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})})
   .then(async r=>{const d=await r.json().catch(()=>null);if(r.ok&&d?.access_token)saveSession(d);else if(r.status>=400&&r.status<500)clear();})
   .finally(()=>{refreshing=null;});
  await refreshing.catch(()=>{});
  return session&&session.expires_at-60>Date.now()/1000?session.access_token:null;
 }
 async function api(path,{method='GET',body,signedIn=true,headers={},keepalive=false}={}){
  const bearer=signedIn?await token():cfg.supabaseAnonKey;
  if(signedIn&&!bearer){const e=new Error('Please sign in again.');e.status=401;throw e;}
  const r=await fetch(cfg.supabaseUrl+path,{method,keepalive,headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+bearer,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
  if(!r.ok){const e=new Error(data?.error||data?.msg||data?.error_description||data?.message||`Request failed (${r.status})`);e.status=r.status;e.code=data?.code;throw e;}
  return data;
 }
 const googleUrl=()=>cfg.supabaseUrl+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(location.origin+location.pathname);

 // Google sign-in with Google's own button: Google returns a signed ID token in the page, which is
 // exchanged for a session through api.clatchamp.com, so the browser never visits supabase.co.
 // Google gets the SHA-256 of a one-time nonce, Supabase gets the nonce itself and checks they match.
 let gsiLoading=null,rawNonce='';
 function loadGoogle(){
  if(!cfg.googleClientId)return Promise.reject(new Error('Google sign-in isn’t set up.'));
  if(globalThis.google?.accounts?.id)return Promise.resolve();
  return gsiLoading||=new Promise((ok,fail)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
   s.onload=()=>ok();s.onerror=()=>{gsiLoading=null;fail(new Error('Couldn’t load Google sign-in. Check your connection and try again.'));};document.head.append(s);});
 }
 async function renderGoogle(el,onDone){
  await loadGoogle();
  const bytes=crypto.getRandomValues(new Uint8Array(32));rawNonce=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rawNonce));
  const hashed=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  google.accounts.id.initialize({client_id:cfg.googleClientId,nonce:hashed,use_fedcm_for_button:true,
   callback:async r=>{try{onDone(null,await api('/auth/v1/token?grant_type=id_token',{method:'POST',signedIn:false,body:{provider:'google',id_token:r.credential,nonce:rawNonce}}));}catch(e){onDone(e);}}});
  el.textContent='';
  google.accounts.id.renderButton(el,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'pill',logo_alignment:'left',width:Math.min(el.clientWidth||320,400)});
 }

 globalThis.CLATWebAuth={configured,api,token,saveSession,clear,googleUrl,renderGoogle,google:!!cfg.googleClientId,
  session:()=>session,signedIn:()=>!!session,userId:()=>session?.user_id||null,email:()=>session?.email||'',
  returnError:()=>returnError,justSignedIn:()=>justSignedIn};
})();
