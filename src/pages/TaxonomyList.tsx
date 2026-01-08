import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { MovieCard } from "@/components/MovieCard";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Movie, fetchMoviesByType } from "@/lib/api";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { MovieFilters, FilterState } from "@/components/MovieFilters";
import { replaceSeoVariables, SeoVariables } from "@/lib/seoUtils";

interface TaxonomyData {
  id: string;
  name: string;
  slug?: string;
  seo_title?: string | null;
  seo_description?: string | null;
}

type TaxonomyType = "danh-muc" | "the-loai" | "quoc-gia" | "nam";

const ITEMS_PER_PAGE = 24;

// Map taxonomy slug to external API type for danh-muc
const slugToApiType: Record<string, string> = {
  "phim": "phim-moi-cap-nhat",
  "phim-bo": "phim-bo",
  "phim-le": "phim-le",
  "hoat-hinh": "hoat-hinh",
  "tv-shows": "tv-shows",
  "phim-vietsub": "phim-vietsub",
  "phim-thuyet-minh": "phim-thuyet-minh",
  "phim-long-tieng": "phim-long-tieng",
};

// Map filter type to movie type in database
const filterTypeToDbType: Record<string, string> = {
  "series": "series",
  "single": "single",
  "hoathinh": "hoathinh",
  "tvshows": "tvshows",
};

type ExternalApiTaxonomy = "danh-muc" | "the-loai" | "quoc-gia";

