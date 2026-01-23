import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SEOPreview, { CharacterCounter } from "@/components/admin/movie-edit/SEOPreview";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface SeoSettings {
  [key: string]: string;
}

const variablesList = [
  { var: "%sitename%", desc: "Tên website" },
  { var: "%phim%", desc: "Tên phim" },
  { var: "%phimgoc%", desc: "Tên gốc phim" },
  { var: "%theloai%", desc: "Thể loại" },
  { var: "%quocgia%", desc: "Quốc gia" },
  { var: "%nam%", desc: "Năm sản xuất" },
  { var: "%tag%", desc: "Từ khóa/tag" },
  { var: "%dienvien%", desc: "Diễn viên" },
  { var: "%daodien%", desc: "Đạo diễn" },
  { var: "%tap%", desc: "Tập phim (tập 1, Full, hoàn tất...)" },
  { var: "%chatluong%", desc: "Chất lượng (FullHD, HD, CAM...)" },
  { var: "%ngonngu%", desc: "Ngôn ngữ (Vietsub, Lồng Tiếng...)" },
  { var: "%noidung%", desc: "Nội dung/mô tả phim" },
  { var: "%thumb%", desc: "Ảnh thumbnail" },
];

const VariablesInfo = () => (
  <Card className="mb-6">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2">
        <Info className="h-4 w-4" />
        Các biến có thể sử dụng
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
        {variablesList.map(({ var: v, desc }) => (
          <div key={v} className="flex items-center gap-2">
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{v}</code>
            <span className="text-muted-foreground text-xs">{desc}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const SeoSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SeoSettings>({});
  const [activeTab, setActiveTab] = useState("homepage");

  // Fetch settings
  const { data: seoData, isLoading } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_settings")
        .select("*");
      if (error) throw error;
      const settingsObj: SeoSettings = {};
      data?.forEach((item: any) => {
        settingsObj[item.setting_key] = item.setting_value || "";
      });
      return settingsObj;
    },
  });

  useEffect(() => {
    if (seoData) {
      setSettings(seoData);
    }
  }, [seoData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: SeoSettings) => {
      for (const [key, value] of Object.entries(newSettings)) {
        const { error } = await supabase
          .from("seo_settings")
          .upsert(
            { setting_key: key, setting_value: value },
            { onConflict: "setting_key" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
      toast({ title: "Đã lưu cài đặt SEO" });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Không thể lưu cài đặt: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
                <h1 className="text-xl font-bold">Cài đặt SEO</h1>
                <p className="text-sm text-muted-foreground">Quản lý cấu hình SEO và meta tags</p>
              </div>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Lưu cài đặt
              </Button>
            </div>
          </header>

          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="homepage">Trang chủ</TabsTrigger>
                <TabsTrigger value="movie">Phim</TabsTrigger>
                <TabsTrigger value="genre">Thể loại</TabsTrigger>
                <TabsTrigger value="country">Quốc gia</TabsTrigger>
                <TabsTrigger value="slug">Slug</TabsTrigger>
              </TabsList>

        {/* Tab Trang chủ */}
        <TabsContent value="homepage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Trang chủ</CardTitle>
              <CardDescription>Cấu hình meta tags cho trang chủ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Meta Site Name</Label>
                  <Input
                    value={settings.site_name || ""}
                    onChange={(e) => updateSetting("site_name", e.target.value)}
                    placeholder="Tên website"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meta Shortcut Icon (Favicon URL)</Label>
                  <Input
                    value={settings.favicon_url || ""}
                    onChange={(e) => updateSetting("favicon_url", e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hình thu nhỏ OpenGraph (og:image)</Label>
                  <Input
                    value={settings.og_image || ""}
                    onChange={(e) => updateSetting("og_image", e.target.value)}
                    placeholder="https://example.com/og-image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea
                    value={settings.site_description || ""}
                    onChange={(e) => updateSetting("site_description", e.target.value)}
                    placeholder="Mô tả website..."
                    rows={3}
                  />
                  <CharacterCounter
                    current={settings.site_description?.length || 0}
                    max={160}
                    label="Meta Description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meta Keywords</Label>
                  <Input
                    value={settings.site_keywords || ""}
                    onChange={(e) => updateSetting("site_keywords", e.target.value)}
                    placeholder="phim, xem phim, phim online..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Head Meta Tags (HTML)</Label>
                  <Textarea
                    value={settings.head_meta_tags || ""}
                    onChange={(e) => updateSetting("head_meta_tags", e.target.value)}
                    placeholder={`<meta charset="utf-8" />\n<meta name="viewport" content="initial-scale=1.0, width=device-width" />\n<meta name="robots" content="index,follow" />`}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab SEO Phim */}
        <TabsContent value="movie" className="space-y-6">
          <VariablesInfo />
          <Card>
            <CardHeader>
              <CardTitle>SEO Phim</CardTitle>
              <CardDescription>Cấu hình SEO cho trang chi tiết phim</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Tiêu đề SEO
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Ví dụ: Xem %phim% %ngonngu% %tap% %chatluong% %sitename%
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  value={settings.movie_seo_title || ""}
                  onChange={(e) => updateSetting("movie_seo_title", e.target.value)}
                  placeholder="Xem %phim% %ngonngu% %tap% %chatluong% %sitename%"
                />
                <CharacterCounter
                  current={settings.movie_seo_title?.length || 0}
                  max={60}
                  label="Tiêu đề SEO"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Thẻ mô tả
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Ví dụ: Xem %phim% %tap% cập nhật mới nhất tại %sitename%. %noidung%
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Textarea
                  value={settings.movie_seo_description || ""}
                  onChange={(e) => updateSetting("movie_seo_description", e.target.value)}
                  placeholder="Xem %phim% %tap% cập nhật mới nhất tại %sitename%. %noidung%"
                  rows={3}
                />
                <CharacterCounter
                  current={settings.movie_seo_description?.length || 0}
                  max={160}
                  label="Thẻ mô tả"
                />
              </div>

              <SEOPreview
                title={settings.movie_seo_title || "Xem %phim% %ngonngu% %tap% %chatluong%"}
                description={settings.movie_seo_description || "Xem %phim% cập nhật mới nhất..."}
                url="/phim/%phim%"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab SEO Thể loại */}
        <TabsContent value="genre" className="space-y-6">
          <VariablesInfo />
          <Card>
            <CardHeader>
              <CardTitle>SEO Thể loại</CardTitle>
              <CardDescription>Cấu hình SEO cho trang thể loại phim</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tiêu đề SEO</Label>
                <Input
                  value={settings.genre_seo_title || ""}
                  onChange={(e) => updateSetting("genre_seo_title", e.target.value)}
                  placeholder="Phim %theloai% - %sitename%"
                />
              </div>

              <div className="space-y-2">
                <Label>Thẻ mô tả</Label>
                <Textarea
                  value={settings.genre_seo_description || ""}
                  onChange={(e) => updateSetting("genre_seo_description", e.target.value)}
                  placeholder="Xem phim %theloai% mới nhất, chất lượng cao tại %sitename%"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords</Label>
                <Input
                  value={settings.genre_seo_keywords || ""}
                  onChange={(e) => updateSetting("genre_seo_keywords", e.target.value)}
                  placeholder="phim %theloai%, xem phim %theloai%"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab SEO Quốc gia */}
        <TabsContent value="country" className="space-y-6">
          <VariablesInfo />
          <Card>
            <CardHeader>
              <CardTitle>SEO Quốc gia</CardTitle>
              <CardDescription>Cấu hình SEO cho trang quốc gia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tiêu đề SEO</Label>
                <Input
                  value={settings.country_seo_title || ""}
                  onChange={(e) => updateSetting("country_seo_title", e.target.value)}
                  placeholder="Phim %quocgia% - %sitename%"
                />
              </div>

              <div className="space-y-2">
                <Label>Thẻ mô tả</Label>
                <Textarea
                  value={settings.country_seo_description || ""}
                  onChange={(e) => updateSetting("country_seo_description", e.target.value)}
                  placeholder="Xem phim %quocgia% mới nhất, chất lượng cao tại %sitename%"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords</Label>
                <Input
                  value={settings.country_seo_keywords || ""}
                  onChange={(e) => updateSetting("country_seo_keywords", e.target.value)}
                  placeholder="phim %quocgia%, xem phim %quocgia%"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Tab SEO Slug */}
        <TabsContent value="slug" className="space-y-6">
          <VariablesInfo />
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình Slug URL</CardTitle>
              <CardDescription>Cấu hình cấu trúc URL cho các trang</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trang thông tin phim</Label>
                <Input
                  value={settings.slug_movie_info || ""}
                  onChange={(e) => updateSetting("slug_movie_info", e.target.value)}
                  placeholder="/phim/%phim%"
                />
                <p className="text-xs text-muted-foreground">Ví dụ: /phim/avatar-lua-va-tro-tan</p>
              </div>

              <div className="space-y-2">
                <Label>Trang xem phim</Label>
                <Input
                  value={settings.slug_movie_watch || ""}
                  onChange={(e) => updateSetting("slug_movie_watch", e.target.value)}
                  placeholder="/xem-phim/%phim%/%tap%"
                />
                <p className="text-xs text-muted-foreground">Ví dụ: /xem-phim/avatar-lua-va-tro-tan/tap-full</p>
              </div>

              <div className="space-y-2">
                <Label>Trang thể loại</Label>
                <Input
                  value={settings.slug_genre || ""}
                  onChange={(e) => updateSetting("slug_genre", e.target.value)}
                  placeholder="/the-loai/%theloai%"
                />
                <p className="text-xs text-muted-foreground">Ví dụ: /the-loai/am-nhac</p>
              </div>

              <div className="space-y-2">
                <Label>Trang quốc gia</Label>
                <Input
                  value={settings.slug_country || ""}
                  onChange={(e) => updateSetting("slug_country", e.target.value)}
                  placeholder="/quoc-gia/%quocgia%"
                />
                <p className="text-xs text-muted-foreground">Ví dụ: /quoc-gia/nhat-ban</p>
              </div>

              <div className="space-y-2">
                <Label>Trang từ khóa</Label>
                <Input
                  value={settings.slug_tag || ""}
                  onChange={(e) => updateSetting("slug_tag", e.target.value)}
                  placeholder="/tu-khoa/%tag%"
                />
                <p className="text-xs text-muted-foreground">Ví dụ: /tu-khoa/thu-gui-momo</p>
              </div>

              <div className="space-y-2">
                <Label>Trang diễn viên</Label>
                <Input
                  value={settings.slug_actor || ""}
                  onChange={(e) => updateSetting("slug_actor", e.target.value)}
                  placeholder="/dien-vien/%dienvien%"
                />
                <p className="text-xs text-muted-foreground">Ví dụ: /dien-vien/thanh-long</p>
              </div>

              <div className="space-y-2">
                <Label>Trang đạo diễn</Label>
                <Input
                  value={settings.slug_director || ""}
                  onChange={(e) => updateSetting("slug_director", e.target.value)}
                  placeholder="/dao-dien/%daodien%"
                />
                <p className="text-xs text-muted-foreground">Ví dụ: /dao-dien/hiroyuki-okiura</p>
              </div>
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

export default SeoSettings;
