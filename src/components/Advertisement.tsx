import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdvertisementProps {
  position: "header" | "footer" | "sidebar" | "player" | "native" | "socialbar";
  page?: string;
  className?: string;
}

interface Ad {
  id: string;
  name: string;
  ad_type: string;
  position: string;
  content: string;
  is_active: boolean;
  pages: string[];
  display_order: number;
  start_date: string | null;
  end_date: string | null;
}

// Check if ad should display on current page
const shouldDisplayOnPage = (adPages: string[] | null, currentPage: string): boolean => {
  // Never show ads on admin pages
  if (currentPage === "admin" || currentPage.startsWith("admin")) return false;
  
  if (!adPages || adPages.length === 0) return true;
  if (adPages.includes("all")) return true;
  return adPages.includes(currentPage);
};

export const Advertisement = ({ position, page = "all", className = "" }: AdvertisementProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptsLoadedRef = useRef<Set<string>>(new Set());

  const { data: ads } = useQuery({
    queryKey: ["advertisements", position, page],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("position", position)
        .eq("is_active", true)
        .eq("ad_type", "banner")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      
      // Filter by page and date
      return (data as Ad[]).filter(ad => {
        // Check page filter
        if (!shouldDisplayOnPage(ad.pages, page)) return false;
        
        // Check date range
        if (ad.start_date && new Date(ad.start_date) > new Date(now)) return false;
        if (ad.end_date && new Date(ad.end_date) < new Date(now)) return false;
        
        return true;
      });
    },
  });

  useEffect(() => {
    if (!containerRef.current || !ads || ads.length === 0) return;
    
    // Clear previous content
    containerRef.current.innerHTML = "";
    
    ads.forEach((ad, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "advertisement-item";
      wrapper.style.cssText = "display: flex; justify-content: center; align-items: center; width: 100%; max-width: 100%; overflow: hidden;";
      
      // Set innerHTML with the ad content (including scripts)
      // Scripts won't execute this way, we need to handle them separately
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = ad.content;
      
      // Get all scripts
      const scripts = tempDiv.querySelectorAll("script");
      
      // Add non-script content first
      const nonScriptContent = ad.content.replace(/<script[\s\S]*?<\/script>/gi, "");
      if (nonScriptContent.trim()) {
        wrapper.innerHTML = nonScriptContent;
      }
      
      containerRef.current?.appendChild(wrapper);
      
      // Now execute scripts in order
      scripts.forEach((script, scriptIndex) => {
        const scriptId = `${ad.id}-${scriptIndex}`;
        
        // Avoid duplicate script loading
        if (scriptsLoadedRef.current.has(scriptId)) return;
        scriptsLoadedRef.current.add(scriptId);
        
        const newScript = document.createElement("script");
        newScript.type = "text/javascript";
        
        if (script.src) {
          newScript.src = script.src;
          newScript.async = false; // Load in order
        } else if (script.textContent) {
          newScript.textContent = script.textContent;
        }
        
        // Append to wrapper for context, fallback to body
        try {
          wrapper.appendChild(newScript);
        } catch (e) {
          document.body.appendChild(newScript);
        }
      });
    });
    
    return () => {
      // Clear scripts tracking on unmount
      scriptsLoadedRef.current.clear();
    };
  }, [ads, position]);

  // Always show container if there are ads (even if scripts haven't loaded yet)
  if (!ads || ads.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className={`advertisement-container w-full ${className}`}
      data-position={position}
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        width: '100%',
        minHeight: '50px',
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    />
  );
};

