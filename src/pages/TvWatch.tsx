import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import VideoPlayer from "@/components/VideoPlayer";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tv, Share2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StreamingSource {
  name: string;
  link: string;
  quality: string;
  type: string;
}

const TvWatch = () => {
  const { slug } = useParams();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState(0);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["tv-channel", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channels")
        .select("*, tv_channel_categories(name, slug)")
        .eq("slug", slug)
        .eq("is_active", true)
        .is("deleted_at", null)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!slug,
  });

  const { data: categories } = useQuery({
    queryKey: ["tv-channel-categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channel_categories")
        .select("*")
        .is("deleted_at", null)
        .order("display_order");
      if (error) return [];
      return data || [];
    },
  });

  const { data: allChannels } = useQuery({
    queryKey: ["tv-channels-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channels")
        .select("*, tv_channel_categories(name, slug)")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("display_order");
      if (error) return [];
      return data || [];
    },
  });

  const filteredChannels = useMemo(() => {
    if (!allChannels) return [];
    if (!activeCategory) return allChannels;
    return allChannels.filter(ch => ch.category_id === activeCategory);
  }, [allChannels, activeCategory]);

  const sources: StreamingSource[] = useMemo(() => {
    if (!channel) return [];
    return Array.isArray(channel.streaming_sources) ? (channel.streaming_sources as unknown as StreamingSource[]) : [];
  }, [channel]);

  const currentSource = sources[selectedSource];

  // Auto-switch to next source on error
  const handlePlayerError = useCallback(() => {
    if (!autoSwitchEnabled || sources.length <= 1) return;
    
    const nextIndex = selectedSource + 1;
    if (nextIndex < sources.length) {
      toast.info(`Nguồn ${sources[selectedSource].name || selectedSource + 1} lỗi. Đang chuyển sang nguồn tiếp theo...`);
      setSelectedSource(nextIndex);
    } else {
      toast.error("Tất cả các nguồn đều không khả dụng. Vui lòng thử lại sau.");
      setAutoSwitchEnabled(false); // Disable auto-switch after trying all sources
    }
  }, [sources, selectedSource, autoSwitchEnabled]);

  // Reset auto-switch when channel changes
  useEffect(() => {
    setSelectedSource(0);
    setAutoSwitchEnabled(true);
  }, [slug]);

  if (channelLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="aspect-video w-full max-w-4xl mx-auto rounded-lg" />
        </div>
      </Layout>
    );
  }

  if (!channel) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Tv className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Kênh không tồn tại</h1>
          <p className="text-muted-foreground mb-4">Kênh TV bạn tìm không tồn tại hoặc đã bị tắt.</p>
          <Link to="/tv" className="text-primary hover:underline">
            Xem danh sách kênh
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title={`Xem kênh ${channel.name} trực tuyến`}
        description={channel.description || `Xem kênh ${channel.name} online miễn phí, chất lượng cao`}
      />

      <div className="bg-black">
        <div className="container py-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {currentSource ? (
                  <VideoPlayer
                    linkEmbed={currentSource.type === "embed" ? currentSource.link : ""}
                    linkM3u8={currentSource.type === "m3u8" ? currentSource.link : ""}
                    linkMp4={currentSource.type === "mp4" ? currentSource.link : ""}
                    onError={handlePlayerError}
                    pageType="tv"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Kênh chưa có nguồn phát</p>
                  </div>
                )}
              </div>

              {/* Channel Info */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {channel.logo_url && (
                    <img src={channel.logo_url} alt={channel.name} className="h-10 w-16 object-contain" />
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-white">{channel.name}</h1>
                    {channel.tv_channel_categories?.name && (
                      <span className="text-sm text-muted-foreground">{channel.tv_channel_categories.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Chia sẻ
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Lịch phát sóng
                  </Button>
                </div>
              </div>

              {/* Stream Sources Selector */}
              {sources.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Nguồn phát:</h3>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((source, index) => (
                      <Button
                        key={index}
                        variant={selectedSource === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedSource(index);
                          setAutoSwitchEnabled(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <span>{source.name || `Nguồn ${index + 1}`}</span>
                        <span className="text-xs opacity-70">({source.quality})</span>
                      </Button>
                    ))}
                  </div>
                  {sources.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Tự động chuyển nguồn khi nguồn hiện tại lỗi. Bạn cũng có thể chọn nguồn thủ công.
                    </p>
                  )}
                </div>
              )}

              {/* Schedule Code */}
              {channel.schedule_code && (
                <div 
                  className="mt-6 bg-card/50 rounded-lg p-4"
                  dangerouslySetInnerHTML={{ __html: channel.schedule_code }}
                />
              )}
            </div>

            {/* Schedule Panel (Placeholder) */}
            <div className="hidden lg:block bg-card/50 rounded-lg p-4 h-fit">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Lịch phát sóng hôm nay
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground text-center py-8">
                  Chưa có lịch phát sóng
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel List */}
      <div className="container py-6">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
          >
            Tất cả
          </Button>
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
          {filteredChannels?.map((ch) => (
            <Link
              key={ch.id}
              to={`/tv/${ch.slug}`}
              className={cn(
                "relative aspect-video bg-card rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                ch.slug === slug ? "border-primary" : "border-transparent"
              )}
            >
              {ch.logo_url ? (
                <img src={ch.logo_url} alt={ch.name} className="w-full h-full object-contain p-2" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
              )}
              {ch.slug === slug && (
                <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-xs py-1 text-center">
                  Đang phát
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default TvWatch;
