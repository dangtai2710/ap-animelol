import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_url: string | null;
  site_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  google_analytics_id: string | null;
  google_tag_manager_id: string | null;
  facebook_app_id: string | null;
  head_html: string | null;
  footer_html: string | null;
  // External API settings
  use_external_api: string | null;
  external_api_source: string | null;
  api_cache_ttl: string | null;
  api_auto_refresh: string | null;
  // Auth settings
  auth_login_enabled: string | null;
  auth_signup_enabled: string | null;
  auth_custom_path_enabled: string | null;
  auth_custom_path: string | null;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      const settings: SiteSettings = {
        site_url: null,
        site_name: null,
        logo_url: null,
        favicon_url: null,
        google_analytics_id: null,
        google_tag_manager_id: null,
        facebook_app_id: null,
        head_html: null,
        footer_html: null,
        use_external_api: null,
        external_api_source: null,
        api_cache_ttl: null,
        api_auto_refresh: null,
        auth_login_enabled: null,
        auth_signup_enabled: null,
        auth_custom_path_enabled: null,
        auth_custom_path: null,
      };

      data?.forEach((item) => {
        if (item.setting_key in settings) {
          (settings as any)[item.setting_key] = item.setting_value;
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Helper to check if external API is enabled
export function useExternalApiEnabled() {
  const { data: settings } = useSiteSettings();
  return settings?.use_external_api === "true";
}

// Helper to get external API settings
export function useExternalApiSettings() {
  const { data: settings, isLoading } = useSiteSettings();
  return {
    isLoading,
    enabled: settings?.use_external_api === "true",
    source: settings?.external_api_source || "phimapi",
    cacheTTL: settings?.api_cache_ttl || "5",
    autoRefresh: settings?.api_auto_refresh !== "false",
  };
}

// Helper to get auth settings
export function useAuthSettings() {
  const { data: settings, isLoading } = useSiteSettings();
  return {
    isLoading,
    loginEnabled: settings?.auth_login_enabled !== "false",
    signupEnabled: settings?.auth_signup_enabled !== "false",
    customPathEnabled: settings?.auth_custom_path_enabled === "true",
    customPath: settings?.auth_custom_path || null,
  };
}
