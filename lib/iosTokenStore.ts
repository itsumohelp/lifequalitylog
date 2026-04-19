// In-memory poll token store for iOS auth handoff via WKWebView polling.
// pollId is generated in WKWebView before opening SFSafariVC.
// When OAuth completes, ios-callback stores a signed JWT keyed by pollId.
// WKWebView polls ios-poll endpoint until the JWT is available.
const store = new Map<string, { token: string; expiresAt: number }>();

export function storePollToken(pollId: string, token: string) {
  store.set(pollId, { token, expiresAt: Date.now() + 5 * 60 * 1000 });
}

export function consumePollToken(pollId: string): string | null {
  const entry = store.get(pollId);
  store.delete(pollId);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.token;
}
