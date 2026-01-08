import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItem {
  id: string;
  menu_id: string;
  parent_id: string | null;
  title: string;
  url: string | null;
  link_type: string;
  link_target: string;
  icon: string | null;
  css_class: string | null;
  display_order: number;
  is_active: boolean;
  children?: MenuItem[];
}

export interface Menu {
  id: string;
  name: string;
  slug: string;
  location: string;
  is_active: boolean;
}

// Organize flat items into tree structure
const organizeMenuItems = (items: MenuItem[]): MenuItem[] => {
  const itemMap = new Map<string, MenuItem>();
  const rootItems: MenuItem[] = [];

  items?.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  items?.forEach(item => {
    const currentItem = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id)!.children!.push(currentItem);
    } else {
      rootItems.push(currentItem);
    }
  });

  // Sort by display_order
  const sortItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .sort((a, b) => a.display_order - b.display_order)
      .map(item => ({
        ...item,
        children: item.children ? sortItems(item.children) : []
      }));
  };

  return sortItems(rootItems);
};

export function useMenuByLocation(location: string) {
  return useQuery({
    queryKey: ["menu-by-location", location],
    queryFn: async () => {
      // First get the menu by location
      const { data: menu, error: menuError } = await supabase
        .from("menus")
        .select("*")
        .eq("location", location)
        .eq("is_active", true)
        .maybeSingle();

      if (menuError) throw menuError;
      if (!menu) return null;

      // Then get all menu items for this menu
      const { data: items, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_id", menu.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        menu: menu as Menu,
        items: organizeMenuItems(items as MenuItem[])
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useHeaderMenu() {
  return useMenuByLocation("header");
}

export function useMobileMenu() {
  return useMenuByLocation("mobile");
}

export function useFooterMenu() {
  return useMenuByLocation("footer");
}
