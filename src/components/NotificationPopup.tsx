import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Wrench, RefreshCw } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  content: string;
  notification_type: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  display_order: number;
  show_on_pages: string[] | null;
}

const DISMISSED_KEY = "dismissed_notifications";

// Map route patterns to page types
const getPageType = (pathname: string): string | null => {
  // Exclude admin pages
  if (pathname.startsWith("/admin")) return null;
  if (pathname === "/auth") return null;
  
  if (pathname === "/") return "home";
  if (pathname.startsWith("/phim/")) return "movie-detail";
  if (pathname.startsWith("/danh-sach/") || pathname.startsWith("/danh-muc/")) return "movie-list";
  if (pathname.match(/^\/(the-loai|quoc-gia|nam|danh-muc-phim)\//)) return "taxonomy";
  if (pathname.startsWith("/tv")) return "tv";
  if (pathname === "/tim-kiem") return "search";
  return "other";
};

const NotificationPopup = () => {
  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [hasShownForPath, setHasShownForPath] = useState<string>("");

  const currentPageType = getPageType(location.pathname);

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      try {
        setDismissedIds(JSON.parse(stored));
      } catch {
        setDismissedIds([]);
      }
    }
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["public-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Notification[];
    }
  });

  // Filter notifications - memoized to prevent recalculation
  const activeNotifications = useMemo(() => {
    if (!currentPageType || !notifications) return [];
    
    return notifications.filter((n) => {
      if (dismissedIds.includes(n.id)) return false;
      
      const showOnPages = n.show_on_pages || ["all"];
      if (showOnPages.includes("all")) return true;
      return showOnPages.includes(currentPageType);
    });
  }, [notifications, dismissedIds, currentPageType]);

  useEffect(() => {
    // Only show popup when path changes and there are active notifications
    if (activeNotifications.length > 0 && !isOpen && hasShownForPath !== location.pathname) {
      setIsOpen(true);
      setCurrentIndex(0);
      setHasShownForPath(location.pathname);
    }
  }, [activeNotifications.length, location.pathname, hasShownForPath, isOpen]);

  const handleClose = () => {
    const currentNotification = activeNotifications[currentIndex];
    
    if (dontShowAgain && currentNotification) {
      const newDismissedIds = [...dismissedIds, currentNotification.id];
      setDismissedIds(newDismissedIds);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(newDismissedIds));
    }

    // Move to next notification or close
    if (currentIndex < activeNotifications.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setDontShowAgain(false);
    } else {
      setIsOpen(false);
      setDontShowAgain(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "maintenance":
        return <Wrench className="h-5 w-5 text-red-500" />;
      case "update":
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; className: string }> = {
      info: { label: "Thông tin", className: "bg-primary/10 text-primary" },
      warning: { label: "Cảnh báo", className: "bg-yellow-500/10 text-yellow-500" },
      maintenance: { label: "Bảo trì", className: "bg-red-500/10 text-red-500" },
      update: { label: "Cập nhật", className: "bg-blue-500/10 text-blue-500" }
    };
    const config = types[type] || types.info;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Early return after all hooks
  const currentNotification = activeNotifications[currentIndex];
  if (!currentPageType || !currentNotification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            {getTypeIcon(currentNotification.notification_type)}
            <span className="flex-1">{currentNotification.title}</span>
            {getTypeBadge(currentNotification.notification_type)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div
            className="prose prose-sm dark:prose-invert max-w-none
              prose-img:rounded-lg prose-img:mx-auto
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-pre:bg-muted prose-pre:text-foreground
              prose-code:bg-muted prose-code:px-1 prose-code:rounded"
            dangerouslySetInnerHTML={{ __html: currentNotification.content }}
          />
        </div>

        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label
              htmlFor="dont-show"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Không hiển thị lại thông báo này
            </label>
          </div>

          <div className="flex items-center gap-2">
            {activeNotifications.length > 1 && (
              <span className="text-sm text-muted-foreground mr-2">
                {currentIndex + 1} / {activeNotifications.length}
              </span>
            )}
            <Button onClick={handleClose}>
              {currentIndex < activeNotifications.length - 1 ? "Tiếp theo" : "Đóng"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPopup;
