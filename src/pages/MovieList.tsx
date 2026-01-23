import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { MovieCard } from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { fetchMoviesByType, Movie } from "@/lib/api";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { MovieFilters, FilterState } from "@/components/MovieFilters";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";

const typeLabels: Record<string, string> = {
  "phim-bo": "Phim Bộ",
  "phim-le": "Phim Lẻ",
  "hoat-hinh": "Hoạt Hình",
  "tv-shows": "TV Shows",
  "phim-vietsub": "Phim Vietsub",
  "phim-thuyet-minh": "Phim Thuyết Minh",
  "phim-long-tieng": "Phim Lồng Tiếng",
};

const typeToDbType: Record<string, string> = {
  "phim-bo": "series",
  "phim-le": "single",
  "hoat-hinh": "hoathinh",
  "tv-shows": "tvshows",
};

const ITEMS_PER_PAGE = 24;

const MovieList = () => {
  const { type } = useParams<{ type: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1");
  
  // Get filters from URL
  const [filters, setFilters] = useState<FilterState>(() => ({
    type: searchParams.get("loai") || undefined,
    genre: searchParams.get("the-loai") || undefined,
    country: searchParams.get("quoc-gia") || undefined,
    year: searchParams.get("nam") || undefined,
  }));

  // Sync filters from URL when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlFilters: FilterState = {
      type: searchParams.get("loai") || undefined,
      genre: searchParams.get("the-loai") || undefined,
      country: searchParams.get("quoc-gia") || undefined,
      year: searchParams.get("nam") || undefined,
    };
    // Only update if filters changed (compare as JSON to avoid infinite loop)
    if (JSON.stringify(urlFilters) !== JSON.stringify(filters)) {
      setFilters(urlFilters);
    }
  }, [searchParams]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Reset page to 1 but keep filter params in URL
    const newParams = new URLSearchParams();
    if (newFilters.type) newParams.set("loai", newFilters.type);
    if (newFilters.genre) newParams.set("the-loai", newFilters.genre);
    if (newFilters.country) newParams.set("quoc-gia", newFilters.country);
    if (newFilters.year) newParams.set("nam", newFilters.year);
    newParams.set("page", "1");
    setSearchParams(newParams, { replace: true });
  };
  
  const { data: siteSettings } = useSiteSettings();
  const useExternalApi = siteSettings?.use_external_api === "true";
  const externalApiSource = siteSettings?.external_api_source || "phimapi";
  const cacheTTL = siteSettings?.api_cache_ttl || "5";
  const autoRefresh = siteSettings?.api_auto_refresh !== "false";

  // Calculate staleTime based on settings (in milliseconds)
  const staleTime = parseInt(cacheTTL, 10) * 60 * 1000;

  // External API query with dynamic cache
  const { data: externalData, isLoading: externalLoading, error: externalError } = useQuery({
    queryKey: ["movieList", type, currentPage, useExternalApi, externalApiSource, filters, cacheTTL],
    queryFn: () => fetchMoviesByType(type!, currentPage, { 
      limit: ITEMS_PER_PAGE,
      useExternalApi,
      externalApiSource,
      category: filters.genre,
      country: filters.country,
      year: filters.year,
      cacheTTL,
    }),
    enabled: !!type && useExternalApi,
    staleTime: autoRefresh ? staleTime : Infinity, // Auto refresh when stale if enabled
    gcTime: staleTime * 2, // Keep in cache longer
  });

  // Local database query with filters
  const { data: localData, isLoading: localLoading, error: localError } = useQuery({
    queryKey: ["movieListLocal", type, currentPage, filters],
    queryFn: async (): Promise<{ movies: Movie[], total: number }> => {
      // Start by getting movie IDs that match genre filter
      let movieIds: string[] | null = null;

      if (filters.genre) {
        const { data: genreData } = await supabase
          .from("genres")
          .select("id")
          .eq("slug", filters.genre)
          .single();
        if (genreData) {
          const { data: genreMovies } = await supabase
            .from("movie_genres")
            .select("movie_id")
            .eq("genre_id", genreData.id);
          movieIds = genreMovies?.map(m => m.movie_id) || [];
        }
      }

      if (filters.country) {
        const { data: countryData } = await supabase
          .from("countries")
          .select("id")
          .eq("slug", filters.country)
          .single();
        if (countryData) {
          const { data: countryMovies } = await supabase
            .from("movie_countries")
            .select("movie_id")
            .eq("country_id", countryData.id);
          const countryMovieIds = countryMovies?.map(m => m.movie_id) || [];
          if (movieIds) {
            movieIds = movieIds.filter(id => countryMovieIds.includes(id));
          } else {
            movieIds = countryMovieIds;
          }
        }
      }

      // If filters resulted in empty array, return empty
      if (movieIds && movieIds.length === 0) {
        return { movies: [], total: 0 };
      }

      let query = supabase.from("movies").select("*", { count: "exact" });

      // Apply movie type filter from URL param
      if (type && typeToDbType[type]) {
        query = query.eq("type", typeToDbType[type]);
      }

      // Apply additional type filter from filter dropdown
      if (filters.type) {
        const filterTypeMap: Record<string, string> = {
          "series": "series",
          "single": "single",
          "hoathinh": "hoathinh",
          "tvshows": "tvshows",
        };
        if (filterTypeMap[filters.type]) {
          query = query.eq("type", filterTypeMap[filters.type]);
        }
      }

      // Apply movie IDs filter
      if (movieIds) {
        query = query.in("id", movieIds);
      }

      // Apply year filter
      if (filters.year) {
        query = query.eq("year", parseInt(filters.year));
      }

      const { data, error, count } = await query
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) return { movies: [], total: 0 };

      const movies: Movie[] = (data || []).map(m => ({
        _id: m.id,
        name: m.name,
        slug: m.slug,
        origin_name: m.origin_name || "",
        poster_url: m.poster_url || "",
        thumb_url: m.thumb_url || "",
        year: m.year || 0,
        type: m.type,
        quality: m.quality || "",
        lang: m.lang || "",
        time: m.time || "",
        episode_current: m.episode_current || "",
        episode_total: m.episode_total || "",
        view: m.view_count || 0,
        content: m.content || "",
        category: [],
        country: [],
      }));

      return { movies, total: count || 0 };
    },
    enabled: !!type && !useExternalApi,
  });

  const isLoading = useExternalApi ? externalLoading : localLoading;
  const error = useExternalApi ? externalError : localError;

  let movies: Movie[] = [];
  let totalPages = 1;
  let totalCount = 0;

  if (useExternalApi && externalData) {
    movies = externalData.data?.items || [];
    const pagination = externalData.data?.params?.pagination || {};
    totalPages = pagination.totalPages || 1;
    totalCount = pagination.totalItems || movies.length;
  } else if (localData) {
    movies = localData.movies;
    totalPages = Math.ceil((localData.total || 0) / ITEMS_PER_PAGE);
    totalCount = localData.total;
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("page", page.toString());
      setSearchParams(newParams);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const title = type ? typeLabels[type] || type : "Danh sách phim";

  return (
    <Layout>
      <SEOHead 
        title={title}
        description={`Xem ${title.toLowerCase()} mới nhất, chất lượng cao, vietsub`}
      />
      <div className="container px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm">{totalCount} phim</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <MovieFilters
            currentFilters={filters}
            onFilterChange={handleFilterChange}
            hideCategory={!!type} // Hide category filter when on specific type page
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] rounded-lg bg-muted" />
                <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
                <div className="mt-1 h-3 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">Có lỗi xảy ra khi tải dữ liệu</p>
          </div>
        )}

        {/* Movie grid */}
        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {movies.map((movie, index) => (
                <MovieCard key={movie._id} movie={movie} index={index} />
              ))}
            </div>

            {/* Empty state */}
            {movies.length === 0 && (
              <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">Không có phim nào phù hợp với bộ lọc</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-10 w-10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {/* First page */}
                  {currentPage > 3 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        className="h-10 w-10"
                      >
                        1
                      </Button>
                      {currentPage > 4 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                    </>
                  )}

                  {/* Pages around current */}
                  {Array.from({ length: 5 }, (_, i) => currentPage - 2 + i)
                    .filter((page) => page >= 1 && page <= totalPages)
                    .map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="h-10 w-10"
                      >
                        {page}
                      </Button>
                    ))}

                  {/* Last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        className="h-10 w-10"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-10 w-10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default MovieList;
