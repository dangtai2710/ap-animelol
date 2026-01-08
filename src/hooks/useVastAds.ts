import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VastAd {
  id: string;
  name: string;
  ad_type: string;
  content: string; // VAST XML URL
  position: string; // For mid-roll: "percent:50" or "seconds:30"
  is_active: boolean;
  pages: string[];
  display_order: number;
  start_date: string | null;
  end_date: string | null;
}

export interface MidrollTiming {
  type: "percent" | "seconds";
  value: number;
}

export interface VastMidrollAd extends VastAd {
  timing: MidrollTiming;
}

export interface VastConfig {
  preroll: VastAd | null;
  midroll: VastMidrollAd[];
  postroll: VastAd | null;
}

// Parse midroll timing from position field
function parseMidrollTiming(position: string): MidrollTiming {
  if (position.startsWith("seconds:")) {
    return {
      type: "seconds",
      value: parseInt(position.split(":")[1]) || 30,
    };
  }
  // Default to percent
  const value = parseInt(position.split(":")[1]) || 50;
  return {
    type: "percent",
    value: Math.min(90, Math.max(10, value)), // Clamp between 10-90%
  };
}

export function useVastAds(page: "movie" | "tv" = "movie") {
  return useQuery({
    queryKey: ["vast-ads", page],
    queryFn: async (): Promise<VastConfig> => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .in("ad_type", ["vast_preroll", "vast_midroll", "vast_postroll"])
        .eq("is_active", true)
        .or(`pages.cs.{all},pages.cs.{${page}}`)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Filter by date range
      const activeAds = (data || []).filter((ad) => {
        if (ad.start_date && new Date(ad.start_date) > new Date(now)) return false;
        if (ad.end_date && new Date(ad.end_date) < new Date(now)) return false;
        return true;
      }) as VastAd[];

      // Parse midroll ads with timing
      const midrollAds: VastMidrollAd[] = activeAds
        .filter((ad) => ad.ad_type === "vast_midroll")
        .map((ad) => ({
          ...ad,
          timing: parseMidrollTiming(ad.position),
        }));

      return {
        preroll: activeAds.find((ad) => ad.ad_type === "vast_preroll") || null,
        midroll: midrollAds,
        postroll: activeAds.find((ad) => ad.ad_type === "vast_postroll") || null,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
