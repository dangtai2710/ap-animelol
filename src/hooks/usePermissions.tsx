import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PermissionKey = 
  | "crawl_movies"
  | "movies_add"
  | "movies_edit"
  | "movies_delete"
  | "categories_add"
  | "categories_edit"
  | "categories_delete"
  | "menus_add"
  | "menus_edit"
  | "menus_delete"
  | "access_settings";

export function usePermissions() {
  const { user, isAdmin } = useAuth();

  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching permissions:", error);
        return [];
      }
      
      return data.map(p => p.permission as PermissionKey);
    },
    enabled: !!user?.id,
  });

  // Check if user has a specific permission
  const hasPermission = (permission: PermissionKey): boolean => {
    // Admin has all permissions
    if (isAdmin) return true;
    return userPermissions.includes(permission);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions: PermissionKey[]): boolean => {
    if (isAdmin) return true;
    return permissions.some(p => userPermissions.includes(p));
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissions: PermissionKey[]): boolean => {
    if (isAdmin) return true;
    return permissions.every(p => userPermissions.includes(p));
  };

  return {
    permissions: userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    // Convenience methods for common permission checks
    canCrawlMovies: hasPermission("crawl_movies"),
    canAddMovies: hasPermission("movies_add"),
    canEditMovies: hasPermission("movies_edit"),
    canDeleteMovies: hasPermission("movies_delete"),
    canAddCategories: hasPermission("categories_add"),
    canEditCategories: hasPermission("categories_edit"),
    canDeleteCategories: hasPermission("categories_delete"),
    canAddMenus: hasPermission("menus_add"),
    canEditMenus: hasPermission("menus_edit"),
    canDeleteMenus: hasPermission("menus_delete"),
    canAccessSettings: hasPermission("access_settings"),
  };
}
