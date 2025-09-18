// POST /.netlify/functions/sessions-next
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
    const { numQ, totalItems } = body || {};
    if (!numQ || !totalItems) return json({ error: 'Missing fields' }, 400);
    
    const s = store();
    const cursorKey = `cursor:${username}`;
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
