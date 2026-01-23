import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Search, 
  Trash2, 
  Download, 
  Copy, 
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  File,
  Grid,
  List,
  Loader2,
  CheckSquare,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Home,
  MoveRight,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface MediaFile {
  id: string;
  name: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (mimetype: string) => {
  if (mimetype?.startsWith("image/")) return ImageIcon;
  if (mimetype?.startsWith("video/")) return FileVideo;
  if (mimetype?.startsWith("audio/")) return FileAudio;
  if (mimetype === "application/pdf") return FileText;
  return File;
};

const MediaManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetFolder, setTargetFolder] = useState("");
  const [showSeoDialog, setShowSeoDialog] = useState(false);
  const [seoData, setSeoData] = useState({ alt_text: "", title: "", description: "" });

  // Fetch media files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["media-files", currentFolder],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("media")
        .list(currentFolder, {
          limit: 1000,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;
      return (data || []) as MediaFile[];
    },
  });

  // Get public URL for file
  const getPublicUrl = (fileName: string) => {
    const path = currentFolder ? `${currentFolder}/${fileName}` : fileName;
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  };

  // Upload file
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of Array.from(uploadedFiles)) {
      const fileName = `${Date.now()}-${file.name}`;
      const path = currentFolder ? `${currentFolder}/${fileName}` : fileName;
      const { error } = await supabase.storage.from("media").upload(path, file);

      if (error) {
        console.error("Upload error:", error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ["media-files", currentFolder] });

    if (successCount > 0) {
      toast({
        title: "Tải lên thành công",
        description: `Đã tải lên ${successCount} file`,
      });
    }
    if (errorCount > 0) {
      toast({
        title: "Lỗi",
        description: `${errorCount} file không thể tải lên`,
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  // Create folder
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const path = currentFolder
        ? `${currentFolder}/${folderName}/.emptyFolderPlaceholder`
        : `${folderName}/.emptyFolderPlaceholder`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, new Blob([""]), { contentType: "text/plain" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-files", currentFolder] });
      toast({ title: "Đã tạo thư mục" });
      setShowNewFolderDialog(false);
      setNewFolderName("");
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Không thể tạo thư mục: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Soft delete - move to trash
  const deleteMutation = useMutation({
    mutationFn: async (file: MediaFile) => {
      const sourcePath = currentFolder ? `${currentFolder}/${file.name}` : file.name;
      
      const { error: insertError } = await supabase.from("deleted_media").insert({
        file_name: file.name,
        file_path: sourcePath,
        file_size: file.metadata?.size || 0,
        mime_type: file.metadata?.mimetype || null,
        deleted_by: user?.id,
      });

      if (insertError) throw insertError;

      const { error: moveError } = await supabase.storage
        .from("media")
        .move(sourcePath, `trash/${file.name}`);

      if (moveError) throw moveError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-files", currentFolder] });
      toast({ title: "Đã chuyển vào thùng rác" });
      setFileToDelete(null);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa file: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const filesToDelete = mediaFiles.filter((f) => fileIds.includes(f.id));

      for (const file of filesToDelete) {
        const sourcePath = currentFolder ? `${currentFolder}/${file.name}` : file.name;
        
        await supabase.from("deleted_media").insert({
          file_name: file.name,
          file_path: sourcePath,
          file_size: file.metadata?.size || 0,
          mime_type: file.metadata?.mimetype || null,
          deleted_by: user?.id,
        });

        await supabase.storage.from("media").move(sourcePath, `trash/${file.name}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-files", currentFolder] });
      toast({ title: `Đã chuyển ${selectedIds.length} file vào thùng rác` });
      setSelectedIds([]);
      setShowBulkDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch all folders for move dialog
  const { data: allFolders = [] } = useQuery({
    queryKey: ["all-folders"],
    queryFn: async () => {
      const fetchFoldersRecursive = async (path: string): Promise<string[]> => {
        const { data, error } = await supabase.storage.from("media").list(path, { limit: 1000 });
        if (error) return [];
        
        const folderNames: string[] = [];
        for (const item of data || []) {
          if (!item.metadata?.mimetype && item.id === null && item.name !== "trash" && item.name !== ".emptyFolderPlaceholder") {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            folderNames.push(fullPath);
            const subFolders = await fetchFoldersRecursive(fullPath);
            folderNames.push(...subFolders);
          }
        }
        return folderNames;
      };
      
      return fetchFoldersRecursive("");
    },
  });

  // Fetch media SEO data
  const { data: mediaSeoData } = useQuery({
    queryKey: ["media-seo", selectedFile?.name, currentFolder],
    queryFn: async () => {
      if (!selectedFile) return null;
      const filePath = currentFolder ? `${currentFolder}/${selectedFile.name}` : selectedFile.name;
      const { data, error } = await supabase
        .from("media_seo")
        .select("*")
        .eq("file_path", filePath)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFile,
  });

  // Move files mutation
  const moveMutation = useMutation({
    mutationFn: async ({ fileIds, destination }: { fileIds: string[]; destination: string }) => {
      const filesToMove = mediaFiles.filter((f) => fileIds.includes(f.id));
      
      for (const file of filesToMove) {
        const sourcePath = currentFolder ? `${currentFolder}/${file.name}` : file.name;
        const destPath = destination ? `${destination}/${file.name}` : file.name;
        
        const { error } = await supabase.storage.from("media").move(sourcePath, destPath);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
      toast({ title: `Đã di chuyển ${selectedIds.length} file` });
      setSelectedIds([]);
      setShowMoveDialog(false);
      setTargetFolder("");
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Không thể di chuyển: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Save media SEO mutation
  const saveSeoMutation = useMutation({
    mutationFn: async (data: { file_path: string; alt_text: string; title: string; description: string }) => {
      const { error } = await supabase
        .from("media_seo")
        .upsert(data, { onConflict: "file_path" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-seo"] });
      toast({ title: "Đã lưu thông tin SEO" });
      setShowSeoDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Không thể lưu SEO: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Copy URL to clipboard
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Đã sao chép URL" });
  };

  // Download file
  const downloadFile = async (fileName: string) => {
    const path = currentFolder ? `${currentFolder}/${fileName}` : fileName;
    const { data, error } = await supabase.storage.from("media").download(path);
    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải file",
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Bulk download
  const handleBulkDownload = async () => {
    const filesToDownload = mediaFiles.filter((f) => selectedIds.includes(f.id));
    setIsDownloading(true);

    for (const file of filesToDownload) {
      await downloadFile(file.name);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsDownloading(false);
    toast({ title: `Đã tải xuống ${filesToDownload.length} file` });
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(mediaFiles.map((f) => f.id));
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

  // Navigation
  const navigateToFolder = (folderName: string) => {
    setSelectedIds([]);
    if (currentFolder) {
      setCurrentFolder(`${currentFolder}/${folderName}`);
    } else {
      setCurrentFolder(folderName);
    }
  };

  const navigateUp = () => {
    setSelectedIds([]);
    const parts = currentFolder.split("/");
    parts.pop();
    setCurrentFolder(parts.join("/"));
  };

  const navigateToRoot = () => {
    setSelectedIds([]);
    setCurrentFolder("");
  };

  // Filter and separate files
  const filteredFiles = files.filter((file) => {
    if (file.name === "trash" || file.name === ".emptyFolderPlaceholder") return false;
    return file.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const folders = filteredFiles.filter((f) => !f.metadata?.mimetype && f.id === null);
  const mediaFiles = filteredFiles.filter((f) => f.metadata?.mimetype || f.id !== null);

  const isImage = (mimetype: string) => mimetype?.startsWith("image/");

  const breadcrumbs = currentFolder ? currentFolder.split("/") : [];

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
                <h1 className="text-xl font-bold">Quản lý Media</h1>
                <p className="text-sm text-muted-foreground">Tải lên và quản lý các file media</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm bg-muted/50 rounded-lg p-2 mb-4">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={navigateToRoot}>
                <Home className="h-4 w-4" />
              </Button>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      const newPath = breadcrumbs.slice(0, index + 1).join("/");
                      setCurrentFolder(newPath);
                      setSelectedIds([]);
                    }}
                  >
                    {crumb}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm file..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewFolderDialog(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Tạo thư mục
                </Button>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button asChild disabled={isUploading}>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isUploading ? "Đang tải..." : "Tải lên"}
                  </label>
                </Button>
              </div>
            </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50 flex-wrap">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Đã chọn {selectedIds.length} file</span>
          <Button variant="outline" size="sm" onClick={() => setShowMoveDialog(true)}>
            <MoveRight className="h-4 w-4 mr-2" />
            Di chuyển
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkDownload} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Tải xuống
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Select all checkbox */}
      {mediaFiles.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={mediaFiles.length > 0 && selectedIds.length === mediaFiles.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            Chọn tất cả ({mediaFiles.length} file)
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFiles.length === 0 && !currentFolder ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "Không tìm thấy file nào" : "Chưa có file nào"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* Back button */}
          {currentFolder && (
            <Card
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
              onClick={navigateUp}
            >
              <div className="aspect-square relative bg-muted flex flex-col items-center justify-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm mt-2">..</span>
              </div>
            </Card>
          )}

          {/* Folders */}
          {folders.map((folder) => (
            <Card
              key={folder.name}
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
              onClick={() => navigateToFolder(folder.name)}
            >
              <div className="aspect-square relative bg-muted flex flex-col items-center justify-center">
                <FolderOpen className="h-12 w-12 text-amber-500" />
              </div>
              <CardContent className="p-2">
                <p className="text-xs truncate text-center" title={folder.name}>
                  {folder.name}
                </p>
              </CardContent>
            </Card>
          ))}

          {/* Files */}
          {mediaFiles.map((file) => {
            const FileIcon = getFileIcon(file.metadata?.mimetype);
            const publicUrl = getPublicUrl(file.name);
            const isSelected = selectedIds.includes(file.id);

            return (
              <Card
                key={file.id}
                className={`cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden relative ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
              >
                <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOne(file.id, !!checked)}
                    className="bg-background/80 backdrop-blur-sm"
                  />
                </div>
                <div
                  className="aspect-square relative bg-muted flex items-center justify-center"
                  onClick={() => setSelectedFile(file)}
                >
                  {isImage(file.metadata?.mimetype) ? (
                    <img
                      src={publicUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-2" onClick={() => setSelectedFile(file)}>
                  <p className="text-xs truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.metadata?.size || 0)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {/* Back button */}
            {currentFolder && (
              <div
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                onClick={navigateUp}
              >
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <span className="font-medium">..</span>
              </div>
            )}

            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.name}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => navigateToFolder(folder.name)}
              >
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-amber-500" />
                </div>
                <span className="font-medium">{folder.name}</span>
              </div>
            ))}

            {/* Files */}
            {mediaFiles.map((file) => {
              const FileIcon = getFileIcon(file.metadata?.mimetype);
              const publicUrl = getPublicUrl(file.name);
              const isSelected = selectedIds.includes(file.id);

              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(file.id, !!checked)}
                    />
                  </div>
                  <div
                    className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden"
                    onClick={() => setSelectedFile(file)}
                  >
                    {isImage(file.metadata?.mimetype) ? (
                      <img
                        src={publicUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => setSelectedFile(file)}>
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.metadata?.size || 0)} •{" "}
                      {format(new Date(file.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(publicUrl);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file.name);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToDelete(file);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* File preview dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{selectedFile?.name}</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="aspect-video relative bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {isImage(selectedFile.metadata?.mimetype) ? (
                  <img
                    src={getPublicUrl(selectedFile.name)}
                    alt={selectedFile.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : selectedFile.metadata?.mimetype?.startsWith("video/") ? (
                  <video
                    src={getPublicUrl(selectedFile.name)}
                    controls
                    className="max-w-full max-h-full"
                  />
                ) : selectedFile.metadata?.mimetype?.startsWith("audio/") ? (
                  <audio src={getPublicUrl(selectedFile.name)} controls className="w-full" />
                ) : (
                  <div className="text-center">
                    <File className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Không thể xem trước file này</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Kích thước</p>
                  <p>{formatFileSize(selectedFile.metadata?.size || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Loại file</p>
                  <p>{selectedFile.metadata?.mimetype || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ngày tải lên</p>
                  <p>
                    {format(new Date(selectedFile.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">URL</p>
                <div className="flex gap-2">
                  <Input value={getPublicUrl(selectedFile.name)} readOnly className="flex-1" />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(getPublicUrl(selectedFile.name))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                {isImage(selectedFile.metadata?.mimetype) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const filePath = currentFolder ? `${currentFolder}/${selectedFile.name}` : selectedFile.name;
                      setSeoData({
                        alt_text: mediaSeoData?.alt_text || "",
                        title: mediaSeoData?.title || "",
                        description: mediaSeoData?.description || "",
                      });
                      setShowSeoDialog(true);
                    }}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    SEO
                  </Button>
                )}
                <Button variant="outline" onClick={() => downloadFile(selectedFile.name)}>
                  <Download className="h-4 w-4 mr-2" />
                  Tải xuống
                </Button>
                <Button variant="destructive" onClick={() => setFileToDelete(selectedFile)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New folder dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thư mục mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Tên thư mục</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nhập tên thư mục"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => createFolderMutation.mutate(newFolderName)}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? "Đang tạo..." : "Tạo thư mục"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển vào thùng rác</AlertDialogTitle>
            <AlertDialogDescription>
              File &quot;{fileToDelete?.name}&quot; sẽ được chuyển vào thùng rác và tự động xóa sau
              30 ngày. Bạn có thể khôi phục file từ thùng rác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && deleteMutation.mutate(fileToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Chuyển vào thùng rác
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển vào thùng rác</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.length} file sẽ được chuyển vào thùng rác và tự động xóa sau 30 ngày.
              Bạn có thể khôi phục từ thùng rác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Chuyển vào thùng rác
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move files dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Di chuyển {selectedIds.length} file</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Thư mục đích</Label>
              <Select value={targetFolder} onValueChange={setTargetFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thư mục đích" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">/ (Thư mục gốc)</SelectItem>
                  {allFolders
                    .filter((f) => f !== currentFolder && !f.startsWith("trash"))
                    .map((folder) => (
                      <SelectItem key={folder} value={folder}>
                        /{folder}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                const destination = targetFolder === "__root__" ? "" : targetFolder;
                moveMutation.mutate({ fileIds: selectedIds, destination });
              }}
              disabled={!targetFolder || moveMutation.isPending}
            >
              {moveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MoveRight className="h-4 w-4 mr-2" />
              )}
              Di chuyển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEO dialog for images */}
      <Dialog open={showSeoDialog} onOpenChange={setShowSeoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cài đặt SEO cho ảnh</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="seo" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="preview">Xem trước</TabsTrigger>
            </TabsList>
            <TabsContent value="seo" className="space-y-4">
              <div className="space-y-2">
                <Label>Alt Text</Label>
                <Input
                  value={seoData.alt_text}
                  onChange={(e) => setSeoData((prev) => ({ ...prev, alt_text: e.target.value }))}
                  placeholder="Mô tả ảnh cho người khiếm thị và SEO"
                />
                <p className="text-xs text-muted-foreground">
                  Alt text giúp công cụ tìm kiếm hiểu nội dung ảnh
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tiêu đề</Label>
                <Input
                  value={seoData.title}
                  onChange={(e) => setSeoData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Tiêu đề hiển thị khi hover"
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={seoData.description}
                  onChange={(e) => setSeoData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả chi tiết về ảnh"
                  rows={3}
                />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="space-y-4">
              {selectedFile && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-medium mb-2">Xem trước thẻ img:</p>
                    <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
                      {`<img src="${getPublicUrl(selectedFile.name)}" alt="${seoData.alt_text}" title="${seoData.title}" />`}
                    </code>
                  </div>
                  <div className="aspect-video relative bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={getPublicUrl(selectedFile.name)}
                      alt={seoData.alt_text}
                      title={seoData.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeoDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (!selectedFile) return;
                const filePath = currentFolder ? `${currentFolder}/${selectedFile.name}` : selectedFile.name;
                saveSeoMutation.mutate({
                  file_path: filePath,
                  ...seoData,
                });
              }}
              disabled={saveSeoMutation.isPending}
            >
              {saveSeoMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MediaManagement;
