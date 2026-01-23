export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

// Minimal type declarations for Cloudflare Pages/Workers runtime.
// Cloudflare provides these globals at runtime, but local TS may not know them.
type RewriterElement = {
  setInnerContent: (content: string, options?: { html?: boolean }) => void;
  setAttribute: (name: string, value: string) => void;
  append: (content: string, options?: { html?: boolean }) => void;
};

declare const HTMLRewriter: {
  new (): {
    on: (selector: string, handlers: any) => any;
    transform: (response: Response) => Response;
  };
};

type PagesFunctionContext<TEnv> = {
  request: Request;
  env: TEnv;
  next: () => Promise<Response>;
};

type PagesFunction<TEnv> = (context: PagesFunctionContext<TEnv>) => Promise<Response>;

type SeoPayload = {
  title: string;
  description: string;
  keywords: string;
  image?: string;
  canonicalUrl?: string;
  siteName?: string;
  type?: string;
};

const BOT_UA_REGEX =
  /(googlebot|bingbot|yandex|duckduckbot|baiduspider|slurp|twitterbot|facebookexternalhit|facebot|linkedinbot|telegrambot|whatsapp|discordbot|slackbot|pinterest|embedly|quora link preview|kakaotalk|naver|applebot)/i;

function isLikelyBot(req: Request): boolean {
  const ua = req.headers.get("user-agent") || "";
  if (BOT_UA_REGEX.test(ua)) return true;

  // Many social crawlers don't send UA consistently but send these headers
  const purpose = req.headers.get("purpose") || req.headers.get("sec-purpose") || "";
  if (/prefetch/i.test(purpose)) return true;

  return false;
}

function isHtmlRequest(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/html");
}

function isAssetPath(pathname: string): boolean {
  // Ignore common static assets
  return /\.(?:js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|eot|map|json|txt|xml)$/i.test(pathname);
}

function getOrigin(url: URL): string {
  return `${url.protocol}//${url.host}`;
}

