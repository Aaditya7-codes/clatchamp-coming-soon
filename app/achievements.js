// Badges recognise recorded practice milestones, not calibrated mastery.
globalThis.CLATAchievements=(()=>{
 const key='clat-speed-achievements-v1';let earned={},stats={sets:0,questions:0,perfect:0,subjects:{}},selected=null;
 const subjects=[['English Language','English explorer','book-open'],['Current Affairs & GK','News explorer','globe'],['Legal Reasoning','Legal explorer','scale'],['Logical Reasoning','Logic explorer','brain'],['Quantitative Techniques','Number explorer','calculator']];
 const badges=[
  {id:'first-lap',name:'First Lap',icon:'flag',goal:1,rule:'Complete all five questions in the onboarding reading-speed check.',value:()=>earned['first-lap']?1:0},
  {id:'first',name:'First step',icon:'footprints',goal:1,rule:'Complete your first subject practice set.',value:s=>s.sets},
  ...subjects.map(([section,name,icon],i)=>({id:'subject-'+i,name,icon,goal:5,rule:`Complete 5 different ${section} sets.`,value:s=>s.subjects[section]||0})),
  {id:'breadth',name:'All-rounder',icon:'compass',goal:25,rule:'Complete at least 5 different sets in each of the five subjects. Reattempts do not count.',value:s=>subjects.reduce((n,[x])=>n+Math.min(5,s.subjects[x]||0),0)},
  {id:'ten',name:'Building momentum',icon:'layers',goal:10,rule:'Complete 10 different subject practice sets.',value:s=>s.sets},
  {id:'twenty-five',name:'Going deeper',icon:'telescope',goal:25,rule:'Complete 25 different subject practice sets.',value:s=>s.sets},
  {id:'fifty',name:'Dedicated learner',icon:'graduation-cap',goal:50,rule:'Complete 50 different subject practice sets.',value:s=>s.sets},
  {id:'hundred',name:'Century',icon:'flag',goal:100,rule:'Answer 100 questions across different completed subject sets. Repeats do not add to this total.',value:s=>s.questions},
  {id:'perfect-one',name:'Perfect Set',icon:'target',goal:1,rule:'Score full marks on your first completed attempt at a subject set or the onboarding reading-speed check. Reattempts do not count.',value:s=>s.perfect},
 ];
 try{const x=JSON.parse(localStorage.getItem(key)||'null');if(x&&x.version===1&&x.earned&&typeof x.earned==='object')for(const b of badges)if(x.earned[b.id]===true)earned[b.id]=true;}catch{}
 // Persist first-result evidence so a later retry cannot create a new award.
 let firstResults={},onboardingFirst=null;
 try{const x=JSON.parse(localStorage.getItem(key)||'null');
  if(x?.firstResults&&typeof x.firstResults==='object'&&!Array.isArray(x.firstResults))for(const [id,r] of Object.entries(x.firstResults))if(r&&typeof r.section==='string'&&Number.isInteger(r.total)&&r.total>0&&(r.correct===null||Number.isInteger(r.correct)&&r.correct>=0&&r.correct<=r.total))firstResults[id]=r;
  if(typeof x?.onboardingFirst==='boolean')onboardingFirst=x.onboardingFirst;
 }catch{}
 let saved=true;
 function awardOnboarding(){
  // Recover awards from submitted evidence, including results saved before this update.
  try{
   const x=JSON.parse(localStorage.getItem('clat-speed-onboarding-v1')||'null'),starter=globalThis.CLATOnboardingStarter;
   if(starter?.questions.length===5&&x?.version===2&&x.contentVersion===starter.version&&['results','review','summary','profile'].includes(x.phase)&&Array.isArray(x.answers)&&x.answers.length===5&&x.answers.every(v=>Number.isInteger(v)&&v>=0&&v<4)){
    earned['first-lap']=true;
    if(onboardingFirst===null)onboardingFirst=starter.questions.every((q,i)=>x.answers[i]===q.correct);
    if(onboardingFirst)earned['perfect-one']=true;
   }
  }catch{}
  try{localStorage.setItem(key,JSON.stringify({version:1,earned,firstResults,onboardingFirst}));saved=true;}catch{saved=false;}
  return saved;
 }
 function sync(sets){
  const unique=[...new Map(sets.map(s=>[s.id,s])).values()];
  for(const s of unique)if(!Object.prototype.hasOwnProperty.call(firstResults,s.id))firstResults[s.id]={section:s.section,total:s.total,correct:s.correct};
  stats={sets:unique.length,questions:unique.reduce((n,s)=>n+s.total,0),perfect:0,subjects:{}};
  for(const s of unique){stats.subjects[s.section]=(stats.subjects[s.section]||0)+1;const first=firstResults[s.id];if(first.correct===first.total)stats.perfect++;}
  for(const b of badges)if(b.value(stats)>=b.goal)earned[b.id]=true;
  awardOnboarding();
 }
 const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
 function render(){const chosen=badges.find(b=>b.id===selected),count=badges.filter(b=>earned[b.id]).length;return `<section class="ac-section" aria-label="Achievements"><div class="ac-heading"><h2>Achievements</h2><span>${count}/${badges.length}</span></div><p class="ac-caption">Milestones from your practice. Tap a badge to explore.</p><div class="ac-grid">${badges.map(b=>`<button class="ac-badge ${earned[b.id]?'is-earned':'is-locked'}" data-action="achievement-detail" data-badge="${b.id}" aria-pressed="${b.id===selected}" aria-label="${b.name}. ${earned[b.id]?'Earned':'Locked. '+Math.min(b.goal,b.value(stats))+' of '+b.goal}"><span class="ac-medal">${icon(b.icon)}<span class="ac-lock">${icon(earned[b.id]?'check':'lock-keyhole')}</span></span><span class="ac-name">${b.name}</span></button>`).join('')}</div>${chosen?`<div class="ac-detail" role="status"><div><span class="cs-kicker">${earned[chosen.id]?'Badge earned':'Working towards'}</span><button data-action="achievement-detail" data-badge="" aria-label="Close badge details">${icon('x')}</button></div><h3>${chosen.name}</h3><p>${chosen.rule}</p>${earned[chosen.id]?'<span class="ac-earned-note">Earned badges stay in your collection.</span>':`<div class="ac-progress" role="progressbar" aria-label="${chosen.name}" aria-valuemin="0" aria-valuemax="${chosen.goal}" aria-valuenow="${Math.min(chosen.goal,chosen.value(stats))}"><span style="width:${Math.min(100,chosen.value(stats)/chosen.goal*100)}%"></span></div><small>${Math.min(chosen.goal,chosen.value(stats))} / ${chosen.goal}</small>`}</div>`:''}${saved?'':'<p class="ac-footnote" role="status">Badge changes could not be saved; keep this session open and try again.</p>'}</section>`;}
 return {sync,render,awardOnboarding,select(id){selected=badges.some(b=>b.id===id)?id:null;},snapshot:()=>({earned:{...earned},stats:JSON.parse(JSON.stringify(stats))})};
})();
