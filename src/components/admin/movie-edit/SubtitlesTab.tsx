import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Subtitles } from "lucide-react";

interface SubtitlesTabProps {
  movieId: string;
}

interface Subtitle {
  id: string;
  movie_id: string;
  episode_id: string | null;
  language: string;
  label: string;
  file_url: string;
  file_type: string;
  display_order: number;
  created_at: string;
}

interface Episode {
  id: string;
  name: string;
  slug: string;
}

const LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "th", label: "ไทย" },
];

const SubtitlesTab = ({ movieId }: SubtitlesTabProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState<Subtitle | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    episode_id: "",
    language: "vi",
    label: "",
    file_url: "",
    file_type: "vtt",
    display_order: 0,
  });

  // Fetch subtitles
  const { data: subtitles, isLoading } = useQuery({
    queryKey: ["movie-subtitles", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movie_subtitles")
        .select("*")
        .eq("movie_id", movieId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Subtitle[];
    },
  });

  // Fetch episodes
  const { data: episodes } = useQuery({
    queryKey: ["movie-episodes-list", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("id, name, slug")
        .eq("movie_id", movieId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Episode[];
    },
  });

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["srt", "vtt"].includes(ext || "")) {
      toast.error("Chỉ hỗ trợ file .srt hoặc .vtt");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${movieId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("media")
        .upload(`subtitles/${fileName}`, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(`subtitles/${fileName}`);

      setFormData(prev => ({
        ...prev,
        file_url: urlData.publicUrl,
        file_type: ext || "vtt",
      }));

      toast.success("Đã tải file phụ đề");
    } catch (error: any) {
      toast.error("Lỗi tải file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        movie_id: movieId,
        episode_id: formData.episode_id || null,
        language: formData.language,
        label: formData.label || LANGUAGES.find(l => l.value === formData.language)?.label || formData.language,
        file_url: formData.file_url,
        file_type: formData.file_type,
        display_order: formData.display_order,
      };

      if (editingSubtitle) {
        const { error } = await supabase
          .from("movie_subtitles")
          .update(payload)
          .eq("id", editingSubtitle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("movie_subtitles")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-subtitles", movieId] });
      toast.success(editingSubtitle ? "Đã cập nhật phụ đề" : "Đã thêm phụ đề");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movie_subtitles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-subtitles", movieId] });
      toast.success("Đã xóa phụ đề");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const handleEdit = (subtitle: Subtitle) => {
    setEditingSubtitle(subtitle);
    setFormData({
      episode_id: subtitle.episode_id || "",
      language: subtitle.language,
      label: subtitle.label,
      file_url: subtitle.file_url,
      file_type: subtitle.file_type,
      display_order: subtitle.display_order,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSubtitle(null);
    setFormData({
      episode_id: "",
      language: "vi",
      label: "",
      file_url: "",
      file_type: "vtt",
      display_order: 0,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Subtitles className="h-5 w-5" />
              Phụ đề
            </CardTitle>
            <CardDescription>Quản lý phụ đề cho phim và từng tập</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm phụ đề
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSubtitle ? "Chỉnh sửa phụ đề" : "Thêm phụ đề mới"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {episodes && episodes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tập phim (tùy chọn)</Label>
                    <Select
                      value={formData.episode_id || "all"}
                      onValueChange={(value) => setFormData({ ...formData, episode_id: value === "all" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Áp dụng cho tất cả tập" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả tập</SelectItem>
                        {episodes.map((ep) => (
                          <SelectItem key={ep.id} value={ep.id}>
                            {ep.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ngôn ngữ</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => setFormData({ ...formData, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nhãn hiển thị</Label>
                    <Input
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="VD: Tiếng Việt (Vietsub)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>File phụ đề (.srt hoặc .vtt)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.file_url}
                      onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                      placeholder="URL file phụ đề"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? "Đang tải..." : "Tải lên"}
                        <input
                          type="file"
                          accept=".srt,.vtt"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Thứ tự hiển thị</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={() => saveMutation.mutate()} 
                    disabled={saveMutation.isPending || !formData.file_url}
                  >
                    {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngôn ngữ</TableHead>
                <TableHead>Nhãn</TableHead>
                <TableHead>Tập</TableHead>
                <TableHead>Định dạng</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subtitles?.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {LANGUAGES.find(l => l.value === sub.language)?.label || sub.language}
                    </Badge>
                  </TableCell>
                  <TableCell>{sub.label}</TableCell>
                  <TableCell>
                    {sub.episode_id 
                      ? episodes?.find(e => e.id === sub.episode_id)?.name || "N/A"
                      : "Tất cả"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">.{sub.file_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Bạn có chắc muốn xóa phụ đề này?")) {
                            deleteMutation.mutate(sub.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!subtitles || subtitles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Chưa có phụ đề nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SubtitlesTab;
