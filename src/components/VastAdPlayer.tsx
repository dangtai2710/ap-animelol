import { useEffect, useRef, useState, useCallback } from "react";
import { X, Volume2, VolumeX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface VastAdPlayerProps {
  vastTagUrl: string;
  onComplete: () => void;
  onError: () => void;
  onSkip?: () => void;
  skipAfterSeconds?: number;
}

interface VastCreative {
  mediaUrl: string;
  duration: number;
  clickThrough?: string;
  trackingEvents: Record<string, string[]>;
}

const VastAdPlayer = ({
  vastTagUrl,
  onComplete,
  onError,
  onSkip,
  skipAfterSeconds = 5,
}: VastAdPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creative, setCreative] = useState<VastCreative | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay on mobile
  const [hasInteracted, setHasInteracted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  // Parse VAST XML with better error handling - using proxy for CORS
  const parseVastXml = useCallback(async (url: string, depth = 0): Promise<VastCreative | null> => {
    // Prevent infinite loops with max depth
    if (depth > 5) {
      console.error("VAST: Max redirect depth reached");
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      // Use proxy to bypass CORS
      const proxyUrl = `${SUPABASE_URL}/functions/v1/vast-proxy?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/xml, text/xml, */*',
        },
      });
      clearTimeout(timeoutId);
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("VAST fetch failed:", response.status);
        return null;
      }

      const xmlText = await response.text();
      
      if (!xmlText || xmlText.trim().length === 0) {
        console.error("VAST: Empty response");
        return null;
      }

      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");

      // Check for parse errors
      const parseError = xml.querySelector("parsererror");
      if (parseError) {
        console.error("VAST XML parse error:", parseError.textContent);
        return null;
      }

      // Check for VAST errors
      const errorNode = xml.querySelector("Error");
      if (errorNode && !xml.querySelector("Ad")) {
        console.error("VAST Error:", errorNode.textContent);
        return null;
      }

      // Get InLine or Wrapper
      const inline = xml.querySelector("InLine");
      if (!inline) {
        // Handle Wrapper - follow the redirect
        const wrapper = xml.querySelector("Wrapper");
        if (wrapper) {
          const vastAdTagUri = wrapper.querySelector("VASTAdTagURI");
          if (vastAdTagUri?.textContent) {
            return parseVastXml(vastAdTagUri.textContent.trim(), depth + 1);
          }
        }
        console.error("VAST: No InLine or Wrapper found");
        return null;
      }

      // Find MediaFiles - prioritize mobile-friendly formats
      const mediaFiles = inline.querySelectorAll("MediaFile");
      let bestMedia: Element | null = null;
      let bestBitrate = 0;
      let fallbackMedia: Element | null = null;

      mediaFiles.forEach((mf) => {
        const bitrate = parseInt(mf.getAttribute("bitrate") || "0");
        const type = mf.getAttribute("type") || "";
        const delivery = mf.getAttribute("delivery") || "";
        
        // Prefer progressive MP4 for mobile compatibility
        if (type.includes("video/mp4") && delivery !== "streaming") {
          if (bitrate > bestBitrate) {
            bestBitrate = bitrate;
            bestMedia = mf;
          }
          if (!fallbackMedia) {
            fallbackMedia = mf;
          }
        }
      });

      // Use fallback if no high bitrate found
      if (!bestMedia) {
        bestMedia = fallbackMedia;
      }

      // Last resort: any video
      if (!bestMedia && mediaFiles.length > 0) {
        bestMedia = mediaFiles[0];
      }

      if (!bestMedia) {
        console.error("VAST: No suitable MediaFile found");
        return null;
      }

      const mediaUrl = bestMedia.textContent?.trim();
      if (!mediaUrl) {
        console.error("VAST: MediaFile URL is empty");
        return null;
      }

      // Get duration
      const durationStr = inline.querySelector("Duration")?.textContent || "00:00:30";
      const durationParts = durationStr.split(":");
      let duration = 30; // Default 30s
      if (durationParts.length === 3) {
        duration =
          parseInt(durationParts[0]) * 3600 +
          parseInt(durationParts[1]) * 60 +
          parseFloat(durationParts[2] || "0");
      }

      // Get click through
      const clickThrough = inline.querySelector("ClickThrough")?.textContent?.trim();

      // Get tracking events
      const trackingEvents: Record<string, string[]> = {};
      inline.querySelectorAll("Tracking").forEach((tracking) => {
        const event = tracking.getAttribute("event");
        const url = tracking.textContent?.trim();
        if (event && url) {
          if (!trackingEvents[event]) trackingEvents[event] = [];
          trackingEvents[event].push(url);
        }
      });

      // Add impression tracking
      inline.querySelectorAll("Impression").forEach((imp) => {
        const url = imp.textContent?.trim();
        if (url) {
          if (!trackingEvents["impression"]) trackingEvents["impression"] = [];
          trackingEvents["impression"].push(url);
        }
      });

      return {
        mediaUrl,
        duration,
        clickThrough,
        trackingEvents,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error("VAST: Request timeout");
      } else {
        console.error("Failed to parse VAST:", err);
      }
      return null;
    }
  }, []);

  // Fire tracking pixels
  const fireTracking = useCallback((event: string, trackingEvents: Record<string, string[]>) => {
    const urls = trackingEvents[event];
    if (urls) {
      urls.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }, []);

  // Manual skip timer for mobile (in case video doesn't play)
  useEffect(() => {
    if (creative && !hasStartedRef.current) {
      skipTimerRef.current = setTimeout(() => {
        setCanSkip(true);
      }, skipAfterSeconds * 1000);
    }

    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
      }
    };
  }, [creative, skipAfterSeconds]);

  // Load VAST ad
  useEffect(() => {
    let mounted = true;

    const loadAd = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const parsed = await parseVastXml(vastTagUrl);

        if (!mounted) return;

        if (!parsed) {
          console.log("VAST: Failed to parse, completing");
          setError("Không thể tải quảng cáo");
          // Auto complete after 2s if can't load
          setTimeout(() => {
            if (mounted) onError();
          }, 2000);
          return;
        }

        setCreative(parsed);
        setIsLoading(false);

        // Fire impression tracking
        fireTracking("impression", parsed.trackingEvents);
      } catch (err) {
        console.error("VAST load error:", err);
        if (mounted) {
          setError("Lỗi tải quảng cáo");
          setTimeout(() => {
            if (mounted) onError();
          }, 2000);
        }
      }
    };

    loadAd();

    return () => {
      mounted = false;
    };
  }, [vastTagUrl, parseVastXml, fireTracking, onError, retryCount]);

  // Attempt to play video on mobile
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !creative) return;

    const attemptPlay = async () => {
      try {
        // Ensure video is muted for autoplay
        video.muted = true;
        video.playsInline = true;
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
          hasStartedRef.current = true;
        }
      } catch (err) {
        console.warn("VAST: Autoplay failed, waiting for interaction", err);
        // Don't set error, just wait for user interaction or skip timer
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(attemptPlay, 100);
    return () => clearTimeout(timeoutId);
  }, [creative]);

  // Handle user interaction to unmute/play
  const handleInteraction = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasInteracted(true);

    if (video.paused) {
      video.play().catch(console.warn);
    }

    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    hasStartedRef.current = true;

    if (video.currentTime >= skipAfterSeconds) {
      setCanSkip(true);
    }

    // Fire quartile tracking
    if (creative && video.duration > 0) {
      const percent = video.currentTime / video.duration;
      if (percent >= 0.25 && percent < 0.26) {
        fireTracking("firstQuartile", creative.trackingEvents);
      } else if (percent >= 0.5 && percent < 0.51) {
        fireTracking("midpoint", creative.trackingEvents);
      } else if (percent >= 0.75 && percent < 0.76) {
        fireTracking("thirdQuartile", creative.trackingEvents);
      }
    }
  }, [creative, skipAfterSeconds, fireTracking]);

  // Handle video end
  const handleEnded = useCallback(() => {
    if (creative) {
      fireTracking("complete", creative.trackingEvents);
    }
    onComplete();
  }, [creative, fireTracking, onComplete]);

  // Handle skip
  const handleSkip = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (creative) {
      fireTracking("skip", creative.trackingEvents);
    }
    onSkip?.();
    onComplete();
  }, [creative, fireTracking, onSkip, onComplete]);

  // Handle click on ad
  const handleClick = useCallback(() => {
    if (!hasInteracted) {
      handleInteraction();
      return;
    }

    if (creative?.clickThrough) {
      fireTracking("clickTracking", creative.trackingEvents);
      window.open(creative.clickThrough, "_blank", "noopener,noreferrer");
    }
  }, [creative, fireTracking, hasInteracted, handleInteraction]);

  // Handle video error with retry
  const handleVideoError = useCallback(() => {
    console.error("VAST video error");
    
    if (retryCount < 1) {
      setRetryCount(prev => prev + 1);
      return;
    }

    if (creative) {
      fireTracking("error", creative.trackingEvents);
    }
    
    // On error, allow skip immediately
    setCanSkip(true);
    setError("Lỗi phát video quảng cáo");
    
    // Auto-complete after short delay
    setTimeout(() => {
      onError();
    }, 3000);
  }, [creative, fireTracking, onError, retryCount]);

  // Handle video loaded
  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        console.warn("VAST: Play after load failed");
      });
    }
  }, []);

  if (error && canSkip) {
    return (
      <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 text-sm mb-4">{error}</p>
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 bg-white/90 hover:bg-white text-black px-4 py-2 rounded text-sm font-medium transition-colors mx-auto"
          >
            Bỏ qua <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-white/70">Đang tải quảng cáo...</span>
        </div>
      </div>
    );
  }

  if (!creative) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 bg-black" onClick={handleClick}>
      <video
        ref={videoRef}
        src={creative.mediaUrl}
        className="h-full w-full object-contain"
        muted
        playsInline
        preload="auto"
        onLoadedData={handleLoadedData}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleVideoError}
        onPlay={() => {
          hasStartedRef.current = true;
          fireTracking("start", creative.trackingEvents);
        }}
        onPause={() => fireTracking("pause", creative.trackingEvents)}
      />

      {/* Tap to unmute hint (mobile) */}
      {isMuted && !hasInteracted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse">
            <VolumeX className="h-5 w-5" />
            Nhấn để bật âm thanh
          </div>
        </div>
      )}

      {/* Ad label */}
      <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
        Quảng cáo
      </div>

      {/* Mute toggle button */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded transition-colors"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {/* Skip button */}
      <div className="absolute bottom-4 right-4">
        {canSkip ? (
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 bg-white/90 hover:bg-white text-black px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Bỏ qua <X className="h-4 w-4" />
          </button>
        ) : (
          <div className="bg-black/70 text-white px-3 py-2 rounded text-sm">
            Có thể bỏ qua sau {Math.ceil(skipAfterSeconds - currentTime)}s
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${(currentTime / (creative.duration || 1)) * 100}%`,
          }}
        />
      </div>

      {/* Click overlay hint */}
      {creative.clickThrough && hasInteracted && (
        <div className="absolute bottom-12 left-4 text-white/70 text-xs">
          Nhấn vào video để biết thêm chi tiết
        </div>
      )}
    </div>
  );
};

export default VastAdPlayer;
