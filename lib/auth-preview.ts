/**
 * Auth forms are frontend-only in this block. This helper adds a short delay
 * so loading states can be reviewed; it never performs authentication, writes
 * data, sends email, or creates a session.
 */
export function waitForPreviewState(delay = 650): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
