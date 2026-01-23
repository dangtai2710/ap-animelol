import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MovieCarousel } from "./MovieCarousel";
import { Movie } from "@/lib/api";

interface RelatedMoviesProps {
  movieId?: string;
  genreIds?: string[];
  categoryIds?: string[];
  currentSlug?: string;
}

export function RelatedMovies({ movieId, genreIds = [], categoryIds = [], currentSlug }: RelatedMoviesProps) {
  const { data: relatedMovies, isLoading } = useQuery({
    queryKey: ["related-movies", movieId, genreIds, categoryIds],
    queryFn: async () => {
      // Try to get movies from same genres first
      let movieIds: string[] = [];
      
      if (genreIds.length > 0) {
        const { data: genreMovies } = await supabase
          .from("movie_genres")
          .select("movie_id")
          .in("genre_id", genreIds)
          .limit(50);
        
        if (genreMovies) {
          movieIds = genreMovies.map(m => m.movie_id);
        }
      }
      
      // Also get movies from same categories
      if (categoryIds.length > 0) {
        const { data: categoryMovies } = await supabase
          .from("movie_category_map")
          .select("movie_id")
          .in("category_id", categoryIds)
          .limit(50);
        
        if (categoryMovies) {
          const catMovieIds = categoryMovies.map(m => m.movie_id);
          movieIds = [...new Set([...movieIds, ...catMovieIds])];
        }
      }
      
      // Exclude current movie
      if (movieId) {
        movieIds = movieIds.filter(id => id !== movieId);
      }
      
      if (movieIds.length === 0) {
        // Fallback: get latest movies
        const { data } = await supabase
          .from("movies")
          .select("*")
          .is("deleted_at", null)
          .neq("slug", currentSlug || "")
          .order("updated_at", { ascending: false })
          .limit(10);
        
        return data || [];
      }
      
      // Fetch related movies
      const { data } = await supabase
        .from("movies")
        .select("*")
        .in("id", movieIds.slice(0, 20))
        .is("deleted_at", null)
        .neq("slug", currentSlug || "")
        .order("updated_at", { ascending: false })
        .limit(10);
      
      return data || [];
    },
    enabled: true,
  });

  const movies = (relatedMovies || []).map((m: any) => ({
    _id: m.id,
    name: m.name,
    slug: m.slug,
    origin_name: m.origin_name,
    poster_url: m.poster_url,
    thumb_url: m.thumb_url,
    year: m.year,
    quality: m.quality,
    lang: m.lang,
    episode_current: m.episode_current,
    episode_total: m.episode_total,
    type: m.type,
    time: m.time,
    category: [],
    country: [],
  })) as Movie[];

  if (!movies.length && !isLoading) return null;

  return (
    <div className="mt-8">
      <MovieCarousel 
        title="Phim liên quan" 
        movies={movies} 
        loading={isLoading} 
      />
    </div>
  );
}
