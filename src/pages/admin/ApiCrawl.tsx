import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Server,
  Activity,
  Film,
  Loader2,
  Database,
  Shuffle,
  Play,
} from "lucide-react";
import { fetchNewMovies, fetchMovieDetailFromAPI, fetchCategories, fetchCountries, type ApiSource } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// API Source options
const API_SOURCE_OPTIONS = [
  { id: "phimapi" as const, label: "PhimAPI.com", url: "https://phimapi.com" },
  { id: "nguonc" as const, label: "NguonC.com", url: "https://phim.nguonc.com" },
];

interface CrawlResult {
  url: string;
  movieId?: string;
  name?: string;
  originName?: string;
  year?: number;
  timestamp: string;
  status: "success" | "error" | "pending";
  message?: string;
}

// Danh sách định dạng
const FORMAT_OPTIONS = [
  { id: "single", label: "Phim lẻ" },
  { id: "series", label: "Phim bộ" },
  { id: "hoathinh", label: "Hoạt hình" },
  { id: "tvshows", label: "TV Shows" },
];

// Danh sách thể loại phổ biến
const GENRE_OPTIONS = [
  "Hành Động", "Miền Tây", "Trẻ Em", "Lịch Sử", "Cổ Trang", "Chiến Tranh", "Viễn Tưởng", "Kinh Dị", "Tài Liệu", "Bí Ẩn", "Phim 18+", "Tình Cảm", "Tâm Lý", "Thể Thao",
  "Phiêu Lưu", "Âm Nhạc", "Gia Đình", "Học Đường", "Hài Hước", "Hình Sự", "Võ Thuật", "Khoa Học", "Thần Thoại", "Chính Kịch", "Kinh Điển"
];

// Danh sách quốc gia
const COUNTRY_OPTIONS = [
  "Việt Nam", "Trung Quốc", "Thái Lan", "Hồng Kông", "Pháp", "Đức", "Hà Lan", "Mexico", "Thụy Điển", "Philippines", "Đan Mạch", "Thụy Sĩ", "Ukraina", "Hàn Quốc",
  "Âu Mỹ", "Ấn Độ", "Canada", "Tây Ban Nha", "Indonesia", "Ba Lan", "Malaysia", "Bồ Đào Nha", "UAE", "Châu Phi", "Ả Rập Xê Út", "Nhật Bản", "Đài Loan", "Anh",
  "Quốc Gia Khác", "Thổ Nhĩ Kỳ", "Nga", "Úc", "Brazil", "Ý", "Na Uy", "Nam Phi"
];

