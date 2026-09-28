// Shared, read-only presentation for editorial explanations. No learner-state writes.
(function () {
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const has = q => q.explanation?.version === 1 && q.explanation.options?.length === 4;
  function evidence(part) {
    const i = part.quote.indexOf(part.highlight);
    const quote = i < 0 ? esc(part.quote) : esc(part.quote.slice(0, i)) + '<mark>' + esc(part.highlight) + '</mark>' + esc(part.quote.slice(i + part.highlight.length));
    const external = ['external', 'externalSummary'].includes(part.evidenceType);
    const summary = part.evidenceType === 'externalSummary';
    const safeURL = typeof part.sourceURL === 'string' && /^https:\/\/[^\s]+$/i.test(part.sourceURL);
    const source = safeURL ? `<a href="${esc(part.sourceURL)}" rel="noopener noreferrer">${esc(part.sourceTitle || 'Official source')}</a>` : esc(part.sourceTitle || 'Official source');
    const label = external ? `${summary ? 'Verified fact · Paraphrased' : 'Official source · Quotation'}<br>${source}${part.verifiedOn ? `<br>Checked ${esc(part.verifiedOn)}` : ''}` : part.evidenceType === 'diagram' ? 'Supplied chart / diagram' : `Passage · Paragraph ${esc(part.paragraph)}`;
    return `<blockquote class="cs-explanation-evidence"><p>${summary ? quote : `“${quote}”`}</p><cite>${label}</cite></blockquote>`;
  }
  function mockRender(q) {
    const x=q.explanation;
    const highlights=(x.evidence||[]).map(e=>e.type==='passage'?`<blockquote class="cs-explanation-evidence"><p><mark>${esc(e.text)}</mark></p><cite>Passage · Paragraph ${esc(e.paragraph)}</cite></blockquote>`:e.type==='externalSummary'&&/^https:\/\/[^\s]+$/i.test(e.url||'')?`<blockquote class="cs-explanation-evidence"><p>${esc(e.text)}</p><cite>Factual paraphrase · <a href="${esc(e.url)}" rel="noopener noreferrer">Source</a></cite></blockquote>`:'').join('');
    return `<div class="cs-explanation"><section class="cs-explanation-answer"><h3>Correct answer: ${'ABCD'[q.correct]}</h3><p>${esc(q.options[q.correct])}</p></section><section class="cs-explanation-correct"><h3>Why it is correct</h3><p>${esc(x.why_correct)}</p>${highlights}</section>${x.why_other_options.map(w=>`<section class="cs-explanation-option"><h3>Why ${'ABCD'[q.options.indexOf(w.option)]} is wrong</h3><p class="cs-explanation-choice">${esc(w.option)}</p><p>${esc(w.reason)}</p></section>`).join('')}<aside class="cs-explanation-tip"><h3>Tip / Takeaway</h3><p>${esc(x.tip)}</p></aside></div>`;
  }
  function render(q) {
    if(q.explanation?.why_correct && Array.isArray(q.explanation?.why_other_options))return mockRender(q);

    if (!has(q)) return `<h3>Why this answer works</h3><p>${q.why}</p>`;
    const x = q.explanation, letter = 'ABCD'[q.correct];
    const wrong = q.options.map((option, i) => i === q.correct ? '' : `<section class="cs-explanation-option"><h3>Why ${'ABCD'[i]} is wrong</h3><p class="cs-explanation-choice">${esc(option)}</p>${evidence(x.options[i])}<p>${esc(x.options[i].reason)}</p></section>`).join('');
    return `<div class="cs-explanation"><section class="cs-explanation-answer"><h3>Correct answer: ${letter}</h3><p class="cs-explanation-choice">${esc(q.options[q.correct])}</p></section><section class="cs-explanation-correct"><h3>Why ${letter} is correct</h3>${evidence(x.options[q.correct])}<p>${esc(x.options[q.correct].reason)}</p></section>${wrong}<aside class="cs-explanation-tip"><h3>Tip / Takeaway</h3><p>${esc(x.tip)}</p></aside></div>`;
  }
  globalThis.CLATExplanations = {has, render};
})();
