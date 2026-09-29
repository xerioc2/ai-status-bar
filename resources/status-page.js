(() => {
  const vscode = acquireVsCodeApi();
  const choices = document.getElementById('choices');
  const save = document.getElementById('save');
  const notice = document.getElementById('notice');
  let saved = [];
  let dirty = false;
  let saving = false;
  const rows = () => [...choices.children];
  const selection = () => rows().filter(row => row.querySelector('input').checked).map(row => row.dataset.id);
  saved = selection();
  function buttons() {
    const all = rows();
    all.forEach((row, index) => {
      row.querySelector('[data-move="-1"]').disabled = saving || index === 0;
      row.querySelector('[data-move="1"]').disabled = saving || index === all.length - 1;
      row.querySelector('input').disabled = saving;
    });
    save.disabled = saving || !dirty;
    document.getElementById('reset').disabled = saving;
  }
  function restore() {
    const all = rows();
    const order = [...saved, ...all.map(row => row.dataset.id).filter(id => !saved.includes(id))];
    order.forEach(id => {
      const row = all.find(item => item.dataset.id === id);
      if (row) { row.querySelector('input').checked = saved.includes(id); choices.append(row); }
    });
    dirty = false;
    buttons();
  }
  function changed() {
    dirty = true;
    notice.textContent = 'Unsaved changes';
    buttons();
  }
  choices.addEventListener('change', changed);
  choices.addEventListener('click', event => {
    const button = event.target.closest('button[data-move]');
    if (!button || saving) { return; }
    const row = button.closest('.choice');
    const other = button.dataset.move === '-1' ? row.previousElementSibling : row.nextElementSibling;
    if (other) {
      if (button.dataset.move === '-1') { choices.insertBefore(row, other); }
      else { choices.insertBefore(other, row); }
      changed();
      row.querySelector('input').focus();
    }
  });
  save.addEventListener('click', () => {
    saving = true;
    buttons();
    notice.textContent = 'Saving…';
    vscode.postMessage({ type: 'save', ids: selection() });
  });
  document.getElementById('reset').addEventListener('click', () => { restore(); notice.textContent = 'Changes reset to saved settings.'; });
  document.getElementById('refresh').addEventListener('click', () => {
    vscode.postMessage({ type: 'refresh' });
    notice.textContent = 'Refresh requested. Checks are limited to once per minute.';
  });
  window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
      document.getElementById('history').innerHTML = message.html || '<p>No providers enabled.</p>';
      saved = message.enabled;
      if (!dirty && !saving) { restore(); }
    } else if (message.type === 'saved') {
      saved = message.enabled;
      saving = false;
      restore();
      notice.textContent = 'Saved. Your provider selection and order are applied.';
    } else if (message.type === 'saveError') {
      saving = false;
      buttons();
      notice.textContent = message.text;
    }
  });
  buttons();
  vscode.postMessage({ type: 'ready' });
})();
