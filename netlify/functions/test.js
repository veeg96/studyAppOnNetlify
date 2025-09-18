// Simple test function to verify Netlify Functions are working
export default async (request, context) => {
  return new Response(JSON.stringify({ 
    message: "Test function is working!",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
