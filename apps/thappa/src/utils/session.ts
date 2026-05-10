/**
 * In-memory session store for multi-step REPORT conversations.
 * Sessions expire after 15 minutes of inactivity.
 */

import type { UserSession, SessionStep, PaymentStatus, QualityRating } from "../types/index.js";

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

const sessions = new Map<string, UserSession>();

// ─── Cleanup expired sessions every 5 minutes ────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [phone, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(phone);
    }
  }
}, 5 * 60 * 1000);

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSession(phone: string): UserSession {
  const existing = sessions.get(phone);
  if (existing) {
    existing.updatedAt = Date.now();
    return existing;
  }

  const fresh: UserSession = {
    senderPhone: phone,
    step: "idle",
    data: {},
    checksUsed: 0,
    isSubscribed: false,
    updatedAt: Date.now(),
  };
  sessions.set(phone, fresh);
  return fresh;
}

export function updateSession(
  phone: string,
  updates: Partial<UserSession>
): UserSession {
  const session = getSession(phone);
  Object.assign(session, updates, { updatedAt: Date.now() });
  sessions.set(phone, session);
  return session;
}

export function setStep(phone: string, step: SessionStep): void {
  updateSession(phone, { step });
}

export function setSessionData(
  phone: string,
  data: Partial<UserSession["data"]>
): void {
  const session = getSession(phone);
  session.data = { ...session.data, ...data };
  session.updatedAt = Date.now();
  sessions.set(phone, session);
}

export function clearSession(phone: string): void {
  const session = getSession(phone);
  session.step = "idle";
  session.data = {};
  session.updatedAt = Date.now();
  sessions.set(phone, session);
}

export function incrementChecks(phone: string): number {
  const session = getSession(phone);
  session.checksUsed += 1;
  session.updatedAt = Date.now();
  sessions.set(phone, session);
  return session.checksUsed;
}

export function setSubscribed(phone: string, expiry: string): void {
  updateSession(phone, { isSubscribed: true, subscriptionExpiry: expiry });
}

export function isSubscriptionActive(phone: string): boolean {
  const session = getSession(phone);
  if (!session.isSubscribed) return false;
  if (!session.subscriptionExpiry) return false;
  return new Date(session.subscriptionExpiry) > new Date();
}

export function getFreeChecksLimit(): number {
  return Number(process.env.FREE_CHECKS_LIMIT ?? 10);
}
