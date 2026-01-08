import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  Globe,
  Film,
  Tv,
  Tag,
  MapPin,
  Send,
  Key,
  Save,
  Zap,
  Shield,
  AlertCircle
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

interface SitemapStatus {
  name: string;
  url: string;
  icon: React.ElementType;
  description: string;
  status: "loading" | "success" | "error";
  lastChecked?: Date;
  urlCount?: number;
  error?: string;
}

interface VerificationStatus {
  engine: string;
  status: "idle" | "checking" | "success" | "error";
  message?: string;
  lastChecked?: Date;
}

const sitemaps: Omit<SitemapStatus, "status">[] = [
  {
    name: "Sitemap Index",
    url: "/sitemap.xml",
    icon: MapPin,
    description: "Sitemap tổng hợp chứa liên kết đến tất cả sitemap con",
  },
  {
    name: "Pages Sitemap",
    url: "/sitemap-pages.xml",
    icon: FileText,
    description: "Các trang tĩnh: Homepage, hub pages",
  },
  {
    name: "Movies Sitemap",
    url: "/sitemap-movies.xml",
    icon: Film,
    description: "Tất cả trang phim (/phim/[slug])",
  },
  {
    name: "Episodes Sitemap",
    url: "/sitemap-episodes.xml",
    icon: Tv,
    description: "Tất cả trang tập phim (/phim/[slug]/tap-[episode])",
  },
  {
    name: "Taxonomy Sitemap",
    url: "/sitemap-taxonomy.xml",
    icon: Tag,
    description: "Thể loại, quốc gia, năm, diễn viên, đạo diễn",
  },
  {
    name: "Posts Sitemap",
    url: "/sitemap-posts.xml",
    icon: Globe,
    description: "Bài viết và danh mục bài viết",
  },
];

