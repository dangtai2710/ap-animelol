import React, { useState, useMemo } from "react";
import { 
  LayoutDashboard, 
  Film, 
  FolderOpen,
  Globe,
  Tv,
  Users,
  Settings,
  BarChart3,
  Database,
  Bell,
  LogOut,
  ChevronDown,
  Calendar,
  Tag,
  Clapperboard,
  UserCircle,
  List,
  FileText,
  Trash2,
  Image,
  Search
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, PermissionKey } from "@/hooks/usePermissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Sparkles, Map, BookOpen, Megaphone } from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermissions?: PermissionKey[];
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Bài viết", url: "/admin/posts", icon: FileText },
  { title: "Danh mục BV", url: "/admin/post-categories", icon: FolderOpen },
  { title: "Media", url: "/admin/media", icon: Image },
  { title: "Widgets", url: "/admin/widgets", icon: LayoutDashboard },
  { title: "Menu", url: "/admin/menus", icon: List, requiredPermissions: ["menus_add", "menus_edit", "menus_delete"] },
];

const movieManagementItems: NavItem[] = [
  { title: "Danh sách phim", url: "/admin/movies", icon: List, requiredPermissions: ["movies_add", "movies_edit", "movies_delete"] },
  { title: "Danh mục phim", url: "/admin/movie-categories", icon: FolderOpen, requiredPermissions: ["categories_add", "categories_edit", "categories_delete"] },
  { title: "Thể loại", url: "/admin/genres", icon: FolderOpen, requiredPermissions: ["categories_add", "categories_edit", "categories_delete"] },
  { title: "Quốc gia", url: "/admin/countries", icon: Globe, requiredPermissions: ["categories_add", "categories_edit", "categories_delete"] },
  { title: "Năm", url: "/admin/years", icon: Calendar, requiredPermissions: ["categories_add", "categories_edit", "categories_delete"] },
];

const tvManagementItems: NavItem[] = [
  { title: "Danh sách kênh", url: "/admin/tv-channels", icon: List },
  { title: "Danh mục kênh", url: "/admin/tv-channel-categories", icon: FolderOpen },
];