// Native Ads Component
export const NativeAd = ({ page = "all" }: { page?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: ads } = useQuery({
    queryKey: ["advertisements-native", page],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("ad_type", "native")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      
      return (data as Ad[]).filter(ad => {
        if (!shouldDisplayOnPage(ad.pages, page)) return false;
        if (ad.start_date && new Date(ad.start_date) > new Date(now)) return false;
        if (ad.end_date && new Date(ad.end_date) < new Date(now)) return false;
        return true;
      });
    },
  });

  useEffect(() => {
    if (containerRef.current && ads && ads.length > 0) {
      containerRef.current.innerHTML = "";
      
      ads.forEach(ad => {
        const wrapper = document.createElement("div");
        wrapper.className = "native-ad-item";
        wrapper.innerHTML = ad.content;
        
        const scripts = wrapper.querySelectorAll("script");
        scripts.forEach(script => {
          const newScript = document.createElement("script");
          if (script.src) {
            newScript.src = script.src;
            newScript.async = true;
          } else {
            newScript.textContent = script.textContent;
          }
          script.remove();
          document.body.appendChild(newScript);
        });
        
        containerRef.current?.appendChild(wrapper);
      });
    }
  }, [ads]);

  if (!ads || ads.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="native-ad-container my-4"
      data-ad-type="native"
    />
  );
};

// Social Bar Component
export const SocialBar = ({ page = "all" }: { page?: string }) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Don't show on admin pages
  const isAdminPage = location.pathname.startsWith("/admin");

  const { data: ads, isLoading } = useQuery({
    queryKey: ["advertisements-socialbar", page],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("ad_type", "socialbar")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      
      return (data as Ad[]).filter(ad => {
        if (!shouldDisplayOnPage(ad.pages, page)) return false;
        if (ad.start_date && new Date(ad.start_date) > new Date(now)) return false;
        if (ad.end_date && new Date(ad.end_date) < new Date(now)) return false;
        return true;
      });
    },
  });

  // Track injected scripts for cleanup
  const injectedScriptsRef = useRef<HTMLScriptElement[]>([]);

  useEffect(() => {
    // Don't inject scripts on admin pages
    if (isAdminPage) return;
    
    if (containerRef.current && ads && ads.length > 0) {
      containerRef.current.innerHTML = "";
      
      ads.forEach(ad => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = ad.content;
        
        const scripts = wrapper.querySelectorAll("script");
        scripts.forEach(script => {
          const newScript = document.createElement("script");
          newScript.setAttribute("data-socialbar-ad", "true");
          if (script.src) {
            newScript.src = script.src;
            newScript.async = true;
          } else {
            newScript.textContent = script.textContent;
          }
          script.remove();
          document.body.appendChild(newScript);
          injectedScriptsRef.current.push(newScript);
        });
        
        containerRef.current?.appendChild(wrapper);
      });
    }

    // Cleanup function to remove injected scripts
    return () => {
      injectedScriptsRef.current.forEach(script => {
        script.remove();
      });
      injectedScriptsRef.current = [];
      
      // Also remove any dynamically created elements by ad scripts
      document.querySelectorAll('[data-socialbar-ad="true"]').forEach(el => el.remove());
    };
  }, [ads, isAdminPage]);

  // Cleanup social bar elements when navigating to admin
  useEffect(() => {
    if (isAdminPage) {
      // Remove any social bar related elements that might have been injected
      document.querySelectorAll('.social-bar-container, [class*="social-bar"], [id*="socialbar"]').forEach(el => {
        if (el !== containerRef.current) {
          el.remove();
        }
      });
    }
  }, [isAdminPage]);

  // Don't render on admin pages
  if (isAdminPage) return null;
  if (!ads || ads.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="social-bar-container fixed bottom-0 left-0 right-0 z-[100]"
      data-ad-type="socialbar"
    />
  );
};

// Helper to check if content is a script tag
const isScriptContent = (content: string): boolean => {
  return content.trim().toLowerCase().startsWith("<script");
};

// Helper to inject script content into the page
const injectScript = (content: string): void => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  
  const scripts = tempDiv.querySelectorAll("script");
  scripts.forEach(script => {
    const newScript = document.createElement("script");
    if (script.src) {
      newScript.src = script.src;
      newScript.async = true;
    } else {
      newScript.textContent = script.textContent;
    }
    document.body.appendChild(newScript);
  });
};

