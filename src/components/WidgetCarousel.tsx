import { HomepageWidget, useWidgetMovies } from "@/hooks/useHomepageWidgets";
import { MovieCarousel } from "./MovieCarousel";
import { Movie } from "@/lib/api";

interface WidgetCarouselProps {
  widget: HomepageWidget;
}

export function WidgetCarousel({ widget }: WidgetCarouselProps) {
  const { data: movies, isLoading } = useWidgetMovies(widget);

  // Transform database movies to match API format expected by MovieCarousel
  const transformedMovies: Movie[] = movies?.map((movie) => ({
    _id: movie.id,
    name: movie.name,
    slug: movie.slug,
    origin_name: movie.origin_name || "",
    poster_url: movie.poster_url || "",
    thumb_url: movie.thumb_url || "",
    year: movie.year || 0,
    quality: movie.quality || "",
    lang: movie.lang || "",
    episode_current: movie.episode_current || "",
    type: movie.type || "single",
    time: "",
    episode_total: "",
    category: [],
    country: [],
  })) || [];

  return (
    <MovieCarousel
      title={widget.title}
      movies={transformedMovies}
      loading={isLoading}
      staticPath={widget.static_path}
    />
  );
}
