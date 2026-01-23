import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Apple, Share2 } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isInStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(isInStandaloneMode);
    };

    checkInstalled();

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event (Android only)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      toast.success("Ứng dụng đã được cài đặt thành công!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show iOS prompt after delay
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success("Đang cài đặt ứng dụng...");
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error during installation:', error);
      toast.error("Có lỗi xảy ra khi cài đặt ứng dụng");
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed recently
  const dismissTime = localStorage.getItem('pwa-install-dismissed');
  const recentlyDismissed = dismissTime && (Date.now() - parseInt(dismissTime)) < 7 * 24 * 60 * 60 * 1000; // 7 days

  if (isInstalled || !showInstallPrompt || recentlyDismissed) {
    return null;
  }

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
                onClick={handleInstallClick}
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
}
