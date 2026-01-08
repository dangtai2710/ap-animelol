// Movie API client - supports multiple sources
import { cachedFetch, CACHE_TTL, getCacheTTL } from "./apiCache";
export type ApiSource = "phimapi" | "nguonc";

const API_SOURCES = {
  phimapi: {
    base: "https://phimapi.com",
    list: "/danh-sach/phim-moi-cap-nhat",
    detail: "/phim",
  },
  nguonc: {
    base: "https://phim.nguonc.com/api",
    list: "/films/phim-moi-cap-nhat",
    detail: "/film",
  },
};

export interface Movie {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  year: number;
  type: string;
  quality: string;
  lang: string;
  time: string;
  episode_current: string;
  episode_total: string;
  category: Category[];
  country: Country[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Country {
  id: string;
  name: string;
  slug: string;
}

export interface Episode {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
  link_mp4: string;
}

export interface ServerData {
  server_name: string;
  server_data: Episode[];
}

export interface MovieDetail extends Movie {
  content: string;
  status: string;
  showtimes: string;
  trailer_url: string;
  actor: string[];
  director: string[];
  episodes: ServerData[];
}

export interface PaginatedResponse<T> {
  status: string;
  items: T[];
  pagination: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface MovieListResponse {
  status: boolean;
  items: Movie[];
  pagination: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface MovieDetailResponse {
  status: boolean;
  movie: MovieDetail;
  episodes: ServerData[];
}

// Fetch new updated movies from specified source
export async function fetchNewMovies(page: number = 1, source: ApiSource = "phimapi"): Promise<MovieListResponse> {
  const api = API_SOURCES[source];
  const url = `${api.base}${api.list}?page=${page}`;
  
  // Use cached fetch with 5 minute TTL
  const data = await cachedFetch<any>(url, { ttl: CACHE_TTL.MEDIUM });
  
  if (source === "nguonc") {
    // Transform nguonc response to standard format
    return {
      status: data.status === "success",
      items: (data.items || []).map((item: any) => ({
        _id: item.id || item.slug,
        name: item.name,
        slug: item.slug,
        origin_name: item.original_name || item.origin_name || "",
        poster_url: item.poster_url || "",
        thumb_url: item.thumb_url || "",
        year: parseInt(item.year) || 0,
        type: item.type || "series",
        quality: item.quality || "",
        lang: item.language || "",
        time: item.time || "",
        episode_current: item.current_episode || item.episode_current || "",
        episode_total: String(item.total_episodes || item.episode_total || ""),
        category: [],
        country: [],
      })),
      pagination: {
        totalItems: data.paginate?.total_items || data.total || 0,
        totalItemsPerPage: data.paginate?.items_per_page || 24,
        currentPage: data.paginate?.current_page || page,
        totalPages: data.paginate?.total_pages || 1,
      },
    };
  }
  
  return data;
}

// Fetch movie detail from external API (for crawling)
export async function fetchMovieDetailFromAPI(slug: string, source: ApiSource = "phimapi"): Promise<MovieDetailResponse> {
  const api = API_SOURCES[source];
  const url = `${api.base}${api.detail}/${slug}`;
  
  // Use cached fetch with 15 minute TTL (movie details change less frequently)
  const data = await cachedFetch<any>(url, { ttl: CACHE_TTL.LONG });
  
  if (source === "nguonc") {
    const movie = data.movie;
    if (!movie) throw new Error("Movie not found");
    
    // Parse categories from nguonc format - structure: { "1": { group: { name: "Định dạng" }, list: [...] }, ... }
    const categories: Category[] = [];
    const countries: Country[] = [];
    let year = new Date().getFullYear();
    let type = "series";
    
    if (movie.category && typeof movie.category === 'object') {
      // Iterate through all category groups
      Object.keys(movie.category).forEach((key) => {
        const catGroup = movie.category[key];
        if (!catGroup || !catGroup.group || !catGroup.list) return;
        
        const groupName = catGroup.group.name;
        
        // Parse genres from "Thể loại" group
        if (groupName === "Thể loại") {
          catGroup.list.forEach((item: any) => {
            if (item && item.name) {
              categories.push({ 
                id: item.id || '', 
                name: item.name, 
                slug: createSlugFromName(item.name) 
              });
            }
          });
        }
        
        // Parse countries from "Quốc gia" group
        if (groupName === "Quốc gia") {
          catGroup.list.forEach((item: any) => {
            if (item && item.name) {
              countries.push({ 
                id: item.id || '', 
                name: item.name, 
                slug: createSlugFromName(item.name) 
              });
            }
          });
        }
        
        // Parse year from "Năm" group
        if (groupName === "Năm" && catGroup.list?.[0]?.name) {
          const parsedYear = parseInt(catGroup.list[0].name);
          if (!isNaN(parsedYear)) {
            year = parsedYear;
          }
        }
        
        // Parse format/type from "Định dạng" group
        if (groupName === "Định dạng" && catGroup.list) {
          catGroup.list.forEach((item: any) => {
            if (item && item.name) {
              const itemName = item.name.toLowerCase();
              if (itemName.includes("lẻ") || itemName.includes("single")) {
                type = "single";
              } else if (itemName.includes("hoạt hình")) {
                type = "hoathinh";
              } else if (itemName.includes("tv show")) {
                type = "tvshows";
              } else if (itemName.includes("bộ") || itemName.includes("series")) {
                type = "series";
              }
            }
          });
        }
      });
    }
    
    // Parse episodes from nguonc format
    const episodes: ServerData[] = (movie.episodes || []).map((server: any) => ({
      server_name: server.server_name || "Server #1",
      server_data: (server.items || []).map((ep: any) => ({
        name: ep.name || "",
        slug: ep.slug || "",
        filename: "",
        link_embed: ep.embed || "",
        link_m3u8: ep.m3u8 || "",
        link_mp4: "",
      })),
    }));
    
    // Parse actors/directors - handle null values
    const actors = movie.casts 
      ? String(movie.casts).split(",").map((a: string) => a.trim()).filter(Boolean) 
      : [];
    const directors = movie.director 
      ? (Array.isArray(movie.director) ? movie.director : [movie.director]).filter(Boolean) 
      : [];
    
    return {
      status: true,
      movie: {
        _id: movie.id || movie.slug,
        name: movie.name || "",
        slug: movie.slug || "",
        origin_name: movie.original_name || "",
        poster_url: movie.poster_url || "",
        thumb_url: movie.thumb_url || "",
        year,
        type,
        quality: movie.quality || "",
        lang: movie.language || "",
        time: movie.time || "",
        episode_current: movie.current_episode || "",
        episode_total: String(movie.total_episodes || ""),
        content: movie.description || "",
        status: movie.current_episode?.toLowerCase()?.includes("hoàn tất") ? "completed" : "ongoing",
        showtimes: "",
        trailer_url: "",
        category: categories,
        country: countries,
        actor: actors,
        director: directors,
        episodes: [],
      },
      episodes,
    };
  }
  
  return data;
}

// Helper to create slug from name
function createSlugFromName(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Fetch movie by slug from Supabase, fallback to external API if not found
export async function fetchMovieDetail(slug: string): Promise<MovieDetailResponse> {
  const { supabase } = await import("@/integrations/supabase/client");
  
  // Fetch movie with related data from local database
  const { data: movie, error } = await supabase
    .from("movies")
    .select(`
      *,
      movie_genres(genres(*)),
      movie_countries(countries(*)),
      movie_actors(actors(*)),
      movie_directors(directors(*))
    `)
    .eq("slug", slug)
    .maybeSingle();

  // If not found in local database, try fetching from external API
  if (!movie) {
    console.log(`Movie "${slug}" not found in local DB, fetching from external API...`);
    try {
      // Try phimapi first
      return await fetchMovieDetailFromAPI(slug, "phimapi");
    } catch (apiError) {
      console.log("PhimAPI failed, trying NguonC...");
      try {
        return await fetchMovieDetailFromAPI(slug, "nguonc");
      } catch (nguoncError) {
        console.error("Failed to fetch from all external APIs:", nguoncError);
        throw new Error("Failed to fetch movie detail");
      }
    }
  }

  if (error) {
    throw new Error("Failed to fetch movie detail");
  }

  // Fetch episodes
  const { data: episodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("movie_id", movie.id)
    .order("server_name")
    .order("slug");

  // Transform data to match MovieDetailResponse format
  const transformedMovie: MovieDetail = {
    _id: movie.id,
    name: movie.name,
    slug: movie.slug,
    origin_name: movie.origin_name || "",
    poster_url: movie.poster_url || "",
    thumb_url: movie.thumb_url || "",
    year: movie.year || 0,
    type: movie.type,
    quality: movie.quality || "",
    lang: movie.lang || "",
    time: movie.time || "",
    episode_current: movie.episode_current || "",
    episode_total: movie.episode_total || "",
    content: movie.content || "",
    status: movie.status,
    showtimes: "",
    trailer_url: movie.trailer_url || "",
    category: movie.movie_genres?.map((mg: any) => ({
      id: mg.genres?.id,
      name: mg.genres?.name,
      slug: mg.genres?.slug,
    })).filter((c: any) => c.id) || [],
    country: movie.movie_countries?.map((mc: any) => ({
      id: mc.countries?.id,
      name: mc.countries?.name,
      slug: mc.countries?.slug,
    })).filter((c: any) => c.id) || [],
    actor: movie.movie_actors?.map((ma: any) => ma.actors?.name).filter(Boolean) || [],
    director: movie.movie_directors?.map((md: any) => md.directors?.name).filter(Boolean) || [],
    episodes: [],
  };

  // Group episodes by server
  const serverMap = new Map<string, Episode[]>();
  (episodes || []).forEach((ep: any) => {
    const serverName = ep.server_name || "Default";
    if (!serverMap.has(serverName)) {
      serverMap.set(serverName, []);
    }
    serverMap.get(serverName)!.push({
      name: ep.name,
      slug: ep.slug,
      filename: ep.filename || "",
      link_embed: ep.link_embed || "",
      link_m3u8: ep.link_m3u8 || "",
      link_mp4: ep.link_mp4 || "",
    });
  });

  const transformedEpisodes: ServerData[] = Array.from(serverMap.entries()).map(([name, data]) => ({
    server_name: name,
    server_data: data,
  }));

  return {
    status: true,
    movie: transformedMovie,
    episodes: transformedEpisodes,
  };
}

// Fetch movies by type - supports both local database and external API
export async function fetchMoviesByType(
  type: string,
  page: number = 1,
  options?: {
    category?: string;
    country?: string;
    year?: string;
    limit?: number;
    useExternalApi?: boolean;
    externalApiSource?: string;
    cacheTTL?: string; // Cache TTL in minutes from settings
  }
): Promise<any> {
  // If using external API
  if (options?.useExternalApi) {
    const source = options.externalApiSource || "phimapi";
    return fetchMoviesByTypeExternal(type, page, source, {
      limit: options.limit,
      category: options.category,
      country: options.country,
      year: options.year,
      cacheTTL: options.cacheTTL,
    });
  }
  
  // Default: fetch from local database
  return fetchMoviesByTypeLocal(type, page, options);
}

// Fetch from external API (phimapi, nguonc)
async function fetchMoviesByTypeExternal(
  type: string,
  page: number,
  source: string,
  options?: { limit?: number; category?: string; country?: string; year?: string; cacheTTL?: string }
): Promise<any> {
  const apiSource = API_SOURCES[source as keyof typeof API_SOURCES] || API_SOURCES.phimapi;
  
  console.log(`[fetchMoviesByTypeExternal] type: ${type}, page: ${page}, source: ${source}, options:`, options);
  
  // Build URL based on source
  let url: string;
  if (source === "nguonc") {
    // NguonC API format
    const typeMap: Record<string, string> = {
      "phim-bo": "phim-bo",
      "phim-le": "phim-le",
      "hoat-hinh": "hoat-hinh",
      "tv-shows": "tv-shows",
    };
    const apiType = typeMap[type] || type;
    url = `${apiSource.base}/api/films/danh-sach/${apiType}?page=${page}`;
  } else {
    // PhimAPI v1/api supports query params for filtering
    // Build URL - always use danh-sach endpoint with query params for consistent filtering
    url = `${apiSource.base}/v1/api/danh-sach/${type}?page=${page}`;
    
    // Add filter query parameters
    if (options?.category) {
      url += `&category=${options.category}`;
    }
    if (options?.country) {
      url += `&country=${options.country}`;
    }
    if (options?.year) {
      url += `&year=${options.year}`;
    }
    if (options?.limit) {
      url += `&limit=${options.limit}`;
    }
  }
  
  console.log(`[fetchMoviesByTypeExternal] URL: ${url}`);
  
  // Use dynamic cache TTL from settings, fallback to MEDIUM (5 minutes)
  const ttl = options?.cacheTTL ? getCacheTTL(options.cacheTTL) : CACHE_TTL.MEDIUM;
  const data = await cachedFetch<any>(url, { ttl });
  console.log(`[fetchMoviesByTypeExternal] Response (TTL: ${ttl/1000}s):`, data);
  
  // Normalize response format
  if (source === "nguonc") {
    return normalizeNguoncResponse(data);
  }
  
  // Normalize phimapi response - add full URLs and apply client-side filtering if needed
  return normalizePhimapiResponse(data, options);
}

// Normalize PhimAPI response to ensure full URLs and apply client-side filtering
function normalizePhimapiResponse(
  data: any, 
  options?: { category?: string; country?: string; year?: string }
): any {
  let items = (data.data?.items || []).map((item: any) => {
    const posterUrl = item.poster_url?.startsWith("http") 
      ? item.poster_url 
      : item.poster_url 
        ? `https://phimimg.com/${item.poster_url}` 
        : "";
    const thumbUrl = item.thumb_url?.startsWith("http") 
      ? item.thumb_url 
      : item.thumb_url 
        ? `https://phimimg.com/${item.thumb_url}` 
        : "";
        
    return {
      _id: item._id || item.slug,
      name: item.name,
      slug: item.slug,
      origin_name: item.origin_name || "",
      poster_url: posterUrl || thumbUrl,
      thumb_url: thumbUrl || posterUrl,
      year: item.year || 0,
      type: item.type || "single",
      quality: item.quality || "",
      lang: item.lang || "",
      time: item.time || "",
      episode_current: item.episode_current || "",
      episode_total: item.episode_total || "",
      category: item.category || [],
      country: item.country || [],
    };
  });

  // Apply client-side filtering for combined filters
  // (API may not fully support multiple filter params)
  if (options?.category) {
    items = items.filter((item: any) => 
      item.category?.some((cat: any) => cat.slug === options.category)
    );
  }
  if (options?.country) {
    items = items.filter((item: any) => 
      item.country?.some((c: any) => c.slug === options.country)
    );
  }
  if (options?.year) {
    const yearNum = parseInt(options.year);
    items = items.filter((item: any) => item.year === yearNum);
  }

  return {
    status: data.status,
    data: {
      items,
      params: data.data?.params || {
        pagination: {
          totalItems: items.length,
          totalItemsPerPage: 24,
          currentPage: 1,
          totalPages: 1,
        },
      },
    },
  };
}

// Normalize NguonC API response to match phimapi format
function normalizeNguoncResponse(data: any): any {
  const items = (data.items || []).map((item: any) => ({
    _id: item.slug,
    name: item.name,
    slug: item.slug,
    origin_name: item.original_name,
    poster_url: item.thumb_url || item.poster_url,
    thumb_url: item.thumb_url,
    year: item.year,
    type: item.type,
    quality: item.current_episode,
    lang: item.language,
    time: item.time,
    episode_current: item.current_episode,
    episode_total: item.total_episodes,
    category: item.category || [],
    country: item.country || [],
  }));

  return {
    status: true,
    data: {
      items,
      params: {
        pagination: {
          totalItems: data.paginate?.total_items || items.length,
          totalItemsPerPage: data.paginate?.items_per_page || 24,
          currentPage: data.paginate?.current_page || 1,
          totalPages: data.paginate?.total_pages || 1,
        },
      },
    },
  };
}

// Fetch from local database (only crawled movies)
async function fetchMoviesByTypeLocal(
  type: string,
  page: number,
  options?: { limit?: number }
): Promise<any> {
  const { supabase } = await import("@/integrations/supabase/client");
  
  const limit = options?.limit || 24;
  const offset = (page - 1) * limit;
  
  // Map URL type to database type
  const typeMap: Record<string, string> = {
    "phim-bo": "series",
    "phim-le": "single", 
    "hoat-hinh": "hoathinh",
    "tv-shows": "tvshows",
    "phim-vietsub": "vietsub",
    "phim-thuyet-minh": "thuyetminh",
    "phim-long-tieng": "longtieng",
  };
  
  const dbType = typeMap[type] || type;
  
  // Build query
  let query = supabase
    .from("movies")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  
  // Filter by type
  if (dbType === "vietsub") {
    query = query.ilike("lang", "%vietsub%");
  } else if (dbType === "thuyetminh") {
    query = query.ilike("lang", "%thuyết minh%");
  } else if (dbType === "longtieng") {
    query = query.ilike("lang", "%lồng tiếng%");
  } else {
    query = query.eq("type", dbType);
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1);
  
  const { data: movies, count, error } = await query;
  
  if (error) throw new Error("Failed to fetch movies from database");
  
  // Transform to match expected format
  const items = (movies || []).map(movie => ({
    _id: movie.id,
    name: movie.name,
    slug: movie.slug,
    origin_name: movie.origin_name,
    poster_url: movie.poster_url,
    thumb_url: movie.thumb_url,
    year: movie.year,
    type: movie.type,
    quality: movie.quality,
    lang: movie.lang,
    time: movie.time,
    episode_current: movie.episode_current,
    episode_total: movie.episode_total,
    category: [],
    country: [],
  }));
  
  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    status: true,
    data: {
      items,
      params: {
        pagination: {
          totalItems,
          totalItemsPerPage: limit,
          currentPage: page,
          totalPages,
        },
      },
    },
  };
}

// Map internal type values to API endpoints
function mapTypeToEndpoint(type: string): string {
  const typeMap: Record<string, string> = {
    "series": "phim-bo",
    "single": "phim-le", 
    "hoathinh": "hoat-hinh",
    "tvshows": "tv-shows",
    "phim-bo": "phim-bo",
    "phim-le": "phim-le",
    "hoat-hinh": "hoat-hinh",
    "tv-shows": "tv-shows",
  };
  return typeMap[type] || "phim-moi-cap-nhat";
}

// Fetch movies for widgets - supports external API with local data priority for duplicates
export async function fetchWidgetMoviesExternal(
  typeFilter: string[],
  sortBy: string,
  limit: number,
  source: string = "phimapi"
): Promise<any[]> {
  try {
    const apiSource = API_SOURCES[source as keyof typeof API_SOURCES] || API_SOURCES.phimapi;
    
    // Determine type to fetch - map internal types to API endpoints
    const filteredTypes = typeFilter.filter(t => t !== "all");
    const type = filteredTypes.length > 0 
      ? mapTypeToEndpoint(filteredTypes[0]) 
      : "phim-moi-cap-nhat";
    
    console.log(`[fetchWidgetMoviesExternal] Fetching from ${source}, type: ${type}, limit: ${limit}`);
    
    let url: string;
    if (source === "nguonc") {
      url = `${apiSource.base}/api/films/danh-sach/${type}?page=1`;
    } else {
      url = `${apiSource.base}/v1/api/danh-sach/${type}?page=1&limit=${limit}`;
    }
    
    console.log(`[fetchWidgetMoviesExternal] URL: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[fetchWidgetMoviesExternal] Failed to fetch: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`[fetchWidgetMoviesExternal] Response:`, data);
    
    // Get items based on source and response structure
    // phimapi /danh-sach/ returns { items: [] } directly
    // phimapi /v1/api/ returns { data: { items: [] } }
    let externalItems: any[];
    if (source === "nguonc") {
      externalItems = data.items || [];
    } else {
      // Try both response structures
      externalItems = data.items || data.data?.items || [];
    }
    
    console.log(`[fetchWidgetMoviesExternal] Found ${externalItems.length} items`);
    
    if (externalItems.length === 0) {
      return [];
    }
    
    // Fetch local movies to check for duplicates
    const { supabase } = await import("@/integrations/supabase/client");
    const slugs = externalItems.map((item: any) => item.slug);
    
    const { data: localMovies } = await supabase
      .from("movies")
      .select("*")
      .in("slug", slugs)
      .is("deleted_at", null);
    
    const localMovieMap = new Map((localMovies || []).map(m => [m.slug, m]));
    
    // Merge: prioritize local data for duplicates
    return externalItems.slice(0, limit).map((item: any) => {
      const localMovie = localMovieMap.get(item.slug);
      if (localMovie) {
        // Use local movie data (already crawled)
        return {
          id: localMovie.id,
          name: localMovie.name,
          slug: localMovie.slug,
          origin_name: localMovie.origin_name,
          poster_url: localMovie.poster_url,
          thumb_url: localMovie.thumb_url,
          year: localMovie.year,
          quality: localMovie.quality,
          lang: localMovie.lang,
          episode_current: localMovie.episode_current,
          status: localMovie.status,
          type: localMovie.type,
          view_count: localMovie.view_count,
          created_at: localMovie.created_at,
          updated_at: localMovie.updated_at,
          content: localMovie.content,
          _source: "local",
        };
      }
      
      // Use external data - construct proper poster/thumb URLs for phimapi
      const posterUrl = item.poster_url?.startsWith("http") 
        ? item.poster_url 
        : item.poster_url 
          ? `https://phimimg.com/${item.poster_url}` 
          : null;
      const thumbUrl = item.thumb_url?.startsWith("http") 
        ? item.thumb_url 
        : item.thumb_url 
          ? `https://phimimg.com/${item.thumb_url}` 
          : null;
      
      return {
        id: item._id || item.slug,
        name: item.name,
        slug: item.slug,
        origin_name: item.origin_name || item.original_name || "",
        poster_url: posterUrl || thumbUrl,
        thumb_url: thumbUrl || posterUrl,
        year: item.year || 0,
        quality: item.quality || item.current_episode || "",
        lang: item.lang || item.language || "",
        episode_current: item.episode_current || item.current_episode || "",
        status: "ongoing",
        type: item.type || "single",
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        _source: "external",
      };
    });
  } catch (error) {
    console.error("[fetchWidgetMoviesExternal] Error:", error);
    return [];
  }
}

// Search movies
export async function searchMovies(keyword: string, page: number = 1): Promise<any> {
  const response = await fetch(`${API_SOURCES.phimapi.base}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
  if (!response.ok) throw new Error("Failed to search movies");
  return response.json();
}

// Fetch categories
export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_SOURCES.phimapi.base}/the-loai`);
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
}

// Fetch countries
export async function fetchCountries(): Promise<Country[]> {
  const response = await fetch(`${API_SOURCES.phimapi.base}/quoc-gia`);
  if (!response.ok) throw new Error("Failed to fetch countries");
  return response.json();
}

// Get full poster URL
export function getPosterUrl(url: string): string {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http")) return url;
  return `https://phimimg.com/${url}`;
}

// Get thumb URL
export function getThumbUrl(url: string): string {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http")) return url;
  return `https://phimimg.com/${url}`;
}
