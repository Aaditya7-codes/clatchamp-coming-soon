// Marks are separate from answer accuracy. Older completed records retain their raw counts.
// Arm only at completion; opening saved results never starts a celebration.
globalThis.CLATFullMarks=(()=>{
 const seen=new Set();let pending=false;
 return {
  complete(id,correct,total){if(!id||seen.has(id))return;seen.add(id);pending=Number.isInteger(total)&&total>0&&correct===total;},
  render(correct,total,unanswered){const perfect=total>0&&correct===total&&unanswered===0,play=perfect&&pending;pending=false;
   return perfect?`<div class="cs-perfect${play?' cs-perfect-play':''}" ${play?'role="status"':'aria-label="Full marks"'}><span class="cs-perfect-medal" aria-hidden="true">★</span><div><b>Full marks!</b><small>Every answer correct. Beautifully done.</small></div></div>`:'';
  }
 };
})();
globalThis.CLATScoring=Object.freeze({
 unanswered(answers){return answers.filter(v=>v===null).length;},
 // The learning flow is the same for every subject, independent of old editorial tags.
 reading(set){return Array.isArray(set.paragraphs)&&set.paragraphs.some(p=>p.trim());},
 readingNote(set){return set.diagram||set.section==='Quantitative Techniques'?'Text-based estimate; reading time may include studying charts or data.':'Question time is excluded';},
 // Product-quality guard, not a claim about a human reading-speed limit.
 measurement(set,seconds){const wpm=this.speed(set,seconds);return {wpm,readSeconds:seconds,wordCount:set.paragraphs.join(' ').trim().split(/\s+/).length,speedStatus:seconds<=0?'missing':seconds<3||wpm>1000?'unreliable':'valid'};},
 usableSpeed(a){return Number.isFinite(a.wpm)&&a.wpm>0&&a.wpm<=1000&&a.speedStatus!=='unreliable'&&(!Number.isFinite(a.readSeconds)||a.readSeconds>=3);},
 results(correct,set,answers,seconds,readSeconds){
  const n=set.questions.length,measurement=this.measurement(set,readSeconds),speed=this.usableSpeed(measurement)?measurement.wpm:null;
  return '<div class="cs-result">'+this.card(correct,n,this.unanswered(answers))+
   '<div class="cs-stat"><span>Accuracy</span><strong>'+Math.round(correct/n*100)+'%</strong><span>'+correct+' of '+n+' correct</span></div>'+
   '<div class="cs-stat"><span>Total time</span><strong style="font-size:24px">'+Math.floor(seconds/60)+'m '+Math.floor(seconds%60)+'s</strong><span>Reading + answers</span></div>'+
   '<div class="cs-stat" style="grid-column:1/-1"><span>First reading</span><strong>'+(speed===null?'—':speed.toLocaleString())+' <span>WPM</span></strong><span>'+(measurement.speedStatus==='unreliable'?'Reading too brief for a reliable estimate. Excluded from speed tracking.':speed===null?'No timed first reading saved':this.readingNote(set))+'</span></div></div>';
 },
 speed(set,seconds){return seconds>=1?Math.round(set.paragraphs.join(' ').trim().split(/\s+/).length*60/seconds):null;},
 marks(correct,total,unanswered=0){return correct-(total-correct-unanswered)*0.25;},
 card(correct,total,unanswered=0){const marks=this.marks(correct,total,unanswered);return `<div class="cs-stat cs-marks">${globalThis.CLATFullMarks.render(correct,total,unanswered)}<span>Score</span><strong>${marks} <span>/ ${total}</span></strong><span>+1 correct · −0.25 wrong · 0 unanswered</span><span>${correct} correct · ${total-correct-unanswered} wrong · ${unanswered} unanswered</span></div>`;}
});
