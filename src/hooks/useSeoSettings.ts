import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeoSettings {
  // Site level
  site_name: string | null;
  site_description: string | null;
  site_keywords: string | null;
  favicon_url: string | null;
  og_image: string | null;
  head_meta_tags: string | null;
  
  // Homepage
  homepage_title: string | null;
  homepage_description: string | null;
  
  // Movie page templates (with variables)
  movie_title: string | null;
  movie_description: string | null;
  movie_seo_title: string | null;
  movie_seo_description: string | null;
  movie_seo_keywords: string | null;
  
  // Genre templates
  genre_title: string | null;
  genre_description: string | null;
  genre_seo_title: string | null;
  genre_seo_description: string | null;
  genre_seo_keywords: string | null;
  
  // Country templates
  country_title: string | null;
  country_description: string | null;
  country_seo_title: string | null;
  country_seo_description: string | null;
  country_seo_keywords: string | null;
  
  // Year templates
  year_seo_title: string | null;
  year_seo_description: string | null;
  
  // Actor templates
  actor_title: string | null;
  actor_description: string | null;
  actor_seo_title: string | null;
  actor_seo_description: string | null;
  
  // Director templates
  director_seo_title: string | null;
  director_seo_description: string | null;
  
  // Tag templates
  tag_title: string | null;
  tag_description: string | null;
  tag_seo_title: string | null;
  tag_seo_description: string | null;
  
  // Slug patterns
  slug_movie_info: string | null;
  slug_movie_watch: string | null;
  slug_genre: string | null;
  slug_country: string | null;
  slug_tag: string | null;
  slug_actor: string | null;
  slug_director: string | null;
}

const defaultSettings: SeoSettings = {
  site_name: "PhimHD",
  site_description: "Xem phim online chất lượng cao, vietsub, thuyết minh miễn phí.",
  site_keywords: "phim hay, xem phim, phim vietsub, phim thuyết minh, phim HD",
  favicon_url: null,
  og_image: null,
  head_meta_tags: null,
  homepage_title: "Xem phim online miễn phí chất lượng cao",
  homepage_description: "Xem phim online HD vietsub, thuyết minh miễn phí. Kho phim đa dạng với hàng ngàn bộ phim mới nhất.",
  movie_title: null,
  movie_description: null,
  movie_seo_title: "%phim% %tap% %chatluong% - Xem phim vietsub",
  movie_seo_description: "Xem phim %phim% %tap% %chatluong% vietsub, thuyết minh. %noidung%",
  movie_seo_keywords: "%phim%, %phimgoc%, %theloai%, xem phim %phim%",
  genre_title: null,
  genre_description: null,
  genre_seo_title: "Phim %theloai% hay nhất - Xem phim %theloai% vietsub",
  genre_seo_description: "Tổng hợp phim %theloai% hay nhất, mới nhất. Xem phim %theloai% vietsub, thuyết minh chất lượng HD miễn phí.",
  genre_seo_keywords: null,
  country_title: null,
  country_description: null,
  country_seo_title: "Phim %quocgia% hay nhất - Xem phim %quocgia% vietsub",
  country_seo_description: "Tổng hợp phim %quocgia% hay nhất, mới nhất. Xem phim %quocgia% vietsub, thuyết minh chất lượng HD miễn phí.",
  country_seo_keywords: null,
  year_seo_title: "Phim năm %nam% hay nhất - Xem phim mới %nam%",
  year_seo_description: "Tổng hợp phim năm %nam% hay nhất, mới nhất. Xem phim %nam% vietsub, thuyết minh chất lượng HD.",
  actor_title: null,
  actor_description: null,
  actor_seo_title: "Phim của %dienvien% - Xem các bộ phim có %dienvien%",
  actor_seo_description: "Tổng hợp các bộ phim có sự tham gia của diễn viên %dienvien%. Xem phim %dienvien% vietsub, thuyết minh.",
  director_seo_title: "Phim của đạo diễn %daodien% - Xem phim %daodien%",
  director_seo_description: "Tổng hợp các bộ phim của đạo diễn %daodien%. Xem phim %daodien% vietsub, thuyết minh.",
  tag_title: null,
  tag_description: null,
  tag_seo_title: "Phim %tag% - Xem phim theo từ khóa %tag%",
  tag_seo_description: "Tổng hợp phim theo từ khóa %tag%. Xem phim %tag% vietsub, thuyết minh chất lượng HD.",
  slug_movie_info: null,
  slug_movie_watch: null,
  slug_genre: null,
  slug_country: null,
  slug_tag: null,
  slug_actor: null,
  slug_director: null,
};

export function useSeoSettings() {
  return useQuery({
    queryKey: ["seo-settings"],
    queryFn: async (): Promise<SeoSettings> => {
      const { data, error } = await supabase
        .from("seo_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      // Start with default settings
      const settings: SeoSettings = { ...defaultSettings };

      // Override with database values
      data?.forEach((item) => {
        if (item.setting_key in settings && item.setting_value) {
          (settings as any)[item.setting_key] = item.setting_value;
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
