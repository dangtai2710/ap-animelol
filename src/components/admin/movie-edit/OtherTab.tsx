import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";

interface OtherTabProps {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const OtherTab = ({ formData, setFormData, onSave, onCancel, isSaving }: OtherTabProps) => {
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const statusOptions = [
    { value: "ongoing", label: "Đang chiếu" },
    { value: "completed", label: "Hoàn thành" },
    { value: "trailer", label: "Sắp chiếu" },
  ];

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái phim</CardTitle>
          <CardDescription>Cài đặt trạng thái hiển thị của phim</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select 
              value={formData.status || "ongoing"} 
              onValueChange={(v) => updateField("status", v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Special Options */}
      <Card>
        <CardHeader>
          <CardTitle>Tùy chọn đặc biệt</CardTitle>
          <CardDescription>Các cài đặt bổ sung cho phim</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="chieurap"
              checked={formData.chieurap || false}
              onCheckedChange={(checked) => updateField("chieurap", !!checked)}
            />
            <div>
              <Label htmlFor="chieurap" className="cursor-pointer">Phim chiếu rạp</Label>
              <p className="text-xs text-muted-foreground">
                Đánh dấu phim đang hoặc sẽ chiếu tại rạp
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="sub_docquyen"
              checked={formData.sub_docquyen || false}
              onCheckedChange={(checked) => updateField("sub_docquyen", !!checked)}
            />
            <div>
              <Label htmlFor="sub_docquyen" className="cursor-pointer">Sub độc quyền</Label>
              <p className="text-xs text-muted-foreground">
                Phim có phụ đề do website dịch
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="is_copyright"
              checked={formData.is_copyright || false}
              onCheckedChange={(checked) => updateField("is_copyright", !!checked)}
            />
            <div>
              <Label htmlFor="is_copyright" className="cursor-pointer">Bản quyền</Label>
              <p className="text-xs text-muted-foreground">
                Phim có bản quyền, không hiển thị công khai
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="is_featured"
              checked={formData.is_featured || false}
              onCheckedChange={(checked) => updateField("is_featured", !!checked)}
            />
            <div>
              <Label htmlFor="is_featured" className="cursor-pointer">Phim nổi bật</Label>
              <p className="text-xs text-muted-foreground">
                Hiển thị phim ở slider trang chủ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="is_hot"
              checked={formData.is_hot || false}
              onCheckedChange={(checked) => updateField("is_hot", !!checked)}
            />
            <div>
              <Label htmlFor="is_hot" className="cursor-pointer">Phim hot</Label>
              <p className="text-xs text-muted-foreground">
                Hiển thị nhãn "Hot" trên poster phim
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="is_new"
              checked={formData.is_new || false}
              onCheckedChange={(checked) => updateField("is_new", !!checked)}
            />
            <div>
              <Label htmlFor="is_new" className="cursor-pointer">Phim mới</Label>
              <p className="text-xs text-muted-foreground">
                Hiển thị nhãn "Mới" trên poster phim
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="show_ads"
              checked={formData.show_ads !== false}
              onCheckedChange={(checked) => updateField("show_ads", !!checked)}
            />
            <div>
              <Label htmlFor="show_ads" className="cursor-pointer">Hiển thị quảng cáo</Label>
              <p className="text-xs text-muted-foreground">
                Cho phép hiển thị quảng cáo trên trang phim
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Views */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê lượt xem</CardTitle>
          <CardDescription>Thông tin lượt xem của phim (chỉ đọc)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{formData.view_count || 0}</p>
              <p className="text-sm text-muted-foreground">Tổng lượt xem</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{formData.view_day || 0}</p>
              <p className="text-sm text-muted-foreground">Hôm nay</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{formData.view_week || 0}</p>
              <p className="text-sm text-muted-foreground">Tuần này</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{formData.view_month || 0}</p>
              <p className="text-sm text-muted-foreground">Tháng này</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border border-border">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-2" />
          Hủy
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
};

export default OtherTab;
