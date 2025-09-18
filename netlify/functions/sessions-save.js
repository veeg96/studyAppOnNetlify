// POST /.netlify/functions/sessions-save
import { store, json } from './_shared/sessions-util.js';
import { verifyToken } from './_shared/auth-util.js';

export default async (request, context) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    if (!token) {
      return json({ error: 'Authentication required' }, 401);
    }
    
    const username = await verifyToken(token);
    
    if (!username) {
      return json({ error: 'Invalid or expired token' }, 401);
    }
    
    const body = await request.json().catch(() => ({}));
    const { sessionId, minutes, items } = body || {};
    if (!sessionId || !minutes || !items) return json({ error: 'Missing fields' }, 400);
    
    const s = store();
    const key = `session:${username}:${sessionId}`;
    const payload = { sessionId, username, startedAt: new Date().toISOString(), minutes, items };
    await s.setJSON(key, payload);
    const listKey = `list:${username}`;
    const list = (await s.get(listKey, { type: 'json' })) || [];
    list.push({ sessionId, startedAt: payload.startedAt, minutes, items });
    await s.setJSON(listKey, list);
    return json({ ok: true });
  } catch (e) { return json({ error: e.message }, 500); }
};
