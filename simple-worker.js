// Simple test worker
export default {
  async fetch(request, env, ctx) {
    return new Response('Worker is working!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  },
};