const ApiCrawl = () => {
  const queryClient = useQueryClient();
  
  // Crawl state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [currentCrawling, setCurrentCrawling] = useState<string>("");
  
  // API Source selection
  const [apiSource, setApiSource] = useState<ApiSource>("phimapi");
  
  // Page crawl
  const [pageFrom, setPageFrom] = useState("1");
  const [pageTo, setPageTo] = useState("1");
  
  // Wait timeout
  const [waitFrom, setWaitFrom] = useState("1000");
  const [waitTo, setWaitTo] = useState("3000");
  
  // Movie list textarea
  const [movieList, setMovieList] = useState("");
  
  // Skip options - formats
  const [skipFormats, setSkipFormats] = useState<string[]>([]);
  
  // Skip options - genres
  const [skipGenres, setSkipGenres] = useState<string[]>([]);
  
  // Skip options - countries
  const [skipCountries, setSkipCountries] = useState<string[]>([]);
  
  // Image options
  const [resizeThumb, setResizeThumb] = useState(false);
  const [thumbWidth, setThumbWidth] = useState("0");
  const [thumbHeight, setThumbHeight] = useState("0");
  const [resizePoster, setResizePoster] = useState(false);
  const [posterWidth, setPosterWidth] = useState("0");
  const [posterHeight, setPosterHeight] = useState("0");
  const [saveAsWebp, setSaveAsWebp] = useState(false);

  // Crawl results
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [successResults, setSuccessResults] = useState<CrawlResult[]>([]);
  const [errorResults, setErrorResults] = useState<CrawlResult[]>([]);

  // API Status checks
  const { data: apiStatus, isLoading: checkingApi, refetch: recheckApi } = useQuery({
    queryKey: ["api-status", apiSource],
    queryFn: async () => {
      const start = Date.now();
      try {
        await fetchNewMovies(1, apiSource);
        return {
          status: "online" as const,
          latency: Date.now() - start,
          lastCheck: new Date(),
          source: apiSource,
        };
      } catch (error) {
        return {
          status: "offline" as const,
          latency: 0,
          lastCheck: new Date(),
          source: apiSource,
        };
      }
    },
    refetchInterval: 60000,
  });

  const { data: newMovies } = useQuery({
    queryKey: ["api-new-movies", apiSource],
    queryFn: () => fetchNewMovies(1, apiSource),
  });

  const { data: categories } = useQuery({
    queryKey: ["api-categories"],
    queryFn: fetchCategories,
  });

  const { data: countries } = useQuery({
    queryKey: ["api-countries"],
    queryFn: fetchCountries,
  });

  // Helper function to create slug
  const createSlug = (text: string) => {
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
  };

  // Random wait
  const randomWait = async () => {
    const min = parseInt(waitFrom) || 1000;
    const max = parseInt(waitTo) || 3000;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  };

  // Main crawl function
  const crawlMovie = async (movieSlug: string): Promise<CrawlResult> => {
    const sourceInfo = API_SOURCE_OPTIONS.find(s => s.id === apiSource)!;
    const url = `${sourceInfo.url}/phim/${movieSlug}`;
    const timestamp = new Date().toISOString();
    
    try {
      const movieData = await fetchMovieDetailFromAPI(movieSlug, apiSource);
      if (!movieData || !movieData.movie) {
        return { url, timestamp, status: "error", message: `Không tìm thấy phim: ${movieSlug}` };
      }

      const movie = movieData.movie;

      // Check skip formats
      if (skipFormats.length > 0 && skipFormats.includes(movie.type)) {
        return { url, timestamp, status: "error", message: `Bỏ qua định dạng: ${movie.type}` };
      }
      
      // Check if movie exists
      const { data: existingMovie } = await supabase
        .from("movies")
        .select("id")
        .eq("slug", movie.slug)
        .maybeSingle();

      let movieId: string;
      let isUpdate = false;

      if (existingMovie) {
        // Movie exists - keep ALL movie info unchanged, only add new episodes
        movieId = existingMovie.id;
        isUpdate = true;
      } else {
        // Insert new movie
        const { data: newMovie, error: insertError } = await supabase
          .from("movies")
          .insert({
            name: movie.name,
            slug: movie.slug,
            origin_name: movie.origin_name,
            content: movie.content,
            type: movie.type,
            status: movie.status,
            poster_url: movie.poster_url,
            thumb_url: movie.thumb_url,
            trailer_url: movie.trailer_url,
            time: movie.time,
            episode_current: movie.episode_current,
            episode_total: movie.episode_total,
            quality: movie.quality,
            lang: movie.lang,
            year: movie.year,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        movieId = newMovie.id;
      }

      // Auto-create movie category based on type
      if (movie.type) {
        const categoryMap: Record<string, { name: string; slug: string }> = {
          "single": { name: "Phim lẻ", slug: "phim-le" },
          "series": { name: "Phim bộ", slug: "phim-bo" },
          "hoathinh": { name: "Phim hoạt hình", slug: "phim-hoat-hinh" },
          "tvshows": { name: "TV Shows", slug: "tv-shows" },
        };
        
        const categoryInfo = categoryMap[movie.type];
        if (categoryInfo) {
          // First check if category exists
          let { data: existingCategory } = await supabase
            .from("movie_categories")
            .select("id")
            .eq("slug", categoryInfo.slug)
            .maybeSingle();
          
          // Only insert if not exists
          if (!existingCategory) {
            const { data: newCategory } = await supabase
              .from("movie_categories")
              .insert({ name: categoryInfo.name, slug: categoryInfo.slug })
              .select("id")
              .single();
            existingCategory = newCategory;
          }
          
          if (existingCategory) {
            // Check if mapping exists
            const { data: existingMap } = await supabase
              .from("movie_category_map")
              .select("id")
              .eq("movie_id", movieId)
              .eq("category_id", existingCategory.id)
              .maybeSingle();
            
            if (!existingMap) {
              await supabase
                .from("movie_category_map")
                .insert({ movie_id: movieId, category_id: existingCategory.id });
            }
          }
        }
      }

      // Process genres
      if (movie.category && movie.category.length > 0) {
        const filteredCategories = movie.category.filter(
          (cat: any) => !skipGenres.includes(cat.name)
        );
        for (const cat of filteredCategories) {
          const { data: genre } = await supabase
            .from("genres")
            .upsert({ name: cat.name, slug: cat.slug }, { onConflict: "slug" })
            .select("id")
            .single();
          
          if (genre) {
            await supabase
              .from("movie_genres")
              .upsert({ movie_id: movieId, genre_id: genre.id }, { onConflict: "movie_id,genre_id" });
          }
        }
      }

      // Process countries
      if (movie.country && movie.country.length > 0) {
        const filteredCountries = movie.country.filter(
          (c: any) => !skipCountries.includes(c.name)
        );
        for (const c of filteredCountries) {
          const { data: country } = await supabase
            .from("countries")
            .upsert({ name: c.name, slug: c.slug }, { onConflict: "slug" })
            .select("id")
            .single();
          
          if (country) {
            await supabase
              .from("movie_countries")
              .upsert({ movie_id: movieId, country_id: country.id }, { onConflict: "movie_id,country_id" });
          }
        }
      }

      // Process year
      if (movie.year) {
        await supabase
          .from("years")
          .upsert({ year: movie.year }, { onConflict: "year" });
      }

      // Process directors
      if (movie.director && movie.director.length > 0) {
        for (const dirName of movie.director) {
          if (dirName && dirName.trim()) {
            const slug = createSlug(dirName);
            const { data: director } = await supabase
              .from("directors")
              .upsert({ name: dirName, slug }, { onConflict: "slug" })
              .select("id")
              .single();
            
            if (director) {
              await supabase
                .from("movie_directors")
                .upsert({ movie_id: movieId, director_id: director.id }, { onConflict: "movie_id,director_id" });
            }
          }
        }
      }

      // Process actors
      if (movie.actor && movie.actor.length > 0) {
        for (const actorName of movie.actor) {
          if (actorName && actorName.trim()) {
            const slug = createSlug(actorName);
            const { data: actor } = await supabase
              .from("actors")
              .upsert({ name: actorName, slug }, { onConflict: "slug" })
              .select("id")
              .single();
            
            if (actor) {
              await supabase
                .from("movie_actors")
                .upsert({ movie_id: movieId, actor_id: actor.id }, { onConflict: "movie_id,actor_id" });
            }
          }
        }
      }

      // Process episodes - only add NEW episodes, keep existing episodes unchanged
      if (movieData.episodes && movieData.episodes.length > 0) {
        // Get source prefix to identify which API source the episodes came from
        const sourcePrefix = apiSource === "phimapi" ? "[PhimAPI]" : "[NguonC]";
        
        // Get existing episodes for this movie to check for duplicates
        const { data: existingEpisodes } = await supabase
          .from("episodes")
          .select("slug, server_name")
          .eq("movie_id", movieId);
        
        // Create a set of existing episode keys for fast lookup
        const existingEpisodeKeys = new Set(
          existingEpisodes?.map(ep => `${ep.server_name}|${ep.slug}`) || []
        );
        
        const newEpisodes: any[] = [];
        for (const server of movieData.episodes) {
          // Add source prefix to server_name to identify the source
          const serverNameWithSource = `${sourcePrefix} ${server.server_name}`;
          for (const ep of server.server_data) {
            const episodeKey = `${serverNameWithSource}|${ep.slug}`;
            // Only add if this episode doesn't already exist
            if (!existingEpisodeKeys.has(episodeKey)) {
              newEpisodes.push({
                movie_id: movieId,
                server_name: serverNameWithSource,
                name: ep.name,
                slug: ep.slug,
                filename: ep.filename,
                link_embed: ep.link_embed,
                link_m3u8: ep.link_m3u8,
              });
            }
          }
        }
        
        // Batch insert only new episodes in chunks of 100
        if (newEpisodes.length > 0) {
          const chunkSize = 100;
          for (let i = 0; i < newEpisodes.length; i += chunkSize) {
            const chunk = newEpisodes.slice(i, i + chunkSize);
            await supabase.from("episodes").insert(chunk);
          }
        }
      }

      return { 
        url, 
        movieId, 
        name: movie.name,
        originName: movie.origin_name,
        year: movie.year,
        timestamp, 
        status: "success" 
      };
    } catch (error: any) {
      console.error("Error crawling movie:", error);
      return { url, timestamp, status: "error", message: error.message };
    }
  };

  // Get list movies from API
  const handleGetListMovies = async () => {
    const from = parseInt(pageFrom);
    const to = parseInt(pageTo);
    
    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      toast.error("Vui lòng nhập khoảng trang hợp lệ");
      return;
    }

    setIsCrawling(true);
    setCrawlProgress(0);
    setCurrentCrawling("Đang lấy danh sách phim...");
    
    const urls: string[] = [];
    const totalPages = to - from + 1;

    try {
      const sourceInfo = API_SOURCE_OPTIONS.find(s => s.id === apiSource)!;
      for (let page = from; page <= to; page++) {
        setCurrentCrawling(`Đang lấy danh sách phim trang ${page}/${to} từ ${sourceInfo.label}...`);
        setCrawlProgress(((page - from) / totalPages) * 100);
        
        const moviesData = await fetchNewMovies(page, apiSource);
        if (moviesData && moviesData.items) {
          for (const movie of moviesData.items) {
            urls.push(movie.slug);
          }
        }
      }

      setMovieList(urls.join("\n"));
      toast.success(`Đã lấy được ${urls.length} phim`);
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setIsCrawling(false);
      setCrawlProgress(0);
      setCurrentCrawling("");
    }
  };

  // Shuffle movie list
  const handleShuffleList = () => {
    const urls = movieList.split("\n").filter(u => u.trim());
    for (let i = urls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [urls[i], urls[j]] = [urls[j], urls[i]];
    }
    setMovieList(urls.join("\n"));
    toast.success("Đã xáo trộn danh sách");
  };

  // Crawl movies
  const handleCrawlMovies = async () => {
    const urls = movieList.split("\n").map(u => u.trim()).filter(u => u);
    if (urls.length === 0) {
      toast.error("Vui lòng nhập danh sách phim");
      return;
    }

    setIsCrawling(true);
    setCrawlProgress(0);
    setCrawlResults([]);
    setSuccessResults([]);
    setErrorResults([]);

    const startTime = Date.now();
    let added = 0;
    let updated = 0;
    
    try {
      const { data: logEntry } = await supabase
        .from("crawl_logs")
        .insert({
          type: `Crawl ${urls.length} phim`,
          status: "running",
        })
        .select()
        .single();

      for (let i = 0; i < urls.length; i++) {
        const input = urls[i].trim();
        // Support both URL format and slug format
        // Match patterns: /phim/slug, /film/slug, /api/film/slug
        const match = input.match(/(?:phim|film)\/([^\/\?\s]+)(?:\?.*)?$/);
        const slug = match ? match[1] : input;
        
        if (!slug) {
          const errorResult: CrawlResult = {
            url: input,
            timestamp: new Date().toISOString(),
            status: "error",
            message: "Slug không hợp lệ"
          };
          setErrorResults(prev => [...prev, errorResult]);
          continue;
        }

        setCurrentCrawling(slug);
        setCrawlProgress(((i + 1) / urls.length) * 100);

        // Add to pending list
        const pendingResult: CrawlResult = {
          url: slug,
          timestamp: new Date().toISOString(),
          status: "pending"
        };
        setCrawlResults(prev => [pendingResult, ...prev.slice(0, 6)]);

        const result = await crawlMovie(slug);
        
        if (result.status === "success") {
          added++;
          setSuccessResults(prev => [...prev, result]);
        } else {
          setErrorResults(prev => [...prev, result]);
        }

        // Wait between requests
        if (i < urls.length - 1) {
          await randomWait();
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);

      if (logEntry) {
        await supabase
          .from("crawl_logs")
          .update({
            status: "success",
            movies_added: added,
            movies_updated: updated,
            duration: `${duration}s`,
            message: errorResults.length > 0 ? `${errorResults.length} phim lỗi` : null,
          })
          .eq("id", logEntry.id);
      }

      toast.success(`Hoàn tất! Thành công: ${added}, Lỗi: ${errorResults.length}`);
      queryClient.invalidateQueries({ queryKey: ["crawl-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-db-movies"] });
      queryClient.invalidateQueries({ queryKey: ["admin-movies-count"] });
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setIsCrawling(false);
      setCrawlProgress(0);
      setCurrentCrawling("");
    }
  };

  const formatResultLine = (result: CrawlResult) => {
    const parts = [result.url];
    if (result.movieId) parts.push(result.movieId);
    parts.push(result.timestamp);
    if (result.name) parts.push(result.name);
    if (result.originName) parts.push(result.originName);
    if (result.year) parts.push(String(result.year));
    if (result.message) parts.push(result.message);
    return parts.join("|");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex-1">
                <h1 className="text-xl font-bold">Crawl Phim</h1>
                <p className="text-sm text-muted-foreground">
                  Crawl phim từ {API_SOURCE_OPTIONS.find(s => s.id === apiSource)?.label || "API"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recheckApi()}
                disabled={checkingApi}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkingApi ? "animate-spin" : ""}`} />
                Kiểm tra API
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* API Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Server className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trạng thái</p>
                      <div className="flex items-center gap-1">
                        {apiStatus?.status === "online" ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-green-500">Online</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="font-semibold text-destructive">Offline</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Độ trễ</p>
                      <p className="font-semibold">{apiStatus?.latency || 0}ms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Film className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tổng phim API</p>
                      <p className="font-semibold">{newMovies?.pagination?.totalItems?.toLocaleString() || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Database className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Thể loại / Quốc gia</p>
                      <p className="font-semibold">{categories?.length || 0} / {countries?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="manual" className="w-full">
              <TabsList>
                <TabsTrigger value="manual">Thủ công</TabsTrigger>
                <TabsTrigger value="auto">Tự động</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-6 mt-6">
                {/* Skip Options */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {/* Skip Formats */}
                    <div>
                      <Label className="text-orange-500 font-semibold">Bỏ qua định dạng</Label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {FORMAT_OPTIONS.map((format) => (
                          <div key={format.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`format-${format.id}`}
                              checked={skipFormats.includes(format.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSkipFormats([...skipFormats, format.id]);
                                } else {
                                  setSkipFormats(skipFormats.filter(f => f !== format.id));
                                }
                              }}
                              disabled={isCrawling}
                            />
                            <Label htmlFor={`format-${format.id}`} className="text-sm cursor-pointer">
                              {format.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skip Genres */}
                    <div>
                      <Label className="text-orange-500 font-semibold">Bỏ qua thể loại</Label>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                        {GENRE_OPTIONS.map((genre) => (
                          <div key={genre} className="flex items-center gap-2">
                            <Checkbox
                              id={`genre-${genre}`}
                              checked={skipGenres.includes(genre)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSkipGenres([...skipGenres, genre]);
                                } else {
                                  setSkipGenres(skipGenres.filter(g => g !== genre));
                                }
                              }}
                              disabled={isCrawling}
                            />
                            <Label htmlFor={`genre-${genre}`} className="text-sm cursor-pointer whitespace-nowrap">
                              {genre}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skip Countries */}
                    <div>
                      <Label className="text-orange-500 font-semibold">Bỏ qua quốc gia</Label>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                        {COUNTRY_OPTIONS.map((country) => (
                          <div key={country} className="flex items-center gap-2">
                            <Checkbox
                              id={`country-${country}`}
                              checked={skipCountries.includes(country)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSkipCountries([...skipCountries, country]);
                                } else {
                                  setSkipCountries(skipCountries.filter(c => c !== country));
                                }
                              }}
                              disabled={isCrawling}
                            />
                            <Label htmlFor={`country-${country}`} className="text-sm cursor-pointer whitespace-nowrap">
                              {country}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Image Options */}
                    <div>
                      <Label className="text-orange-500 font-semibold">Hình ảnh</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="resize-thumb"
                              checked={resizeThumb}
                              onCheckedChange={(checked) => setResizeThumb(!!checked)}
                              disabled={isCrawling}
                            />
                            <Label htmlFor="resize-thumb" className="text-sm cursor-pointer">
                              Tải & Resize Thumb ={">"} Width (px):
                            </Label>
                          </div>
                          <Input
                            type="number"
                            value={thumbWidth}
                            onChange={(e) => setThumbWidth(e.target.value)}
                            className="w-20 h-8"
                            disabled={isCrawling || !resizeThumb}
                          />
                          <span className="text-sm">Height (px):</span>
                          <Input
                            type="number"
                            value={thumbHeight}
                            onChange={(e) => setThumbHeight(e.target.value)}
                            className="w-20 h-8"
                            disabled={isCrawling || !resizeThumb}
                          />
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="resize-poster"
                              checked={resizePoster}
                              onCheckedChange={(checked) => setResizePoster(!!checked)}
                              disabled={isCrawling}
                            />
                            <Label htmlFor="resize-poster" className="text-sm cursor-pointer">
                              Tải & Resize Poster ={">"} Width (px):
                            </Label>
                          </div>
                          <Input
                            type="number"
                            value={posterWidth}
                            onChange={(e) => setPosterWidth(e.target.value)}
                            className="w-20 h-8"
                            disabled={isCrawling || !resizePoster}
                          />
                          <span className="text-sm">Height (px):</span>
                          <Input
                            type="number"
                            value={posterHeight}
                            onChange={(e) => setPosterHeight(e.target.value)}
                            className="w-20 h-8"
                            disabled={isCrawling || !resizePoster}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="save-webp"
                            checked={saveAsWebp}
                            onCheckedChange={(checked) => setSaveAsWebp(!!checked)}
                            disabled={isCrawling}
                          />
                          <Label htmlFor="save-webp" className="text-sm cursor-pointer">
                            Lưu định dạng webp
                          </Label>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="mt-3" disabled={isCrawling}>
                        Lưu cấu hình
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Crawl Controls */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {/* Page Crawl */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <Label className="whitespace-nowrap">Page Crawl: From</Label>
                      <Input
                        type="number"
                        value={pageFrom}
                        onChange={(e) => setPageFrom(e.target.value)}
                        className="w-24 h-8"
                        min="1"
                        disabled={isCrawling}
                      />
                      <span>To</span>
                      <Input
                        type="number"
                        value={pageTo}
                        onChange={(e) => setPageTo(e.target.value)}
                        className="w-24 h-8"
                        min="1"
                        disabled={isCrawling}
                      />
                    </div>

                    {/* API Source Selector */}
                    <div className="flex items-center gap-4">
                      <Label className="whitespace-nowrap font-semibold text-primary">Nguồn API</Label>
                      <RadioGroup
                        value={apiSource}
                        onValueChange={(value) => setApiSource(value as ApiSource)}
                        className="flex gap-4"
                        disabled={isCrawling}
                      >
                        {API_SOURCE_OPTIONS.map((source) => (
                          <div key={source.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={source.id} id={`source-${source.id}`} disabled={isCrawling} />
                            <Label 
                              htmlFor={`source-${source.id}`} 
                              className={`cursor-pointer ${apiSource === source.id ? "text-primary font-semibold" : ""}`}
                            >
                              {source.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <Button 
                        onClick={handleGetListMovies} 
                        disabled={isCrawling}
                        className="bg-blue-600 hover:bg-blue-700 ml-auto"
                      >
                        {isCrawling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lấy danh sách phim"}
                      </Button>
                    </div>

                    {/* Wait Timeout */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <Label className="whitespace-nowrap">Wait Timeout Random: From</Label>
                      <Input
                        type="number"
                        value={waitFrom}
                        onChange={(e) => setWaitFrom(e.target.value)}
                        className="w-28 h-8"
                        disabled={isCrawling}
                      />
                      <span>(ms) - To</span>
                      <Input
                        type="number"
                        value={waitTo}
                        onChange={(e) => setWaitTo(e.target.value)}
                        className="w-28 h-8"
                        disabled={isCrawling}
                      />
                      <span>(ms)</span>
                    </div>

                    {/* Movie List Textarea */}
                    <Textarea
                      value={movieList}
                      onChange={(e) => setMovieList(e.target.value)}
                      placeholder="Danh sách slug phim (mỗi slug một dòng)&#10;ten-phim-1&#10;ten-phim-2&#10;&#10;Hoặc URL đầy đủ:&#10;https://phimapi.com/phim/ten-phim-1"
                      className="min-h-[200px] font-mono text-sm"
                      disabled={isCrawling}
                    />

                    {/* Progress */}
                    {isCrawling && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1 mr-4">
                            {currentCrawling}
                          </span>
                          <span className="font-medium">{Math.round(crawlProgress)}%</span>
                        </div>
                        <Progress value={crawlProgress} className="h-2" />
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        onClick={handleShuffleList}
                        disabled={isCrawling || !movieList.trim()}
                      >
                        <Shuffle className="h-4 w-4 mr-2" />
                        Trộn Link
                      </Button>
                      <Button 
                        onClick={handleCrawlMovies}
                        disabled={isCrawling || !movieList.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isCrawling ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Crawl Movies
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Crawl Results */}
                <div className="space-y-4">
                  {/* Current Crawling */}
                  {(isCrawling || crawlResults.length > 0) && (
                    <div>
                      <div className="bg-orange-500 text-white px-3 py-1.5 text-sm font-medium">
                        Crawl Movies: {currentCrawling || "Đang chờ..."}
                      </div>
                      <div className="border border-orange-500 p-3 max-h-[200px] overflow-auto bg-background">
                        {crawlResults.map((result, index) => (
                          <div key={index} className="text-sm font-mono text-orange-600">
                            {formatResultLine(result)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Results */}
                  {successResults.length > 0 && (
                    <div>
                      <div className="bg-green-600 text-white px-3 py-1.5 text-sm font-medium">
                        Crawl Thành Công ({successResults.length})
                      </div>
                      <div className="border border-green-600 p-3 max-h-[200px] overflow-auto bg-background">
                        {successResults.map((result, index) => (
                          <div key={index} className="text-sm font-mono text-green-600">
                            {formatResultLine(result)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Results */}
                  {errorResults.length > 0 && (
                    <div>
                      <div className="bg-red-600 text-white px-3 py-1.5 text-sm font-medium">
                        Crawl Lỗi ({errorResults.length})
                      </div>
                      <div className="border border-red-600 p-3 max-h-[200px] overflow-auto bg-background">
                        {errorResults.map((result, index) => (
                          <div key={index} className="text-sm font-mono text-red-600">
                            {formatResultLine(result)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="auto" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Crawl Tự Động</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Chức năng crawl tự động sẽ được phát triển trong phiên bản tiếp theo.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ApiCrawl;
