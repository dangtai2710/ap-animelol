import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tv, ArrowLeft, Plus, Trash2, Save, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import MediaPicker from "@/components/admin/MediaPicker";

interface StreamingSource {
  name: string;
  link: string;
  quality: string;
  type: string;
}

const TvChannelEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    logo_url: "",
    category_id: "",
    is_active: true,
    schedule_code: "",
    display_order: 0,
  });
  const [streamingSources, setStreamingSources] = useState<StreamingSource[]>([
    { name: "Nguồn 1", link: "", quality: "HD", type: "m3u8" }
  ]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["tv-channel", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("tv_channels")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: categories } = useQuery({
    queryKey: ["tv-channel-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channel_categories")
        .select("*")
        .is("deleted_at", null)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || "",
        slug: channel.slug || "",
        description: channel.description || "",
        logo_url: channel.logo_url || "",
        category_id: channel.category_id || "",
        is_active: channel.is_active,
        schedule_code: channel.schedule_code || "",
        display_order: channel.display_order || 0,
      });
      const sources = Array.isArray(channel.streaming_sources) ? channel.streaming_sources : [];
      setStreamingSources(sources.length > 0 ? (sources as unknown as StreamingSource[]) : [{ name: "Nguồn 1", link: "", quality: "HD", type: "m3u8" }]);
    }
  }, [channel]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-").replace(/đ/g, "d").replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a").replace(/[èéẹẻẽêềếệểễ]/g, "e").replace(/[ìíịỉĩ]/g, "i").replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o").replace(/[ùúụủũưừứựửữ]/g, "u").replace(/[ỳýỵỷỹ]/g, "y");
      
      const payload = {
        name: formData.name,
        slug,
        description: formData.description || null,
        logo_url: formData.logo_url || null,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        schedule_code: formData.schedule_code || null,
        display_order: formData.display_order,
        streaming_sources: streamingSources.filter(s => s.link.trim()) as unknown as any,
      };

      if (isNew) {
        const { error } = await supabase.from("tv_channels").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tv_channels").update(payload).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tv-channels"] });
      toast.success(isNew ? "Đã thêm kênh thành công" : "Đã cập nhật kênh thành công");
      navigate("/admin/tv-channels");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Slug đã tồn tại, vui lòng chọn slug khác");
      } else {
        toast.error("Không thể lưu kênh");
      }
    },
  });

  const addSource = () => {
    const newIndex = streamingSources.length + 1;
    setStreamingSources([...streamingSources, { name: `Nguồn ${newIndex}`, link: "", quality: "HD", type: "m3u8" }]);
  };

  const removeSource = (index: number) => {
    setStreamingSources(streamingSources.filter((_, i) => i !== index));
  };

  const updateSource = (index: number, field: keyof StreamingSource, value: string) => {
    const updated = [...streamingSources];
    updated[index][field] = value;
    setStreamingSources(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toast.error("Vui lòng nhập tên kênh");
    }
    saveMutation.mutate();
  };

  if (!isNew && isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-64 bg-muted rounded" />
              <div className="h-96 bg-muted rounded" />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="lg:hidden" />
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/tv-channels")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Tv className="h-5 w-5 text-primary" />
                  {isNew ? "Thêm kênh mới" : "Chỉnh sửa kênh"}
                </h1>
              </div>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cơ bản</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên kênh <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VTV1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="vtv1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả kênh..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Danh mục</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Thứ tự hiển thị</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="URL logo hoặc chọn từ thư viện"
                    />
                    <Button type="button" variant="outline" onClick={() => setShowMediaPicker(true)}>
                      <Image className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo" className="h-16 w-24 object-contain bg-muted rounded mt-2" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Kích hoạt kênh</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Nguồn phát</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addSource}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm nguồn
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {streamingSources.map((source, index) => (
                  <div key={index} className="flex gap-3 items-start p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Tên nguồn</Label>
                          <Input
                            value={source.name || ""}
                            onChange={(e) => updateSource(index, "name", e.target.value)}
                            placeholder="VD: Nguồn HD, Nguồn backup"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Chất lượng</Label>
                          <Select
                            value={source.quality}
                            onValueChange={(value) => updateSource(index, "quality", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SD">SD</SelectItem>
                              <SelectItem value="HD">HD</SelectItem>
                              <SelectItem value="Full HD">Full HD</SelectItem>
                              <SelectItem value="2K">2K</SelectItem>
                              <SelectItem value="4K">4K</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Link nguồn</Label>
                        <Input
                          value={source.link}
                          onChange={(e) => updateSource(index, "link", e.target.value)}
                          placeholder="https://... (m3u8, embed, mp4)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Loại</Label>
                        <Select
                          value={source.type}
                          onValueChange={(value) => updateSource(index, "type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="m3u8">M3U8 (HLS)</SelectItem>
                            <SelectItem value="mp4">MP4</SelectItem>
                            <SelectItem value="embed">Embed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {streamingSources.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeSource(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mã lịch phát sóng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Code tùy chỉnh (HTML, Script, PHP...)</Label>
                  <Textarea
                    value={formData.schedule_code}
                    onChange={(e) => setFormData({ ...formData, schedule_code: e.target.value })}
                    placeholder="<script>...</script> hoặc HTML code để hiển thị lịch phát sóng"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </main>
      </div>

      <MediaPicker
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={(url) => {
          setFormData({ ...formData, logo_url: url });
          setShowMediaPicker(false);
        }}
        accept="image"
      />
    </SidebarProvider>
  );
};

export default TvChannelEdit;
