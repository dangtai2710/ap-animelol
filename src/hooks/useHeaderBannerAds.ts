import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  is_active: boolean;
  pages: string[] | null;
  start_date: string | null;
  end_date: string | null;
}

const shouldDisplayOnPage = (adPages: string[] | null, currentPage: string): boolean => {
  if (!adPages || adPages.length === 0) return true;
  if (adPages.includes("all")) return true;
  return adPages.includes(currentPage);
};

export const useHeaderBannerAds = (page: string = "home") => {
  return useQuery({
    queryKey: ["header-banner-exists", page],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("advertisements")
        .select("id, is_active, pages, start_date, end_date")
        .eq("position", "header")
        .eq("is_active", true)
        .eq("ad_type", "banner");
      
      if (error) throw error;
      
      // Filter by page and date
      const validAds = (data as Ad[]).filter(ad => {
        if (!shouldDisplayOnPage(ad.pages, page)) return false;
        if (ad.start_date && new Date(ad.start_date) > new Date(now)) return false;
        if (ad.end_date && new Date(ad.end_date) < new Date(now)) return false;
        return true;
      });
      
      return validAds.length > 0;
    },
    staleTime: 60000, // Cache for 1 minute
  });
};
