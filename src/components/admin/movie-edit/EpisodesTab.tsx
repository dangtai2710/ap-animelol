import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Save, X, Play, Server, Link, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

interface EpisodesTabProps {
  movieId: string;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface Episode {
  id: string;
  name: string;
  slug: string;
  server_name: string;
  link_m3u8: string | null;
  link_embed: string | null;
  link_mp4: string | null;
  filename: string | null;
}

const linkTypes = [
  { value: "m3u8", label: "M3U8", icon: "🎬" },
  { value: "embed", label: "Embed", icon: "📺" },
  { value: "mp4", label: "MP4", icon: "🎥" },
  { value: "shortcode", label: "Shortcode", icon: "📝" },
];

const EpisodesTab = ({ movieId, onSave, onCancel, isSaving }: EpisodesTabProps) => {
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editingField, setEditingField] = useState<"m3u8" | "embed" | "mp4" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEpisode, setNewEpisode] = useState({
    name: "",
    slug: "",
    server_name: "Server #1",
    link_m3u8: "",
    link_embed: "",
    link_mp4: "",
  });

  const queryClient = useQueryClient();

  const { data: episodes, isLoading } = useQuery({
    queryKey: ["movie-episodes", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("movie_id", movieId)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!movieId,
  });

  const addMutation = useMutation({
    mutationFn: async (episode: typeof newEpisode) => {
      const episodeData = {
        movie_id: movieId,
        name: episode.name,
        slug: episode.slug || episode.name.toLowerCase().replace(/\s+/g, "-"),
        server_name: episode.server_name,
        link_m3u8: episode.link_m3u8 || null,
        link_embed: episode.link_embed || null,
        link_mp4: episode.link_mp4 || null,
      };

      const { error } = await supabase.from("episodes").insert(episodeData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-episodes", movieId] });
      toast.success("Đã thêm tập phim");
      setIsDialogOpen(false);
      setNewEpisode({ name: "", slug: "", server_name: "Server #1", link_m3u8: "", link_embed: "", link_mp4: "" });
    },
    onError: () => {
      toast.error("Không thể thêm tập phim");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (episode: Episode) => {
      const { error } = await supabase
        .from("episodes")
        .update({
          name: episode.name,
          slug: episode.slug,
          server_name: episode.server_name,
          link_m3u8: episode.link_m3u8,
          link_embed: episode.link_embed,
          link_mp4: episode.link_mp4,
          filename: episode.filename,
        } as any)
        .eq("id", episode.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-episodes", movieId] });
      toast.success("Đã cập nhật tập phim");
      setEditingEpisode(null);
      setEditingField(null);
    },
    onError: () => {
      toast.error("Không thể cập nhật tập phim");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("episodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-episodes", movieId] });
      toast.success("Đã xóa tập phim");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Không thể xóa tập phim");
    },
  });

  // Group episodes by server
  const groupedEpisodes = episodes?.reduce((acc: Record<string, Episode[]>, episode) => {
    const server = episode.server_name || "Server #1";
    if (!acc[server]) acc[server] = [];
    acc[server].push(episode);
    return acc;
  }, {}) || {};

  const truncateUrl = (url: string, maxLength = 50) => {
    if (!url) return "Chưa có link";
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  const handleStartEdit = (episode: Episode, field: "m3u8" | "embed" | "mp4") => {
    setEditingEpisode({ ...episode, link_mp4: (episode as any).link_mp4 || null });
    setEditingField(field);
  };

  const handleCancelEdit = () => {
    setEditingEpisode(null);
    setEditingField(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Danh sách tập phim</CardTitle>
            <CardDescription>Quản lý các tập phim và link stream (M3U8 & Embed)</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Thêm tập
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Thêm tập phim mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên tập</Label>
                    <Input
                      value={newEpisode.name}
                      onChange={(e) => setNewEpisode(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Tập 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={newEpisode.slug}
                      onChange={(e) => setNewEpisode(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="tap-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Server</Label>
                  <Input
                    value={newEpisode.server_name}
                    onChange={(e) => setNewEpisode(prev => ({ ...prev, server_name: e.target.value }))}
                    placeholder="#Hà Nội (Vietsub)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">🎬</span> Link M3U8
                  </Label>
                  <Input
                    value={newEpisode.link_m3u8}
                    onChange={(e) => setNewEpisode(prev => ({ ...prev, link_m3u8: e.target.value }))}
                    placeholder="https://example.com/video.m3u8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">📺</span> Link Embed
                  </Label>
                  <Input
                    value={newEpisode.link_embed}
                    onChange={(e) => setNewEpisode(prev => ({ ...prev, link_embed: e.target.value }))}
                    placeholder="https://player.example.com/embed/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">🎥</span> Link MP4
                  </Label>
                  <Input
                    value={newEpisode.link_mp4}
                    onChange={(e) => setNewEpisode(prev => ({ ...prev, link_mp4: e.target.value }))}
                    placeholder="https://example.com/video.mp4"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={() => addMutation.mutate(newEpisode)}
                    disabled={addMutation.isPending || !newEpisode.name}
                  >
                    Thêm tập
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : Object.keys(groupedEpisodes).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có tập phim nào
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEpisodes).map(([serverName, serverEpisodes]) => (
                <div key={serverName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{serverName}</h4>
                    <Badge variant="secondary">{serverEpisodes.length} tập</Badge>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="w-[100px]">Tên tập</TableHead>
                          <TableHead className="w-[100px]">Slug</TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <span>🎬</span> Link M3U8
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <span>📺</span> Link Embed
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <span>🎥</span> Link MP4
                            </span>
                          </TableHead>
                          <TableHead className="w-[80px] text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serverEpisodes.map((episode) => (
                          <TableRow key={episode.id} className="border-border">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Play className="h-3 w-3 text-primary" />
                                {episode.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {episode.slug}
                            </TableCell>
                            
                            {/* M3U8 Link */}
                            <TableCell>
                              {editingEpisode?.id === episode.id && editingField === "m3u8" ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editingEpisode.link_m3u8 || ""}
                                    onChange={(e) => setEditingEpisode({ ...editingEpisode, link_m3u8: e.target.value })}
                                    className="h-8 text-xs"
                                    placeholder="https://..."
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => updateMutation.mutate(editingEpisode)}
                                  >
                                    <Check className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className="flex items-center gap-1 group cursor-pointer"
                                        onClick={() => handleStartEdit(episode, "m3u8")}
                                      >
                                        {episode.link_m3u8 ? (
                                          <>
                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                              M3U8
                                            </Badge>
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                              {truncateUrl(episode.link_m3u8, 30)}
                                            </span>
                                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                                          </>
                                        ) : (
                                          <Badge variant="outline" className="text-muted-foreground border-dashed">
                                            + Thêm M3U8
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {episode.link_m3u8 && (
                                      <TooltipContent side="top" className="max-w-md">
                                        <p className="text-xs break-all">{episode.link_m3u8}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            
                            {/* Embed Link */}
                            <TableCell>
                              {editingEpisode?.id === episode.id && editingField === "embed" ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editingEpisode.link_embed || ""}
                                    onChange={(e) => setEditingEpisode({ ...editingEpisode, link_embed: e.target.value })}
                                    className="h-8 text-xs"
                                    placeholder="https://..."
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => updateMutation.mutate(editingEpisode)}
                                  >
                                    <Check className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className="flex items-center gap-1 group cursor-pointer"
                                        onClick={() => handleStartEdit(episode, "embed")}
                                      >
                                        {episode.link_embed ? (
                                          <>
                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                              Embed
                                            </Badge>
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                              {truncateUrl(episode.link_embed, 30)}
                                            </span>
                                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                                          </>
                                        ) : (
                                          <Badge variant="outline" className="text-muted-foreground border-dashed">
                                            + Thêm Embed
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {episode.link_embed && (
                                      <TooltipContent side="top" className="max-w-md">
                                        <p className="text-xs break-all">{episode.link_embed}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            
                            {/* MP4 Link */}
                            <TableCell>
                              {editingEpisode?.id === episode.id && editingField === "mp4" ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editingEpisode.link_mp4 || ""}
                                    onChange={(e) => setEditingEpisode({ ...editingEpisode, link_mp4: e.target.value })}
                                    className="h-8 text-xs"
                                    placeholder="https://..."
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => updateMutation.mutate(editingEpisode)}
                                  >
                                    <Check className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className="flex items-center gap-1 group cursor-pointer"
                                        onClick={() => handleStartEdit(episode as Episode, "mp4")}
                                      >
                                        {(episode as any).link_mp4 ? (
                                          <>
                                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                                              MP4
                                            </Badge>
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                              {truncateUrl((episode as any).link_mp4, 30)}
                                            </span>
                                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                                          </>
                                        ) : (
                                          <Badge variant="outline" className="text-muted-foreground border-dashed">
                                            + Thêm MP4
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {(episode as any).link_mp4 && (
                                      <TooltipContent side="top" className="max-w-md">
                                        <p className="text-xs break-all">{(episode as any).link_mp4}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(episode.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tập phim?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tập phim sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border border-border">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-2" />
          Đóng
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
};

export default EpisodesTab;
