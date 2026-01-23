import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, FileText, Eye, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import RichTextEditor from "@/components/admin/movie-edit/RichTextEditor";
import SEOPreview, { CharacterCounter } from "@/components/admin/movie-edit/SEOPreview";
import MediaPicker from "@/components/admin/MediaPicker";
import { pingIndexNow } from "@/hooks/useIndexNow";

interface PostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  thumbnail_url: string;
  status: string;
  category_id: string | null;
  seo_title: string;
  seo_description: string;
  seo_keyword: string;
  schema_json: string;
}

const PostEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    thumbnail_url: "",
    status: "draft",
    category_id: null,
    seo_title: "",
    seo_description: "",
    seo_keyword: "",
    schema_json: "",
  });

  // Fetch post categories
  const { data: categories } = useQuery({
    queryKey: ["post-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_categories")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || "",
        slug: post.slug || "",
        content: post.content || "",
        excerpt: post.excerpt || "",
        thumbnail_url: post.thumbnail_url || "",
        status: post.status || "draft",
        category_id: post.category_id || null,
        seo_title: post.seo_title || "",
        seo_description: post.seo_description || "",
        seo_keyword: post.seo_keyword || "",
        schema_json: post.schema_json || "",
      });
    }
  }, [post]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      if (isNew) {
        const { error } = await supabase.from("posts").insert([data]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("posts")
          .update(data)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(isNew ? "Đã tạo bài viết mới" : "Đã lưu bài viết");
      
      // Auto-ping IndexNow for the post URL (only if published)
      if (formData.status === "published" && formData.slug) {
        pingIndexNow(`/bai-viet/${formData.slug}`);
      }
      
      if (isNew) {
        navigate("/admin/posts");
      }
    },
    onError: (error) => {
      console.error(error);
      toast.error("Không thể lưu bài viết");
    },
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài viết");
      return;
    }
    if (!formData.slug.trim()) {
      toast.error("Vui lòng nhập slug");
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Đang tải...</div>
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
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/posts")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">
                  {isNew ? "Tạo bài viết mới" : "Chỉnh sửa bài viết"}
                </h1>
              </div>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Đang lưu..." : "Lưu bài viết"}
              </Button>
            </div>
          </header>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Nội dung bài viết
                  </h2>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Tiêu đề</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Nhập tiêu đề bài viết"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="slug-bai-viet"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Tóm tắt</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="Tóm tắt ngắn về bài viết"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nội dung</Label>
                    <RichTextEditor
                      content={formData.content}
                      onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                    />
                  </div>
                </div>

                {/* SEO Section */}
                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    SEO
                  </h2>

                  <SEOPreview
                    title={formData.seo_title || formData.title}
                    description={formData.seo_description || formData.excerpt}
                    url={`https://example.com/bai-viet/${formData.slug}`}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="seo_title">SEO Title</Label>
                    <Input
                      id="seo_title"
                      value={formData.seo_title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, seo_title: e.target.value }))}
                      placeholder="Tiêu đề SEO"
                    />
                    <CharacterCounter
                      current={formData.seo_title.length}
                      max={60}
                      label="SEO Title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_description">SEO Description</Label>
                    <Textarea
                      id="seo_description"
                      value={formData.seo_description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, seo_description: e.target.value }))}
                      placeholder="Mô tả SEO"
                      rows={3}
                    />
                    <CharacterCounter
                      current={formData.seo_description.length}
                      max={160}
                      label="SEO Description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_keyword">SEO Keyword</Label>
                    <Input
                      id="seo_keyword"
                      value={formData.seo_keyword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, seo_keyword: e.target.value }))}
                      placeholder="Từ khóa SEO, phân cách bằng dấu phẩy"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schema_json">Schema JSON-LD</Label>
                    <Textarea
                      id="schema_json"
                      value={formData.schema_json}
                      onChange={(e) => setFormData((prev) => ({ ...prev, schema_json: e.target.value }))}
                      placeholder='{"@context": "https://schema.org", ...}'
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Cài đặt</h2>

                  <div className="space-y-2">
                    <Label htmlFor="status">Trạng thái</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Bản nháp</SelectItem>
                        <SelectItem value="published">Xuất bản</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Danh mục</Label>
                    <Select
                      value={formData.category_id || "none"}
                      onValueChange={(value) => setFormData((prev) => ({ 
                        ...prev, 
                        category_id: value === "none" ? null : value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không có danh mục</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_url">Ảnh đại diện</Label>
                    <div className="flex gap-2">
                      <Input
                        id="thumbnail_url"
                        value={formData.thumbnail_url}
                        onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
                        placeholder="URL ảnh đại diện"
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowMediaPicker(true)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.thumbnail_url && (
                      <img
                        src={formData.thumbnail_url}
                        alt="Thumbnail"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MediaPicker
            open={showMediaPicker}
            onOpenChange={setShowMediaPicker}
            onSelect={(url) => setFormData((prev) => ({ ...prev, thumbnail_url: url }))}
            accept="image"
          />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default PostEdit;
