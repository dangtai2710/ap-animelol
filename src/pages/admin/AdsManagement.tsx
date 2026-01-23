import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";

interface Ad {
  id: string;
  name: string;
  ad_type: string;
  position: string;
  content: string;
  is_active: boolean;
  pages: string[];
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

const AD_TYPES = [
  { value: "banner", label: "Banner", description: "Hiển thị banner quảng cáo (HTML/Script/Iframe)" },
  { value: "popup", label: "Popup Redirect", description: "Popup mở phía trước khi click" },
  { value: "popunder", label: "Popunder", description: "Popup mở phía sau khi click" },
  { value: "native", label: "Native Ads", description: "Quảng cáo tự nhiên trong nội dung" },
  { value: "smartlink", label: "Smartlink", description: "Link thông minh tự động chuyển hướng" },
  { value: "socialbar", label: "Social Bar", description: "Thanh quảng cáo cố định cuối trang" },
  { value: "vast_preroll", label: "VAST Pre-roll", description: "Video quảng cáo VAST 3.0 trước khi phát phim" },
  { value: "vast_midroll", label: "VAST Mid-roll", description: "Video quảng cáo VAST 3.0 giữa phim (sau X giây)" },
  { value: "vast_postroll", label: "VAST Post-roll", description: "Video quảng cáo VAST 3.0 sau khi kết thúc phim" },
];

const POSITIONS = [
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "sidebar", label: "Sidebar" },
  { value: "player", label: "Player" },
  { value: "content", label: "Trong nội dung" },
];

const PAGES = [
  { value: "all", label: "Tất cả trang" },
  { value: "home", label: "Trang chủ" },
  { value: "movie", label: "Trang phim" },
  { value: "tv", label: "Trang TV" },
  { value: "search", label: "Trang tìm kiếm" },
];

// Ad types that need position selection
const POSITION_REQUIRED_TYPES = ["banner"];

// VAST ad types that need additional configuration
const VAST_AD_TYPES = ["vast_preroll", "vast_midroll", "vast_postroll"];

