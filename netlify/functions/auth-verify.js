// GET /.netlify/functions/auth-verify
import { json, verifyToken } from './_shared/auth-util.js';

export default async (request, context) => {
  try {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405);
    }
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    if (!token) {
      return json({ error: 'No token provided' }, 401);
    }
    
    // Verify token
    const username = await verifyToken(token);
    
    if (!username) {
      return json({ error: 'Invalid or expired token' }, 401);
    }
    
    return json({ username, authenticated: true });
  } catch (error) {
    console.error('Token verification error:', error);
    return json({ error: 'Authentication failed' }, 500);
  }
};
