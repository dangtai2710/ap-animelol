import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SiteSetting {
  setting_key: string;
  setting_value: string | null;
}

export function PWAManifest() {
  const { data: settings } = useQuery({
    queryKey: ["pwa-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "pwa_app_name",
          "pwa_short_name",
          "pwa_icon_192",
          "pwa_icon_512",
          "theme_primary_color",
          "site_name",
        ]);
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      (data as SiteSetting[])?.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });
      return settingsMap;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  useEffect(() => {
    if (!settings) return;

    const appName = settings.pwa_app_name || settings.site_name || "Phim HD - Xem phim online";
    const shortName = settings.pwa_short_name || "PhimHD";
    const icon192 = settings.pwa_icon_192 || "/icon-192.png";
    const icon512 = settings.pwa_icon_512 || "/icon-512.png";
    const themeColor = settings.theme_primary_color || "#e11d48";

    // Create dynamic manifest
    const manifest = {
      name: appName,
      short_name: shortName,
      description: "Xem phim online chất lượng cao, vietsub, thuyết minh",
      start_url: "/",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: themeColor,
      orientation: "any",
      icons: [
        {
          src: icon192,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: icon512,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
      categories: ["entertainment", "video"],
      lang: "vi",
      dir: "ltr",
      scope: "/",
      prefer_related_applications: false,
    };

    // Create blob URL for manifest
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const manifestUrl = URL.createObjectURL(blob);

    // Update or create manifest link
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink) {
      manifestLink.href = manifestUrl;
    } else {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = manifestUrl;
      document.head.appendChild(manifestLink);
    }

    // Update apple-touch-icon
    let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleTouchIcon) {
      appleTouchIcon.href = icon192;
    }

    // Update apple-mobile-web-app-title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
    if (appleTitle) {
      appleTitle.content = shortName;
    }

    // Update theme-color
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (themeColorMeta) {
      themeColorMeta.content = themeColor;
    }

    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, [settings]);

  return null;
}
