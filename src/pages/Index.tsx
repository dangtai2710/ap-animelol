import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { HeroSlider } from "@/components/HeroSlider";
import { MovieCarousel } from "@/components/MovieCarousel";
import { WidgetCarousel } from "@/components/WidgetCarousel";
import { WidgetSlider } from "@/components/WidgetSlider";
import { WidgetTvChannels } from "@/components/WidgetTvChannels";
import { fetchNewMovies, fetchMoviesByType } from "@/lib/api";
import { useHomepageWidgets } from "@/hooks/useHomepageWidgets";
import { useHeaderBannerAds } from "@/hooks/useHeaderBannerAds";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { replaceSeoVariables } from "@/lib/seoUtils";

const Index = () => {
  // Fetch SEO settings
  const { data: seoSettings } = useSeoSettings();
  
  // Check if header banner ads exist
  const { data: hasHeaderBanner } = useHeaderBannerAds("home");
  
  // Fetch widgets from database
  const { data: widgets, isLoading: loadingWidgets } = useHomepageWidgets();

  // Fallback: Fetch from API if no widgets configured
  const { data: newMovies, isLoading: loadingNew } = useQuery({
    queryKey: ["newMovies"],
    queryFn: () => fetchNewMovies(1),
    enabled: !widgets || widgets.length === 0,
  });

  const { data: seriesData, isLoading: loadingSeries } = useQuery({
    queryKey: ["series"],
    queryFn: () => fetchMoviesByType("phim-bo", 1, { limit: 12 }),
    enabled: !widgets || widgets.length === 0,
  });

  const { data: singleMovies, isLoading: loadingSingle } = useQuery({
    queryKey: ["singleMovies"],
    queryFn: () => fetchMoviesByType("phim-le", 1, { limit: 12 }),
    enabled: !widgets || widgets.length === 0,
  });

  const { data: animationData, isLoading: loadingAnimation } = useQuery({
    queryKey: ["animation"],
    queryFn: () => fetchMoviesByType("hoat-hinh", 1, { limit: 12 }),
    enabled: !widgets || widgets.length === 0,
  });

  const newMoviesList = newMovies?.items || [];
  const seriesList = seriesData?.data?.items || [];
  const singleList = singleMovies?.data?.items || [];
  const animationList = animationData?.data?.items || [];

  // Get slider widgets and other widgets
  const sliderWidgets = widgets?.filter(w => w.widget_type === "slider") || [];
  const carouselWidgets = widgets?.filter(w => w.widget_type === "carousel") || [];
  const tvWidgets = widgets?.filter(w => w.widget_type === "tv_channels") || [];

  const hasWidgets = widgets && widgets.length > 0;

  // Render widget based on type
  const renderWidget = (widget: typeof widgets extends (infer T)[] | undefined ? T : never) => {
    switch (widget.widget_type) {
      case "carousel":
        return <WidgetCarousel key={widget.id} widget={widget} />;
      case "tv_channels":
        return <WidgetTvChannels key={widget.id} widget={widget} />;
      default:
        return null;
    }
  };

  // Get the first slider widget movies
  const firstSliderWidget = sliderWidgets[0];

  // Generate SEO values with variable replacement
  const siteName = seoSettings?.site_name || "PhimHD";
  
  const seoTitle = useMemo(() => {
    if (seoSettings?.homepage_title) {
      return replaceSeoVariables(seoSettings.homepage_title, { sitename: siteName });
    }
    return undefined;
  }, [seoSettings?.homepage_title, siteName]);

  const seoDescription = useMemo(() => {
    return seoSettings?.homepage_description || seoSettings?.site_description || undefined;
  }, [seoSettings?.homepage_description, seoSettings?.site_description]);

  const seoKeywords = useMemo(() => {
    return seoSettings?.site_keywords || undefined;
  }, [seoSettings?.site_keywords]);

  return (
    <Layout page="home">
      <SEOHead 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
      />
      
      {/* Hero section - negative margin when no banner to overlap header */}
      <div className={hasHeaderBanner === false ? "-mt-14 sm:-mt-16" : ""}>
        {firstSliderWidget ? (
          <WidgetSlider widget={firstSliderWidget} fallbackMovies={newMoviesList} />
        ) : (
          <HeroSlider movies={newMoviesList} />
        )}
      </div>

      {/* Movie carousels */}
      <div className="container px-4 sm:px-6">
        {hasWidgets ? (
          // Render widgets from database (excluding slider which is rendered above)
          widgets
            ?.filter(w => w.widget_type !== "slider")
            .map(renderWidget)
        ) : (
          // Fallback to API data
          <>
            <MovieCarousel
              title="🔥 Phim Mới Cập Nhật"
              movies={newMoviesList}
              loading={loadingNew}
            />
            <MovieCarousel
              title="📺 Phim Bộ Hay"
              movies={seriesList}
              loading={loadingSeries}
            />
            <MovieCarousel
              title="🎬 Phim Lẻ Đặc Sắc"
              movies={singleList}
              loading={loadingSingle}
            />
            <MovieCarousel
              title="✨ Hoạt Hình"
              movies={animationList}
              loading={loadingAnimation}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default Index;
