import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Link, Upload, X } from "lucide-react";

interface ImageSelectorProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
}

const ImageSelector = ({ value, onChange, label }: ImageSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(value);

  const handleConfirm = () => {
    onChange(urlInput);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setUrlInput("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL hình ảnh..."
          className="flex-1"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon">
              <Image className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chọn hình ảnh</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="url">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="url">
                  <Link className="h-4 w-4 mr-2" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="upload" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="library" disabled>
                  <Image className="h-4 w-4 mr-2" />
                  Thư viện
                </TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nhập URL hình ảnh</Label>
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                {urlInput && (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={urlInput} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleConfirm}>
                    Xác nhận
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        {value && (
          <Button type="button" variant="outline" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        <div className="relative aspect-video max-w-xs bg-muted rounded-lg overflow-hidden">
          <img 
            src={value} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ImageSelector;
