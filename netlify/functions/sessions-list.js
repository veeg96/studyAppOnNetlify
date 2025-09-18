// GET /.netlify/functions/sessions-list
import { store, json } from './_shared/sessions-util.js';
import { verifyToken } from './_shared/auth-util.js';

export default async (request, context) => {
  try {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    
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
    
    const s = store();
    const listKey = `list:${username}`;
    const sessions = (await s.get(listKey, { type: 'json' })) || [];
    return json({ sessions });
  } catch (e) { return json({ error: e.message }, 500); }
};
