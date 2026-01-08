import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "./RichTextEditor";
import ImageSelector from "./ImageSelector";
import SEOPreview, { CharacterCounter } from "./SEOPreview";
import { Save, X, Code, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MovieInfoTabProps {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface PromptTemplate {
  id: string;
  name: string;
  prompt_content: string;
  is_default: boolean | null;
}

interface AISettings {
  openai_api_key: string;
  openai_model: string;
  openai_temperature: string;
}

const MovieInfoTab = ({ formData, setFormData, onSave, onCancel, isSaving }: MovieInfoTabProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch prompt templates
  const { data: templates } = useQuery({
    queryKey: ["ai-prompt-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompt_templates")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data as PromptTemplate[];
    },
  });

  // Fetch AI settings
  const { data: aiSettings } = useQuery({
    queryKey: ["ai-settings-for-movie"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .in("setting_key", ["openai_api_key", "openai_model", "openai_temperature"]);
      if (error) throw error;
      
      const settings: AISettings = {
        openai_api_key: "",
        openai_model: "gpt-4o-mini",
        openai_temperature: "0.7",
      };
      data?.forEach((s: any) => {
        if (s.setting_key === "openai_api_key") settings.openai_api_key = s.setting_value || "";
        if (s.setting_key === "openai_model") settings.openai_model = s.setting_value || "gpt-4o-mini";
        if (s.setting_key === "openai_temperature") settings.openai_temperature = s.setting_value || "0.7";
      });
      return settings;
    },
  });

  // Set default template when templates are loaded
  if (templates && templates.length > 0 && !selectedTemplateId) {
    const defaultTemplate = templates.find(t => t.is_default) || templates[0];
    setSelectedTemplateId(defaultTemplate.id);
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const generateJsonLd = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Movie",
      "name": formData.name || "",
      "alternateName": formData.origin_name || "",
      "description": formData.seo_description || formData.content?.replace(/<[^>]*>/g, "").slice(0, 160) || "",
      "image": formData.poster_url || formData.thumb_url || "",
      "datePublished": formData.year ? `${formData.year}-01-01` : "",
      "duration": formData.time || "",
      "inLanguage": formData.lang || "vi",
    };
    
    updateField("schema_json", JSON.stringify(schema, null, 2));
  };

  const handleAutoContent = async () => {
    if (!selectedTemplateId) {
      toast.error("Vui lòng chọn một prompt template");
      return;
    }

    if (!aiSettings?.openai_api_key) {
      toast.error("Vui lòng cấu hình API Key trong trang Content AI");
      return;
    }

    const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      toast.error("Không tìm thấy template");
      return;
    }

    if (!formData.name?.trim()) {
      toast.error("Vui lòng nhập tên phim trước");
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          prompt: selectedTemplate.prompt_content,
          movieTitle: formData.name,
          movieDescription: formData.origin_name || formData.seo_description || "",
          apiKey: aiSettings.openai_api_key,
          model: aiSettings.openai_model,
          temperature: aiSettings.openai_temperature,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.content) {
        updateField("content", data.content);
        toast.success("Nội dung đã được tạo thành công!");
      }
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast.error(error.message || "Lỗi khi tạo nội dung");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
          <CardDescription>Nhập thông tin chính của phim</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Tên phim <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Avatar: Lửa và Tro Tàn"
              />
              <p className="text-xs text-muted-foreground">
                Tên phim bằng tiếng Việt (bắt buộc)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin_name">Tên phim gốc</Label>
              <Input
                id="origin_name"
                value={formData.origin_name || ""}
                onChange={(e) => updateField("origin_name", e.target.value)}
                placeholder="Avatar: Fire and Ash"
              />
              <p className="text-xs text-muted-foreground">
                Tên phim gốc bằng ngôn ngữ gốc
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Đường dẫn tĩnh (Slug)</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={formData.slug || ""}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="avatar-lua-va-tro-tan"
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => updateField("slug", generateSlug(formData.name || ""))}
              >
                Tạo tự động
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              URL: /phim/{formData.slug || "ten-phim"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Hình ảnh</CardTitle>
          <CardDescription>Ảnh poster và thumbnail của phim</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageSelector
              label="Ảnh Thumb"
              value={formData.thumb_url || ""}
              onChange={(url) => updateField("thumb_url", url)}
            />
            <ImageSelector
              label="Ảnh Poster"
              value={formData.poster_url || ""}
              onChange={(url) => updateField("poster_url", url)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nội dung phim</CardTitle>
              <CardDescription>Mô tả chi tiết về phim</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {templates && templates.length > 0 && (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Chọn template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.is_default && " ⭐"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoContent}
                disabled={isGenerating || !templates || templates.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Auto Content
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            content={formData.content || ""}
            onChange={(content) => updateField("content", content)}
          />
        </CardContent>
      </Card>

      {/* Movie Details */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết phim</CardTitle>
          <CardDescription>Thông tin bổ sung về phim</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="showtimes">Lịch chiếu phim</Label>
            <Input
              id="showtimes"
              value={formData.showtimes || ""}
              onChange={(e) => updateField("showtimes", e.target.value)}
              placeholder="Từ 20/12/2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trailer_url">Trailer Youtube URL</Label>
            <Input
              id="trailer_url"
              value={formData.trailer_url || ""}
              onChange={(e) => updateField("trailer_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time">Thời lượng</Label>
              <Input
                id="time"
                value={formData.time || ""}
                onChange={(e) => updateField("time", e.target.value)}
                placeholder="120 phút"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode_current">Tập hiện tại</Label>
              <Input
                id="episode_current"
                value={formData.episode_current || ""}
                onChange={(e) => updateField("episode_current", e.target.value)}
                placeholder="Tập 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode_total">Tổng số tập</Label>
              <Input
                id="episode_total"
                value={formData.episode_total || ""}
                onChange={(e) => updateField("episode_total", e.target.value)}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Năm xuất bản</Label>
              <Input
                id="year"
                type="number"
                value={formData.year || ""}
                onChange={(e) => updateField("year", parseInt(e.target.value) || null)}
                placeholder="2024"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lang">Ngôn ngữ</Label>
              <Input
                id="lang"
                value={formData.lang || ""}
                onChange={(e) => updateField("lang", e.target.value)}
                placeholder="Vietsub"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Chất lượng</Label>
              <Input
                id="quality"
                value={formData.quality || ""}
                onChange={(e) => updateField("quality", e.target.value)}
                placeholder="HD"
              />
            </div>
          </div>

          {/* Directors and Actors */}
          <Separator className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="directors">Đạo diễn</Label>
              <Input
                id="directors"
                value={formData.directors || ""}
                onChange={(e) => updateField("directors", e.target.value)}
                placeholder="James Cameron, Steven Spielberg"
              />
              <p className="text-xs text-muted-foreground">
                Nhập tên đạo diễn, phân cách bằng dấu phẩy
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actors">Diễn viên</Label>
              <Input
                id="actors"
                value={formData.actors || ""}
                onChange={(e) => updateField("actors", e.target.value)}
                placeholder="Tom Cruise, Leonardo DiCaprio"
              />
              <p className="text-xs text-muted-foreground">
                Nhập tên diễn viên, phân cách bằng dấu phẩy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Section */}
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <CardDescription>Tối ưu hóa cho công cụ tìm kiếm</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="seo_title">Tiêu đề SEO</Label>
            <Input
              id="seo_title"
              value={formData.seo_title || ""}
              onChange={(e) => updateField("seo_title", e.target.value)}
              placeholder="Avatar: Lửa và Tro Tàn (2024) - Xem phim HD Vietsub"
            />
            <CharacterCounter 
              current={formData.seo_title?.length || 0} 
              max={60} 
              label="Độ dài tiêu đề SEO"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="seo_description">Thẻ mô tả SEO</Label>
            <Textarea
              id="seo_description"
              value={formData.seo_description || ""}
              onChange={(e) => updateField("seo_description", e.target.value)}
              placeholder="Xem phim Avatar: Lửa và Tro Tàn (2024) Full HD Vietsub. Phim hành động khoa học viễn tưởng..."
              rows={3}
            />
            <CharacterCounter 
              current={formData.seo_description?.length || 0} 
              max={160} 
              label="Độ dài mô tả SEO"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="seo_keyword">SEO Keyword</Label>
            <Input
              id="seo_keyword"
              value={formData.seo_keyword || ""}
              onChange={(e) => updateField("seo_keyword", e.target.value)}
              placeholder="phim avatar, phim hành động, phim khoa học viễn tưởng, xem phim hd"
            />
            <p className="text-xs text-muted-foreground">
              Nhập các từ khóa SEO, phân cách bằng dấu phẩy
            </p>
          </div>

          <Separator />

          <SEOPreview
            title={formData.seo_title || formData.name || ""}
            description={formData.seo_description || ""}
            url={`https://yoursite.com/phim/${formData.slug || "ten-phim"}`}
          />

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="schema_json">Schema JSON-LD</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={generateJsonLd}
              >
                <Code className="h-4 w-4 mr-2" />
                Tạo Schema
              </Button>
            </div>
            <Textarea
              id="schema_json"
              value={formData.schema_json || ""}
              onChange={(e) => updateField("schema_json", e.target.value)}
              placeholder='{"@context": "https://schema.org", "@type": "Movie", ...}'
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Nhập mã JSON-LD schema hoặc nhấn "Tạo Schema" để tự động tạo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border border-border">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-2" />
          Hủy
        </Button>
        <Button onClick={onSave} disabled={isSaving || !formData.name?.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
};

export default MovieInfoTab;
