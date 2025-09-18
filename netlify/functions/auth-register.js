// POST /.netlify/functions/auth-register
import { authStore, json, hashPassword } from './_shared/auth-util.js';

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
    
    if (username.length < 3) {
      return json({ error: 'Username must be at least 3 characters long' }, 400);
    }
    
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters long' }, 400);
    }
    
    // Check if username already exists
    const store = authStore();
    const userKey = `user:${username}`;
    const existingUser = await store.get(userKey, { type: 'json' });
    
    if (existingUser) {
      return json({ error: 'Username already exists' }, 409);
    }
    
    // Hash password
    const { hash, salt } = hashPassword(password);
    
    // Store user
    const user = {
      username,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: Date.now()
    };
    
    await store.setJSON(userKey, user);
    
    return json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return json({ error: 'Registration failed' }, 500);
  }
};
