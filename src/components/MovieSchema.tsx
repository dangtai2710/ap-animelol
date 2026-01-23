import { Helmet } from "react-helmet-async";

interface MovieSchemaProps {
  movie: {
    name: string;
    origin_name?: string;
    slug: string;
    content?: string;
    poster_url?: string;
    thumb_url?: string;
    year?: number;
    time?: string;
    quality?: string;
    lang?: string;
    type?: string;
    status?: string;
    episode_current?: string;
    episode_total?: string;
    trailer_url?: string;
    director?: Array<{ name: string; slug: string } | string>;
    actor?: Array<{ name: string; slug: string } | string>;
    category?: Array<{ name: string; slug: string }>;
    country?: Array<{ name: string; slug: string }>;
  };
  siteUrl?: string;
}

const MovieSchema = ({ movie, siteUrl = "" }: MovieSchemaProps) => {
  // Extract director names
  const directors = movie.director?.map((d) => 
    typeof d === "string" ? d : d.name
  ) || [];

  // Extract actor names
  const actors = movie.actor?.map((a) => 
    typeof a === "string" ? a : a.name
  ) || [];

  // Extract genre names
  const genres = movie.category?.map((c) => c.name) || [];

  // Extract country names
  const countries = movie.country?.map((c) => c.name) || [];

  // Clean description from HTML
  const cleanDescription = movie.content
    ? movie.content.replace(/<[^>]*>/g, "").slice(0, 300)
    : `Xem phim ${movie.name} ${movie.origin_name ? `(${movie.origin_name})` : ""} vietsub, thuyết minh chất lượng cao.`;

  // Build the Movie schema
  const movieSchema = {
    "@context": "https://schema.org",
    "@type": movie.type === "series" ? "TVSeries" : "Movie",
    name: movie.name,
    alternateName: movie.origin_name,
    description: cleanDescription,
    image: movie.poster_url || movie.thumb_url,
    url: `${siteUrl}/phim/${movie.slug}`,
    datePublished: movie.year ? `${movie.year}-01-01` : undefined,
    duration: movie.time ? `PT${movie.time.replace(/[^0-9]/g, "")}M` : undefined,
    genre: genres,
    countryOfOrigin: countries.length > 0 ? {
      "@type": "Country",
      name: countries[0],
    } : undefined,
    director: directors.map((name) => ({
      "@type": "Person",
      name,
    })),
    actor: actors.slice(0, 10).map((name) => ({
      "@type": "Person",
      name,
    })),
    inLanguage: movie.lang || "vi",
    ...(movie.trailer_url && {
      trailer: {
        "@type": "VideoObject",
        name: `Trailer ${movie.name}`,
        embedUrl: movie.trailer_url,
      },
    }),
    ...(movie.type === "series" && {
      numberOfEpisodes: movie.episode_total ? parseInt(movie.episode_total) : undefined,
      containsSeason: {
        "@type": "TVSeason",
        seasonNumber: 1,
        numberOfEpisodes: movie.episode_total ? parseInt(movie.episode_total) : undefined,
      },
    }),
  };

  // Build BreadcrumbList schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: siteUrl || "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: movie.type === "series" ? "Phim bộ" : "Phim lẻ",
        item: `${siteUrl}/danh-sach/${movie.type === "series" ? "phim-bo" : "phim-le"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: movie.name,
        item: `${siteUrl}/phim/${movie.slug}`,
      },
    ],
  };

  // Build VideoObject schema for the movie itself
  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: movie.name,
    description: cleanDescription,
    thumbnailUrl: movie.thumb_url || movie.poster_url,
    uploadDate: movie.year ? `${movie.year}-01-01` : new Date().toISOString().split("T")[0],
    duration: movie.time ? `PT${movie.time.replace(/[^0-9]/g, "")}M` : undefined,
    contentUrl: `${siteUrl}/phim/${movie.slug}`,
    embedUrl: `${siteUrl}/phim/${movie.slug}`,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WatchAction",
      userInteractionCount: 0,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(movieSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(videoSchema)}
      </script>
    </Helmet>
  );
};

export default MovieSchema;
