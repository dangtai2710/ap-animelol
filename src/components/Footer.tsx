import { Link } from "react-router-dom";
import { Film } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { Advertisement } from "./Advertisement";

export function Footer() {
  const { data: siteSettings } = useSiteSettings();
  const { data: seoSettings } = useSeoSettings();

  const siteName = seoSettings?.site_name || siteSettings?.site_name || "KKPhim";

  return (
    <>
      {/* Footer Banner Ad - ALWAYS visible, separate from footer */}
      <div className="w-full py-4 flex justify-center items-center bg-background border-t border-border">
        <Advertisement position="footer" page="all" className="flex justify-center" />
      </div>
      
      <footer className="border-t border-border bg-card hidden md:block">
      
      {/* Custom footer HTML - hides default footer when present */}
      {siteSettings?.footer_html ? (
        <div 
          className="container px-4 py-4"
          dangerouslySetInnerHTML={{ __html: siteSettings.footer_html }}
        />
      ) : (
        /* Default footer - only shown when no custom HTML */
        <div className="container px-4 py-6">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-2">
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
              <p className="mt-3 text-sm text-muted-foreground">
                Xem phim online miễn phí chất lượng cao, cập nhật nhanh nhất.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground">Danh mục</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/danh-muc/phim" className="text-muted-foreground hover:text-foreground transition-colors">
                    Tất cả phim
                  </Link>
                </li>
                <li>
                  <Link to="/danh-sach/phim-bo" className="text-muted-foreground hover:text-foreground transition-colors">
                    Phim Bộ
                  </Link>
                </li>
                <li>
                  <Link to="/danh-sach/phim-le" className="text-muted-foreground hover:text-foreground transition-colors">
                    Phim Lẻ
                  </Link>
                </li>
                <li>
                  <Link to="/danh-sach/hoat-hinh" className="text-muted-foreground hover:text-foreground transition-colors">
                    Hoạt Hình
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground">Thể loại</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/the-loai/hanh-dong" className="text-muted-foreground hover:text-foreground transition-colors">
                    Hành Động
                  </Link>
                </li>
                <li>
                  <Link to="/the-loai/tinh-cam" className="text-muted-foreground hover:text-foreground transition-colors">
                    Tình Cảm
                  </Link>
                </li>
                <li>
                  <Link to="/the-loai/kinh-di" className="text-muted-foreground hover:text-foreground transition-colors">
                    Kinh Dị
                  </Link>
                </li>
                <li>
                  <Link to="/the-loai/hai-huoc" className="text-muted-foreground hover:text-foreground transition-colors">
                    Hài Hước
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground">Liên hệ</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: contact@{siteName.toLowerCase()}.com</li>
                <li>DMCA: dmca@{siteName.toLowerCase()}.com</li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {siteName} - Xem phim online miễn phí
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Disclaimer: Website này không lưu trữ bất kỳ tệp phim nào trên máy chủ của mình.
            </p>
          </div>
        </div>
      )}
    </footer>
    </>
  );
}
