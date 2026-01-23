import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomepageWidget {
  id: string;
  title: string;
  static_path: string | null;
  widget_type: string;
  status_filter: string[];
  type_filter: string[];
  category_ids: string[];
  category_exclude: boolean;
  genre_ids: string[];
  genre_exclude: boolean;
  country_ids: string[];
  country_exclude: boolean;
  year_ids: string[];
  year_exclude: boolean;
  sort_by: string;
  posts_count: number;
  display_order: number;
  is_active: boolean;
  // External API options
  use_external_api?: boolean;
  external_api_source?: string;
}

interface Movie {
  id: string;
  name: string;
  slug: string;
  origin_name: string | null;
  poster_url: string | null;
  thumb_url: string | null;
  year: number | null;
  quality: string | null;
  lang: string | null;
  episode_current: string | null;
  status: string;
  type: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  content: string | null;
}

export interface TvChannel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  streaming_sources: any[];
  is_active: boolean;
  category_id: string | null;
  display_order: number;
}

export function useHomepageWidgets() {
  return useQuery({
    queryKey: ["homepage-widgets-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_widgets")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as HomepageWidget[];
    },
  });
}

export function useWidgetMovies(widget: HomepageWidget | null) {
  return useQuery({
    queryKey: ["widget-movies", widget?.id, widget?.type_filter, widget?.status_filter, widget?.use_external_api],
    queryFn: async () => {
      if (!widget) return [];

      // If widget uses external API
      if (widget.use_external_api) {
        const { fetchWidgetMoviesExternal } = await import("@/lib/api");
        return fetchWidgetMoviesExternal(
          widget.type_filter || [],
          widget.sort_by,
          widget.posts_count,
          widget.external_api_source || "phimapi"
        );
      }

      // Default: fetch from local database
      let query = supabase
        .from("movies")
        .select(`
          id, name, slug, origin_name, poster_url, thumb_url, 
          year, quality, lang, episode_current, status, type, 
          view_count, created_at, updated_at, content
        `)
        .is("deleted_at", null);

      // Apply type filter - filter out "all" and apply remaining types
      if (widget.type_filter && widget.type_filter.length > 0) {
        const typeFilters = widget.type_filter.filter(t => t !== "all");
        if (typeFilters.length > 0) {
          query = query.in("type", typeFilters);
        }
      }

      // Apply status filter - filter out "all" and apply remaining statuses
      if (widget.status_filter && widget.status_filter.length > 0) {
        const statusFilters = widget.status_filter.filter(s => s !== "all");
        if (statusFilters.length > 0) {
          query = query.in("status", statusFilters);
        }
      }

      // Apply sorting
      switch (widget.sort_by) {
        case "created_at":
          query = query.order("created_at", { ascending: false });
          break;
        case "updated_at":
          query = query.order("updated_at", { ascending: false });
          break;
        case "view_count":
          query = query.order("view_count", { ascending: false });
          break;
        case "random":
          // For random, we'll fetch more and shuffle client-side
          break;
        default:
          query = query.order("updated_at", { ascending: false });
      }

      query = query.limit(widget.posts_count * 2); // Fetch more for filtering

      const { data: movies, error } = await query;
      if (error) throw error;

      let filteredMovies = movies as Movie[];

      // Apply genre filter
      if (widget.genre_ids && widget.genre_ids.length > 0) {
        const { data: movieGenres } = await supabase
          .from("movie_genres")
          .select("movie_id, genre_id");

        if (movieGenres) {
          const movieGenreMap = new Map<string, string[]>();
          movieGenres.forEach((mg) => {
            const genres = movieGenreMap.get(mg.movie_id) || [];
            genres.push(mg.genre_id);
            movieGenreMap.set(mg.movie_id, genres);
          });

          if (widget.genre_exclude) {
            // Exclude movies with any of the selected genres
            filteredMovies = filteredMovies.filter((m) => {
              const genres = movieGenreMap.get(m.id) || [];
              return !widget.genre_ids.some((gid) => genres.includes(gid));
            });
          } else {
            // Include only movies with any of the selected genres
            filteredMovies = filteredMovies.filter((m) => {
              const genres = movieGenreMap.get(m.id) || [];
              return widget.genre_ids.some((gid) => genres.includes(gid));
            });
          }
        }
      }

      // Apply country filter
      if (widget.country_ids && widget.country_ids.length > 0) {
        const { data: movieCountries } = await supabase
          .from("movie_countries")
          .select("movie_id, country_id");

        if (movieCountries) {
          const movieCountryMap = new Map<string, string[]>();
          movieCountries.forEach((mc) => {
            const countries = movieCountryMap.get(mc.movie_id) || [];
            countries.push(mc.country_id);
            movieCountryMap.set(mc.movie_id, countries);
          });

          if (widget.country_exclude) {
            filteredMovies = filteredMovies.filter((m) => {
              const countries = movieCountryMap.get(m.id) || [];
              return !widget.country_ids.some((cid) => countries.includes(cid));
            });
          } else {
            filteredMovies = filteredMovies.filter((m) => {
              const countries = movieCountryMap.get(m.id) || [];
              return widget.country_ids.some((cid) => countries.includes(cid));
            });
          }
        }
      }

      // Apply year filter (using years table IDs)
      if (widget.year_ids && widget.year_ids.length > 0) {
        const { data: yearRecords } = await supabase
          .from("years")
          .select("id, year")
          .in("id", widget.year_ids);

        if (yearRecords) {
          const yearValues = yearRecords.map((y) => y.year);

          if (widget.year_exclude) {
            filteredMovies = filteredMovies.filter(
              (m) => !m.year || !yearValues.includes(m.year)
            );
          } else {
            filteredMovies = filteredMovies.filter(
              (m) => m.year && yearValues.includes(m.year)
            );
          }
        }
      }

      // Shuffle for random sort
      if (widget.sort_by === "random") {
        filteredMovies = filteredMovies.sort(() => Math.random() - 0.5);
      }

      // Limit to posts_count
      return filteredMovies.slice(0, widget.posts_count);
    },
    enabled: !!widget,
  });
}

