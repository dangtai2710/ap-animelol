import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { useState } from "react";
import { fetchCategories, fetchCountries } from "@/lib/api";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface MovieFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  currentFilters: FilterState;
  hideCategory?: boolean;
  hideGenre?: boolean;
  hideCountry?: boolean;
  hideYear?: boolean;
}

export interface FilterState {
  type?: string;
  genre?: string;
  country?: string;
  year?: string;
}

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "series", label: "Phim Bộ" },
  { value: "single", label: "Phim Lẻ" },
  { value: "hoathinh", label: "Hoạt Hình" },
  { value: "tvshows", label: "TV Shows" },
];

// Generate year options (from current year to 2000)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 2000; year--) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  return years;
};

export const MovieFilters = ({
  onFilterChange,
  currentFilters,
  hideCategory = false,
  hideGenre = false,
  hideCountry = false,
  hideYear = false,
}: MovieFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if external API is enabled
  const { data: siteSettings } = useSiteSettings();
  const useExternalApi = siteSettings?.use_external_api === "true";

  // Fetch genres from external API
  const { data: externalGenres = [] } = useQuery({
    queryKey: ["filter-genres-external"],
    queryFn: async () => {
      const data = await fetchCategories();
      // API returns array of { _id, name, slug }
      return (data || []).map((item: any) => ({
        id: item._id || item.slug,
        name: item.name,
        slug: item.slug,
      }));
    },
    enabled: useExternalApi,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch countries from external API
  const { data: externalCountries = [] } = useQuery({
    queryKey: ["filter-countries-external"],
    queryFn: async () => {
      const data = await fetchCountries();
      // API returns array of { _id, name, slug }
      return (data || []).map((item: any) => ({
        id: item._id || item.slug,
        name: item.name,
        slug: item.slug,
      }));
    },
    enabled: useExternalApi,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch genres from local database
  const { data: localGenres = [] } = useQuery({
    queryKey: ["filter-genres-local"],
    queryFn: async () => {
      const { data } = await supabase
        .from("genres")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
    enabled: !useExternalApi,
  });

  // Fetch countries from local database
  const { data: localCountries = [] } = useQuery({
    queryKey: ["filter-countries-local"],
    queryFn: async () => {
      const { data } = await supabase
        .from("countries")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
    enabled: !useExternalApi,
  });

  // Fetch years from local database (fallback for external too)
  const { data: localYears = [] } = useQuery({
    queryKey: ["filter-years-local"],
    queryFn: async () => {
      const { data } = await supabase
        .from("years")
        .select("id, year")
        .is("deleted_at", null)
        .order("year", { ascending: false });
      return data || [];
    },
    enabled: !useExternalApi,
  });

  // Use external or local data based on setting
  const genres = useExternalApi ? externalGenres : localGenres;
  const countries = useExternalApi ? externalCountries : localCountries;
  // For years, use local if available, otherwise generate static list
  const years = useExternalApi 
    ? generateYearOptions() 
    : localYears.map(y => ({ value: y.year.toString(), label: y.year.toString() }));

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = {
      ...currentFilters,
      [key]: value === "all" ? undefined : value,
    };
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(currentFilters).some((v) => v);

  return (
    <div className="space-y-3">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Bộ lọc
          {hasActiveFilters && (
            <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {Object.values(currentFilters).filter(Boolean).length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Xóa lọc
          </Button>
        )}
      </div>

      {/* Filters - always visible on desktop, toggle on mobile */}
      <div className={`${isExpanded ? "block" : "hidden"} lg:block`}>
        <div className="flex flex-wrap gap-3 items-center p-4 bg-card rounded-lg border">
          {/* Category/Type filter */}
          {!hideCategory && (
            <div className="flex-1 min-w-[140px]">
              <Select
                value={currentFilters.type || "all"}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Genre filter */}
          {!hideGenre && (
            <div className="flex-1 min-w-[140px]">
              <Select
                value={currentFilters.genre || "all"}
                onValueChange={(value) => handleFilterChange("genre", value)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Thể loại" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-[300px]">
                  <SelectItem value="all">Tất cả thể loại</SelectItem>
                  {genres.map((genre: any) => (
                    <SelectItem key={genre.id || genre.slug} value={genre.slug}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Country filter */}
          {!hideCountry && (
            <div className="flex-1 min-w-[140px]">
              <Select
                value={currentFilters.country || "all"}
                onValueChange={(value) => handleFilterChange("country", value)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Quốc gia" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-[300px]">
                  <SelectItem value="all">Tất cả quốc gia</SelectItem>
                  {countries.map((country: any) => (
                    <SelectItem key={country.id || country.slug} value={country.slug}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year filter */}
          {!hideYear && (
            <div className="flex-1 min-w-[120px]">
              <Select
                value={currentFilters.year || "all"}
                onValueChange={(value) => handleFilterChange("year", value)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Năm" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-[300px]">
                  <SelectItem value="all">Tất cả năm</SelectItem>
                  {years.map((year: any) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clear button - desktop */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="hidden lg:flex gap-1"
            >
              <X className="h-4 w-4" />
              Xóa lọc
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
