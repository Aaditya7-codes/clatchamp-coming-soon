// Transparent local recommendations. Grants persist; retries never replace first-attempt evidence.
globalThis.createCLATPersonalisation = function(sets, ordered, history) {
 const key='clat-speed-personalisation-v1', map=globalThis.CLATSkillMap;
 const byId=new Map(sets.map(s=>[s.id,s])), sections=[...new Set(sets.map(s=>s.section))];
 let state={version:1,grants:[],seen:[],evidence:[],reasons:{}};
 try {
  const x=JSON.parse(localStorage.getItem(key)||'null');
  if(x?.version===1&&Array.isArray(x.grants)&&Array.isArray(x.seen)&&Array.isArray(x.evidence)&&x.reasons&&typeof x.reasons==='object')state=x;
 } catch{}
 state.grants=[...new Set(state.grants.filter(id=>byId.has(id)))];
 state.seen=[...new Set([...state.seen.filter(id=>byId.has(id)),...Object.keys(history).filter(id=>byId.has(id))])];
 const evidenceIds=new Set();
 state.evidence=state.evidence.filter(e=>{
  if(!e||typeof e!=='object')return false;
  const s=byId.get(e.setId),m=map.sets[e.setId];
  if(!s||!m||e.version!==m.version||(e.skillVersion??e.version)!==(m.evidenceVersion??m.version)||!state.seen.includes(e.setId)||evidenceIds.has(e.setId)||!Array.isArray(e.correct)||e.correct.length!==s.questions.length||!e.correct.every(v=>v===null||typeof v==='boolean'))return false;
  evidenceIds.add(e.setId);return true;
 });
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(state));return true;}catch{return false;}};
 const available=section=>state.grants.map(id=>byId.get(id)).filter(s=>s.section===section&&!state.seen.includes(s.id));
 const remaining=section=>ordered(section).filter(s=>!state.grants.includes(s.id)&&!state.seen.includes(s.id));
 // Migration/recovery preserves existing grants and fills only genuinely empty places.
 for(const section of sections){const need=Math.max(0,5-available(section).length);state.grants.push(...remaining(section).slice(0,need).map(s=>s.id));}
 save();
 const band=s=>/moderate.*challeng/i.test(s.difficulty||'')?2:/challeng/i.test(s.difficulty||'')?3:/accessible/i.test(s.difficulty||'')?0:/moderate/i.test(s.difficulty||'')?1:0;
 const progression=map.progression?.version===1?map.progression.sets:{};
 const profile=s=>progression?.[s.id];
 function readingReady(candidates,recentSets){
  const ready=candidates.filter(s=>{
   const p=profile(s);if(!p||!['passage','critical'].includes(p.mode))return true;
   let completed=recentSets.filter(x=>profile(x)?.mode===p.mode);
   // With no same-form evidence, use the established starter reading load.
   if(!completed.length)completed=ordered(s.section).slice(0,5).filter(x=>profile(x)?.mode===p.mode);
   const ceiling=Math.max(0,...completed.slice(-3).map(x=>profile(x).load))+1;
   return p.load<=ceiling;
  });
  return ready;
 }
 function varietyCost(s,section,recentSets){
  const p=profile(s);if(!p)return 0;
  const recent=recentSets.slice(-2),open=available(section);
  // Space the offered queue as well as recent work. Draw down abundant families
  // gradually so saving them all for the end does not create a repetitive tail.
  const tail=open.at(-1)||recent.at(-1);
  return (profile(tail||{})?.family===p.family?100:0)
   +recent.reduce((n,x,i)=>n+(profile(x)?.family===p.family?(i===recent.length-1?4:2):0),0)
   +open.filter(x=>profile(x)?.family===p.family).length*2
   -([...state.grants,...state.seen].some(id=>profile(byId.get(id))?.family===p.family)?0:24)
   -remaining(section).filter(x=>band(x)===band(s)&&profile(x)?.family===p.family).length*3
   +(section==='Logical Reasoning'&&profile(tail||{})?.mode===p.mode?4:0);
 }
 function weaknesses(section){
  const recent=state.evidence.filter(e=>byId.get(e.setId).section===section).slice(-8);
  if(recent.length<3)return [];
  const stats={};
  for(const e of recent){
   map.sets[e.setId].skills.forEach((skill,i)=>{
    if(e.correct[i]===null)return; // Unanswered is not evidence of a chosen misconception.
    const x=stats[skill]||(stats[skill]={skill,total:0,wrong:0,sets:new Set(),missedSets:new Set()});
    x.total++;x.sets.add(e.setId);if(!e.correct[i]){x.wrong++;x.missedSets.add(e.setId);}
   });
  }
  return Object.values(stats).filter(x=>x.total>=4&&x.sets.size>=2&&x.wrong>=3&&x.missedSets.size>=2&&1-x.wrong/x.total<.7)
   .sort((a,b)=>b.wrong/b.total-a.wrong/a.total||b.wrong-a.wrong||a.skill.localeCompare(b.skill));
 }
 function choose(section){
  const candidates=remaining(section),recent=state.evidence.filter(e=>byId.get(e.setId).section===section).slice(-8);
  if(!candidates.length)return null;
  const recentSets=recent.map(e=>byId.get(e.setId));
  const rankVariety=(a,b)=>varietyCost(a,section,recentSets)-varietyCost(b,section,recentSets);
  // One in three replenishments favours breadth; the first two retain v1 order.
  if(recent.length>=3&&state.evidence.filter(e=>byId.get(e.setId).section===section).length%3!==0){
   const ceiling=Math.max(...recentSets.slice(-3).map(band));
   for(const gap of weaknesses(section)){
    const matching=readingReady(candidates.filter(s=>band(s)<=ceiling&&(s.section!=='Current Affairs & GK'||s.newsWindow)&&map.sets[s.id]?.skills.filter(x=>x===gap.skill).length>=2),recentSets);
    if(matching.length){
     matching.sort((a,b)=>rankVariety(a,b)||map.sets[b.id].skills.filter(x=>x===gap.skill).length/b.questions.length-map.sets[a.id].skills.filter(x=>x===gap.skill).length/a.questions.length);
     return {set:matching[0],skill:gap.skill};
    }
   }
  }
  if(recent.length>=3&&candidates.every(s=>profile(s))){
   // Take the lowest remaining editorial band before advancing; scores never gate access.
   const lowest=Math.min(...candidates.map(band));
   const level=candidates.filter(s=>band(s)===lowest);
   const ready=readingReady(level,recentSets);
   // At exhaustion of bridge material, allow the least demanding remaining load.
   const pool=ready.length?ready:level.filter(s=>profile(s).load===Math.min(...level.map(x=>profile(x).load)));
   pool.sort(rankVariety);
   return {set:pool[0],skill:null};
  }
  return {set:candidates[0],skill:null};
 }
 return {
  available,persist:save,
  reason(id){const skill=state.reasons[id];return typeof skill==='string'&&map.labels[skill]?`Recommended to practise: ${map.labels[skill]}.`:'';},
  complete(set,answers){
   if(state.seen.includes(set.id)||!available(set.section).some(s=>s.id===set.id))return null;
   if(!Array.isArray(answers)||answers.length!==set.questions.length||!answers.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<4))return null;
   state.seen.push(set.id);
   const m=map.sets[set.id];
   if(m&&m.skills.length===set.questions.length)state.evidence.push({setId:set.id,version:m.version,skillVersion:m.evidenceVersion??m.version,correct:answers.map((a,i)=>a===null?null:a===set.questions[i].correct)});
   const pick=choose(set.section);
   if(pick){state.grants.push(pick.set.id);if(pick.skill)state.reasons[pick.set.id]=pick.skill;}
   save();return pick?.set||null;
  },
  weaknesses
 };
};
