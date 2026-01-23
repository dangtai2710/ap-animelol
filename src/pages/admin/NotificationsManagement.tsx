import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Bell, Eye } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const PAGE_OPTIONS = [
  { value: "all", label: "Tất cả trang" },
  { value: "home", label: "Trang chủ" },
  { value: "movie-detail", label: "Chi tiết phim" },
  { value: "movie-list", label: "Danh sách phim" },
  { value: "taxonomy", label: "Thể loại/Quốc gia/Năm" },
  { value: "tv", label: "Truyền hình" },
  { value: "search", label: "Tìm kiếm" },
];
import { format } from "date-fns";
import RichTextEditor from "@/components/admin/movie-edit/RichTextEditor";

interface Notification {
  id: string;
  title: string;
  content: string;
  notification_type: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  display_order: number;
  show_on_pages: string[] | null;
  created_at: string;
  updated_at: string;
}

const NotificationsManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    notification_type: "info",
    is_active: true,
    start_date: "",
    end_date: "",
    display_order: 0,
    show_on_pages: ["all"]
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Notification[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("notifications").insert({
        title: data.title,
        content: data.content,
        notification_type: data.notification_type,
        is_active: data.is_active,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        display_order: data.display_order,
        show_on_pages: data.show_on_pages
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "Thành công", description: "Đã tạo thông báo mới" });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("notifications")
        .update({
          title: data.title,
          content: data.content,
          notification_type: data.notification_type,
          is_active: data.is_active,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          display_order: data.display_order,
          show_on_pages: data.show_on_pages
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "Thành công", description: "Đã cập nhật thông báo" });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "Thành công", description: "Đã xóa thông báo" });
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingNotification(null);
    setFormData({
      title: "",
      content: "",
      notification_type: "info",
      is_active: true,
      start_date: "",
      end_date: "",
      display_order: 0,
      show_on_pages: ["all"]
    });
  };

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      content: notification.content,
      notification_type: notification.notification_type,
      is_active: notification.is_active,
      start_date: notification.start_date?.split("T")[0] || "",
      end_date: notification.end_date?.split("T")[0] || "",
      display_order: notification.display_order,
      show_on_pages: notification.show_on_pages || ["all"]
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tiêu đề và nội dung", variant: "destructive" });
      return;
    }

    if (editingNotification) {
      updateMutation.mutate({ id: editingNotification.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      info: { label: "Thông tin", variant: "default" },
      warning: { label: "Cảnh báo", variant: "secondary" },
      maintenance: { label: "Bảo trì", variant: "destructive" },
      update: { label: "Cập nhật", variant: "outline" }
    };
    const config = types[type] || types.info;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Bell className="h-6 w-6" />
                  Quản lý thông báo
                </h1>
                <p className="text-sm text-muted-foreground">Tạo và quản lý thông báo popup cho người dùng</p>
              </div>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm thông báo
              </Button>
            </div>
          </header>

          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách thông báo</CardTitle>
              </CardHeader>
              <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : notifications?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có thông báo nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications?.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium">{notification.title}</TableCell>
                    <TableCell>{getTypeBadge(notification.notification_type)}</TableCell>
                    <TableCell>
                      <Badge variant={notification.is_active ? "default" : "secondary"}>
                        {notification.is_active ? "Hoạt động" : "Tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {notification.start_date && (
                        <div>Từ: {format(new Date(notification.start_date), "dd/MM/yyyy")}</div>
                      )}
                      {notification.end_date && (
                        <div>Đến: {format(new Date(notification.end_date), "dd/MM/yyyy")}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingNotification(notification);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(notification)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa thông báo này?")) {
                              deleteMutation.mutate(notification.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNotification ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tiêu đề *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại thông báo</Label>
                <Select
                  value={formData.notification_type}
                  onValueChange={(value) => setFormData({ ...formData, notification_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Thông tin</SelectItem>
                    <SelectItem value="warning">Cảnh báo</SelectItem>
                    <SelectItem value="maintenance">Bảo trì</SelectItem>
                    <SelectItem value="update">Cập nhật</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nội dung *</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
              />
              <p className="text-xs text-muted-foreground">
                Hỗ trợ: văn bản, hình ảnh, video YouTube (dán link), code blocks
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày bắt đầu</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngày kết thúc</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Thứ tự hiển thị</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Kích hoạt</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hiển thị trên trang</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                {PAGE_OPTIONS.map((page) => {
                  const isSelected = formData.show_on_pages.includes(page.value);
                  const isAllSelected = formData.show_on_pages.includes("all");
                  
                  return (
                    <div key={page.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`page-${page.value}`}
                        checked={isSelected || (page.value !== "all" && isAllSelected)}
                        disabled={page.value !== "all" && isAllSelected}
                        onCheckedChange={(checked) => {
                          if (page.value === "all") {
                            setFormData({
                              ...formData,
                              show_on_pages: checked ? ["all"] : []
                            });
                          } else {
                            const newPages = checked
                              ? [...formData.show_on_pages.filter(p => p !== "all"), page.value]
                              : formData.show_on_pages.filter(p => p !== page.value);
                            setFormData({
                              ...formData,
                              show_on_pages: newPages.length === 0 ? ["all"] : newPages
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`page-${page.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {page.label}
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Chọn "Tất cả trang" để hiển thị trên mọi trang, hoặc chọn các trang cụ thể
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingNotification ? "Cập nhật" : "Tạo thông báo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTypeBadge(editingNotification?.notification_type || "info")}
              {editingNotification?.title}
            </DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: editingNotification?.content || "" }}
          />
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default NotificationsManagement;