const TaxonomyList = () => {
  const { type, slug } = useParams<{ type: string; slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  
  // Get filters from URL
  const [filters, setFilters] = useState<FilterState>(() => ({
    type: searchParams.get("loai") || undefined,
    genre: searchParams.get("the-loai") || undefined,
    country: searchParams.get("quoc-gia") || undefined,
    year: searchParams.get("nam") || undefined,
  }));

  // Sync filters with URL
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.type) newParams.set("loai", filters.type);
    if (filters.genre) newParams.set("the-loai", filters.genre);
    if (filters.country) newParams.set("quoc-gia", filters.country);
    if (filters.year) newParams.set("nam", filters.year);
    const pageParam = searchParams.get("page");
    if (pageParam) newParams.set("page", pageParam);
    setSearchParams(newParams, { replace: true });
  }, [filters]);

  // Handle filter change
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to page 1 when filters change
  };

  const { data: siteSettings } = useSiteSettings();
  const { data: seoSettings } = useSeoSettings();
  const useExternalApi = siteSettings?.use_external_api === "true";
  const externalApiSource = siteSettings?.external_api_source || "phimapi";
  
  const canUseExternalApi = useExternalApi && slug && (
    (type === "danh-muc" && slugToApiType[slug]) ||
    type === "the-loai" ||
    type === "quoc-gia"
  );

  const { data: taxonomy, isLoading: taxonomyLoading } = useQuery({
    queryKey: ["taxonomy", type, slug],
    queryFn: async (): Promise<TaxonomyData | null> => {
      switch (type) {
        case "danh-muc": {
          const { data, error } = await supabase
            .from("movie_categories")
            .select("*")
            .eq("slug", slug!)
            .is("deleted_at", null)
            .single();
          if (error || !data) return null;
          return { id: data.id, name: data.name, slug: data.slug, seo_title: data.seo_title, seo_description: data.seo_description };
        }
        case "the-loai": {
          const { data, error } = await supabase
            .from("genres")
            .select("*")
            .eq("slug", slug!)
            .is("deleted_at", null)
            .single();
          if (error || !data) return null;
          return { id: data.id, name: data.name, slug: data.slug, seo_title: data.seo_title, seo_description: data.seo_description };
        }
        case "quoc-gia": {
          const { data, error } = await supabase
            .from("countries")
            .select("*")
            .eq("slug", slug!)
            .is("deleted_at", null)
            .single();
          if (error || !data) return null;
          return { id: data.id, name: data.name, slug: data.slug, seo_title: data.seo_title, seo_description: data.seo_description };
        }
        case "nam": {
          const { data, error } = await supabase
            .from("years")
            .select("*")
            .eq("year", parseInt(slug || "0"))
            .is("deleted_at", null)
            .single();
          if (error || !data) return null;
          return { id: data.id, name: data.year.toString(), seo_title: null, seo_description: null };
        }
        default:
          return null;
      }
    },
    enabled: !!type && !!slug,
  });

  // Fetch movies from external API if enabled
  const { data: externalData, isLoading: externalLoading } = useQuery<{
    data?: {
      items?: Movie[];
      params?: {
        pagination?: {
          totalPages?: number;
          totalItems?: number;
        };
      };
    };
  }>({
    queryKey: ["taxonomy-movies-external", type, slug, page, externalApiSource, filters],
    queryFn: async () => {
      const options: {
        limit: number;
        useExternalApi: boolean;
        externalApiSource: string;
        category?: string;
        country?: string;
      } = {
        limit: ITEMS_PER_PAGE,
        useExternalApi: true,
        externalApiSource,
      };
      
      let apiType = "phim-moi-cap-nhat";
      
      if (type === "danh-muc") {
        apiType = slugToApiType[slug!] || slug!;
      } else if (type === "the-loai") {
        apiType = "phim-moi-cap-nhat";
        options.category = slug;
      } else if (type === "quoc-gia") {
        apiType = "phim-moi-cap-nhat";
        options.country = slug;
      }

      // Apply additional filters
      if (filters.genre && type !== "the-loai") {
        options.category = filters.genre;
      }
      if (filters.country && type !== "quoc-gia") {
        options.country = filters.country;
      }
      
      const result = await fetchMoviesByType(apiType, page, options);
      return result;
    },
    enabled: !!canUseExternalApi,
  });

  // Fetch movies from local database with filters
  const { data: moviesData, isLoading: moviesLoading } = useQuery({
    queryKey: ["taxonomy-movies", type, slug, page, taxonomy?.id, filters],
    queryFn: async (): Promise<{ movies: Movie[], total: number }> => {
      if (!taxonomy && type !== "nam") return { movies: [], total: 0 };

      // Start with all movie IDs or filter by taxonomy
      let movieIds: string[] | null = null;

      switch (type) {
        case "danh-muc": {
          const { data } = await supabase
            .from("movie_category_map")
            .select("movie_id")
            .eq("category_id", taxonomy!.id);
          movieIds = data?.map(m => m.movie_id) || [];
          break;
        }
        case "the-loai": {
          const { data } = await supabase
            .from("movie_genres")
            .select("movie_id")
            .eq("genre_id", taxonomy!.id);
          movieIds = data?.map(m => m.movie_id) || [];
          break;
        }
        case "quoc-gia": {
          const { data } = await supabase
            .from("movie_countries")
            .select("movie_id")
            .eq("country_id", taxonomy!.id);
          movieIds = data?.map(m => m.movie_id) || [];
          break;
        }
      }

      // Apply additional filters to narrow down movie IDs
      if (filters.genre && type !== "the-loai") {
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
          const genreMovieIds = genreMovies?.map(m => m.movie_id) || [];
          if (movieIds) {
            movieIds = movieIds.filter(id => genreMovieIds.includes(id));
          } else {
            movieIds = genreMovieIds;
          }
        }
      }

      if (filters.country && type !== "quoc-gia") {
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

      // If we have an empty array after filtering, return empty
      if (movieIds && movieIds.length === 0) {
        return { movies: [], total: 0 };
      }

      let query = supabase.from("movies").select("*", { count: "exact" });
      
      // Apply movie IDs filter
      if (movieIds) {
        query = query.in("id", movieIds);
      }

      // Apply year filter from taxonomy or from filter
      if (type === "nam") {
        query = query.eq("year", parseInt(slug || "0"));
      }
      if (filters.year) {
        query = query.eq("year", parseInt(filters.year));
      }

      // Apply type filter
      if (filters.type && filterTypeToDbType[filters.type]) {
        query = query.eq("type", filterTypeToDbType[filters.type]);
      }

      const { data, error, count } = await query
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

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
    enabled: (!!taxonomy || type === "nam") && !canUseExternalApi,
  });

  const isLoading = canUseExternalApi ? externalLoading : moviesLoading;
  
  let movies: Movie[] = [];
  let totalPages = 1;
  let totalCount = 0;

  if (canUseExternalApi && externalData) {
    movies = externalData.data?.items || [];
    const pagination = externalData.data?.params?.pagination || {};
    totalPages = pagination.totalPages || 1;
    totalCount = pagination.totalItems || movies.length;
  } else if (moviesData) {
    movies = moviesData.movies;
    totalPages = Math.ceil((moviesData.total || 0) / ITEMS_PER_PAGE);
    totalCount = moviesData.total;
  }

  const getTaxonomyName = () => {
    if (taxonomy?.name) return taxonomy.name;
    if (canUseExternalApi && slug) {
      return slug.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    return slug || "";
  };

  const getTitle = () => {
    const name = getTaxonomyName();
    switch (type) {
      case "danh-muc":
        return `Phim ${name}`;
      case "the-loai":
        return `Phim thể loại ${name}`;
      case "quoc-gia":
        return `Phim ${name}`;
      case "nam":
        return `Phim năm ${name}`;
      default:
        return "Danh sách phim";
    }
  };

  const getBreadcrumbLabel = () => {
    switch (type) {
      case "danh-muc":
        return "Danh mục";
      case "the-loai":
        return "Thể loại";
      case "quoc-gia":
        return "Quốc gia";
      case "nam":
        return "Năm";
      default:
        return "";
    }
  };

  // Generate SEO using templates from settings
  const siteName = seoSettings?.site_name || siteSettings?.site_name || "PhimHD";
  const taxonomyName = getTaxonomyName();
  
  const seoVariables: SeoVariables = useMemo(() => ({
    sitename: siteName,
    theloai: type === "the-loai" ? taxonomyName : undefined,
    quocgia: type === "quoc-gia" ? taxonomyName : undefined,
    nam: type === "nam" ? taxonomyName : undefined,
  }), [siteName, type, taxonomyName]);

  const getSeoTitle = () => {
    // First check if taxonomy has custom SEO title
    if (taxonomy?.seo_title) return taxonomy.seo_title;
    
    // Otherwise use template from settings
    let template: string | null = null;
    switch (type) {
      case "the-loai":
        template = seoSettings?.genre_seo_title || seoSettings?.genre_title || "Phim %theloai% hay nhất - Xem phim %theloai% vietsub";
        break;
      case "quoc-gia":
        template = seoSettings?.country_seo_title || seoSettings?.country_title || "Phim %quocgia% hay nhất - Xem phim %quocgia% vietsub";
        break;
      case "nam":
        template = seoSettings?.year_seo_title || "Phim năm %nam% hay nhất - Xem phim mới %nam%";
        break;
      case "danh-muc":
        template = `Phim ${taxonomyName} - Xem phim ${taxonomyName} vietsub`;
        break;
    }
    
    if (template) {
      const result = replaceSeoVariables(template, seoVariables);
      return result || getTitle();
    }
    
    return getTitle();
  };

  const getSeoDescription = () => {
    // First check if taxonomy has custom SEO description
    if (taxonomy?.seo_description) return taxonomy.seo_description;
    
    // Otherwise use template from settings
    let template: string | null = null;
    switch (type) {
      case "the-loai":
        template = seoSettings?.genre_seo_description || seoSettings?.genre_description || "Tổng hợp phim %theloai% hay nhất, mới nhất. Xem phim %theloai% vietsub, thuyết minh chất lượng HD miễn phí.";
        break;
      case "quoc-gia":
        template = seoSettings?.country_seo_description || seoSettings?.country_description || "Tổng hợp phim %quocgia% hay nhất, mới nhất. Xem phim %quocgia% vietsub, thuyết minh chất lượng HD miễn phí.";
        break;
      case "nam":
        template = seoSettings?.year_seo_description || "Tổng hợp phim năm %nam% hay nhất, mới nhất. Xem phim %nam% vietsub, thuyết minh chất lượng HD.";
        break;
      case "danh-muc":
        template = `Tổng hợp phim ${taxonomyName} hay nhất. Xem phim ${taxonomyName} vietsub, thuyết minh chất lượng HD miễn phí.`;
        break;
    }
    
    if (template) {
      const result = replaceSeoVariables(template, seoVariables);
      return result || `Xem phim ${taxonomyName} mới nhất, chất lượng cao, vietsub`;
    }
    
    return `Xem phim ${taxonomyName} mới nhất, chất lượng cao, vietsub`;
  };

  const getSeoKeywords = () => {
    let template: string | null = null;
    switch (type) {
      case "the-loai":
        template = seoSettings?.genre_seo_keywords || `phim %theloai%, xem phim %theloai%, %theloai% hay`;
        break;
      case "quoc-gia":
        template = seoSettings?.country_seo_keywords || `phim %quocgia%, xem phim %quocgia%, %quocgia% hay`;
        break;
      case "nam":
        template = `phim năm %nam%, phim mới %nam%, xem phim %nam%`;
        break;
      case "danh-muc":
        template = `phim ${taxonomyName}, xem phim ${taxonomyName}, ${taxonomyName} hay`;
        break;
    }
    
    if (template) {
      return replaceSeoVariables(template, seoVariables);
    }
    
    return `phim ${taxonomyName}, xem phim ${taxonomyName}`;
  };

  if (taxonomyLoading && !canUseExternalApi) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!taxonomy && !canUseExternalApi && type !== "nam") {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy</h1>
          <p className="text-muted-foreground">Danh mục bạn tìm không tồn tại.</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">
            Về trang chủ
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title={getSeoTitle()}
        description={getSeoDescription()}
        keywords={getSeoKeywords()}
      />

      <div className="container py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span>{getBreadcrumbLabel()}</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">{getTaxonomyName()}</span>
        </nav>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">{getTitle()}</h1>
          <p className="text-muted-foreground">
            {totalCount || 0} phim
            {canUseExternalApi && <span className="text-xs ml-2">(từ API bên ngoài)</span>}
          </p>
        </div>

        {/* Filters */}
        <MovieFilters
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          hideGenre={type === "the-loai"}
          hideCountry={type === "quoc-gia"}
          hideYear={type === "nam"}
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
            <p className="text-muted-foreground">Chưa có phim nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movies.map((movie, index) => (
                <MovieCard
                  key={movie._id}
                  movie={movie}
                  index={index}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
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

export default TaxonomyList;