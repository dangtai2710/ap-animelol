import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Trash2, CheckCircle, XCircle, Clock, Film, Loader2 } from "lucide-react";
import { apiCache, type CacheStats } from "@/lib/apiCache";

interface CacheManagementCardProps {
  apiSource: string;
}

const API_TEST_URLS: Record<string, string> = {
  phimapi: "https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1",
  nguonc: "https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1",
};

export default function CacheManagementCard({ apiSource }: CacheManagementCardProps) {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<CacheStats>({ totalEntries: 0, entries: [], totalMovies: 0 });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; movieCount?: number } | null>(null);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(apiCache.getStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    apiCache.clear();
    queryClient.invalidateQueries({ queryKey: ["movieList"] });
    queryClient.invalidateQueries({ queryKey: ["widget-movies"] });
    queryClient.invalidateQueries({ queryKey: ["homepage-widgets"] });
    setStats(apiCache.getStats());
    setTestResult(null);
    toast.success("Đã xóa cache API thành công! Phim sẽ được tải mới từ nguồn.");
  };

  const handleTestApi = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testUrl = API_TEST_URLS[apiSource] || API_TEST_URLS.phimapi;
    const startTime = Date.now();

    try {
      const response = await fetch(testUrl);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Count movies from response
      let movieCount = 0;
      if (data.data?.items) {
        movieCount = data.data.items.length;
      } else if (data.items) {
        movieCount = data.items.length;
      }

      setTestResult({
        success: true,
        message: `Kết nối thành công (${responseTime}ms)`,
        movieCount,
      });
      toast.success(`API ${apiSource} hoạt động bình thường!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      setTestResult({
        success: false,
        message: `Lỗi: ${errorMessage}`,
      });
      toast.error(`Không thể kết nối đến API ${apiSource}`);
    } finally {
      setIsTesting(false);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Quản lý Cache API
        </CardTitle>
        <CardDescription>
          Thống kê cache và kiểm tra kết nối API nguồn phim. Cache được tạo khi người dùng truy cập trang danh sách phim sử dụng API bên ngoài.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-muted rounded-lg text-center">
            <Film className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalMovies}</p>
            <p className="text-sm text-muted-foreground">Phim đã cache</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <RefreshCw className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalEntries}</p>
            <p className="text-sm text-muted-foreground">Cache entries</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">
              {stats.entries.length > 0 ? formatTimeRemaining(stats.entries[0].expiresIn) : "--"}
            </p>
            <p className="text-sm text-muted-foreground">Hết hạn sớm nhất</p>
          </div>
        </div>

        {/* Empty State */}
        {stats.totalEntries === 0 && (
          <div className="p-4 bg-muted/50 rounded-lg text-center border border-dashed">
            <p className="text-sm text-muted-foreground">
              Chưa có dữ liệu cache. Cache sẽ được tạo tự động khi người dùng truy cập các trang phim sử dụng API bên ngoài.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Hãy đảm bảo "Sử dụng API bên ngoài" đã được bật ở trên.
            </p>
          </div>
        )}

        {/* Cache Entries List */}
        {stats.entries.length > 0 && (
          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Chi tiết cache:</p>
            <div className="space-y-2">
              {stats.entries.slice(0, 10).map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[200px] font-mono" title={entry.key}>
                    {entry.key.replace(/https?:\/\/[^/]+/, "").slice(0, 40)}...
                  </span>
                  <Badge variant={entry.expiresIn < 60 ? "destructive" : "secondary"}>
                    {formatTimeRemaining(entry.expiresIn)}
                  </Badge>
                </div>
              ))}
              {stats.entries.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {stats.entries.length - 10} entries khác
                </p>
              )}
            </div>
          </div>
        )}

        {/* Test API Result */}
        {testResult && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            testResult.success ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium ${testResult.success ? "text-green-500" : "text-red-500"}`}>
                {testResult.message}
              </p>
              {testResult.movieCount !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Lấy được {testResult.movieCount} phim từ API
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleTestApi}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Test API {apiSource}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearCache}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa tất cả cache {stats.totalEntries > 0 && `(${stats.totalEntries})`}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Sau khi xóa cache, người dùng sẽ thấy phim mới nhất từ API khi truy cập các trang danh sách phim.
        </p>
      </CardContent>
    </Card>
  );
}
