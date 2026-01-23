import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface HomepageWidget {
  id: string;
  title: string;
  static_path: string | null;
  widget_type: string;
  status_filter: string[];
  type_filter: string[];
  category_ids: string[];
  category_exclude: boolean;
  genre_ids: string[];
  genre_exclude: boolean;
  country_ids: string[];
  country_exclude: boolean;
  year_ids: string[];
  year_exclude: boolean;
  sort_by: string;
  posts_count: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tv_category_ids?: string[];
  // External API options
  use_external_api?: boolean;
  external_api_source?: string;
}

const defaultWidget: Partial<HomepageWidget> = {
  title: "",
  static_path: "",
  widget_type: "carousel",
  status_filter: ["all"],
  type_filter: ["all"],
  category_ids: [],
  category_exclude: false,
  genre_ids: [],
  genre_exclude: false,
  country_ids: [],
  country_exclude: false,
  year_ids: [],
  year_exclude: false,
  sort_by: "updated_at",
  posts_count: 12,
  is_active: true,
  tv_category_ids: [],
  use_external_api: false,
  external_api_source: "phimapi",
};

const typeOptions = [
  { value: "all", label: "Tất cả" },
  { value: "single", label: "Phim Lẻ" },
  { value: "series", label: "Phim Bộ" },
  { value: "hoathinh", label: "Hoạt Hình" },
  { value: "tvshows", label: "TV Shows" },
];

const statusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "ongoing", label: "Đang chiếu" },
  { value: "completed", label: "Hoàn thành" },
];

const sortOptions = [
  { value: "created_at", label: "Mới tạo" },
  { value: "updated_at", label: "Mới cập nhật" },
  { value: "view_count", label: "Lượt xem" },
  { value: "random", label: "Random" },
];

const widgetTypeOptions = [
  { value: "carousel", label: "Carousel (Phim)" },
  { value: "slider", label: "Slider (Poster)" },
  { value: "tv_channels", label: "TV Channels" },
];

