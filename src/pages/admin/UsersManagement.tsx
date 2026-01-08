import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Shield,
  ShieldCheck,
  Trash2,
  Edit,
  Key,
  UserPlus,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: "admin" | "moderator" | "user";
}

interface UserPermission {
  user_id: string;
  permission: PermissionKey;
}

type PermissionKey = 
  | "crawl_movies"
  | "movies_add"
  | "movies_edit"
  | "movies_delete"
  | "categories_add"
  | "categories_edit"
  | "categories_delete"
  | "menus_add"
  | "menus_edit"
  | "menus_delete"
  | "access_settings";

interface PermissionGroup {
  title: string;
  description: string;
  permissions: { key: PermissionKey; label: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Crawl phim",
    description: "Quyền crawl và cập nhật phim từ API",
    permissions: [
      { key: "crawl_movies", label: "Crawl phim mới" },
    ],
  },
  {
    title: "Quản lý phim",
    description: "Quyền thêm, sửa, xóa phim",
    permissions: [
      { key: "movies_add", label: "Thêm phim" },
      { key: "movies_edit", label: "Sửa phim" },
      { key: "movies_delete", label: "Xóa phim" },
    ],
  },
  {
    title: "Quản lý danh mục",
    description: "Quyền thêm, sửa, xóa danh mục/thể loại",
    permissions: [
      { key: "categories_add", label: "Thêm danh mục" },
      { key: "categories_edit", label: "Sửa danh mục" },
      { key: "categories_delete", label: "Xóa danh mục" },
    ],
  },
  {
    title: "Quản lý menu",
    description: "Quyền thêm, sửa, xóa menu điều hướng",
    permissions: [
      { key: "menus_add", label: "Thêm menu" },
      { key: "menus_edit", label: "Sửa menu" },
      { key: "menus_delete", label: "Xóa menu" },
    ],
  },
  {
    title: "Cài đặt hệ thống",
    description: "Quyền truy cập và thay đổi cài đặt",
    permissions: [
      { key: "access_settings", label: "Truy cập cài đặt" },
    ],
  },
];

const UsersManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newUserData, setNewUserData] = useState({ email: "", password: "", confirmPassword: "", fullName: "" });
  const [editUserData, setEditUserData] = useState({ fullName: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all profiles
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch all roles
  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Fetch all permissions
  const { data: permissions } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*");
      if (error) throw error;
      return data as UserPermission[];
    },
  });

  // Create user mutation using edge function (doesn't log out admin)
  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, fullName },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setIsAddUserOpen(false);
      setNewUserData({ email: "", password: "", confirmPassword: "", fullName: "" });
      toast({ title: "Thành công", description: "Đã tạo người dùng mới" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, fullName }: { userId: string; fullName: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setIsEditUserOpen(false);
      setSelectedUser(null);
      toast({ title: "Thành công", description: "Đã cập nhật thông tin người dùng" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Toggle admin role mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      toast({ title: "Thành công", description: "Đã cập nhật quyền admin" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions: newPermissions, makeAdmin }: { userId: string; permissions: PermissionKey[]; makeAdmin: boolean }) => {
      // Update admin role
      const currentIsAdmin = roles?.some(r => r.user_id === userId && r.role === "admin");
      if (makeAdmin !== currentIsAdmin) {
        if (makeAdmin) {
          await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        } else {
          await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        }
      }

      // Delete existing permissions
      await supabase.from("user_permissions").delete().eq("user_id", userId);
      
      // Insert new permissions
      if (newPermissions.length > 0) {
        const { error } = await supabase
          .from("user_permissions")
          .insert(newPermissions.map(p => ({ user_id: userId, permission: p })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setIsPermissionsOpen(false);
      setSelectedUser(null);
      toast({ title: "Thành công", description: "Đã cập nhật quyền người dùng" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Delete user mutation using edge function
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      setIsDeleteOpen(false);
      setSelectedUser(null);
      toast({ title: "Thành công", description: "Đã xóa người dùng hoàn toàn" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Change password mutation using edge function
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-change-password", {
        body: { userId, newPassword },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      setIsChangePasswordOpen(false);
      setSelectedUser(null);
      setNewPassword("");
      setConfirmNewPassword("");
      toast({ title: "Thành công", description: "Đã đổi mật khẩu người dùng" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const getUserRole = (userId: string) => {
    return roles?.find(r => r.user_id === userId && r.role === "admin") ? "admin" : "user";
  };

  const getUserPermissions = (userId: string): PermissionKey[] => {
    return permissions?.filter(p => p.user_id === userId).map(p => p.permission as PermissionKey) || [];
  };

  const openPermissionsDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedPermissions(getUserPermissions(user.id));
    setIsAdmin(getUserRole(user.id) === "admin");
    setIsPermissionsOpen(true);
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setEditUserData({ fullName: user.full_name || "" });
    setIsEditUserOpen(true);
  };

  const filteredProfiles = profiles?.filter(profile =>
    profile.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
                <h1 className="text-xl font-bold">Quản lý người dùng</h1>
                <p className="text-sm text-muted-foreground">Thêm, sửa, xóa và phân quyền người dùng</p>
              </div>
              <Button onClick={() => setIsAddUserOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Thêm người dùng
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng người dùng</p>
                    <p className="text-3xl font-bold mt-1">{profiles?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/60">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Admin</p>
                    <p className="text-3xl font-bold mt-1">
                      {roles?.filter(r => r.role === "admin").length || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Có quyền đặc biệt</p>
                    <p className="text-3xl font-bold mt-1">
                      {new Set(permissions?.map(p => p.user_id)).size || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-border/50 bg-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border/50">
                <h2 className="font-semibold">Danh sách người dùng</h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm người dùng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-muted/50 border-border/50"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-profiles"] })}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-[300px]">Người dùng</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Quyền</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProfiles ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-border/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                                <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredProfiles.length > 0 ? (
                      filteredProfiles.map((profile) => {
                        const userRole = getUserRole(profile.id);
                        const userPermissions = getUserPermissions(profile.id);
                        
                        return (
                          <TableRow key={profile.id} className="border-border/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {(profile.full_name || profile.email || "U")[0].toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{profile.full_name || "Chưa đặt tên"}</p>
                                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={userRole === "admin" ? "default" : "secondary"}
                                className={userRole === "admin" ? "bg-red-500/20 text-red-500 border-red-500/30" : ""}
                              >
                                {userRole === "admin" ? (
                                  <>
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Admin
                                  </>
                                ) : (
                                  "User"
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {userRole === "admin" ? (
                                  <Badge variant="outline" className="text-xs border-green-500/50 text-green-500">
                                    Toàn quyền
                                  </Badge>
                                ) : userPermissions.length > 0 ? (
                                  <>
                                    <Badge variant="outline" className="text-xs">
                                      {userPermissions.length} quyền
                                    </Badge>
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Không có</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(profile.created_at).toLocaleDateString("vi-VN")}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => openEditDialog(profile)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openPermissionsDialog(profile)}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Phân quyền
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUser(profile);
                                    setIsChangePasswordOpen(true);
                                  }}>
                                    <Key className="h-4 w-4 mr-2" />
                                    Đổi mật khẩu
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      setSelectedUser(profile);
                                      setIsDeleteOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Xóa người dùng
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Không tìm thấy người dùng nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm người dùng mới</DialogTitle>
            <DialogDescription>
              Tạo tài khoản mới cho người dùng
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ tên</Label>
              <Input
                id="fullName"
                placeholder="Nguyễn Văn A"
                value={newUserData.fullName}
                onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={newUserData.confirmPassword}
                onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })}
              />
              {newUserData.confirmPassword && newUserData.password !== newUserData.confirmPassword && (
                <p className="text-sm text-destructive">Mật khẩu không khớp</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(newUserData)}
              disabled={
                createUserMutation.isPending || 
                !newUserData.email || 
                !newUserData.password || 
                newUserData.password !== newUserData.confirmPassword
              }
            >
              {createUserMutation.isPending ? "Đang tạo..." : "Tạo người dùng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Họ tên</Label>
              <Input
                id="editFullName"
                placeholder="Nguyễn Văn A"
                value={editUserData.fullName}
                onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => selectedUser && updateProfileMutation.mutate({ userId: selectedUser.id, fullName: editUserData.fullName })}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Phân quyền người dùng</DialogTitle>
            <DialogDescription>
              Cấp quyền cho {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Admin Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium">Quyền Admin</p>
                  <p className="text-sm text-muted-foreground">Toàn quyền quản trị hệ thống</p>
                </div>
              </div>
              <Checkbox
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked === true)}
              />
            </div>

            {!isAdmin && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{group.title}</p>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                      <Checkbox
                        checked={group.permissions.every(p => selectedPermissions.includes(p.key))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newPerms = [...new Set([...selectedPermissions, ...group.permissions.map(p => p.key)])];
                            setSelectedPermissions(newPerms);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(p => !group.permissions.map(gp => gp.key).includes(p)));
                          }
                        }}
                      />
                    </div>
                    <div className="ml-4 space-y-1">
                      {group.permissions.map((perm) => (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm">{perm.label}</span>
                          <Checkbox
                            checked={selectedPermissions.includes(perm.key)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPermissions([...selectedPermissions, perm.key]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter(p => p !== perm.key));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => selectedUser && updatePermissionsMutation.mutate({
                userId: selectedUser.id,
                permissions: selectedPermissions,
                makeAdmin: isAdmin,
              })}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? "Đang lưu..." : "Lưu quyền"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Đổi mật khẩu cho {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Nhập lại mật khẩu</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-sm text-destructive">Mật khẩu không khớp</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsChangePasswordOpen(false);
              setNewPassword("");
              setConfirmNewPassword("");
            }}>
              Hủy
            </Button>
            <Button
              onClick={() => selectedUser && changePasswordMutation.mutate({
                userId: selectedUser.id,
                newPassword,
              })}
              disabled={
                changePasswordMutation.isPending || 
                !newPassword || 
                newPassword.length < 6 ||
                newPassword !== confirmNewPassword
              }
            >
              {changePasswordMutation.isPending ? "Đang lưu..." : "Đổi mật khẩu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa người dùng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser?.email}</strong>? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
            >
              {deleteUserMutation.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default UsersManagement;
