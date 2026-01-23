export const onRequest = async () => {
  return new Response('Functions working!', {
    headers: { 'Content-Type': 'text/plain' }
  });
};
