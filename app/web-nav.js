// Browser history for the portal. The portal is one page, so without this Chrome's Back button
// skips everything the learner did inside it and leaves for the previous website. Each screen gets
// a short address (#/practice, #/practice/set/…, #/mocks …), so Back, Forward, refresh and
// bookmarks work. app-main.js exposes CLATWebRoute (current screen, and a way to open one).
(() => {
 const R=globalThis.CLATWebRoute,screen=document.getElementById('cs-screen');
 if(!R||!screen)return;
 const url=r=>location.pathname+location.search+'#/'+r;
 const wanted=()=>/^#\/[\w.\-\/]+$/.test(location.hash)?location.hash.slice(2):'';
 let last=null,queued=false;

 // A new screen after the learner's own action adds a history entry; the first screen replaces the
 // entry the page loaded with, so Back from the dashboard leaves the portal as normal.
 function sync(){
  queued=false;
  const r=R.current();
  if(r===last)return;
  const first=last===null;
  last=r;
  history[first?'replaceState':'pushState']({r},'',url(r));
 }
 new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(sync);}}).observe(screen,{childList:true});

 // Back, Forward, a bookmark or a typed address: open that screen. Leaving a set pauses it and keeps
 // the learner's place, exactly as the left menu does.
 function open(r){
  if(r&&r!==R.current())R.go(r);
  last=R.current();
  if(last!==r)history.replaceState({r:last},'',url(last));
 }
 addEventListener('popstate',()=>open(wanted()||'home'));

 const start=wanted();
 if(start&&start!==R.current())open(start);
 else{last=null;sync();}
})();
