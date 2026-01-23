import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Movie } from "@/lib/api";
import { cachedFetch, CACHE_TTL } from "@/lib/apiCache";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const ITEMS_PER_PAGE = 24;

const AllMovies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1");

  // Get site settings for external API option
  const { data: siteSettings } = useSiteSettings();
  const useExternalApi = siteSettings?.use_external_api === "true";
  const externalApiSource = siteSettings?.external_api_source || "phimapi";

  // Fetch from external API - use "phim-moi" endpoint which contains all updated movies
  const { data: externalData, isLoading: externalLoading, isError: externalError } = useQuery({
    queryKey: ["all-movies-external", currentPage, externalApiSource],
    queryFn: async () => {
      console.log("[AllMovies] Fetching from external API, page:", currentPage);
      // PhimAPI uses /danh-sach/phim-moi for latest movies across all types
      const apiBase = externalApiSource === "nguonc" 
        ? "https://phim.nguonc.com" 
        : "https://phimapi.com";
      
      const url = externalApiSource === "nguonc"
        ? `${apiBase}/api/films/danh-sach/phim-moi-cap-nhat?page=${currentPage}`
        : `${apiBase}/danh-sach-phim?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
      
      console.log("[AllMovies] Fetching URL:", url);
      
      // Use cached fetch with 5 minute TTL
      const data = await cachedFetch<any>(url, { ttl: CACHE_TTL.MEDIUM });
      
      // Normalize response
      const items = (data.items || []).map((item: any) => {
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
      
      return {
        data: {
          items,
          params: {
            pagination: data.pagination || {
              totalItems: data.totalItems || items.length,
              totalPages: data.totalPages || Math.ceil((data.totalItems || items.length) / ITEMS_PER_PAGE),
              currentPage: currentPage,
            },
          },
        },
      };
    },
    enabled: useExternalApi,
    retry: 1,
  });

  // Fetch total count from local database
  const { data: countData } = useQuery({
    queryKey: ["movies-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("movies")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !useExternalApi,
  });

  // Fetch movies from local database
  const { data: localMovies, isLoading: localLoading } = useQuery({
    queryKey: ["all-movies-local", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Transform to Movie type
      return (data || []).map((m) => ({
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
        category: [],
        country: [],
      })) as Movie[];
    },
    enabled: !useExternalApi,
  });

  const isLoading = useExternalApi ? externalLoading : localLoading;
  const hasError = useExternalApi && externalError;
  
  let movies: Movie[] = [];
  let totalItems = 0;
  let totalPages = 1;

  if (useExternalApi && externalData) {
    movies = externalData.data?.items || [];
    const pagination = externalData.data?.params?.pagination || {};
    totalPages = pagination.totalPages || 1;
    totalItems = pagination.totalItems || movies.length;
  } else {
    movies = localMovies || [];
    totalItems = countData || 0;
    totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams({ page: page.toString() });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Layout>
      <SEOHead 
        title="Tất cả phim"
        description="Xem tất cả phim có trên website, cập nhật liên tục với chất lượng cao nhất."
      />
      
      <div className="container px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            Tất cả phim
          </h1>
          <span className="text-sm text-muted-foreground">
            {totalItems.toLocaleString()} phim
            {useExternalApi && <span className="text-xs ml-2">(từ API bên ngoài)</span>}
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {[...Array(18)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <p className="text-destructive">Có lỗi xảy ra khi tải dữ liệu từ API bên ngoài</p>
            <Button onClick={() => window.location.reload()}>Thử lại</Button>
          </div>
        )}

        {/* Movie grid */}
        {!isLoading && !hasError && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {movies.map((movie, index) => (
                <MovieCard key={movie._id} movie={movie} index={index} />
              ))}
            </div>

            {/* Empty state */}
            {movies.length === 0 && (
              <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">Không có phim nào</p>
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

            {/* Page info */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Trang {currentPage} / {totalPages}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AllMovies;
