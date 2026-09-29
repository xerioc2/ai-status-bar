(() => {
  const vscode = acquireVsCodeApi();
  window.addEventListener('message', event => {
    if (event.data.type === 'update') { window.updateHistory(event.data.html); }
  });
  vscode.postMessage({ type: 'ready' });
})();