async function fetchKvTable(
  env: Env,
  table: "seo_settings" | "site_settings"
): Promise<Record<string, string>> {
  const supabaseUrl = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return {};

  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=setting_key,setting_value`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!res.ok) return {};
  const data = (await res.json()) as Array<{ setting_key: string; setting_value: string | null }>;

  const out: Record<string, string> = {};
  for (const row of data) {
    if (row.setting_key && row.setting_value) {
      out[row.setting_key] = row.setting_value;
    }
  }
  return out;
}

async function getHomepageSeo(url: URL, env: Env): Promise<SeoPayload | null> {
  const [seo, site] = await Promise.all([fetchKvTable(env, "seo_settings"), fetchKvTable(env, "site_settings")]);

  const siteName = seo.site_name || site.site_name || "PhimHD";
  const titleBase = seo.homepage_title || "Xem phim online miễn phí chất lượng cao";
  const title = titleBase.includes(siteName) ? titleBase : `${titleBase} - ${siteName}`;
  const description = seo.homepage_description || seo.site_description || `Xem phim online chất lượng cao tại ${siteName}`;
  const keywords = seo.site_keywords || "";

  const image = seo.og_image || "/icon-512.svg";
  const canonicalUrl = `${getOrigin(url)}${url.pathname}`;

  return {
    title,
    description,
    keywords,
    image,
    canonicalUrl,
    siteName,
    type: "website",
  };
}

async function getMovieSeo(url: URL, env: Env, slug: string): Promise<SeoPayload | null> {
  const supabaseUrl = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  // Use Supabase Edge Function (already in your repo): supabase/functions/seo-prerender
  const apiUrl = `${supabaseUrl}/functions/v1/seo-prerender?slug=${encodeURIComponent(slug)}&type=movie`;
  const res = await fetch(apiUrl, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as SeoPayload;

  // Fallback canonical if not present
  if (!data.canonicalUrl) {
    data.canonicalUrl = `${getOrigin(url)}/phim/${slug}`;
  }

  return data;
}

function routeToSeo(url: URL, env: Env): Promise<SeoPayload | null> {
  const path = url.pathname;

  if (path === "/" || path === "/index.html") {
    return getHomepageSeo(url, env);
  }

  // Movie detail route: /phim/:slug (with or without trailing slash)
  const movieMatch = path.match(/^\/phim\/([^\/]+)(?:\/)?$/i);
  if (movieMatch) {
    console.log(`Movie SEO: slug=${movieMatch[1]} path=${path}`);
    return getMovieSeo(url, env, movieMatch[1]);
  }

  return Promise.resolve(null);
}

class TitleRewriter {
  constructor(private value: string) {}
  element(el: RewriterElement) {
    el.setInnerContent(this.value);
  }
}

class MetaRewriter {
  constructor(private value: string) {}
  element(el: RewriterElement) {
    if (!this.value) return;
    el.setAttribute("content", this.value);
  }
}

class LinkHrefRewriter {
  constructor(private href: string) {}
  element(el: RewriterElement) {
    if (!this.href) return;
    el.setAttribute("href", this.href);
  }
}

class HeadInjector {
  constructor(private seo: SeoPayload) {}
  element(el: RewriterElement) {
    const canonical = this.seo.canonicalUrl
      ? `<link rel="canonical" href="${escapeHtmlAttr(this.seo.canonicalUrl)}" />`
      : "";

    // Ensure keywords exists even if template removed it
    const keywords = this.seo.keywords
      ? `<meta name="keywords" content="${escapeHtmlAttr(this.seo.keywords)}" />`
      : "";

    // Minimal extra tags (append at end of head)
    const extra = `${canonical}${keywords}`;
    if (extra) el.append(extra, { html: true });
  }
}

function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function buildSeoResponse(context: PagesFunctionContext<Env>, seo: SeoPayload): Promise<Response> {
  const res = await context.next();
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;

  const url = new URL(context.request.url);
  const origin = getOrigin(url);

  const imageUrl = seo.image
    ? seo.image.startsWith("http")
      ? seo.image
      : `${origin}${seo.image.startsWith("/") ? "" : "/"}${seo.image}`
    : "";

  const rewriter = new HTMLRewriter()
    .on("head", new HeadInjector(seo))
    .on("title", new TitleRewriter(seo.title))
    .on('meta[name="description"]', new MetaRewriter(seo.description))
    .on('meta[name="keywords"]', new MetaRewriter(seo.keywords))
    .on('meta[property="og:title"]', new MetaRewriter(seo.title))
    .on('meta[property="og:description"]', new MetaRewriter(seo.description))
    .on('meta[property="og:site_name"]', new MetaRewriter(seo.siteName || ""))
    .on('meta[property="og:type"]', new MetaRewriter(seo.type || "website"))
    .on('meta[property="og:url"]', new MetaRewriter(seo.canonicalUrl || url.href))
    .on('meta[property="og:image"]', new MetaRewriter(imageUrl))
    .on('meta[name="twitter:title"]', new MetaRewriter(seo.title))
    .on('meta[name="twitter:description"]', new MetaRewriter(seo.description))
    .on('meta[name="twitter:image"]', new MetaRewriter(imageUrl))
    .on('link[rel="icon"]', seo.image ? new LinkHrefRewriter(seo.image) : new LinkHrefRewriter(""));

  const rewritten = rewriter.transform(res);

  // Encourage caching for bots (Edge cache + browser cache).
  const headers = new Headers(rewritten.headers);
  headers.set("Cache-Control", "public, max-age=300");
  headers.set("Vary", "User-Agent");

  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers,
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const req = context.request as Request;
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent") || "";
  
  console.log(`Middleware: ${req.method} ${url.pathname} ua=${ua}`);

  // Only rewrite HTML GET/HEAD
  if (!(req.method === "GET" || req.method === "HEAD")) return context.next();
  if (!isHtmlRequest(req)) return context.next();
  if (isAssetPath(url.pathname)) return context.next();

  // Only do heavy work for bots/social crawlers
  const isBot = isLikelyBot(req);
  console.log(`Is bot: ${isBot}`);
  if (!isBot) return context.next();

  const cacheKey = new Request(url.toString(), req);
  const cache = (caches as any).default as Cache | undefined;

  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const seo = await routeToSeo(url, context.env as Env);
  console.log(`SEO result:`, seo);
  if (!seo) {
    console.log(`No SEO data, returning passthrough`);
    const passthrough = await context.next();
    if (cache) await cache.put(cacheKey, passthrough.clone());
    return passthrough;
  }

  console.log(`Building SEO response...`);
  const out = await buildSeoResponse(context, seo);
  if (cache) await cache.put(cacheKey, out.clone());
  console.log(`SEO response built and cached`);
  return out;
};