const systemNavItems: NavItem[] = [
  { title: "Thống kê", url: "/admin/analytics", icon: BarChart3 },
  { title: "Người dùng", url: "/admin/users", icon: Users, adminOnly: true },
  { title: "Crawl Phim", url: "/admin/api", icon: Database, requiredPermissions: ["crawl_movies"] },
  { title: "Content AI", url: "/admin/content-ai", icon: Sparkles },
  { title: "Quảng cáo", url: "/admin/ads", icon: Megaphone, adminOnly: true },
  { title: "Thông báo", url: "/admin/notifications", icon: Bell, adminOnly: true },
  { title: "Thùng rác", url: "/admin/trash", icon: Trash2 },
  { title: "SEO", url: "/admin/seo", icon: Search, requiredPermissions: ["access_settings"] },
  { title: "Sitemap", url: "/admin/sitemap", icon: Map, requiredPermissions: ["access_settings"] },
  { title: "Cài đặt Site", url: "/admin/site-settings", icon: Settings, requiredPermissions: ["access_settings"] },
  { title: "Hướng dẫn", url: "/admin/docs", icon: BookOpen },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { user, signOut, isAdmin } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const isCollapsed = state === "collapsed";
  
  const [movieManagementOpen, setMovieManagementOpen] = useState(
    movieManagementItems.some(item => location.pathname === item.url)
  );
  const [tvManagementOpen, setTvManagementOpen] = useState(
    tvManagementItems.some(item => location.pathname === item.url)
  );

  // Memoized filtered nav items based on permissions
  const filteredMainNavItems = useMemo(() => {
    return mainNavItems.filter(item => {
      if (isAdmin) return true;
      if (item.adminOnly) return false;
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        return hasAnyPermission(item.requiredPermissions);
      }
      return true;
    });
  }, [isAdmin, hasAnyPermission]);

  const filteredMovieManagementItems = useMemo(() => {
    return movieManagementItems.filter(item => {
      if (isAdmin) return true;
      if (item.adminOnly) return false;
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        return hasAnyPermission(item.requiredPermissions);
      }
      return true;
    });
  }, [isAdmin, hasAnyPermission]);

  const filteredTvManagementItems = useMemo(() => {
    return tvManagementItems.filter(item => {
      if (isAdmin) return true;
      if (item.adminOnly) return false;
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        return hasAnyPermission(item.requiredPermissions);
      }
      return true;
    });
  }, [isAdmin, hasAnyPermission]);

  const filteredSystemNavItems = useMemo(() => {
    return systemNavItems.filter(item => {
      if (isAdmin) return true;
      if (item.adminOnly) return false;
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        return hasAnyPermission(item.requiredPermissions);
      }
      return true;
    });
  }, [isAdmin, hasAnyPermission]);

  // Aggressive ad removal for admin pages
  React.useEffect(() => {
    document.body.setAttribute("data-admin-page", "true");
    document.body.classList.add("admin-page");
    
    // Known ad network domains to block
    const adNetworkDomains = [
      'effectivegatecpm.com',
      'googlesyndication',
      'doubleclick',
      'adserver',
      'adzilla',
    ];
    
    // Function to check if an element is from an ad network
    const isAdElement = (el: Element): boolean => {
      const tagName = el.tagName.toLowerCase();
      const src = el.getAttribute('src') || '';
      const className = el.className?.toString?.() || '';
      const id = el.id || '';
      
      // Check script/iframe sources against ad network domains
      if ((tagName === 'script' || tagName === 'iframe') && src) {
        if (adNetworkDomains.some(domain => src.includes(domain))) {
          return true;
        }
      }
      
      // Check common ad patterns
      if (
        className.includes('social-bar') ||
        className.includes('advert') ||
        className.includes('banner-ad') ||
        className.includes('popup') ||
        id.includes('socialbar') ||
        id.includes('advert') ||
        el.hasAttribute('data-ad-type') ||
        el.hasAttribute('data-socialbar-ad')
      ) {
        return true;
      }
      
      return false;
    };
    
    // Function to remove all ad-related elements
    const removeAdElements = () => {
      // Remove scripts from ad networks
      document.querySelectorAll('script').forEach(script => {
        const src = script.src || '';
        if (adNetworkDomains.some(domain => src.includes(domain))) {
          script.remove();
        }
      });
      
      // Common ad selectors - covers most ad networks
      const adSelectors = [
        '.social-bar-container',
        '[class*="social-bar"]',
        '[id*="socialbar"]',
        '[data-ad-type]',
        '[data-socialbar-ad]',
        '.advertisement-container',
        '[class*="adsbygoogle"]',
        '[id*="adzilla"]',
        '[class*="adzilla"]',
        '[class*="advert"]',
        '[id*="advert"]',
        '[class*="banner-ad"]',
        '[id*="banner-ad"]',
        '[class*="popunder"]',
        '[id*="popunder"]',
        '[class*="popup-ad"]',
        'iframe[src*="ads"]',
        'iframe[src*="banner"]',
        'iframe[src*="adserver"]',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googlesyndication"]',
        'iframe[src*="effectivegatecpm"]',
        'script[src*="effectivegatecpm"]',
      ];
      
      adSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => el.remove());
        } catch (e) {
          // Ignore invalid selector errors
        }
      });
      
      // Remove fixed position elements at bottom (likely social bars from ad networks)
      document.querySelectorAll('div, iframe, aside').forEach(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex) || 0;
        
        // Fixed at bottom with high z-index is likely an ad
        if (style.position === 'fixed' && style.bottom === '0px' && zIndex > 50) {
          if (!el.closest('[data-sidebar]') && !el.closest('nav') && !el.closest('[data-admin-page]')) {
            el.remove();
          }
        }
        
        // Also check for fixed elements anywhere with very high z-index
        if (style.position === 'fixed' && zIndex > 9000) {
          if (!el.closest('[data-sidebar]') && !el.closest('[role="dialog"]')) {
            el.remove();
          }
        }
      });
    };
    
    // Run immediately
    removeAdElements();
    
    // Run periodically to catch dynamically injected ads
    const interval = setInterval(removeAdElements, 300);
    
    // Observe DOM changes to catch new ad injections immediately
    const observer = new MutationObserver((mutations) => {
      let shouldClean = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (isAdElement(el)) {
              el.remove();
            } else {
              // Check if this element contains ad elements
              el.querySelectorAll?.('script, iframe, div')?.forEach(child => {
                if (isAdElement(child)) {
                  child.remove();
                  shouldClean = true;
                }
              });
            }
          }
        });
      });
      
      if (shouldClean) {
        removeAdElements();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also observe head for script injections
    observer.observe(document.head, { childList: true, subtree: true });
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
      document.body.removeAttribute("data-admin-page");
      document.body.classList.remove("admin-page");
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-border/50" collapsible="icon" data-admin-page="true">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Film className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg">PhimAdmin</h2>
              <p className="text-xs text-muted-foreground">Quản lý nội dung</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-2">
            Menu chính
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 ${isActive ? "bg-primary/10 text-primary" : ""}`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Movie Management Collapsible */}
        <SidebarGroup className="mt-2">
          <Collapsible open={movieManagementOpen} onOpenChange={setMovieManagementOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Film className="h-5 w-5" />
                  {!isCollapsed && <span className="text-sm font-medium">Quản lý phim</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-4 w-4 transition-transform ${movieManagementOpen ? "rotate-180" : ""}`} />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="pl-4 mt-1">
                <SidebarMenu>
                  {filteredMovieManagementItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <NavLink 
                          to={item.url} 
                          end 
                          className={({ isActive }) => 
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 text-sm ${isActive ? "bg-primary/10 text-primary" : ""}`
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* TV Management Collapsible */}
        <SidebarGroup className="mt-2">
          <Collapsible open={tvManagementOpen} onOpenChange={setTvManagementOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Tv className="h-5 w-5" />
                  {!isCollapsed && <span className="text-sm font-medium">Quản lý TV</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-4 w-4 transition-transform ${tvManagementOpen ? "rotate-180" : ""}`} />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="pl-4 mt-1">
                <SidebarMenu>
                  {filteredTvManagementItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <NavLink 
                          to={item.url} 
                          end 
                          className={({ isActive }) => 
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 text-sm ${isActive ? "bg-primary/10 text-primary" : ""}`
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-2">
            Hệ thống
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredSystemNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 ${isActive ? "bg-primary/10 text-primary" : ""}`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email?.split("@")[0] || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          )}
          {!isCollapsed && (
            <button 
              onClick={handleSignOut}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
