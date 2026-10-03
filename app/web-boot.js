// Loaded by web-sync.js after the other modules, before the app starts. It swaps stubs for real
// content (cached, Premium or today's free daily set), then starts the app scripts.
// Content only ever grows on a device, so saved progress is never pruned.
(async () => {
 globalThis.CLATAppInfo={version:'1.0',build:'web'};
 const account=globalThis.CLATWebAccount,sets=globalThis.CLATPracticeSets,papers=globalThis.CLATMocksData.papers;
 const screen=document.getElementById('cs-screen');
 const status=text=>{screen.innerHTML=`<p class="web-loading" role="status">${text}</p>`;};
 status('Loading…');

 // ---------------------------------------------------------------- local content cache
 const idb=new Promise((ok,no)=>{try{const r=indexedDB.open('clat-champ-web',1);r.onupgradeneeded=()=>r.result.createObjectStore('content',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);}catch(e){no(e);}});
 const tx=(mode,fn)=>idb.then(db=>new Promise((ok,no)=>{const t=db.transaction('content',mode),s=t.objectStore('content'),out=fn(s);t.oncomplete=()=>ok(out?.result);t.onerror=()=>no(t.error);}));
 const cacheAll=()=>tx('readonly',s=>s.getAll()).catch(()=>[]);
 const cachePut=items=>tx('readwrite',s=>{items.forEach(i=>s.put(i));}).catch(e=>console.warn('Content cache unavailable',e));

 const stubs=new Map();
 sets.forEach((s,i)=>{if(s.stub)stubs.set(s.id,{kind:'set',i,v:`${s.contentVersion}.${s.keyVersion}`});});
 papers.forEach((p,i)=>{if(p.stub)stubs.set(p.id,{kind:'mock',i,v:p.contentVersion});});
 function apply(item){
  const st=stubs.get(item?.id);
  if(!st||item.content_version!==st.v||!item.payload)return false;
  if(st.kind==='set')sets[st.i]=item.payload;else papers[st.i]=item.payload;
  stubs.delete(item.id);return true;
 }
 (await cacheAll()).forEach(apply);

 // ---------------------------------------------------------------- network
 const DAILY='clat-web-daily-v1';
 const today=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const timeout=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),ms))]);
 let daily=null;try{daily=JSON.parse(localStorage.getItem(DAILY)||'null');}catch{}
 if(account?.configured&&navigator.onLine!==false){
  try{
   await timeout(account.refresh(),8000).catch(()=>{});
   if(account.hasAccess()){
    navigator.storage?.persist?.().catch(()=>{});
    const index=await timeout(account.contentIndex(),10000);
    const need=index.filter(x=>stubs.get(x.id)?.v===x.content_version).map(x=>x.id);
    for(let i=0;i<need.length;i+=20){
     status(`Downloading Premium sets… ${Math.round(i/need.length*100)}%`);
     const items=await account.content(need.slice(i,i+20));
     await cachePut(items);items.forEach(apply);
    }
   }else if(daily?.date!==today()){
    const item=await timeout(account.daily(today()),8000);
    if(item?.id){await cachePut([item]);apply(item);daily={date:today(),id:item.id};try{localStorage.setItem(DAILY,JSON.stringify(daily));}catch{}}
   }
  }catch(e){console.warn('Online content unavailable; continuing with saved content.',e);}
 }

 // Free learners: Question of the Day uses the server's set for today when this device has it.
 globalThis.CLATWebDaily={pick(stamp,all){
  if(account?.hasAccess()||daily?.date!==stamp)return undefined;
  return all.find(s=>s.id===daily.id&&!s.stub);
 }};

 // ---------------------------------------------------------------- start the app
 screen.innerHTML='';
 for(const src of ['web-home.js','app-main.js','web-nav.js'])await new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error(src));document.body.append(s);});
 globalThis.lucide?.createIcons({attrs:{width:20,height:20}});

 // On laptops the passage and mock navigator are permanent panels, so keep them open.
 const wide=matchMedia('(min-width:1024px)');
 const openPanels=()=>{if(!wide.matches)return;
  for(const d of screen.querySelectorAll(':scope>details:has(>.cs-reading),.mock-screen>.mock-passage,.mock-screen>.mock-navigator'))if(!d.open)d.open=true;};
 new MutationObserver(openPanels).observe(screen,{childList:true,subtree:true});
 wide.addEventListener?.('change',openPanels);openPanels();
 dispatchEvent(new Event('clat-web-ready'));
})().catch(e=>{console.error(e);const s=document.getElementById('cs-screen');if(s)s.innerHTML='<p class="web-loading">CLAT CHAMP couldn’t start. Please reload the page.</p>';});
