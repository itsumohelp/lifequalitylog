interface NonceEntry {
  sessionToken: string;
  cookieName: string;
  expiresAt: number;
}

// In-memory stores for native iOS auth flow
// pollId → nonce (set when OAuth completes, consumed after browser closes)
export const pollStore = new Map<string, string>();
// nonce → session info (consumed once by exchange endpoint)
export const nonceStore = new Map<string, NonceEntry>();
