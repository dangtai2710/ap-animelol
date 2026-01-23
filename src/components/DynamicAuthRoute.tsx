import { useParams } from "react-router-dom";
import { useAuthSettings } from "@/hooks/useSiteSettings";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

// Component for handling dynamic custom auth path
export const CustomAuthPathHandler = () => {
  const { customAuthPath } = useParams<{ customAuthPath: string }>();
  const authSettings = useAuthSettings();

  if (authSettings.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if this path matches the configured custom auth path
  if (
    authSettings.customPathEnabled &&
    authSettings.customPath &&
    customAuthPath === authSettings.customPath
  ) {
    return <Auth isCustomPath={true} />;
  }

  // Otherwise, this is not a valid auth path - show 404
  return <NotFound />;
};

interface DynamicAuthRouteProps {
  path: string;
}

const DynamicAuthRoute = ({ path }: DynamicAuthRouteProps) => {
  const authSettings = useAuthSettings();

  if (authSettings.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If accessing /auth and custom path is enabled, show 404
  if (authSettings.customPathEnabled && path === "auth") {
    return <NotFound />;
  }

  // If custom path is not enabled, show normal auth page
  if (!authSettings.customPathEnabled && path === "auth") {
    return <Auth />;
  }

  // Otherwise show 404
  return <NotFound />;
};

export default DynamicAuthRoute;
