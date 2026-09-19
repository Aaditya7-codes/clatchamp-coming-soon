(() => {
  const root = document.getElementById('champ-blog');
  if (!root) return;
  const search = root.querySelector('input[type="search"]');
  const filters = [...root.querySelectorAll('.cb-filters button')];
  const cards = [...root.querySelectorAll('.cb-article')];
  const more = root.querySelector('.cb-more');
  const clear = root.querySelector('.cb-clear');
  const count = root.querySelector('.cb-count');
  const empty = root.querySelector('.cb-empty');
  const searchable = new Map(cards.map(card => [card,
    `${card.textContent} ${card.dataset.search} ${card.dataset.category}`.toLocaleLowerCase()
  ]));
  let category = '', limit = 6;
  function render() {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = cards.filter(card => (!category || card.dataset.category === category)
      && words.every(word => searchable.get(card).includes(word)));
    const visible = new Set(matches.slice(0, limit));
    cards.forEach(card => { card.hidden = !visible.has(card); });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    count.textContent = `Showing ${visible.size} of ${matches.length} guides`;
    more.hidden = matches.length <= limit;
    clear.hidden = !category && words.length === 0;
    empty.hidden = matches.length > 0;
    return matches;
  }
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category; limit = 6; render();
  }));
  search.addEventListener('input', () => { limit = 6; render(); });
  clear.addEventListener('click', () => {
    category = ''; limit = 6; search.value = ''; render(); search.focus();
  });
  more.addEventListener('click', () => {
    const firstNew = limit; limit += 6;
    const matches = render();
    // Move focus into the newly revealed guides, including the final batch.
    matches[firstNew]?.querySelector('a').focus({ preventScroll: true });
  });
  render();
  ['.cb-search', '.cb-filters', '.cb-results'].forEach(selector => {
    root.querySelector(selector).hidden = false;
  });
})();
