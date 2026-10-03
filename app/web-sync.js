// Saves learner progress to the account and merges it into this browser before the app starts.
// App modules read their localStorage stores once at load, so merging happens only here, before
// they load. Afterwards every write is pushed; a push that finds a newer account copy (another
// computer or tab) is held back and the learner is asked to reload, which merges both copies.
(() => {
 const auth=globalThis.CLATWebAuth,cfg=globalThis.CLATWebConfig||{};
 const META='clat-web-sync-v1',tracked=k=>typeof k==='string'&&/^clat-(speed|champ)-[a-z0-9-]+$/.test(k);
 const proto=Storage.prototype,setItem=proto.setItem,removeItem=proto.removeItem,getItem=proto.getItem;
 let ls=null;try{ls=localStorage;}catch{}
 const get=k=>{try{return getItem.call(ls,k);}catch{return null;}};
 const put=(k,v)=>{try{v==null?removeItem.call(ls,k):setItem.call(ls,k,v);return true;}catch{return false;}};
 const keys=()=>{const out=[];try{for(let i=0;i<ls.length;i++)out.push(ls.key(i));}catch{}return out.filter(tracked);};
 const hash=s=>{if(s==null)return null;let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677);}
  a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return(b>>>0).toString(36)+(a>>>0).toString(36)+':'+s.length;};

 const on=()=>!!(auth?.configured&&auth.signedIn());
 const loadMeta=()=>{let m=null;try{m=JSON.parse(get(META)||'null');}catch{}return m&&m.user===auth?.userId?.()?m:{user:auth?.userId?.()||null,base:{},rev:{}};};
 let meta=loadMeta();
 const saveMeta=()=>put(META,JSON.stringify(meta));
 const dirty=new Set(),stale=new Set(),listeners=new Set();
 let state=on()?'syncing':'local',timer=null,flushing=null;
 const emit=()=>listeners.forEach(f=>{try{f();}catch(e){console.warn(e);}});
 const settle=()=>{if(!on())state='local';else if(stale.size)state='stale';else if(state!=='offline')state=dirty.size?'pending':'synced';emit();};

 // ---------------------------------------------------------------- merging (boot only)
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const when=x=>plain(x)?(Number.isFinite(x.finished)?x.finished:typeof x.date==='string'?Date.parse(x.date)||0:null):null;
 function union(remote,local){
  const id=x=>plain(x)?(x.id??x.setId??JSON.stringify(x)):JSON.stringify(x),seen=new Set(),out=[];
  for(const x of [...remote,...local]){const k=id(x);if(!seen.has(k)){seen.add(k);out.push(x);}}
  return out.some(x=>when(x)!==null)?out.map((x,i)=>[x,i]).sort((p,q)=>((when(p[0])??-1)-(when(q[0])??-1))||p[1]-q[1]).map(p=>p[0]):out;
 }
 const RECORDS=new Set(['clat-speed-practice-v1','clat-speed-completions-v1','clat-speed-practice-pending-v1']);
 function mergeValues(key,L,R){
  if(L==null)return R;if(R==null)return L;
  if(key==='clat-speed-onboarding-v1')return L.complete||!R.complete?L:R;
  if(key==='clat-speed-settings-v1')return L;
  if(Array.isArray(L)&&Array.isArray(R))return union(R,L);
  if(!plain(L)||!plain(R))return L;
  if(RECORDS.has(key))return {...R,...L};
  const out={...R,...L};
  for(const k of Object.keys(L))if(k in R&&k!=='session'){
   if(Array.isArray(L[k])&&Array.isArray(R[k]))out[k]=union(R[k],L[k]);
   else if(plain(L[k])&&plain(R[k]))out[k]={...R[k],...L[k]};
  }
  return out;
 }
 function merge(key,L,R){
  let l,r;try{l=L==null?null:JSON.parse(L);r=R==null?null:JSON.parse(R);}catch{return L??R;}
  const m=mergeValues(key,l,r);return m===l?L:m===r?R:JSON.stringify(m);
 }
 // Three-way: base is the hash of the value both sides agreed on at the last sync.
 function reconcile(k,row){
  const L=get(k),R=row?row.value:null,B=meta.base[k],lh=hash(L),rh=hash(R);
  if(row)meta.rev[k]=row.rev;else delete meta.rev[k];
  if(L===R){if(L==null)delete meta.base[k];else meta.base[k]=lh;return false;}
  if(lh===B||(L==null&&B==null)){put(k,R);if(R==null)delete meta.base[k];else meta.base[k]=rh;return false;}
  if(rh===B||(R==null&&B==null))return true;
  const M=merge(k,L,R);if(M!==L)put(k,M);if(R==null)delete meta.base[k];else meta.base[k]=rh;return M!==R;
 }
 async function pull(){
  const rows=await auth.api('/rest/v1/learner_state?select=key,value,rev');
  const byKey=new Map((rows||[]).map(r=>[r.key,r]));
  for(const k of new Set([...byKey.keys(),...keys(),...Object.keys(meta.base)]))if(tracked(k)&&reconcile(k,byKey.get(k)))dirty.add(k);
  saveMeta();
 }

 // ---------------------------------------------------------------- pushing
 const enc=encodeURIComponent,rep={Prefer:'return=representation'};
 function done(k,value,rev){if(value==null){delete meta.base[k];delete meta.rev[k];}else{meta.base[k]=hash(value);meta.rev[k]=rev;}saveMeta();if(get(k)===value)dirty.delete(k);}
 async function push(k,keepalive){
  meta=loadMeta();
  const value=get(k),rev=meta.rev[k],where=`/rest/v1/learner_state?key=eq.${enc(k)}&rev=eq.${rev}`;
  if(hash(value)===meta.base[k]&&(value==null||rev!=null)){dirty.delete(k);return;}
  let rows;
  if(rev==null){
   if(value==null){done(k,null,null);return;}
   try{rows=await auth.api('/rest/v1/learner_state',{method:'POST',body:{user_id:auth.userId(),key:k,value},headers:rep,keepalive});}
   catch(e){if(e.status===409){stale.add(k);dirty.delete(k);return;}throw e;}
  }else rows=await auth.api(where,value==null?{method:'DELETE',headers:rep,keepalive}:{method:'PATCH',body:{value},headers:rep,keepalive});
  if(rows?.length)done(k,value,value==null?null:rows[0].rev);else{stale.add(k);dirty.delete(k);}
 }
 function flush(keepalive=false){
  if(!on())return Promise.resolve(true);
  clearTimeout(timer);timer=null;
  if(flushing)return flushing.then(()=>flush(keepalive));
  flushing=(async()=>{
   let failed=false;
   for(const k of [...dirty]){try{await push(k,keepalive);}catch{failed=true;break;}}
   state=failed?'offline':'pending';
  })().finally(()=>{flushing=null;settle();if(state==='offline')retry();});
  return flushing.then(()=>!dirty.size&&!stale.size);
 }
 let retryTimer=null;const retry=()=>{clearTimeout(retryTimer);retryTimer=setTimeout(flush,30000);};
 function touch(k){if(!on()||state==='syncing')return;dirty.add(k);if(state!=='offline')state='pending';emit();clearTimeout(timer);timer=setTimeout(flush,1500);}
 proto.setItem=function(k,v){setItem.call(this,k,v);if(this===ls&&tracked(k))touch(k);};
 proto.removeItem=function(k){removeItem.call(this,k);if(this===ls&&tracked(k))touch(k);};
 addEventListener('online',()=>{if(dirty.size)flush();});
 addEventListener('pagehide',()=>{if(dirty.size)flush(true);});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty.size)flush(true);});

 // Remove the account's progress from this browser (sign-out on a shared computer, account deletion).
 function forget(){for(const k of keys())put(k,null);put(META,null);put('clat-web-daily-v1',null);dirty.clear();stale.clear();meta={user:null,base:{},rev:{}};}

 const noteText={local:'Saved in this browser only',syncing:'Saving to your account…',pending:'Saving to your account…',synced:'Saved to your account',offline:'Offline · will save to your account when you reconnect',stale:'Updated on another computer · reload to combine'};
 globalThis.CLATWebSync={
  status:()=>({state,pending:dirty.size,stale:stale.size}),
  subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},
  flush,forget,
  text:()=>noteText[state]||noteText.local,
  note(icon){
   const i=typeof icon==='function'?icon(state==='local'?'layers':'cloud'):'';
   if(state==='local'&&auth?.configured)return `<p class="dash-bank-note">${i}<span>Saved in this browser only · <button type="button" class="wa-inline" data-web-account>Create a free account</button> to keep it on any computer</span></p>`;
   if(state==='stale')return `<p class="dash-bank-note">${i}<span>Your progress changed on another computer · <button type="button" class="wa-inline" data-web-reload>Reload to combine</button></span></p>`;
   return `<p class="dash-bank-note" data-web-sync-note>${i}<span>${noteText[state]}</span></p>`;
  }};
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-web-reload]'))location.reload();});
 listeners.add(()=>{for(const n of document.querySelectorAll('[data-web-sync-note]>span,[data-web-sync-text]'))n.textContent=noteText[state];});

 // ---------------------------------------------------------------- start: merge, then load the app
 (async()=>{
  const screen=document.getElementById('cs-screen');
  // Start downloading the app's scripts now, while the saved progress is fetched, instead of after it.
  for(const src of [...(cfg.appScripts||[]),'web-home.js','app-main.js','web-nav.js']){const l=document.createElement('link');l.rel='preload';l.as='script';l.href=src;document.head.append(l);}
  if(on()){
   
   try{await Promise.race([pull(),new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),10000))]);state='synced';}
   catch(e){
    if(e.status===401)auth.clear();
    else{state='offline';for(const k of keys())if(hash(get(k))!==meta.base[k])dirty.add(k);}
   }
   settle();
  }
  if(auth?.configured&&!on()&&globalThis.CLATWebSignup){if(screen)screen.innerHTML='';await globalThis.CLATWebSignup.gate();}
  for(const src of cfg.appScripts||[])await new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error(src));document.body.append(s);});
  if(dirty.size)flush();
 })().catch(e=>{document.getElementById('web-boot-hide')?.remove();console.error(e);const s=document.getElementById('cs-screen');if(s)s.innerHTML='<p class="web-loading">CLAT CHAMP couldn’t start. Please reload the page.</p>';});
})();
