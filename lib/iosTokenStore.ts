// In-memory one-time token store for iOS auth handoff.
// Token maps to the NextAuth session token, valid for 5 minutes.
const store = new Map<string, { sessionToken: string; expires: Date }>();

export function storeIosToken(iosToken: string, sessionToken: string) {
  store.set(iosToken, {
    sessionToken,
    expires: new Date(Date.now() + 5 * 60 * 1000),
  });
}

export function consumeIosToken(iosToken: string): string | null {
  const entry = store.get(iosToken);
  store.delete(iosToken);
  if (!entry || entry.expires < new Date()) return null;
  return entry.sessionToken;
}
