// POST /.netlify/functions/auth-login
import { authStore, json, hashPassword, generateToken } from './_shared/auth-util.js';

export default async (request, context) => {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }
    
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { username, password } = body || {};
    
    // Validate input
    if (!username || !password) {
      return json({ error: 'Username and password are required' }, 400);
    }
    
    // Get user
    const store = authStore();
    const userKey = `user:${username}`;
    const user = await store.get(userKey, { type: 'json' });
    
    if (!user) {
      return json({ error: 'Invalid username or password' }, 401);
    }
    
    // Verify password
    const { hash } = hashPassword(password, user.passwordSalt);
    
    if (hash !== user.passwordHash) {
      return json({ error: 'Invalid username or password' }, 401);
    }
    
    // Generate session token
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    // Store session
    const sessionKey = `session:${token}`;
    await store.setJSON(sessionKey, {
      username,
      expiresAt,
      createdAt: Date.now()
    });
    
    return json({ token });
  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Login failed' }, 500);
  }
};
