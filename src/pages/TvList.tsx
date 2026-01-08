import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tv, Play } from "lucide-react";

const TvList = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  const { data: channels, isLoading } = useQuery({
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
    if (!channels) return [];
    if (!activeCategory) return channels;
    return channels.filter(ch => ch.category_id === activeCategory);
  }, [channels, activeCategory]);

  return (
    <Layout>
      <SEOHead
        title="Xem TV Online - Truyền hình trực tuyến miễn phí"
        description="Xem TV online miễn phí, các kênh truyền hình Việt Nam và quốc tế chất lượng cao"
      />

      <div className="container py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tv className="h-6 w-6 text-primary" />
            Xem TV Online
          </h1>
          <p className="text-muted-foreground">
            Truyền hình trực tuyến miễn phí, chất lượng cao
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-12">
            <Tv className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Chưa có kênh nào trong danh mục này</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filteredChannels.map((channel) => (
              <Link
                key={channel.id}
                to={`/tv/${channel.slug}`}
                className="group relative aspect-video bg-card rounded-lg overflow-hidden border border-border/50 hover:border-primary transition-all hover:scale-105"
              >
                {channel.logo_url ? (
                  <img
                    src={channel.logo_url}
                    alt={channel.name}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Tv className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center">
                    <Play className="h-8 w-8 mx-auto mb-1 text-white" />
                    <span className="text-xs text-white font-medium">{channel.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TvList;
