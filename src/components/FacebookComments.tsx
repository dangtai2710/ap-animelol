import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { MessageCircle } from "lucide-react";

interface FacebookCommentsProps {
  url: string;
  width?: string;
  numPosts?: number;
}

declare global {
  interface Window {
    FB?: {
      XFBML: {
        parse: (element?: HTMLElement) => void;
      };
    };
  }
}

export function FacebookComments({ url, width = "100%", numPosts = 10 }: FacebookCommentsProps) {
  const { data: settings } = useSiteSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const fbAppId = settings?.facebook_app_id;

  useEffect(() => {
    if (!fbAppId) return;

    // Load Facebook SDK
    const loadFacebookSDK = () => {
      if (document.getElementById("facebook-jssdk")) {
        // SDK already loaded, just parse
        if (window.FB) {
          window.FB.XFBML.parse(containerRef.current || undefined);
        }
        return;
      }

      // Create SDK script
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = `https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v18.0&appId=${fbAppId}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      
      script.onload = () => {
        if (window.FB && containerRef.current) {
          window.FB.XFBML.parse(containerRef.current);
        }
      };

      // Add fb-root if not exists
      if (!document.getElementById("fb-root")) {
        const fbRoot = document.createElement("div");
        fbRoot.id = "fb-root";
        document.body.appendChild(fbRoot);
      }

      document.body.appendChild(script);
    };

    loadFacebookSDK();

    // Re-parse when URL changes
    return () => {
      // Cleanup if needed
    };
  }, [fbAppId, url]);

  // Re-parse when URL changes
  useEffect(() => {
    if (window.FB && containerRef.current) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [url]);

  if (!fbAppId) {
    return (
      <div className="rounded-lg bg-card p-6 text-center">
        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">
          Để sử dụng tính năng bình luận, vui lòng cấu hình Facebook App ID trong Cài đặt Site.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        Bình luận
      </h3>
      <div ref={containerRef}>
        <div
          className="fb-comments"
          data-href={url}
          data-width={width}
          data-numposts={numPosts}
          data-colorscheme="dark"
          data-lazy="true"
        />
      </div>
    </div>
  );
}
