import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { Advertisement, SocialBar, usePopupAds } from "./Advertisement";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
  hideFooter?: boolean;
  page?: string;
}

// Map route to page type
const getPageType = (pathname: string): string => {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/phim/") || pathname.startsWith("/movie/")) return "movie";
  if (pathname.startsWith("/tv") || pathname.startsWith("/kenh-tv")) return "tv";
  if (pathname.startsWith("/tim-kiem") || pathname.startsWith("/search")) return "search";
  return "all";
};

export function Layout({ children, hideHeader, hideFooter, page }: LayoutProps) {
  const location = useLocation();
  const currentPage = page || getPageType(location.pathname);
  const isAdminPage = currentPage === "admin";
  
  // Initialize popup ads for current page (skip for admin)
  usePopupAds(isAdminPage ? "" : currentPage);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!hideHeader && (
        <div className="relative z-50">
          <Header />
          {/* Header Banner Ad - positioned above hero slider (skip for admin) */}
          {!isAdminPage && (
            <Advertisement position="header" page={currentPage} className="w-full flex justify-center relative z-40" />
          )}
        </div>
      )}
      
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      
      {!hideFooter && <Footer />}
      <BottomNav />
      
      {/* Social Bar - fixed at bottom (skip for admin) */}
      {!isAdminPage && <SocialBar page={currentPage} />}
    </div>
  );
}
