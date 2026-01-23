import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { Movie, getThumbUrl } from "@/lib/api";
import { Button } from "./ui/button";
import { ThemeButton } from "./ThemeButton";

interface HeroSliderProps {
  movies: Movie[];
}

export function HeroSlider({ movies }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const featuredMovies = movies.slice(0, 5);

  // Pause auto-slide when user interacts
  const handleUserInteraction = useCallback(() => {
    setIsPaused(true);
    
    // Clear existing timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    // Resume auto-slide after 10 seconds of no interaction
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 10000);
  }, []);

  useEffect(() => {
    if (featuredMovies.length <= 1 || isPaused) return;
    
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
        setIsAnimating(false);
      }, 300);
    }, 6000);

    return () => clearInterval(timer);
  }, [featuredMovies.length, isPaused]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  const goTo = useCallback((index: number) => {
    if (index === currentIndex) return;
    handleUserInteraction();
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
    }, 300);
  }, [currentIndex, handleUserInteraction]);

  const goNext = useCallback(() => {
    goTo((currentIndex + 1) % featuredMovies.length);
  }, [currentIndex, featuredMovies.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((currentIndex - 1 + featuredMovies.length) % featuredMovies.length);
  }, [currentIndex, featuredMovies.length, goTo]);

  if (!featuredMovies.length) {
    return (
      <div className="hero-slider relative h-[50vh] sm:h-[60vh] md:h-[70vh] bg-muted animate-pulse" />
    );
  }

  const currentMovie = featuredMovies[currentIndex];

  return (
    <div 
      className="hero-slider relative h-[50vh] sm:h-[60vh] md:h-[70vh] overflow-hidden"
      onTouchStart={handleUserInteraction}
      onMouseDown={handleUserInteraction}
    >
      {/* Background image */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isAnimating ? "opacity-0" : "opacity-100"
        }`}
      >
        <img
          src={getThumbUrl(currentMovie.thumb_url || currentMovie.poster_url)}
          alt={currentMovie.name}
          className="h-full w-full object-cover"
          loading="eager"
        />
        {/* Gradient overlays - smoother transitions */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Content */}
      <div
        className={`absolute inset-0 flex items-end pb-16 sm:pb-20 md:items-center md:pb-0 transition-all duration-500 ${
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="container max-w-3xl px-4 sm:px-6">
          {/* Badges */}
          <div className="mb-3 flex flex-wrap gap-2">
            {currentMovie.quality && (
              <span className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                {currentMovie.quality}
              </span>
            )}
            {currentMovie.lang && (
              <span className="rounded bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                {currentMovie.lang}
              </span>
            )}
            {currentMovie.year && (
              <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {currentMovie.year}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
            {currentMovie.name}
          </h1>
          <p className="mb-4 text-sm text-muted-foreground sm:text-base">
            {currentMovie.origin_name}
          </p>

          {/* Episode info */}
          {currentMovie.episode_current && (
            <p className="mb-4 text-sm text-foreground">
              <span className="text-primary">{currentMovie.episode_current}</span>
              {currentMovie.episode_total && ` / ${currentMovie.episode_total} tập`}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <ThemeButton
              variant="default"
              className="gap-2"
              asChild
            >
              <Link to={`/phim/${currentMovie.slug}`}>
                <Play className="h-4 w-4 fill-current" />
                Xem ngay
              </Link>
            </ThemeButton>
            <Button
              asChild
              variant="outline"
              className="border-border bg-card/50 hover:bg-accent gap-2"
            >
              <Link to={`/phim/${currentMovie.slug}`}>
                <Info className="h-4 w-4" />
                Chi tiết
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {featuredMovies.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/50 text-foreground backdrop-blur-sm transition-all hover:bg-card/80 sm:left-4"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/50 text-foreground backdrop-blur-sm transition-all hover:bg-card/80 sm:right-4"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {featuredMovies.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {featuredMovies.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
