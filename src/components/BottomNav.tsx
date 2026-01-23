import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Tv, Film, Clapperboard, Sparkles, Monitor, Globe, Tag, Calendar, FileText, Menu, Play } from "lucide-react";
import { useMobileMenu, MenuItem } from "@/hooks/useMenus";

// Icon mapping for dynamic menu items
const getIconForUrl = (url: string | null, iconName: string | null) => {
  // First check if a specific icon name is provided
  if (iconName) {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      home: Home,
      search: Search,
      tv: Tv,
      film: Film,
      clapperboard: Clapperboard,
      sparkles: Sparkles,
      monitor: Monitor,
      globe: Globe,
      tag: Tag,
      calendar: Calendar,
      "file-text": FileText,
      menu: Menu,
      play: Play,
    };
    return iconMap[iconName.toLowerCase()] || Film;
  }

  // Auto-detect icon based on URL
  if (!url) return Menu;
  
  if (url === "/" || url.includes("trang-chu")) return Home;
  if (url.includes("tim-kiem") || url.includes("search")) return Search;
  if (url.includes("phim-bo") || url.includes("series")) return Tv;
  if (url.includes("phim-le") || url.includes("movie")) return Clapperboard;
  if (url.includes("hoat-hinh") || url.includes("anime")) return Sparkles;
  if (url.includes("tv-shows")) return Film;
  if (url.includes("/tv")) return Monitor;
  if (url.includes("the-loai") || url.includes("genre")) return Tag;
  if (url.includes("quoc-gia") || url.includes("country")) return Globe;
  if (url.includes("nam") || url.includes("year")) return Calendar;
  if (url.includes("tin-tuc") || url.includes("post")) return FileText;
  
  return Play;
};

// Default fallback nav items
const defaultNavItems = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Phim Bộ", href: "/danh-sach/phim-bo", icon: Tv },
  { label: "Tìm kiếm", href: "/tim-kiem", icon: Search },
  { label: "Phim Lẻ", href: "/danh-sach/phim-le", icon: Clapperboard },
  { label: "Hoạt Hình", href: "/danh-sach/hoat-hinh", icon: Sparkles },
  { label: "TV Shows", href: "/danh-muc/tv-shows", icon: Film },
  { label: "TV", href: "/tv", icon: Monitor },
];

export function BottomNav() {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const { data: mobileMenuData } = useMobileMenu();

  // Flatten menu items (only first level + children for mobile)
  const getFlattenedItems = (items: MenuItem[]): { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] => {
    const result: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [];
    
    items.forEach(item => {
      if (item.url) {
        result.push({
          label: item.title,
          href: item.url,
          icon: getIconForUrl(item.url, item.icon),
        });
      }
      
      // Also add children
      if (item.children) {
        item.children.forEach(child => {
          if (child.url) {
            result.push({
              label: child.title,
              href: child.url,
              icon: getIconForUrl(child.url, child.icon),
            });
          }
        });
      }
    });
    
    return result;
  };

  const navItems = mobileMenuData?.items 
    ? getFlattenedItems(mobileMenuData.items) 
    : defaultNavItems;

  // Auto scroll to active item
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeItem = activeRef.current;
      const containerWidth = container.offsetWidth;
      const itemLeft = activeItem.offsetLeft;
      const itemWidth = activeItem.offsetWidth;
      
      // Center the active item
      const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
      container.scrollTo({ left: scrollPosition, behavior: "smooth" });
    }
  }, [location.pathname, navItems]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden safe-bottom">
      {/* Scrollable container with touch scrolling */}
      <div 
        ref={scrollRef}
        className="flex items-center overflow-x-auto overscroll-x-contain touch-pan-x bottom-nav-scroll"
        style={{ 
          scrollbarWidth: "none", 
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <style>{`
          .bottom-nav-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/" && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              ref={isActive ? activeRef : null}
              to={item.href}
              className={`flex flex-shrink-0 flex-col items-center gap-1 px-4 py-2 min-w-[70px] text-xs transition-all duration-200 ${
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative ${isActive ? "animate-scale-in" : ""}`}>
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-fade-in" />
                )}
              </div>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
        {/* Spacer at end for better scrolling */}
        <div className="flex-shrink-0 w-4" />
      </div>
      
      {/* Scroll indicators - fade gradient on edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent" />
    </nav>
  );
}
