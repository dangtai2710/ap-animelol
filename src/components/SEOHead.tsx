import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { replaceSeoVariables } from "@/lib/seoUtils";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article" | "video.movie";
  url?: string;
  noindex?: boolean;
  keywords?: string;
}

export function SEOHead({ 
  title, 
  description, 
  image,
  type = "website",
  url,
  noindex = false,
  keywords
}: SEOHeadProps) {
  const location = useLocation();
  const { data: seoSettings, isLoading: seoLoading } = useSeoSettings();
  const { data: siteSettings, isLoading: siteLoading } = useSiteSettings();

  // Get site name from settings with proper fallback
  const siteName = useMemo(() => {
    return seoSettings?.site_name || siteSettings?.site_name || "PhimHD";
  }, [seoSettings?.site_name, siteSettings?.site_name]);

  const siteUrl = siteSettings?.site_url || (typeof window !== 'undefined' ? window.location.origin : '');
  const faviconUrl = siteSettings?.favicon_url || seoSettings?.favicon_url;
  const ogImage = image || seoSettings?.og_image;
  
  // Build page title with sitename variable replacement
  const pageTitle = useMemo(() => {
    if (title) {
      // Replace %sitename% variable in title
      let processedTitle = replaceSeoVariables(title, { sitename: siteName });
      // If title already contains site name, don't append again
      if (!processedTitle.includes(siteName)) {
        processedTitle = `${processedTitle} - ${siteName}`;
      }
      return processedTitle;
    }
    
    // For homepage, use homepage_title with variable replacement
    if (seoSettings?.homepage_title) {
      let homepageTitle = replaceSeoVariables(seoSettings.homepage_title, { sitename: siteName });
      if (!homepageTitle.includes(siteName)) {
        homepageTitle = `${homepageTitle} - ${siteName}`;
      }
      return homepageTitle;
    }
    
    return siteName;
  }, [title, seoSettings?.homepage_title, siteName]);
  
  // Build description with variable replacement
  const pageDescription = useMemo(() => {
    if (description) {
      return replaceSeoVariables(description, { sitename: siteName });
    }
    if (seoSettings?.homepage_description) {
      return replaceSeoVariables(seoSettings.homepage_description, { sitename: siteName });
    }
    if (seoSettings?.site_description) {
      return replaceSeoVariables(seoSettings.site_description, { sitename: siteName });
    }
    return `Xem phim online chất lượng cao tại ${siteName}`;
  }, [description, seoSettings?.homepage_description, seoSettings?.site_description, siteName]);
  
  // Build keywords
  const pageKeywords = useMemo(() => {
    if (keywords) {
      return replaceSeoVariables(keywords, { sitename: siteName });
    }
    if (seoSettings?.site_keywords) {
      return replaceSeoVariables(seoSettings.site_keywords, { sitename: siteName });
    }
    return "";
  }, [keywords, seoSettings?.site_keywords, siteName]);
  
  const canonicalUrl = url || `${siteUrl}${location.pathname}`;

  useEffect(() => {
    // Don't update if settings are still loading (avoid empty values)
    if (seoLoading || siteLoading) return;

    // Update document title
    document.title = pageTitle;

    // Update meta description - always set it
    updateMetaTag("description", pageDescription, "name");

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // Update robots meta
    if (noindex) {
      updateMetaTag("robots", "noindex, nofollow", "name");
    } else {
      updateMetaTag("robots", "index, follow", "name");
    }

    // Update keywords - always set it if available
    if (pageKeywords) {
      updateMetaTag("keywords", pageKeywords, "name");
    } else {
      // Remove keywords meta if empty
      const existingKeywords = document.querySelector('meta[name="keywords"]');
      if (existingKeywords) {
        existingKeywords.remove();
      }
    }

    // Update OG tags
    updateMetaTag("og:title", pageTitle, "property");
    updateMetaTag("og:description", pageDescription, "property");
    updateMetaTag("og:type", type, "property");
    updateMetaTag("og:site_name", siteName, "property");
    updateMetaTag("og:url", canonicalUrl, "property");
    updateMetaTag("og:locale", "vi_VN", "property");
    
    if (ogImage) {
      const fullImageUrl = ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`;
      updateMetaTag("og:image", fullImageUrl, "property");
      updateMetaTag("og:image:alt", pageTitle, "property");
      updateMetaTag("twitter:image", fullImageUrl, "name");
    }

    // Update Twitter tags
    updateMetaTag("twitter:card", ogImage ? "summary_large_image" : "summary", "name");
    updateMetaTag("twitter:title", pageTitle, "name");
    updateMetaTag("twitter:description", pageDescription, "name");

    // Update favicon
    if (faviconUrl) {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.setAttribute("rel", "icon");
        document.head.appendChild(favicon);
      }
      favicon.setAttribute("href", faviconUrl);
      favicon.setAttribute("type", faviconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png");
    }

    // Inject custom head HTML from SEO settings
    if (seoSettings?.head_meta_tags) {
      let customHead = document.getElementById("custom-seo-head");
      if (!customHead) {
        customHead = document.createElement("div");
        customHead.id = "custom-seo-head";
        document.head.appendChild(customHead);
      }
      customHead.innerHTML = seoSettings.head_meta_tags;
    }

    // Inject custom head HTML from site settings
    if (siteSettings?.head_html) {
      let customHead = document.getElementById("custom-head-html");
      if (!customHead) {
        customHead = document.createElement("div");
        customHead.id = "custom-head-html";
        document.head.appendChild(customHead);
      }
      customHead.innerHTML = siteSettings.head_html;
    }
  }, [pageTitle, pageDescription, pageKeywords, faviconUrl, ogImage, type, canonicalUrl, siteName, siteUrl, siteSettings?.head_html, seoSettings?.head_meta_tags, noindex, seoLoading, siteLoading]);

  return null;
}

function updateMetaTag(name: string, content: string, type: "name" | "property") {
  if (!content) return;
  
  const selector = type === "property" 
    ? `meta[property="${name}"]` 
    : `meta[name="${name}"]`;
  
  let meta = document.querySelector(selector) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(type, name);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute("content", content);
}
