import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Film, 
  Users, 
  TrendingUp, 
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreVertical,
  Play,
  Calendar,
  Globe,
  Tag,
  Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchNewMovies, fetchMoviesByType, getPosterUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Admin = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [topTab, setTopTab] = useState<"day" | "week" | "month">("day");

  // Fetch stats from database
  const { data: moviesCount } = useQuery({
    queryKey: ["admin-movies-count"],
    queryFn: async () => {
      const { count } = await supabase.from("movies").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: episodesCount } = useQuery({
    queryKey: ["admin-episodes-count"],
    queryFn: async () => {
      const { count } = await supabase.from("episodes").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: usersCount } = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Top movies by views
  const { data: topDayMovies, isLoading: loadingTopDay } = useQuery({
    queryKey: ["admin-top-day-movies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("movies")
        .select("id, name, slug, poster_url, view_day, year, quality")
        .order("view_day", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: topWeekMovies, isLoading: loadingTopWeek } = useQuery({
    queryKey: ["admin-top-week-movies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("movies")
        .select("id, name, slug, poster_url, view_week, year, quality")
        .order("view_week", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: topMonthMovies, isLoading: loadingTopMonth } = useQuery({
    queryKey: ["admin-top-month-movies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("movies")
        .select("id, name, slug, poster_url, view_month, year, quality")
        .order("view_month", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Movies from database
  const { data: dbMovies, isLoading: loadingMovies } = useQuery({
    queryKey: ["admin-db-movies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("movies")
        .select(`
          *,
          movie_genres(genre_id, genres(name)),
          movie_countries(country_id, countries(name))
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const stats = [
    {
      title: "Tổng số phim",
      value: moviesCount?.toLocaleString() || "0",
      icon: Film,
      change: "",
      color: "from-primary to-primary/60",
    },
    {
      title: "Tổng số tập",
      value: episodesCount?.toLocaleString() || "0",
      icon: Layers,
      change: "",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Tổng User",
      value: usersCount?.toLocaleString() || "0",
      icon: Users,
      change: "",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Lượt xem hôm nay",
      value: topDayMovies?.reduce((sum, m) => sum + (m.view_day || 0), 0).toLocaleString() || "0",
      icon: Eye,
      change: "",
      color: "from-purple-500 to-purple-600",
    },
  ];

  const filteredMovies = dbMovies?.filter(movie => 
    movie.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (movie.origin_name && movie.origin_name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const getTopMovies = () => {
    switch(topTab) {
      case "day": return { movies: topDayMovies, loading: loadingTopDay, viewKey: "view_day" };
      case "week": return { movies: topWeekMovies, loading: loadingTopWeek, viewKey: "view_week" };
      case "month": return { movies: topMonthMovies, loading: loadingTopMonth, viewKey: "view_month" };
    }
  };

  const { movies: topMovies, loading: loadingTop, viewKey } = getTopMovies();

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
                <h1 className="text-xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Tổng quan hệ thống</p>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Movies Section */}
            <div className="rounded-xl border border-border/50 bg-card">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top phim xem nhiều nhất
                </h2>
                <div className="flex gap-2">
                  <Button 
                    variant={topTab === "day" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setTopTab("day")}
                  >
                    Top Ngày
                  </Button>
                  <Button 
                    variant={topTab === "week" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setTopTab("week")}
                  >
                    Top Tuần
                  </Button>
                  <Button 
                    variant={topTab === "month" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setTopTab("month")}
                  >
                    Top Tháng
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {loadingTop ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : topMovies && topMovies.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {topMovies.map((movie, index) => (
                      <div key={movie.id} className="relative group">
                        <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                          {index + 1}
                        </div>
                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                          {movie.poster_url ? (
                            <img 
                              src={movie.poster_url} 
                              alt={movie.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Film className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium line-clamp-1">{movie.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{movie.year}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {(movie as any)[viewKey]?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có dữ liệu phim. Hãy crawl phim từ API để bắt đầu.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Movies Table */}
            <div className="rounded-xl border border-border/50 bg-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border/50">
                <h2 className="text-lg font-semibold">Phim mới cập nhật</h2>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm phim..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-muted/50 border-border/50"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-[400px]">Phim</TableHead>
                      <TableHead>Năm</TableHead>
                      <TableHead>Quốc gia</TableHead>
                      <TableHead>Thể loại</TableHead>
                      <TableHead>Chất lượng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMovies ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-border/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-16 rounded bg-muted animate-pulse" />
                              <div className="space-y-2">
                                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredMovies.length > 0 ? (
                      filteredMovies.map((movie) => (
                        <TableRow key={movie.id} className="border-border/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {movie.poster_url ? (
                                <img
                                  src={movie.poster_url}
                                  alt={movie.name}
                                  className="w-12 h-16 rounded object-cover"
                                />
                              ) : (
                                <div className="w-12 h-16 rounded bg-muted flex items-center justify-center">
                                  <Film className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium line-clamp-1">{movie.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {movie.origin_name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {movie.year || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              {movie.movie_countries?.[0]?.countries?.name || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {movie.movie_genres?.slice(0, 2).map((mg: any) => mg.genres?.name).filter(Boolean).join(", ") || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                              {movie.quality || "HD"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                movie.status === "completed" 
                                  ? "border-green-500/50 text-green-500" 
                                  : "border-yellow-500/50 text-yellow-500"
                              }
                            >
                              {movie.episode_current || movie.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                                <DropdownMenuItem>Cập nhật</DropdownMenuItem>
                                <DropdownMenuItem>Đồng bộ tập mới</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có phim nào trong database. Hãy crawl phim từ API.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
