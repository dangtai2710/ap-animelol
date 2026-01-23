import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Clapperboard, Search, Plus, Pencil, Trash2, MoreVertical, User } from "lucide-react";
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

const DirectorsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: string; name: string; slug: string; avatar_url: string | null; seo_title: string | null; seo_description: string | null; seo_keyword: string | null } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "", avatar_url: "", seo_title: "", seo_description: "", seo_keyword: "" });
  const queryClient = useQueryClient();

  const { data: directors, isLoading } = useQuery({
    queryKey: ["admin-directors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directors")
        .select("*, movie_directors(id)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; avatar_url?: string; seo_title?: string; seo_description?: string; seo_keyword?: string }) => {
      const { error } = await supabase.from("directors").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directors"] });
      toast.success("Đã thêm đạo diễn thành công");
      setIsDialogOpen(false);
      setFormData({ name: "", slug: "", avatar_url: "", seo_title: "", seo_description: "", seo_keyword: "" });
    },
    onError: () => toast.error("Không thể thêm đạo diễn"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; slug: string; avatar_url?: string; seo_title?: string; seo_description?: string; seo_keyword?: string }) => {
      const { error } = await supabase.from("directors").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directors"] });
      toast.success("Đã cập nhật đạo diễn thành công");
      setEditItem(null);
      setIsDialogOpen(false);
      setFormData({ name: "", slug: "", avatar_url: "", seo_title: "", seo_description: "", seo_keyword: "" });
    },
    onError: () => toast.error("Không thể cập nhật đạo diễn"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("directors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directors"] });
      toast.success("Đã xóa đạo diễn thành công");
      setDeleteId(null);
    },
    onError: () => toast.error("Không thể xóa đạo diễn"),
  });

  const filteredDirectors = directors?.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSubmit = () => {
    if (!formData.name.trim()) return toast.error("Vui lòng nhập tên đạo diễn");
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
                  <Clapperboard className="h-5 w-5 text-primary" />
                  Đạo diễn
                </h1>
                <p className="text-sm text-muted-foreground">Quản lý đạo diễn phim</p>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm đạo diễn
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm đạo diễn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">{filteredDirectors.length} đạo diễn</Badge>
            </div>

            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Đạo diễn</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Số phim</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-border/50">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredDirectors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Không có đạo diễn nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDirectors.map((director) => (
                      <TableRow key={director.id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {director.avatar_url ? (
                              <img
                                src={director.avatar_url}
                                alt={director.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{director.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{director.slug}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{director.movie_directors?.length || 0} phim</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(director.created_at).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(director)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteId(director.id)}
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
          </div>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Chỉnh sửa đạo diễn" : "Thêm đạo diễn mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên đạo diễn"
              />
            </div>
            <div className="space-y-2">
              <Label>Đường dẫn tĩnh</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="ten-dao-dien"
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
                placeholder="Đạo diễn Tên - TenWeb.org"
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Description</Label>
              <Textarea
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                placeholder="Mô tả SEO cho đạo diễn..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Keyword</Label>
              <Input
                value={formData.seo_keyword}
                onChange={(e) => setFormData({ ...formData, seo_keyword: e.target.value })}
                placeholder="đạo diễn, phim của đạo diễn"
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
              Bạn có chắc chắn muốn xóa đạo diễn này? Hành động này không thể hoàn tác.
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

export default DirectorsManagement;
