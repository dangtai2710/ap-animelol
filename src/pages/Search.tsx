import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { MovieCard } from "@/components/MovieCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchMovies } from "@/lib/api";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [debouncedQuery, setDebouncedQuery] = useState(queryParam);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery) {
        setSearchParams({ q: searchQuery });
      } else {
        setSearchParams({});
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  // Sync with URL params
  useEffect(() => {
    if (queryParam && queryParam !== searchQuery) {
      setSearchQuery(queryParam);
      setDebouncedQuery(queryParam);
    }
  }, [queryParam]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const movies = data?.data?.items || [];

  return (
    <Layout>
      <div className="container px-4 py-6 sm:px-6">
        {/* Search input */}
        <div className="mb-6">
          <div className="relative mx-auto max-w-xl">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm phim, diễn viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 bg-card pl-12 pr-12 text-base"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {(isLoading || isFetching) && debouncedQuery && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] rounded-lg bg-muted" />
                <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
                <div className="mt-1 h-3 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Search results */}
        {!isLoading && !isFetching && debouncedQuery && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-medium text-foreground">
                Kết quả tìm kiếm: "{debouncedQuery}"
              </h2>
              <p className="text-sm text-muted-foreground">
                Tìm thấy {movies.length} kết quả
              </p>
            </div>

            {movies.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {movies.map((movie, index) => (
                  <MovieCard key={movie._id} movie={movie} index={index} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <SearchIcon className="mb-4 h-16 w-16 text-muted" />
                <p className="text-lg text-muted-foreground">
                  Không tìm thấy phim nào
                </p>
                <p className="text-sm text-muted-foreground">
                  Thử tìm kiếm với từ khóa khác
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!debouncedQuery && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <SearchIcon className="mb-4 h-16 w-16 text-muted" />
            <p className="text-lg text-muted-foreground">
              Nhập từ khóa để tìm kiếm phim
            </p>
            <p className="text-sm text-muted-foreground">
              Tìm theo tên phim, diễn viên, đạo diễn...
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search;
