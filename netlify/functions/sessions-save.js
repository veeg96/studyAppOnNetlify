// POST /.netlify/functions/sessions-save
import { store, json } from '../functions/_shared/sessions-util.js';

export default async (request, context) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const body = await request.json().catch(() => ({}));
    const { userId, sessionId, minutes, items } = body || {};
    if (!userId || !sessionId || !minutes || !items) return json({ error: 'Missing fields' }, 400);
    const s = store();
    const key = `session:${userId}:${sessionId}`;
    const payload = { sessionId, userId, startedAt: new Date().toISOString(), minutes, items };
    await s.setJSON(key, payload);
    const listKey = `list:${userId}`;
    const list = (await s.get(listKey, { type: 'json' })) || [];
    list.push({ sessionId, startedAt: payload.startedAt, minutes, items });
    await s.setJSON(listKey, list);
    return json({ ok: true });
  } catch (e) { return json({ error: e.message }, 500); }
};
