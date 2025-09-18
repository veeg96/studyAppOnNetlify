// GET /.netlify/functions/sessions-list?userId=...
import { store, json } from '../functions/_shared/sessions-util.js';

export default async (request, context) => {
  try {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return json({ error: 'Missing userId' }, 400);
    const s = store();
    const listKey = `list:${userId}`;
    const sessions = (await s.get(listKey, { type: 'json' })) || [];
    return json({ sessions });
  } catch (e) { return json({ error: e.message }, 500); }
};
