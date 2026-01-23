import { cn } from "@/lib/utils";

interface SEOPreviewProps {
  title: string;
  description: string;
  url: string;
}

const SEOPreview = ({ title, description, url }: SEOPreviewProps) => {
  const displayTitle = title || "Tiêu đề phim - Website của bạn";
  const displayDescription = description || "Mô tả phim sẽ hiển thị ở đây...";
  const displayUrl = url || "https://example.com/phim/ten-phim";

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground mb-2">Xem trước trên Google</p>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground truncate">{displayUrl}</p>
        <h3 className="text-lg text-blue-600 hover:underline cursor-pointer line-clamp-1">
          {displayTitle}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {displayDescription}
        </p>
      </div>
    </div>
  );
};

interface CharacterCounterProps {
  current: number;
  max: number;
  label: string;
}

export const CharacterCounter = ({ current, max, label }: CharacterCounterProps) => {
  const percentage = (current / max) * 100;
  
  let colorClass = "bg-green-500";
  if (percentage > 100) {
    colorClass = "bg-red-500";
  } else if (percentage > 80) {
    colorClass = "bg-yellow-500";
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={cn(
          current > max ? "text-red-500" : "text-muted-foreground"
        )}>
          {current}/{max} ký tự
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default SEOPreview;
