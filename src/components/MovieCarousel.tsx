import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Movie } from "@/lib/api";
import { MovieCard } from "./MovieCard";
import { Button } from "./ui/button";

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  loading?: boolean;
  staticPath?: string | null;
}

export function MovieCarousel({ title, movies, loading, staticPath }: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const items = container.querySelectorAll('[data-carousel-item]');
      if (items.length === 0) return;
      
      // Get the width of one item including gap
      const firstItem = items[0] as HTMLElement;
      const itemWidth = firstItem.offsetWidth;
      const gap = 12; // gap-3 = 12px on desktop
      const itemWithGap = itemWidth + gap;
      
      // Calculate how many items fit in view
      const containerWidth = container.clientWidth;
      const itemsInView = Math.floor(containerWidth / itemWithGap);
      
      // Scroll by the number of items that fit in view
      const scrollAmount = itemsInView * itemWithGap;
      
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <section className="py-4">
        <h2 className="mb-4 text-lg sm:text-xl font-bold text-foreground">{title}</h2>
        <div className="flex gap-2 sm:gap-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[100px] sm:w-[140px] md:w-[160px]">
              <div className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
              <div className="mt-2 h-3 sm:h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="mt-1 h-2 sm:h-3 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!movies.length) return null;

  return (
    <section className="py-4 group/section">
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
          {staticPath && (
            <Link 
              to={staticPath} 
              className="text-xs sm:text-sm text-primary hover:underline"
            >
              Xem tất cả →
            </Link>
          )}
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

      {/* Movie grid - scrollable with responsive sizing */}
      <div className="overflow-hidden">
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2"
        >
          {movies.map((movie, index) => (
            <div 
              key={movie._id} 
              data-carousel-item
              className="flex-shrink-0 w-[100px] sm:w-[130px] md:w-[150px] lg:w-[160px]"
            >
              <MovieCard movie={movie} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
