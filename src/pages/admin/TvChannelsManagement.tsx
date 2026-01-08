import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tv, Search, Plus, Pencil, Trash2, MoreVertical, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TvChannelsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkToggleDialog, setShowBulkToggleDialog] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: channels, isLoading } = useQuery({
    queryKey: ["admin-tv-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channels")
        .select("*, tv_channel_categories(name)")
        .is("deleted_at", null)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("tv_channels").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tv-channels"] });
      toast.success("Đã cập nhật trạng thái kênh");
    },
    onError: () => toast.error("Không thể cập nhật trạng thái"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tv_channels")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tv-channels"] });
      toast.success("Đã chuyển kênh vào thùng rác");
      setDeleteId(null);
    },
    onError: () => toast.error("Không thể xóa kênh"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("tv_channels")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tv-channels"] });
      toast.success(`Đã chuyển ${selectedIds.length} kênh vào thùng rác`);
      setSelectedIds([]);
      setShowBulkDeleteDialog(false);
    },
    onError: () => toast.error("Không thể xóa kênh"),
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ ids, is_active }: { ids: string[]; is_active: boolean }) => {
      const { error } = await supabase
        .from("tv_channels")
        .update({ is_active })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tv-channels"] });
      toast.success(`Đã ${is_active ? "bật" : "tắt"} ${selectedIds.length} kênh`);
      setSelectedIds([]);
      setShowBulkToggleDialog(null);
    },
    onError: () => toast.error("Không thể cập nhật trạng thái"),
  });

  const filteredChannels = channels?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredChannels.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
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
                  <Tv className="h-5 w-5 text-primary" />
                  Quản lý kênh TV
                </h1>
                <p className="text-sm text-muted-foreground">Quản lý danh sách kênh truyền hình</p>
              </div>
              <Button onClick={() => navigate("/admin/tv-channels/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm kênh
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm kênh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">{filteredChannels.length} kênh</Badge>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <span className="text-sm font-medium">
                  Đã chọn {selectedIds.length} kênh
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBulkToggleDialog(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Bật
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBulkToggleDialog(false)}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Tắt
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  Bỏ chọn
                </Button>
              </div>
            )}

            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={filteredChannels.length > 0 && selectedIds.length === filteredChannels.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Logo</TableHead>
                    <TableHead>Tên kênh</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Nguồn phát</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-border/50">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredChannels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không có kênh nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredChannels.map((channel) => {
                      const sources = Array.isArray(channel.streaming_sources) ? channel.streaming_sources : [];
                      return (
                        <TableRow key={channel.id} className="border-border/50">
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(channel.id)}
                              onCheckedChange={(checked) => handleSelectOne(channel.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            {channel.logo_url ? (
                              <img src={channel.logo_url} alt={channel.name} className="h-10 w-16 object-contain bg-muted rounded" />
                            ) : (
                              <div className="h-10 w-16 bg-muted rounded flex items-center justify-center">
                                <Tv className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {channel.tv_channel_categories?.name || "Chưa phân loại"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{sources.length} nguồn</Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={channel.is_active}
                              onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: channel.id, is_active: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/tv-channels/${channel.id}`)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteId(channel.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Kênh sẽ được chuyển vào thùng rác.
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

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa {selectedIds.length} kênh đã chọn?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkToggleDialog !== null} onOpenChange={() => setShowBulkToggleDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận {showBulkToggleDialog ? "bật" : "tắt"} kênh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn {showBulkToggleDialog ? "bật" : "tắt"} {selectedIds.length} kênh đã chọn?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkToggleMutation.mutate({ ids: selectedIds, is_active: !!showBulkToggleDialog })}
            >
              {showBulkToggleDialog ? "Bật" : "Tắt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default TvChannelsManagement;
