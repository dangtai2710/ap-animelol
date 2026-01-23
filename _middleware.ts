export const onRequest = async (context) => {
  const req = context.request;
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent") || "";
  
  console.log(`Simple middleware: ${req.method} ${url.pathname} ua=${ua}`);
  
  // Only process bot requests
  if (ua.includes("facebookexternalhit")) {
    console.log("Bot detected, returning custom SEO");
    return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Xem Thu Hút Mạnh Liệt Tập 8 FHD - AnimeLoL (TEST)</title>
  <meta name="description" content="Xem phim Thu Hút Mạnh Liệt Tập 8 FHD vietsub (TEST)">
  <meta property="og:title" content="Xem Thu Hút Mạnh Liệt Tập 8 FHD - AnimeLoL (TEST)">
  <meta property="og:description" content="Xem phim Thu Hút Mạnh Liệt Tập 8 FHD vietsub (TEST)">
</head>
<body>
  <h1>SEO Middleware Working!</h1>
  <p>Slug: thu-hut-manh-liet</p>
  <p>User-Agent: ${ua}</p>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Pass through for non-bots
  return context.next();
};
