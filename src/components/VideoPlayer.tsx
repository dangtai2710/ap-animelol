import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Hls from "hls.js";
import VastAdPlayer from "./VastAdPlayer";
import { useVastAds } from "@/hooks/useVastAds";

interface Subtitle {
  id: string;
  language: string;
  label: string;
  file_url: string;
  file_type: string;
}

interface VideoPlayerProps {
  linkEmbed?: string;
  linkM3u8?: string;
  linkMp4?: string;
  movieId?: string;
  episodeId?: string;
  onError?: () => void;
  pageType?: "movie" | "tv";
}

const VideoPlayer = ({ 
  linkEmbed, 
  linkM3u8, 
  linkMp4, 
  movieId, 
  episodeId, 
  onError,
  pageType = "movie"
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("");
  
  // VAST ad states
  const [showPreroll, setShowPreroll] = useState(true);
  const [showMidroll, setShowMidroll] = useState(false);
  const [currentMidrollIndex, setCurrentMidrollIndex] = useState(0);
  const [midrollShown, setMidrollShown] = useState<Set<number>>(new Set());
  const [showPostroll, setShowPostroll] = useState(false);
  const [adComplete, setAdComplete] = useState(false);

  // Reset ad states when episode changes - this ensures ads play on every episode switch
  useEffect(() => {
    setShowPreroll(true);
    setShowMidroll(false);
    setCurrentMidrollIndex(0);
    setMidrollShown(new Set());
    setShowPostroll(false);
    setAdComplete(false);
    setSelectedSubtitle("");
    setError(null);
    setIsLoading(true);
  }, [episodeId, linkM3u8, linkMp4, linkEmbed]);
  
  // Fetch VAST ads configuration
  const { data: vastConfig } = useVastAds(pageType);

  // Fetch subtitles for this movie/episode
  const { data: subtitles } = useQuery({
    queryKey: ["video-subtitles", movieId, episodeId],
    queryFn: async () => {
      if (!movieId) return [];
      
      let query = supabase
        .from("movie_subtitles")
        .select("*")
        .eq("movie_id", movieId)
        .order("display_order", { ascending: true });
      
      // If episodeId is provided, get episode-specific or general subtitles
      if (episodeId) {
        query = query.or(`episode_id.eq.${episodeId},episode_id.is.null`);
      } else {
        query = query.is("episode_id", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Subtitle[];
    },
    enabled: !!movieId,
  });

  const handleError = useCallback(() => {
    if (onError) {
      onError();
    }
  }, [onError]);

  // Check if we need to show preroll
  const hasPreroll = vastConfig?.preroll && showPreroll && !adComplete;

  useEffect(() => {
    // Skip initialization if preroll is showing
    if (hasPreroll) return;

    const video = videoRef.current;
    let hls: Hls | null = null;

    // Normalize empty strings to undefined
    const hasM3u8Link = linkM3u8 && linkM3u8.trim() !== "";
    const hasMp4Link = linkMp4 && linkMp4.trim() !== "";

    const initPlayer = () => {
      if (!video) return;

      setError(null);
      setIsLoading(true);

      // Priority: m3u8 > mp4 > embed
      if (hasM3u8Link) {
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            xhrSetup: (xhr) => {
              xhr.withCredentials = false;
            },
          });
          
          hls.loadSource(linkM3u8);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            video.play().catch(() => {});
          });
          
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setError("Lỗi mạng - không thể tải video. Đang chuyển nguồn...");
                  hls?.startLoad();
                  handleError();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError("Lỗi media - định dạng không được hỗ trợ.");
                  hls?.recoverMediaError();
                  handleError();
                  break;
                default:
                  setError("Không thể phát video. Đang chuyển nguồn khác...");
                  handleError();
                  break;
              }
              setIsLoading(false);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS support
          video.src = linkM3u8;
          video.addEventListener("loadedmetadata", () => {
            setIsLoading(false);
            video.play().catch(() => {});
          });
          video.addEventListener("error", () => {
            setError("Không thể phát video HLS.");
            setIsLoading(false);
            handleError();
          });
        }
      } else if (hasMp4Link) {
        video.src = linkMp4!;
        video.addEventListener("loadedmetadata", () => {
          setIsLoading(false);
          video.play().catch(() => {});
        });
        video.addEventListener("error", () => {
          setError("Không thể phát video MP4. Đang chuyển nguồn khác...");
          setIsLoading(false);
          handleError();
        });
      } else {
        // No valid video source
        setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [linkM3u8, linkMp4, handleError, hasPreroll]);

  // Handle midroll ads - check video progress based on timing config
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !vastConfig?.midroll?.length) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      
      if (!duration || isNaN(duration)) return;
      
      // Check each midroll trigger point based on its timing config
      vastConfig.midroll.forEach((midroll, index) => {
        let triggerTime: number;
        
        if (midroll.timing.type === "seconds") {
          // Trigger after X seconds
          triggerTime = midroll.timing.value;
        } else {
          // Trigger at X% of video duration
          triggerTime = duration * (midroll.timing.value / 100);
        }
        
        // Add a small buffer to prevent multiple triggers
        if (currentTime >= triggerTime && currentTime < triggerTime + 1 && !midrollShown.has(index)) {
          video.pause();
          setCurrentMidrollIndex(index);
          setShowMidroll(true);
          setMidrollShown(prev => new Set([...prev, index]));
        }
      });
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [vastConfig?.midroll, midrollShown]);

  // Handle postroll - when video ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !vastConfig?.postroll) return;

    const handleEnded = () => {
      setShowPostroll(true);
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [vastConfig?.postroll]);

  // Preroll complete handler
  const handlePrerollComplete = useCallback(() => {
    setShowPreroll(false);
    setAdComplete(true);
  }, []);

  // Midroll complete handler  
  const handleMidrollComplete = useCallback(() => {
    setShowMidroll(false);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  }, []);

  // Postroll complete handler
  const handlePostrollComplete = useCallback(() => {
    setShowPostroll(false);
  }, []);

  // Handle subtitle change
  const handleSubtitleChange = (subtitleId: string) => {
    setSelectedSubtitle(subtitleId);
    const video = videoRef.current;
    if (!video) return;

    // Remove all existing tracks
    const existingTracks = video.querySelectorAll("track");
    existingTracks.forEach(track => track.remove());

    if (subtitleId && subtitles) {
      const subtitle = subtitles.find(s => s.id === subtitleId);
      if (subtitle) {
        const track = document.createElement("track");
        track.kind = "subtitles";
        track.label = subtitle.label;
        track.srclang = subtitle.language;
        track.src = subtitle.file_url;
        track.default = true;
        video.appendChild(track);
        
        // Enable the track
        if (video.textTracks.length > 0) {
          video.textTracks[0].mode = "showing";
        }
      }
    }
  };

  // Normalize empty strings to undefined
  const hasM3u8 = linkM3u8 && linkM3u8.trim() !== "";
  const hasMp4 = linkMp4 && linkMp4.trim() !== "";
  const hasEmbed = linkEmbed && linkEmbed.trim() !== "";

  // Priority rendering: m3u8/mp4 first, then embed as fallback
  // If we have m3u8 or mp4, use video player
  if (hasM3u8 || hasMp4) {
    return (
      <div className="relative h-full w-full">
        {/* Preroll Ad */}
        {hasPreroll && vastConfig?.preroll && (
          <VastAdPlayer
            vastTagUrl={vastConfig.preroll.content}
            onComplete={handlePrerollComplete}
            onError={handlePrerollComplete}
            skipAfterSeconds={5}
          />
        )}

        {/* Midroll Ad */}
        {showMidroll && vastConfig?.midroll?.[currentMidrollIndex] && (
          <VastAdPlayer
            vastTagUrl={vastConfig.midroll[currentMidrollIndex].content}
            onComplete={handleMidrollComplete}
            onError={handleMidrollComplete}
            skipAfterSeconds={5}
          />
        )}

        {/* Postroll Ad */}
        {showPostroll && vastConfig?.postroll && (
          <VastAdPlayer
            vastTagUrl={vastConfig.postroll.content}
            onComplete={handlePostrollComplete}
            onError={handlePostrollComplete}
            skipAfterSeconds={3}
          />
        )}

        {/* Main video content - hidden during preroll */}
        {!hasPreroll && (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">Đang tải video...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4 px-4 text-center">
                  <svg className="h-12 w-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <p className="text-xs text-muted-foreground/70">
                    Thử dùng link embed nếu có hoặc kiểm tra lại nguồn video.
                  </p>
                </div>
              </div>
            )}
            
            <video
              ref={videoRef}
              className="h-full w-full"
              controls
              playsInline
              crossOrigin="anonymous"
            />

            {/* Subtitle selector */}
            {subtitles && subtitles.length > 0 && (
              <div className="absolute bottom-16 right-4 z-10">
                <select
                  value={selectedSubtitle}
                  onChange={(e) => handleSubtitleChange(e.target.value)}
                  className="rounded bg-black/80 px-2 py-1 text-sm text-white border border-white/20"
                >
                  <option value="">Tắt phụ đề</option>
                  {subtitles.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // If embed link is available, use iframe
  if (hasEmbed) {
    return (
      <iframe
        src={linkEmbed}
        className="h-full w-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  // No valid link
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <p className="text-muted-foreground">Không có link video</p>
    </div>
  );
};

export default VideoPlayer;
