import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { MovieCard } from "@/components/MovieCard";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Movie, fetchMoviesByType } from "@/lib/api";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { MovieFilters, FilterState } from "@/components/MovieFilters";

const ITEMS_PER_PAGE = 24;

const TvShowsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");

  // Get filters from URL
  const [filters, setFilters] = useState<FilterState>(() => ({
    genre: searchParams.get("the-loai") || undefined,
    country: searchParams.get("quoc-gia") || undefined,
    year: searchParams.get("nam") || undefined,
  }));

  // Sync filters with URL
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.genre) newParams.set("the-loai", filters.genre);
    if (filters.country) newParams.set("quoc-gia", filters.country);
    if (filters.year) newParams.set("nam", filters.year);
    const pageParam = searchParams.get("page");
    if (pageParam && pageParam !== "1") newParams.set("page", pageParam);
    setSearchParams(newParams, { replace: true });
  }, [filters]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setSearchParams({ page: "1" });
  };

  const { data: siteSettings } = useSiteSettings();
  const useExternalApi = siteSettings?.use_external_api === "true";
  const externalApiSource = siteSettings?.external_api_source || "phimapi";

  // Fetch from external API
  const { data: externalData, isLoading: externalLoading } = useQuery({
    queryKey: ["tv-shows-external", page, externalApiSource, filters],
    queryFn: async () => {
      const result = await fetchMoviesByType("tv-shows", page, {
        limit: ITEMS_PER_PAGE,
        useExternalApi: true,
        externalApiSource,
        category: filters.genre,
        country: filters.country,
      });
      return result;
    },
    enabled: useExternalApi,
  });

  // Fetch from local database with filters
  const { data: localData, isLoading: localLoading } = useQuery({
    queryKey: ["tv-shows-local", page, filters],
    queryFn: async (): Promise<{ movies: Movie[]; total: number }> => {
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

      if (movieIds && movieIds.length === 0) {
        return { movies: [], total: 0 };
      }

      let query = supabase
        .from("movies")
        .select("*", { count: "exact" })
        .in("type", ["tvshows", "series"]);

      if (movieIds) {
        query = query.in("id", movieIds);
      }

      if (filters.year) {
        query = query.eq("year", parseInt(filters.year));
      }

      const { data, error, count } = await query
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) return { movies: [], total: 0 };

      const movies: Movie[] = (data || []).map((m) => ({
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
    enabled: !useExternalApi,
  });

  const isLoading = useExternalApi ? externalLoading : localLoading;
  
  let movies: Movie[] = [];
  let totalCount = 0;
  let totalPages = 1;

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

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("page", newPage.toString());
      setSearchParams(newParams);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Layout>
      <SEOHead
        title="TV Shows - Xem phim bộ mới nhất"
        description="Danh sách TV Shows, phim bộ mới nhất, chất lượng cao, vietsub. Cập nhật liên tục các bộ phim hay nhất."
      />

      <div className="container py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Trang chủ
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">TV Shows</span>
        </nav>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">TV Shows</h1>
          <p className="text-muted-foreground">
            {totalCount || 0} phim bộ
            {useExternalApi && <span className="text-xs ml-2">(từ API bên ngoài)</span>}
          </p>
        </div>

        {/* Filters */}
        <MovieFilters
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          hideCategory={true}
        />

        {/* Movies Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Không có phim nào phù hợp với bộ lọc.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movies.map((movie, index) => (
                <MovieCard key={movie._id} movie={movie} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-1">
                  {page > 3 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                      >
                        1
                      </Button>
                      {page > 4 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                    </>
                  )}

                  {Array.from({ length: 5 }, (_, i) => page - 2 + i)
                    .filter((p) => p >= 1 && p <= totalPages)
                    .map((p) => (
                      <Button
                        key={p}
                        variant={page === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </Button>
                    ))}

                  {page < totalPages - 2 && (
                    <>
                      {page < totalPages - 3 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages}
                  onClick={() => goToPage(page + 1)}
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

export default TvShowsList;
