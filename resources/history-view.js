// Shared by the sidebar and dashboard. Preserve interaction state when reports change.
window.updateHistory = html => {
  const history = document.getElementById('history');
  const active = document.activeElement;
  const provider = active?.closest('[data-provider]')?.dataset.provider;
  const focus = active?.dataset.focus;
  const scroll = { x: window.scrollX, y: window.scrollY };
  const open = new Set([...history.querySelectorAll('article')]
    .filter(row => row.querySelector('details')?.open).map(row => row.dataset.provider));
  history.innerHTML = html || '<p>No providers enabled.</p>';
  for (const row of history.querySelectorAll('article')) {
    const details = row.querySelector('details');
    if (details) { details.open = open.has(row.dataset.provider); }
    if (row.dataset.provider === provider && focus) {
      [...row.querySelectorAll('[data-focus]')].find(item => item.dataset.focus === focus)?.focus({ preventScroll: true });
    }
  }
  window.scrollTo(scroll.x, scroll.y);
};