export default function AdsManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    ad_type: "banner",
    position: "header",
    content: "",
    is_active: true,
    pages: ["all"],
    display_order: 0,
    start_date: "",
    end_date: "",
  });

  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-advertisements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Ad[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        ad_type: formData.ad_type,
        position: formData.position,
        content: formData.content,
        is_active: formData.is_active,
        pages: formData.pages,
        display_order: formData.display_order,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingAd) {
        const { error } = await supabase
          .from("advertisements")
          .update(payload)
          .eq("id", editingAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("advertisements")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
      toast.success(editingAd ? "Đã cập nhật quảng cáo" : "Đã thêm quảng cáo");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("advertisements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
      toast.success("Đã xóa quảng cáo");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("advertisements")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
    },
  });

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      name: ad.name,
      ad_type: ad.ad_type,
      position: ad.position,
      content: ad.content,
      is_active: ad.is_active,
      pages: ad.pages || ["all"],
      display_order: ad.display_order,
      start_date: ad.start_date?.split("T")[0] || "",
      end_date: ad.end_date?.split("T")[0] || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAd(null);
    setFormData({
      name: "",
      ad_type: "banner",
      position: "header",
      content: "",
      is_active: true,
      pages: ["all"],
      display_order: 0,
      start_date: "",
      end_date: "",
    });
  };

  // Handle ad type change to set default position for mid-roll
  const handleAdTypeChange = (adType: string) => {
    let position = formData.position;
    if (adType === "vast_midroll" && !formData.position.includes(":")) {
      position = "percent:50"; // Default to 50% of video
    } else if (!VAST_AD_TYPES.includes(adType) && formData.position.includes(":")) {
      position = "header"; // Reset to default position for non-VAST
    }
    setFormData({ ...formData, ad_type: adType, position });
  };

  const handlePageToggle = (page: string) => {
    setFormData(prev => {
      const pages = prev.pages.includes(page)
        ? prev.pages.filter(p => p !== page)
        : [...prev.pages, page];
      return { ...prev, pages };
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex items-center gap-3">
                <Megaphone className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Quản lý Quảng cáo</h1>
                  <p className="text-sm text-muted-foreground">Quản lý banner, popup, popunder, native, smartlink và social bar</p>
                </div>
              </div>
              <div className="ml-auto">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleCloseDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm quảng cáo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAd ? "Chỉnh sửa quảng cáo" : "Thêm quảng cáo mới"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tên quảng cáo</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Banner header 728x90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Thứ tự hiển thị</Label>
                          <Input
                            type="number"
                            value={formData.display_order}
                            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Loại quảng cáo</Label>
                          <Select
                            value={formData.ad_type}
                            onValueChange={handleAdTypeChange}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AD_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex flex-col">
                                    <span>{type.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {AD_TYPES.find(t => t.value === formData.ad_type)?.description}
                          </p>
                        </div>
                        {POSITION_REQUIRED_TYPES.includes(formData.ad_type) && (
                          <div className="space-y-2">
                            <Label>Vị trí</Label>
                            <Select
                              value={formData.position}
                              onValueChange={(value) => setFormData({ ...formData, position: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POSITIONS.map((pos) => (
                                  <SelectItem key={pos.value} value={pos.value}>
                                    {pos.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {VAST_AD_TYPES.includes(formData.ad_type)
                            ? "VAST Tag URL"
                            : formData.ad_type === "banner" || formData.ad_type === "native" || formData.ad_type === "socialbar"
                            ? "Mã HTML/Script" 
                            : "URL Redirect"}
                        </Label>
                        <Textarea
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          placeholder={
                            VAST_AD_TYPES.includes(formData.ad_type)
                              ? "https://example.com/vast.xml hoặc https://pubads.g.doubleclick.net/..."
                              : formData.ad_type === "banner" || formData.ad_type === "native" || formData.ad_type === "socialbar"
                              ? "<script>...</script> hoặc <iframe>...</iframe>"
                              : "https://example.com/redirect-url"
                          }
                          className="min-h-[120px] font-mono text-sm"
                        />
                        {VAST_AD_TYPES.includes(formData.ad_type) && (
                          <p className="text-xs text-muted-foreground">
                            Nhập URL VAST 3.0 Tag từ ad network (Google Ad Manager, AdColony, Vungle, v.v.)
                          </p>
                        )}
                      </div>

                      {/* Mid-roll timing configuration */}
                      {formData.ad_type === "vast_midroll" && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                          <Label className="text-base font-medium">Cài đặt thời gian hiển thị Mid-roll</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Kiểu trigger</Label>
                              <Select
                                value={formData.position.startsWith("percent:") ? "percent" : formData.position.startsWith("seconds:") ? "seconds" : "percent"}
                                onValueChange={(value) => {
                                  const currentValue = formData.position.split(":")[1] || "50";
                                  setFormData({ ...formData, position: `${value}:${currentValue}` });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percent">Phần trăm video (%)</SelectItem>
                                  <SelectItem value="seconds">Số giây (s)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>
                                {formData.position.startsWith("seconds:") ? "Sau bao nhiêu giây" : "Phần trăm video"}
                              </Label>
                              <Input
                                type="number"
                                min={formData.position.startsWith("seconds:") ? 5 : 10}
                                max={formData.position.startsWith("seconds:") ? 3600 : 90}
                                value={formData.position.split(":")[1] || "50"}
                                onChange={(e) => {
                                  const type = formData.position.startsWith("seconds:") ? "seconds" : "percent";
                                  setFormData({ ...formData, position: `${type}:${e.target.value}` });
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                {formData.position.startsWith("seconds:") 
                                  ? "Quảng cáo sẽ hiện sau X giây kể từ khi bắt đầu phát video"
                                  : "Quảng cáo sẽ hiện khi video đạt X% thời lượng"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Hiển thị trên các trang</Label>
                        <div className="flex flex-wrap gap-2">
                          {PAGES.map((page) => (
                            <div key={page.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`page-${page.value}`}
                                checked={formData.pages.includes(page.value)}
                                onCheckedChange={() => handlePageToggle(page.value)}
                              />
                              <label htmlFor={`page-${page.value}`} className="text-sm">
                                {page.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ngày bắt đầu (tùy chọn)</Label>
                          <Input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ngày kết thúc (tùy chọn)</Label>
                          <Input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label>Kích hoạt</Label>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleCloseDialog}>
                          Hủy
                        </Button>
                        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </header>

          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách quảng cáo</CardTitle>
                <CardDescription>Quản lý tất cả quảng cáo trên website</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Đang tải...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Vị trí</TableHead>
                        <TableHead>Trang</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ads?.map((ad) => (
                        <TableRow key={ad.id}>
                          <TableCell className="font-medium">{ad.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {AD_TYPES.find(t => t.value === ad.ad_type)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {POSITION_REQUIRED_TYPES.includes(ad.ad_type) 
                              ? POSITIONS.find(p => p.value === ad.position)?.label 
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {ad.pages?.map(p => (
                                <Badge key={p} variant="secondary" className="text-xs">
                                  {PAGES.find(page => page.value === p)?.label || p}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={ad.is_active}
                              onCheckedChange={(checked) => 
                                toggleMutation.mutate({ id: ad.id, is_active: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(ad)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Bạn có chắc muốn xóa quảng cáo này?")) {
                                    deleteMutation.mutate(ad.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!ads || ads.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Chưa có quảng cáo nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