// Pop-under, Popup, Smartlink handler hook
export const usePopupAds = (page: string = "all") => {
  const location = useLocation();
  const hasTriggered = useRef(false);
  const scriptsInjected = useRef(false);
  
  // Don't run on admin pages
  const isAdminPage = location.pathname.startsWith("/admin");

  const { data: popupAds } = useQuery({
    queryKey: ["popup-ads", page],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .in("ad_type", ["popup", "popunder", "smartlink"])
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      
      return (data as Ad[]).filter(ad => {
        if (!shouldDisplayOnPage(ad.pages, page)) return false;
        if (ad.start_date && new Date(ad.start_date) > new Date(now)) return false;
        if (ad.end_date && new Date(ad.end_date) < new Date(now)) return false;
        return true;
      });
    },
  });

  // Inject script-based popunder ads immediately (they handle their own triggers)
  useEffect(() => {
    // Don't inject on admin pages
    if (isAdminPage) return;
    
    if (!popupAds || popupAds.length === 0 || scriptsInjected.current) return;

    const scriptAds = popupAds.filter(ad => 
      (ad.ad_type === "popunder" || ad.ad_type === "popup") && 
      isScriptContent(ad.content)
    );

    if (scriptAds.length > 0) {
      // Check cooldown for script-based ads too
      const lastShown = localStorage.getItem("popup_script_last_shown");
      const now = Date.now();
      const cooldown = 30 * 60 * 1000; // 30 minutes

      if (lastShown && now - parseInt(lastShown) < cooldown) {
        return;
      }

      scriptsInjected.current = true;
      localStorage.setItem("popup_script_last_shown", now.toString());

      scriptAds.forEach(ad => {
        console.log(`Injecting ${ad.ad_type} script:`, ad.name);
        injectScript(ad.content);
      });
    }
  }, [popupAds, isAdminPage]);

  const triggerPopups = useCallback(() => {
    if (!popupAds || popupAds.length === 0 || hasTriggered.current) return;

    // Only trigger URL-based popups (scripts are already injected and handle themselves)
    const urlAds = popupAds.filter(ad => !isScriptContent(ad.content));
    
    if (urlAds.length === 0) return;

    // Check cooldown
    const lastShown = localStorage.getItem("popup_ads_last_shown");
    const now = Date.now();
    const cooldown = 30 * 60 * 1000; // 30 minutes

    if (lastShown && now - parseInt(lastShown) < cooldown) {
      return;
    }

    hasTriggered.current = true;
    localStorage.setItem("popup_ads_last_shown", now.toString());

    urlAds.forEach(ad => {
      try {
        if (ad.ad_type === "popup") {
          // Popup - opens in front
          const popup = window.open(
            ad.content, 
            "_blank", 
            "width=800,height=600,scrollbars=yes,resizable=yes"
          );
          if (popup) {
            popup.focus();
          }
        } else if (ad.ad_type === "popunder") {
          // Pop-under - opens behind
          const popup = window.open(ad.content, "_blank");
          if (popup) {
            popup.blur();
            window.focus();
          }
        } else if (ad.ad_type === "smartlink") {
          // Smartlink - redirect with tracking
          if (ad.content.startsWith("http")) {
            window.open(ad.content, "_blank");
          }
        }
      } catch (e) {
        console.warn("Popup blocked by browser", e);
      }
    });
  }, [popupAds]);

  useEffect(() => {
    // Don't add click listener on admin pages
    if (isAdminPage) return;
    
    if (!popupAds || popupAds.length === 0) return;

    // Only add click listener for URL-based ads
    const urlAds = popupAds.filter(ad => !isScriptContent(ad.content));
    if (urlAds.length === 0) return;

    const handleClick = () => {
      triggerPopups();
    };

    document.addEventListener("click", handleClick, { once: true });

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [popupAds, triggerPopups, isAdminPage]);
};