export default function WidgetsManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Partial<HomepageWidget> | null>(null);
  const [formData, setFormData] = useState<Partial<HomepageWidget>>(defaultWidget);

  // Fetch widgets
  const { data: widgets, isLoading } = useQuery({
    queryKey: ["homepage-widgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_widgets")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as HomepageWidget[];
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genres")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch genres (types in Vietnamese context)
  const { data: genres } = useQuery({
    queryKey: ["genres-for-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genres")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch countries
  const { data: countries } = useQuery({
    queryKey: ["countries-for-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch years
  const { data: years } = useQuery({
    queryKey: ["years-for-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("years")
        .select("id, year")
        .is("deleted_at", null)
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch TV channel categories
  const { data: tvCategories } = useQuery({
    queryKey: ["tv-categories-for-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channel_categories")
        .select("id, name")
        .is("deleted_at", null)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Create widget mutation
  const createMutation = useMutation({
    mutationFn: async (widget: Partial<HomepageWidget>) => {
      const maxOrder = widgets?.length ? Math.max(...widgets.map(w => w.display_order)) + 1 : 0;
      const { data, error } = await supabase
        .from("homepage_widgets")
        .insert([{ 
          title: widget.title || "Untitled",
          static_path: widget.static_path,
          widget_type: widget.widget_type || "carousel",
          status_filter: widget.status_filter || ["all"],
          type_filter: widget.type_filter || ["all"],
          category_ids: widget.category_ids || [],
          category_exclude: widget.category_exclude || false,
          genre_ids: widget.genre_ids || [],
          genre_exclude: widget.genre_exclude || false,
          country_ids: widget.country_ids || [],
          country_exclude: widget.country_exclude || false,
          year_ids: widget.year_ids || [],
          year_exclude: widget.year_exclude || false,
          sort_by: widget.sort_by || "updated_at",
          posts_count: widget.posts_count || 12,
          display_order: maxOrder,
          is_active: widget.is_active ?? true,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-widgets"] });
      toast.success("Tạo widget thành công");
      setIsDialogOpen(false);
      setFormData(defaultWidget);
    },
    onError: (error) => {
      toast.error("Lỗi khi tạo widget: " + error.message);
    },
  });

  // Update widget mutation
  const updateMutation = useMutation({
    mutationFn: async (widget: Partial<HomepageWidget>) => {
      const { data, error } = await supabase
        .from("homepage_widgets")
        .update(widget)
        .eq("id", widget.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-widgets"] });
      toast.success("Cập nhật widget thành công");
      setIsDialogOpen(false);
      setEditingWidget(null);
      setFormData(defaultWidget);
    },
    onError: (error) => {
      toast.error("Lỗi khi cập nhật widget: " + error.message);
    },
  });

  // Delete widget mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("homepage_widgets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-widgets"] });
      toast.success("Xóa widget thành công");
    },
    onError: (error) => {
      toast.error("Lỗi khi xóa widget: " + error.message);
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      if (!widgets) return;
      const currentIndex = widgets.findIndex(w => w.id === id);
      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      
      if (swapIndex < 0 || swapIndex >= widgets.length) return;

      const current = widgets[currentIndex];
      const swap = widgets[swapIndex];

      await supabase
        .from("homepage_widgets")
        .update({ display_order: swap.display_order })
        .eq("id", current.id);

      await supabase
        .from("homepage_widgets")
        .update({ display_order: current.display_order })
        .eq("id", swap.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-widgets"] });
    },
  });

  const handleOpenCreate = () => {
    setEditingWidget(null);
    setFormData(defaultWidget);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (widget: HomepageWidget) => {
    setEditingWidget(widget);
    setFormData(widget);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWidget) {
      updateMutation.mutate({ ...formData, id: editingWidget.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleStatus = (id: string, value: string) => {
    const current = formData.status_filter || [];
    if (current.includes(value)) {
      setFormData({ ...formData, status_filter: current.filter(s => s !== value) });
    } else {
      setFormData({ ...formData, status_filter: [...current, value] });
    }
  };

  const toggleType = (value: string) => {
    const current = formData.type_filter || [];
    
    if (value === "all") {
      // If selecting "all", clear other selections
      if (current.includes("all")) {
        setFormData({ ...formData, type_filter: [] });
      } else {
        setFormData({ ...formData, type_filter: ["all"] });
      }
    } else {
      // If selecting a specific type, remove "all" from selection
      let newFilter = current.filter(s => s !== "all");
      
      if (newFilter.includes(value)) {
        newFilter = newFilter.filter(s => s !== value);
      } else {
        newFilter = [...newFilter, value];
      }
      
      // If no specific type selected, default to "all"
      if (newFilter.length === 0) {
        newFilter = ["all"];
      }
      
      setFormData({ ...formData, type_filter: newFilter });
    }
  };

  const toggleArrayItem = (field: keyof HomepageWidget, id: string) => {
    const current = (formData[field] as string[]) || [];
    if (current.includes(id)) {
      setFormData({ ...formData, [field]: current.filter(i => i !== id) });
    } else {
      setFormData({ ...formData, [field]: [...current, id] });
    }
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
                <h1 className="text-xl font-bold">Quản lý Widget Trang Chủ</h1>
                <p className="text-sm text-muted-foreground">Tạo và quản lý các widget hiển thị trên trang chủ</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm Widget
                  </Button>
                </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWidget ? "Chỉnh sửa Widget" : "Thêm Widget mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tiêu đề</Label>
                  <Input
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Phim Mới Cập Nhật"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đường dẫn tĩnh</Label>
                  <Input
                    value={formData.static_path || ""}
                    onChange={(e) => setFormData({ ...formData, static_path: e.target.value })}
                    placeholder="VD: /phim-moi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loại Widget</Label>
                  <Select
                    value={formData.widget_type}
                    onValueChange={(value) => setFormData({ ...formData, widget_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {widgetTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Số bài đăng hiển thị</Label>
                  <Input
                    type="number"
                    value={formData.posts_count || 12}
                    onChange={(e) => setFormData({ ...formData, posts_count: parseInt(e.target.value) })}
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              {/* Movie-specific filters - only show when NOT tv_channels */}
              {formData.widget_type !== "tv_channels" && (
                <>
                  {/* External API option */}
                  <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Sử dụng API bên ngoài</Label>
                        <p className="text-xs text-muted-foreground">
                          Gọi phim trực tiếp từ API thay vì database. Phim trùng ưu tiên từ database.
                        </p>
                      </div>
                      <Switch
                        checked={formData.use_external_api || false}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, use_external_api: checked })
                        }
                      />
                    </div>
                    
                    {formData.use_external_api && (
                      <div className="space-y-2">
                        <Label>Nguồn API</Label>
                        <Select
                          value={formData.external_api_source || "phimapi"}
                          onValueChange={(value) => setFormData({ ...formData, external_api_source: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phimapi">PhimAPI (phimapi.com)</SelectItem>
                            <SelectItem value="nguonc">NguonC (nguonc.com)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Danh mục phim</Label>
                    <div className="flex flex-wrap gap-4">
                      {typeOptions.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            checked={(formData.type_filter || []).includes(opt.value)}
                            onCheckedChange={() => toggleType(opt.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chọn loại phim để lọc. Chọn "Tất cả" để hiển thị tất cả.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <div className="flex flex-wrap gap-4">
                      {statusOptions.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            checked={(formData.status_filter || []).includes(opt.value)}
                            onCheckedChange={() => toggleStatus(formData.id || "", opt.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Sắp xếp theo</Label>
                    <Select
                      value={formData.sort_by}
                      onValueChange={(value) => setFormData({ ...formData, sort_by: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Thể loại */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Thể loại</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.genre_exclude}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, genre_exclude: !!checked })
                          }
                        />
                        <span>Loại trừ các mục đã chọn</span>
                      </label>
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 grid grid-cols-3 gap-2">
                      {genres?.map(genre => (
                        <label key={genre.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={(formData.genre_ids || []).includes(genre.id)}
                            onCheckedChange={() => toggleArrayItem("genre_ids", genre.id)}
                          />
                          <span>{genre.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Quốc gia */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Quốc gia</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.country_exclude}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, country_exclude: !!checked })
                          }
                        />
                        <span>Loại trừ các mục đã chọn</span>
                      </label>
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 grid grid-cols-3 gap-2">
                      {countries?.map(country => (
                        <label key={country.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={(formData.country_ids || []).includes(country.id)}
                            onCheckedChange={() => toggleArrayItem("country_ids", country.id)}
                          />
                          <span>{country.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Năm */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Năm</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.year_exclude}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, year_exclude: !!checked })
                          }
                        />
                        <span>Loại trừ các mục đã chọn</span>
                      </label>
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 grid grid-cols-4 gap-2">
                      {years?.map(year => (
                        <label key={year.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={(formData.year_ids || []).includes(year.id)}
                            onCheckedChange={() => toggleArrayItem("year_ids", year.id)}
                          />
                          <span>{year.year}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TV-specific filters - only show when tv_channels */}
              {formData.widget_type === "tv_channels" && (
                <>
                  <div className="space-y-2">
                    <Label>Danh mục kênh TV</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 grid grid-cols-3 gap-2">
                      {tvCategories?.map(cat => (
                        <label key={cat.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={(formData.category_ids || []).includes(cat.id)}
                            onCheckedChange={() => toggleArrayItem("category_ids", cat.id)}
                          />
                          <span>{cat.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chọn danh mục TV để lọc kênh hiển thị. Để trống để hiển thị tất cả.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Sắp xếp theo</Label>
                    <Select
                      value={formData.sort_by}
                      onValueChange={(value) => setFormData({ ...formData, sort_by: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="display_order">Thứ tự mặc định</SelectItem>
                        <SelectItem value="name">Tên kênh</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Kích hoạt widget</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingWidget ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
            </div>
          </header>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Thứ tự</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Số bài</TableHead>
                <TableHead>Sắp xếp</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {widgets?.map((widget, index) => (
              <TableRow key={widget.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => reorderMutation.mutate({ id: widget.id, direction: "up" })}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === widgets.length - 1}
                      onClick={() => reorderMutation.mutate({ id: widget.id, direction: "down" })}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{widget.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {widget.widget_type === "slider" ? "Slider" : 
                     widget.widget_type === "tv_channels" ? "TV Channels" : "Carousel"}
                  </Badge>
                </TableCell>
                <TableCell>{widget.posts_count}</TableCell>
                <TableCell>
                  {sortOptions.find(s => s.value === widget.sort_by)?.label}
                </TableCell>
                <TableCell>
                  <Badge variant={widget.is_active ? "default" : "secondary"}>
                    {widget.is_active ? "Hoạt động" : "Tắt"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(widget)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Bạn có chắc muốn xóa widget này?")) {
                        deleteMutation.mutate(widget.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
