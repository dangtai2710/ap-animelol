import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Menu, X, Film, Home, Tv, Clapperboard, Sparkles, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { useHeaderMenu, MenuItem } from "@/hooks/useMenus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";

// Fallback nav items when no menu is configured
const defaultNavItems = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Phim Bộ", href: "/danh-sach/phim-bo", icon: Tv },
  { label: "Phim Lẻ", href: "/danh-sach/phim-le", icon: Clapperboard },
  { label: "Hoạt Hình", href: "/danh-sach/hoat-hinh", icon: Sparkles },
  { label: "TV Shows", href: "/danh-muc/tv-shows", icon: Film },
  { label: "TV", href: "/tv", icon: Tv },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedMobileItems, setExpandedMobileItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasAdminAccess, signOut } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const { data: seoSettings } = useSeoSettings();
  const { data: headerMenuData } = useHeaderMenu();

  const siteName = seoSettings?.site_name || siteSettings?.site_name || "KKPhim";
  const menuItems = headerMenuData?.items || [];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setExpandedMobileItems(new Set());
  }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tim-kiem?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const toggleMobileExpand = (itemId: string) => {
    const newExpanded = new Set(expandedMobileItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedMobileItems(newExpanded);
  };

  // Render navigation item with potential dropdown
  const renderNavItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.url ? location.pathname === item.url : false;

    if (hasChildren) {
      return (
        <NavigationMenuItem key={item.id}>
          <NavigationMenuTrigger 
            className={`h-auto px-3 py-2 text-sm font-medium ${
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {item.title}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[400px] gap-1 p-3 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-popover border border-border shadow-xl rounded-lg">
              {item.children!.map((child) => (
                <NavigationMenuLink key={child.id} asChild>
                  <Link
                    to={child.url || "#"}
                    target={child.link_target === "_blank" ? "_blank" : undefined}
                    className={`block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${
                      child.css_class || ""
                    }`}
                  >
                    <div className="text-sm font-medium leading-none">{child.title}</div>
                  </Link>
                </NavigationMenuLink>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      );
    }

    return (
      <NavigationMenuItem key={item.id}>
        <Link
          to={item.url || "#"}
          target={item.link_target === "_blank" ? "_blank" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          } ${item.css_class || ""}`}
        >
          {item.title}
        </Link>
      </NavigationMenuItem>
    );
  };

  // Render mobile menu item with collapsible children
  const renderMobileMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.url ? location.pathname === item.url : false;
    const isExpanded = expandedMobileItems.has(item.id);

    return (
      <div key={item.id}>
        <div className="flex items-center">
          {item.url && !hasChildren ? (
            <Link
              to={item.url}
              target={item.link_target === "_blank" ? "_blank" : undefined}
              className={`flex-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              } ${item.css_class || ""}`}
              style={{ paddingLeft: `${16 + depth * 16}px` }}
            >
              {item.title}
            </Link>
          ) : (
            <button
              onClick={() => hasChildren ? toggleMobileExpand(item.id) : item.url && navigate(item.url)}
              className={`flex-1 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground ${item.css_class || ""}`}
              style={{ paddingLeft: `${16 + depth * 16}px` }}
            >
              <span>{item.title}</span>
              {hasChildren && (
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              )}
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="animate-fade-in">
            {item.children!.map(child => renderMobileMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Use dynamic menu if available, otherwise fallback
  const hasDynamicMenu = menuItems.length > 0;

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-[100] transition-all duration-300 safe-top ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/95 backdrop-blur-md shadow-md"
            : "bg-gradient-to-b from-background/80 to-transparent"
        }`}
      >
        <div className="container flex h-14 items-center justify-between px-4 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            {siteSettings?.logo_url ? (
              <img 
                src={siteSettings.logo_url} 
                alt={siteName} 
                className="h-8 w-auto"
              />
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                  <Film className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  <span className="text-gradient-primary">{siteName.slice(0, 2)}</span>
                  {siteName.slice(2)}
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation - Dynamic Menu with Dropdowns */}
          <div className="hidden md:flex flex-1 justify-center">
            {hasDynamicMenu ? (
              <NavigationMenu>
                <NavigationMenuList className="gap-1">
                  {menuItems.map(item => renderNavItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            ) : (
              <nav className="flex items-center gap-1">
                {defaultNavItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      location.pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm phim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-muted/50 pl-9 text-sm placeholder:text-muted-foreground focus:bg-muted"
              />
            </div>
          </form>

          {/* User Menu - Desktop */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[150] bg-popover border border-border shadow-lg">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium truncate">{user.email?.split("@")[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {hasAdminAccess && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Quản trị
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <User className="h-4 w-4 mr-2" />
                Đăng nhập
              </Button>
            )}
          </div>

          {/* Mobile buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-foreground"
            >
              <Search className="h-5 w-5" />
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[150] bg-popover border border-border shadow-lg">
                  {hasAdminAccess && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Quản trị
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
                <User className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {isSearchOpen && (
          <div className="border-t border-border bg-background p-4 md:hidden animate-fade-in">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm phim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/50 pl-9 text-sm placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}

        {/* Mobile Menu - Dynamic with expandable children */}
        {isMobileMenuOpen && (
          <nav className="border-t border-border bg-background p-4 md:hidden animate-fade-in max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-1">
              {hasDynamicMenu ? (
                menuItems.map(item => renderMobileMenuItem(item))
              ) : (
                defaultNavItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      location.pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 sm:h-16" />
    </>
  );
}
