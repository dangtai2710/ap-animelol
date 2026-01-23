import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  File,
  Loader2,
  FolderOpen,
  ChevronRight,
  Home,
} from "lucide-react";

interface MediaFile {
  id: string;
  name: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  accept?: "image" | "video" | "audio" | "all";
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
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

const MediaPicker = ({ open, onOpenChange, onSelect, accept = "all" }: MediaPickerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentFolder, setCurrentFolder] = useState("");

  // Fetch media files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["media-files-picker", currentFolder],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("media")
        .list(currentFolder, {
          limit: 500,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;
      return (data || []) as MediaFile[];
    },
    enabled: open,
  });

  // Get public URL for file
  const getPublicUrl = (fileName: string) => {
    const path = currentFolder ? `${currentFolder}/${fileName}` : fileName;
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  };

  // Filter based on accept type and search term
  const filteredFiles = files.filter((file) => {
    // Exclude trash folder
    if (file.name === "trash" || file.name === ".emptyFolderPlaceholder") return false;
    
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // If it is a folder, always show
    if (!file.metadata?.mimetype) return true;

    if (accept === "all") return true;
    if (accept === "image") return file.metadata?.mimetype?.startsWith("image/");
    if (accept === "video") return file.metadata?.mimetype?.startsWith("video/");
    if (accept === "audio") return file.metadata?.mimetype?.startsWith("audio/");
    return true;
  });

  // Separate folders and files
  const folders = filteredFiles.filter((f) => !f.metadata?.mimetype && f.id === null);
  const mediaFiles = filteredFiles.filter((f) => f.metadata?.mimetype || f.id !== null);

  const isImage = (mimetype: string) => mimetype?.startsWith("image/");

  const handleSelect = (file: MediaFile) => {
    const url = getPublicUrl(file.name);
    onSelect(url);
    onOpenChange(false);
  };

  const navigateToFolder = (folderName: string) => {
    if (currentFolder) {
      setCurrentFolder(`${currentFolder}/${folderName}`);
    } else {
      setCurrentFolder(folderName);
    }
  };

  const navigateUp = () => {
    const parts = currentFolder.split("/");
    parts.pop();
    setCurrentFolder(parts.join("/"));
  };

  const navigateToRoot = () => {
    setCurrentFolder("");
  };

  // Breadcrumbs
  const breadcrumbs = currentFolder ? currentFolder.split("/") : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chọn Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={navigateToRoot}
            >
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
                  }}
                >
                  {crumb}
                </Button>
              </div>
            ))}
          </div>

          {/* Files grid */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4" />
                <p>Không có file nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 p-1">
                {/* Back button */}
                {currentFolder && (
                  <div
                    className="aspect-square rounded-lg border border-border bg-muted/50 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                    onClick={navigateUp}
                  >
                    <FolderOpen className="h-8 w-8 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">..</span>
                  </div>
                )}

                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.name}
                    className="aspect-square rounded-lg border border-border bg-muted/50 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigateToFolder(folder.name)}
                  >
                    <FolderOpen className="h-8 w-8 text-amber-500 mb-1" />
                    <span className="text-xs truncate w-full text-center px-1">
                      {folder.name}
                    </span>
                  </div>
                ))}

                {/* Files */}
                {mediaFiles.map((file) => {
                  const FileIcon = getFileIcon(file.metadata?.mimetype);
                  const publicUrl = getPublicUrl(file.name);

                  return (
                    <div
                      key={file.id || file.name}
                      className="aspect-square rounded-lg border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
                      onClick={() => handleSelect(file)}
                    >
                      <div className="w-full h-full relative bg-muted flex items-center justify-center">
                        {isImage(file.metadata?.mimetype) ? (
                          <img
                            src={publicUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <FileIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-white truncate">{file.name}</p>
                          <p className="text-xs text-white/70">
                            {formatFileSize(file.metadata?.size || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPicker;
