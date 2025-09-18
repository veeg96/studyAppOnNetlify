// POST /.netlify/functions/sessions-next
import { store, json } from '../functions/_shared/sessions-util.js';

export default async (request, context) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const body = await request.json().catch(() => ({}));
    const { userId, numQ, totalItems } = body || {};
    if (!userId || !numQ || !totalItems) return json({ error: 'Missing fields' }, 400);
    const s = store();
    const cursorKey = `cursor:${userId}`;
    const currentRaw = await s.get(cursorKey, { type: 'text' });
    let current = currentRaw ? parseInt(currentRaw, 10) : 0;
    const indices = [];
    for (let i = 0; i < numQ; i++) { indices.push(current % totalItems); current++; }
    await s.set(cursorKey, String(current));
    // Generate a random UUID using a more compatible approach
    const sessionId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15) + 
                     Date.now().toString(36);
    return json({ indices, sessionId });
  } catch (e) { return json({ error: e.message }, 500); }
};
