/* Approved Precision Assemble intro. Local assets only; no progress/navigation writes. */
(()=>{
 const root=document.getElementById('clat-prototype');
 if(!root)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||root.getAttribute('data-reduce-motion')==='true';
 const intro=document.createElement('section');
 intro.className='cs-launch'+(reduced?' is-still':'');
 intro.setAttribute('role','dialog');intro.setAttribute('aria-modal','true');intro.setAttribute('aria-label','Welcome to CLAT CHAMP');
 const piece=(name,points)=>`<div class="cs-launch-piece cs-launch-${name}"><svg viewBox="205 262 860 725" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="cs-launch-${name}-clip"><polygon points="${points}"/></clipPath></defs><image href="launch-logo.png" width="1254" height="1254" clip-path="url(#cs-launch-${name}-clip)"/></svg></div>`;
 intro.innerHTML=`<div class="cs-launch-lockup"><div class="cs-launch-mark" aria-hidden="true"><div class="cs-launch-bloom"></div>${piece('c','0,0 1254,0 1254,410 870,410 820,470 550,470 550,770 1254,770 1254,1254 0,1254')}${piece('upper','777,559 902,424 1070,424 940,559')}${piece('lower','666,731 797,595 977,595 845,731')}</div><div class="cs-launch-wordmark-mask"><h1 class="cs-launch-brand">CLAT CHAMP</h1></div></div>`;
 const previousFocus=document.activeElement;
 const previousOverflow=document.body.style.overflow;
 root.inert=true;document.body.style.overflow='hidden';document.body.append(intro);
 let closing=false;
 function dismiss(){
  if(closing)return;closing=true;clearTimeout(timer);
  intro.classList.add('is-leaving');
  setTimeout(()=>{intro.remove();root.inert=false;document.body.style.overflow=previousOverflow;if(previousFocus&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});},reduced?0:280);
 }
 const timer=setTimeout(dismiss,reduced?450:2300);
 intro.tabIndex=-1;
 intro.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key==='Escape')e.preventDefault();});
 intro.focus({preventScroll:true});
})();
