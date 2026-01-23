import { HomepageWidget, useWidgetMovies } from "@/hooks/useHomepageWidgets";
import { HeroSlider } from "./HeroSlider";
import { Movie } from "@/lib/api";

interface WidgetSliderProps {
  widget: HomepageWidget;
  fallbackMovies?: Movie[];
}

export function WidgetSlider({ widget, fallbackMovies = [] }: WidgetSliderProps) {
  const { data: movies, isLoading, error } = useWidgetMovies(widget);

  // Transform database movies to match API format expected by HeroSlider
  const transformedMovies: Movie[] = (movies || []).map((movie: any) => ({
    _id: movie.id || movie._id || movie.slug,
    name: movie.name || "",
    slug: movie.slug || "",
    origin_name: movie.origin_name || "",
    poster_url: movie.poster_url || "",
    thumb_url: movie.thumb_url || movie.poster_url || "",
    year: movie.year || 0,
    quality: movie.quality || "",
    lang: movie.lang || "",
    episode_current: movie.episode_current || "",
    type: movie.type || "single",
    time: movie.time || "",
    episode_total: movie.episode_total || "",
    category: movie.category || [],
    country: movie.country || [],
  }));

  // Use fallback movies if widget movies are empty
  const moviesToShow = transformedMovies.length > 0 ? transformedMovies : fallbackMovies;

  if (isLoading) {
    return (
      <div className="widget-slider relative h-[50vh] sm:h-[60vh] md:h-[70vh] w-full bg-gradient-to-b from-muted to-background animate-pulse" />
    );
  }

  return <div className="widget-slider"><HeroSlider movies={moviesToShow} /></div>;
}
