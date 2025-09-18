// Shared authentication utilities
import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

export const AUTH_STORE = 'study-sprint-auth';
export const SESSION_STORE = 'study-sprint-sessions';

export function authStore() {
  return getStore({ name: AUTH_STORE });
}

export function sessionStore() {
  return getStore({ name: SESSION_STORE });
}

export function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

// Hash password with salt
export function hashPassword(password, salt = null) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: useSalt };
}

// Generate a session token
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify a session token
export async function verifyToken(token) {
  if (!token) return null;
  
  const store = authStore();
  const sessionKey = `session:${token}`;
  const session = await store.get(sessionKey, { type: 'json' });
  
  if (!session) return null;
  
  // Check if session is expired (24 hours)
  const now = Date.now();
  if (now > session.expiresAt) {
    await store.delete(sessionKey);
    return null;
  }
  
  return session.username;
}
