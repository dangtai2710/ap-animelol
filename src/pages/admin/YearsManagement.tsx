import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Search, Plus, Pencil, Trash2, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

const YearsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: string; year: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formYear, setFormYear] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: years, isLoading } = useQuery({
    queryKey: ["admin-years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("years")
        .select("*")
        .is("deleted_at", null)
        .order("year", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Get movie count per year
  const { data: movieCounts } = useQuery({
    queryKey: ["admin-movies-by-year"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("year");
      if (error) throw error;
      const counts: Record<number, number> = {};
      data?.forEach((m) => {
        if (m.year) {
          counts[m.year] = (counts[m.year] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (year: number) => {
      const { error } = await supabase.from("years").insert({ year });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-years"] });
      toast.success("Đã thêm năm thành công");
      setIsDialogOpen(false);
      setFormYear("");
    },
    onError: () => toast.error("Không thể thêm năm"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, year }: { id: string; year: number }) => {
      const { error } = await supabase.from("years").update({ year }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-years"] });
      toast.success("Đã cập nhật năm thành công");
      setEditItem(null);
      setIsDialogOpen(false);
      setFormYear("");
    },
    onError: () => toast.error("Không thể cập nhật năm"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("years")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-years"] });
      toast.success("Đã chuyển năm vào thùng rác");
      setDeleteId(null);
    },
    onError: () => toast.error("Không thể xóa năm"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("years")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-years"] });
      toast.success(`Đã chuyển ${selectedIds.length} năm vào thùng rác`);
      setSelectedIds([]);
      setShowBulkDeleteDialog(false);
    },
    onError: () => toast.error("Không thể xóa năm"),
  });

  const filteredYears = years?.filter((y) =>
    y.year.toString().includes(searchQuery)
  ) || [];

  const handleSubmit = () => {
    const year = parseInt(formYear);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return toast.error("Vui lòng nhập năm hợp lệ (1900-2100)");
    }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, year });
    } else {
      createMutation.mutate(year);
    }
  };

  const openEditDialog = (item: { id: string; year: number }) => {
    setEditItem(item);
    setFormYear(item.year.toString());
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditItem(null);
    setFormYear(new Date().getFullYear().toString());
    setIsDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredYears.map((y) => y.id));
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
                  <Calendar className="h-5 w-5 text-primary" />
                  Năm phát hành
                </h1>
                <p className="text-sm text-muted-foreground">Quản lý năm phát hành phim</p>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm năm
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm năm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">{filteredYears.length} năm</Badge>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <span className="text-sm font-medium">
                  Đã chọn {selectedIds.length} năm
                </span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa {selectedIds.length} năm
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
                        checked={filteredYears.length > 0 && selectedIds.length === filteredYears.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Năm</TableHead>
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
                  ) : filteredYears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Không có năm nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredYears.map((year) => (
                      <TableRow key={year.id} className="border-border/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(year.id)}
                            onCheckedChange={(checked) => handleSelectOne(year.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-lg">{year.year}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{movieCounts?.[year.year] || 0} phim</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(year.created_at).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(year)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteId(year.id)}
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
            <DialogTitle>{editItem ? "Chỉnh sửa năm" : "Thêm năm mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Năm</Label>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                placeholder="2024"
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
              Năm sẽ được chuyển vào thùng rác. Bạn có thể khôi phục lại sau.
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
              Bạn có chắc muốn xóa {selectedIds.length} năm đã chọn? Chúng sẽ được chuyển vào thùng rác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa {selectedIds.length} năm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default YearsManagement;
