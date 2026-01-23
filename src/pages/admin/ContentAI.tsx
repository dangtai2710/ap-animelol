import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Save, Plus, Pencil, Trash2, Star, Settings, Info } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface PromptTemplate {
  id: string;
  name: string;
  prompt_content: string;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

interface AISettings {
  openai_api_key: string;
  openai_model: string;
  temperature: string;
}

export default function ContentAI() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", prompt_content: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings>({
    openai_api_key: "",
    openai_model: "gpt-4o-mini",
    temperature: "0.7",
  });

  // Fetch prompt templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["ai-prompt-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompt_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromptTemplate[];
    },
  });

  // Fetch AI settings from site_settings
  const { data: siteSettings } = useQuery({
    queryKey: ["ai-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .in("setting_key", ["openai_api_key", "openai_model", "openai_temperature"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (siteSettings) {
      const settings: AISettings = {
        openai_api_key: "",
        openai_model: "gpt-4o-mini",
        temperature: "0.7",
      };
      siteSettings.forEach((s: any) => {
        if (s.setting_key === "openai_api_key") settings.openai_api_key = s.setting_value || "";
        if (s.setting_key === "openai_model") settings.openai_model = s.setting_value || "gpt-4o-mini";
        if (s.setting_key === "openai_temperature") settings.temperature = s.setting_value || "0.7";
      });
      setAiSettings(settings);
    }
  }, [siteSettings]);

  // Save AI settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { setting_key: "openai_api_key", setting_value: aiSettings.openai_api_key, setting_type: "text" },
        { setting_key: "openai_model", setting_value: aiSettings.openai_model, setting_type: "text" },
        { setting_key: "openai_temperature", setting_value: aiSettings.temperature, setting_type: "text" },
      ];

      for (const update of updates) {
        const { data: existing } = await supabase
          .from("site_settings")
          .select("id")
          .eq("setting_key", update.setting_key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("site_settings")
            .update({ setting_value: update.setting_value })
            .eq("setting_key", update.setting_key);
        } else {
          await supabase.from("site_settings").insert(update);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-site-settings"] });
      toast.success("Lưu cài đặt AI thành công");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; prompt_content: string; id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("ai_prompt_templates")
          .update({ name: data.name, prompt_content: data.prompt_content })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_prompt_templates")
          .insert({ name: data.name, prompt_content: data.prompt_content });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompt-templates"] });
      setShowDialog(false);
      setSelectedTemplate(null);
      setFormData({ name: "", prompt_content: "" });
      toast.success(selectedTemplate ? "Cập nhật template thành công" : "Tạo template thành công");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_prompt_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompt-templates"] });
      setShowDeleteDialog(false);
      setDeleteId(null);
      toast.success("Xóa template thành công");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase.from("ai_prompt_templates").update({ is_default: false }).neq("id", "");
      // Then set the new default
      const { error } = await supabase.from("ai_prompt_templates").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompt-templates"] });
      toast.success("Đặt làm template mặc định");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const handleEdit = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setFormData({ name: template.name, prompt_content: template.prompt_content });
    setShowDialog(true);
  };

  const handleAdd = () => {
    setSelectedTemplate(null);
    setFormData({ name: "", prompt_content: "" });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.prompt_content.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: selectedTemplate?.id,
    });
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold">Content AI</h1>
            </div>

          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cài đặt API
              </CardTitle>
              <CardDescription>Cấu hình OpenAI API để sử dụng tính năng tự động tạo nội dung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={aiSettings.openai_api_key}
                    onChange={(e) => setAiSettings({ ...aiSettings, openai_api_key: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={aiSettings.openai_model}
                    onChange={(e) => setAiSettings({ ...aiSettings, openai_model: e.target.value })}
                    placeholder="gpt-4o-mini"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (0-1)</Label>
                  <Input
                    id="temperature"
                    value={aiSettings.temperature}
                    onChange={(e) => setAiSettings({ ...aiSettings, temperature: e.target.value })}
                    placeholder="0.7"
                  />
                </div>
              </div>
              <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? "Đang lưu..." : "Lưu cài đặt"}
              </Button>
            </CardContent>
          </Card>

          {/* Variables Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Biến có sẵn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Sử dụng các biến sau trong prompt template, chúng sẽ được thay thế tự động:
              </p>
              <div className="flex flex-wrap gap-2">
                <code className="px-2 py-1 bg-muted rounded text-sm">{"{post_title}"}</code>
                <span className="text-muted-foreground">= Tên phim</span>
                <code className="px-2 py-1 bg-muted rounded text-sm ml-4">{"{post_content}"}</code>
                <span className="text-muted-foreground">= Mô tả ngắn của phim</span>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Prompt Templates</CardTitle>
                  <CardDescription>Quản lý các mẫu prompt cho AI</CardDescription>
                </div>
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : templates && templates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên Template</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead className="w-[100px]">Mặc định</TableHead>
                      <TableHead className="w-[150px]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="max-w-md truncate text-muted-foreground">
                          {template.prompt_content.slice(0, 100)}...
                        </TableCell>
                        <TableCell>
                          {template.is_default ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDefaultMutation.mutate(template.id)}
                            >
                              <Star className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có template nào. Nhấn "Thêm Template" để tạo mới.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTemplate ? "Sửa Template" : "Thêm Template"}</DialogTitle>
              <DialogDescription>
                Tạo hoặc chỉnh sửa prompt template cho AI
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Tên Template</Label>
                <Input
                  id="template_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mô tả phim SEO"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template_prompt">Prompt Content</Label>
                <Textarea
                  id="template_prompt"
                  value={formData.prompt_content}
                  onChange={(e) => setFormData({ ...formData, prompt_content: e.target.value })}
                  placeholder="Dựa trên tiêu đề {post_title} và mô tả {post_content}, hãy viết..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Sử dụng {"{post_title}"} cho tên phim và {"{post_content}"} cho mô tả ngắn
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa template này? Hành động này không thể hoàn tác.
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
        </main>
      </div>
    </SidebarProvider>
  );
}
