import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Image, Code, FileText, Settings, Palette, Smartphone, Search, RefreshCw, Copy, Check, Cloud, Shield } from "lucide-react";
import CacheManagementCard from "@/components/admin/CacheManagementCard";
import { Switch } from "@/components/ui/switch";
import MediaPicker from "@/components/admin/MediaPicker";
import { googleFonts } from "@/components/ThemeProvider";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  created_at: string;
  updated_at: string;
}

// Default values for settings that need defaults
const defaultSettings: Record<string, string> = {
  theme_primary_color: "#e11d48",
  theme_font_family: "Be Vietnam Pro",
  site_language: "vi",
  use_external_api: "false",
  external_api_source: "phimapi",
};

export default function SiteSettings() {
  const queryClient = useQueryClient();
  // Start with empty settings - will be populated from database
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Generate random IndexNow key
  const generateIndexNowKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSettings(prev => ({ ...prev, indexnow_key: key }));
    toast.success("Đã tạo IndexNow key mới");
  };

  // Copy key to clipboard
  const copyKeyToClipboard = () => {
    if (settings.indexnow_key) {
      navigator.clipboard.writeText(settings.indexnow_key);
      setCopiedKey(true);
      toast.success("Đã sao chép key");
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Fetch settings - always fresh data on page load
  const { data: siteSettings, isLoading, refetch } = useQuery({
    queryKey: ["site-settings-admin"],
    queryFn: async () => {
      console.log("[SiteSettings] Fetching settings from database...");
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) {
        console.error("[SiteSettings] Error fetching:", error);
        throw error;
      }
      console.log("[SiteSettings] Fetched data:", data);
      return data as SiteSetting[];
    },
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 0, // Don't cache
  });

  // Force refetch on mount to get fresh data
  useEffect(() => {
    refetch();
  }, []);

  // Update settings when data is loaded - ONLY from database values
  useEffect(() => {
    if (!isLoading && siteSettings !== undefined) {
      console.log("[SiteSettings] Processing settings:", siteSettings);
      if (siteSettings && Array.isArray(siteSettings) && siteSettings.length > 0) {
        const settingsMap: Record<string, string> = {};
        siteSettings.forEach(s => {
          // Convert value to string, handle null/undefined with defaults
          const value = s.setting_value;
          if (value !== null && value !== undefined && value !== "") {
            // Convert to string in case it's stored as boolean
            settingsMap[s.setting_key] = String(value);
            console.log(`[SiteSettings] Loaded: ${s.setting_key} = ${value}`);
          } else {
            settingsMap[s.setting_key] = defaultSettings[s.setting_key] || "";
          }
        });
        // Only set from database, don't merge with empty initial state
        setSettings(settingsMap);
      } else {
        // No settings in DB yet, use defaults
        console.log("[SiteSettings] No settings found, using defaults");
        setSettings({ ...defaultSettings });
      }
      setIsInitialized(true);
    }
  }, [siteSettings, isLoading]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value || null,
        setting_type: "text",
      }));

      // Use batch upsert for better performance and reliability
      const { error } = await supabase
        .from("site_settings")
        .upsert(updates, { 
          onConflict: "setting_key",
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error("Error saving settings:", error);
        throw error;
      }
      
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["theme-settings"] });
      toast.success("Lưu cài đặt thành công");
    },
    onError: (error: any) => {
      console.error("Save mutation error:", error);
      toast.error("Lỗi khi lưu: " + (error?.message || "Không xác định"));
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleMediaSelect = (url: string) => {
    if (showMediaPicker) {
      setSettings(prev => ({ ...prev, [showMediaPicker]: url }));
      setShowMediaPicker(null);
    }
  };

  // Helper function to get setting value with fallback
  const getSetting = (key: string): string => {
    return settings[key] ?? defaultSettings[key] ?? "";
  };

  // Helper function to update setting
  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading || !isInitialized) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

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
                <h1 className="text-xl font-bold">Cài đặt Website</h1>
                <p className="text-sm text-muted-foreground">Quản lý cấu hình hệ thống</p>
              </div>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Đang lưu..." : "Lưu cài đặt"}
              </Button>
            </div>
          </header>

          <div className="p-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="general">
                  <Settings className="mr-2 h-4 w-4" />
                  Cài đặt chung
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="mr-2 h-4 w-4" />
                  Bảo mật
                </TabsTrigger>
                <TabsTrigger value="api">
                  <Cloud className="mr-2 h-4 w-4" />
                  API Nguồn phim
                </TabsTrigger>
                <TabsTrigger value="seo">
                  <Search className="mr-2 h-4 w-4" />
                  SEO & Index
                </TabsTrigger>
                <TabsTrigger value="pwa">
                  <Smartphone className="mr-2 h-4 w-4" />
                  Cài đặt App
                </TabsTrigger>
                <TabsTrigger value="theme">
                  <Palette className="mr-2 h-4 w-4" />
                  Giao diện
                </TabsTrigger>
                <TabsTrigger value="head">
                  <Code className="mr-2 h-4 w-4" />
                  Head HTML
                </TabsTrigger>
                <TabsTrigger value="footer">
                  <FileText className="mr-2 h-4 w-4" />
                  Footer HTML
                </TabsTrigger>
              </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>URL Website</CardTitle>
              <CardDescription>
                URL chính của website, được sử dụng cho sitemap, canonical URL và SEO.
                Ví dụ: https://example.com (không có dấu / ở cuối)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={getSetting("site_url")}
                onChange={(e) => updateSetting("site_url", e.target.value)}
                placeholder="https://example.com"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tên Website</CardTitle>
              <CardDescription>
                Tên website hiển thị trong title và meta tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={getSetting("site_name")}
                onChange={(e) => updateSetting("site_name", e.target.value)}
                placeholder="Tên website của bạn"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Logo hiển thị trên header của website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {getSetting("logo_url") && (
                  <div className="h-16 w-40 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                    <img
                      src={getSetting("logo_url")}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    value={getSetting("logo_url")}
                    onChange={(e) => updateSetting("logo_url", e.target.value)}
                    placeholder="URL logo hoặc chọn từ thư viện"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMediaPicker("logo_url")}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Chọn ảnh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Favicon</CardTitle>
              <CardDescription>
                Icon hiển thị trên tab trình duyệt (khuyến nghị 32x32 hoặc 16x16 px)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {getSetting("favicon_url") && (
                  <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                    <img
                      src={getSetting("favicon_url")}
                      alt="Favicon"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    value={getSetting("favicon_url")}
                    onChange={(e) => updateSetting("favicon_url", e.target.value)}
                    placeholder="URL favicon hoặc chọn từ thư viện"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMediaPicker("favicon_url")}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Chọn ảnh
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Đăng nhập & Đăng ký</CardTitle>
              <CardDescription>
                Quản lý chức năng đăng nhập và đăng ký người dùng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Cho phép đăng nhập</Label>
                  <p className="text-sm text-muted-foreground">
                    Khi tắt, người dùng không thể đăng nhập vào trang web
                  </p>
                </div>
                <Switch
                  checked={getSetting("auth_login_enabled") !== "false"}
                  onCheckedChange={(checked) => 
                    updateSetting("auth_login_enabled", checked ? "true" : "false")
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Cho phép đăng ký</Label>
                  <p className="text-sm text-muted-foreground">
                    Khi tắt, người dùng mới không thể tạo tài khoản
                  </p>
                </div>
                <Switch
                  checked={getSetting("auth_signup_enabled") !== "false"}
                  onCheckedChange={(checked) => 
                    updateSetting("auth_signup_enabled", checked ? "true" : "false")
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đường dẫn đăng nhập Admin</CardTitle>
              <CardDescription>
                Tùy chỉnh đường dẫn đăng nhập để tăng bảo mật. Thay vì /auth, bạn có thể sử dụng đường dẫn bí mật như /admin-secret-login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Sử dụng đường dẫn tùy chỉnh</Label>
                  <p className="text-sm text-muted-foreground">
                    Khi bật, chỉ có thể đăng nhập qua đường dẫn bí mật
                  </p>
                </div>
                <Switch
                  checked={getSetting("auth_custom_path_enabled") === "true"}
                  onCheckedChange={(checked) => 
                    updateSetting("auth_custom_path_enabled", checked ? "true" : "false")
                  }
                />
              </div>

              {getSetting("auth_custom_path_enabled") === "true" && (
                <div className="space-y-2">
                  <Label>Đường dẫn đăng nhập</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">/</span>
                    <Input
                      value={getSetting("auth_custom_path")}
                      onChange={(e) => {
                        // Remove special characters, only allow alphanumeric and hyphens
                        const sanitized = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
                        updateSetting("auth_custom_path", sanitized);
                      }}
                      placeholder="admin-login-secret"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chỉ sử dụng chữ cái, số và dấu gạch ngang. Ví dụ: admin-secret, taidt, my-login
                  </p>
                  
                  {getSetting("auth_custom_path") && getSetting("site_url") && (
                    <div className="p-3 bg-muted rounded-md text-sm mt-2">
                      <p className="font-medium">URL đăng nhập mới:</p>
                      <code className="text-xs text-primary break-all">
                        {getSetting("site_url")}/{getSetting("auth_custom_path")}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-400">Lưu ý bảo mật</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• <strong>Đường dẫn tùy chỉnh</strong>: Giúp ẩn trang đăng nhập khỏi bot và người lạ.</p>
              <p>• <strong>Ghi nhớ đường dẫn</strong>: Nếu quên đường dẫn bí mật, bạn cần truy cập database để reset.</p>
              <p>• Truy cập /auth khi bật đường dẫn tùy chỉnh sẽ hiển thị trang 404.</p>
              <p>• Đảm bảo lưu đường dẫn bí mật ở nơi an toàn.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nguồn dữ liệu phim</CardTitle>
              <CardDescription>
                Chọn cách hiển thị phim trên trang: từ database (đã crawl) hoặc gọi trực tiếp từ API bên ngoài.
                Dùng API bên ngoài giúp tiết kiệm chi phí lưu trữ nhưng phụ thuộc vào nguồn API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Sử dụng API bên ngoài</Label>
                  <p className="text-sm text-muted-foreground">
                    Khi bật, các trang danh sách phim sẽ gọi trực tiếp từ API thay vì database
                  </p>
                </div>
                <Switch
                  checked={getSetting("use_external_api") === "true"}
                  onCheckedChange={(checked) => 
                    updateSetting("use_external_api", checked ? "true" : "false")
                  }
                />
              </div>

              {getSetting("use_external_api") === "true" && (
                <>
                  <div className="space-y-2">
                    <Label>Nguồn API mặc định</Label>
                    <Select
                      value={getSetting("external_api_source") || "phimapi"}
                      onValueChange={(value) => updateSetting("external_api_source", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phimapi">PhimAPI (phimapi.com)</SelectItem>
                        <SelectItem value="nguonc">NguonC (nguonc.com)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Nguồn API sẽ được sử dụng cho các trang danh sách phim khi bật tùy chọn này.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Thời gian cache (phút)</Label>
                    <Select
                      value={getSetting("api_cache_ttl") || "5"}
                      onValueChange={(value) => updateSetting("api_cache_ttl", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 phút - Cập nhật rất nhanh</SelectItem>
                        <SelectItem value="5">5 phút - Mặc định</SelectItem>
                        <SelectItem value="15">15 phút - Ổn định hơn</SelectItem>
                        <SelectItem value="30">30 phút - Tiết kiệm băng thông</SelectItem>
                        <SelectItem value="60">1 giờ - Ít tải API nhất</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Cache sẽ tự động làm mới sau khoảng thời gian này. Thời gian ngắn = phim mới hơn nhưng tải API nhiều hơn.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Tự động làm mới cache khi truy cập</Label>
                      <p className="text-sm text-muted-foreground">
                        Khi người dùng truy cập trang, cache sẽ tự động làm mới nếu hết hạn
                      </p>
                    </div>
                    <Switch
                      checked={getSetting("api_auto_refresh") !== "false"}
                      onCheckedChange={(checked) => 
                        updateSetting("api_auto_refresh", checked ? "true" : "false")
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Manual Cache Clear Section */}
          <CacheManagementCard 
            apiSource={getSetting("external_api_source") || "phimapi"}
          />

          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-400">Lưu ý quan trọng</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• <strong>Database (Mặc định)</strong>: Chỉ hiển thị phim đã crawl, admin kiểm soát hoàn toàn nội dung.</p>
              <p>• <strong>API bên ngoài</strong>: Tiết kiệm lưu trữ, phim nhiều hơn nhưng phụ thuộc vào nguồn API.</p>
              <p>• <strong>Ưu tiên local</strong>: Nếu phim đã được crawl, hệ thống sẽ ưu tiên dữ liệu từ database.</p>
              <p>• <strong>Auto-refresh cache</strong>: Cache sẽ tự động làm mới khi người dùng truy cập, đảm bảo phim mới nhất.</p>
              <p>• Widget có thể ghi đè cài đặt này với tùy chọn riêng.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>IndexNow Key</CardTitle>
              <CardDescription>
                Key để xác thực với các công cụ tìm kiếm (Bing, Yandex) khi gửi thông báo cập nhật nội dung.
                Key này sẽ được tự động sử dụng khi bạn thêm/cập nhật phim hoặc bài viết.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={getSetting("indexnow_key")}
                  onChange={(e) => updateSetting("indexnow_key", e.target.value)}
                  placeholder="Nhập hoặc tạo tự động IndexNow key"
                  className="flex-1 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateIndexNowKey}
                  title="Tạo key mới"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyKeyToClipboard}
                  disabled={!getSetting("indexnow_key")}
                  title="Sao chép key"
                >
                  {copiedKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {getSetting("indexnow_key") && getSetting("site_url") && (
                <div className="p-3 bg-muted rounded-md text-sm space-y-2">
                  <p className="font-medium">URL xác thực key:</p>
                  <code className="text-xs break-all text-primary">
                    {getSetting("site_url")}/{getSetting("indexnow_key")}.txt
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    File xác thực này sẽ được tự động tạo bởi hệ thống.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-500/50 bg-blue-500/10">
            <CardHeader>
              <CardTitle className="text-blue-400">Hướng dẫn IndexNow</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Nhấn nút <RefreshCw className="inline h-3 w-3" /> để tạo key mới hoặc nhập key có sẵn.</p>
              <p>2. Đảm bảo đã cấu hình <strong>Site URL</strong> ở tab Cài đặt chung.</p>
              <p>3. Nhấn <strong>Lưu cài đặt</strong> để lưu key.</p>
              <p>4. Khi thêm/cập nhật phim hoặc bài viết, hệ thống sẽ tự động ping các công cụ tìm kiếm.</p>
              <p>5. Xem trạng thái ping tại trang <strong>Quản lý Sitemap</strong>.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pwa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tên ứng dụng</CardTitle>
              <CardDescription>
                Tên đầy đủ của ứng dụng hiển thị khi người dùng cài đặt app trên điện thoại
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={getSetting("pwa_app_name")}
                onChange={(e) => updateSetting("pwa_app_name", e.target.value)}
                placeholder="Phim HD - Xem phim online"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tên ngắn</CardTitle>
              <CardDescription>
                Tên ngắn hiển thị dưới icon app trên màn hình chính (tối đa 12 ký tự)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={getSetting("pwa_short_name")}
                onChange={(e) => updateSetting("pwa_short_name", e.target.value)}
                placeholder="PhimHD"
                maxLength={12}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Icon App (192x192)</CardTitle>
              <CardDescription>
                Icon hiển thị trên màn hình chính điện thoại. Khuyến nghị kích thước 192x192 pixel, định dạng PNG.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {getSetting("pwa_icon_192") && (
                  <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={getSetting("pwa_icon_192")}
                      alt="Icon 192"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    value={getSetting("pwa_icon_192")}
                    onChange={(e) => updateSetting("pwa_icon_192", e.target.value)}
                    placeholder="URL icon 192x192 hoặc chọn từ thư viện"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMediaPicker("pwa_icon_192")}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Chọn ảnh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Icon App (512x512)</CardTitle>
              <CardDescription>
                Icon lớn cho splash screen và cửa hàng ứng dụng. Khuyến nghị kích thước 512x512 pixel, định dạng PNG.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {getSetting("pwa_icon_512") && (
                  <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={getSetting("pwa_icon_512")}
                      alt="Icon 512"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    value={getSetting("pwa_icon_512")}
                    onChange={(e) => updateSetting("pwa_icon_512", e.target.value)}
                    placeholder="URL icon 512x512 hoặc chọn từ thư viện"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMediaPicker("pwa_icon_512")}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Chọn ảnh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-400">Lưu ý quan trọng</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Icon nên có nền trong suốt hoặc nền vuông để hiển thị đẹp trên các thiết bị.</p>
              <p>• Sau khi thay đổi icon, người dùng cần cài lại app để thấy icon mới.</p>
              <p>• Định dạng khuyến nghị: PNG với kích thước chính xác 192x192 và 512x512.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Màu chủ đạo</CardTitle>
              <CardDescription>Chọn màu chính cho giao diện website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={getSetting("theme_primary_color")}
                  onChange={(e) => updateSetting("theme_primary_color", e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border"
                />
                <Input
                  value={getSetting("theme_primary_color")}
                  onChange={(e) => updateSetting("theme_primary_color", e.target.value)}
                  placeholder="#e11d48"
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Font chữ</CardTitle>
              <CardDescription>Chọn font chữ từ Google Fonts</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={getSetting("theme_font_family")}
                onValueChange={(value) => updateSetting("theme_font_family", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(googleFonts).map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ngôn ngữ</CardTitle>
              <CardDescription>Ngôn ngữ mặc định của website</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={getSetting("site_language")}
                onValueChange={(value) => updateSetting("site_language", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="head" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics (GA4)</CardTitle>
              <CardDescription>
                Nhập Measurement ID từ Google Analytics 4. Ví dụ: G-XXXXXXXXXX
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={getSetting("google_analytics_id")}
                onChange={(e) => updateSetting("google_analytics_id", e.target.value)}
                placeholder="G-XXXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Lấy ID tại: Google Analytics → Admin → Data Streams → Measurement ID
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Google Tag Manager</CardTitle>
              <CardDescription>
                Nhập Container ID từ Google Tag Manager. Ví dụ: GTM-XXXXXXX
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={getSetting("google_tag_manager_id")}
                onChange={(e) => updateSetting("google_tag_manager_id", e.target.value)}
                placeholder="GTM-XXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Lấy ID tại: Google Tag Manager → Container → Container ID (góc trên bên phải)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facebook App ID</CardTitle>
              <CardDescription>
                Nhập App ID từ Facebook Developers để sử dụng Facebook Comments và các tính năng khác.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={getSetting("facebook_app_id")}
                onChange={(e) => updateSetting("facebook_app_id", e.target.value)}
                placeholder="123456789012345"
              />
              <p className="text-xs text-muted-foreground">
                Lấy App ID tại: <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.facebook.com/apps</a> → Chọn App → Settings → Basic → App ID
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>HTML tùy chỉnh (Head)</CardTitle>
              <CardDescription>
                Thêm mã HTML/CSS/JS khác vào phần &lt;head&gt; của trang. Ví dụ: Facebook Pixel, 
                custom fonts, meta tags...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={getSetting("head_html")}
                onChange={(e) => updateSetting("head_html", e.target.value)}
                placeholder={`<!-- Ví dụ: Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)...
</script>

<!-- Custom fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- Custom meta tags -->
<meta name="theme-color" content="#000000">`}
                className="min-h-[200px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>HTML Footer tùy chỉnh</CardTitle>
              <CardDescription>
                Thêm mã HTML cho phần chân trang. Có thể sử dụng để thêm liên kết, 
                thông tin liên hệ, copyright... Footer mặc định sẽ ẩn khi có HTML tùy chỉnh.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={() => {
                  const template = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; padding: 2rem 0;">
  <!-- Cột 1: Logo và mô tả -->
  <div>
    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
      <img src="/logo.png" alt="Logo" style="height: 32px; width: auto;" />
      <span style="font-size: 1.25rem; font-weight: bold;">
        <span style="color: var(--primary);">KK</span>Phim
      </span>
    </div>
    <p style="color: #9ca3af; font-size: 0.875rem;">
      Xem phim online miễn phí chất lượng cao, cập nhật nhanh nhất.
    </p>
  </div>

  <!-- Cột 2: Danh mục -->
  <div>
    <h3 style="font-weight: 600; margin-bottom: 0.75rem;">Danh mục</h3>
    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem;">
      <li><a href="/danh-muc/phim" style="color: #9ca3af; text-decoration: none;">Tất cả phim</a></li>
      <li><a href="/danh-sach/phim-bo" style="color: #9ca3af; text-decoration: none;">Phim Bộ</a></li>
      <li><a href="/danh-sach/phim-le" style="color: #9ca3af; text-decoration: none;">Phim Lẻ</a></li>
      <li><a href="/danh-sach/hoat-hinh" style="color: #9ca3af; text-decoration: none;">Hoạt Hình</a></li>
    </ul>
  </div>

  <!-- Cột 3: Thể loại -->
  <div>
    <h3 style="font-weight: 600; margin-bottom: 0.75rem;">Thể loại</h3>
    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem;">
      <li><a href="/the-loai/hanh-dong" style="color: #9ca3af; text-decoration: none;">Hành Động</a></li>
      <li><a href="/the-loai/tinh-cam" style="color: #9ca3af; text-decoration: none;">Tình Cảm</a></li>
      <li><a href="/the-loai/kinh-di" style="color: #9ca3af; text-decoration: none;">Kinh Dị</a></li>
      <li><a href="/the-loai/hai-huoc" style="color: #9ca3af; text-decoration: none;">Hài Hước</a></li>
    </ul>
  </div>

  <!-- Cột 4: Liên hệ -->
  <div>
    <h3 style="font-weight: 600; margin-bottom: 0.75rem;">Liên hệ</h3>
    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: #9ca3af;">
      <li>Email: contact@kkphim.com</li>
      <li>DMCA: dmca@kkphim.com</li>
    </ul>
  </div>
</div>

<!-- Copyright -->
<div style="border-top: 1px solid #374151; padding-top: 1.5rem; text-align: center;">
  <p style="font-size: 0.875rem; color: #9ca3af;">
    © 2025 KKPhim - Xem phim online miễn phí
  </p>
  <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem;">
    Disclaimer: Website này không lưu trữ bất kỳ tệp phim nào trên máy chủ của mình.
  </p>
</div>`;
                  updateSetting("footer_html", template);
                  toast.success("Đã chèn mẫu footer. Hãy chỉnh sửa theo ý bạn!");
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Chèn mẫu Footer
              </Button>
              <Textarea
                value={getSetting("footer_html")}
                onChange={(e) => updateSetting("footer_html", e.target.value)}
                placeholder={`<!-- Nhấn "Chèn mẫu Footer" để bắt đầu với template mẫu -->`}
                className="min-h-[400px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Bạn có thể thay đổi logo, tên trang, email, link theo ý muốn. Sử dụng inline style để đảm bảo hiển thị đúng.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Media Picker Dialog */}
      {showMediaPicker && (
        <MediaPicker
          open={!!showMediaPicker}
          onOpenChange={(open) => !open && setShowMediaPicker(null)}
          onSelect={handleMediaSelect}
        />
      )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
