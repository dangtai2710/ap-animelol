import { useState } from "react";
import { ChevronDown, ExternalLink, Home, Search, Tv, Film, Monitor, Globe, Tag, Calendar, FileText, Menu as MenuIcon, Play, Clapperboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  title: string;
  url: string | null;
  link_target: string;
  icon: string | null;
  css_class: string | null;
  children?: MenuItem[];
}

interface MenuPreviewProps {
  items: MenuItem[];
  location: string;
  siteName?: string;
}

// Icon mapping for dynamic menu items
const getIconForUrl = (url: string | null, iconName: string | null) => {
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
      menu: MenuIcon,
      play: Play,
    };
    return iconMap[iconName.toLowerCase()] || Film;
  }

  if (!url) return MenuIcon;
  
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

// Desktop Header Preview
function DesktopHeaderPreview({ items, siteName }: { items: MenuItem[]; siteName: string }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div className="bg-background/95 backdrop-blur-md border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary/80">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">{siteName}</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openDropdown === item.id;

            return (
              <div key={item.id} className="relative">
                <button
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors hover:bg-accent hover:text-foreground text-muted-foreground ${item.css_class || ""}`}
                  onMouseEnter={() => hasChildren && setOpenDropdown(item.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  {item.title}
                  {hasChildren && <ChevronDown className="h-3 w-3" />}
                  {item.link_target === "_blank" && <ExternalLink className="h-2.5 w-2.5" />}
                </button>

                {/* Dropdown */}
                {hasChildren && isOpen && (
                  <div 
                    className="absolute top-full left-0 mt-1 min-w-[180px] bg-popover border rounded-lg shadow-xl p-1.5 z-50 animate-fade-in"
                    onMouseEnter={() => setOpenDropdown(item.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {item.children!.map((child) => (
                      <div
                        key={child.id}
                        className={`px-3 py-2 text-xs rounded-md hover:bg-accent cursor-pointer transition-colors ${child.css_class || ""}`}
                      >
                        {child.title}
                        {child.link_target === "_blank" && (
                          <ExternalLink className="inline h-2.5 w-2.5 ml-1 opacity-50" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Search placeholder */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-md text-muted-foreground text-xs">
          <Search className="h-3 w-3" />
          <span>Tìm kiếm...</span>
        </div>
      </div>
    </div>
  );
}

// Mobile Bottom Nav Preview
function MobileBottomNavPreview({ items }: { items: MenuItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Flatten items for mobile view
  const flatItems = items.flatMap((item) => {
    const result = [];
    if (item.url) {
      result.push(item);
    }
    if (item.children) {
      result.push(...item.children.filter((c) => c.url));
    }
    return result;
  }).slice(0, 7); // Limit to 7 items for mobile

  return (
    <div className="bg-background/95 backdrop-blur-md border rounded-lg overflow-hidden">
      <div className="flex items-center overflow-x-auto py-2 px-1" style={{ scrollbarWidth: "none" }}>
        {flatItems.map((item, index) => {
          const Icon = getIconForUrl(item.url, item.icon);
          const isActive = index === activeIndex;

          return (
            <button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-3 py-1 min-w-[60px] text-[10px] transition-all ${
                isActive ? "text-primary scale-105" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="whitespace-nowrap truncate max-w-[50px]">{item.title}</span>
            </button>
          );
        })}
      </div>
      {/* Gradient indicators */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

// Mobile Hamburger Menu Preview
function MobileMenuPreview({ items }: { items: MenuItem[] }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id}>
        <button
          onClick={() => hasChildren && toggleExpand(item.id)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-md hover:bg-accent transition-colors ${item.css_class || ""}`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          <span>{item.title}</span>
          {hasChildren && (
            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          )}
        </button>
        
        {hasChildren && isExpanded && (
          <div className="animate-fade-in">
            {item.children!.map((child) => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-background border rounded-lg overflow-hidden p-2 max-h-[200px] overflow-y-auto">
      {items.map((item) => renderMenuItem(item))}
    </div>
  );
}

export function MenuPreview({ items, location, siteName = "KKPhim" }: MenuPreviewProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MenuIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Chưa có mục menu nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header indicator */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {location === "header" ? "Desktop Header" : location === "mobile" ? "Mobile" : "Footer"}
        </Badge>
        <span className="text-xs text-muted-foreground">Preview</span>
      </div>

      {location === "header" && (
        <div className="space-y-4">
          {/* Desktop Header */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Monitor className="h-3 w-3" /> Desktop Header
            </p>
            <DesktopHeaderPreview items={items} siteName={siteName} />
          </div>
        </div>
      )}

      {location === "mobile" && (
        <div className="space-y-4">
          {/* Bottom Nav */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Monitor className="h-3 w-3" /> Bottom Navigation
            </p>
            <MobileBottomNavPreview items={items} />
          </div>

          {/* Mobile Menu */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <MenuIcon className="h-3 w-3" /> Hamburger Menu
            </p>
            <MobileMenuPreview items={items} />
          </div>
        </div>
      )}

      {location === "footer" && (
        <div className="bg-background border rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id}>
                <p className="text-xs font-medium mb-2">{item.title}</p>
                {item.children && item.children.length > 0 && (
                  <div className="space-y-1">
                    {item.children.map((child) => (
                      <p key={child.id} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer">
                        {child.title}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
