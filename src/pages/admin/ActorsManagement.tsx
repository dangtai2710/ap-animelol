import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Users, Search, Plus, Pencil, Trash2, MoreVertical, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 20;

const ActorsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: string; name: string; slug: string; avatar_url: string | null; seo_title: string | null; seo_description: string | null; seo_keyword: string | null } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "", avatar_url: "", seo_title: "", seo_description: "", seo_keyword: "" });
  const queryClient = useQueryClient();

  const { data: actorsData, isLoading } = useQuery({
    queryKey: ["admin-actors", currentPage, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("actors")
        .select("*, movie_actors(id)", { count: "exact" });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, count, error } = await query
        .order("name")
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      return { actors: data || [], total: count || 0 };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; avatar_url?: string; seo_title?: string; seo_description?: string; seo_keyword?: string }) => {
      const { error } = await supabase.from("actors").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-actors"] });
      toast.success("Đã thêm diễn viên thành công");
      setIsDialogOpen(false);
      setFormData({ name: "", slug: "", avatar_url: "", seo_title: "", seo_description: "", seo_keyword: "" });
    },
    onError: () => toast.error("Không thể thêm diễn viên"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; slug: string; avatar_url?: string; seo_title?: string; seo_description?: string; seo_keyword?: string }) => {
      const { error } = await supabase.from("actors").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-actors"] });
      toast.success("Đã cập nhật diễn viên thành công");
      setEditItem(null);
      setIsDialogOpen(false);
      setFormData({ name: "", slug: "", avatar_url: "", seo_title: "", seo_description: "", seo_keyword: "" });
    },
    onError: () => toast.error("Không thể cập nhật diễn viên"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("actors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-actors"] });
      toast.success("Đã xóa diễn viên thành công");
      setDeleteId(null);
    },
    onError: () => toast.error("Không thể xóa diễn viên"),
  });

  const totalPages = Math.ceil((actorsData?.total || 0) / ITEMS_PER_PAGE);

  const handleSubmit = () => {
    if (!formData.name.trim()) return toast.error("Vui lòng nhập tên diễn viên");
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-");
    const data: any = { 
      name: formData.name, 
      slug,
      seo_title: formData.seo_title || undefined,
      seo_description: formData.seo_description || undefined,
      seo_keyword: formData.seo_keyword || undefined,
    };
    if (formData.avatar_url) data.avatar_url = formData.avatar_url;
    
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (item: any) => {
    setEditItem(item);
    setFormData({ 
      name: item.name, 
      slug: item.slug, 
      avatar_url: item.avatar_url || "",
      seo_title: item.seo_title || "",
      seo_description: item.seo_description || "",
      seo_keyword: item.seo_keyword || ""
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditItem(null);
    setFormData({ name: "", slug: "", avatar_url: "", seo_title: "", seo_description: "", seo_keyword: "" });
    setIsDialogOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex-1">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Diễn viên
                </h1>
                <p className="text-sm text-muted-foreground">Quản lý diễn viên phim</p>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm diễn viên
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm diễn viên..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">{actorsData?.total || 0} diễn viên</Badge>
            </div>

            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Diễn viên</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Số phim</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} className="border-border/50">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : actorsData?.actors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Không có diễn viên nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    actorsData?.actors.map((actor) => (
                      <TableRow key={actor.id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {actor.avatar_url ? (
                              <img
                                src={actor.avatar_url}
                                alt={actor.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{actor.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{actor.slug}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{actor.movie_actors?.length || 0} phim</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(actor.created_at).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(actor)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteId(actor.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Trang {currentPage} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Chỉnh sửa diễn viên" : "Thêm diễn viên mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên diễn viên"
              />
            </div>
            <div className="space-y-2">
              <Label>Đường dẫn tĩnh</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="ten-dien-vien"
              />
            </div>
            <div className="space-y-2">
              <Label>URL ảnh đại diện</Label>
              <Input
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Title</Label>
              <Input
                value={formData.seo_title}
                onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                placeholder="Diễn viên Tên - TenWeb.org"
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Description</Label>
              <Textarea
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                placeholder="Mô tả SEO cho diễn viên..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Keyword</Label>
              <Input
                value={formData.seo_keyword}
                onChange={(e) => setFormData({ ...formData, seo_keyword: e.target.value })}
                placeholder="diễn viên, phim của diễn viên"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa diễn viên này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default ActorsManagement;