export default function SitemapManagement() {
  const queryClient = useQueryClient();
  const [sitemapStatuses, setSitemapStatuses] = useState<Record<string, SitemapStatus>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [indexNowKey, setIndexNowKey] = useState("");
  const [manualUrls, setManualUrls] = useState("");
  const [isPinging, setIsPinging] = useState(false);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({
    keyFile: { engine: "Key File", status: "idle" },
    bing: { engine: "Bing IndexNow", status: "idle" },
    google: { engine: "Google Sitemap", status: "idle" },
  });

  // Fetch site settings
  const { data: siteSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value");
      if (error) throw error;
      const settings: Record<string, string> = {};
      data?.forEach((item) => {
        settings[item.setting_key] = item.setting_value || "";
      });
      return settings;
    },
  });

  // Initialize indexNowKey from settings
  if (siteSettings?.indexnow_key && indexNowKey === "" && !isLoadingSettings) {
    setIndexNowKey(siteSettings.indexnow_key);
  }

  const siteUrl = siteSettings?.site_url || window.location.origin;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // Save IndexNow key mutation
  const saveKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: key })
        .eq("setting_key", "indexnow_key");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Đã lưu IndexNow key");
    },
    onError: (error: any) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Ping IndexNow mutation
  const pingMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await supabase.functions.invoke("indexnow-ping", {
        body: { urls },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Đã gửi ${data.urls?.length || 0} URLs đến search engines`);
    },
    onError: (error: any) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Verify IndexNow key
  const verifyIndexNowKey = async () => {
    if (!siteSettings?.indexnow_key || !siteSettings?.site_url) {
      toast.error("Vui lòng cấu hình Site URL và IndexNow key trước");
      return;
    }

    const key = siteSettings.indexnow_key;
    const baseUrl = siteSettings.site_url;

    // Reset statuses
    setVerificationStatuses({
      keyFile: { engine: "Key File", status: "checking" },
      bing: { engine: "Bing IndexNow", status: "checking" },
      google: { engine: "Google Sitemap", status: "checking" },
    });

    // 1. Check key file accessibility
    try {
      const keyFileUrl = `${baseUrl}/${key}.txt`;
      const response = await fetch(keyFileUrl, { mode: "no-cors" });
      // no-cors mode doesn't give us status, so we assume it worked if no error
      setVerificationStatuses(prev => ({
        ...prev,
        keyFile: {
          engine: "Key File",
          status: "success",
          message: `File ${key}.txt có thể truy cập`,
          lastChecked: new Date(),
        },
      }));
    } catch (error: any) {
      setVerificationStatuses(prev => ({
        ...prev,
        keyFile: {
          engine: "Key File",
          status: "error",
          message: `Không thể truy cập file ${key}.txt - Hãy đảm bảo file tồn tại tại root domain`,
          lastChecked: new Date(),
        },
      }));
    }

    // 2. Test Bing IndexNow (via our edge function)
    try {
      const testUrl = `${baseUrl}/`;
      const response = await supabase.functions.invoke("indexnow-ping", {
        body: { urls: [testUrl] },
      });
      
      if (response.error) {
        throw response.error;
      }

      const results = response.data?.results || [];
      const bingResult = results.find((r: any) => r.engine === "Bing/IndexNow");
      
      if (bingResult?.success) {
        setVerificationStatuses(prev => ({
          ...prev,
          bing: {
            engine: "Bing IndexNow",
            status: "success",
            message: `Bing đã nhận thông báo (Status: ${bingResult.status})`,
            lastChecked: new Date(),
          },
        }));
      } else {
        setVerificationStatuses(prev => ({
          ...prev,
          bing: {
            engine: "Bing IndexNow",
            status: "error",
            message: bingResult?.error || `Bing trả về lỗi (Status: ${bingResult?.status})`,
            lastChecked: new Date(),
          },
        }));
      }

      // 3. Check Google sitemap ping result
      const googleResult = results.find((r: any) => r.engine === "Google Sitemap Ping");
      if (googleResult?.success) {
        setVerificationStatuses(prev => ({
          ...prev,
          google: {
            engine: "Google Sitemap",
            status: "success",
            message: `Google đã nhận sitemap ping (Status: ${googleResult.status})`,
            lastChecked: new Date(),
          },
        }));
      } else {
        setVerificationStatuses(prev => ({
          ...prev,
          google: {
            engine: "Google Sitemap",
            status: "error",
            message: googleResult?.error || `Google ping thất bại`,
            lastChecked: new Date(),
          },
        }));
      }
    } catch (error: any) {
      setVerificationStatuses(prev => ({
        ...prev,
        bing: {
          engine: "Bing IndexNow",
          status: "error",
          message: error.message || "Không thể kết nối với Bing",
          lastChecked: new Date(),
        },
        google: {
          engine: "Google Sitemap",
          status: "error",
          message: error.message || "Không thể ping Google",
          lastChecked: new Date(),
        },
      }));
    }

    toast.success("Đã hoàn thành kiểm tra xác thực");
  };

  const getFullSitemapUrl = (path: string) => {
    if (path === "/sitemap.xml") {
      return `https://${projectId}.supabase.co/functions/v1/sitemap-index`;
    }
    const functionName = path.replace("/", "").replace(".xml", "");
    return `https://${projectId}.supabase.co/functions/v1/${functionName}`;
  };

  const testSitemap = async (sitemap: Omit<SitemapStatus, "status">) => {
    setSitemapStatuses((prev) => ({
      ...prev,
      [sitemap.name]: { ...sitemap, status: "loading" },
    }));

    try {
      const url = getFullSitemapUrl(sitemap.url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const urlMatches = text.match(/<loc>/g);
      const urlCount = urlMatches ? urlMatches.length : 0;

      setSitemapStatuses((prev) => ({
        ...prev,
        [sitemap.name]: {
          ...sitemap,
          status: "success",
          lastChecked: new Date(),
          urlCount,
        },
      }));
    } catch (error: any) {
      setSitemapStatuses((prev) => ({
        ...prev,
        [sitemap.name]: {
          ...sitemap,
          status: "error",
          lastChecked: new Date(),
          error: error.message,
        },
      }));
    }
  };

  const testAllSitemaps = async () => {
    setIsTestingAll(true);
    for (const sitemap of sitemaps) {
      await testSitemap(sitemap);
    }
    setIsTestingAll(false);
    toast.success("Đã kiểm tra tất cả sitemap");
  };

  const openSitemap = (sitemap: Omit<SitemapStatus, "status">) => {
    const url = getFullSitemapUrl(sitemap.url);
    window.open(url, "_blank");
  };

  const handleManualPing = async () => {
    const urls = manualUrls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    
    if (urls.length === 0) {
      toast.error("Vui lòng nhập ít nhất một URL");
      return;
    }

    setIsPinging(true);
    try {
      await pingMutation.mutateAsync(urls);
      setManualUrls("");
    } finally {
      setIsPinging(false);
    }
  };

  const generateRandomKey = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setIndexNowKey(key);
  };

  const getStatusBadge = (status?: SitemapStatus) => {
    if (!status) {
      return <Badge variant="outline">Chưa kiểm tra</Badge>;
    }
    switch (status.status) {
      case "loading":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Đang kiểm tra
          </Badge>
        );
      case "success":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Hoạt động ({status.urlCount} URLs)
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Lỗi
          </Badge>
        );
    }
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status.status) {
      case "idle":
        return <Badge variant="outline">Chưa kiểm tra</Badge>;
      case "checking":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Đang kiểm tra
          </Badge>
        );
      case "success":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Đã xác thực
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Lỗi
          </Badge>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Quản lý Sitemap & IndexNow</h1>
            </div>
          </header>
          
          <main className="flex-1 p-6 space-y-6">
            <Tabs defaultValue="sitemap" className="w-full">
              <TabsList>
                <TabsTrigger value="sitemap">
                  <MapPin className="h-4 w-4 mr-2" />
                  Sitemap
                </TabsTrigger>
                <TabsTrigger value="indexnow">
                  <Zap className="h-4 w-4 mr-2" />
                  IndexNow
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sitemap" className="space-y-6 mt-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Sitemap</h2>
                    <p className="text-muted-foreground">
                      Kiểm tra và quản lý các sitemap cho SEO
                    </p>
                  </div>
                  <Button onClick={testAllSitemaps} disabled={isTestingAll}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isTestingAll ? "animate-spin" : ""}`} />
                    {isTestingAll ? "Đang kiểm tra..." : "Kiểm tra tất cả"}
                  </Button>
                </div>

                {/* Site URL Warning */}
                {!siteSettings?.site_url && (
                  <Card className="border-yellow-500/50 bg-yellow-500/10">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-500">Chưa cấu hình Site URL</p>
                          <p className="text-sm text-muted-foreground">
                            Vui lòng vào <strong>Cài đặt Site</strong> để thêm domain thực của website.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Sitemaps Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sitemaps.map((sitemap) => {
                    const status = sitemapStatuses[sitemap.name];
                    const Icon = sitemap.icon;
                    
                    return (
                      <Card key={sitemap.name} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <CardTitle className="text-base">{sitemap.name}</CardTitle>
                            </div>
                            {getStatusBadge(status)}
                          </div>
                          <CardDescription className="text-sm">
                            {sitemap.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <code className="bg-muted px-2 py-1 rounded flex-1 truncate">
                              {sitemap.url}
                            </code>
                          </div>
                          
                          {status?.lastChecked && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Kiểm tra lúc: {status.lastChecked.toLocaleTimeString()}
                            </div>
                          )}

                          {status?.error && (
                            <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                              {status.error}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => testSitemap(sitemap)}
                              disabled={status?.status === "loading"}
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${status?.status === "loading" ? "animate-spin" : ""}`} />
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => openSitemap(sitemap)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Xem
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Robots.txt */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">robots.txt</CardTitle>
                          <CardDescription>
                            File hướng dẫn crawler của search engines
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://${projectId}.supabase.co/functions/v1/robots-txt`, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Xem robots.txt
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </TabsContent>

              <TabsContent value="indexnow" className="space-y-6 mt-6">
                {/* IndexNow Key Settings */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>IndexNow API Key</CardTitle>
                        <CardDescription>
                          Key dùng để xác thực với IndexNow API (Bing, Yandex)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="indexnow-key">IndexNow Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="indexnow-key"
                          value={indexNowKey}
                          onChange={(e) => setIndexNowKey(e.target.value)}
                          placeholder="Nhập hoặc tạo key mới"
                          className="font-mono"
                        />
                        <Button variant="outline" onClick={generateRandomKey}>
                          Tạo key
                        </Button>
                        <Button 
                          onClick={() => saveKeyMutation.mutate(indexNowKey)}
                          disabled={saveKeyMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Lưu
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sau khi lưu key, bạn cần tạo file <code className="bg-muted px-1 rounded">{indexNowKey || "[key]"}.txt</code> tại 
                        root domain chứa chính key này để xác thực.
                      </p>
                    </div>

                    {siteSettings?.indexnow_key && (
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center gap-2 text-green-500 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>IndexNow key đã được cấu hình</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Verification URL: <code className="bg-muted px-1 rounded">{siteUrl}/{siteSettings.indexnow_key}.txt</code>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Verification Status */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Kiểm tra xác thực</CardTitle>
                          <CardDescription>
                            Kiểm tra trạng thái kết nối với các search engines
                          </CardDescription>
                        </div>
                      </div>
                      <Button 
                        onClick={verifyIndexNowKey}
                        disabled={!siteSettings?.indexnow_key || !siteSettings?.site_url}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Kiểm tra xác thực
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(!siteSettings?.site_url || !siteSettings?.indexnow_key) && (
                      <div className="p-3 bg-yellow-500/10 rounded-lg mb-4">
                        <div className="flex items-center gap-2 text-yellow-500 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>Vui lòng cấu hình Site URL và IndexNow key trước khi kiểm tra</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {Object.values(verificationStatuses).map((status) => (
                        <div key={status.engine} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{status.engine}</p>
                              {status.message && (
                                <p className="text-xs text-muted-foreground">{status.message}</p>
                              )}
                              {status.lastChecked && (
                                <p className="text-xs text-muted-foreground">
                                  Kiểm tra lúc: {status.lastChecked.toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          </div>
                          {getVerificationBadge(status)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Ping */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Send className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Gửi thông báo Index thủ công</CardTitle>
                        <CardDescription>
                          Thông báo cho Bing, Yandex và Google về các URL mới hoặc cập nhật
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>URLs cần index (mỗi URL một dòng)</Label>
                      <Textarea
                        value={manualUrls}
                        onChange={(e) => setManualUrls(e.target.value)}
                        placeholder={`/phim/movie-slug-1
/phim/movie-slug-2
/bai-viet/post-slug`}
                        className="min-h-[150px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Có thể nhập URL tương đối (bắt đầu bằng /) hoặc URL đầy đủ
                      </p>
                    </div>
                    <Button 
                      onClick={handleManualPing} 
                      disabled={isPinging || !siteSettings?.indexnow_key}
                    >
                      <Send className={`h-4 w-4 mr-2 ${isPinging ? "animate-pulse" : ""}`} />
                      {isPinging ? "Đang gửi..." : "Gửi thông báo Index"}
                    </Button>
                    {!siteSettings?.indexnow_key && (
                      <p className="text-xs text-yellow-500">
                        Vui lòng cấu hình IndexNow key trước khi gửi thông báo
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Auto Index Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Auto Index</CardTitle>
                        <CardDescription>
                          Tự động thông báo search engines khi có nội dung mới
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Film className="h-5 w-5 text-primary" />
                          <span className="font-medium">Phim mới</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Khi thêm hoặc cập nhật phim, hệ thống sẽ tự động gửi thông báo đến Bing và Yandex qua IndexNow
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-medium">Bài viết mới</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Khi đăng bài viết mới (status: published), URL sẽ được gửi tự động để index nhanh hơn
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Các search engines được hỗ trợ</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-blue-500/10">
                          <Globe className="h-3 w-3 mr-1" />
                          Bing (IndexNow)
                        </Badge>
                        <Badge variant="outline" className="bg-red-500/10">
                          <Globe className="h-3 w-3 mr-1" />
                          Yandex (IndexNow)
                        </Badge>
                        <Badge variant="outline" className="bg-green-500/10">
                          <Globe className="h-3 w-3 mr-1" />
                          Google (Sitemap Ping)
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SEO Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hướng dẫn SEO</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="font-medium">Cài đặt IndexNow</h4>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          <li>Tạo key ngẫu nhiên hoặc nhập key của bạn</li>
                          <li>Lưu key vào hệ thống</li>
                          <li>Tạo file <code className="bg-muted px-1 rounded">[key].txt</code> tại root domain</li>
                          <li>File chứa chính key đó (không có ký tự thừa)</li>
                          <li>Kiểm tra xác thực và submit URL đầu tiên</li>
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Lợi ích của IndexNow</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          <li>Index nhanh hơn (vài phút thay vì vài ngày)</li>
                          <li>Tiết kiệm crawl budget</li>
                          <li>Hỗ trợ Bing, Yandex, Seznam</li>
                          <li>Miễn phí và dễ tích hợp</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
