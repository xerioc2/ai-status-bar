// Closing a view while an async operation completes is normal. Delivery must not
// turn a completed save or handled failure into an unhandled rejection.
export async function postToView(view: { postMessage(message: unknown): Thenable<boolean> }, message: unknown): Promise<void> {
  try { await view.postMessage(message); } catch { /* The receiving view was disposed. */ }
}
