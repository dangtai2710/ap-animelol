import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Movie, getPosterUrl } from "@/lib/api";
import { useState } from "react";

interface MovieCardProps {
  movie: Movie;
  index?: number;
}

export function MovieCard({ movie, index = 0 }: MovieCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      to={`/phim/${movie.slug}`}
      className="group relative block overflow-hidden rounded-lg card-hover animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image Container - Responsive aspect ratio */}
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {/* Skeleton loader */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
        )}
        
        <img
          src={imageError ? "/placeholder.svg" : getPosterUrl(movie.poster_url || movie.thumb_url)}
          alt={movie.name}
          className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-110 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-overlay opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary shadow-glow transition-transform duration-300 group-hover:scale-110">
            <Play className="h-4 w-4 sm:h-6 sm:w-6 fill-primary-foreground text-primary-foreground" />
          </div>
        </div>

        {/* Quality badge */}
        {movie.quality && (
          <span className="absolute left-1 top-1 sm:left-2 sm:top-2 rounded bg-primary px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-semibold text-primary-foreground">
            {movie.quality}
          </span>
        )}

        {/* Language badge */}
        {movie.lang && (
          <span className="absolute right-1 top-1 sm:right-2 sm:top-2 rounded bg-secondary px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-semibold text-secondary-foreground">
            {movie.lang}
          </span>
        )}

        {/* Episode info */}
        {movie.episode_current && (
          <span className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 rounded bg-cinema-dark/80 px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-medium text-foreground backdrop-blur-sm">
            {movie.episode_current}
          </span>
        )}
      </div>

      {/* Movie info */}
      <div className="p-1.5 sm:p-2">
        <h3 className="line-clamp-1 text-xs sm:text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {movie.name}
        </h3>
        <p className="line-clamp-1 text-[10px] sm:text-xs text-muted-foreground">
          {movie.origin_name} {movie.year && `(${movie.year})`}
        </p>
      </div>
    </Link>
  );
}