export function useWidgetTvChannels(widget: HomepageWidget | null) {
  return useQuery({
    queryKey: ["widget-tv-channels", widget?.id, widget?.category_ids, widget?.sort_by],
    queryFn: async () => {
      if (!widget) return [];

      let query = supabase
        .from("tv_channels")
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null);

      // Apply sorting (except random, which is done client-side)
      if (widget.sort_by === "name") {
        query = query.order("name", { ascending: true });
      } else if (widget.sort_by !== "random") {
        query = query.order("display_order", { ascending: true });
      }

      // Apply TV category filter - only if category_ids has valid entries
      if (widget.category_ids && widget.category_ids.length > 0) {
        // Filter out empty strings and check if there are valid IDs
        const validCategoryIds = widget.category_ids.filter(id => id && id.trim() !== '');
        if (validCategoryIds.length > 0) {
          query = query.in("category_id", validCategoryIds);
        }
        // If no valid category IDs, fetch all channels (don't apply filter)
      }

      // Fetch more for random to allow shuffling
      const limit = widget.sort_by === "random" ? widget.posts_count * 2 : widget.posts_count;
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) throw error;
      
      let channels = data as TvChannel[];

      // Shuffle for random sort
      if (widget.sort_by === "random") {
        channels = channels.sort(() => Math.random() - 0.5);
        channels = channels.slice(0, widget.posts_count);
      }

      return channels;
    },
    enabled: !!widget && widget.widget_type === "tv_channels",
  });
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      
      const settings: Record<string, string | null> = {};
      data?.forEach((s) => {
        settings[s.setting_key] = s.setting_value;
      });
      return settings;
    },
  });
}
