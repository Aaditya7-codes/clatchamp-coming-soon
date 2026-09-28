// Completion dates use the learner's local calendar, not a rolling 24-hour window.
globalThis.CLATWorkoutRewards=(()=>{
 const key='clat-speed-workout-days-v1';
 const day=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 let days=[];
 try {const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))days=[...new Set(saved.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)))];}catch{}
 function complete(date=new Date()){const today=day(date),next=days.includes(today)?days:[...days,today];try{localStorage.setItem(key,JSON.stringify(next));days=next;}catch{}return streak(date);}
 function streak(date=new Date()){const cursor=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);if(!days.includes(day(cursor)))cursor.setDate(cursor.getDate()-1);let count=0;while(days.includes(day(cursor))){count++;cursor.setDate(cursor.getDate()-1);}return count;}
 return {complete,streak,hasToday:(date=new Date())=>days.includes(day(date))};
})();
