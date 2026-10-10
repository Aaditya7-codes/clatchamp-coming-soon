---
title: "CLAT 2027 Marking Scheme: +1, −0.25 and Tie-Breaks"
standfirst: "How a CLAT score is calculated, what different attempt patterns are worth, and how ties are broken. With a score calculator."
description: "CLAT 2027 UG marking: +1 for a right answer, −0.25 for a wrong one, 0 if unanswered. Score calculator, worked examples and the tie-break order."
section: "Exam basics"
order: 11
last_modified_at: 2026-10-10
checked: 2026-10-10
answer_q: "How is the CLAT UG paper marked?"
answer: "CLAT UG has **120 questions of one mark each**. A right answer earns **+1**, a wrong answer costs **−0.25**, and an unanswered question scores **0**, so the maximum is 120. **Score = correct answers − 0.25 × wrong answers.** Every section is marked the same way."
source_url: "https://clat2027.consortiumofnlus.ac.in/clat-2027/ug-question-format.html"
source_label: "Official question-paper format"
---
## CLAT score calculator

Enter how many questions you got right and wrong in a mock. The calculator applies the CLAT 2027 scheme.

<form class="calc" id="clat-calc" aria-label="CLAT score calculator" onsubmit="return false">
  <div class="calc-row">
    <label for="calc-right">Right answers</label>
    <input id="calc-right" type="number" inputmode="numeric" min="0" max="120" step="1" value="80">
  </div>
  <div class="calc-row">
    <label for="calc-wrong">Wrong answers</label>
    <input id="calc-wrong" type="number" inputmode="numeric" min="0" max="120" step="1" value="20">
  </div>
  <div class="calc-out" role="status" aria-live="polite">
    <span class="calc-k">Your score</span>
    <span class="calc-v"><span id="calc-score">75</span><small> / 120</small></span>
    <span class="calc-note" id="calc-note">100 attempted · 20 left blank · accuracy 80%</span>
  </div>
</form>
<script>
(function(){
  var r=document.getElementById('calc-right'),w=document.getElementById('calc-wrong'),
      s=document.getElementById('calc-score'),n=document.getElementById('calc-note');
  if(!r||!w||!s||!n)return;
  function num(el){var v=parseInt(el.value,10);return isNaN(v)||v<0?0:v}
  function run(){
    var a=num(r),b=num(w),t=a+b;
    if(t>120){n.textContent='A paper has 120 questions: right plus wrong cannot be more than 120.';s.textContent='–';return}
    var score=a-0.25*b;
    s.textContent=(Math.round(score*100)/100).toString();
    n.textContent=t+' attempted · '+(120-t)+' left blank'+(t?' · accuracy '+Math.round(a/t*100)+'%':'');
  }
  r.addEventListener('input',run);w.addEventListener('input',run);run();
})();
</script>

This is arithmetic, not a prediction. It cannot tell you your rank, which depends on how everyone else scores. See [CLAT score vs rank](/blog/clat-score-vs-rank/).

## The CLAT marking formula

**Score = correct answers − 0.25 × wrong answers.**

There is no separate deduction for leaving a question blank, and the maximum score is 120.

| Result on a question | Marks |
|---|---|
| Correct | **+1** |
| Wrong | **−0.25** |
| Unanswered | **0** |

## How much is negative marking in CLAT?

Each wrong answer costs a quarter of a mark. Put another way, **four wrong answers cancel one right answer**. Our [negative marking guide](/blog/is-there-negative-marking-in-clat/) covers the arithmetic and when a guess is worth taking.

## What different attempt patterns are worth

Because wrong answers cost marks, a smaller number of accurate attempts can beat a larger number of careless ones. The table uses 100 attempts.

| Accuracy on 100 attempts | Correct | Wrong | Score |
|---|---|---|---|
| 90% | 90 | 10 | 87.5 |
| 80% | 80 | 20 | 75 |
| 70% | 70 | 30 | 62.5 |
| 60% | 60 | 40 | 50 |

These are worked examples, not predictions of marks or ranks.

## Should you attempt every question?

Each extra attempt helps only if your chance of being right is above 20%. At exactly 20% it adds nothing on average, and below it the average is negative. A question where you can remove two options and are left with a coin-flip between two is above that line. A question you cannot start is not.

## How are ties broken in CLAT?

Many candidates will finish on the same total. The CLAT 2027 UG instructions give this order for tied scores:

1. **Higher marks in the Legal Aptitude section**
2. **Higher age**
3. **A computerised draw**

The instructions use the phrase "Legal Aptitude", which we read as the legal section of the paper, [Legal Reasoning](/blog/what-is-legal-reasoning-in-clat/). That makes it worth more than its share of the paper in a close race.

## Where to go next

- [Is there negative marking in CLAT?](/blog/is-there-negative-marking-in-clat/)
- [How many questions are there in CLAT?](/blog/how-many-questions-are-there-in-clat/)
- [CLAT exam pattern](/blog/clat-exam-pattern/)
- [CLAT score vs rank](/blog/clat-score-vs-rank/)
- [Time management in the CLAT exam](/blog/clat-time-management/)

## Sources and scope

Official references checked on 10 October 2026. The score table and calculator are arithmetic, not an official guide to attempts.

- [Official UG question-paper format](https://clat2027.consortiumofnlus.ac.in/clat-2027/ug-question-format.html)
- [Official UG application and exam instructions](https://clat2027.consortiumofnlus.ac.in/clat-2027/ug-instructions.html)
