import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Apple, Share2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Show for iOS after delay
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 3000);
      return;
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4 shadow-lg border border-purple-400">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-white" />
            <h3 className="text-white font-semibold">Cài đặt ứng dụng Phim HD</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3">
            <p className="text-white text-sm">
              Cài đặt Phim HD trên màn hình chính để trải nghiệm tốt nhất!
            </p>
            <div className="bg-white/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-white text-sm">
                <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <span>Nhấn nút Share <Share2 className="w-3 h-3 mx-1" /></span>
              </div>
              <div className="flex items-center gap-2 text-white text-sm">
                <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <span>Chọn <span className="font-semibold">"Thêm vào Màn hình chính"</span></span>
              </div>
              <div className="flex items-center gap-2 text-white text-sm">
                <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <span>Nhấn <span className="font-semibold">"Thêm"</span> để hoàn tất</span>
              </div>
            </div>
            <Button
              onClick={handleDismiss}
              className="w-full bg-white text-purple-600 hover:bg-white/90"
            >
              <Apple className="w-4 h-4 mr-2" />
              Đã hiểu, tôi sẽ cài đặt
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-white text-sm">
              Cài đặt Phim HD để xem phim offline và nhận thông báo mới!
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={handleDismiss}
              >
                Để sau
              </Button>
              <Button
                onClick={handleInstall}
                className="flex-1 bg-white text-purple-600 hover:bg-white/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Cài đặt ngay
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
