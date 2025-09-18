// Shared helpers for all functions (ESM + Web API)
import { getStore } from '@netlify/blobs';

export const STORE_NAME = 'study-sprint-sessions';
export function store() {
  return getStore({ name: STORE_NAME });
}
export function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
