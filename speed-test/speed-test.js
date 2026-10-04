// CLAT reading speed test. Runs entirely in the browser: nothing is stored or sent anywhere.
(function () {
  'use strict';
  var PASSAGE = {
    paras: [
      'The law of negligence allows a person who has suffered harm because of another’s carelessness to claim compensation. Not every careless act, however, gives rise to liability. The claimant must first establish that the defendant owed a duty of care: a legal obligation to take reasonable care to avoid causing harm. Before the twentieth century, English courts recognised such a duty only in particular relationships and, where a product was concerned, generally only between the parties to a contract. A buyer could sue the seller; a friend to whom the buyer gave the product usually had no claim.',
      'This position changed with Donoghue v Stevenson, decided by the House of Lords in 1932. A friend bought Mrs Donoghue a bottle of ginger beer in a café. The bottle was opaque, and she claimed that after she had drunk most of it the remains of a snail were found in the bottle, and that she became ill. Because she had not bought the drink herself, she had no contract with the café owner, so she sued the manufacturer. The case reached the House of Lords on a preliminary question of law, and the facts were assumed to be true for that purpose. By a majority, the House held that a manufacturer who sells a product in a form that prevents the consumer from inspecting it owes the consumer a duty to take reasonable care that it is free from defects likely to cause injury. Lord Atkin explained the reasoning: a person must take reasonable care to avoid acts or omissions that he can reasonably foresee would be likely to injure his “neighbour”, meaning those so closely and directly affected by his act that he ought reasonably to have them in contemplation.',
      'A duty of care is only the first step. The claimant must also show that the defendant breached the duty by falling below the standard of a reasonable person, that the breach caused the harm, and that the harm was not too remote a consequence of the breach. The standard does not demand perfection. A manufacturer is not liable merely because a defect exists; the claimant must show that the manufacturer failed to take reasonable care. Nor does the duty extend to everyone: it extends to those whom the defendant can reasonably foresee as likely to be affected. Courts have since developed further tests for deciding whether a duty exists in new situations, and the neighbour principle is now treated as a starting point rather than a complete rule.'
    ],
    qs: [
      { q: 'According to the passage, before 1932 a friend to whom a buyer had given a product would usually', o: ['be able to sue the seller for breach of contract', 'have no claim for harm caused by the product', 'be able to sue only the buyer', 'be treated as a party to the contract of sale'], a: 1, why: 'The passage says a buyer could sue the seller, but a friend to whom the buyer gave the product usually had no claim.' },
      { q: 'Which statement about Donoghue v Stevenson is consistent with the passage?', o: ['Mrs Donoghue had bought the drink herself.', 'Mrs Donoghue sued the café owner.', 'The House of Lords decided unanimously.', 'The facts were assumed to be true when the legal question was decided.'], a: 3, why: 'The case reached the House on a preliminary question of law, and the facts were assumed to be true for that purpose.' },
      { q: 'Principle: a manufacturer who sells a product in a form that prevents inspection owes the consumer a duty to take reasonable care that it is free from defects likely to cause injury. Facts: A company sells sealed tins of fish. A neighbour buys a tin and gives it to Ravi, who falls ill because of a harmful bacterium that careful processing would have prevented. Ravi sues the company. What is the most likely result?', o: ['Ravi fails, because he has no contract with the company.', 'Ravi may succeed, because the company owed a duty to consumers of a sealed product and failed to take reasonable care.', 'Ravi fails, because he did not buy the tin himself.', 'Ravi can sue only the neighbour who bought the tin.'], a: 1, why: 'The duty runs to the consumer without a contract, and the facts say careful processing would have prevented the harm, which suggests a failure to take reasonable care.' },
      { q: 'A manufacturer carries out every reasonable quality check, but a rare flaw that no reasonable check could detect reaches a consumer, who is injured. Based on the passage, in negligence the manufacturer', o: ['is liable, because a defect existed', 'is not liable merely because a defect existed; the claimant must show a failure to take reasonable care', 'is liable, because consumers cannot inspect the product', 'can never be liable to a consumer'], a: 1, why: 'The passage says a manufacturer is not liable merely because a defect exists; the claimant must show a failure to take reasonable care.' },
      { q: 'Which best describes the status of the neighbour principle today, according to the passage?', o: ['It is a complete rule that decides every case.', 'It has been abandoned by the courts.', 'It is a starting point, supplemented by further tests.', 'It applies only to manufacturers of food and drink.'], a: 2, why: 'The passage says courts have developed further tests and the principle is now a starting point rather than a complete rule.' }
    ]
  };

  var $ = function (id) { return document.getElementById(id); };
  var startedAt = 0, current = PASSAGE, last = null;

  function show(id) {
    ['st-intro', 'st-read', 'st-quiz', 'st-result'].forEach(function (s) { $(s).hidden = s !== id; });
    var more = document.querySelector('.st-more'); if (more) more.hidden = (id === 'st-read' || id === 'st-quiz');
    var el = $(id); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }
  function wordCount(p) { return p.paras.join(' ').trim().split(/\s+/).length; }

  function startReading() {
    var box = $('st-passage'); box.innerHTML = '';
    current.paras.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; box.appendChild(p); });
    show('st-read');
    startedAt = performance.now();
  }

  function finishReading() {
    var seconds = (performance.now() - startedAt) / 1000;
    last = { seconds: seconds, words: wordCount(current) };
    $('st-passage').innerHTML = '';
    var qs = $('st-questions'); qs.innerHTML = '';
    current.qs.forEach(function (q, i) {
      var f = document.createElement('fieldset'); f.className = 'st-q';
      var l = document.createElement('legend'); l.textContent = (i + 1) + '. ' + q.q; f.appendChild(l);
      q.o.forEach(function (opt, j) {
        var lab = document.createElement('label'); lab.className = 'st-opt';
        var inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'q' + i; inp.value = j;
        var sp = document.createElement('span'); sp.textContent = opt;
        lab.appendChild(inp); lab.appendChild(sp); f.appendChild(lab);
      });
      qs.appendChild(f);
    });
    $('st-error').hidden = true;
    show('st-quiz');
  }

  var AVG = 238; // average adult silent reading speed, English non-fiction (Brysbaert, 2019)
  function vs(id, v) {
    var el = $(id), pct = Math.round((v / AVG - 1) * 100);
    el.className = 'st-vs ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : '');
    el.textContent = pct === 0 ? 'About average' : Math.abs(pct) + '% ' + (pct > 0 ? 'above' : 'below') + ' average';
  }

  function submit(e) {
    e.preventDefault();
    var answers = [], ok = 0;
    for (var i = 0; i < current.qs.length; i++) {
      var c = document.querySelector('input[name="q' + i + '"]:checked');
      if (!c) { $('st-error').hidden = false; return; }
      answers.push(+c.value);
    }
    var rev = $('st-review'); rev.innerHTML = '';
    current.qs.forEach(function (q, i) {
      var right = answers[i] === q.a; if (right) ok++;
      var d = document.createElement('div'); d.className = 'st-rev';
      var p1 = document.createElement('p');
      var tag = document.createElement('span'); tag.className = right ? 'ok' : 'no'; tag.textContent = right ? 'Correct. ' : 'Not quite. ';
      p1.appendChild(tag); p1.appendChild(document.createTextNode((i + 1) + '. ' + q.q)); d.appendChild(p1);
      if (!right) { var p2 = document.createElement('p'); p2.textContent = 'You chose: ' + q.o[answers[i]]; d.appendChild(p2); }
      var p3 = document.createElement('p'); p3.textContent = 'Answer: ' + q.o[q.a]; d.appendChild(p3);
      var p4 = document.createElement('p'); p4.className = 'why'; p4.textContent = q.why; d.appendChild(p4);
      rev.appendChild(d);
    });
    var wpm = Math.round(last.words / (last.seconds / 60));
    var eff = Math.round(wpm * ok / current.qs.length);
    last.wpm = wpm; last.ok = ok; last.eff = eff;
    vs('r-wpm-vs', wpm); vs('r-eff-vs', eff);
    $('r-wpm').textContent = wpm; $('r-acc').textContent = ok + ' / ' + current.qs.length; $('r-eff').textContent = eff;
    var w = $('st-warn');
    if (last.seconds < 8 || wpm > 900) { w.hidden = false; w.textContent = 'That is faster than most people can read and understand, so you were probably skimming. Try again and read the way you would in the exam.'; }
    else if (ok <= 1) { w.hidden = false; w.textContent = 'Only ' + ok + ' correct, so your effective speed is low. Reading a little slower may help you understand more.'; }
    else { w.hidden = true; }
    $('st-copied').hidden = true;
    show('st-result');
  }

  function copy() {
    var t = 'I read at ' + last.wpm + ' words per minute with ' + last.ok + '/' + current.qs.length + ' correct (effective speed ' + last.eff + ' WPM) on the CLAT Champ reading speed test. Try it: https://www.clatchamp.com/speed-test/?src=share';
    var done = function () { $('st-copied').hidden = false; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { window.prompt('Copy your result:', t); });
    else window.prompt('Copy your result:', t);
  }

  $('st-start').addEventListener('click', startReading);
  $('st-done').addEventListener('click', finishReading);
  $('st-form').addEventListener('submit', submit);
  $('st-copy').addEventListener('click', copy);
})();
