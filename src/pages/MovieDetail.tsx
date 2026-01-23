import { useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Film,
  Globe,
  Tag,
  ChevronDown,
  ChevronUp,
  Server,
  Radio
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ThemeButton } from "@/components/ThemeButton";
import { SEOHead } from "@/components/SEOHead";
import VideoPlayer from "@/components/VideoPlayer";
import { RelatedMovies } from "@/components/RelatedMovies";
import TableOfContents from "@/components/TableOfContents";
import MovieSchema from "@/components/MovieSchema";
import { FacebookComments } from "@/components/FacebookComments";
import { MovieRating } from "@/components/MovieRating";
import { ShareButtons } from "@/components/ShareButtons";
import { Advertisement, usePopupAds } from "@/components/Advertisement";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { fetchMovieDetail, getThumbUrl, getPosterUrl } from "@/lib/api";
import { replaceSeoVariables, extractMovieVariables, truncateText } from "@/lib/seoUtils";

type SourceType = "auto" | "m3u8" | "embed";

const MovieDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [selectedServer, setSelectedServer] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [showFullContent, setShowFullContent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("auto");

  const { data: siteSettings } = useSiteSettings();
  const { data: seoSettings } = useSeoSettings();

  // Initialize popup ads for movie page
  usePopupAds("movie");

  const { data, isLoading, error } = useQuery({
    queryKey: ["movie", slug],
    queryFn: () => fetchMovieDetail(slug!),
    enabled: !!slug,
  });

  // Extract movie data safely for hooks (must be before any conditional returns)
  const movie = data?.movie;
  const episodes = data?.episodes || movie?.episodes || [];
  const currentServer = episodes[selectedServer];
  const movieId = (movie as any)?.id || (movie as any)?._id;
  const currentEpisode = currentServer?.server_data?.[selectedEpisode];
  
  // Get genre and category IDs for related movies
  const genreIds = movie?.category?.map((c: any) => c.id || c.slug) || [];

  // Get site URL for schema
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate SEO title and description using templates - MUST be before conditional returns
  const siteName = seoSettings?.site_name || siteSettings?.site_name || "PhimHD";
  const seoVariables = useMemo(() => extractMovieVariables(movie, siteName), [movie, siteName]);
  
  // Movie may come from database with SEO fields or from API without them
  const movieAny = movie as any;
  
  const seoTitle = useMemo(() => {
    // First check movie's own SEO title, then use template
    if (movieAny?.seo_title) return movieAny.seo_title;
    const template = seoSettings?.movie_seo_title || seoSettings?.movie_title || "%phim% %tap% %chatluong%";
    const result = replaceSeoVariables(template, seoVariables);
    return result || movieAny?.name || "Xem phim";
  }, [movieAny?.seo_title, movieAny?.name, seoSettings?.movie_seo_title, seoSettings?.movie_title, seoVariables]);
  
  const seoDescription = useMemo(() => {
    // First check movie's own SEO description, then use template
    if (movieAny?.seo_description) return truncateText(movieAny.seo_description, 160);
    const template = seoSettings?.movie_seo_description || seoSettings?.movie_description || "Xem %phim% %tap% vietsub. %noidung%";
    const result = replaceSeoVariables(template, seoVariables);
    return truncateText(result || `Xem phim ${movieAny?.name || ""} vietsub, thuyết minh`, 160);
  }, [movieAny?.seo_description, movieAny?.name, seoSettings?.movie_seo_description, seoSettings?.movie_description, seoVariables]);

  const seoKeywords = useMemo(() => {
    // First check movie's own SEO keywords, then use template
    if (movieAny?.seo_keyword) return movieAny.seo_keyword;
    const template = seoSettings?.movie_seo_keywords || "%phim%, %phimgoc%, %theloai%, xem phim %phim%";
    return replaceSeoVariables(template, seoVariables);
  }, [movieAny?.seo_keyword, seoSettings?.movie_seo_keywords, seoVariables]);

  // Auto-switch to next source on error
  const handlePlayerError = useCallback(() => {
    if (!episodes.length) return;
    
    const currentSrv = episodes[selectedServer];
    const currentEp = currentSrv?.server_data?.[selectedEpisode];
    
    // If using auto or m3u8 and it fails, try embed
    if (sourceType === "auto" || sourceType === "m3u8") {
      if (currentEp?.link_embed) {
        setSourceType("embed");
        return;
      }
    }
    
    // Try next server
    const hasNextServer = episodes.length > selectedServer + 1;
    if (hasNextServer) {
      setSelectedServer(prev => prev + 1);
      setSelectedEpisode(0);
      setSourceType("auto");
    }
  }, [episodes, selectedServer, selectedEpisode, sourceType]);

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-64 rounded-lg bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || !movie) {
    return (
      <Layout>
        <div className="container flex min-h-[50vh] flex-col items-center justify-center py-8">
          <p className="mb-4 text-lg text-muted-foreground">Không tìm thấy phim</p>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Về trang chủ
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* SEO Head */}
      <SEOHead 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        image={getThumbUrl(movie.thumb_url || movie.poster_url)}
        type="video.movie"
      />
      
      {/* JSON-LD Schema */}
      <MovieSchema movie={movie} siteUrl={siteUrl} />
      
      {/* Video Player */}
      {isPlaying && currentEpisode && (
        <div className="bg-cinema-dark">
          <div className="container px-0 sm:px-4">
            <div className="relative aspect-video w-full bg-black">
              <VideoPlayer
                key={`${selectedServer}-${selectedEpisode}-${sourceType}`}
                linkEmbed={sourceType === "m3u8" ? undefined : currentEpisode.link_embed}
                linkM3u8={sourceType === "embed" ? undefined : currentEpisode.link_m3u8}
                linkMp4={sourceType === "embed" ? undefined : currentEpisode.link_mp4}
                movieId={movieId}
                episodeId={`${selectedServer}-${selectedEpisode}`}
                onError={handlePlayerError}
                pageType="movie"
              />
            </div>
            
            {/* Source Selection */}
            <div className="mt-4 px-4 sm:px-0 space-y-3">
              {/* Server selector */}
              {episodes.length > 1 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Server:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {episodes.map((server, index) => (
                      <ThemeButton
                        key={server.server_name}
                        variant={selectedServer === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedServer(index);
                          setSelectedEpisode(0);
                          setSourceType("auto");
                        }}
                      >
                        {server.server_name}
                      </ThemeButton>
                    ))}
                  </div>
                </div>
              )}

              {/* Source type selector (m3u8/embed) */}
              {(currentEpisode.link_m3u8 || currentEpisode.link_embed) && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Radio className="h-4 w-4" />
                    Nguồn phát:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <ThemeButton
                      variant={sourceType === "auto" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSourceType("auto")}
                    >
                      Tự động
                    </ThemeButton>
                    {currentEpisode.link_m3u8 && (
                      <ThemeButton
                        variant={sourceType === "m3u8" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSourceType("m3u8")}
                      >
                        M3U8 (HD)
                      </ThemeButton>
                    )}
                    {currentEpisode.link_embed && (
                      <ThemeButton
                        variant={sourceType === "embed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSourceType("embed")}
                      >
                        Embed
                      </ThemeButton>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nếu nguồn này không hoạt động, vui lòng chọn nguồn khác
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner - Only show when not playing */}
      {!isPlaying && (
        <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden -mt-14 sm:-mt-16">
          <img
            src={getThumbUrl(movie.thumb_url || movie.poster_url)}
            alt={movie.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        </div>
      )}

      <div className="container px-4 sm:px-6">
        {/* Movie Info */}
        <div className={`relative ${isPlaying ? "pt-6" : "-mt-32 sm:-mt-40"}`}>
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Poster - Hide when playing */}
            {!isPlaying && (
              <div className="mx-auto w-32 flex-shrink-0 sm:mx-0 sm:w-40 md:w-48">
                <img
                  src={getPosterUrl(movie.poster_url || movie.thumb_url)}
                  alt={movie.name}
                  className="w-full rounded-lg shadow-lg aspect-[2/3] object-cover"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                {movie.name}
              </h1>
              <p className="mb-4 text-muted-foreground">{movie.origin_name}</p>

              {/* Badges */}
              <div className="mb-4 flex flex-wrap gap-2">
                {movie.quality && (
                  <span className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                    {movie.quality}
                  </span>
                )}
                {movie.lang && (
                  <span className="rounded bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                    {movie.lang}
                  </span>
                )}
                {movie.year && (
                  <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {movie.year}
                  </span>
                )}
                {movie.episode_current && (
                  <span className="rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                    {movie.episode_current}
                  </span>
                )}
              </div>

              {/* Meta info */}
              <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {movie.time && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {movie.time}
                  </div>
                )}
                {movie.year && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {movie.year}
                  </div>
                )}
                {movie.type && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Film className="h-4 w-4" />
                    {movie.type === "series" ? "Phim bộ" : "Phim lẻ"}
                  </div>
                )}
              </div>

              {/* Categories */}
              {movie.category && movie.category.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {movie.category.map((cat: any) => (
                    <span
                      key={cat.slug}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Countries */}
              {movie.country && movie.country.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {movie.country.map((c: any) => (
                    <span
                      key={c.slug}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Directors */}
              {movie.director && movie.director.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Đạo diễn:</span>
                  {movie.director.map((d: any, index: number) => {
                    const name = typeof d === 'string' ? d : d.name;
                    const key = typeof d === 'string' ? `director-${index}` : d.slug || `director-${index}`;
                    return (
                      <span
                        key={key}
                        className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Actors */}
              {movie.actor && movie.actor.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Diễn viên:</span>
                  {movie.actor.slice(0, 10).map((a: any, index: number) => {
                    const name = typeof a === 'string' ? a : a.name;
                    const key = typeof a === 'string' ? `actor-${index}` : a.slug || `actor-${index}`;
                    return (
                      <span
                        key={key}
                        className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                      >
                        {name}
                      </span>
                    );
                  })}
                  {movie.actor.length > 10 && (
                    <span className="text-xs text-muted-foreground">+{movie.actor.length - 10} khác</span>
                  )}
                </div>
              )}

              {/* Watch button */}
              {episodes.length > 0 && episodes[0]?.server_data?.length > 0 && (
                <ThemeButton
                  variant="gradient"
                  onClick={() => {
                    setIsPlaying(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="gap-2"
                  size="lg"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Xem Phim
                </ThemeButton>
              )}

              {/* Rating & Share */}
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {movieId && <MovieRating movieId={movieId} />}
                <ShareButtons 
                  url={`${siteSettings?.site_url || window.location.origin}/phim/${slug}`} 
                  title={movie.name}
                  compact
                />
              </div>
            </div>
          </div>

          {/* Advertisement - Sidebar */}
          <Advertisement position="sidebar" page="movie" />

          {/* Table of Contents */}
          {movie.content && <TableOfContents content={movie.content} />}

          {/* Content/Description */}
          {movie.content && (
            <div className="mt-6 rounded-lg bg-card p-4">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Nội dung phim</h2>
              <div
                className={`movie-content-html prose prose-sm dark:prose-invert max-w-none text-muted-foreground ${
                  !showFullContent ? "line-clamp-3" : ""
                }`}
                dangerouslySetInnerHTML={{ __html: movie.content }}
              />
              {movie.content.length > 200 && (
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {showFullContent ? (
                    <>
                      Thu gọn <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Xem thêm <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Episodes */}
          {episodes.length > 0 && (
            <div className="mt-6 rounded-lg bg-card p-4">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Danh sách tập</h2>

              {/* Server tabs */}
              {episodes.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {episodes.map((server: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedServer(index);
                        setSelectedEpisode(0);
                      }}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        selectedServer === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {server.server_name}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode list */}
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {currentServer?.server_data?.map((ep: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedEpisode(index);
                      setIsPlaying(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      selectedEpisode === index && isPlaying
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {ep.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Facebook Comments */}
          <div className="mt-6">
            <FacebookComments 
              url={`${siteSettings?.site_url || window.location.origin}/phim/${slug}`} 
            />
          </div>

          {/* Related Movies */}
          <RelatedMovies 
            movieId={movieId} 
            genreIds={genreIds}
            currentSlug={slug}
          />
        </div>
      </div>
    </Layout>
  );
};

export default MovieDetail;
