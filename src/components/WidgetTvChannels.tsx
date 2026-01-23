import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Tv } from "lucide-react";
import { HomepageWidget, useWidgetTvChannels } from "@/hooks/useHomepageWidgets";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WidgetTvChannelsProps {
  widget: HomepageWidget;
}

export function WidgetTvChannels({ widget }: WidgetTvChannelsProps) {
  const { data: channels, isLoading } = useWidgetTvChannels(widget);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const items = container.querySelectorAll('[data-carousel-item]');
      if (items.length === 0) return;
      
      const firstItem = items[0] as HTMLElement;
      const itemWidth = firstItem.offsetWidth;
      const gap = 12;
      const itemWithGap = itemWidth + gap;
      
      const containerWidth = container.clientWidth;
      const itemsInView = Math.floor(containerWidth / itemWithGap);
      
      const scrollAmount = itemsInView * itemWithGap;
      
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <section className="py-4">
        <h2 className="mb-4 text-lg font-bold sm:text-xl">{widget.title}</h2>
        <div className="flex gap-2 sm:gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[80px] sm:w-[100px] md:w-[120px]">
              <div className="aspect-square rounded-lg bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-3/4 mx-auto rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!channels || channels.length === 0) {
    return null;
  }

  return (
    <section className="py-4 group/section">
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{widget.title}</h2>
          <Link 
            to={widget.static_path || "/tv"} 
            className="text-xs sm:text-sm text-primary hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>
        
        {/* Navigation buttons - visible on hover (desktop) */}
        <div className="hidden gap-2 sm:flex opacity-0 transition-opacity group-hover/section:opacity-100">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* TV Channels slider - scrollable */}
      <div className="overflow-hidden">
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2"
        >
          {channels.map((channel) => (
            <Link 
              key={channel.id} 
              to={`/tv/${channel.slug}`}
              data-carousel-item
              className="flex-shrink-0 w-[80px] sm:w-[100px] md:w-[120px]"
            >
              <Card className="group relative overflow-hidden transition-transform hover:scale-105">
                <div className="aspect-square p-2 sm:p-3">
                  {channel.logo_url ? (
                    <img
                      src={channel.logo_url}
                      alt={channel.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
                      <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1.5 sm:p-2">
                  <p className="truncate text-center text-[10px] sm:text-xs font-medium">
                    {channel.name}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
